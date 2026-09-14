#!/usr/bin/env node
/** T11 #30 · 卡路里唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
 * #40 · 写键同出口：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body 各域，一律 receipt）
 * 走 cli/write.ts 分发（memo.create/update/remove 范式：先调 fetch 库函数写库，再用 T10 receipt 组装回执）。
 * 退出码对齐 skilllink 冻结（P9）：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
 * stdout 纯净：成功只打 envelope JSON 一行（version/skill/shape/key/data 全字段，对齐 link-core 0.1.0）。
 * 组合键为 registry 合法点式（见 cli/keys.ts；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * 缺失阻断不返空：空库/空窗/无目标一律抛（CalorieRenderError missing-data / FetchError），exit 4，不返空数组冒充正常。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，形状校验本地镜像 link-core。
 * HTML 默认落盘（utf8，见下行 #87）＋ 可用 `--html` 显式覆盖：视图键走 render/html.ts 专属模板（与 T8/T9/T10 快照同源），其余走通用 section。
 * #87 · 输出命名规范复刻（M10）：不给 `--html` 时默认落
 * <SKILLS_DB_PATH>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html（同秒冲突自动加后缀），
 * 中文 command 取 CALORIE_COMBOS[key].title；显式 `--html` 覆盖任意路径。
 * ⚠️ 老技能的 `--output` 别名**已由 #245 收口删除**（与其余五家同形：只认 `--html`；给 `--output` 即 exit 2）。
 * 落点随 envelope 的 data.output 回传（additive 字段，六形状守卫不校验 data 额外键）。
 * #91 · `calorie.help.center` 承载**全量速查台**（Q9）：`--params '{"mode":"file|inline|text"}'` 显式选交付形态
 * （D6，缺省 `file`）；`q`／`keyword` 保留**照片 10 键**语义（非空＝现找、空串＝全量 10 键）。envelope 恒五字段
 * `version/skill/shape/key/data`（Q8：**无 `status`**），`data` 只回索引与落点／字节数，不回 1 MB 产物。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { DB_FILENAME } from '../paths.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

// #179 · 档案读链取数搬进能力目录 `src/profile/`（同一个取数不留两处）。

// #330 · CLI 前置与交付装配住同目录两件（纯搬，行为不变）：`readArgs.ts`（参数＋预检）／
// `delivery.ts`（envelope＋三态交付＋失败回执）。入口名与 `export function dispatch` 不挪。
import { USAGE, parseReadArgs, preflight, toast } from './readArgs.js';
import { buildDeliveredEnvelope, describeDeliveryTarget, failWithReceipt } from './delivery.js';
export { buildDeliveredEnvelope };

// #250 · 窗口与锚点只有一个定义地（analysis/series.ts）：读命令一律经下方 anchorOf／windowRange／dayField 取参。
import { CALORIE_COMBOS, calorieShapeFor, isCalorieWriteKey } from './keys.js';
// #294 · 参数读取与窗口口径上移共用位：能力目录里的命令与分派层用同一套口径（唯一定义地）。
import { fail } from '../shared/params.js';
import { openDbReadOnly } from '../db/readonly.js';
import { dispatchWrite } from './write.js';
// #294 · 命令索引：命中即走能力目录里的实现；未命中即未知键（#320 起老 switch 已删）。
import { REGISTRY } from './registry.js';
import type { ViewOut } from '../shared/commandSpec.js';
import type { EnvelopeShape } from 'base-link-core';

/** #294 · 读命令产物的形状（含交付种类）唯一定义地已上移 `shared/commandSpec.ts`：
 *  能力目录与分派层共用一份，本文件只按原名转出，既有调用方导入面不变。 */
export type DispatchOut = ViewOut;
export type { DeliveryKind } from '../shared/commandSpec.js';

// 全键分发：读走 render/fetch 读，HELP 走触发词现找；未知键上游已拦，此处再拦一道。
/** #41 · 测试直调出口（纯 CLI 同逻辑，不经过 argv/spawn；CLI 唯一出口仍为 main）。 */
export function dispatch(key: string, params: Record<string, unknown>, db: DatabaseSync): DispatchOut {
  // #294 · 注册表先行：命中即走能力目录那道门（新增能力／新增命令都不必碰这个文件）。
  // #320 · 未搬迁清单归零 ⇒ 老路那口按键分派的 switch 已成死代码，整口删除；
  // 未命中即「这个键不存在」，直接 fail——往分派层加分支这件事已经被棘轮挡在门外。
  const spec = REGISTRY[key];
  if (spec) {
    if (spec.kind !== 'read') fail(3, '写键不走读分派：' + key);
    return spec.run(params, db);
  }
  fail(3, '未知 calorie key：' + key);
  throw new Error('unreachable');
}

async function main(): Promise<void> {
  const o = parseReadArgs(process.argv.slice(2));
  if (!o.key) fail(2, USAGE);
  const dbPath = preflight();
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try {
      params = JSON.parse(o.params as string) as Record<string, unknown>;
    } catch (e) {
      fail(2, '--params 须为 JSON：' + (e as Error).message);
    }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape: EnvelopeShape;
  try {
    shape = calorieShapeFor(o.key as string);
  } catch (e) {
    fail(3, (e as Error).message);
    throw new Error('unreachable');
  }
  void (CALORIE_COMBOS as Record<string, unknown>)[o.key as string];
  const timer = setTimeout(() => {
    toast('cmd_read 超时 terminate（' + String(o.timeout) + 'ms），已终止取数');
    process.exit(4);
  }, o.timeout as number);
  (timer as unknown as { unref: () => void }).unref();
  let env: Record<string, unknown> | null = null;
  try {
    const dbFile = join(dbPath as string, DB_FILENAME);
    // #93 · 读键走只读打开（不建表、不迁移、写入被拒）；写键或库文件尚不存在时仍走 openDb。
    const db = isCalorieWriteKey(o.key as string) || !existsSync(dbFile) ? openDb(dbFile) : openDbReadOnly(dbFile);
    try {
      // #40 · 唯一出口：写键走 write.ts 分发（memo.create/update/remove 范式），读键走既有 dispatch。
      const out = isCalorieWriteKey(o.key as string)
        ? dispatchWrite(o.key as string, params, db)
        : dispatch(o.key as string, params, db);
      // #83 · 三态交付（M4 HTML-First）：① 文件态（默认）／② 内联态（只读·沙箱回退）／③ 文本态。
      // 落点：--html（显式覆盖）> 默认 calorie_html/<中文command>_<TS>[_N].html（#87／#119）。
      // ⚠️ 老技能的 `--output` 别名**已删**（#245 收口，与其余五家同形：只认 `--html`；给 `--output` 即 exit 2）。
      // 只读类写失败 → 内联交付（产物随 envelope 回传，绝不因写不进去而文字答）；
      // 结构错／渲染错 → 渲染失败回执（模板化回执，exit 5；严禁手写 HTML 兜底）。
      try {
        env = buildDeliveredEnvelope({
          key: o.key as string, shape: shape as EnvelopeShape, out, params, explicit: o.html,
        });
      } catch (e) {
        if (e instanceof CalorieRenderError) throw e;
        failWithReceipt('渲染失败：' + describeDeliveryTarget(o.html) + '：'
          + ((e as Error).message || String(e)), o.key as string);
      }
    } finally {
      db.close();
    }
  } catch (e) {
    if (e instanceof CalorieRenderError) {
      if (e.code === 'missing-data') fail(4, '取数失败（缺失阻断）：' + e.message);
      if (e.code === 'bad-input') fail(2, '参数失败：' + e.message);
      failWithReceipt('渲染失败：' + e.message, o.key as string);
    }
    if (e instanceof FetchError) fail(4, '取数失败：' + (e as Error).message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally {
    clearTimeout(timer);
  }
  process.stdout.write(JSON.stringify(env) + '\n');
}

const invokedAsCli = (process.argv[1] ?? '').replace(/\\/g, '/').endsWith('cmd_read.js');
if (invokedAsCli) await main();
