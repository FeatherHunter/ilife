/** T351-v8 · 「计划复盘」一族（`calorie.view.exercise-review`，order201–206）整页装配。
 *
 * 观感与双端出处：老模板 `exercise_review.html`（页头／统计卡／热力图／明细表／复制区），
 * 手机端四条手法照 HELP 页面（见 `./reviewDocsCss.ts` 件头）。
 *
 * **本件的取舍（负责人 2026-09-15 六条要求逐条落点）**：
 *   ① 双端自适应：页壳 960／窄屏 820 单列（HELP 断点）。
 *   ② 手机端照 HELP：触摸目标、内距收紧、横向一行塌成纵向一列、复制胶囊 520 居中。
 *   ③ 代码层面可审：本件只产**结构**，形状全在 `./reviewDocsCss.ts` 一处；正文里不写内联样式，
 *      只给进度条写一个纯数字百分比（`style="width:50%"`，无注入面）。
 *   ④ 文字不冗余：删掉原来那段「口径：…；…；…」的独立段落——每条定义**贴到用它的元素上**
 *      （热力图图例下讲「完成」怎么算、动作命中卡副行讲「命中」怎么算）；删掉与副标题重复的
 *      统计卡副行「t1计划」；删掉与口径段逐字重复的表标题后半句。
 *   ⑤ 不用分隔符顶替设计：`·`／`；` 在这页的可见文本里**归零**——窗口写成日期块＋箭头＋天数胶囊，
 *      计划与完成数写成两张带进度条的卡，周次写成表里的一列。
 *   ⑥ 截图审查：见证据件。
 *
 * 取数仍住 `../render/exercisePort.ts` 的 `buildReviewView`（本件不碰库）；页内样式住 `./reviewDocsCss.ts`。
 * 页面上不出现的词：「会话」是内部概念，用户看不懂（负责人 2026-09-14 点名）。
 */
import { buildDataText, buildLogText } from 'base-paint';
import type { DataTextInput } from 'base-paint';
import {
  renderCopyBlock,
  renderDataTable,
  renderDisclosure,
  renderListRows,
} from 'base-paint/blocks';
import { shiftISODate } from '../analysis/utils.js';
import { copyLog } from '../shared/copyArea.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { sceneEnvelope } from '../shared/sceneEnvelope.js';
import type { PlannedSession, ReviewView } from '../render/exercisePort.js';
import { nowStamp } from '../render/receipt.js';
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

/** 百分比 → 进度条三档色（老页 `.stat .value.good/warn/bad` 的三档语义）。
 *  缺值（`null`：这份计划没登记动作）返回空串＝不画条，不假装 0%。 */
function toneOf(pct: number | null): string {
  if (pct === null) return '';
  if (pct >= 80) return 'ilr-bar-ok';
  if (pct >= 50) return 'ilr-bar-warn';
  return 'ilr-bar-bad';
}

/** 日期小字（老页 `.day-cell .date` 是 `M/D 周X`）：`M/D` 与 `周X` 各一枚 span，
 *  窄屏只留 `M/D`——手机上一格只有约 46px，两段挤一起读不动（见 `./reviewDocsCss.ts` 的 820 段）。 */
function dateCell(iso: string): string {
  const [, m, d] = iso.split('-');
  return '<span class="ilr-cell-date">' + Number(m) + '/' + Number(d)
    + '<span class="ilr-cell-dow"> 周' + DOW_CN[dowOf(iso)] + '</span></span>';
}

/** 窗口条：这一页看的是哪一段。两枚日期块 ＋ 箭头 ＋ 天数胶囊（原来靠 `~` 与 `·` 串在一行字里）。
 *  宽度由样式表收成内容宽（见 `./reviewDocsCss.ts` 的同名规则注释）。 */
function windowStrip(start: string, end: string, days: number): string {
  return '<div class="ilr-window">'
    + '<span class="ilr-date">' + start + '</span>'
    + '<span class="ilr-arrow">→</span>'
    + '<span class="ilr-date">' + end + '</span>'
    + '<span class="ilr-pill">' + days + ' 天</span>'
    + '</div>';
}

/** 一张统计卡：标题 ＋ 大数字 ＋ 进度条 ＋ 一句话副行（副行是这张卡的**定义**，不再另起口径段）。 */
function metricCard(label: string, pct: number | null, sub: string): string {
  const tone = toneOf(pct);
  const bar = pct === null
    ? ''
    : '<div class="ilr-bar"><span class="ilr-bar-fill ' + tone + '" style="width:' + pct + '%"></span></div>';
  const value = pct === null
    ? '<span class="ilr-metric-value">' + DASH + '</span>'
    : '<span class="ilr-metric-value">' + pct + '<span class="ilr-metric-unit">%</span></span>';
  return '<div class="ilr-metric"><p class="ilr-metric-label">' + label + '</p>'
    + value + bar + '<p class="ilr-metric-sub">' + sub + '</p></div>';
}

/** 两张统计卡：训练完成（按场次）＋ 动作命中（按动作名）。
 *  原来「计划场次／已完成／完成率／动作完成率」四张卡说的是两件事，现在合成两张、各带一条进度条。 */
function metrics(v: ReviewView): string {
  const movementSub = v.plannedMovements === 0
    ? '这份计划没有登记动作'
    : '计划 ' + v.plannedMovements + ' 个动作，实做对上 ' + v.hitMovements + ' 个';
  return '<div class="ilr-metrics">'
    + metricCard('训练完成', v.completionPct, '计划 ' + v.plannedSessions + ' 场，练了 ' + v.hitSessions + ' 场')
    + metricCard('动作命中', v.movementPct, movementSub)
    + '</div>';
}

/** 热力图一格（老 `.day-cell`）：日期小字＋状态词。状态词是**文字的**唯一出处——
 *  黑白打印丢掉底色也读得懂（老页那版只印百分比，丢了底色就只剩数字）。 */
function heatCell(iso: string, cls: string, text: string): string {
  return '<div class="ilr-cell ' + cls + '">' + dateCell(iso)
    + '<span class="ilr-cell-txt">' + text + '</span></div>';
}

/** 图例一项。 */
function legendItem(dot: string, text: string): string {
  return '<span class="ilr-legend-item"><span class="ilr-dot ' + dot + '"></span>' + text + '</span>';
}

/** 每日完成情况：（老 `.heatmap`）一周一行、周一列打头。
 *  图例下面那句是「完成」的定义——原来住在口径段里，现在贴着图例走。 */
function heatmapSection(v: ReviewView, all: readonly string[]): string {
  const shown = all.slice(0, HEAT_CAP);
  const byDate = new Map(v.sessions.map((s) => [s.date, s]));
  const lead = shown.length === 0 ? 0 : (dowOf(shown[0]) + 6) % 7;
  const pads = '<div class="ilr-cell ilr-pad"></div>'.repeat(lead);
  const cells = shown.map((d) => {
    const s = byDate.get(d);
    // 无安排＝「未排训练」：窗内没排到（含计划的休息日与计划外的日子）。不写「休息日」——
    // 库里的休息日是计划主动排的，与「这天压根没排」不是一回事，页面不替它们编同一句话。
    if (s === undefined) return heatCell(d, 'ilr-rest', '未排训练');
    return s.hit ? heatCell(d, 'ilr-done', '完成') : heatCell(d, 'ilr-miss', '未完成');
  }).join('');
  const note = all.length > shown.length
    ? '<p class="ilr-note">热力图只画前 ' + shown.length + ' 天（本窗共 ' + all.length + ' 天），其余见下表。</p>'
    : '';
  return '<section class="ilr-sec"><h2 class="ilr-sec-title">每日完成情况</h2>'
    + '<div class="ilr-hm">' + pads + cells + '</div>'
    + '<div class="ilr-legend">' + legendItem('ilr-dot-done', '完成')
    + legendItem('ilr-dot-miss', '未完成') + legendItem('ilr-dot-rest', '未排训练') + '</div>'
    + '<p class="ilr-legend-note">当天有运动记录就算完成，没排到训练的日子单独标出来</p>'
    + note + '</section>';
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
function copyBlock(v: ReviewView): string {
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
      envelope: sceneEnvelope(data.envelope),
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
  const all = dateRange(v.start, v.end);
  const parts: string[] = [
    reviewViewCss(),
    windowStrip(v.start, v.end, all.length),
    metrics(v),
    heatmapSection(v, all),
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
      caption: '每日明细',
      emptyText: '这段时间没有安排训练',
    }),
  ];
  if (v.unhit.length > 0) {
    parts.push(renderDisclosure({
      title: '未完成训练（' + v.unhit.length + ' 场）',
      contentHtml: renderListRows({
        items: v.unhit.map((s) => ({
          left: s.date,
          main: (s.label === '' ? '训练' : s.label) + (s.movements.length > 0 ? '：' + s.movements.join('、') : ''),
          right: '未完成',
        })),
      }),
    }));
  }
  parts.push(copyBlock(v));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '计划复盘',
    eyebrow: '健身计划',
    subtitle: v.planTitle === '' ? null : v.planTitle,
    content: parts.join(''),
    pageUi: true,
  });
}
