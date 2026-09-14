/** T351-v5 · 「看完整计划」一族的**两级页签**与**场次卡**（零内联脚本）。
 *
 * 出处：老模板 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`——
 * 周次页签 `.tabs/.tab`（`:27-35`）、日页签 `.day-tabs/.day-tab`（`:58-62`）、场次卡
 * `.session/.sess-head/.sess-tag/.sess-name/.sess-time`（`:38-42`）。老页那两级页签靠 `onclick`
 * 切 `display`（`:644-669`），本仓契约禁内联脚本（`docs/base-paint-contract.md` AC-7），
 * 故改写成**选钮＋label＋兄弟选择器**：
 *   - 一级（周）：一组 `input[type=radio][name=ilw-wk]` 与各周面板同父同级，`label` 显示成周次页签；
 *   - 二级（日）：每周一组独立 `name`（`ilw-dy-<i>`），只在**本周内**收放本日的面板；
 *   - 规则由 `./workoutPlanCss.ts` 按「第几周／第几天」逐条生成（`#id:checked~.面板`）。
 * 为什么选它而不是 `:target` 锚点式（本票的定夺与理由）：① `:target` 会改地址栏并触发页面滚动，
 * 两级同时用会互相抢锚点（周与日共用一个 `#`）；② 选钮式**首屏有确定的默认选中项**——周默认本周、
 * 日默认周一（见下），`:target` 式默认态没有锚点、样式也盖不到页签自身（要给页签上激活态得靠
 * `:has()`，多一层浏览器版本前提）。③ 键盘可操作（Tab ＋ 方向键选周／选日），`label` 带 `for` 与选钮同组。
 *
 * T351-v6：负责人裁定去掉两级页签里的「全部周次」与「全部」两枚（页签只留 `第 N 周` 与 `周一…周日`）。
 * 选钮式一旦没有选中项那一层就全不可见，故两层各钉一个**默认选中项**：
 *   - 周＝**本周**：由 `./workoutPlanDocs.ts` 按计划起始日与今天算出（`weekOfDate`），本件只收这个数；
 *     算不出（计划缺起始日）或算出的那周不在页内时，兜底选页内第 1 周那一枚；
 *   - 日＝**周一**：老页首屏也是周一；本周周一无安排时仍选它，页内照实出「周一 不排训练」。
 * 代价（如实记账）：只选中一周／一天时，浏览器「查找」只覆盖当刻可见的那部分——负责人已选择不要
 * 「全部」两枚，这一条不再有「点回去看全文」的退路；要全文可打印（`@media print` 两级面板一律展开），
 * 或直接看产物 HTML（面板全量落盘，内容始终在 DOM 里）。
 *
 * 页面上不出现的词：「会话」一律写「场次」——老页与我们同库，但那是内部概念，用户看不懂
 * （本单用词红线；对照「写训练计划」那一票的页面文案口径）。
 */
import { escapeHtml } from 'base-paint';
import type { PlanSessionRow } from '../workout/planStore.js';
import { movementTableHtml, tempoOf } from './workoutMovementTable.js';

/** 星期名（看计划一族共用的唯一出处）：`day_of_week` 1–7 对「周一–周日」。 */
export const DOW = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 一周（周次号 ＋ 该周各场次）。 */
export interface PlanWeek {
  readonly week: number;
  readonly sessions: readonly PlanSessionRow[];
}

/** 休息日卡的正文（老页 `.rest-day` 的「主动恢复，不练力量」，本单口径把「力量」写成「训练动作」）。 */
const REST_NOTE = '主动恢复，不排训练动作';

/** 休息日卡的场次名：空 `label` 与「休息」都写「休息日」；库中已是「休息日」的（生产库 4 行）不追加。 */
function restLabel(raw: string): string {
  if (raw === '' || raw === '休息') return '休息日';
  return raw.includes('休息日') ? raw : raw + '（休息日）';
}

/** 时段：起点为空不印；终点为空或与起点同值只印起点；否则「起–止」（短横线同老页 `:277` 的位置）。 */
function timeText(s: PlanSessionRow): string {
  const start = s.time_start ?? '';
  if (start === '') return '';
  const end = s.time_end ?? '';
  return end === '' || end === start ? start : start + '–' + end;
}

/** 场次数（优先库里的 `total_sets`，缺则按各动作组数求和）。 */
function setsCount(s: PlanSessionRow, moves: readonly { sets?: readonly unknown[] }[]): number {
  return s.total_sets ?? moves.reduce((n, m) => n + (m.sets ?? []).length, 0);
}

/** 场次卡（老 `.session` 一族）：头行「周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏 …」＋卡内四列动作表。
 *  节奏取该场动作备注方括号内逗号之后那段（场内恒定，摆成列就是整列重复，故只上头行）；休息日无表、无节奏。 */
export function sessionCardHtml(s: PlanSessionRow): string {
  const moves = Array.isArray(s.movements) ? s.movements : [];
  const dow = DOW[s.day_of_week] ?? '周' + s.day_of_week;
  if (s.is_rest_day === 1) {
    return '<div class="ilw-session ilw-rest"><h3 class="ilw-rest-title">'
      + escapeHtml(dow + ' · ' + restLabel(s.session_label ?? '')) + '</h3>'
      + '<p class="ilw-rest-note">' + REST_NOTE + '</p></div>';
  }
  const raw = s.session_label ?? '';
  const name = raw === '' ? '训练' : raw;
  const count = setsCount(s, moves);
  const tempo = tempoOf(moves);
  const meta = [
    timeText(s),
    count === 0 ? '' : '共 ' + count + ' 组',
    tempo === '' ? '' : '节奏 ' + tempo,
  ].filter((t) => t !== '').map((t) => '<span>' + escapeHtml(t) + '</span>').join('\n');
  // 各段之间留一个换行：flex 容器忽略纯空白文本节点（视觉不变），但选中复制与正文检索能拿到分隔。
  return '<div class="ilw-session">'
    + '<div class="ilw-sess-head"><span class="ilw-sess-tag">' + escapeHtml(dow) + '</span>\n'
    + '<span class="ilw-sess-name">' + escapeHtml(name) + '</span>\n'
    + (meta === '' ? '' : '<span class="ilw-sess-meta">' + meta + '</span>\n')
    + '</div>' + movementTableHtml(moves) + '</div>';
}

/** 一枚页签（选钮的 id ＋ 显示词 ＋ 是否默认选中 ＋ 该日有无安排）。 */
interface TabItem {
  readonly id: string;
  readonly text: string;
  /** 首屏默认选中（`checked`）：每层恰好一枚，否则那一层内容全不可见（选钮式的固有约束）。 */
  readonly on: boolean;
  readonly off: boolean;
}

/** 选钮串：视觉上藏起来（类名 `ilw-wkr`／`ilw-dyr`，见页内样式），`on` 那枚默认选中。 */
function radios(name: string, cls: string, items: readonly TabItem[]): string {
  return items.map((t) => '<input class="' + cls + '" type="radio" name="' + name + '" id="' + t.id + '"'
    + (t.on ? ' checked' : '') + '>').join('');
}

/** 页签串：`<label for=选钮id>`，无安排的星期带 `ilw-off`（压暗，点进去是一句「不排训练」）。 */
function tabRow(cls: string, label: string, items: readonly TabItem[], aria: string): string {
  return '<nav class="' + cls + '" aria-label="' + aria + '">'
    + items.map((t) => '<label class="' + label + (t.off ? ' ilw-off' : '') + '" for="' + t.id + '">'
      + escapeHtml(t.text) + '</label>').join('') + '</nav>';
}

/** 日页签的七枚（周一…周日）：「全部」那一枚按负责人裁定去掉，选钮 id 尾即 `day_of_week`。 */
const DAY_ITEMS: readonly { readonly id: string; readonly text: string }[] =
  Array.from({ length: 7 }, (_, d) => ({ id: String(d + 1), text: DOW[d + 1] }));

/** 日页签的默认选中项＝周一（`day_of_week=1`；老页首屏就是周一，无安排也不改选）。 */
const DEFAULT_DOW = '1';

/** 一周的面板：日页签（本周内独立一组选钮）＋ 逐日面板（无安排的日出一句「不排训练」）。
 *  面板 id 用周序号（0 起）而不是周次号：老页的 `data-wk` 是周次号，但选择器按序号生成更稳
 *  （周次号可能缺号，序号恒连续）；周次号仍逐字印在周区块标题与页签上。 */
function weekSection(index: number, w: PlanWeek): string {
  const prefix = 'ilw-dy-' + index;
  const has = new Set(w.sessions.map((s) => s.day_of_week));
  const items: TabItem[] = DAY_ITEMS.map((d) => ({
    id: prefix + '-' + d.id, text: d.text, on: d.id === DEFAULT_DOW, off: !has.has(Number(d.id)),
  }));
  const panes = Array.from({ length: 7 }, (_, i) => {
    const dow = i + 1;
    const list = w.sessions.filter((s) => s.day_of_week === dow);
    const body = list.length === 0
      ? '<p class="ilw-none">' + DOW[dow] + ' 不排训练</p>'
      : list.map(sessionCardHtml).join('');
    return '<div class="ilw-day' + (list.length === 0 ? ' ilw-day-empty' : '') + '" data-dow="' + dow + '">'
      + body + '</div>';
  });
  return '<section class="ilw-week" data-wk="' + index + '">'
    + '<h2 class="ilw-week-head">第 ' + w.week + ' 周 · ' + w.sessions.length + ' 场</h2>'
    + radios(prefix, 'ilw-dyr', items)
    + tabRow('ilw-day-tabs', 'ilw-day-tab', items, '按星期看')
    + panes.join('')
    + '</section>';
}

/** 整块训练安排：周次页签 ＋ 周区块。首屏默认选中**本周**（`currentWeek` ＝ 按计划起始日与今天算出的
 *  周次号，由 `./workoutPlanDocs.ts` 传进来）；算不出、或那一周不在本页时，兜底选页内第 1 周那一枚。
 *  页签只有 `第 N 周`（「全部周次」那一枚按负责人裁定去掉）。 */
export function planWeeksHtml(weeks: readonly PlanWeek[], currentWeek: number | null): string {
  // `findIndex` 落空（-1）即兜底到第 1 周；`weeks` 为空时 items 为空，两块页签都不出。
  const active = Math.max(0, weeks.findIndex((w) => w.week === currentWeek));
  const items: TabItem[] = weeks.map((w, i) => ({
    id: 'ilw-wk-' + i, text: '第 ' + w.week + ' 周', on: i === active, off: false,
  }));
  return '<div class="ilw-app">'
    + radios('ilw-wk', 'ilw-wkr', items)
    + tabRow('ilw-tabs', 'ilw-tab', items, '按周次看')
    + weeks.map((w, i) => weekSection(i, w)).join('')
    + '</div>';
}
