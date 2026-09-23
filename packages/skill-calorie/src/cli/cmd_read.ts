#!/usr/bin/env node
/** T11 #30 · 卡路里唯一出口 cmd_read：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
 * #40 · 写键同出口：35 写键（diet/water/weight/exercise/photo/product/profile/goal/body 各域，一律 receipt）
 * 走 cli/write.ts 分发（memo.create/update/remove 范式：先调 fetch 库函数写库，再用 T10 receipt 组装回执）。
 * 退出码对齐 skilllink 冻结（P9）：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
 * stdout 纯净：成功只打 envelope JSON 一行（version/skill/shape/key/data 全字段，对齐 link-core 0.1.0）。
 * 组合键为 registry 合法点式（见 cli/keys.ts；内部 VIEW_KEYS 下划线键仅渲染层复用，不直接登记）。
 * #676 · 设置页的三个配置 key（`calorie.config.read`／`.write`／`.reset`）**不在 registry 里**：
 * 它们在预检与分派层之前由 cli/config.ts 拦下（不是唤醒词命令，不进 HELP 与唤醒词计数）。
 * 缺失阻断不返空：空库/空窗/无目标一律抛（CalorieRenderError missing-data / FetchError），exit 4，不返空数组冒充正常。
 * 仅 type-only 消费 link-core（零运行时依赖）；envelope 手工装配，形状校验本地镜像 link-core。
 * HTML 默认落盘（utf8，见下行 #87）＋ 可用 `--html` 显式覆盖：视图键走 render/html.ts 专属模板（与 T8/T9/T10 快照同源），其余走通用 section。
 * #87 · 输出命名规范复刻（M10）：不给 `--html` 时默认落
 * <库目录>/calorie_html/<中文command>_<YYYYMMDD>_<HHMMSS>[_N].html（库目录＝配置项 `db.dir`，空＝数据目录；同秒冲突自动加后缀），
 * 中文 command 取 CALORIE_COMBOS[key].title；显式 `--html` 覆盖任意路径。
 * ⚠️ 老技能的 `--output` 别名**已由 #245 收口删除**（与其余五家同形：只认 `--html`；给 `--output` 即 exit 2）。
 * 落点随 envelope 的 data.output 回传（additive 字段，六形状守卫不校验 data 额外键）。
 * #91 · `calorie.help.center` **只出一份产物**（Q9 那条「全量速查台」的 `mode` 三态已按用户 2026-09-24 裁定整支下线）：
 * 缺省即「卡路里help」的老实物同款 HELP 文件；`mode`／`q`／`keyword` 进来一律 exit 2 并指路（`q` 归 #652、`mode` 归速查台删单）。
 * envelope 恒五字段 `version/skill/shape/key/data`（Q8：**无 `status`**），`data` 只回索引与落点／字节数，不回产物本体。
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { openDb } from '../schema.js';
import { resolveDbFileName } from '../paths.js';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';

// #179 · 档案读链取数搬进能力目录 `src/profile/`（同一个取数不留两处）。

// #330 · CLI 前置与交付装配住同目录两件（纯搬，行为不变）：`readArgs.ts`（参数＋预检）／
// `delivery.ts`（envelope＋三态交付＋失败回执）。入口名与 `export function dispatch` 不挪。
import { USAGE, bodySceneFor, parseReadArgs, preflight, toast } from './readArgs.js';
// #676 · 设置页的三个配置 key 由本文件在分派层之前拦下（见下行 main 里那一处拦截与 cli/config.ts 的件头）。
import { isConfigKey, runConfigKey } from './config.js';
// #706 · 配置体检：设置页专用的一条只读命令，同走「进分派层之前拦下」这条口（判据住 src/health.ts）。
import { isHealthCheckKey, runHealthCheckKey } from './health.js';
import { buildDeliveredEnvelope, describeDeliveryTarget, failWithBodyReceipt, failWithReceipt } from './delivery.js';
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
  let params: Record<string, unknown> = {};
  if (o.params !== undefined) {
    try {
      params = JSON.parse(o.params as string) as Record<string, unknown>;
    } catch (e) {
      fail(2, '--params 须为 JSON：' + (e as Error).message);
    }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  // #676 · 设置页的配置 key 在**预检与分派层之前**拦下：读写配置不该要求库目录已配（配置面正是
  // 「库目录配在哪」的入口），也不走 HTML 交付那条链；输出仍是唯一出口那条规矩（stdout 一行 envelope）。
  if (isConfigKey(o.key as string)) {
    process.stdout.write(runConfigKey(o.key as string, params) + '\n');
    return;
  }
  // #706 · 配置体检（`calorie.config.check`）：同样是设置页专用的只读命令，同样在预检之前拦下——
  // 它要报的正是「库在哪、通不通」，不能先要求库目录已配。只读：不建目录、不写文件、不落默认配置。
  if (isHealthCheckKey(o.key as string)) {
    process.stdout.write(runHealthCheckKey(o.key as string) + '\n');
    return;
  }
  const dbPath = preflight();
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
    // #676 · 库文件名也来自配置（`values.db.name`），不再写死路径常量。
    const dbFile = join(dbPath as string, resolveDbFileName());
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
      // #500 · 身体域缺数据／缺参数走失败回执整页（exit 保持 4／2，按 #365 实测）；
      // 非身体键走原纯文本（其它域不动）。接线位是框架调用方（声明外最小 wiring，见证据）。
      if (e.code === 'missing-data') {
        if (bodySceneFor(o.key as string) !== null) failWithBodyReceipt('取数失败（缺失阻断）：' + e.message, o.key as string, 4);
        fail(4, '取数失败（缺失阻断）：' + e.message);
      }
      if (e.code === 'bad-input') {
        if (bodySceneFor(o.key as string) !== null) failWithBodyReceipt('参数失败：' + e.message, o.key as string, 2);
        fail(2, '参数失败：' + e.message);
      }
      failWithReceipt('渲染失败：' + e.message, o.key as string);
    }
    if (e instanceof FetchError) {
      if (bodySceneFor(o.key as string) !== null) failWithBodyReceipt('取数失败：' + (e as Error).message, o.key as string, 4);
      fail(4, '取数失败：' + (e as Error).message);
    }
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally {
    clearTimeout(timer);
  }
  process.stdout.write(JSON.stringify(env) + '\n');
}

const invokedAsCli = (process.argv[1] ?? '').replace(/\\/g, '/').endsWith('cmd_read.js');
if (invokedAsCli) await main();
