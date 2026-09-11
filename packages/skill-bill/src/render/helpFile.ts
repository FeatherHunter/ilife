/** #145 · 「饼干记账help」的交付**内容**：内容资产 ＋ 派生 → 共享壳（`base-paint/help-shell`）全页 HTML。
 *
 * 本模块**零 IO、零落盘**：落点与写盘全在 CLI 交付管线（#144：`render/helpPaths.ts` ＋ `output.ts`）。
 * 逐字对照老口径（只读基线 `D:\2Study\StudyNotes\SKILLS\饼干记账\scripts\render_help.py:build_help_contract`）：
 *  - `skill_name`／`title`／`contact`／`version` 照老实样（`:197-214`）；
 *  - `subtitle` 与 `meta_blocks[0]` 同源派生（老 `:194-202` 的 `summary_line` 一处算、两处用）；
 *  - `groups` 由内容资产直转（`WAKE_GROUPS`，只读引用不 clone）；
 *  - `init_banner` 文案照老 `INIT_BANNER_TEXT`（`:69-74`），`prompt` 取自 `setup_init_wizard`
 *    场景的 `prompt_template`（老 `:124-132` 同一个「从汇总里取该场景 prompt」的单源做法）。
 *
 * 三块可选键（用户 Q9=B 完整照传；仓内共享壳运行时全量读这些键，TS 类型面只声明 5 键）：
 *  - `meta_blocks`：两块（`help_summary`／`help_wake_words`），内容全部派生，不写第二份源；
 *  - `version`：`'2.0'`——老口径 `str(summary.get("version","2.0"))`，语义是**技能数据世代**
 *    （bill 自己的 `init-status` 也自述「v2.0 特征 deleted_at」），**不是** npm 包版本 `0.1.0`；
 *  - `init_banner`：显隐由 `hidden` 控。老口径是「未初始化才给这个键」，壳读的却是 `hidden`
 *    （`help-template.html` 的 `INIT_BANNER && !INIT_BANNER.hidden`），故新线**键常在、显隐走 `hidden`**：
 *    payload 形状不随状态变，下游用例能断言同一个键集。初始化状态由调用方传入（本模块零 IO）。
 */
import { renderHelpShellHtml } from 'base-paint/help-shell';
import { HELP_WAKE_WORDS, SCENE_BY_ID, WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import { BillRenderError } from './errors.js';

/** 「饼干记账help」交付文件的文件名主体（接线层写死；调用方不接受外部传入，照 #139 S3-3）。 */
export const HELP_FILE_STEM = '饼干记账_HELP' as const;
/** 5 键头（老实物逐字）。 */
export const HELP_FILE_SKILL_NAME = '饼干记账' as const;
export const HELP_FILE_TITLE = '饼干记账 · 使用手册(HELP)' as const;
/** 技能数据世代版本（老口径 `summary.version`，非 npm 包版本）。 */
export const HELP_FILE_VERSION = '2.0' as const;
/** 首次使用横幅的 prompt 取自该场景（老 `SETUP_INIT_SCENE_ID`）。 */
export const HELP_INIT_SCENE_ID = 'setup_init_wizard' as const;

export interface HelpContactItem {
  readonly label: string;
  readonly value: string;
  /** 标记「可点链接」（老实物该键为真时渲染成 `<a>`）。 */
  readonly url?: true;
}

export interface HelpContact {
  readonly items: readonly HelpContactItem[];
  readonly copy_all: true;
}

/** 联系作者三项（老 `render_help.py:59-63` 的 CONTACT ＋ `:206-213` 的 items 组法逐字）。 */
export const HELP_CONTACT: HelpContact = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: '邮箱', value: '975559549@qq.com' }),
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: true as const }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues', url: true as const }),
  ]),
  copy_all: true as const,
});

/** 透传信息块（壳不渲染，供外部消费；老契约 `{id,title,html}`）。 */
export interface HelpMetaBlock {
  readonly id: string;
  readonly title: string;
  readonly html: string;
}

/** 首次使用横幅（老 `:221-227` 五键 ＋ 新线追加的显隐开关 `hidden`）。 */
export interface HelpInitBanner {
  readonly title: string;
  readonly subtitle: string;
  readonly button_text: string;
  readonly prompt: string;
  readonly closable: true;
  readonly hidden: boolean;
}

/** 老 5 键 ＋ 三块可选键（共享壳运行时契约的超集）。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: HelpContact;
  readonly groups: typeof WAKE_GROUPS;
  readonly meta_blocks: readonly HelpMetaBlock[];
  readonly version: typeof HELP_FILE_VERSION;
  readonly init_banner: HelpInitBanner;
}

export interface HelpFileOptions {
  /** 库是否已初始化（`true` ⇒ 首次使用横幅隐藏）。缺省 `false`＝照显（见模块头：误显的代价小于误藏）。 */
  readonly initialized?: boolean;
}

/** 老 `%Y-%m-%d %H:%M` 等价物（本地时区，零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 更新时间须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 老 `:194-195` 的 `summary_line`：计数与版本**派生**，不写死 7／74（改资产即跟变）。 */
export function deriveSummaryLine(now: Date = new Date()): string {
  return String(WAKE_GROUPS.length) + ' 功能域 · ' + String(WAKE_ASSETS.length)
    + ' 场景 · 版本 ' + HELP_FILE_VERSION + ' · 更新于 ' + formatHelpMinute(now);
}

/** 两块 meta：HELP 汇总（＝summaryLine 同源）＋ HELP 唤醒词（＝口径层那 4 条派生）。 */
export function buildMetaBlocks(summaryLine: string): readonly HelpMetaBlock[] {
  return [
    { id: 'help_summary', title: 'HELP 汇总', html: '<p>' + summaryLine + '</p>' },
    { id: 'help_wake_words', title: 'HELP 唤醒词', html: '<p>' + HELP_WAKE_WORDS.join(' / ') + '</p>' },
  ];
}

/** 首次使用横幅：文案照老实样，`prompt` 取自初始化场景的 `prompt_template`（单源）。
 *  该场景缺位即抛（内容资产被机器生成 ＋ 摘要锁，缺位属真故障，不静默把横幅降级掉）。 */
export function buildInitBanner(initialized: boolean): HelpInitBanner {
  const scene = SCENE_BY_ID[HELP_INIT_SCENE_ID];
  const prompt = scene?.prompt_template;
  if (typeof prompt !== 'string' || prompt.length === 0) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA',
      'HELP 首次使用横幅缺 prompt：内容资产无场景 ' + HELP_INIT_SCENE_ID);
  }
  return {
    title: '🚀 第一次用饼干记账?',
    subtitle: '从「初始化」开始 — 自动检测环境、确认数据目录、建库、验证,全程零决策。完成初始化后,本区域将不再出现。',
    button_text: '📋 复制初始化 prompt',
    prompt,
    closable: true,
    hidden: initialized === true,
  };
}

/** 内容资产 ＋ 派生 → 全量 HELP JSON（纯函数；`now` 显式传入以保证可复现）。 */
export function buildHelpFileData(now: Date = new Date(), opts: HelpFileOptions = {}): HelpFileData {
  if (WAKE_GROUPS.length === 0 || WAKE_ASSETS.length === 0) {
    throw new BillRenderError('BILL_HELP_MISSING_DATA', 'HELP 内容资产为空（WAKE_GROUPS／WAKE_ASSETS）');
  }
  const summaryLine = deriveSummaryLine(now);
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: summaryLine,
    contact: HELP_CONTACT,
    groups: WAKE_GROUPS,
    meta_blocks: buildMetaBlocks(summaryLine),
    version: HELP_FILE_VERSION,
    init_banner: buildInitBanner(opts.initialized === true),
  };
}

/** 全量 HELP JSON → 全壳 HTML（模板唯一实现＝共享层 verbatim 老实物；空分组抛 `missing-data`，调用方 exit 5）。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  return renderHelpShellHtml(data);
}
