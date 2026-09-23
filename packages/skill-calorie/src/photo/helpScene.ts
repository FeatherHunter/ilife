/** HELP 的场景数据模型：`TRIGGERS` → `SceneData`（HELP HTML 的取数面；本技能现在只有这一份交付面）。
 *
 * 来历：本件原为 #88「HELP 速查台」的数据模型面（速查台与 HELP 文件同源的那一份）。速查台＝同一内容的
 * 第二份产物（组件式三态壳 ＋ 两个 `meta_blocks` 节），按用户 2026-09-24 裁定「不存在速查台这种实际场景，
 * 我们只有 HELP HTML」整支下线，本件只留两个面共用过的模型与展示序常量。历史证据件（#88／#91／#106／
 * #107／#471）原样留档，不再回改。
 *
 * 仍成立的三条口径：
 *  1. **运行期派生，不做 codegen**：唯一权威是 `TRIGGERS`（条数随声明派生，不写死），本件只把它**投影**成
 *     `SceneData`（10 分组／54 子功能／场景数现算＝`TRIGGERS.length`）；落盘 JSON 会构成第二真相源，故不产。
 *  2. **展示面常量取 F3 逐字**：分组 label／图标序取 `render_help_center.py:44-53`（F3 十组），子功能序取
 *     `:61-69`；SoT `CATEGORIES`（`triggers/index.ts:19-33`）是**13 条**且 diet 展示名为「饮食记录」——
 *     差异已登记台账 **L-18**（`docs/research/t88-impl-a.md` §5），故不写「label ⊆ CATEGORIES」这类会自红的守卫。
 *  3. **标题面单一来源**：`HELP_SKILL_NAME`／`HELP_TITLE` 在本仓只此一份；`helpFile.ts` 的 `HELP_FILE_SKILL_NAME`
 *     ／`HELP_FILE_TITLE` 是它的别名（不再各写一遍值，免得两处走散）。
 *
 * **#106 回补（Q11 第二半）**：卡面 id 之外，另在**详情层**逐场景发一条 `editable_fields` 行「可执行命令」
 * ＝#81 路由层的 exec CLI（`calorie-cmd-read calorie.*`；见 `helpSceneCli`）。口径：槽位取冻结面既有的
 * `SceneEditableField`（`{name,label,value}`），内容**取路由层、不取 `main_prompt.cli` 原文**（后者多数是已不
 * 存在的老命令，展示它违背 ADR-0008「必须遵守 3」）；非 exec 的 95 条不发该行，不造占位文案。
 *
 * **#368 两栏**：同一条 `editable_fields` 槽位再加两行——`命令`＝**注册表命令名**（`calorie.*` 键本体，不是
 * CLI 全文；`helpSceneCommand`，与 `helpSceneCli` 同一趟 `routesFor` 取值）、`工作流程`＝**该场景所属子功能名**
 * （与卡片分组同一处事实，不另立第二份流程表）。行序恒 `命令`→`工作流程`→`可执行命令`。
 */
import type {
  Scene,
  SceneData,
  SceneEditableField,
  SceneGroup,
  SceneTypeBadge,
} from 'base-paint';
import { TRIGGERS } from '../triggers/index.js';
import type { SceneTrigger, Trigger } from '../triggers/index.js';
import { routesFor } from '../triggers/routing.js';
/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
const LF = String.fromCharCode(10);

/** HELP 标题面（F3 `卡路里.html` payload 逐字：`skill_name`／`title`）。 */
export const HELP_SKILL_NAME = '卡路里';
export const HELP_TITLE = '唤醒词速查台';

/** 10 分组（**F3 序 ＋ F3 逐字 label／图标**，`render_help_center.py:44-53`）。
 *
 * 与 SoT `CATEGORIES`（13 条）的差异：① 本表只含**有场景落点**的 10 组；② diet 展示名 F3 是
 * 「饮食」而 SoT 是「饮食记录」（L-18）；③ 图标 `⚙️ profile`（F3）vs `🛠 profile`（SoT）。
 * 台账见 `docs/research/t88-impl-a.md` §5。
 */
export const HELP_GROUPS: readonly { readonly id: string; readonly icon: string; readonly label: string }[] =
  Object.freeze([
    { id: 'home', icon: '🏠', label: '主页' },
    { id: 'diet', icon: '🍚', label: '饮食' },
    { id: 'weight', icon: '⚖️', label: '体重' },
    { id: 'exercise', icon: '🏃', label: '运动' },
    { id: 'workout', icon: '💪', label: '健身计划' },
    { id: 'goal', icon: '🎯', label: '目标管理' },
    { id: 'body_detail', icon: '🧬', label: '身体细节' },
    { id: 'body_photo', icon: '📸', label: '身材照片' },
    { id: 'profile', icon: '⚙️', label: '基础信息' },
    { id: 'analysis', icon: '📊', label: '分析' },
  ]);

/** 分组的**子功能显式顺序**（前 7 组逐字照抄 `render_help_center.py:61-69`；未列出的子功能按首次
 *  出现序，`既有唤醒词` 恒最后）。
 *
 *  **「体重」一项不是 F3 原样，是本仓的用户裁定**（用户 2026-09-23 逐字：「体重TAB下最底部的 量体重
 *  这个模块放到排序的一个。现在在底部用户很难用到。」）：F3 实物把「量体重」摆在体重组最末，
 *  而这一组八条里只有它带写入动作（记体重／补录／批量补录／看今日体重），日常用得最频，摆最末够不到。
 *  其余七条照 SoT 场景表《03-体重》的八条流程正序（与 `scripts/build-help.mjs` 的 `BODY_HELP_FLOWS` 同序，
 *  那八条流程名的事实住各命令声明的 `flows`）。
 *
 *  这张表**同时管两个 HELP 面**：速查台（本文件的 `buildHelpSceneData`）与 HELP 文件
 *  （`helpFile.ts:withSubgroupOrder`）——二级分组的显示序只有这一份定义地，两面不许各排各的。 */
export const HELP_SUBFUNC_ORDER: Readonly<Record<string, readonly string[]>> = Object.freeze({
  '基础信息': ['设置资料', '看档案', '改资料'],
  '目标管理': ['定目标', '看目标', '改目标'],
  '身体细节': ['记身体细节', '看身体细节', '比身体细节', '删身体细节'],
  '运动': ['记运动', '改运动', '看运动', '运动分析', '运动复盘'],
  '身材照片': ['存身材照', '看身材照', '比身材照', '管身材照'],
  '饮食': ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布'],
  '健身计划': ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查'],
  '体重': ['量体重', '改体重记录', '看体重明细', '看体重曲线', '看体重稳不稳', '看体重备注', '对比体重', '体重复盘'],
});

/** legacy 分组收口：`复盘` → `分析`（`render_help_center.py:56-58`）。 */
export const HELP_LEGACY_CATEGORY: Readonly<Record<string, string>> = Object.freeze({ '复盘': '分析' });

/** legacy 子功能名（F3 恒把旧版条目收在「既有唤醒词」子功能下）。 */
export const HELP_LEGACY_SUBGROUP = '既有唤醒词';

/* ── #106 · 逐场景「可执行命令」回补（Q11 第二半） ────────────────────────────────
 *
 * 数据来源＝**#81 路由层**（`triggers/routing.ts` 的 `WAKE_ROUTES`；exec 桶 341 条，
 * `docs/research/t81-exec-smoke.md` 全量实跑 exit 0）。单一真相：本模块不自造键、
 * 不读 `main_prompt.cli` 原文、不做 `python → calorie-cmd-read` 的二次翻译。
 */

/** 字段名（`data-field` 承载值）；**恒本模块常量**，不写第二份字面量。 */
export const HELP_CLI_FIELD_NAME = 'cli';
/** #368 · 卡片的「命令」字段名（`data-field` 承载值）：值＝**注册表命令名**（`calorie.*`，非 CLI 全文）。 */
export const HELP_COMMAND_FIELD_NAME = 'command';
/** #368 · 卡片的「工作流程」字段名：值＝该场景所属的子功能名（与卡片分组同一处事实）。 */
export const HELP_FLOW_FIELD_NAME = 'flow';

/** 对外文案（对齐 ADR-0008「可一键复制执行」口径）。 */
export const HELP_CLI_FIELD_LABEL = '可执行命令';
/** #368 · 卡片「命令」字段的对外文案。 */
export const HELP_COMMAND_FIELD_LABEL = '命令';
/** #368 · 卡片「工作流程」字段的对外文案（AI 靠它知道从哪一段流程执行下去）。 */
export const HELP_FLOW_FIELD_LABEL = '工作流程';

/** 唤醒词 → 该场景的**可执行 CLI**；无 exec 路由（#81 的 95 条 non-exec）→ `null`。
 *
 * 记身材照一词三命中（`body_photo_add_single`／`_note`／`_batch`）：路由层按唤醒词给键，
 * 三条同唤醒词场景取到同一条 CLI——如实照搬路由层口径，差异见 `t106-*.md` 台账。
 */
export function helpSceneCli(wakeWord: string): string | null {
  for (const route of routesFor(wakeWord)) {
    if (route.kind === 'exec') return route.cli;
  }
  return null;
}

/** 唤醒词 → 该场景的**注册表命令名**（`calorie.*`）；无 exec 路由 → `null`。
 *
 * 与 `helpSceneCli` 同一趟取值（同一份 `routesFor` 记录），只少一层 `calorie-cmd-read` 前缀与参数：
 * 卡片「命令」列要的是**命令名**这一件事实（#368 判据③），CLI 全文归 `helpSceneCli` 那一条。
 */
export function helpSceneCommand(wakeWord: string): string | null {
  for (const route of routesFor(wakeWord)) {
    if (route.kind === 'exec') return route.key;
  }
  return null;
}

/** 该唤醒词的 `editable_fields`（无 exec 路由时返空数组＝**不发字段**，不造空值行）。
 *
 * 三行（#368 起）：`命令`（注册表命令名）＋`工作流程`（子功能名）＋`可执行命令`（CLI 全文，**末行**）。
 * 「工作流程」的值取**该场景所属子功能名**——与卡片分组（`HELP_SUBFUNC_ORDER`／`subgroup.label`）
 * 同一处事实，不另立第二份流程表；卡片分组为空时不发该行（不造空值行）。
 */
function cliFields(wakeWord: string, flow: string): SceneEditableField[] {
  const command = helpSceneCommand(wakeWord);
  if (command === null) return [];
  const fields: SceneEditableField[] = [
    { name: HELP_COMMAND_FIELD_NAME, label: HELP_COMMAND_FIELD_LABEL, value: command },
  ];
  if (flow !== '') fields.push({ name: HELP_FLOW_FIELD_NAME, label: HELP_FLOW_FIELD_LABEL, value: flow });
  fields.push({ name: HELP_CLI_FIELD_NAME, label: HELP_CLI_FIELD_LABEL, value: helpSceneCli(wakeWord) as string });
  return fields;
}

/** `output_type` → 徽章（**必须发 `SceneTypeBadge{text,bg,fg}`**，E-2）。
 *
 * 三档配色逐字取 F3 运行时 `TYPE_DEFAULT`（`卡路里.html` 的 `var TYPE_DEFAULT`，脚本段；
 * 本 session 复算：`结果/回执 → #e8f2ff/#0a63ce`、`过程 → #e2f7f5/#00897b`）。
 * 只发字符串会走 CSS 默认色＝丢三档色（`help.ts:451-459`），故恒发对象。
 * H-01 禁色表（`#0a84ff/#af52de/#ff375f/#0071e3`）**不含**本表两色（P-3 白名单断言）。
 */
export const HELP_TYPE_BADGES: Readonly<Record<string, SceneTypeBadge>> = Object.freeze({
  process: { text: '过程', bg: '#e2f7f5', fg: '#00897b' },
  result: { text: '结果', bg: '#e8f2ff', fg: '#0a63ce' },
  receipt: { text: '回执', bg: '#e8f2ff', fg: '#0a63ce' },
});

/** 联系作者（F3 payload 的 `contact.items` 逐字，含 Issues 一条）。
 *
 *  `copy_all` 一位**不是 F3 原样，是本仓的用户裁定**（用户 2026-09-23 图报「关于」Tab）：
 *  老实物 F3 的 `contact` 只有 `items` 两条，「一键复制」那一行在共享模板里要
 *  `if (CONTACT.copy_all)` 才画（`packages/base-render/assets/help-template.html:1835`），
 *  缺这一位时「关于」Tab 第一段就只剩两行链接，而四家兄弟包（记账／居家／作息／私家大厨）
 *  都有的复制按钮在我们这页不出现。用户裁定补上。
 *
 *  **值给字符串**（`'一键复制'`）：本包装的 `base-paint` 里 `SceneContact.copy_all`
 *  已是 **`string`**（`packages/base-render/src/spec/help.ts`；语义见该层
 *  `src/help.ts:32` 「新类型 `string`，R23」——旧布尔语义的「一键复制」按钮）。
 *  模板判的是真值（`if (CONTACT.copy_all)`），故字符串照样出按钮；给布尔在本包**过不了类型检查**。
 *  兄弟四家此刻仍是布尔（`copy_all: true as const`）——它们各自 pin 着上一版 `base-paint`，
 *  不是本包能替它们改的，差异已如实记在交付说明里。 */
export const HELP_CONTACT: SceneData['contact'] = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' }),
  ]),
  copy_all: '一键复制',
});

/** `buildHelpSceneData` 选项（P-2：时间戳**显式参数**，缺省不写，保证字节稳定）。 */
export interface HelpSceneDataOptions {
  /** 形如 `2026-09-09 12:00`；缺省时 `subtitle` 不含时间戳（两次调用逐字相同）。 */
  readonly updatedAt?: string;
}

/** 新场景条目判定（与 SoT 结构一致：`SceneTrigger` 独有 `output_type` ＋ `prompt_template`）。 */
function isSceneTrigger(trigger: Trigger): trigger is SceneTrigger {
  return 'output_type' in trigger && 'prompt_template' in trigger;
}

/** 内部可变形态（对外只发 `SceneGroup` 的 readonly 形状）。 */
interface MutableSubgroup {
  id: string;
  label: string;
  scenes: Scene[];
}
interface MutableGroup {
  id: string;
  icon: string;
  label: string;
  subgroups: MutableSubgroup[];
}

/** 子功能排序键（F3 规则：显式序 → 未列出 → `既有唤醒词` 恒最后）。 */
function subfuncKey(category: string, subfunction: string): readonly [number, number, string] {
  const order = HELP_SUBFUNC_ORDER[category];
  if (order !== undefined && order.includes(subfunction)) return [0, order.indexOf(subfunction), subfunction];
  if (subfunction === HELP_LEGACY_SUBGROUP) return [2, 0, subfunction];
  return [1, 0, subfunction];
}

function compareKey(a: readonly [number, number, string], b: readonly [number, number, string]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0;
}

/** 运行期派生：`TRIGGERS` → `SceneData`（10 分组／54 子功能／场景数现算，不写死）。
 *
 * 纯函数、零 I/O、零缓存；两次同参调用逐字相等（P-2 口径）。
 */
export function buildHelpSceneData(opts: HelpSceneDataOptions = {}): SceneData {
  const updatedAt = typeof opts.updatedAt === 'string' && opts.updatedAt !== '' ? opts.updatedAt : undefined;

  const groups: MutableGroup[] = HELP_GROUPS.map((group) => ({
    id: group.id,
    icon: group.icon,
    label: group.label,
    subgroups: [],
  }));
  const byLabel = new Map<string, MutableGroup>(groups.map((group) => [group.label, group]));

  const push = (scene: Scene, category: string, subfunction: string): void => {
    const group = byLabel.get(category);
    if (group === undefined) return; // 非 10 组的 SoT 分类（食品库／综合等）不入速查台（F3 同口径）
    let subgroup = group.subgroups.find((item) => item.label === subfunction);
    if (subgroup === undefined) {
      subgroup = { id: group.id + '_' + (group.subgroups.length + 1), label: subfunction, scenes: [] };
      group.subgroups.push(subgroup);
    }
    subgroup.scenes.push(scene);
  };

  /* ── 414 条新场景：按（子功能序，order，name）排序；`id` = key ── */
  const newTriggers = TRIGGERS.filter(isSceneTrigger).slice().sort((a, b) => {
    const cmp = compareKey(
      subfuncKey(a.category, a.subfunction),
      subfuncKey(b.category, b.subfunction),
    );
    if (cmp !== 0) return cmp;
    if (a.order !== b.order) return a.order - b.order;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
  for (const trigger of newTriggers) {
    const badge = HELP_TYPE_BADGES[trigger.output_type];
    const fields = cliFields(trigger.wake_word, trigger.subfunction);
    const scene: Scene = {
      id: trigger.key,
      title: trigger.name,
      wake_word: trigger.wake_word,
      status: '',
      prompt_template: trigger.prompt_template,
      ...(badge === undefined ? {} : { types: [badge] }),
      ...(fields.length === 0 ? {} : { editable_fields: fields }),
    };
    push(scene, trigger.category, trigger.subfunction !== '' ? trigger.subfunction : HELP_LEGACY_SUBGROUP);
  }

  /* ── 22 条 legacy：按唤醒词排序；`id` = `main_prompt.cli` 原文（R1-7，台账 L-19） ── */
  const legacyTriggers = TRIGGERS.filter((trigger) => !isSceneTrigger(trigger))
    .slice()
    .sort((a, b) => (a.wake_word < b.wake_word ? -1 : a.wake_word > b.wake_word ? 1 : 0));
  for (const trigger of legacyTriggers) {
    // legacy 行没有子功能名（F3 恒把它们收在「既有唤醒词」下），`flow` 传空＝不发该行。
    const fields = cliFields(trigger.wake_word, '');
    const scene: Scene = {
      id: trigger.main_prompt.cli,
      title: trigger.wake_word,
      wake_word: trigger.wake_word,
      status: '',
      prompt_template: trigger.main_prompt.text,
      ...(fields.length === 0 ? {} : { editable_fields: fields }),
    };
    const category = HELP_LEGACY_CATEGORY[trigger.category] ?? trigger.category;
    push(scene, category, HELP_LEGACY_SUBGROUP);
  }

  /* ── 子功能排序（F3：显式序 → 首次出现序 → 既有唤醒词最后） ── */
  for (const group of groups) {
    group.subgroups.sort((a, b) => compareKey(
      subfuncKey(group.label, a.label),
      subfuncKey(group.label, b.label),
    ));
  }

  const rendered: SceneGroup[] = groups.filter((group) => group.subgroups.length > 0);
  const sceneCount = rendered.reduce(
    (total, group) => total + group.subgroups.reduce((sub, item) => sub + item.scenes.length, 0),
    0,
  );
  const subtitle = String(rendered.length) + ' 分类 · ' + String(sceneCount) + ' 场景'
    + (updatedAt === undefined ? '' : ' · 更新于 ' + updatedAt);

  return {
    skill_name: HELP_SKILL_NAME,
    title: HELP_TITLE,
    subtitle,
    contact: HELP_CONTACT,
    groups: rendered,
  };
}