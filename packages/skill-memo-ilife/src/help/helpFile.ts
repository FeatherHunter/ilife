/** #228 · 备忘录 HELP 的**渲染接线**：内容资产 ＋ 派生 → 通用 help 模板（`base-paint/help-shell`）全页 HTML。
 *
 * 本模块**零 IO、零落盘**：落点与写盘全归 #229（`src/help/manifest.ts` ＋ 出口的落盘那一小块）。
 * 走 **A 路**（`renderHelpShellHtml`），**不新写页面**；`packages/base-render/**` 一行不改
 * （要改渲染规则得改源 `assets/help-template.html` 再跑 `pnpm --filter base-paint gen:help-shell`）。
 *
 * ## 三块可选键与共享层「校验器／模板」的四处不一致（本票实测，逐条留证）
 *
 * 通用模板有**两条消费路**，对同一份载荷的要求**互相冲突**：
 *  - **A 路**（`renderHelpShellHtml`，本图的交付路径）**不做 schema 校验**，只要求 `groups` 非空；
 *  - **B 路**（`renderHelpShell` → `validateSceneData` → `SCENE_DATA_SCHEMA`）是 fail-closed 的校验器。
 *
 * **裁决 20（编排会话，2026-09-12）定规则**：本图走 A 路、维护者验收只看页面 ⇒
 * **凡「满足校验器」与「页面渲染正确」冲突时，取页面正确那一边**，分歧逐条记账（记本文件 ＋ `#242`），
 * **不许改共享层**。
 *
 * | 键 | 校验器（B 路） | A 路模板运行时（`help-template.html`） | 本票取边（＝裁决 20） |
 * | --- | --- | --- | --- |
 * | `init_banner.steps` | 只许 **`string[]`** ⇒ 对象数组报 `类型不符：期望 string，实际 object` | 读 `st.title`／`st.desc` ⇒ 要 **`{title,desc}[]`** | **传 `{title,desc}[]`**：`string[]` 会渲染出 6 个**有序号、无文案**的空格子，那是**用户看得见的缺陷**；校验器那半条归共享层缺陷 `#242` |
 * | `init_banner.hidden` | **闭集外** ⇒ `schema-invalid 多余字段：hidden` | 显隐**唯一**开关（`INIT_BANNER && !INIT_BANNER.hidden`） | **传**：不传则「已初始化」的差异永远显不出来 |
 * | `init_banner.closable` | **闭集外** ⇒ `schema-invalid` | `=== false` 才不画 ✕（缺省＝画 ✕） | **不传**：缺省已等价于老的 `closable:true`，且少一处闭集外字段 |
 * | `contact.items[].url` | **闭集外** ⇒ `schema-invalid` | `it.url` 为真才渲染成 `<a>` | **不传**：用户 V6=B 要「可点链接」的意图**落空**，链接由 `value` 明文承载；根因同归 `#242` |
 *
 * ⚠️ **本票载荷只对 A 路合法**：喂给 B 路校验器会因 `hidden`（以及 `steps` 的对象形）判 `schema-invalid`
 * ——这是**共享层缺陷的证据，不是本票交付的缺陷**（`#233` 的读者别误判）。
 *
 * ## 页面上不许出现的东西（用户裁定）
 *
 *  - **命令不上页面**（U6）：载荷里不出现 `memo.*` 命令名，只有唤醒词；
 *  - **不标缺失**（U1／U2／U3）：HELP 是最终完整体，不写「当前无唤醒词」这类状态标记；
 *  - **HELP 自身唤醒词不上页面**（V1）：`meta_blocks` 整块**不传**（`meta_blocks[1]` 那块「怎么喊我」）。
 *    注：`meta_blocks` 是**合规落点但已裁不用**（裁决 15）；`subtitle` 在 A 路模板**无渲染落点**
 *    （读完即弃，只进 `help-data`），故本模块**不派生 `subtitle` 的渲染用途**，只按老口径照传。
 */
import { renderHelpShellHtml } from 'base-paint/help-shell';
import type { HelpShellData } from 'base-paint/help-shell';
import { MEMO_HELP_GROUPS, buildHelpSceneIndex } from './sceneData.js';
import { MemoRenderError } from '../render/errors.js';

/** 5 键头（老 `memo_render.py` 逐字）。`title` **不含**技能名 ⇒ 文档标题由共享层拼成 `备忘录 · 使用手册`。
 *  两个常量**不对外开出口**（票 5 §2.2：本件「运行时 3 个 ＋ 类型 0 个」；要用它们的是出口层，不是别人）。 */
const MEMO_HELP_SKILL_NAME = '备忘录' as const;
const MEMO_HELP_TITLE = '使用手册' as const;

/** 首次使用横幅的 `prompt` 取自该场景的 `prompt_template`（单源，不抄第二份文案）。 */
const HELP_INIT_SCENE_ID = 'memo_init_setup' as const;
/** 老 `init_banner.steps` 的 6 步（`memo_render.py` 的 `_init_banner` 逐字，**是 `{title,desc}` 对象数组**）。
 *  取对象形而非 schema 要的 `string[]`：模板读 `st.title`／`st.desc`（锚点 `INIT_BANNER.steps.map`），
 *  传字符串会渲染成 6 个**有序号、无文案**的空格子＝用户看得见的缺陷 ⇒ 裁决 20「取页面正确那一边」。 */
const HELP_INIT_STEPS: readonly { readonly title: string; readonly desc: string }[] = Object.freeze([
  Object.freeze({ title: '检查并配置 Python', desc: '版本与依赖检测' }),
  Object.freeze({ title: '数据存储', desc: 'SQLite + FTS5 全文搜索' }),
  Object.freeze({ title: '飞书 CLI', desc: '安装并授权(核心联动)' }),
  Object.freeze({ title: '环境变量', desc: 'SKILLS_DB_PATH / MEMO_MEDIA_DIR' }),
  Object.freeze({ title: '初始化数据库', desc: '建表 + 提醒调度' }),
  Object.freeze({ title: '生成报告', desc: '初始化报告页' }),
]);
/** 老两项（`memo_render.py` 的 `contact.items`）；**不带 `url`**（共享 schema 的 `contact.items[]` 是闭集）。 */
const HELP_CONTACT: { readonly items: readonly { readonly label: string; readonly value: string }[] } =
  Object.freeze({
    items: Object.freeze([
      Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }),
      Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' }),
    ]),
  });

/* ── 资产形状（只进不出：本模块类型出口 0 个，需要类型的地方转引公共层契约） ───────── */

/** 渲染载荷里那张场景卡（＝共享 schema `scenes[]` 的闭集 7 键，**没有 `aliases`**）。 */
interface ScenePayload {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly status: string;
  readonly prompt_template: string;
  readonly types?: readonly unknown[];
  readonly editable_fields?: readonly unknown[];
}

/** 技能侧资产里的场景（比渲染载荷**多一个 `aliases`**，裁决 5：留资产、组装时剥离）。 */
interface SceneAsset extends ScenePayload {
  readonly aliases?: readonly string[];
}

interface GroupAsset {
  readonly id: string;
  readonly icon?: string;
  readonly label: string;
  readonly subgroups: readonly { readonly id: string; readonly label: string; readonly scenes: readonly SceneAsset[] }[];
}

function fail(message: string): never {
  throw new MemoRenderError('MEMO_TEMPLATE_MISSING', message);
}

/** 场景卡：**逐键重建**、不 clone 资产 ⇒ `aliases` 之类的资产侧字段天然进不了载荷（裁决 5）。 */
function toScenePayload(s: SceneAsset): ScenePayload {
  const out: {
    id: string; title: string; wake_word: string; status: string; prompt_template: string;
    types?: readonly unknown[]; editable_fields?: readonly unknown[];
  } = {
    id: s.id, title: s.title, wake_word: s.wake_word, status: s.status, prompt_template: s.prompt_template,
  };
  if (Array.isArray(s.types) && s.types.length > 0) out.types = s.types;
  if (Array.isArray(s.editable_fields) && s.editable_fields.length > 0) out.editable_fields = s.editable_fields;
  return out;
}

/** 资产 → `groups`（逐层重建，确认剥掉 `aliases` 并保证载荷可 JSON 序列化）。 */
function toGroupsPayload(groups: readonly GroupAsset[]): readonly Record<string, unknown>[] {
  return groups.map((g) => ({
    id: g.id,
    icon: g.icon,
    label: g.label,
    subgroups: g.subgroups.map((sg) => ({
      id: sg.id,
      label: sg.label,
      scenes: sg.scenes.map(toScenePayload),
    })),
  }));
}

/** 在资产里按 id 找场景（只用于取初始化横幅的 `prompt` 单源）。 */
function findScene(groups: readonly GroupAsset[], id: string): SceneAsset | undefined {
  for (const g of groups) {
    for (const sg of g.subgroups) {
      const hit = sg.scenes.find((s) => s.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/* ── 3 个出口 ───────────────────────────────────────────────────────────────── */

/** `buildMemoHelpFileData` 的选项（**不对外开出口**：需要它的地方是出口层，本包今天没有外部消费者）。 */
interface MemoHelpFileOptions {
  /** memo 库目录是否已存在（票 6 V4：口径＝「库目录存在」，**不是**老的「`memo.db` 文件存在」）。
   *  缺省 `false` ⇒ 横幅照显（误显只多一条提示，误藏会让新用户找不到入口）。 */
  readonly initialized?: boolean;
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区、零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    return fail('HELP 更新时间须为有效 Date（缺失阻断，不返空串）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 内容资产 ＋ 派生 → 全量 HELP JSON（纯函数；`now` 显式传入以保证产物可复现）。
 *
 *  键集＝5 必需键 ＋ 三块可选键里的两块（`contact`／`version`／`init_banner`）；
 *  `init_banner` **键常在**、显隐只走 `hidden`（载荷形状不随状态变，下游能断言同一个键集）；
 *  `meta_blocks`（用户 V1 裁不用）与 `recommendations`（老 `memo_render.py` 无此键）**不传**。 */
export function buildMemoHelpFileData(now: Date, opts: MemoHelpFileOptions = {}): {
  readonly skill_name: string;
  readonly title: string;
  readonly subtitle: string;
  readonly contact: unknown;
  readonly groups: readonly Record<string, unknown>[];
  readonly version: string;
  readonly init_banner: {
    readonly title: string;
    readonly subtitle: string;
    readonly button_text: string;
    readonly prompt: string;
    readonly steps: readonly { readonly title: string; readonly desc: string }[];
    readonly hidden: boolean;
  };
} {
  const groups = MEMO_HELP_GROUPS as unknown as readonly GroupAsset[];
  if (groups.length === 0) fail('HELP 内容资产为空（MEMO_HELP_GROUPS）。');
  const scenes = groups.reduce((n, g) => n + g.subgroups.reduce((m, sg) => m + sg.scenes.length, 0), 0);
  if (scenes === 0) fail('HELP 内容资产没有任何场景（MEMO_HELP_GROUPS 二级组为空）。');

  // 技能数据世代取自资产件：`sceneData.ts` 有意**不**另开 `version` 导出（它自述「本文件只给 2 个导出」），
  // 世代值随域级索引载荷出去 ⇒ 这里从**它的公开导出**取，而不是在本模块写第四份副本（裁决 9 的同一理）。
  const version = String(buildHelpSceneIndex().version);

  const setup = findScene(groups, HELP_INIT_SCENE_ID);
  const prompt = setup?.prompt_template;
  if (typeof prompt !== 'string' || prompt.length === 0) {
    fail('HELP 首次使用横幅缺 prompt：内容资产无场景 ' + HELP_INIT_SCENE_ID + '。');
  }

  // `now` 非法时在这里就炸，不把坏时间带进载荷（载荷本身不吃时间：A 路模板不吃时间、不吃环境变量）。
  formatHelpMinute(now);
  // 老口径 `subtitle`（票 3 逐字）：`N 个分类 · M 个场景 · K 可用 · 版本 <世代>`；计数**派生**、版本取资产。
  const subtitle = String(groups.length) + ' 个分类 · ' + String(scenes) + ' 个场景 · '
    + String(scenes) + ' 可用 · 版本 ' + version;

  return Object.freeze({
    skill_name: MEMO_HELP_SKILL_NAME,
    title: MEMO_HELP_TITLE,
    subtitle,
    contact: HELP_CONTACT,
    groups: toGroupsPayload(groups),
    version,
    init_banner: Object.freeze({
      title: '🚀 第一次用备忘录?',
      subtitle: '从零搭建环境:检测 → 安装/配置 → 初始化数据库 → 生成报告,全程引导。',
      button_text: '📋 复制',
      prompt,
      steps: HELP_INIT_STEPS,
      hidden: opts.initialized === true,
    }),
  });
}

/** 全量 HELP JSON → 全壳 HTML（模板唯一实现＝共享层 verbatim 老实物；空分组抛 `missing-data`）。
 *
 *  `HelpShellData` 只声明 5 键、运行时**全量透传**（模板契约 §一）⇒ 本模块多带的可选键是它的**超集**，
 *  类型面在这一处收窄，**不改公共层**。 */
export function renderMemoHelpHtml(data: ReturnType<typeof buildMemoHelpFileData>): string {
  const payload: HelpShellData = data;
  return renderHelpShellHtml(payload);
}
