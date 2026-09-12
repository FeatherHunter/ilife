/** #202 · 「作息管家help」的交付**内容**：内容资产 ＋ 派生 → 共享 help 模板（`base-paint/help-shell`）全页 HTML。
 *
 * 本模块**零 IO、零落盘**：落点通式与写盘全在交付管线（#203：`help/helpPaths.ts` ＋ `help/output.ts`）。
 * 技术路线与 `skill-bill/src/render/helpFile.ts` 逐字同构（票 #202 与结构裁定 t199 §「消费共享 help 模板」）：
 *  - **不自持模板副本**：模板源恒在 `packages/base-render/assets/help-template.html`（不进本包 `files`），
 *    本模块只调 `base-paint/help-shell` 的 `renderHelpShellHtml`，不新写页面；
 *  - `groups` 由内容资产 `HELP_GROUPS` 直转（只读引用，不 clone、不二次转换）；
 *  - `subtitle` 是页头摘要行（`deriveSummaryLine` 一处算、一处用），计数**全部派生**，不写死 5／34／85。
 *
 * 五必需键 ＋ 两块可选键（与其余技能 HELP 同一口径）：
 *  - 必需：`skill_name`／`title`／`subtitle`／`contact`／`groups`；
 *  - 可选：`version`（技能数据世代，非 npm 包版本）／
 *    `init_banner`（键常在、显隐走 `hidden`，照 bill 的口径：payload 形状不随状态变）。
 *  - **`meta_blocks` 不传**（用户 2026-09-13 裁定）：作息 HELP 与其它技能 HELP 同构，**不多自带功能模块**；
 *    旧实物那 90 条伴生信息（85 条场景「预期结果说明」＋5 条一级分组说明）只在内容资产里留档，**不上页**。
 *
 * 缺必需键／空分组**抛错不降级**（票面 ③）：本模块按 `src/render/errors.ts` 的既有形状抛
 * `ScheduleRenderError`，`code` 取该类型已有的 `'SCHEDULE_BAD_PAYLOAD'`（不新增错误类、不改既有导出面）。
 *
 * 页面长相由共享模板的**页面侧 JS** 决定（静态段只有一个空 `<div id="screen">`，内容全靠运行时按载荷渲染），
 * 故本模块的正确性只有「跑起来看 DOM」才验得准 —— 见 `test/help-file-202.test.mjs` 的运行时段。
 */
import { renderHelpShellHtml } from 'base-paint/help-shell';
import type { HelpShellData } from 'base-paint/help-shell';
import { HELP_ASSETS, HELP_GROUPS } from './scenes/help-assets.js';
import type { HelpGroupAsset } from './scenes/help-assets.js';
import { ScheduleRenderError } from '../render/errors.js';

/** 「作息管家help」交付文件的**文件名主体**（接线层写死；调用方不接受外部传入，照 bill 先例）。 */
export const HELP_FILE_STEM = '作息管家_HELP' as const;
/** 5 键头（旧实物口径的逐字取值）。 */
export const HELP_FILE_SKILL_NAME = '作息管家' as const;
export const HELP_FILE_TITLE = '作息管家 · 使用手册(HELP)' as const;
/** 技能数据世代版本（照 bill 口径：**不是** npm 包 `skill-schedule@0.1.0`）。 */
export const HELP_FILE_VERSION = '2.0' as const;
/** 首次使用横幅的 prompt 取自该场景（单源；键＝内容资产里的场景 id）。 */
export const HELP_INIT_SCENE_ID = 'first_use' as const;

/** 联系作者一项；`url` 为真时模板把它渲染成可点链接（照 bill 的 `HelpContactItem`）。 */
export interface HelpContactItem {
  readonly label: string;
  readonly value: string;
  readonly url?: true;
}

/** 联系作者（旧实物的三项：邮箱／GitHub／Issues）。 */
export interface HelpContact {
  readonly items: readonly HelpContactItem[];
  readonly copy_all: true;
}

export const HELP_CONTACT: HelpContact = Object.freeze({
  items: Object.freeze([
    Object.freeze({ label: '邮箱', value: '975559549@qq.com' }),
    Object.freeze({ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS', url: true as const }),
    Object.freeze({ label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues', url: true as const }),
  ]),
  copy_all: true as const,
});

/** 首次使用横幅（照 bill 五键 ＋ 显隐开关 `hidden`）。 */
export interface HelpInitBanner {
  readonly title: string;
  readonly subtitle: string;
  readonly button_text: string;
  readonly prompt: string;
  readonly closable: true;
  readonly hidden: boolean;
}

/** 全量 HELP JSON（5 必需键 ＋ 两块可选键；共享 help 模板运行时契约的超集）。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: HelpContact;
  readonly groups: typeof HELP_GROUPS;
  readonly version: typeof HELP_FILE_VERSION;
  readonly init_banner: HelpInitBanner;
}

export interface HelpFileOptions {
  /** 库是否已初始化（`true` ⇒ 首次使用横幅隐藏）。缺省 `false`＝照显（误显的代价小于误藏）。 */
  readonly initialized?: boolean;
}

/** 旧口径的 `%Y-%m-%d %H:%M`（本地时区、零填充；非法 Date 即坏参，不返空串）。 */
export function formatHelpMinute(now: Date): string {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'HELP 更新时间须为有效 Date（缺失阻断不返空）。');
  }
  const p = (n: number): string => String(n).padStart(2, '0');
  return String(now.getFullYear()) + '-' + p(now.getMonth() + 1) + '-' + p(now.getDate())
    + ' ' + p(now.getHours()) + ':' + p(now.getMinutes());
}

/** 一级分组数／唤醒词条数／场景条数：全由内容资产数出来（改资产即跟变，不写第二份数字）。 */
function assetCounts(): { groups: number; wakeWords: number; scenes: number } {
  const wakeWords = HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0);
  const scenes = HELP_GROUPS.reduce((n, g) => n + g.subgroups.reduce((m, s) => m + s.scenes.length, 0), 0);
  return { groups: HELP_GROUPS.length, wakeWords, scenes };
}

/** 页头摘要行（旧口径）：计数与版本派生。只进载荷 `subtitle`——A 路模板读了该键后全文零引用（无渲染落点）。 */
export function deriveSummaryLine(now: Date): string {
  const n = assetCounts();
  return String(n.groups) + ' 类别 · ' + String(n.wakeWords) + ' 唤醒词 · ' + String(n.scenes)
    + ' 场景 · 版本 ' + HELP_FILE_VERSION + ' · 更新于 ' + formatHelpMinute(now);
}

/** 坏分组即抛（不静默降级）：校验内容资产的**三层形状**与场景必填字段，首个命中即抛。
 *
 *  入参是「待校验的那份分组数据」而不是直接读常量——接线层没有第二条内容来源，
 *  这样写只是让「坏载荷必须抛」这条口径**可测**（用例能喂坏数据进来，而不用去改资产模块的常量）。
 *  默认值与接线用的是同一个只读引用，行为不变。 */
export function assertGroupsUsable(groups: readonly HelpGroupAsset[] = HELP_GROUPS): void {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'HELP 内容资产缺分组（HELP_GROUPS 为空，不返空页）。');
  }
  if (!Array.isArray(HELP_ASSETS) || HELP_ASSETS.length === 0) {
    throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'HELP 内容资产缺场景（HELP_ASSETS 为空，不返空页）。');
  }
  for (const group of groups) {
    if (!Array.isArray(group.subgroups) || group.subgroups.length === 0) {
      throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'HELP 分组无子功能（' + group.id + ' 的 subgroups 为空）。');
    }
    for (const subgroup of group.subgroups) {
      if (!Array.isArray(subgroup.scenes) || subgroup.scenes.length === 0) {
        throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD',
          'HELP 子功能无场景（' + subgroup.id + ' 的 scenes 为空，契约 scenes[] 非空）。');
      }
      for (const scene of subgroup.scenes) {
        if (typeof scene.prompt_template !== 'string' || scene.prompt_template.length === 0) {
          throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD', 'HELP 场景缺 prompt（' + scene.id + '）。');
        }
      }
    }
  }
}

/** 首次使用横幅：文案照旧，`prompt` 取该场景的 `prompt_template`（单源）。
 *  该场景缺位即抛（内容资产是机器生成件，缺位属真故障，不把横幅静默降级掉）。 */
export function buildInitBanner(initialized: boolean): HelpInitBanner {
  const scene = HELP_ASSETS.find((s) => s.id === HELP_INIT_SCENE_ID);
  const prompt = scene?.prompt_template;
  if (typeof prompt !== 'string' || prompt.length === 0) {
    throw new ScheduleRenderError('SCHEDULE_BAD_PAYLOAD',
      'HELP 首次使用横幅缺 prompt：内容资产无场景 ' + HELP_INIT_SCENE_ID);
  }
  return {
    title: '🚀 第一次用作息管家?',
    subtitle: '从「首次使用」开始 — 建库、确认数据目录、验证读写，全程零决策。完成初始化后,本区域将不再出现。',
    button_text: '📋 复制初始化 prompt',
    prompt,
    closable: true,
    hidden: initialized === true,
  };
}

/** 内容资产 ＋ 派生 → 全量 HELP JSON（纯函数；`now` 显式传入以保证可复现）。 */
export function buildHelpFileData(now: Date = new Date(), opts: HelpFileOptions = {}): HelpFileData {
  assertGroupsUsable();
  const summaryLine = deriveSummaryLine(now);
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: summaryLine,
    contact: HELP_CONTACT,
    groups: HELP_GROUPS,
    version: HELP_FILE_VERSION,
    init_banner: buildInitBanner(opts.initialized === true),
  };
}

/** 全量 HELP JSON → 全壳 HTML（完整文档：`<!DOCTYPE html>` 起、带 `<meta charset>` 与样式）。
 *  模板唯一实现＝共享层 `base-paint/help-shell`；本函数只做接线转发，不自造第二套页面。
 *  载荷按共享层声明的 `HelpShellData` 交出去：本模块多带的 `version`／`init_banner` 两块可选键是它的超集
 *  （共享层运行时全量读这些键），形状不匹配时在此就地编译报错，不拖到运行时。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  const payload: HelpShellData = data;
  return renderHelpShellHtml(payload);
}
