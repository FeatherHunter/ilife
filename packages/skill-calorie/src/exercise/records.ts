/** 运动记录（HELP 场景 04「运动」下一级 · 看运动）：`calorie.view.exercise-records` 读命令——记录级明细页族。
 *
 * #342 建（老技能 `render_exercise_summary.py --mode records` ＋ `--today`／`--yesterday`／
 * `--has-note`／`--category 力量|有氧`）；#451 换融合版式（地图 #156 页面族第 2 票，形状照 #423）：
 * 八列明细表（日期／类型／分类／时长／消耗／距离／心率／备注）＋ 截断明示（上限写进表标题，
 * 老技能静默截断 50 条是反面样板）＋ 三条筛选口径句（走 `renderCaliberLine`）＋ 页头人话 ＋
 * 来源脚注（#523 起改走 `sportUi.factStrip()`，见下）＋ 页内导航 ＋ 可打印（走 #448 的
 * `assembleDocPage({printable:true})` 透传位，不做装配后字符串手术）＋ 三格式复制
 * （既有 `shared/copyArea.ts`）＋ 空态带下一句话（`shared/emptyGuide.ts`）。
 * 取数不改口径：窗口与行源仍走 `render/exercisePort.ts` 的 `listPortRows`（窗内全部行，软删除已排除；
 * 分类口径＝库内实填优先、缺失回退推断，与力量／有氧总览同口径）。
 *
 * 本族不接四态头与变更卡载具（器件归类，不是漏做）：`shared/operationHead.ts` 的三张表是**写操作**四态
 * （新增／修改／删除），#422 的待接线清单把它划给回执族（`docs/skills/skill-calorie/t422-融合共用件.md`
 * §七 表第 1 行）；本件是只读页，没有写操作，硬套会印出与事实不符的态标签。
 *
 * ── #523 三样债（分隔符／机器词／重复事实）＋ 手机端同档，本件落法 ──
 *   ① **分隔符**：可见文本零硬串分隔符（探针口径见 #508）。落点四处——
 *      · 眉标 `运动 · 记录级明细` → `运动记录明细`（类别＋页族两个字都在，只是不用 `·` 串）；
 *      · `<title>` 的品牌 `·` → 空格（照 #401 样板先例）；
 *      · 页脚来源行**不再走 `src/shared/sourceLine.ts`**（那件的 `·` 串是跨场景共用位，本族改用
 *        `sportUi.factStrip()` 的键值行承接；共用层口径统一归 **#470**，本票吸收其一角）；
 *      · 数字口径行里 `；` 串 → 一条事实一个 `renderCaliberLine`（单位那几条并排成胶囊行）。
 *   ② **机器词上屏**：来源名从库表名 `exercise_log` 改成读者看得懂的「运动记录」；数值走显示层取整。
 *   ③ **重复事实**：窗口只在窗口条一处、条数只在与它同一句里报一次。
 *   ④ **手机端同档**：页内形状件的 820 段＋触摸面住 `src/exercise/sportUi.ts`（正文首项放它的样式）。
 *
 * 对外 2 件（铁律五「不多于五个」）：
 *   ① `viewExerciseRecords`——读命令入口（窗口＋分类＋备注筛选）；
 *   ② `buildRecordsDoc`——整页装配（取数结果→完整文档）。
 */
import type { DatabaseSync } from 'node:sqlite';
import {
  renderCaliberLine, renderChips, renderDataTable, renderKpiGrid, renderParamForm, renderTocBlock,
} from 'base-paint/blocks';
import { listPortRows } from '../render/exercisePort.js';
import type { PortRow } from '../render/exercisePort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea } from '../shared/copyArea.js';
import { emptyGuide } from '../shared/emptyGuide.js';
import { capsStrip, exerciseUiCss, factStrip, fmtNum, windowStrip } from './sportUi.js';
import { defaultRange, fail, nums, optStr } from '../shared/params.js';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** 整页装配的版本与标题（与运动移植页同值域，不另起）。
 *  #523：品牌名里的 `·` 去掉——`·` 是分隔符债，`<title>` 也是可见文本。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里 运动记录';
/** 眉标与页内 H1（页头写人话：不出命令键、票号、工序词；判据读这两处原字）。
 *  #523：眉标 `运动 · 记录级明细` 的 `·` 去掉，类别与页族两个字都留着。 */
const EYEBROW = '运动记录明细';
const PAGE_TITLE = '运动记录明细';
/** 来源脚注里的来源名（读页自己的取数面）。#523：不再印库表名 `exercise_log`，
 *  改成读者看得懂的「运动记录」，未删除这一条取数口径留在复制日志的「来源」段里（机器面）。 */
const SOURCE = '运动记录（本窗内未删除的行）';
/** 复制区的场景标识：人话短名，不放命令键（产物里命令键命中必须为 0）。 */
const COPY_KEY = '运动记录';
/** 行数上限：老技能当年静默截断 50 条是反面样板，本页把上限写进表标题。 */
const ROW_LIMIT = 50;
/** 八列表头（逐字、逐序；按老实物 `exercise_summary.html` 的记录表逐列核过）。 */
const COLUMNS = ['日期', '类型', '分类', '时长', '消耗', '距离', '心率', '备注'] as const;

/** 记录视图（筛选后的逐条行＋汇总数；调用方只读，不改库）。 */
export interface RecordsView {
  readonly start: string;
  readonly end: string;
  readonly rows: readonly PortRow[];
  readonly sessions: number;
  readonly totalBurned: number;
  readonly totalMinutes: number | null;
  readonly activeDays: number;
  readonly category: string | null;
  readonly hasNote: boolean | null;
}

/** 备注筛选参数：`hasNote` 主名、`withNote` 兼容旧文案。只收布尔，非布尔即用法错。 */
function hasNoteOf(params: Record<string, unknown>): boolean | null {
  const v = params['hasNote'] !== undefined ? params['hasNote'] : params['withNote'];
  if (v === undefined || v === null) return null;
  if (typeof v !== 'boolean') fail(2, '参数 hasNote 须为布尔');
  return v as boolean;
}

/** 分类筛选参数：只收非空字符串；空串视为未给。 */
function categoryOf(params: Record<string, unknown>): string | null {
  const v = optStr(params, 'category');
  if (v === undefined) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** 列里的数是显示层取整过的（`fmtNum`）：库里 `320.40000000000003` 那样的原值不上屏。 */
function fmtMinutes(n: number | null): string {
  return n === null ? '—' : fmtNum(n, 0) + ' 分钟';
}

function fmtBurned(n: number): string {
  return fmtNum(n) + ' 卡';
}

function fmtKm(n: number | null): string {
  return n === null ? '—' : fmtNum(n, 2) + ' km';
}

function fmtHr(n: number | null): string {
  return n === null ? '—' : fmtNum(n, 0) + ' bpm';
}

function fmtNote(s: string): string {
  return s.trim() === '' ? '—' : s;
}

/** 取数＋筛选：窗口内全部行→按分类→按备注；筛空即缺失阻断，不返空表。 */
function buildView(db: DatabaseSync, start: string, end: string, category: string | null, hasNote: boolean | null): RecordsView {
  let rows: PortRow[];
  try {
    rows = listPortRows(db, start, end);
  } catch (e) {
    if (e instanceof CalorieRenderError) throw e;
    throw new CalorieRenderError('missing-data', '无运动记录：' + start + ' ~ ' + end);
  }
  if (category !== null) rows = rows.filter((r) => r.category === category);
  if (rows.length === 0 && category !== null) throw new CalorieRenderError('missing-data', '无' + category + '记录：' + start + ' ~ ' + end);
  if (hasNote === true) rows = rows.filter((r) => r.note.trim() !== '');
  if (hasNote === false) rows = rows.filter((r) => r.note.trim() === '');
  if (rows.length === 0 && hasNote === true) throw new CalorieRenderError('missing-data', '本窗无带备注的运动记录：' + start + ' ~ ' + end);
  if (rows.length === 0) throw new CalorieRenderError('missing-data', '无运动记录：' + start + ' ~ ' + end);
  let burned = 0;
  let mins = 0;
  let minsKnown = false;
  for (const r of rows) {
    burned += r.burned;
    if (r.minutes !== null) {
      mins += r.minutes;
      minsKnown = true;
    }
  }
  const days = new Set(rows.map((r) => r.date)).size;
  return {
    start, end, rows,
    sessions: rows.length,
    totalBurned: Math.round(burned * 10) / 10,
    totalMinutes: minsKnown ? mins : null,
    activeDays: days,
    category, hasNote,
  };
}

/** 页内一张卡（`id` 即页内导航的锚点，导航项按同一份清单生成）；卡外壳＝锚点 id ＋ 区块 HTML。 */
interface Card { readonly id: string; readonly label: string; readonly html: string }

function shell(card: Card): string {
  return '<section id="' + card.id + '">' + card.html + '</section>';
}

/** 本页列出来的行数（超上限即截断；同一口径同时进表标题与页眉，读者不用自己对数）。 */
function shownCount(v: RecordsView): number {
  return Math.min(v.rows.length, ROW_LIMIT);
}

/** 表标题句（票面第 2 条：行数上限写在这里；总数与本页显示数两处口径逐字一致）。
 *  #523：三段之间原来用 `；`，改行文标点（`；` 是并列分隔符，判债）。 */
function captionOf(v: RecordsView, shown: number): string {
  return '运动记录明细（共 ' + v.sessions + ' 条，本页显示 ' + shown + ' 条，每页最多 ' + ROW_LIMIT + ' 条）';
}

/** 页眉副标题：记录级明细 ＋ 窗口 ＋ 两个条数（与表标题同口径）。
 *  #523：原来 `记录级明细｜起 ~ 止（…）` 的 `｜` 去掉——窗口归页面外那一条窗口条，
 *  这里只留本页列了多少（条数那份事实只在这句里报一次）。 */
function subtitleOf(v: RecordsView, shown: number): string {
  return '逐条列出本窗的运动记录，本页显示 ' + shown + ' 条';
}

/** 数字口径行（#523）：原来五件事一个 `；` 串，现在一条事实一行；单位那几条并排成胶囊行。
 *  第一条保留 `口径：` 前缀（回归判据读它）。两条各说一件取数事实，不当填充句。 */
function caliberLines(v: RecordsView): string[] {
  const parts = [
    '口径：条数＝本窗内未删除的运动记录',
    '消耗＝记录行上报值合计，不按天摊',
  ];
  if (v.totalMinutes === null) parts.push('本窗没有一行填了时长，总时长不印假 0');
  return parts;
}

/** 单位图例（胶囊行）：每条一个「列名＝单位」，各自成形。 */
function unitCaps(): string {
  return capsStrip(renderChips({ items: [
    { text: '消耗＝卡' }, { text: '时长＝分钟' }, { text: '距离＝km' }, { text: '心率＝bpm' },
  ] }));
}

/** 筛选口径句（票面第 3 条：三种筛选各一句人话；无筛选即整行不出现）。 */
function filterText(v: RecordsView): string | null {
  if (v.category === '力量') return '筛选口径：只看分类为力量的记录（力量训练）';
  if (v.category === '有氧') return '筛选口径：只看分类为有氧的记录（有氧运动）';
  if (v.category !== null) return '筛选口径：只看分类为' + v.category + '的记录';
  if (v.hasNote === true) return '筛选口径：只看带备注的记录（备注栏有字的才算）';
  if (v.hasNote === false) return '筛选口径：只看没有备注的记录';
  return null;
}

/** 截断口径句（超上限才出）：本页列了多少、本窗共有多少。 */
function truncationText(v: RecordsView, shown: number): string | null {
  if (shown >= v.sessions) return null;
  return '口径：本窗共 ' + v.sessions + ' 条，本页只列前 ' + shown + ' 条（每页最多 ' + ROW_LIMIT + ' 条）';
}

/** 窗口卡：这一页看的是哪一段（开始／结束两个真日期）。 */
function windowCard(v: RecordsView): Card {
  return {
    id: 'sec-window',
    label: '窗口',
    html: renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: '本窗内逐条运动记录，下面那张表列八列明细',
    }),
  };
}

/** 指标卡：记录数／总消耗／总时长／活跃天数。记录数是本窗总数，不是本页列出的行数。
 *  #523：`记录数` 卡的 `detail` 原来复读整段窗口（窗口已住页头窗口条）⇒ 撤掉，改报活跃天数；
 *  `总消耗` 卡与明细表里的逐条消耗同源，但一个是合计一个是逐条，不算重复事实。 */
function figureCard(v: RecordsView): Card {
  return {
    id: 'sec-figures',
    label: '指标',
    html: renderKpiGrid([
      { label: '记录数', value: String(v.sessions), unit: '条', detail: '活跃 ' + v.activeDays + ' 天' },
      { label: '总消耗', value: fmtNum(v.totalBurned), unit: '卡' },
      { label: '总时长', value: v.totalMinutes === null ? '—' : fmtNum(v.totalMinutes, 0), unit: '分钟' },
      { label: '活跃天数', value: String(v.activeDays), unit: '天' },
    ]),
  };
}

/** 明细卡：八列逐条；只铺本页可见的行，被截掉的部分由表标题与截断口径句明示。 */
function detailCard(v: RecordsView, shown: number): Card {
  return {
    id: 'sec-table',
    label: '记录明细',
    html: renderDataTable({
      columns: COLUMNS.map((label) => ({ key: label, label })),
      rows: v.rows.slice(0, shown).map((r) => ({
        日期: r.date,
        类型: r.type,
        分类: r.category,
        时长: fmtMinutes(r.minutes),
        消耗: fmtBurned(r.burned),
        距离: fmtKm(r.distanceKm),
        心率: fmtHr(r.avgHr),
        备注: fmtNote(r.note),
      })),
      caption: captionOf(v, shown),
    }),
  };
}

/** 空态卡（票面第 6 条）：无记录不留空表，把「说哪句话记下第一条」递到眼前。 */
function emptyCard(v: RecordsView): Card {
  const word = v.category === '力量' ? '记力量训练' : v.category === '有氧' ? '记有氧运动' : '记运动';
  return {
    id: 'sec-empty',
    label: '记录明细',
    html: emptyGuide({ icon: '🏃', text: '本窗还没有运动记录', hint: '说「' + word + '」就能记下第一条' }),
  };
}

/** 来源脚注卡（#523 形状化）：键值行「数据来源／窗口／记录数」，三个独立文本节点。
 *  不再产 `数据来源 · <来源> · 起 → 止 · 共 N 条` 那种 `·` 串（共用层口径统一归 #470）。 */
function sourceCard(v: RecordsView): Card {
  return {
    id: 'sec-source',
    label: '数据来源',
    html: factStrip([
      { k: '数据来源', v: SOURCE },
      { k: '窗口', v: v.start + ' → ' + v.end },
      { k: '记录数', v: '共 ' + v.sessions + ' 条' },
    ]),
  };
}

/** 整页装配：页内样式 ＋ 窗口条 ＋ 页内导航 ＋ 口径行（数字／筛选／截断）＋ 四张卡（窗口／指标／明细 or 空态／来源）＋ 三格式复制区。
 *  #523：窗口条（两枚日期块 ＋ 天数胶囊）恒为正文第二项（页内样式之后）——窗口那件事只在它身上报一次。 */
export function buildRecordsDoc(v: RecordsView): string {
  const shown = shownCount(v);
  const cards = [
    windowCard(v),
    figureCard(v),
    v.sessions === 0 ? emptyCard(v) : detailCard(v, shown),
    sourceCard(v),
  ];
  const filter = filterText(v);
  const truncation = truncationText(v, shown);
  const content = [
    exerciseUiCss(),
    windowStrip(v.start, v.end, v.activeDays + ' 天有记录'),
    renderTocBlock({ items: cards.map((c) => ({ id: c.id, text: c.label })) }),
    unitCaps(),
    caliberLines(v).map((t) => renderCaliberLine(t)).join(''),
    filter === null ? '' : renderCaliberLine(filter),
    truncation === null ? '' : renderCaliberLine(truncation),
    cards.map(shell).join(''),
    copyArea({
      data: {
        envelope: {
          version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: COPY_KEY,
          data: {
            metrics: metricsOf({
              sessions: v.sessions, totalBurned: v.totalBurned,
              totalMinutes: v.totalMinutes, activeDays: v.activeDays,
            }),
          },
        },
      },
    }),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: PAGE_TITLE,
    eyebrow: EYEBROW,
    subtitle: subtitleOf(v, shown),
    content,
    // 可打印版面（#420 第 7 条）：类走 `assembleDocPage` 的 `printable` 透传位（#448），
    // 打印规则（隐藏页内导航与区块复制区、具名页 `@page printable`）见 `base-render/src/blocks.ts`。
    printable: true,
  });
}

/** `calorie.view.exercise-records` · 运动记录级明细：窗口＋分类＋备注筛选。 */
export function viewExerciseRecords(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const { start, end } = defaultRange(db, params);
  const category = categoryOf(params);
  const hasNote = hasNoteOf(params);
  const v = buildView(db, start, end, category, hasNote);
  const metrics = nums({
    sessions: v.sessions, totalBurned: v.totalBurned,
    totalMinutes: v.totalMinutes, activeDays: v.activeDays,
  });
  return { data: { metrics }, html: buildRecordsDoc(v) };
}
