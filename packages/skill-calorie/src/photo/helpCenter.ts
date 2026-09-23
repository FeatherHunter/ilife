/** #88 · HELP 速查台（取 F3 并回补 F1／F2 独有能力）· 数据模型 ＋ 壳落地。
 *
 * 三条口径（逐条对齐 `docs/research/t88-plan.md` v2 ＋ `.scratch/orchestrator/t88-acceptance.md`）：
 *  1. **运行期派生，不做 codegen**：唯一权威是 `TRIGGERS`（条数随声明派生，不写死，`triggers/index.ts:48`），
 *     本模块只把它**投影**成 `SceneData`（10 分组／54 子功能／场景数现算＝`TRIGGERS.length`），落盘 JSON 会构成
 *     第二真相源，故不产。
 *  2. **零 base-render 改动**：壳恒走 `renderHelpShell`（`base-render/src/help.ts:675`，冻结签名），
 *     本模块只提供 `sceneData` ＋ `assets`，不新增契约面、不自造第二份模板／样式／运行时。
 *  3. **展示面常量取 F3 逐字**：分组 label／图标序取 `render_help_center.py:44-53`（F3 十组），
 *     子功能序取 `:61-69`；SoT `CATEGORIES`（`triggers/index.ts:19-33`）是**13 条**且 diet 展示名
 *     为「饮食记录」——差异已登记台账 **L-18**（`docs/research/t88-impl-a.md` §5），故不写
 *     「label ⊆ CATEGORIES」这类会自红的守卫。
 *
 * 逐场景 CLI 形态文本（Q11／R17／R32）：壳的 `cliText(scene) = scene.id`（`help.ts:391-393`）恒读
 * `Scene.id`，故 **id 就是卡面展示面**：
 *  - 新场景取 `key`（＝真实键，与 F3 逐字相等；条数随 `TRIGGERS` 派生，不写死）；
 *  - **22 条 legacy 取 `main_prompt.cli` 原文**（R1-7 解耦）：F3 的 `legacy_{wake_word}` 会让卡面
 *    显示并复制一条**不存在的命令**（`help.ts` 侧无该键），差异已登记台账 **L-19**。
 *
 * **#106 回补（Q11 第二半：「F3 丢了逐场景 CLI 展示」）**：卡面 id 之外，另在**详情层**
 * （壳的 Sheet）逐场景发一条 `editable_fields` 行「可执行命令」＝**#81 路由层的 exec CLI**
 * （`calorie-cmd-read calorie.*`，341/436；见 `helpSceneCli`）。三点口径：
 *  1. **槽位**＝冻结面既有的 `SceneEditableField`（`{name,label,value}`），**不新增契约面**；
 *     落点对齐旧 ADR-0008 实施规范「`data_source` → ✅ cli 块 → L4 直接显示」。
 *  2. **内容取路由层、不取 `main_prompt.cli` 原文**：后者 **376/436** 是已不存在的
 *     老命令——`python` 系 370（366 条 `scripts/render_*.py` ＋ `scripts/sync_plan.py` 3 ＋
 *     `scripts/calorie_tracker.py` 1）／`mavis` 3／`mmx` 2／裸键 1，展示它
 *     违背 ADR-0008「必须遵守 3」（可一键复制执行）。（#180 逐条复核后的实况；这批老命令清完后
 *     该串数归 0，本行随之失效。）
 *  3. **非 exec 的 95 条不发该行**（#81 裁定：out-of-scope 10／legacy-chain 85，无单命令入口），
 *     不造占位文案；`text` 态不加该行（纯文本索引，且 #88 D-3 锁「text 尖括号集恒 {<N>}」）。
 *
 * **#368 两栏（票 16：HELP 卡片要带命令与工作流程两栏）**：同一条 `editable_fields` 槽位再加两行
 * ——`命令`＝**注册表命令名**（`calorie.*` 键本体，不是 CLI 全文；`helpSceneCommand`，与 `helpSceneCli`
 * 同一趟 `routesFor` 取值）、`工作流程`＝**该场景所属子功能名**（与卡片分组同一处事实，不另立第二份
 * 流程表）。判据③「身体 13 条卡片的命令字段值 == 注册表命令名（13/13）」就落在这一行上；
 * 行序恒 `命令`→`工作流程`→`可执行命令`（后两行是 #106／#368 各自追加，`可执行命令` 原文不动）。
 */
import { ASSET_WRAPPERS, HELP_SHELL_ID, buildStyleSheet, escapeHtml, renderHelpShell } from 'base-paint';
import type {
  FillTemplateReport,
  Scene,
  SceneData,
  SceneEditableField,
  SceneGroup,
  SceneMetaBlock,
  SceneTypeBadge,
  TemplateAssets,
} from 'base-paint';
import { TRIGGERS } from '../triggers/index.js';
import type { SceneTrigger, Trigger } from '../triggers/index.js';
import { NEW_KEY_ROUTES, routesFor } from '../triggers/routing.js';
import { COPY_RUNTIME_JS } from '../render/copy.js';
import { CalorieRenderError } from '../render/errors.js';
import { CALORIE_TEMPLATES, loadTemplate } from './templates.js';

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
const LF = String.fromCharCode(10);

/** 速查台标题面（F3 `卡路里.html` payload 逐字：`skill_name`／`title`）。 */
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

/** 联系作者（F3 payload 的 `contact.items` 逐字，含 Issues 一条）。 */
export const HELP_CONTACT: SceneData['contact'] = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' }),
  ]),
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

/* ── S3 · 看板页入口（#107）：6 个 view 页模板 → 速查台「看板页入口」块 ──────────────
 *
 * 背景（#107／地图 #63 D4「6 个死模板并入 HELP」）：`templates/*.html` 6 件此前只被
 * 装载器与发布门读，**生产渲染链零消费＝死文件**。本模块是它们的**唯一消费者**：
 * 逐件经 `loadTemplate` 读盘 → 抽取三个锚点（`<h1>` 页名／`<p class="lead">` 一句说明／
 * `<pre class="view-cli">` 取数命令）→ 走 `SceneData.meta_blocks`（base-paint 契约
 * 既有槽位，`html` 原样透传）渲染进速查台。**改模板一个字，速查台产物即变**——
 * 「被真正使用」由此可机械验证（`test/skill-t11.test.mjs`）。
 *
 * 锚点口径：每件**恰 1 处**，缺失／重复／空值即抛（`missing-data`；命令非 `calorie-cmd-read`
 * 开头即 `bad-input`），不返空、不静默跳过（仓库「缺失阻断不返空」口径）。
 */

export const HELP_VIEW_ENTRIES_META_ID = 'view-entries';
export const HELP_VIEW_ENTRIES_META_TITLE = '看板页入口';

export interface HelpViewEntry {
  /** 模板 stem（＝`CALORIE_TEMPLATES` 成员，如 `home`）。 */
  readonly name: string;
  /** `<h1>` 文本（看板页名）。 */
  readonly title: string;
  /** `<p class="lead">` 文本（一句话说明）。 */
  readonly lead: string;
  /** `<pre class="view-cli">` 文本（取数命令，恒 `calorie-cmd-read …` 开头）。 */
  readonly cli: string;
}

/** 抽取锚点（**字面量恒此处一份**；模板侧只负责出现恰 1 次）。 */
const VIEW_ENTRY_ANCHORS = {
  title: '<h1>([^<]*)</h1>',
  lead: '<p class="lead">([^<]*)</p>',
  cli: '<pre class="view-cli">([^<]*)</pre>',
} as const;

function pickAnchor(html: string, pattern: string, name: string, label: string): string {
  const hits = [...html.matchAll(new RegExp(pattern, 'g'))].map((match) => match[1].trim());
  if (hits.length !== 1) {
    throw new CalorieRenderError(
      'missing-data',
      '模板 ' + name + ' 的 ' + label + ' 必须恰 1 处，实测 ' + String(hits.length),
    );
  }
  if (hits[0] === '') throw new CalorieRenderError('missing-data', '模板 ' + name + ' 的 ' + label + ' 为空');
  return hits[0];
}

/** 6 件模板 → 看板页入口（顺序恒 `CALORIE_TEMPLATES`；逐件真读盘，缺件即抛）。 */
export function buildHelpViewEntries(): HelpViewEntry[] {
  return CALORIE_TEMPLATES.map((name) => {
    const html = loadTemplate(name);
    const cli = pickAnchor(html, VIEW_ENTRY_ANCHORS.cli, name, '<pre class="view-cli">');
    if (!cli.startsWith('calorie-cmd-read ')) {
      throw new CalorieRenderError('bad-input', '模板 ' + name + ' 的取数命令非 calorie-cmd-read 开头：' + cli);
    }
    return {
      name,
      title: pickAnchor(html, VIEW_ENTRY_ANCHORS.title, name, '<h1>'),
      lead: pickAnchor(html, VIEW_ENTRY_ANCHORS.lead, name, '<p class="lead">'),
      cli,
    };
  });
}

/** 入口块 HTML（`meta_blocks[].html` **原样透传** ⇒ 本函数自负转义）。 */
export function renderViewEntriesHtml(entries: readonly HelpViewEntry[] = buildHelpViewEntries()): string {
  const items = entries.map((entry) => '<li data-view-entry="' + escapeHtml(entry.name) + '">'
    + '<b>' + escapeHtml(entry.title) + '</b> ' + escapeHtml(entry.lead) + '<br>'
    + '<code style="white-space:pre-wrap;word-break:break-all">' + escapeHtml(entry.cli) + '</code>'
    + '</li>');
  return '<ol class="view-entries">' + items.join(LF) + '</ol>';
}

/** 速查台「看板页入口」块（`meta_blocks` 槽位；`id`／`title` 恒本模块常量）。 */
export function helpViewEntriesMetaBlock(
  entries: readonly HelpViewEntry[] = buildHelpViewEntries(),
): SceneMetaBlock {
  return { id: HELP_VIEW_ENTRIES_META_ID, title: HELP_VIEW_ENTRIES_META_TITLE, html: renderViewEntriesHtml(entries) };
}

/* ── #471 · 新词别名节（`list:'new'` 族 → 命令） ──────────────────────────────────
 *
 * 背景（票 #471 裁定 B）：速查台的**场景取数面**只收 `SceneTrigger`（判据 `isSceneTrigger`），
 * `list:'new'` 族不在其中——这批词能跑（路由层 `ALL_ROUTES` 收它们），但问 HELP 问不到。
 * B 案**不动取数面**（`groups` 仍是同一批场景，条数不变），另起这一节把族里的词按「词 → 命令」列出。
 *
 * 派生判据（防陈化，票面「计数一律派生」）：本节内容**全部**来自生成物 `NEW_KEY_ROUTES`
 * （`pnpm gen` 从各能力件 `src/<能力>/routes.ts` 的 `list:'new'` 逐条派生，头注自带同一个条数）
 * ——词面／命令名／CLI 逐条投影，**本件不写一条词、不写一个条数**；节标题里的条数也是
 * `aliases.length` 现算。声明件增删一条，本节与标题跟着变（测试件逐词对声明件复核）。
 *
 * 三态同源：`file`／`inline` 走 `meta_blocks`（与「看板页入口」同一处理方式），`text` 走文本段。
 * 文本段**只发「词 · 命令名」不发 CLI**：text 态的尖括号集恒 `{<N>}` 是 #88 D-3 的冻结断言，
 * 而新词里 `存身材照` 一族的 CLI 自带 `<照片路径>`／`<日期>` 这类占位符，发 CLI 会破那条断言。
 */

export const HELP_NEW_ALIASES_META_ID = 'new-word-aliases';
export const HELP_NEW_ALIASES_META_TITLE = '新词别名';

export interface HelpNewAlias {
  /** 词（＝声明件的 `wakeWord`）。 */
  readonly wakeWord: string;
  /** 注册表命令名（＝声明件的 `key`）。 */
  readonly key: string;
  /** 可执行 CLI 全文（＝声明件的 `cli`）。 */
  readonly cli: string;
}

/** 节标题：条数**现算**（不嵌死；两个面同一个函数，免得两处各写一个数）。 */
export function newAliasesTitle(count: number): string {
  return HELP_NEW_ALIASES_META_TITLE + '（' + String(count) + ' 条）';
}

/** `NEW_KEY_ROUTES` → 新词别名行（顺序＝生成物序＝声明件的 `(list, order)` 序；逐条派生）。 */
export function buildHelpNewAliases(): HelpNewAlias[] {
  return NEW_KEY_ROUTES.map((route) => ({ wakeWord: route.wakeWord, key: route.key, cli: route.cli }));
}

/** 新词别名块 HTML（`meta_blocks[].html` **原样透传** ⇒ 本函数自负转义）。 */
export function renderNewAliasesHtml(aliases: readonly HelpNewAlias[] = buildHelpNewAliases()): string {
  const items = aliases.map((alias) => '<li data-new-alias="' + escapeHtml(alias.wakeWord) + '">'
    + '<b>' + escapeHtml(alias.wakeWord) + '</b> <code>' + escapeHtml(alias.key) + '</code><br>'
    + '<code style="white-space:pre-wrap;word-break:break-all">' + escapeHtml(alias.cli) + '</code></li>');
  return '<ol class="new-aliases">' + items.join(LF) + '</ol>';
}

/** 速查台「新词别名」块（`meta_blocks` 槽位；`id` 恒本模块常量，`title` 带派生条数）。 */
export function helpNewAliasesMetaBlock(
  aliases: readonly HelpNewAlias[] = buildHelpNewAliases(),
): SceneMetaBlock {
  return { id: HELP_NEW_ALIASES_META_ID, title: newAliasesTitle(aliases.length), html: renderNewAliasesHtml(aliases) };
}

/* ── S2 · 壳落地：三态同源（file／inline／text），恒走 `renderHelpShell` ───────── */

/** 交付形态（P-5：默认 `file`；`inline` 供宿主页面内嵌；`text` 为纯文本索引接缝）。 */
export const HELP_CENTER_MODES = ['file', 'inline', 'text'] as const;

export type HelpCenterMode = (typeof HELP_CENTER_MODES)[number];

/** 壳的共享资产（**唯一产出者恒为 base-paint**：helpers 取 `COPY_RUNTIME_JS`＝
 *  `buildSharedHelpersJs()` 的逐字产出，样式取 `buildStyleSheet().css`；技能侧零自产）。 */
export function helpCenterAssets(): TemplateAssets {
  return { sharedHelpersJs: COPY_RUNTIME_JS, sharedCssText: buildStyleSheet().css };
}

export interface HelpCenterRenderOptions {
  /** 缺省 `file`（完整 HTML 文档）。 */
  readonly mode?: HelpCenterMode;
  /** 见 `HelpSceneDataOptions.updatedAt`。 */
  readonly updatedAt?: string;
  /** 覆盖数据（测试／调用方复用已派生数据时用；缺省按 `updatedAt` 现派生）。 */
  readonly sceneData?: SceneData;
  /** 透传 `fillTemplate` 的 `strict`（信封校验）。 */
  readonly strict?: boolean;
}

export interface HelpCenterRenderResult {
  readonly mode: HelpCenterMode;
  readonly html: string;
  /** 壳的填充报告（六标记逐项计数，供守卫①读）。 */
  readonly report: FillTemplateReport;
}

/** 取 `<section id="ilife-help-shell">…</section>` 片段（**按深度配对**，不靠正则贪婪）。 */
function sectionFragment(html: string): string {
  const anchor = 'id="' + HELP_SHELL_ID + '"';
  const anchorIndex = html.indexOf(anchor);
  if (anchorIndex < 0) throw new CalorieRenderError('missing-data', 'HELP 壳产物缺锚点 ' + anchor);
  const start = html.lastIndexOf('<section', anchorIndex);
  if (start < 0) throw new CalorieRenderError('missing-data', 'HELP 壳产物锚点前无 <section>');
  const open = /<section\b/g;
  const close = /<\/section>/g;
  let depth = 0;
  let cursor = start;
  while (cursor < html.length) {
    open.lastIndex = cursor;
    close.lastIndex = cursor;
    const nextOpen = open.exec(html);
    const nextClose = close.exec(html);
    if (nextClose === null) break;
    if (nextOpen !== null && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      cursor = nextClose.index + nextClose[0].length;
      if (depth === 0) return html.slice(start, cursor);
    }
  }
  throw new CalorieRenderError('missing-data', 'HELP 壳产物 <section> 未闭合');
}

/** `inline` 态：**片段自带 `<style>`（钉死落点＝片段最前）＋ helpers（片段最后）**。
 *
 * 片段无 `<head>`，若不带 `<style>` 则整页无样式（P-5 蓝队补充）；包裹标签恒读
 * `ASSET_WRAPPERS`（不写第二份字面量）。
 */
function inlineFragment(html: string, assets: TemplateAssets): string {
  const fragment = sectionFragment(html);
  const style = ASSET_WRAPPERS.sharedCssText.openTag + assets.sharedCssText + ASSET_WRAPPERS.sharedCssText.closeTag;
  const helpers = ASSET_WRAPPERS.sharedHelpersJs.openTag + assets.sharedHelpersJs
    + ASSET_WRAPPERS.sharedHelpersJs.closeTag;
  return style + LF + fragment + LF + helpers;
}

/** `text` 态：同一 `SceneData` 的纯文本索引（无标签、无脚本；供 CLI／日志面复用）。
 *
 * 末尾追加同一份「看板页入口」（#107）：与 `file`／`inline` 的 `meta_blocks` 块**同源同序**，
 * 使三态在内容上仍是一份数据换三个载体。入口行缩进 2 空格（场景行恒 4 空格，
 * `help-center-91` 的 `textSceneIds` 只认 4 空格行，故不污染场景序（条数随派生）。
 * #471：同一段再追加「新词别名」节（同样是 2 空格缩进），只发「词 · 命令名」不发 CLI（见该节件头）。
 */
function renderTextIndex(
  data: SceneData,
  entries: readonly HelpViewEntry[],
  aliases: readonly HelpNewAlias[],
): string {
  const lines: string[] = [data.skill_name + ' ' + data.title];
  if (typeof data.subtitle === 'string') lines.push(data.subtitle);
  for (const group of data.groups) {
    lines.push('');
    lines.push('[' + group.label + ']');
    for (const subgroup of group.subgroups) {
      lines.push('  ' + subgroup.label + ' (' + subgroup.id + ')');
      for (const scene of subgroup.scenes) {
        lines.push('    ' + scene.wake_word + ' · ' + scene.id);
      }
    }
  }
  lines.push('');
  lines.push('[' + HELP_VIEW_ENTRIES_META_TITLE + ']');
  for (const entry of entries) lines.push('  ' + entry.title + ' · ' + entry.cli);
  lines.push('');
  lines.push('[' + newAliasesTitle(aliases.length) + ']');
  for (const alias of aliases) lines.push('  ' + alias.wakeWord + ' · ' + alias.key);
  return lines.join(LF) + LF;
}

/** HELP 速查台渲染（三态同源：同一 `SceneData` ＋ 同一资产 ＋ 同一 `renderHelpShell`）。
 *
 * - `file`：完整 HTML 文档（`<!DOCTYPE html>`…），落盘／`file://` 打开；
 * - `inline`：`<style>` ＋ `<section id="ilife-help-shell">` 片段 ＋ helpers `<script>`；
 * - `text`：纯文本索引（数据同源，只换载体）。
 *
 * 三态**都先过 `renderHelpShell`**（同一 schema 校验与同一填充器），故不存在第二套数据路径。
 * #107：三态各自**同一份**「看板页入口」（6 件模板派生）——`file`／`inline` 走 `meta_blocks`，
 * `text` 走文本段；#471：再各加**同一份**「新词别名」节（`NEW_KEY_ROUTES` 派生），落点同前一条。
 * 签名与三态语义不变。
 */
export function renderHelpCenterHtml(opts: HelpCenterRenderOptions = {}): HelpCenterRenderResult {
  const mode: HelpCenterMode = opts.mode === undefined ? 'file' : opts.mode;
  if (!HELP_CENTER_MODES.includes(mode)) {
    throw new CalorieRenderError('bad-input', 'HELP 交付形态非法：' + String(mode));
  }
  const baseData = opts.sceneData ?? buildHelpSceneData(
    opts.updatedAt === undefined ? {} : { updatedAt: opts.updatedAt },
  );
  const entries = buildHelpViewEntries();
  const aliases = buildHelpNewAliases();
  const sceneData: SceneData = {
    ...baseData,
    meta_blocks: [
      ...(baseData.meta_blocks ?? []),
      helpViewEntriesMetaBlock(entries),
      helpNewAliasesMetaBlock(aliases),
    ],
  };
  const assets = helpCenterAssets();
  const output = renderHelpShell({ sceneData, assets, strict: opts.strict === true });
  if (mode === 'file') return { mode, html: output.html, report: output.report };
  if (mode === 'inline') return { mode, html: inlineFragment(output.html, assets), report: output.report };
  return { mode, html: renderTextIndex(sceneData, entries, aliases), report: output.report };
}
