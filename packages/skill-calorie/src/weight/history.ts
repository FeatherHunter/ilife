/** 看体重明细（HELP 场景 03「体重」下一级）：`calorie.view.weight-history` 读。
 *
 * 「看体重明细」与「看体重曲线」在命令面上是**同一个键**（曲线＝同一页在不同窗口词下的读法，
 * 见 `triggers/routing.ts` 的「看体重曲线」系列），故本文件是那两条子功能共同的住处。
 * 体重记录的取数（含「只看有备注的那些」）住同目录 `records.ts`。
 *
 * 窗口口径（#333 真缺陷修复）：先走 `windowRange(params)`（`window`／`offset`／`today`，
 * 时间说法唯一定义地 `analysis/series.ts`），再退回既有的 `days`／`start+end` 口径
 * （与同目录 `compare.ts:30` 同一形状）。`windowRange` 给了窗口就以它为准，
 * 两样都没有才沿用旧口径——除「看体重曲线」（30d 与缺省同值）外其余 13 条此前都退回缺省 30 天。
 *
 * 老新融合（#333 页面①，老实物 `templates/weight_history.html` 对照）：
 * ① 量程＝老技能「好看量程」（`niceRange`：最小跨度 0.4kg、对称展开、边界与步长都落 0.1 的整数倍），
 *    X 标签用 `labels:'select'`（首＋峰值＋尾），Y 刻度 4~6 条——上一版两样都缺，曲线无刻度可读；
 * ② 三种标注层真进图（老实物 `weight_history.html:238-240`／`:253-258`／`:275-278` 的做法）：
 *    目标在量程内画 `markLine`，**量程外退化成「距目标还差 X kg」文字徽章**（V2.4 老裁定的原意：
 *    量程只由数据驱动，不为目标扩张）；里程碑在窗内画 `markLine` 竖线、窗外只留图例行；
 *    异常点走 `ChartItem.anomaly:true` 染红（组件自带，不自造配色）；
 * ③ 0／1／N 三态同一个守卫：0 条给空态句（不留白、也不像老技能那样 `display:none` 静默），
 *    1 条给单点标记＋均值线＋页顶一条软横幅（软横幅的位置照老实物 `weight_compare.html:79`），
 *    >30 条分段明细保持原样；
 * ④ 页脚复制载荷＝**逐条 records**（日期／时间／体重／BMI／备注，`list` 形：`text` 每行一条、
 *    `json` 结构、`csv` 可导入）——KPI 那几个数仍在出口 envelope 的 `metrics` 里（别处不重算）；
 * ⑤ 收尾三件（本轮）：页脚数据来源行（哪张库／哪张表／哪个窗口／多少条＋缺口）、复制区恒为
 *    「复制数据 ▾ ＋ 复制日志」两颗（日志第 3 段是渲染命令原文，照抄能重跑）、空窗仍出**完整页**
 *    （数据型空态句＋页脚来源行，不是整页不落盘）。
 *
 * #502 形状化 ＋ 手机端（负责人口径 2026-09-15 第 1／2／5 条；共同口径 `.scratch/t154/text-review/口径-UI.md`，
 * 形状词汇住同目录 `weightUi.ts`，样式由本页装配放进 `parts` 第一项）：
 *   ① 页头副标题整行撤（#542）；
 *   ② 窗口事实（区间 ＋ 天数）从「本窗 2026-08-09 ~ 2026-09-07」这句串里提出来，落成 `windowStrip()`
 *      （两枚日期块 ＋ 箭头 ＋ 天数胶囊）；单日窗（区间串＝一天）不出这条，免得画成「今天 → 今天」；
 *   ③ 卡片副说明里的「30 天 · 每天 +10 克」 → `factStrip()` 的「节奏」一枚；「首日 … → 末日 …」→
 *      `pairStrip()` 的「首日与末日」一枚（两张卡的值槽／徽章照旧只说自己那个数，不再同说一件事）；
 *   ④ 页顶那条样本不足提示的「；」串 → `notice()` ＋ `bulletList()` 两条前提逐条成行；
 *   ⑤ 结论块走 `verdict()`（一句话判语）；原与目标卡／图例逐字重复的目标小标签随本轮删（删的是重复，
 *      事实两处都在：距目标卡与图例）；异常点那页补一条 `note()` 脚注写清平均线／注意线／警戒线口径；
 *   ⑥ 明细表包折叠区（用户反馈 #502）：标题点按展开／收起、默认收起，`caption` 移入
 *      折叠标题（同一句话不说两遍）；图表、复制区、页脚口径行（`｜`）与机器面一行未改。
 *
 * #510 设计视角审查整改（同屏事实收敛，只动文本与装配，结构未动）：
 *   · 窗口串一屏三处（页题 ＋ KPI 卡副说明 ＋ 窗口条）⇒ **页题只留「体重历史」、卡副说明撤掉区间串**，
 *     窗口串归页顶那条形状（页脚来源行是元信息面，照旧留）；
 *   · 「体重历史」卡的徽章原印「共 N 条」（与值槽的「N 条」同卡两槽说一个数）⇒ 换状态词「记录足够」；
 *   · 判语块不再复述卡片：`conclusionOf()` 改成一句「这一段怎么样」，不给数、不给方向词；
 *   · 「变化」卡副说明里的速率只在页顶那条事实条（形状）说一次；里程碑卡副说明的 `、` 改写成一句话。
 */
import type { DatabaseSync } from 'node:sqlite';
import { optNum, optStr, windowRange } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import type { SerializableEnvelope } from 'base-paint';
import { FetchError } from '../fetch/errors.js';
import { CalorieRenderError } from '../render/errors.js';
import { nowStamp } from '../render/receipt.js';
import { getWeightGoalValue, getWeightHistory, noteTag } from './records.js';
import type { WeightHistory } from './records.js';
import { assertDate, assertRange } from './plate.js';
import type { WeightHistoryView } from './plate.js';
import { scenarioE3 } from './weightCompare2.js';
import { weightVolatilityV2 } from './volatility.js';
import {
  renderCaliberLine,
  renderChartBlock,
  renderDataTable,
  renderDisclosure,
  renderEmptyBlock,
  renderKpiGrid,
  renderListRows,
} from 'base-paint/blocks';
import {
  bulletList, factStrip, note as wnote, verdict, weightUiCss, windowStrip,
} from './weightUi.js';
import type { DataTableColumn, StatusKind } from 'base-paint/blocks';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { DB_FILENAME } from '../paths.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION } from './plateDocs.js';

/** 本页命令键（信封、标题眉标、复制日志一处定义，别处引用）。 */
const CMD_KEY = 'calorie.view.weight-history';

export type HistoryOverlay = 'target' | 'milestone' | 'anomaly';

export interface HistoryDocExtra {
  overlay?: HistoryOverlay;
  noteOnly?: boolean;
  /** 目标那一路的两个数：`kg` 为设的目标，`diffKg` 为最新体重减目标（本窗无记录时 `diffKg` 为 null）。 */
  goal?: { kg: number; diffKg: number | null } | null;
  milestones?: Array<{ label: string; date: string; kg: number }>;
  milestoneMiss?: string[];
  anomalies?: Array<{ date: string; kg: number; deviationKg: number; level: string }>;
  /** 无异常点时那句成功型空态的口径（基线／黄红阈值），取自波动分析的公开接口。 */
  anomalyNote?: string;
  /** 渲染本页的命令原文（复制日志第 3 段；照抄能重跑）。 */
  command?: string;
}

/** KPI 卡（`base-paint` 的 B-02：四槽＋状态徽章；组件与样式已齐，本页只传值）。
 *  值槽只放**短数字或数字＋单位**：单位走 `unit` 槽（小字），长信息一律进 `detail`。 */
interface KpiCard {
  label: string; value: string; unit?: string;
  /** 副说明（可缺省）：副说明与本卡别的槽同说一件事时**删副说明**，一处事实只说一次（#480 同卡跨槽不重复）。 */
  detail?: string;
  status?: StatusKind; statusText?: string;
}

function isOverlay(v: string | undefined): v is HistoryOverlay {
  return v === 'target' || v === 'milestone' || v === 'anomaly';
}

/** 里程碑门槛（减重 kg）：`overlay='milestone'` 的取数与「里程碑」卡的门槛口径同出一处。 */
const MILESTONE_KG: readonly number[] = [5, 10];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 偏差口径要两位（#480 缺陷 6）：`偏 0.13` 的原精度就是两位，取一位会把 0.13 说成 0.1。 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 带符号的差值／速率（#480 口径 3.3）：正零不写加号、数字与单位之间留一个空格；小数位与读数槽一致取一位。 */
function signedKg(n: number, unit = ' kg'): string {
  const v = round1(n);
  return (v > 0 ? '+' : '') + (Number.isInteger(v) ? v.toFixed(1) : String(v)) + unit;
}

/** 速率说人话（#480 口径 3.2）：「每天 +10 克」，全页不出现 `g/天`，也不两种单位并存。 */
function perDayHuman(delta: number, spanDays: number): string | null {
  if (spanDays <= 0) return null;
  const g = Math.round((delta / spanDays) * 1000);
  return '每天 ' + (g > 0 ? '+' : '') + g + ' 克';
}

/** 「首日 → 末日」两端的写法（#480 口径 3.2 的「首日与末日对比」，替换内部的「首末对照」说法）。
 *  #502 起两端各成一枚加粗值（`pairStrip()` 的那个形状），故拆成两半取用：`end` 说取哪一端。 */
function firstLastHuman(c: NonNullable<WeightHistory['change']>, end: 'first' | 'last'): string {
  return end === 'first' ? '首日 ' + c.first + ' kg' : '末日 ' + c.last + ' kg';
}

/** 区间串 → 天数（`2026-09-01`／`2026-09-01 ~ 2026-09-07` 两种；「最近30天」那类由视图模型给成区间串）。 */
function rangeDaysHuman(range: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?: ~ (\d{4}-\d{2}-\d{2}))?$/.exec(range);
  if (m === null) return null;
  const a = Date.parse(m[1] + 'T00:00:00Z');
  const b = Date.parse((m[2] ?? m[1]) + 'T00:00:00Z');
  return Math.round((b - a) / 86400000) + 1;
}

/** 窗口事实条（#502）：区间 ＋ 天数本来串在卡片副说明的一句话里（「本窗 …」），
 *  本轮提成 `windowStrip()` 的形状（日期块 → 日期块 ＋ 天数胶囊）。
 *  单日窗不出这条：区间串就是那一天，画成「今天 → 今天」是白占一行（天数由页顶提示那句说）。 */
function windowFactStrip(h: WeightHistoryView): string {
  if (h.rows.length === 0) return '';
  const parts = h.range.split(' ~ ');
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return '';
  const days = rangeDaysHuman(h.range);
  return windowStrip(parts[0], parts[1], days === null ? '' : days + ' 天');
}

/** 进度事实条（#502）：变化卡副说明里的「30 天 · 每天 +10 克」原来是拿 `·` 把两件事串成一句话；
 *  跨度和速率各有自己的位置（跨度已住在窗口条的天数胶囊里），这里只把**速率**这一件事实落成形状。
 *  首末两端的对照（「首日 70.1 kg → 末日 70.4 kg」，原住在均值卡副说明）本轮也从卡片里撤出来，
 *  与速率同住一条：三枚「标签 ＋ 值」并排，两端中间挂一个箭头（形状取 `weightUi.ts` 的 `.wui-pair-*`，
 *  不另造形状；本件不写内联样式）。 */
function progressStrips(h: WeightHistoryView, avg: number | null): string {
  if (h.rows.length === 0) return '';
  const c = h.change;
  if (c === null || avg === null) return '';
  const rate = perDayHuman(c.delta, c.spanDays);
  if (rate === null) return '';
  return '<div class="wui-strip">'
    + '<span class="wui-fact"><span class="wui-fact-k">节奏</span>'
    + '<span class="wui-fact-v">' + rate + '</span></span>'
    + '<span class="wui-pair"><span class="wui-pair-v">' + firstLastHuman(c, 'first') + '</span>'
    + '<span class="wui-pair-mid">→</span>'
    + '<span class="wui-pair-v">' + firstLastHuman(c, 'last') + '</span></span>'
    + '</div>';
}

/** 异常点那页的脚注（#502）：平均线／注意线／警戒线三档口径原只在「本窗无异常点」时才说，
 *  有异常点时读者反而看不到判据 ⇒ 落成 `note()` 脚注，画在异常点下面。 */
function anomalyNoteOf(extra: HistoryDocExtra): string {
  const n = extra.anomalyNote;
  if (n === undefined || n === '') return '';
  const m = /平均线 ([\d.]+) kg，注意线 ±([\d.]+) kg，警戒线 ±([\d.]+) kg/.exec(n);
  if (m === null) return wnote(n);
  return wnote('比平均线 ' + m[1] + ' kg 是基线：差 ' + m[2] + ' kg 到注意线，差 ' + m[3] + ' kg 到警戒线。');
}

/** 异常点偏离说人话（#480）：原写「偏 0.13」没说相对谁、也没带单位；这里点名相对平均线并分高低。
 *  精度两位（#480 缺陷 6）：一位小数会把 0.13 说成 0.1；只有一位有效位（次位为 0）时写「略高／略低」，不假装更精确。 */
function deviationHuman(kg: number, deviationKg: number): string {
  const d = round2(Math.abs(deviationKg));
  if (d === 0) return kg + ' kg（和平均线一样）';
  if (d < 1 && Math.round(d * 10) === d * 10) return kg + ' kg（比平均线' + (deviationKg > 0 ? '略高' : '略低') + '）';
  return kg + ' kg（比平均线' + (deviationKg > 0 ? '高' : '低') + ' ' + d + ' kg）';
}

/** 异常点卡的副说明（#480 缺陷 5）：按当刻数据取头三天——连号时说「某日连续 3 天偏高」，
 *  不连号只点到首日（清单本身在图例里逐条念，卡片不重复抄）。长度以一行不被截断为准。
 *  #502：原句「某日**起**连续 3 天偏高」那个悬空的「起」是写串了（读成「从那天起」要接后半句，
 *  可后半句就是「偏高」本身）⇒ 去掉。 */
function anomalyHeadHuman(list: readonly { date: string }[]): string {
  const head = list.slice(0, 3);
  const day = (s: string) => Date.parse(s + 'T00:00:00Z');
  const consecutive = head.length === 3
    && head.every((a, i) => i === 0 || day(a.date) - day(head[i - 1].date) === 86400000);
  if (consecutive) return head[0].date + ' 连续 3 天偏高';
  return list[0].date + ' 偏高';
}

function avgOf(rows: WeightHistory['rows']): number | null {
  if (rows.length === 0) return null;
  const s = rows.reduce((a, r) => a + r.weight_kg, 0);
  return round1(s / rows.length);
}

function changeOf(rows: WeightHistory['rows']): WeightHistory['change'] {
  if (rows.length < 2) return null;
  const first = (rows[rows.length - 1] as (typeof rows)[number]).weight_kg;
  const last = (rows[0] as (typeof rows)[number]).weight_kg;
  const spanDays = Math.round(
    (new Date((rows[0] as (typeof rows)[number]).date).getTime()
      - new Date((rows[rows.length - 1] as (typeof rows)[number]).date).getTime()) / 86400000,
  ) + 1;
  const delta = round1(last - first);
  return { spanDays, first, last, delta, dailyAvg: spanDays > 0 ? Math.round((delta / spanDays) * 100) / 100 : 0 };
}

/** 窗口口径（窗口优先，其次显式起止／天数；三样都没有＝`{}`，由视图模型给缺省 30 天）。 */
function pickRange(params: Record<string, unknown>): { days?: number; startDate?: string; endDate?: string } {
  const win = windowRange(params);
  if (win !== null) return { startDate: win.start, endDate: win.end };
  const startDate = optStr(params, 'startDate') ?? optStr(params, 'start');
  const endDate = optStr(params, 'endDate') ?? optStr(params, 'end');
  if (startDate && endDate) return { startDate, endDate };
  if (startDate) return { startDate };
  const days = optNum(params, 'days');
  return days === undefined ? {} : { days };
}

/** 空窗时的区间串：口径与 `records.ts:98`／`:103`／`:108` 同形。空窗那一路库里只把区间写进
 *  报错话术、不给结构值，故这里按同形重算一次；非空窗一律用库里给的 `range`。 */
function rangeLabelOf(opts: { days?: number; startDate?: string; endDate?: string }): string {
  const { days = 30, startDate, endDate } = opts;
  if (startDate && endDate) return startDate === endDate ? startDate : startDate + ' ~ ' + endDate;
  if (startDate) return startDate;
  return '最近' + days + '天';
}

/** 复制日志第 3 段：渲染本页的命令原文（参数逐字用本次实际收到的那一份，照抄能重跑）。 */
function renderCommandOf(params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + CMD_KEY
    + (Object.keys(params).length === 0 ? '' : " --params '" + JSON.stringify(params) + "'");
}

/** `calorie.view.weight-history` · 体重明细／曲线（窗口优先，其次显式起止／天数，缺省 30 天）。 */
export function viewWeightHistory(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const overlayRaw = optStr(params, 'overlay');
  if (overlayRaw !== undefined && !isOverlay(overlayRaw)) {
    throw new CalorieRenderError('bad-input', 'overlay 只许 target／milestone／anomaly');
  }
  const overlay = overlayRaw as HistoryOverlay | undefined;
  const noteOnly = params['noteOnly'] === true;
  const picked = pickRange(params);
  let h: WeightHistoryView;
  try {
    h = buildWeightHistoryView(db, picked);
  } catch (e) {
    // 数据型空窗：本窗一条记录都没有 ⇒ 照 §5.6／§5.7 出**完整页**（空态句＋KPI 空徽章＋结论＋
    // 页脚来源行），不回到老技能那种 `display:none` 静默，也不像上一版那样整页不落盘。
    // 筛选型空窗（`noteOnly` 且一条都没带备注）仍走缺失阻断：用例与 smoke 登记册钉死 exit 4。
    if (noteOnly || !(e instanceof CalorieRenderError) || e.code !== 'missing-data') throw e;
    h = { range: rangeLabelOf(picked), rows: [], change: null };
  }
  if (noteOnly) {
    const kept = h.rows.filter((r) => r.note !== null && r.note !== undefined && String(r.note).trim() !== '');
    if (kept.length === 0) throw new CalorieRenderError('missing-data', '本窗无带备注的体重记录');
    h = { range: h.range, rows: kept, change: changeOf(kept) };
  }
  const extra: HistoryDocExtra = {
    overlay,
    noteOnly: noteOnly || undefined,
    command: renderCommandOf(params),
  };
  if (overlay === 'target') {
    const goalKg = getWeightGoalValue(db);
    const last = h.rows.length > 0 ? (h.rows[0] as (typeof h.rows)[number]).weight_kg : null;
    extra.goal = goalKg === null ? null : { kg: goalKg, diffKg: last === null ? null : round1(last - goalKg) };
  }
  if (overlay === 'milestone') {
    const hits: Array<{ label: string; date: string; kg: number }> = [];
    const miss: string[] = [];
    for (const delta of MILESTONE_KG) {
      try {
        const r = scenarioE3(db, delta);
        // 数字与单位留一个空格（#480 口径 3.3）；同一份标签在对比族由 `weightCompare2.ts:154` 生成，口径另报。
        hits.push({ label: '减重 ' + delta + ' kg 那天', date: r.segA.range, kg: r.segA.avg as number });
      } catch (e) {
        miss.push('减重 ' + delta + ' kg 未达成' + (e instanceof FetchError ? '（' + e.message + '）' : ''));
      }
    }
    extra.milestones = hits;
    extra.milestoneMiss = miss;
  }
  if (overlay === 'anomaly') {
    const scan = anomaliesOf(db, h);
    extra.anomalies = scan.list;
    if (scan.note !== null) extra.anomalyNote = scan.note;
  }
  const avg = avgOf(h.rows);
  const metrics = metricsOf({
    rows: h.rows.length,
    spanDays: h.change?.spanDays, first: h.change?.first, last: h.change?.last,
    delta: h.change?.delta, dailyAvg: h.change?.dailyAvg, avg: avg ?? undefined,
    goalKg: extra.goal?.kg, goalDiffKg: extra.goal?.diffKg ?? undefined,
    milestoneCount: extra.milestones !== undefined ? extra.milestones.length : undefined,
    anomalyCount: extra.anomalies !== undefined ? extra.anomalies.length : undefined,
    noteCount: noteOnly ? h.rows.length : undefined,
  });
  return { data: { metrics }, html: buildWeightHistoryDoc(h, extra) };
}

/** 异常点扫描（走波动分析的公开接口）：点列表 ＋ 无点时那句口径（基线／黄红阈值）。 */
function anomaliesOf(db: DatabaseSync, h: WeightHistoryView): {
  list: Array<{ date: string; kg: number; deviationKg: number; level: string }>;
  note: string | null;
} {
  if (h.rows.length < 2) return { list: [], note: null };
  const latest = (h.rows[0] as (typeof h.rows)[number]).date;
  const earliest = (h.rows[h.rows.length - 1] as (typeof h.rows)[number]).date;
  const start = earliest <= latest ? earliest : latest;
  const end = earliest <= latest ? latest : earliest;
  try {
    const res = weightVolatilityV2(db, start, end, 'rolling');
    if (res.status !== 'ok' || !res.data) return { list: [], note: null };
    return {
      list: res.data.recentAnomalies.map((p) => ({ date: p.date, kg: p.kg, deviationKg: p.deviationKg, level: p.level })),
      // #480 口径 3.2：术语表把「基线／黄线／红线」换成人话「平均线／注意线／警戒线」，数字与单位留空格。
      note: '平均线 ' + res.data.baselineValue + ' kg，注意线 ±' + res.data.thresholds.yellow + ' kg，警戒线 ±'
        + res.data.thresholds.red + ' kg',
    };
  } catch {
    return { list: [], note: null };
  }
}

/* ── 视图模型（#332 自 `plate.ts` 原样迁入：历史＝fetch/weight.getWeightHistory） ── */

export function buildWeightHistoryView(
  db: DatabaseSync,
  opts: { days?: number; startDate?: string; endDate?: string } = {},
): WeightHistoryView {
  const { days = 30, startDate, endDate } = opts;
  try {
    if (startDate && endDate) {
      assertRange(startDate, endDate);
      const h = getWeightHistory(db, { startDate, endDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (startDate && !endDate) {
      assertDate(startDate);
      const h = getWeightHistory(db, { startDate });
      return { range: h.range, rows: h.rows, change: h.change };
    }
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new CalorieRenderError('bad-input', 'days 须为 1..365 整数');
    }
    const h = getWeightHistory(db, { days });
    return { range: h.range, rows: h.rows, change: h.change };
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    if (e instanceof FetchError) throw new CalorieRenderError('missing-data', e.message);
    throw e;
  }
}

/* ── 曲线计划（#333 融合：量程／标注／单点三样一处算，装配与图例共用同一份判断） ── */

/** 最小跨度（kg）：波动不足此数即对称展开，小波动不会被画成断崖。 */
const MIN_SPAN_KG = 0.4;

interface MarkLinePlan {
  readonly value?: number;
  readonly xValue?: number | string;
  readonly label?: string;
}

interface CurvePlan {
  /** 升序记录（图与图例同一份）。 */
  readonly asc: WeightHistory['rows'];
  readonly yMin: number;
  readonly yMax: number;
  readonly yTicks: number;
  readonly markLine?: MarkLinePlan;
  readonly targetInRange: boolean;
  readonly milestoneInWindow?: { label: string; date: string; kg: number };
  readonly anomalyDates: Set<string>;
}

/** 老技能「好看量程」（`weight_history.html:220-237` 数据驱动＋V2.4 不为目标扩张）：
 *  边界与步长都落在 0.1 的整数倍，最小跨度 0.4kg，刻度条数在 4~6 里取一个把跨度整除的。 */
function niceRange(values: readonly number[]): { yMin: number; yMax: number; yTicks: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  let lo = min;
  let hi = max;
  if (hi - lo < MIN_SPAN_KG) {
    const mid = (lo + hi) / 2;
    lo = mid - MIN_SPAN_KG / 2;
    hi = mid + MIN_SPAN_KG / 2;
  }
  const pad = Math.max(0.1, (hi - lo) * 0.1);
  const yMin = Math.floor((lo - pad) * 10) / 10;
  let yMax = Math.ceil((hi + pad) * 10) / 10;
  let tenths = Math.round((yMax - yMin) * 10);
  while (tenths < 4) { yMax = round1(yMax + 0.1); tenths += 1; }
  while (tenths % 5 !== 0 && tenths % 4 !== 0 && tenths % 3 !== 0) { yMax = round1(yMax + 0.1); tenths += 1; }
  const steps = [5, 4, 3].find((k) => tenths % k === 0) ?? 4;
  return { yMin, yMax, yTicks: steps + 1 };
}

/** 0／1／N 三态同一个守卫：0 条返 null（空态句由装配层出）。 */
function curvePlanOf(h: WeightHistoryView, extra: HistoryDocExtra): CurvePlan | null {
  if (h.rows.length === 0) return null;
  const asc = [...h.rows].reverse();
  const { yMin, yMax, yTicks } = niceRange(asc.map((r) => r.weight_kg));
  const goal = extra.goal?.kg ?? null;
  const targetInRange = goal !== null && goal >= yMin && goal <= yMax;
  const milestoneInWindow = (extra.milestones ?? []).find((m) => asc.some((r) => r.date === m.date));
  const last = (asc[asc.length - 1] as (typeof asc)[number]).weight_kg;
  const kind = extra.overlay;
  const markLine: MarkLinePlan | undefined = kind === 'target' && goal !== null && targetInRange
    ? { value: goal, label: '目标 ' + goal + ' kg' }
    : kind === 'milestone' && milestoneInWindow !== undefined
      ? { xValue: milestoneInWindow.date.slice(5), label: milestoneInWindow.label + ' ' + milestoneInWindow.kg + ' kg' }
      /* 单点：单点标记之外再给一条均值线（该点自身的均值），曲线不再是一个孤点无名。 */
      : asc.length === 1 ? { value: last, label: '均值 ' + last + ' kg' } : undefined;
  return {
    asc, yMin, yMax, yTicks, markLine, targetInRange, milestoneInWindow,
    anomalyDates: new Set((extra.anomalies ?? []).map((a) => a.date)),
  };
}

/* ── 整页装配（#332 自 `plateDocs.ts` 原样迁入：weight_history.html 对照） ── */

/* #542（#340 打回批）：`modeBadge` 退场 —— 页头副标题整行撤掉后，「模式：…」这组实现变体名
 * 不再上屏（变体的信息各有去处，见装配处注释）。函数删掉，不留死代码。 */

function fourthKpi(h: WeightHistoryView, extra: HistoryDocExtra): KpiCard {
  if (extra.overlay === 'target') {
    const goal = extra.goal;
    if (goal === null || goal === undefined) {
      // 值槽只放数：空态不把「未设目标」四个字当大数字，判断词进 `detail` 与徽章；
      // #502：副说明原用 `·` 串「未设目标 · 说「定体重目标」后可叠目标线」⇒ 改说人话一句（不再靠标点分层）。
      return { label: '目标', value: '—', detail: '还没定体重目标，说「定体重目标」就能在这张图上叠一条目标线', status: 'empty', statusText: '未设目标' };
    }
    const d = goal.diffKg;
    if (d === null) {
      // 本窗没有记录 ⇒ 没有「距目标」可算：给空态句，不打印 `null kg`；
      // #502：目标数已住在图例那一行，卡片不再复述（删的是重复，不是事实）。
      return { label: '目标', value: '—', detail: '本窗没有记录，没法比', status: 'empty', statusText: '本窗无记录' };
    }
    return {
      // #480 缺陷 7：值槽原写 `+2.4 kg`（正号会被读成「涨了」）⇒ 说人话，差多少／低多少／已到。
      // #502：副说明原写「目标 68 kg」（与图例逐字重复）⇒ 撤走；值槽 ＋ 徽章一个说差数、一个说成没成。
      label: '距目标',
      value: d > 0 ? '还差 ' + d + ' kg' : d < 0 ? '已低于目标 ' + Math.abs(d) + ' kg' : '已达目标',
      // #480：徽章不复述值槽的差数（值槽 ＋ 徽章两处说同一件事时删一处）。
      status: d > 0 ? 'warn' : 'ok', statusText: d > 0 ? '未达目标' : '已达目标',
    };
  }
  if (extra.overlay === 'milestone') {
    const n = extra.milestones?.length ?? 0;
    // #480 缺陷 4：副说明不再用「门槛 … 两档 · 已达成 N 个」的工程句（末字「kg／」还悬空），
    // 说人话「减重 5 kg、10 kg 两个里程碑都达到了」；徽章不复述值槽的「N 个」，只说成没成。
    // #502：没达成那一路原把两档失败原因用「；」串进括号（机器话），改成读者话一句；两档各自的
    // 原因逐条住在图例的「里程碑未达成」那一行里（`milestoneMiss` 仍原样进那一行，事实不丢）。
    // #510（审查席 S3：顿号漏网）：两档里程碑原来用 `、` 串在卡副说明这一槽里（`减重 5 kg、10 kg
    // 两个里程碑…`）——副说明吃纯文本、形状落不进去，故照审查单的第二种改法**改写成一句话**（用「与」）。
    const two = MILESTONE_KG.join(' kg 与 ') + ' kg';
    const detail = n > 0
      ? '减重 ' + two + ' 两个里程碑都达到了'
      : '减重 ' + two + ' 两个里程碑还没达到';
    return { label: '里程碑', value: String(n), unit: '个', detail, status: n > 0 ? 'ok' : 'empty', statusText: n > 0 ? '已达成' : '未达成' };
  }
  if (extra.overlay === 'anomaly') {
    const n = extra.anomalies?.length ?? 0;
    // #480 缺陷 5：副说明原把整张清单抄一遍（长到被换行截断）⇒ 只按头三天说一句形态；
    // 徽章原写「异常 N 个」与值槽的「N 个」同说一件事 ⇒ 只说高低。
    // #502：无异常那一路原把三档口径括在副说明里（与图例下方的脚注同说一件事）⇒ 副说明只说结论，
    // 口径统一住脚注（`anomalyNoteOf`），一处说一次。
    const detail = n > 0
      ? anomalyHeadHuman(extra.anomalies as Array<{ date: string; kg: number }>)
      : '本窗没有异常点，波动都在正常范围里';
    return { label: '异常点', value: String(n) + ' 个', detail, status: n > 0 ? 'warn' : 'ok', statusText: n > 0 ? '偏高' : '无异常' };
  }
  const tags = tagDist(h.rows);
  const n = Object.keys(tags).length;
  if (extra.noteOnly) {
    // #480：徽章不复述筛选态，改印标签类数。#542：页头副标题撤掉后，「只取有备注的」住页脚来源行。
    // #480 缺陷 2：副说明原与徽章逐字同为「标签 N 类」⇒ 删副说明，只留徽章。
    return {
      label: '有备注', value: h.rows.length + ' 条',
      status: 'ok', statusText: n > 0 ? '标签 ' + n + ' 类' : '有备注',
    };
  }
  const noted = h.rows.filter((r) => r.note && String(r.note).trim() !== '').length;
  // #480 缺陷 2：同上——备注卡的副说明与徽章逐字重复，删副说明。
  return {
    label: '备注', value: noted + ' 条',
    status: noted > 0 ? 'ok' : 'empty', statusText: noted > 0 ? '标签 ' + n + ' 类' : '无备注',
  };
}

function kpiCards(h: WeightHistoryView, extra: HistoryDocExtra, avg: number | null): KpiCard[] {
  const c = h.change;
  return [
    /* 值槽只放「本窗条数」这一个数：区间串（`2026-08-09 ~ 2026-09-07`，23 字）在 28px 且
     * `overflow-wrap: anywhere` 的值槽里会被断成 2~3 行，是四张卡不等高的直接成因（t154 用户读数）。
     * 区间挪进 `detail`（副说明行）——页题 `<h1>` 与页脚来源行各还有一份，信息不丢（#480 先删副标题
     * 里的窗口串，#542 把副标题整行撤掉：页头、表注、页脚三处已够）。
     * #502：副说明只留区间串本身（原写「本窗 …」——「本窗」是范围词、与本卡标签同义），
     * 天数与「区间 → 区间」的形状另住 `windowFactStrip()` 那条事实条。 */
    {
      label: '体重历史', value: String(h.rows.length), unit: '条',
      /* #510 同屏事实收敛（审查席 S2 第一类：窗口串一屏三处）：区间串原来同时住在页题（`体重历史
       * 2026-08-09 ~ 2026-09-07`）、本卡副说明与页顶窗口条三处 ⇒ **页题与页脚来源行留着，本槽撤掉**
       * （窗口条已经把这一段做成了形状：两枚日期块 ＋ 天数胶囊）。卡内只留条数这一个数。
       * 徽章原来印「共 N 条」——与值槽的「N 条」是同一个数，同卡两槽说一件事 ⇒ 换状态词。 */
      status: h.rows.length >= 2 ? 'ok' : 'empty',
      statusText: h.rows.length >= 2 ? '记录足够' : h.rows.length === 1 ? '只有一条' : '本窗无记录',
    },
    {
      label: '变化',
      value: c ? signedKg(c.delta) : '—',
      // #480 口径 3.2：日均速率改说人话「每天 +10 克」；持平与单点不编速率句。
      // #480 缺陷 3：单点页的副说明原与徽章逐字同为「单点无变化」⇒ 副说明改说人话那句。
      // #502：原写「30 天 · 每天 +10 克」——一个 `·` 把跨度与速率两件事串起来。
      // #510：速率与页顶那条事实条的「节奏」是同一条 ⇒ 只在**形状那一处**说（卡副说明留给
      // 「算不出」与「没有变化」这两档——那是卡片自己的状态，形状条不报），卡内不再印第二遍。
      detail: c === null
        ? '只有 1 天记录，没法算变化'
        : c.delta === 0
          ? c.spanDays + ' 天里没有变化'
          : undefined,
      status: c === null ? 'empty' : c.delta < 0 ? 'ok' : c.delta > 0 ? 'warn' : 'empty',
      statusText: c === null ? '看不出变化' : c.delta < 0 ? '下降' : c.delta > 0 ? '上升' : '持平',
    },
    {
      label: '均值', value: avg === null ? '—' : String(avg) + ' kg',
      // #480 缺陷 3：单点页的副说明原写「单点无均值对照」，与徽章同说一件事 ⇒ 单点时不给副说明。
      // #502：首日与末日的对照从本卡副说明撤走，改住 `pairStrip()` 那条形状（中间一个箭头，
      // 两端各是一枚加粗值），卡片只留均值这一个数。
      status: h.rows.length >= 2 ? 'ok' : 'empty',
      statusText: h.rows.length >= 2 ? '首日 → 末日' : '无对照',
    },
    fourthKpi(h, extra),
  ];
}

function tagDist(rows: WeightHistory['rows']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const t = noteTag(r.note);
    if (!t) continue;
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

/** 结论句（#333 融合：与 `compare.ts` 情景版同形——同一句话进 `renderDisclosure` 折叠区；
 *  正文不再自带「结论：」前缀，页内「结论」两个字只出现在折叠区标题那一处）。
 *
 *  #480：一长句塞满「首／末／变化／日均／均值／里程碑／异常点／缺口」读不动 ⇒ 这里**只留一句结论**
 *  （窗口 ＋ 条数 ＋ 这段的净变化／单点口径）。
 *  #502：这句话由 `verdict()` 落成判语块（15px 加粗那一档），形状与全族一致。
 *
 *  #510 同屏事实收敛（审查席 S2 第三类：关键数字一屏三处）：本句原来把「累计涨了 0.3 kg」写成
 *  带数与方向的整句——那个数住在「变化」卡的值槽、那个方向住在它的徽章里，判语块是同一屏第三处。
 *  现在判语块只说**这一段怎么样**（挪动算不算大，0.5kg／1.5kg 两档口径）：不给数、不给方向词、
 *  也不再复述窗口串（窗口条已经把它做成形状）。 */
function conclusionOf(h: WeightHistoryView): string {
  if (h.rows.length === 0) return '本窗没有体重记录，先记一条再看。';
  if (h.change === null) return '这一段的记录还太少，看不出变化。再记一条就能比较。';
  const c = h.change;
  if (c.delta === 0) return '这一段的读数首尾一样，是平的。';
  const abs = Math.abs(c.delta);
  if (abs < 0.5) return '这一段的读数基本在一个水平上来回，日常波动就能解释。';
  if (abs < 1.5) return '这一段的挪动比日常波动大一些，再记一两周更看得清。';
  return '这一段挪动的幅度不小，值得留意。';
}

/** 复制载荷的逐条行（日期／时间／体重／BMI／备注）：`text` 每行一条、`json` 结构、`csv` 可导入。
 *  空值保留原始空串／`null`（`—` 只是表格里的可见占位，不写进载荷——空值不当真值，见 `t395-融合基准.md` 裁定 2）。 */
function copyRowsOf(rows: WeightHistory['rows']): Array<Record<string, string | number | null>> {
  return rows.map((r) => ({ 日期: r.date, 时间: r.time ?? '', 体重kg: r.weight_kg, BMI: r.bmi ?? null, 备注: r.note ?? '' }));
}

/** 复制日志第 3 段的那句话（裁定 F）：日志是**机器面**，照旧写库文件名与表名（§5.5：哪张库／哪张表／
 *  哪个窗口／多少条），照抄能重跑；页脚是**人面**，同一件事只说人话（见 `sourceLine`，两句**分开**住）。 */
function sourceTextOf(h: WeightHistoryView, extra: HistoryDocExtra): string {
  return '体重记录（' + DB_FILENAME + ' · weight_log） ｜ 窗口 ' + h.range + ' ｜ 共 ' + h.rows.length + ' 条'
    + (extra.noteOnly ? '（只取有备注的）' : '');
}

/** 页脚数据来源行（§5.5：哪个窗口／多少条；窗内有缺口时同一行补一句口径）。
 *  形态走公共层 #420 的浅色口径行 `renderCaliberLine`（12px `--fg2`）：页脚的来源是「口径行」，
 *  不是需要注意的提示，故不用深色 toast 卡（#340 裁定）；原 toast 的「标题 ＋ detail」两行合成这一句。
 *  #480 裁定 F：句式与全族统一（`口径.md` §3.1）——三段用 `｜` 分、末段恒为「共 N 条」；
 *  **库表名退出可见面**（`calorie_data.db`／`weight_log` 在页脚不再出现，只在复制日志第 3 段留着）。 */
function sourceLine(h: WeightHistoryView, extra: HistoryDocExtra): string {
  const gap = gapNoteOf(h, extra);
  return renderCaliberLine('📊 数据来源：体重记录 ｜ 窗口 ' + h.range
    + ' ｜ 共 ' + h.rows.length + ' 条'
    + (extra.noteOnly ? '（只取有备注的）' : '')
    + (gap === null ? '' : ' ｜ ' + gap));
}

/** 窗内缺口（§3 第 15 条：缺多少天要写清；缺值按断点画、不补 0）。给了区间串才数得出来。 */
function gapNoteOf(h: WeightHistoryView, extra: HistoryDocExtra): string | null {
  if (h.rows.length === 0) return '本窗没有记录，不补默认值，也不拿别的窗口顶';
  if (extra.noteOnly) return null; // 筛选后的条数与窗口天数不可比
  const span = windowDaysOf(h.range);
  if (span === null || h.rows.length >= span) return null;
  return '缺 ' + (span - h.rows.length) + ' 天没记（缺的那几天不补 0）';
}

/** 区间串 → 天数：`2026-09-01`／`2026-09-01 ~ 2026-09-07`／`最近30天` 三种形态。 */
function windowDaysOf(range: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?: ~ (\d{4}-\d{2}-\d{2}))?$/.exec(range);
  if (m !== null) {
    const a = Date.parse(m[1] + 'T00:00:00Z');
    const b = Date.parse((m[2] ?? m[1]) + 'T00:00:00Z');
    return Math.round((b - a) / 86400000) + 1;
  }
  const d = /^最近(\d+)天$/.exec(range);
  return d === null ? null : Number(d[1]);
}

export function buildWeightHistoryDoc(h: WeightHistoryView, extra: HistoryDocExtra = {}): string {
  const avg = avgOf(h.rows);
  const parts: string[] = [weightUiCss()];
  // 窗口事实（区间 ＋ 天数）：原串在「体重历史」卡副说明的那句话里，本轮提成 `windowStrip()` 的形状，
  // 放页顶——读者第一眼就知道这一页覆盖哪一段（条数由下面那张卡的值槽与徽章说）。
  parts.push(windowFactStrip(h));
  // 样本不足不拒绝渲染：页顶一条软横幅写清「几条、门槛几条、为什么仍可看」
  // （位置照老实物 `weight_compare.html:79` 的 `.warn-banner`：副标题之下、KPI 之上）。
  if (h.rows.length === 1) {
    parts.push(notice({
      icon: 'warn',
      // #510：首行不再印「本窗只有 N 条」那个数——它住在下面「体重历史」卡的值槽与表题里，
      // 同一屏三处（审查席 ★ 条数项）。提示块说「够不够」，条数说在卡片那一处。
      msg: '本窗记录太少（比较变化要 2 条以上）',
      // #502：原句「…；再记一条就能比首日和末日。」是拿 `；` 把「为什么仍可看」与「下一手」两件事
      // 串成一句 ⇒ 改成两句人话，「几天、几条」也不在这句里再说一遍（提示的第一行与下面两张卡各有一处）；
      // 并列的两条前提另起一条 `bulletList()`（原来也串在同一句里）。
      detail: '看不出变化，页照常出，表里的数值照读。',
    }));
    /* #510（审查席 S2 第三类：关键数字一屏三处）：逐条那两行原来各自再报一遍「本窗只有 1 条」——
     * 那个数住在提示块第一行与「体重历史」卡的值槽里，同一屏已经两处 ⇒ 逐条只说**为什么看不出**
     * （门槛几条、要看什么），不再复述本窗条数。 */
    parts.push(bulletList([
      '比较变化至少要 2 条记录，本窗看不出涨还是降',
      '再记一条就能比出首日和末日的差',
    ]));
  }
  parts.push(renderKpiGrid(kpiCards(h, extra, avg)));
  // 节奏（每天涨／降多少克）与首末两头：两件形状，各占一枚「标签 ＋ 值」。
  parts.push(progressStrips(h, avg));
  const plan = curvePlanOf(h, extra);
  let charts = false;
  if (plan === null) {
    // 0 条：空态句留位（不许像老技能那样 `display:none` 静默隐藏图表区；本页照常落盘成完整一页）。
    parts.push(renderEmptyBlock({
      title: '体重曲线',
      text: '本窗无体重记录（' + h.range + '）',
      hint: '说「记体重」记一条，曲线就有第一个点。本页不编默认值，也不拿别的窗口顶。',
    }));
  } else {
    parts.push(renderChartBlock({
      kind: 'line',
      title: '体重曲线',
      input: {
        items: plan.asc.map((r) => ({
          label: r.date.slice(5), value: r.weight_kg,
          ...(extra.overlay === 'anomaly' && plan.anomalyDates.has(r.date) ? { anomaly: true } : {}),
        })),
        options: {
          height: 300,
          format: (v: number) => round1(v) + ' kg',
          labels: 'select',
          yTicks: plan.yTicks,
          yMin: plan.yMin,
          yMax: plan.yMax,
          highlightLast: true,
          ...(plan.asc.length >= 2 ? { avgLine: 7 } : { markPoint: true as const }),
          ...(plan.markLine === undefined ? {} : { markLine: plan.markLine }),
        },
      },
    }));
    charts = true;
    parts.push(renderListRows({ items: legendRows(h, extra, plan), emptyText: '无图例' }));
    // 异常点那页的判据脚注（裸名：`note()` 与上下文里的「备注」重名，本页 import 时已改名 `wnote`）。
    if (extra.overlay === 'anomaly') parts.push(anomalyNoteOf(extra));
  }
  const tables = segmentTables(h, extra);
  for (const t of tables) parts.push(t);
  // 备注标签也走列表行区块，空时同样有一句（不许「没标签就整块不出现」）。
  // 标签名进 `main`（宽列）——`left` 只有 44px，是给 ▲／▼／— 这类标记用的，4 字标签塞进去会被挤成两行。
  // **不给 `left`**：组件会给这一行加 `-no-left` 修饰类、那一列不占位（#154 加的形态）。
  const tags = tagDist(h.rows);
  parts.push(renderListRows({
    items: Object.entries(tags).map(([k, v]) => ({ main: k, right: String(v) + ' 条' })),
    emptyText: '无备注标签',
  }));
  // #502：结论块正文走 `verdict()`（一句话判语，形状与全族的判语块一致）。
  // 原与目标卡／图例逐字重复的目标小标签、以及复述卡片的里程碑／异常点小标签随本轮删——
  // 删的是重复（那几件事实各在距目标卡／图例／异常点卡上），不是删事实。
  parts.push(renderDisclosure({
    title: '结论',
    contentHtml: verdict(conclusionOf(h)),
    open: true,
  }));
  parts.push(sourceLine(h, extra));
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: CMD_KEY,
    data: { items: copyRowsOf(h.rows), total: h.rows.length },
  };
  parts.push(copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command: extra.command ?? 'calorie-cmd-read ' + CMD_KEY,
        source: sourceTextOf(h, extra),
        actionAt: nowStamp(),
        version: DOC_VERSION,
      }),
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    /* #510：页题原来写「体重历史 ＋ 区间串」，与页顶窗口条、KPI 卡副说明同说一件事（审查席实测
     * 一屏三处）⇒ 页题只留名字，**窗口串归页顶那条窗口条**（形状件，两枚日期块 ＋ 天数胶囊）。 */
    title: '体重历史',
    eyebrow: '',
    // #542（#340 打回批）：副标题整行撤——「模式：明细／曲线」是实现变体的名字，读者要的是图和表本身；
    // 四个变体的信息各有去处：目标线／里程碑／异常点住图例行，「只取有备注的」住页脚来源行。
    // 传空串即整段省略（`assembleDocPage` 遇空不写该元素；同 `eyebrow: ''` 的既有口径）。
    subtitle: '',
    content: parts.join(''),
    charts,
  });
}

function legendRows(h: WeightHistoryView, extra: HistoryDocExtra, plan: CurvePlan): Array<{ left?: string; main: string; right?: string }> {
  // #480：图例只说「图上那条线是什么」，不念实现细节（「按 7 点现算」「量程外，改画文字」都删）；
  // 窗口串不再重印（页题／表注／页脚各有一份）。最高／最低仍在图上，画了就该读得到。
  const rows: Array<{ left?: string; main: string; right?: string }> = [
    // #480 缺陷 12：颜色词不上说明行——异常点那一页首行改说「异常点是什么」（比平均线高的那几天），
    // 不再写「偏红的点＝异常点」（颜色是表现，读者要的是口径）。
    extra.overlay === 'anomaly'
      ? { left: '- -', main: '异常点', right: '比平均线高的那几天' }
      : { left: '—', main: '体重曲线' },
  ];
  const asc = plan.asc;
  const top = asc.reduce((a, b) => (b.weight_kg > a.weight_kg ? b : a));
  const low = asc.reduce((a, b) => (b.weight_kg < a.weight_kg ? b : a));
  if (top.weight_kg !== low.weight_kg) {
    rows.push({ left: '▲', main: '最高 ' + top.weight_kg + ' kg', right: top.date });
    rows.push({ left: '▼', main: '最低 ' + low.weight_kg + ' kg', right: low.date });
  }
  if (asc.length >= 2) {
    // 图上叠的那条**灰色斜虚线**就是它（引擎 `avgLine` 追加的均线序列 `charts.ts:816`）：
    // 图例点名「灰色虚线」，免得跟目标线／里程碑竖线混起来（§2 第 1 条：不许有画了但读不到的线）。
    const win = Math.max(3, Math.min(asc.length, 7));
    rows.push({ left: '– –', main: win >= 7 ? '均线（最近 7 天）' : '均线（最近 ' + win + ' 天）', right: '图上那条灰色虚线' });
  }
  // #502：`main` 那列窄（44px 左列 ＋ 右列都占位时），原句「本窗只有 1 条记录，图上只有这一个点」
  // 在手机端被 `ellipsis` 截成「这一…」——把重复的半句去掉（「只有 1 条记录」卡片徽章已说）。
  if (asc.length === 1) rows.push({ left: '·', main: '这一个点', right: '本窗唯一的一点' });
  if (extra.overlay === 'target' && extra.goal !== null && extra.goal !== undefined) {
    const goal = extra.goal;
    // #480 缺陷 11：图上没画（在量程外）时，把「还差多少」写进图例——图上读不到，图例就得说清；
    // 画得下的那一支不重复（「还差」在值槽与结论标签里各有一处）。「超过图的取值范围」换成读者话「画不下」。
    const diff = goal.diffKg;
    rows.push({
      left: '- -', main: '目标线',
      right: '目标 ' + goal.kg + ' kg'
        + (plan.targetInRange ? '' : (diff === null || diff <= 0 ? '' : '，还差 ' + diff + ' kg') + '（图上画不下，没画）'),
    });
  }
  if (extra.overlay === 'milestone') {
    for (const m of extra.milestones ?? []) {
      const inWindow = plan.milestoneInWindow !== undefined && plan.milestoneInWindow.date === m.date;
      // #480 缺陷 10：日期与体重之间用顿号（原空格并列读成「日期 体重」），窗外的说「不在这段时间里」。
      rows.push({ left: '◆', main: m.label, right: m.date + '，' + m.kg + ' kg' + (inWindow ? '' : '（不在这段时间里）') });
    }
    if ((extra.milestones ?? []).length === 0) rows.push({ left: '◇', main: '里程碑未达成', right: (extra.milestoneMiss ?? []).join('，') || '继续记录' });
  }
  if (extra.overlay === 'anomaly') {
    const list = extra.anomalies ?? [];
    if (list.length > 0) {
      // 值最多 5 行：再长的清单交给下方的逐日明细表（图上那几个点本来也看得到）。
      const cap = 5;
      for (const a of list.slice(0, cap)) {
        rows.push({ left: '▲', main: '异常点 ' + a.date, right: deviationHuman(a.kg, a.deviationKg) });
      }
      if (list.length > cap) rows.push({ left: '…', main: '还有 ' + (list.length - cap) + ' 个异常点', right: '见下方明细表' });
    } else {
      rows.push({ left: '△', main: '本窗无异常点', right: extra.anomalyNote ?? '波动在正常范围里' });
    }
  }
  return rows;
}

/** 明细表包一层折叠区（用户反馈 #502）：标题点按展开／收起，默认收起，
 *  长表（90／180／365 天）不再把底部按钮顶到几屏外。
 *  标题收进折叠区后不再另出 `caption`（同一句话不说两遍），也顺带消掉 `caption`
 *  在 390 档的内层横滚（探针实测 caption 右缘 393＞视口 390，页级 SW 仍 390）。
 *  形状走共享 `renderDisclosure`（原生 details／summary，触摸目标 44px 已有），本族不另造折叠件。 */
function detailTable(title: string, tableHtml: string): string {
  return renderDisclosure({ title, contentHtml: tableHtml });
}

function segmentTables(h: WeightHistoryView, extra: HistoryDocExtra): string[] {
  const cols: DataTableColumn[] = [
    { key: 'date', label: '日期' },
    { key: 'time', label: '时间' },
    { key: 'kg', label: '体重', align: 'right' },
    { key: 'bmi', label: 'BMI', align: 'right' },
    { key: 'note', label: '备注' },
  ];
  // 可见文本的空值一律 `—`（`t395-融合基准.md` 裁定 2）；复制载荷那边保留原始空值。
  const toRow = (r: (typeof h.rows)[number]) => ({
    date: r.date, time: r.time ?? '—', kg: r.weight_kg,
    bmi: r.bmi === null || r.bmi === undefined ? '—' : r.bmi,
    note: r.note && String(r.note).trim() !== '' ? r.note : '—',
  });
  // #480：表注不再重印窗口串与「·有备注」——窗口串页题／副标题／页脚共 3 处已够（页内窗口串**只留 1 处**，
  // 见用例 `窗口区间串在可见文本里只出现 1 次`），「有备注」由页头副标题与第四张卡各说一次。
  if (h.rows.length > 30) {
    const head = h.rows.slice(0, 30);
    const tail = h.rows.slice(30);
    return [
      detailTable(
        // #480 缺陷 8：说清这张表是**截过**的（「最近 30 条」会被读成「一共就是这些」）。
        '体重明细（只列最近 30 条）',
        renderDataTable({
          columns: cols,
          rows: head.map(toRow),
          emptyText: '本窗无体重记录',
        }),
      ),
      detailTable(
        // #480 缺陷 9：「其余」是对着上表算出来的说法，改成读者话「更早的」。
        '体重明细（更早的 ' + tail.length + ' 条）',
        renderDataTable({
          columns: cols,
          rows: tail.map(toRow),
          emptyText: '无更多记录',
        }),
      ),
    ];
  }
  return [detailTable(
    // #480 缺陷 13：页题已有「体重历史」，表标题不再把同一句话再说一遍 ⇒ 说「明细记录」。
    '明细记录（共 ' + h.rows.length + ' 条）',
    renderDataTable({
      columns: cols,
      rows: h.rows.map(toRow),
      emptyText: '本窗无体重记录',
    }),
  )];
}
