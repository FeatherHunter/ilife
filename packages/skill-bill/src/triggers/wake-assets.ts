/** #721 · 饼干记账 HELP 内容资产：8 份域声明 → 7 域／20 二级组／74 场景的**运行期合并件**。
 *
 * 这一件原先是 **962 行生成物**（`scripts/gen-wake-assets.mjs` 从**仓外**事实源
 * `老技能\饼干记账.html` 的 `<script id="help-data">` payload 逐字生成）；#721 起事实源回到仓内、回到域里：
 * 每个能力自己持一份手写域声明（`src/<域>/declaration.ts` ×7 ＋ `src/help/declaration.ts`），
 * 本件只做三件事——**引声明 → 按 `order` 排 → 按有无场景分流**。生成器随搬运器一起退役
 * （搬运当刻与老权威逐字段 0 差异的读数见 `docs/skills/skill-bill/t721-证据.md`）。
 *
 * 为什么不留生成物：这个派生物的产出只是「几个数组按序拼起来」——算得不贵、消费者也不要另一种表示；
 * 它唯一剩下的功能是「证明自己没被手改」，而文件不存在就没东西可手改（判据 2 的鉴别力转由
 * `test/t721-判据与摘要锁.test.mjs` 的内容摘要锁承担）。
 *
 * **导出面与路径一字未改**（消费方零改）：`WAKE_GROUPS`／`WAKE_ASSETS`／`SCENE_BY_ID`／
 * `WAKE_ASSET_TOTAL`／`HELP_WAKE_WORDS` ＋ 四个类型再转出。
 *
 * 两条机械不变式（声明写错时在这里当场报，不留到页面上）：
 *   · 一个场景 id 只准被一条词条拥有一次；二级组点名的场景必须在本域内；
 *   · 有场景的声明必须有 `label` 与 `icon`（域元数据随域声明住），无场景的那一份（HELP 位）两者都没有。
 * 分流（防自指）只写一处：**有场景的声明进目录；没场景的声明的词进 `HELP_WAKE_WORDS`**。
 */
import { DECLARATIONS } from './wakeTable.js';
import type { DomainDeclaration, WakeGroupAsset, WakeSceneAsset, WakeSubgroupAsset } from './routeSpec.js';

export type { WakeSceneType, WakeSceneAsset, WakeSubgroupAsset, WakeGroupAsset } from './routeSpec.js';

/** 一个域声明 → 一张 HELP 一级分组的卡（无场景的声明不进目录）。 */
function toGroup(decl: DomainDeclaration): WakeGroupAsset | null {
  if (decl.subgroups.length === 0) return null;
  if (decl.label === undefined || decl.icon === undefined) {
    throw new Error('[wake-assets] 有场景的域声明缺 label／icon：' + decl.id);
  }
  const scenes = new Map<string, WakeSceneAsset>();
  for (const e of decl.entries) {
    for (const s of e.scenes) {
      if (scenes.has(s.id)) throw new Error('[wake-assets] 场景被两条词条同时拥有：' + s.id);
      scenes.set(s.id, {
        id: s.id, title: s.title, wake_word: e.phrase, status: s.status, prompt_template: s.prompt_template, types: s.types,
      });
    }
  }
  const subgroups: WakeSubgroupAsset[] = decl.subgroups.map((sg) => ({
    id: sg.id,
    label: sg.label,
    scenes: sg.scenes.map((id) => {
      const s = scenes.get(id);
      if (s === undefined) throw new Error('[wake-assets] 二级组的场景不在本域词条名下：' + sg.id + ' → ' + id);
      return s;
    }),
  }));
  return { id: decl.id, icon: decl.icon, label: decl.label, subgroups };
}

/** 7 域／20 二级组／74 场景（域序＝声明的 `order`，词序＝声明里的书写顺序）。 */
export const WAKE_GROUPS: readonly WakeGroupAsset[] = DECLARATIONS
  .map(toGroup)
  .filter((g): g is WakeGroupAsset => g !== null);

/** 扁平 74 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const WAKE_ASSETS: readonly WakeSceneAsset[] = WAKE_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** id → 场景（74/74 唯一）。 */
export const SCENE_BY_ID: Readonly<Record<string, WakeSceneAsset>> = Object.fromEntries(
  WAKE_ASSETS.map((s) => [s.id, s]),
);

/** 资产总数（由 `WAKE_ASSETS` 派生，单源不复写第二遍数；改资产即跟变，测试仍钉 74）。 */
export const WAKE_ASSET_TOTAL: number = WAKE_ASSETS.length;

/** HELP 自身的唤醒词（老实物 `meta_blocks.help_wake_words` 那一块；4 条，不进场景目录）。
 *
 * 从**无场景的那份声明**（HELP 位）读——防自指的规则只写一处：有场景的进目录，没场景的进这里。 */
export const HELP_WAKE_WORDS: readonly string[] = DECLARATIONS
  .filter((d) => d.subgroups.length === 0)
  .flatMap((d) => d.entries.map((e) => e.phrase));
