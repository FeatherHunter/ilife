/** #139 · 「卡路里help」的交付**内容**：5 键 HELP JSON → 老实物同款 V4 三级目录壳。
 *
 * 本模块**零 IO、零落盘**：落点命名与写盘全在 CLI 交付管线
 * （`cli/cmd_read.ts` → `output.ts:deliverHtml`，`wx` 独占＋`EEXIST` 递补＋绝对路径回执）。
 * 教训（#139 诊断）：本模块此前自带 `runHelpFile` 落盘，结果只被自己的单测调用——
 * 「单测全绿、live 出口没人调」的孤岛，产出与交付脱钩，故删。
 *
 * 链路（每步零旁路）：
 *  1. 资产：`WAKE_GROUPS` 直转 HELP JSON（`skill_name/title/subtitle/contact/version/groups`，
 *     老实物 `卡路里_HELP_20260906_220726.html:195` 口径；`subtitle` 沿老
 *     `render_help_center.py:182-186` 公式 `〈组数〉 分类 · 〈场景数〉 场景 · 更新于 〈本地分钟〉`；
 *     `contact` 与 `photo/helpScene.ts:HELP_CONTACT` 同源（实物 2 项逐字）；
 *     `version` 取**包自身 `package.json`**（详见下方 `HELP_FILE_VERSION`）；
 *     `init_banner/recommendations` 为模板侧可选能力，本接线**不传**——它们才是第二真相源，
 *     漂移面无收益）。
 *  2. 渲染：`renderHelpFileHtml` → `base-paint/help-shell:renderHelpShellHtml`
 *     （模板唯一实现＝verbatim 老实物；空分组抛 `missing-data`，调用方 exit 5；
 *     模板源在 `packages/base-render/assets/help-template.html`，改动走 `gen:help-shell`）。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CalorieRenderError } from '../render/errors.js';
import { HELP_CONTACT, HELP_LEGACY_SUBGROUP, HELP_SKILL_NAME, HELP_SUBFUNC_ORDER, HELP_TITLE } from './helpScene.js';
import { WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import type { WakeGroupAsset } from '../triggers/wake-assets.js';
import { SCENE_09_PHOTO } from '../triggers/scene-09-photo.js';
import { renderHelpShellHtml } from './helpShell.js';

/** 「卡路里help」交付文件的文件名主体（接线层写死；调用方不接受外部传入，S3-3）。 */
export const HELP_FILE_STEM = '卡路里_HELP' as const;
/** 5 键头（实物逐字）：**值恒取 `helpScene.ts` 那一份**——本件只别名转出，不写第二个字面量
 *  （速查台下线前这两处与 `helpScene` 是同值两份，改一处漏一处）。 */
export const HELP_FILE_SKILL_NAME = HELP_SKILL_NAME;
export const HELP_FILE_TITLE = HELP_TITLE;
/** 实物 payload 容器 id（`help-data`，老 `:195`）。 */
export const HELP_FILE_DATA_ID = 'help-data' as const;

/** 本包 `package.json` 的路径（`dist/photo/helpFile.js` → 上两级＝包根）。相对 `import.meta.url`
 *  算而不是相对 `process.cwd()`：装到哪个 profile、从哪个目录被调起，读到的都是这一份。 */
const PACKAGE_MANIFEST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

/** 技能版本（「关于」Tab 版本段那一个数）：**取包自身 `package.json` 的 `version`，不写常量**。
 *
 *  **口径裁定（用户 2026-09-23 图报「关于」Tab 时拍定）**：屏上那个数要回答的是「用户装的这份
 *  技能是几版」，唯一真相源＝包清单的 `version`。写一份常量就是第二真相源——发版只 bump
 *  `package.json` 时页上那个数立刻撒谎。兄弟包 `packages/plugin-manager/src/manager-version.ts`
 *  记着同一条教训，注释逐字写「定版也只剩改 `package.json` 一处」，故这里运行时现读。
 *
 *  为什么此前是空的：老实物 F3 的注入数据就没有 `version` 字段，关于 Tab 一直显示
 *  「v · HELP 模板 v4」——`docs/research/t71-help-dissect.md:419` 已把它登记为**数据缺口**
 *  （「不是代码 bug」），`t71-old-baseline-inventory.md:423` 又写明复刻时**不要照抄**；本接线
 *  #139 建件时却照「老实物键集」把这一位一并省了（旧注：传了即第二真相源）。这一位不是第二
 *  真相源，它就是包自己的号，故补上。
 *
 *  读不到即抛（缺失阻断，与 `formatHelpMinute` 的坏参同一条家法）：这是**静态读一次**，
 *  读不到属「发布包缺 `package.json`」的故障，不静默降级回「v · HELP 模板 v4」——那种空版本
 *  表现正是本票要消灭的东西。 */
export const HELP_FILE_VERSION: string = ((): string => {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(PACKAGE_MANIFEST, 'utf8'));
  } catch (cause) {
    throw new CalorieRenderError('bad-input', 'HELP 版本号取不到：读不了 ' + PACKAGE_MANIFEST
      + '（' + (cause instanceof Error ? cause.message : String(cause)) + '）');
  }
  const version = (manifest as { version?: unknown } | null | undefined)?.version;
  if (typeof version !== 'string' || version === '') {
    throw new CalorieRenderError('bad-input', 'HELP 版本号取不到：' + PACKAGE_MANIFEST
      + ' 的 version 不是非空字符串');
  }
  return version;
})();

/** HELP JSON（顶层键集；`groups` 由资产直转，只读引用不 clone）。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: typeof HELP_CONTACT;
  /** 「关于」Tab 版本段：模板渲染成 `v<这一个> · HELP 模板 v4`（`v` 与后缀都归模板自带）。 */
  readonly version: string;
  readonly groups: readonly WakeGroupAsset[];
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区，零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new CalorieRenderError('bad-input', 'HELP 更新时间须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** #437 · 把 scene 09 那十条的 `prompt_template` 换成 **SoT（`SCENE_09_PHOTO`）** 的值。
 *
 *  分叉事实（2026-09-16 实测）：`WAKE_GROUPS`（`wake-assets.ts`，机器生成的老资产）里
 *  `body_photo` 组十条 prompt **与 SoT 十条逐条不同**（10/10），且 #345 给速查写的流程句
 *  （「动笔前请先出预检确认页」／「动手前请先出候选页」）**在缺省 HELP 里 0 命中** —— 即默认交付的
 *  `卡路里_HELP_<时间戳>.html` 读不出「先出哪张过程型页」。
 *
 *  合口径的**唯一改动地就是这里**：`wake-assets.ts` 是生成物（头注禁令：不许手改，改词即改 SoT），
 *  133 指纹也不动；只在装配这一步按**场景 id ↔ trigger key** 覆盖 prompt 文本，其余字段（标题／唤醒词／
 *  分组／图标／顺序）仍由资产给——分叉只剩「prompt 文本」这一处，而它现在只有一个定义地。 */
function withScene09Prompts(groups: readonly WakeGroupAsset[]): readonly WakeGroupAsset[] {
  // `Trigger` 是 `SceneTrigger | LegacyTrigger` 的联合（老条目没有 key／prompt_template），
  // 故按 SoT 的家法收窄（同 `helpLookup.ts` 的 `keyOf` 一脉），不硬转。
  const byKey = new Map<string, string>();
  for (const t of SCENE_09_PHOTO) {
    if ('key' in t && 'prompt_template' in t) byKey.set(t.key, t.prompt_template);
  }
  return groups.map((g) => (g.id !== 'body_photo' ? g : {
    ...g,
    subgroups: g.subgroups.map((sg) => ({
      ...sg,
      scenes: sg.scenes.map((sc) => {
        const prompt = byKey.get(sc.id);
        return prompt === undefined || prompt === sc.prompt_template ? sc : { ...sc, prompt_template: prompt };
      }),
    })),
  }));
}

/** 二级分组的**显示序**：按 `HELP_SUBFUNC_ORDER` 的显式序排；表里没列的组保持资产原序；
 *  `既有唤醒词` 恒最后（与速查台 `subfuncKey` 同一口径，两个 HELP 面只有那一份顺序）。
 *
 *  为什么不直接改资产：`wake-assets.ts` 是**老实物逐字落地**（顺序一并落地，供逐条对账），
 *  它的可对账性不能动；顺序是**呈现规则**，故照本文件既有的「装配期按 SoT 覆盖」家法
 *  （同 `withScene09Prompts`）在这里加一层。
 *
 *  效果（用户 2026-09-23 裁定）：体重组的「量体重」由最末提到最前。其余九组里，
 *  `HELP_SUBFUNC_ORDER` 已列的七组资产序本就等于表序（逐组对账过），故一位不动；
 *  未列的主页／分析两组保持资产原序。 */
function withSubgroupOrder(groups: readonly WakeGroupAsset[]): readonly WakeGroupAsset[] {
  return groups.map((g) => {
    const order = HELP_SUBFUNC_ORDER[g.label];
    if (order === undefined) return g;
    const rank = (label: string, assetIndex: number): readonly [number, number] => {
      if (label === HELP_LEGACY_SUBGROUP) return [2, assetIndex];
      const i = order.indexOf(label);
      return i >= 0 ? [0, i] : [1, assetIndex];
    };
    const sorted = g.subgroups
      .map((sg, i) => ({ sg, key: rank(sg.label, i) }))
      .sort((a, b) => (a.key[0] !== b.key[0] ? a.key[0] - b.key[0] : a.key[1] - b.key[1]))
      .map((x) => x.sg);
    return { ...g, subgroups: sorted };
  });
}

/** 资产 → HELP JSON（纯函数；组数／场景数由资产派生，不写死 10／437）。
 *  `version` 是静态读来的一个值（见上），本函数自己不碰 IO，仍可复现。 */
export function buildHelpFileData(now: Date = new Date()): HelpFileData {
  const groups: readonly WakeGroupAsset[] = withSubgroupOrder(withScene09Prompts(WAKE_GROUPS));
  if (groups.length === 0 || WAKE_ASSETS.length === 0) {
    throw new CalorieRenderError('missing-data', 'HELP 资产分组缺失（WAKE_GROUPS 空）');
  }
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: String(groups.length) + ' 分类 · ' + String(WAKE_ASSETS.length)
      + ' 场景 · 更新于 ' + formatHelpMinute(now),
    contact: HELP_CONTACT,
    version: HELP_FILE_VERSION,
    groups,
  };
}

/** 5 键 JSON → 全壳 HTML（T3 #134 与老实物同壳；模板唯一实现已搬家至
 * `base-paint/help-shell:renderHelpShellHtml`——DOM＋CSS变量＋三槽填充物照搬老实物，
 * 本函数只做接线层转发，不自造第二套壳；空分组抛 `missing-data`，调用方 exit 5）。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  return renderHelpShellHtml(data);
}
