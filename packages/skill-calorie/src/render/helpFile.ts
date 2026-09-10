/** #139 · 「卡路里help」的交付**内容**：5 键 HELP JSON → 老实物同款 V4 三级目录壳。
 *
 * 本模块**零 IO、零落盘**：落点命名与写盘全在 CLI 交付管线
 * （`cli/cmd_read.ts` → `output.ts:deliverHtml`，`wx` 独占＋`EEXIST` 递补＋绝对路径回执）。
 * 教训（#139 诊断）：本模块此前自带 `runHelpFile` 落盘，结果只被自己的单测调用——
 * 「单测全绿、live 出口没人调」的孤岛，产出与交付脱钩，故删。
 *
 * 链路（每步零旁路）：
 *  1. 资产：`WAKE_GROUPS` 直转 5 键 HELP JSON（`skill_name/title/subtitle/contact/groups`，
 *     老实物 `卡路里_HELP_20260906_220726.html:195` 口径；`subtitle` 沿老
 *     `render_help_center.py:182-186` 公式 `〈组数〉 分类 · 〈场景数〉 场景 · 更新于 〈本地分钟〉`；
 *     `contact` 与 `render/helpCenter.ts:HELP_CONTACT` 同源（实物 2 项逐字）；
 *     `init_banner/version/recommendations` 为模板侧可选能力，本接线**不传**——传了即
 *     第二真相源，漂移面无收益）。
 *  2. 渲染：`renderHelpFileHtml` → `base-paint/help-shell:renderHelpShellHtml`
 *     （模板唯一实现＝verbatim 老实物；空分组抛 `missing-data`，调用方 exit 5；
 *     模板源在 `packages/base-render/assets/help-template.html`，改动走 `gen:help-shell`）。
 */
import { CalorieRenderError } from './errors.js';
import { HELP_CONTACT } from './helpCenter.js';
import { WAKE_ASSETS, WAKE_GROUPS } from '../triggers/wake-assets.js';
import type { WakeGroupAsset } from '../triggers/wake-assets.js';
import { renderHelpShellHtml } from './helpShell.js';

/** 「卡路里help」交付文件的文件名主体（接线层写死；调用方不接受外部传入，S3-3）。 */
export const HELP_FILE_STEM = '卡路里_HELP' as const;
/** 5 键头（实物逐字）。 */
export const HELP_FILE_SKILL_NAME = '卡路里' as const;
export const HELP_FILE_TITLE = '唤醒词速查台' as const;
/** 实物 payload 容器 id（`help-data`，老 `:195`）。 */
export const HELP_FILE_DATA_ID = 'help-data' as const;

/** 5 键 HELP JSON（实物顶层键集；`groups` 由资产直转，只读引用不 clone）。 */
export interface HelpFileData {
  readonly skill_name: typeof HELP_FILE_SKILL_NAME;
  readonly title: typeof HELP_FILE_TITLE;
  readonly subtitle: string;
  readonly contact: typeof HELP_CONTACT;
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

/** 资产 → 5 键 JSON（纯函数；组数／场景数由资产派生，不写死 10／436）。 */
export function buildHelpFileData(now: Date = new Date()): HelpFileData {
  const groups: readonly WakeGroupAsset[] = WAKE_GROUPS;
  if (groups.length === 0 || WAKE_ASSETS.length === 0) {
    throw new CalorieRenderError('missing-data', 'HELP 资产分组缺失（WAKE_GROUPS 空）');
  }
  return {
    skill_name: HELP_FILE_SKILL_NAME,
    title: HELP_FILE_TITLE,
    subtitle: String(groups.length) + ' 分类 · ' + String(WAKE_ASSETS.length)
      + ' 场景 · 更新于 ' + formatHelpMinute(now),
    contact: HELP_CONTACT,
    groups,
  };
}

/** 5 键 JSON → 全壳 HTML（T3 #134 与老实物同壳；模板唯一实现已搬家至
 * `base-paint/help-shell:renderHelpShellHtml`——DOM＋CSS变量＋三槽填充物照搬老实物，
 * 本函数只做接线层转发，不自造第二套壳；空分组抛 `missing-data`，调用方 exit 5）。 */
export function renderHelpFileHtml(data: HelpFileData): string {
  return renderHelpShellHtml(data);
}
