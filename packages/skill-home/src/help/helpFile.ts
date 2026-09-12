/** #189 · 居家管家 HELP 的**渲染接线**：内容资产（#188 的 `helpAssets.ts`）＋ 页面级派生 →
 * 通用 help 模板（`base-paint/help-shell` 的 `renderHelpShellHtml`）全页 HTML。
 *
 * 走 **A 路**（与 bill／calorie／memo／chef／schedule 五家同路），**不自持页面副本**：模板源恒在
 * `packages/base-render/assets/help-template.html`（不进本包 `files`）；要改渲染规则得改源再跑
 * `pnpm --filter base-paint gen:help-shell`。
 *
 * ## 本件只有两个出口、都零 IO
 *
 *  - `buildHomeHelpFileData(now, opts)`：**纯函数、零 IO**（`now` 显式传入 ⇒ 同一 `now` 两次调用逐字节一致）；
 *  - `renderHomeHelpHtml(data)`：全页 HTML（模板唯一实现＝共享层）。
 *
 * 落盘／落点值属**票 7**（`src/help/output.ts` ＋ `manifest.ts`），本件不碰。
 *
 * ## 页面级五项与三块可选怎么取（照 `t186-template-contract.md` §二 的取值表）
 *
 *  - `skill_name`／`title`／`version`：老 `help_center.py` 的逐字取值（本件常量，票 7 的 `manifest.ts`
 *    再收落点值，两处都不写第二份**文案**以外的副本）；
 *  - `subtitle`：本件派生（计数**全是数出来的**，见下「计数口径」）；
 *  - `contact`：老 `help_center.py:31-35` 三项（邮箱／GitHub／Issues，后两项 `url:true` ＋ `copy_all:true`）；
 *  - `groups`：资产直转（只读引用不 clone）＋ **过滤 `deprecated` 分组**（见下）；
 *  - `meta_blocks`／`version`／`init_banner` 三块照传；**`recommendations` 不传**
 *    （老居家 HELP 全页没有「其他技能」段）。
 *
 * ⚠️ `subtitle`／`meta_blocks` 在 A 路**读完不渲染**（只进 `help-data` 的 JSON 段）：`subtitle` 照传是因为
 * 老实物有这一行、且 `meta_blocks[0].html` 要用它（**一处算、两处用**）。验产物时别去页面上找这两项。
 *
 * ## 计数口径（用户 2026-09-11 确认 ＋ 裁决 §15）
 *
 * 骨架 9 域／73 场景里，`link` 域（3 场景）标了 `deprecated: true`＝登记位 ⇒ **渲染侧不许列出**。
 * 故本件先过滤、再由**过滤后**的分组派生页头计数：**8 功能域 · 70 场景**（不写死 73、也不写死 70）；
 * 同时把「骨架 73 条，联动 3 条已停用不列」这一行落进 `meta_blocks[0].html`——A 路的载荷里**只有这一处**
 * 装得下说明文字（`meta_blocks` 是页面外消费的透传位），本件不另造第四个键。
 *
 * ## 只读页不建库（票面第 2 条）
 *
 * 初始化状态＝**库文件存在**（照老家 `help_center.py:38-49`），判据是**调用方传入的 `dbPath`**
 * ＋ 可注入的 exists 判据（`opts.fileExists`，缺省 `node:fs` 的 `existsSync`）——便于测试钉死两个分支。
 *  1. **绝不建库、绝不建目录**：不调 `openHomeDb`（会跑 DDL），也不走 `src/fetch/paths.ts:20-23`
 *     的 `resolveDbPath()`（它自带 `mkdirSync` ⇒ 「判一下」就把目录建出来）；
 *  2. **`dbPath` 缺位／为空**、或判据抛异常 ⇒ 一律当**未初始化**（横幅照显：误显的代价小于误藏，fail-open）。
 * 横幅**键常在**、显隐只切 `hidden`（模板判 `!INIT_BANNER.hidden`），载荷形状不随状态变。
 *
 * ## 路由字段：**不需要**
 *
 * 共享层 `spec/help.ts` 的场景 schema（`additionalProperties: false`）只有 id／title／wake_word／status／
 * prompt_template／types／editable_fields 七键，没有指向命令的字段；五家兄弟的装配层同样不传路由字段。
 * 居家「短语 → 命令」的路由另有其位：`src/help/lookup.ts` 的 `buildHelpLookup()`（速查信封），与页面无关。
 */
import { existsSync } from 'node:fs';
import { renderHelpShellHtml } from 'base-paint/help-shell';
import type { HelpShellData } from 'base-paint/help-shell';
import { HELP_GROUPS } from './helpAssets.js';
import type { HelpGroupAsset } from './helpAssets.js';
import { WAKE_TABLE } from '../policy/index.js';
import { HomeRenderError } from '../render/errors.js';

/** 页面级取值（老件逐字）：技能名／文档标题——标题自带技能名 ⇒ `composeDocTitle` 走「原样」支。 */
const HELP_FILE_SKILL_NAME = '居家管家' as const;
const HELP_FILE_TITLE = '居家管家 · 使用手册(HELP)' as const;
/** 技能数据世代（照老 `scenarios.yaml` 的 `version: '2.0'`；**不是** npm 包 `skill-home@0.1.0`）。 */
const HELP_FILE_VERSION = '2.0' as const;
/** 首次使用横幅的 `prompt` 取自该场景的 `prompt_template`（单源，不抄第二份文案）。 */
const HELP_INIT_SCENE_ID = 'first_use' as const;
/** HELP 自身的触发短语由口径层派生（照记账 `wake-assets.ts:984-986` 的同一式；居家实得 3 条）。 */
const HELP_WAKE_KEY = 'home.help.lookup' as const;

/** 联系作者三项（老 `help_center.py:31-35`；`url` 为真时模板渲染成 `<a>`）。 */
interface HomeHelpContact {
  readonly items: readonly { readonly label: string; readonly value: string; readonly url?: true }[];
  readonly copy_all: true;
}
const HOME_HELP_CONTACT: HomeHelpContact = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: '邮箱', value: '975559549@qq.com' }),
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: true as const }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues', url: true as const }),
  ]),
  copy_all: true as const,
});

/* ── 装配层内部形状（不对外开出口；导出面按铁律五收口）────────────────────────── */

/** 透传信息块（模板契约 `{id,title,html}`；居家两块 `id` 与 8 个一级分组零碰撞 ⇒ 不上页，见件头）。 */
interface HomeHelpMetaBlock {
  readonly id: string;
  readonly title: string;
  readonly html: string;
}

/** 首次使用横幅（照 bill 五键 ＋ 显隐开关 `hidden`；`closable: true` ⇒ 模板会画 ✕）。 */
interface HomeHelpInitBanner {
  readonly title: string;
  readonly subtitle: string;
  readonly button_text: string;
  readonly prompt: string;
  readonly closable: true;
  readonly hidden: boolean;
}

/** `buildHomeHelpFileData` 的选项（**不对外开出口**：需要它的是票 7 的出口层／用例）。
 *  `dbPath`／`fileExists` 为什么必须由调用方给：见件头「只读页不建库」。
 *  `fileExists` 与 `existsSync` 参数同形（`no side effect` 的只读判据）。 */
interface HomeHelpFileOptions {
  /** DB **文件**路径（调用方从 `SKILLS_DB_PATH` 解析后传入；缺位／为空 ⇒ 横幅照显）。
   *  ⚠️ 不要传 `resolveDbPath()` 的返回值——那一步会 `mkdirSync`。 */
  readonly dbPath?: string;
  /** 库文件存在判据（可注入；缺省 `existsSync`；抛异常一律当「不存在」）。 */
  readonly fileExists?: (p: string) => boolean;
}

/** 坏载荷一律抛本包渲染层错误（`code` 取既有码，不新增错误类、不改既有导出面；照 chef／schedule 的取舍）。 */
function fail(message: string): never {
  throw new HomeRenderError('HOME_BAD_PAYLOAD', message);
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区、零填充；非法 Date 即坏参，不返空串）。 */
function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    fail('HELP 更新时间须为有效 Date（缺失阻断，不返空串）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 资产 → **要上页的分组**：只读引用、不 clone；`deprecated` 登记位一律剔除（票面定死的验收项）。 */
function listedGroups(): readonly HelpGroupAsset[] {
  if (!Array.isArray(HELP_GROUPS) || HELP_GROUPS.length === 0) {
    fail('HELP 内容资产为空（HELP_GROUPS 无域，不返空页）。');
  }
  const listed = HELP_GROUPS.filter((g) => g.deprecated !== true);
  if (listed.length === 0) fail('HELP 过滤 deprecated 后无剩余分组（不返空页）。');
  return listed;
}

/** 生成物的形状是机器保证的，异常即真故障（不静默降级成空页）。 */
function assertGroupsUsable(groups: readonly HelpGroupAsset[]): void {
  for (const g of groups) {
    if (!Array.isArray(g.subgroups) || g.subgroups.length === 0) {
      fail('HELP 分组无子功能（' + g.id + ' 的 subgroups 为空）。');
    }
    for (const sg of g.subgroups) {
      if (!Array.isArray(sg.scenes) || sg.scenes.length === 0) {
        fail('HELP 子功能无场景（' + sg.id + ' 的 scenes 为空，契约 scenes[] 非空）。');
      }
      for (const s of sg.scenes) {
        if (typeof s.prompt_template !== 'string' || s.prompt_template.length === 0) {
          fail('HELP 场景缺 prompt（' + s.id + '）。');
        }
      }
    }
  }
}

/** 场景条数：**数出来的**（改资产即跟变，不写死 73／70）。 */
function countScenes(groups: readonly HelpGroupAsset[]): number {
  return groups.reduce((n, g) => n + g.subgroups.reduce((m, sg) => m + sg.scenes.length, 0), 0);
}

/** 骨架场景总数：含 `deprecated` 登记位——只用来与「实际列出」比出那一行口径文案。 */
function skeletonSceneTotal(): number {
  return HELP_GROUPS.reduce((n, g) => n + g.subgroups.reduce((m, sg) => m + sg.scenes.length, 0), 0);
}

/** 首次使用横幅 `prompt` 的单源：按 id 在**上页分组**里找该场景（找不到即抛，不静默降级掉横幅）。 */
function initPromptFrom(groups: readonly HelpGroupAsset[]): string {
  for (const g of groups) {
    for (const sg of g.subgroups) {
      for (const s of sg.scenes) {
        if (s.id === HELP_INIT_SCENE_ID) {
          if (typeof s.prompt_template !== 'string' || s.prompt_template.length === 0) {
            fail('HELP 首次使用横幅缺 prompt：场景 ' + HELP_INIT_SCENE_ID + ' 的 prompt_template 为空。');
          }
          return s.prompt_template;
        }
      }
    }
  }
  return fail('HELP 首次使用横幅缺 prompt：内容资产无场景 ' + HELP_INIT_SCENE_ID + '。');
}

/** 页头摘要行（老 `help_center.py:111` 同一通式）：计数**全部派生**（域数／场景数），版本取数据世代。 */
function deriveSubtitleLine(now: Date, groups: readonly HelpGroupAsset[]): string {
  return String(groups.length) + ' 功能域 · ' + String(countScenes(groups)) + ' 场景 · 版本 '
    + HELP_FILE_VERSION + ' · 更新于 ' + formatHelpMinute(now);
}

/** 计数口径那一行：只在「骨架比实际列出多」时出现（同数即无话可说，别往页面上写废话）。 */
function countNoteLine(groups: readonly HelpGroupAsset[]): string {
  const listed = countScenes(groups);
  const skeleton = skeletonSceneTotal();
  if (skeleton <= listed) return '';
  return '骨架 ' + String(skeleton) + ' 条，联动 ' + String(skeleton - listed) + ' 条已停用不列';
}

/** 两块透传信息块：汇总（＝`subtitle` 那一份字符串，**一处算、两处用**）＋ HELP 唤醒词（口径层派生）。 */
function buildMetaBlocks(subtitleLine: string, groups: readonly HelpGroupAsset[]): readonly HomeHelpMetaBlock[] {
  if (subtitleLine.length === 0) fail('HELP 汇总块缺摘要行（subtitle 不许为空）。');
  const note = countNoteLine(groups);
  const wakeWords = WAKE_TABLE.filter((e) => e.key === HELP_WAKE_KEY).map((e) => e.phrase);
  if (wakeWords.length === 0) fail('HELP 唤醒词块为空：口径层 WAKE_TABLE 无 ' + HELP_WAKE_KEY + ' 条目。');
  return Object.freeze([
    Object.freeze({
      id: 'help_summary',
      title: 'HELP 汇总',
      html: '<p>' + subtitleLine + '</p>' + (note === '' ? '' : '<p>' + note + '</p>'),
    }),
    Object.freeze({
      id: 'help_wake_words',
      title: 'HELP 唤醒词',
      html: '<p>' + wakeWords.join(' / ') + '</p>',
    }),
  ]);
}

/** 已初始化？＝传入的库文件存在；无判据／坏判据／抛异常一律 `false`＝横幅照显（fail-open，见件头）。 */
function initializedFrom(dbPath: string | undefined, fileExists: ((p: string) => boolean) | undefined): boolean {
  if (typeof dbPath !== 'string' || dbPath === '') return false;
  const probe = fileExists ?? existsSync;
  try {
    return probe(dbPath) === true;
  } catch {
    return false;
  }
}

/** 全量 HELP JSON（5 必需键 ＋ 三块可选键中的 `meta_blocks`／`version`／`init_banner`；
 *  共享 help 模板运行时契约的超集）。
 *
 *  `init_banner` **键常在**、显隐只走 `hidden`；`recommendations` **不传**（老居家页面无此段）。
 *  返回类型**内联**、不另开导出（照 chef `:153-161`；本文件导出面按铁律五收到 2 个函数）。 */
export function buildHomeHelpFileData(now: Date, opts: HomeHelpFileOptions = {}): {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: HomeHelpContact;
  readonly groups: readonly HelpGroupAsset[];
  readonly meta_blocks: readonly HomeHelpMetaBlock[];
  readonly version: typeof HELP_FILE_VERSION;
  readonly init_banner: HomeHelpInitBanner;
} {
  const groups = listedGroups();
  assertGroupsUsable(groups);
  // `now` 非法在这里就炸，不把坏时间带进载荷。
  const subtitle = deriveSubtitleLine(now, groups);
  return Object.freeze({
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle,
    contact: HOME_HELP_CONTACT,
    groups,
    meta_blocks: buildMetaBlocks(subtitle, groups),
    version: HELP_FILE_VERSION,
    init_banner: Object.freeze({
      title: '🚀 第一次用居家管家?',
      subtitle: '从「首次使用」开始 — 检测环境、确认数据目录、建库、验证读写,全程零决策。完成初始化后,本区域将不再出现。',
      button_text: '📋 复制初始化 prompt',
      prompt: initPromptFrom(groups),
      closable: true as const,
      hidden: initializedFrom(opts.dbPath, opts.fileExists),
    }),
  });
}

/** 全量 HELP JSON → 全页 HTML（模板唯一实现＝共享层 `base-paint/help-shell`；空分组抛 `missing-data`）。
 *
 *  `HelpShellData`（`base-render/src/helpShell.ts`）只声明 5 键、运行时**全量透传**；本件产出的载荷是它的
 *  **超集**，在这一处收窄类型，**不改公共层**（照 chef `:206-209`／schedule `:179-182`）。 */
export function renderHomeHelpHtml(data: ReturnType<typeof buildHomeHelpFileData>): string {
  const payload: HelpShellData = data;
  return renderHelpShellHtml(payload);
}
