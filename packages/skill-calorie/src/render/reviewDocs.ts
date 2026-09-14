/** T351-v7 · 「计划复盘」一族（`calorie.view.exercise-review`，order201–206）整页装配。
 *
 * 出处：老模板 `D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_review.html`（552 行）——
 * 页头＋四档统计卡＋**每日完成情况热力图**＋每日明细表＋复制区，双端 640 断点。老页的图表两张
 * （周容量／主项负荷）**不做**：它们吃的是老技能 `__meta__.volume` 那份数据（按周 Σ(kg×次数)），
 * 本仓取数层没有对应字段（`ReviewView` 只有计划场次／命中场次／计划动作／命中动作），
 * 硬造一张「计划 1 场 vs 已完成 1 场」的柱图是噪声，故本族不出图——页内因此**零图表 helpers**，
 * 全页只剩共享复制区那一段脚本，与 176–185 同档。
 *
 * 取数仍住 `./exercisePort.ts` 的 `buildReviewView`（本件只装配，不碰库）。
 * 页内样式住 `./reviewDocsCss.ts`（唯一产出者），本件只把它插进正文。
 *
 * 用词（负责人 2026-09-14 点名）：「会话」是内部概念，用户看不懂，页面文案一律不出现——
 * 计划场次写「场」、完成率写「完成率」、缺数据的描述写「没有安排训练」。
 */
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import {
  renderCaliberLine,
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import { shiftISODate } from '../analysis/utils.js';
import { copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import type { PlannedSession, ReviewView } from './exercisePort.js';
import { nowStamp } from './receipt.js';
import { reviewViewCss } from './reviewDocsCss.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** head 的 `<title>`（整页模板住 `src/shared/docPage.ts`）。 */
const DOC_TITLE = '卡路里·计划复盘';

/** 空值写法：缺值一律「—」（不空着、也不编 0）。 */
const DASH = '—';

/** 热力图逐格绘制上限：超了只画前 N 天并在图下明示（沿 R3 的截断明示，不静默少画）。
 *  84 ＝ 12 周整，正好是七列的整数倍，最后一行不留半行空。 */
const HEAT_CAP = 84;

/** 星期名（`Date.getDay()` 口径：0＝周日）；「周几」由日期自己算，不从库里取。 */
const DOW_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** ISO 日期 → 星期几（0＝周日）。取正午 UTC 免时区把日期翻到前一天。 */
function dowOf(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

/** 闭区间逐日展开（`start > end` 得空表）。 */
function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = shiftISODate(d, 1)) out.push(d);
  return out;
}

/** 「9/14 周一」这种日期小字（老页 `.day-cell .date` 是 `M/D 周X`）。 */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return String(Number(m)) + '/' + String(Number(d)) + ' 周' + DOW_CN[dowOf(iso)];
}

/** 热力图一格（老 `.day-cell`）：日期小字＋状态词。状态词是**文字的**唯一出处——
 *  黑白打印丢掉底色也读得懂（老页那版只印百分比，丢了底色就只剩数字）。 */
function heatCell(iso: string, cls: string, text: string): string {
  return '<div class="ilr-cell ' + cls + '"><span class="ilr-cell-date">' + shortDate(iso) + '</span>'
    + '<span class="ilr-cell-txt">' + text + '</span></div>';
}

/** 图例一项。 */
function legendItem(dot: string, text: string): string {
  return '<span class="ilr-legend-item"><span class="ilr-dot ' + dot + '"></span>' + text + '</span>';
}

/** 每日完成情况热力图（老 `.heatmap`）：一周一行、周一列打头，无安排的日印「未排训练」。
 *  首行补几个空位把日期按星期对齐（老页从区间第一天起排，头一行是斜的）。 */
function heatmapHtml(v: ReviewView): string {
  const all = dateRange(v.start, v.end);
  const shown = all.slice(0, HEAT_CAP);
  const byDate = new Map(v.sessions.map((s) => [s.date, s]));
  const lead = shown.length === 0 ? 0 : (dowOf(shown[0]) + 6) % 7;
  const pads = '<div class="ilr-cell ilr-pad"></div>'.repeat(lead);
  const cells = shown.map((d) => {
    const s = byDate.get(d);
    // 无安排＝「未排训练」：窗内没排到（含计划的休息日与计划外的日子），不写成「休息日」——
    // 库里的休息日是计划主动排的，与「这天压根没排」不是一回事，页面不替它们编同一句话。
    if (s === undefined) return heatCell(d, 'ilr-rest', '未排训练');
    return s.hit ? heatCell(d, 'ilr-done', '完成') : heatCell(d, 'ilr-miss', '未完成');
  }).join('');
  const legend = '<div class="ilr-legend">'
    + legendItem('ilr-dot-done', '完成')
    + legendItem('ilr-dot-miss', '未完成')
    + legendItem('ilr-dot-rest', '未排训练')
    + '</div>';
  const note = all.length > shown.length
    ? '<p class="ilr-note">热力图只画前 ' + shown.length + ' 天（本窗共 ' + all.length
      + ' 天）；其余日期的明细见下表。</p>'
    : '';
  return '<section class="ilr-sec"><h2 class="ilr-sec-title">每日完成情况</h2>'
    + '<div class="ilr-hm">' + pads + cells + '</div>' + legend + note + '</section>';
}

/** 一行明细（计划动作与实做都按顿号连；空列写「—」）。 */
function detailRow(s: PlannedSession): Record<string, string> {
  return {
    date: s.date,
    week: '第 ' + s.week + ' 周',
    label: s.label === '' ? '训练' : s.label,
    moves: s.movements.length === 0 ? DASH : s.movements.join('、'),
    actual: s.actualTypes.length === 0 ? DASH : s.actualTypes.join('、'),
    hit: s.hit ? '完成' : '未完成',
  };
}

/** 带 prompt 的双按钮复制区（冻结 id `ilife-copy-data`／`ilife-copy-log`）：
 *  单格式数据文本＋日志文本直挂承载属性，共用页面双通道运行时（剪贴板→命令兜底＋已复制态），
 *  零内联脚本；无三格式菜单、无 text/json/csv 英文菜单项（沿 #351 定案口径）。 */
function reviewCopyBlock(v: ReviewView): string {
  const data: DataTextInput = {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-review',
      data: {
        metrics: metricsOf({
          plannedSessions: v.plannedSessions, hitSessions: v.hitSessions,
          completionPct: v.completionPct, plannedMovements: v.plannedMovements,
          hitMovements: v.hitMovements, movementPct: v.movementPct,
        }),
      },
    },
    title: '【calorie · 计划复盘】',
    format: 'text',
  };
  return renderCopyBlock({
    dataText: buildDataText(data),
    logText: buildLogText({
      envelope: data.envelope,
      copyLog: copyLog({
        command: 'calorie-cmd-read calorie.view.exercise-review',
        source: 'workout_plans ＋ exercise_log（只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
  }).replace('data-action-id="ilife-copy-data"', 'id="ilife-copy-data" data-action-id="ilife-copy-data"')
    .replace('data-action-id="ilife-copy-log"', 'id="ilife-copy-log" data-action-id="ilife-copy-log"');
}

export function buildReviewDoc(v: ReviewView): string {
  const days = dateRange(v.start, v.end).length;
  const parts: string[] = [
    reviewViewCss(),
    // 窗口不另立参数表单：H1 里已经写着「计划复盘 起 ~ 止」，再摆两个 date 输入框是重复
    // （负责人对 184 的反馈就是「副标题别冗余」）。取数口径改走一行灰色小字，同 184 的节奏。
    renderCaliberLine('口径：训练日按周一口径由计划起始日推算，休息日不计；'
      + '完成＝当日有运动记录；动作命中＝计划动作名与实做名双向匹配。'),
    renderKpiGrid([
      { label: '计划训练', value: String(v.plannedSessions), unit: '场', detail: v.planTitle === '' ? DASH : v.planTitle },
      { label: '已完成', value: String(v.hitSessions), unit: '场' },
      {
        label: '完成率', value: v.completionPct === null ? DASH : String(v.completionPct) + '%',
        status: (v.completionPct ?? 0) >= 80 ? 'ok' : 'warn',
      },
      {
        label: '动作完成率', value: v.movementPct === null ? DASH : String(v.movementPct) + '%',
        detail: '命中 ' + v.hitMovements + ' / 计划 ' + v.plannedMovements + ' 个动作',
      },
    ]),
    heatmapHtml(v),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'week', label: '周次' },
        { key: 'label', label: '训练' },
        { key: 'moves', label: '计划动作' },
        { key: 'actual', label: '实做' },
        { key: 'hit', label: '完成' },
      ],
      rows: v.sessions.map(detailRow),
      caption: '每日明细（完成＝当日有运动记录；动作命中＝计划动作名与实做名双向匹配）',
      emptyText: '这段时间没有安排训练',
    }),
  ];
  if (v.unhit.length > 0) {
    parts.push(renderDisclosure({
      title: '未完成训练（共 ' + v.unhit.length + ' 场）',
      contentHtml: renderListRows({
        items: v.unhit.map((s) => ({
          left: s.date,
          main: (s.label === '' ? '训练' : s.label) + (s.movements.length > 0 ? '：' + s.movements.join('、') : ''),
          right: '未完成',
        })),
      }),
    }));
  }
  parts.push(reviewCopyBlock(v));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '计划复盘 ' + v.start + ' ~ ' + v.end,
    eyebrow: '健身计划 · 计划复盘',
    subtitle: (v.planTitle === '' ? '训练计划' : v.planTitle) + ' · 共 ' + days + ' 天',
    content: parts.join(''),
  });
}
