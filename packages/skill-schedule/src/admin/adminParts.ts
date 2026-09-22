/** #790 · 「辅助与管理」域的族级页内自造件（本域页内自造件与样式常量的唯一住处）。
 *
 *  为什么住这里（写得出哪几处在用）：本票两张页上有三处公共层给不出的形状——
 *    · **步骤列表**（首次使用向导的六步）：序号 ＋ 状态徽章 ＋ 一句话说明。
 *      公共层 `renderDataTable` 是给二维读数的，步骤不是表；
 *      `renderDistributionRows` 是「行即件」，序号与徽章摆不进去。
 *    · **状态徽章**（通过／待办／动手）：小圆角标签，颜色走冻结 token。
 *    · **勾选清单**（初始化报告的完成验证清单）：可勾选的复选框行，老侧那张向导页同款。
 *  三处都只在本域用，故照 `src/write/writeParts.ts` 的先例落在本域族级件里，
 *  **不往共用位塞**（共用位不是各域的样式收容所）。
 *
 *  **只认形状，不认领域**：进来的是摆好的字串与状态，出去是 HTML 串——
 *  本件不引 `policy`，也不认库表名与飞书那三道门。
 *
 *  **样式纪律（本票的代码层窄判据）**：本文件是族级样式常量的唯一住处——CSS 里的长度一律取
 *  下面那组具名常量（`px()` 是唯一的拼接处）、颜色一律取公共层冻结 token（`var(--…)`），
 *  `px` 字面量一处也不写。断点只用仓内既有值 **820**（页内自造件那一档），不新造。
 */
import type { AdminStepStatus } from './adminDocs.js';

/* ─────────────────────────── 风格常量（本域 CSS 所有长度的出处） ─────────────────────────── */

const FS_TITLE = 15;
const FS_BODY = 13;
const FS_SMALL = 12;
const GAP = 8;
const ROW_GAP = 10;
const PAD_Y = 12;
const PAD_X = 14;
const RADIUS = 12;
const HAIRLINE = 1;
const NUM_W = 26;
/* 触摸下限 44px（PAGE_LIMITS.touchMinPx）：与公共层同值是刻意的（本件不引区块层内部件，见件头）。 */
const HIT = 44;
const NARROW = 820;

const COLOR_OK = 'var(--green)';
const COLOR_TODO = 'var(--orange)';
const COLOR_DO = 'var(--red)';
const COLOR_MUTED = 'var(--fg3)';

const px = (n: number): string => n + 'px';
const LF = String.fromCharCode(10);

/** 五字符转义（与公共层 `blocks.ts` 同口径；本件不引区块层内部件）。 */
function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

/** 族级样式（只给 `sch-ad-` 前缀的类，不碰 `.ilife-block-*` 与页壳）。 */
export function adminPartsCss(): string {
  return [
    '.sch-ad-h2{font-size:' + px(FS_TITLE) + ';margin:' + px(ROW_GAP) + ' 0 ' + px(GAP) + '}',
    '.sch-ad-step{display:flex;gap:' + px(GAP) + ';align-items:flex-start;padding:' + px(PAD_Y) + ' ' + px(PAD_X) + '}',
    '.sch-ad-num{flex:0 0 ' + px(NUM_W) + ';text-align:center;font-size:' + px(FS_SMALL) + ';color:' + COLOR_MUTED + '}',
    '.sch-ad-step-body{flex:1;min-width:0}',
    '.sch-ad-step-name{font-size:' + px(FS_BODY) + '}',
    '.sch-ad-step-desc{font-size:' + px(FS_SMALL) + ';color:' + COLOR_MUTED + '}',
    '.sch-ad-badge{display:inline-block;font-size:' + px(FS_SMALL) + ';padding:0 ' + px(GAP) + ';border:' + px(HAIRLINE) + ' solid;border-radius:' + px(RADIUS) + '}',
    '.sch-ad-badge-ok{color:' + COLOR_OK + ';border-color:' + COLOR_OK + '}',
    '.sch-ad-badge-todo{color:' + COLOR_TODO + ';border-color:' + COLOR_TODO + '}',
    '.sch-ad-badge-do{color:' + COLOR_DO + ';border-color:' + COLOR_DO + '}',
    '.sch-ad-check{display:flex;gap:' + px(GAP) + ';align-items:center;min-height:' + px(HIT) + ';padding:' + px(GAP) + ' ' + px(PAD_X) + '}',
    '.sch-ad-check input{width:' + px(HIT) + ';height:' + px(HIT) + ';margin:0;flex:0 0 auto}',
    '@media (max-width:' + px(NARROW) + '){.sch-ad-step{flex-wrap:wrap}}',
  ].join(LF);
}

/** 域内段名（页上一段的标题）。老侧每个区块都有自己的名字，出页门与探针按名字认块，
 *  故段名由一处产出：本件。 */
export function renderSectionTitle(text: string): string {
  return '<h2 class="sch-ad-h2">' + esc(text) + '</h2>';
}

/** 状态徽章（说人话的三态：通过／待办／动手）。 */
export function renderBadge(status: AdminStepStatus, label: string): string {
  const cls = status === 'ok' ? 'sch-ad-badge-ok' : status === 'todo' ? 'sch-ad-badge-todo' : 'sch-ad-badge-do';
  return '<span class="sch-ad-badge ' + cls + '">' + esc(label) + '</span>';
}

export interface AdminStepView {
  readonly name: string;
  readonly status: AdminStepStatus;
  readonly statusText: string;
  readonly desc: string;
}

/** 步骤列表（序号 ＋ 徽章 ＋ 说明；第几步由调用方排好序传进来）。 */
export function renderSteps(steps: readonly AdminStepView[]): string {
  if (steps.length === 0) return '';
  const items = steps.map((s, i) =>
    '<div class="sch-ad-step">'
    + '<span class="sch-ad-num">' + String(i + 1) + '</span>'
    + '<div class="sch-ad-step-body">'
    + '<div class="sch-ad-step-name">' + esc(s.name) + ' ' + renderBadge(s.status, s.statusText) + '</div>'
    + '<div class="sch-ad-step-desc">' + esc(s.desc) + '</div>'
    + '</div>'
    + '</div>',
  );
  return '<div class="sch-ad-steps">' + items.join('') + '</div>';
}

/** 勾选清单（完成验证清单：用户可勾选；名字固定 `sch-ad-verify`）。 */
export function renderVerifyList(items: readonly string[]): string {
  if (items.length === 0) return '';
  const rows = items.map((text) =>
    '<label class="sch-ad-check"><input type="checkbox" name="sch-ad-verify">' + esc(text) + '</label>',
  );
  return '<div class="sch-ad-verify">' + rows.join('') + '</div>';
}
