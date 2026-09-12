/** #214 · 私家大厨 HELP 的**渲染接线**：内容资产（#213 的 `sceneData.ts`）＋ 页面级派生 →
 * 通用 help 模板（`base-paint/help-shell` 的 `renderHelpShellHtml`）全页 HTML。
 *
 * 走 **A 路**（与 bill／calorie／memo／schedule 四家同路），**不自持页面副本**：模板源恒在
 * `packages/base-render/assets/help-template.html`（不进本包 `files`）；要改渲染规则得改源再跑
 * `pnpm --filter base-paint gen:help-shell`。
 *
 * ## 三件出口各碰什么（谁碰 IO）
 *
 *  - `buildChefHelpFileData(now, opts)`：**纯函数、零 IO**（`now` 显式传入 ⇒ 同一 `now` 两次调用逐字节一致）；
 *  - `buildChefHelpDelivery(dbPath, now)`：**只读**探针（`existsSync` 一次）＋ 落点意图 `{html, target}`；
 *  - `deliverChefHelp(...)`（`src/help/output.ts`）：唯一落盘点，写盘走共用件 `base-paint/save-html`。
 *  **本票不接 CLI 出口**（`src/cli/cmd_read.ts` 那一处归票 7 #215）。
 *
 * ## 页面级五项怎么取（裁决 6「逐项照记账」；逐条实测留证）
 *
 *  - `skill_name`／`title`／`version`：取**内容资产**的公开导出 `buildChefSceneData()`（同一件事只有一个
 *    定义地 ⇒ 本件不写第二份副本，照 memo `src/help/helpFile.ts:179-181` 的同一理）；
 *  - `subtitle`：本件派生（照 bill `src/render/helpFile.ts:102-106` 的式子，计数全是数出来的、不写死）；
 *  - `contact`：老 chef 件**无对应物**（老家是 `window.__HELP__` 血统，载荷里没有 contact 块）⇒
 *    照记账取值（bill `:46-53`／schedule `:52-59` 是同一份三项）。
 *
 * ⚠️ `title` 有一处**就地摆正**（本票）：#213 首版照 t2 §七 草案取「私家大厨 · 能力速查」，票 6 票面要求
 * 老家产物原文「私家大厨 HELP · 能力速查」（实测留档 `.scratch/chef-help/A1-legacy-chef-help-skeleton.md:340`
 * ／`:398`，即老件 `<title>`）⇒ 已改在**生成器声明处**（`scripts/gen-help-assets.mjs`）并重新生成资产，
 * 本件不自造第二份字面量。
 *
 * ## 只读页不建库（票面第 2 条）
 *
 * 老入口 `src/cli/cmd_read.ts:98-99` 在 `:327` 的 help 分支**之前**就 `openChefDb()`
 * （`src/fetch/db.ts:182` 的 DDL 会把库自愈建出来）⇒ 今天「说一句 help」就在磁盘上建出一个库。
 * 本件**不许**走那条路：初始化状态只由 `existsSync(dbPath)` 判（口径＝bill `src/cli/cmd_read.ts:83-86`／
 * schedule `:83-86`，亦即老 `render_help._is_initialized`），判定本身出异常 ⇒ 当**未初始化**
 * （横幅照显：误显的代价小于误藏）。全程不建目录、不开 SQLite。
 *
 * ## `subtitle` 与 `contact` 的共享层实测（如实记账，不做辩护）
 *
 *  - `subtitle` 在 A 路**读了不渲染**：模板 `var SUBTITLE = HELP.subtitle || ''`
 *    （`assets/help-template.html:1650`）之后全文零引用 ⇒ 这一项写什么都看不见。**这是共享层的缺陷**，
 *    B 路 `src/help.ts:403` 的注释逐字写着「`subtitle` 必须渲染，F3 读而不渲染属缺陷」。
 *    本件按裁决 6 照记账取值，**不是**「反正不渲染」才随便取的；
 *  - `contact` 在 A 路**真渲染**（关于 Tab 第一段）。
 *
 * ## 路由字段：**不需要**（本票实测的结论，证据在此）
 *
 * `SceneData` 的形状以 `packages/base-render/src/spec/help.ts` 为权威：`SCENE_DATA_SCHEMA` 的
 * `scenes[].properties` 只有 `id`／`title`／`wake_word`／`types`／`status`／`prompt_template`／
 * `editable_fields` 七键，且 `additionalProperties: false`（`:151-189`）——**没有**任何指向命令／CLI 的字段。
 * 四家兄弟的装配层同样一律不传路由字段（memo `:96-107` 反而要**剥掉**资产侧的 `aliases`）。
 * chef 侧「短语 → 命令」的路由另有其位：`src/help/lookup.ts` 的 `buildHelpLookup()`（`WAKE_TABLE` 唯一上游），
 * 它出的是**速查信封**的数据、与页面载荷无关 ⇒ 本件**不补**路由字段。
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { renderHelpShellHtml } from 'base-paint/help-shell';
import type { HelpShellData } from 'base-paint/help-shell';
import type { SceneGroup } from 'base-paint';
import { buildChefSceneData } from './sceneData.js';
import { ChefRenderError } from '../render/errors.js';

/** 落点值（零逻辑）：老 `render_help.py:211-216` 的 `$CHEF_OUTPUT_DIR/help/私家大厨_HELP_<stamp>.html`
 *  在本仓的等价物——目录两段 `cook_html/help`、文件名主体 `私家大厨_HELP`（t236 §1.2 A2 定下的两个值）。
 *
 *  ⚠️ **票 7** 的 `src/help/manifest.ts`（A2）落盘后应由它单一持有、本件改成 `import`；本票不建 A2 件
 *  （按 t236 §1.2 的范围裁剪属票 7），故这两个值先落**这一处**、不落第二处。时间戳格式与同秒递补
 *  一概不在这里（唯一定义地＝共用件 `base-paint/save-html`）。 */
const HELP_DIR_SEGMENTS = ['cook_html', 'help'] as const;
const HELP_FILE_STEM = '私家大厨_HELP' as const;

/** 首次使用横幅的 `prompt` 取自该场景的 `prompt_template`（单源，不抄第二份文案）。 */
const CHEF_HELP_INIT_SCENE_ID = 'first_use' as const;

/** 联系作者三项（照记账 bill `:46-53`／schedule `:52-59`；老 chef 载荷无此块）。`url` 为真时模板渲染成 `<a>`。
 *  **不对外开出口**：要用它的是出口层，本件够用（导出面按铁律五收口）。 */
const CHEF_HELP_CONTACT: {
  readonly items: readonly { readonly label: string; readonly value: string; readonly url?: true }[];
  readonly copy_all: true;
} = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: '邮箱', value: '975559549@qq.com' }),
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: true as const }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues', url: true as const }),
  ]),
  copy_all: true as const,
});

/* ── 装配层内部形状（不对外开出口；出口面按铁律五收口）────────────────────────── */

/** 首次使用横幅（照 bill `:65-73`／schedule `:68-76` 五键 ＋ 显隐开关 `hidden`）。
 *  `closable` 照 bill／schedule 传 `true`（模板 `=== false` 才不画 ✕，缺省等价）。 */
interface ChefInitBanner {
  readonly title: string;
  readonly subtitle: string;
  readonly button_text: string;
  readonly prompt: string;
  readonly closable: true;
  readonly hidden: boolean;
}

/** `buildChefHelpFileData` 的选项（**不对外开出口**：需要它的地方是出口层／票据内部）。 */
interface ChefHelpFileOptions {
  /** 库是否已初始化（`true` ⇒ 首次使用横幅隐藏）。缺省 `false`＝照显（误显的代价小于误藏）。 */
  readonly initialized?: boolean;
}

/** 坏载荷一律抛本包渲染层错误（`code` 取既有码，不新增错误类、不改既有导出面；照 schedule 的取舍）。 */
function fail(message: string): never {
  throw new ChefRenderError('CHEF_BAD_PAYLOAD', message);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区、零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail('HELP 更新时间须为有效 Date（缺失阻断，不返空串）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 初始化状态：DB **文件存在**＝已初始化；判定本身出异常 ⇒ `false`＝横幅照显（fail-open）。
 *  **只读**，见件头「只读页不建库」。 */
function chefHelpInitialized(dbPath: string): boolean {
  try { return existsSync(dbPath); } catch { return false; }
}

/** 横幅 `prompt` 的单源：按 id 在资产里找该场景（找不到即抛，不静默降级掉横幅）。 */
function initPromptFrom(groups: readonly SceneGroup[]): string {
  for (const g of groups) {
    for (const sg of g.subgroups) {
      for (const s of sg.scenes) {
        if (s.id === CHEF_HELP_INIT_SCENE_ID) {
          if (!isNonEmptyString(s.prompt_template)) {
            fail('HELP 首次使用横幅缺 prompt：场景 ' + CHEF_HELP_INIT_SCENE_ID + ' 的 prompt_template 为空。');
          }
          return s.prompt_template;
        }
      }
    }
  }
  return fail('HELP 首次使用横幅缺 prompt：内容资产无场景 ' + CHEF_HELP_INIT_SCENE_ID + '。');
}

/** 全量 HELP JSON（5 必需键 ＋ 两张可选键 `version`／`init_banner`；共享 help 模板运行时契约的超集）。
 *
 *  `init_banner` **键常在**、显隐只走 `hidden`（载荷形状不随状态变，下游能断言同一个键集）；
 *  `meta_blocks`（老家无此块；且用户裁 5「HELP 自身触发词不上页面」）与 `recommendations`
 *  （老 chef 页面无此键）**不传**——传了即第二真相源，漂移面无收益（照 calorie `:13` 的同一条理）。
 *
 *  返回类型**内联**、不另开导出（照 memo `:158-173`；本文件导出面按铁律五收到 ≤5）。 */
export function buildChefHelpFileData(now: Date, opts: ChefHelpFileOptions = {}): {
  readonly skill_name: string;
  readonly title: string;
  readonly subtitle: string;
  readonly contact: unknown;
  readonly groups: readonly SceneGroup[];
  readonly version: string;
  readonly init_banner: ChefInitBanner;
} {
  const scene = buildChefSceneData();
  const groups: readonly SceneGroup[] = scene.groups;
  if (groups.length === 0) fail('HELP 内容资产为空（CHEF_SCENES 无域）。');
  const scenes = groups.reduce((n, g) => n + g.subgroups.reduce((m, sg) => m + sg.scenes.length, 0), 0);
  if (scenes === 0) fail('HELP 内容资产没有任何场景（二级组为空）。');
  if (!isNonEmptyString(scene.skill_name) || !isNonEmptyString(scene.title)) {
    fail('HELP 页面级缺 skill_name／title（内容资产不许留空）。');
  }
  // 技能数据世代取自资产的公开导出（`sceneData.ts` 有意只给 2 个导出 ⇒ 从它的返回值取，
  // 不在本模块写第四份副本；值出自老载荷 `meta.version`，生成器 `:186` 逐字断言）。
  if (!isNonEmptyString(scene.version)) fail('HELP 缺 version（内容资产没给技能数据世代）。');
  const version = String(scene.version);

  // `now` 非法在这里就炸，不把坏时间带进载荷。
  const updatedAt = formatHelpMinute(now);
  // 页头摘要行（照 bill `:102-106` 的式子）：计数**全部派生**（域数／场景数），版本取资产。
  //  只数「一级域 ＋ 场景」两层：记账那一式也只数它的两级（7 功能域 · 74 场景），
  //  组（chef 的 33 个二级组）在账单那一式里对应 `subgroups`，同样不进摘要行。
  const subtitle = String(groups.length) + ' 功能域 · ' + String(scenes) + ' 场景 · 版本 '
    + version + ' · 更新于 ' + updatedAt;

  return Object.freeze({
    skill_name: scene.skill_name,
    title: scene.title,
    subtitle,
    contact: CHEF_HELP_CONTACT,
    groups,
    version,
    init_banner: Object.freeze({
      title: '🚀 第一次用私家大厨?',
      subtitle: '从「首次使用」开始 — 检测环境、确认数据目录、建库、验证读写,全程零决策。完成初始化后,本区域将不再出现。',
      button_text: '📋 复制初始化 prompt',
      prompt: initPromptFrom(groups),
      closable: true as const,
      hidden: opts.initialized === true,
    }),
  });
}

/** 全量 HELP JSON → 全页 HTML（模板唯一实现＝共享层 `base-paint/help-shell`；空分组抛 `missing-data`）。
 *
 *  `HelpShellData`（`src/helpShell.ts:22-28`）只声明 5 键、运行时**全量透传**，且把 `subtitle`／`contact`
 *  定为**必填**（`SceneData` 里这两项可选 ⇒ 直接把 `buildChefSceneData()` 喂进去会 tsc 报错）；
 *  本件产出的载荷是它的**超集**，在这一处收窄类型，**不改公共层**（照 memo `:213-220`／schedule `:228-235`）。 */
export function renderChefHelpHtml(data: ReturnType<typeof buildChefHelpFileData>): string {
  const payload: HelpShellData = data;
  return renderHelpShellHtml(payload);
}

/** 交付意图：`{ html, target }`——出口拿它去 `deliverChefHelp({ explicit, target, html })`。
 *  `target` 是结构上的 `HtmlLanding`（`base-paint/save-html` 的 `{dir, stem}`），时间戳与同秒递补由共用件钉死。
 *  `dbPath` ＝ **DB 文件路径**（`resolveDbPath()` 的返回值）：落点取它的父目录，初始化探针也探它本人。 */
export function buildChefHelpDelivery(dbPath: string, now: Date): {
  readonly html: string;
  readonly target: { readonly dir: string; readonly stem: string };
} {
  if (!isNonEmptyString(dbPath)) fail('HELP 落点缺库路径（`dbPath` 须为非空字符串，缺失阻断不返空）。');
  const html = renderChefHelpHtml(buildChefHelpFileData(now, { initialized: chefHelpInitialized(dbPath) }));
  return Object.freeze({
    html,
    target: Object.freeze({ dir: resolve(dirname(dbPath), ...HELP_DIR_SEGMENTS), stem: HELP_FILE_STEM }),
  });
}
