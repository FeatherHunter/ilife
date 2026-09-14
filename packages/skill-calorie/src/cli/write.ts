/** #40 · 卡路里写键分发（单条 CRUD 可执行链）：唯一出口 cmd_read 的写分支（memo.create/update/remove 范式）。
 *
 * 35 写键一律 receipt 形：先调现行 fetch 层库函数写库，再用 render/receipt.ts（T10）
 * buildCrudReceipt（照片键用 photo/photo.ts 三回执）组装回执；envelope 数据为
 * { ok: true, message, receipt }（ok/message 过 envelope 全字段，receipt carry T10 形状）。
 * 本文件不写 render/ 新视图、不碰 envelope 键表（#41 边界）；HTML 为 dispatch 内联
 * receipt 小节（沿 cmd_read history/help 内联先例，不新增模板）——**唯一例外**是
 * #179 接线的场景 07 三条写入词（设置档案／设活动量／改档案）：它们的回执页换成
 * 能力目录 `src/profile/` 那两页整页装配（见 `profileReceiptDoc`），其余 32 条一字不改。
 * 退出码沿 T11 冻结：缺参/坏参 fail(2)；未知键上游拦（exit 3）；缺失阻断 fail(4)；
 * envelope/落盘 fail(5)。库函数 FetchError 透传（main 映射 exit 4）；body.ts
 * ValidationError 在此转 bad-input（exit 2）。
 *
 * #101 → #120 · 删除可恢复性口径（**不得承诺可恢复**——全仓 0 个 restore/undo/recover 入口）：
 * - 软删除、行仍在库、**已从查询与统计排除**：`exercise_log.is_deleted`（#120 起 `analysis/**`
 *   11 处查询统一内联 `analysis/utils.ts:EX_ALIVE`，删后 `view.home.deficitToday`／
 *   `view.deficit.avgExerciseBurn`／`buildSeries.exerciseKcal` 同步排除；**supersedes #101 的
 *   「仍计入历史统计」口径**，见 `docs/research/t120-softdelete-filter.md`）／
 *   `body_composition`／`body_measurements`（`is_deprecated`，读层 `fetch/body.ts:131,197,155,166`
 *   ＋ `analysis/series.ts:119,122`／`cross.ts:144-145` 均带 `is_deprecated = 0`）／
 *   `nutrition_products`（`diet/productStore.ts:72,108,114,120`）
 *   → 「（软删除：行保留，已从查询与统计中排除；暂无恢复入口）」
 * - 硬删除（行删除、不可恢复）：`food_log`／`weight_log`／`body_photos`（`DELETE FROM`）→ 「（硬删除，不可恢复）」
 * `items[].status` 结构化字段与 prose **同源**（同一口径常量派生，软/硬 ＋ 不可恢复）。
 * 依据：fetch 层 delete* 实测（`exercise/exerciseStore.ts:216-238` 软删／`fetch/diet.ts:153-161` 硬删／
 * `fetch/weight.ts:148-178` 硬删／`fetch/body.ts:144-148,207-211` 软删）＋ 审计
 * `docs/research/t67-key-audit.md:246` ＋ 复跑证据 `docs/research/t120-probe-softdelete.mjs`。
 * 照片键文案在 `photo/photo.ts:buildDeleteReceipt`。
 */
import type { DatabaseSync } from 'node:sqlite';

import {
  ValidationError,
} from '../fetch/body.js';
import { withM5 } from '../render/receipt.js';
import { CalorieRenderError } from '../render/errors.js';

// #179 · 场景 07 三条写入词的回执页：整页装配住在能力目录 `src/profile/`（写前页在 setup.ts）。
// #330 · 按命令选整页的端口也住能力目录（`src/profile/receipt.ts`，经 `src/profile/index.ts` 转出）：
// 分派层只调门，不再写任何命令名字面量。
import { profileReceiptDoc } from '../profile/index.js';
// #269 · 饮食 13 条会改数据库的命令的回执页：整页装配住能力目录 `src/diet/receipt.ts`
//（经本文件直引，不经 `src/diet/index.ts` 转出；#276 需要的新增分支由本票留空）。
import { dietReceiptDoc } from '../diet/receipt.js';
import { isCalorieWriteKey } from './keys.js';
// #294 · 命令索引：命中即走能力目录里的实现，未命中的老键落下面的 dispatchInner switch。
import { REGISTRY } from './registry.js';

// #294 · 参数读取与回执底座上移共用位：能力目录里的命令与分派层用同一套口径（唯一定义地）。
import { fail } from '../shared/params.js';
import { totalChanges } from '../shared/writeParts.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** 写分发（唯一出口 cmd_read 内调用；未知键上游已拦，此处再拦一道）。
 * #97 · M5：`affectedRows` 在此统一注入——写库前后各取一次 SQLite `total_changes()`，
 * 增量即「影响 N 行」（35 键单一来源，逐键不各自自报）。 */
export function dispatchWrite(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  if (!isCalorieWriteKey(key)) fail(3, '未知 calorie 写键：' + key);
  const before = totalChanges(db);
  try {
    // #294 · 注册表先行：命中即走能力目录那道门（新增能力／新增命令都不必碰这个文件）。
    // #320 · 未搬迁清单归零 ⇒ 老写键也全在注册表里，`dispatchInner` 只剩「键不存在」这一条兜底。
    const spec = REGISTRY[key];
    const res = spec && spec.kind === 'write' ? spec.run(params, db) : dispatchInner(key, params, db);
    const receipt = withM5(res.data.receipt, { affectedRows: totalChanges(db) - before });
    // #269 · 饮食 13 条切整页装配（`assembleDocPage`，与档案 3 条同路）；其余键原样放行。
    // #276 插入点：如需新增命令的整页分派，在本行下方按 `?? 下一个Doc(...)` 续接（本票留空）。
    return { data: { ...res.data, receipt }, html: profileReceiptDoc(key, params, receipt, db) ?? dietReceiptDoc(key, params, receipt, db) ?? res.html };
  } catch (e) {
    if (e instanceof ValidationError) throw new CalorieRenderError('bad-input', e.message);
    throw e;
  }
}

function dispatchInner(key: string, params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  switch (key) {
    default:
      fail(3, '未知 calorie 写键：' + key);
      throw new Error('unreachable');
  }
}
