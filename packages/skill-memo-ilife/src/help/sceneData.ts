/** #227 · 备忘录 HELP 内容资产 · 组装件：8 个域文件 → 全量 `groups` ＋ 域级索引
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改生成器里的声明表（prompt 清洗／字段清洗／别名），再跑
 *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（仓外，全程只读）：
 *   ① 老实物契约载荷 `备忘录_HELP_20260820_162453.html`（老 `script/memo_render.py:527-599` 的产出，逐字零改写）；
 *   ② 老 `references/scenarios.yaml` 顶层 `version`（＝1.3.0，不写死第四份副本，裁决 9）。
 * 摘要锁：老 30 条 sha256＝0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
 *           清洗后 30 条 sha256＝7c72fb924f8457e2130ebb0b331ae583c3aaaa64f4a04c27cf01da581c325827
 *
 * 与老骨架的**有意偏离**（逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`）：
 *   1. 二级组 id 老 0 起 → 新 1 起（票 6 V8=A）；
 *   2. `prompt_template` 去命令化（用户 U6）＋ 去 DB／实现细节（老 yaml `:9`）；
 *      `title`／`label`／`hint` 同一条规则换说法（裁决 21 D5／D7 ＋ 复审 M1，逐条见对账表）；
 *   3. `editable_fields` 清洗（裁决 6）：剔 12 条 `html` 开关 ＋ 补 10 条中文名；
 *   4. 新增 `aliases`（住技能侧资产、渲染时剥离，裁决 5；老 yaml `:30` 的禁令管不到本仓）；
 *   5. `status` 全空串（用户 U1／U2／U3：HELP 是完整体，不是现状快照）。
 *
 * 本文件给 **2 个导出**：`MEMO_HELP_GROUPS`（全量 `groups`，给渲染件 `helpFile.ts` 直接吃）与
 * `buildHelpSceneIndex()`（域级索引载荷，计数全派生、不写死）。`version` **随索引载荷出去**
 * （`buildHelpSceneIndex().version`）：盘上 `src/help/helpFile.ts:181` 逐字就是
 * `const version = String(buildHelpSceneIndex().version);` ⇒ 版本有单一来源、不必另开一个独立导出
 * （复审 M2：独立 `MEMO_HELP_VERSION` 导出零消费者，已撤）。与票 5 §2.2 的「2 个导出」一致。
 * 新件**不进** `src/help/index.ts` 转发（裁决 16）。
 */
import { MEMO_HELP_MEMO } from './scenes/memo.js';
import { MEMO_HELP_SEARCH } from './scenes/search.js';
import { MEMO_HELP_REMIND } from './scenes/remind.js';
import { MEMO_HELP_WISH } from './scenes/wish.js';
import { MEMO_HELP_CHECKIN } from './scenes/checkin.js';
import { MEMO_HELP_MOOD } from './scenes/mood.js';
import { MEMO_HELP_SYNC } from './scenes/sync.js';
import { MEMO_HELP_INIT } from './scenes/init.js';

/** 技能数据世代：**取自老 `references/scenarios.yaml` 顶层**（生成器读入，不是手写的第四份副本）。
 *  不导出：只经 `buildHelpSceneIndex()` 的载荷对外（复审 M2）。 */
const MEMO_HELP_VERSION = "1.3.0";

/** 8 域／13 二级组／30 场景（域顺序＝老 `categories` 顺序，**不是**场景出现顺序；组内序＝书写序）。 */
export const MEMO_HELP_GROUPS = [
  MEMO_HELP_MEMO,
  MEMO_HELP_SEARCH,
  MEMO_HELP_REMIND,
  MEMO_HELP_WISH,
  MEMO_HELP_CHECKIN,
  MEMO_HELP_MOOD,
  MEMO_HELP_SYNC,
  MEMO_HELP_INIT,
];

/** 域级索引载荷（`memo.help.lookup` envelope 的 `data`，`list` 形）：一行一域，计数全部派生。 */
export function buildHelpSceneIndex() {
  const items = MEMO_HELP_GROUPS.map((g) => {
    let sceneCount = 0;
    for (const sub of g.subgroups) sceneCount += sub.scenes.length;
    return { id: g.id, icon: g.icon, label: g.label, subgroupCount: g.subgroups.length, sceneCount };
  });
  let subgroupTotal = 0;
  let sceneTotal = 0;
  for (const it of items) { subgroupTotal += it.subgroupCount; sceneTotal += it.sceneCount; }
  return { items, total: items.length, subgroupTotal, sceneTotal, version: MEMO_HELP_VERSION };
}
