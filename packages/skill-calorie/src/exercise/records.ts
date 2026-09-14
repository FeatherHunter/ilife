/** 运动记录（HELP 场景 04「运动」下一级 · 看运动）：`calorie.view.exercise-records` 读命令。
 *
 * #342 新增：记录级明细（老技能 `render_exercise_summary.py --mode records`
 * ＋ `--today`／`--yesterday`／`--has-note`／`--category 力量|有氧`）。
 * 取数走既有 `render/exercisePort.ts` 的 `listPortRows`（窗内全部行，软删除已排除；
 * 分类口径＝库内实填优先、缺失回退推断，与力量／有氧总览同口径），本件只做筛选与装配，
 * 不重写取数口径。页面装配走共用 `shared/docPage.ts` 的 `assembleDocPage`，
 * 与运动移植 6 页同形（窗口表单＋指标＋逐条表＋复制区）。
 *
 * 对外 2 件（铁律五「不多于五个」）：
 *   ① `viewExerciseRecords`——读命令入口（窗口＋分类＋备注筛选）；
 *   ② `buildRecordsDoc`——整页装配（取数结果→完整文档）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { renderDataTable, renderKpiGrid, renderParamForm } from 'base-paint/blocks';
import { listPortRows } from '../render/exercisePort.js';
import type { PortRow } from '../render/exercisePort.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { defaultRange, fail, nums, optStr } from '../shared/params.js';
import { CalorieRenderError } from '../render/errors.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** 整页装配的版本与标题（与运动移植页同值域，不另起）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·运动记录';

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

function fmtMinutes(n: number | null): string {
  return n === null ? '—' : String(n) + ' 分钟';
}

function fmtBurned(n: number): string {
  return String(n) + ' 卡';
}

function fmtKm(n: number | null): string {
  return n === null ? '—' : String(n) + ' km';
}

function fmtHr(n: number | null): string {
  return n === null ? '—' : String(n) + ' bpm';
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

/** 模式说明（副标题用）：窗口＋分类＋备注三件拼一句。 */
function modeText(v: RecordsView): string {
  const parts: string[] = [];
  if (v.category !== null) parts.push(v.category + '筛选');
  if (v.hasNote === true) parts.push('有备注');
  if (v.hasNote === false) parts.push('无备注');
  const head = parts.length > 0 ? '（' + parts.join('·') + '）' : '';
  return '记录级明细' + head + '｜' + v.start + ' ~ ' + v.end + '（共 ' + v.sessions + ' 条）';
}

/** 整页装配：窗口表单＋指标＋记录级列表＋复制区（完整文档，不返片段）。 */
export function buildRecordsDoc(v: RecordsView): string {
  const filterDesc = '记录级明细（逐条：日期／类型／分类／时长／消耗／距离／心率／备注）'
    + (v.category !== null ? '；分类＝' + v.category : '')
    + (v.hasNote === true ? '；只看带备注的记录' : '');
  const parts: string[] = [
    renderParamForm({
      fields: [
        { name: 'start', label: '开始', value: v.start },
        { name: 'end', label: '结束', value: v.end },
      ],
      description: filterDesc,
    }),
    renderKpiGrid([
      { label: '记录数', value: String(v.sessions), unit: '条', detail: v.start + ' ~ ' + v.end },
      { label: '总消耗', value: String(v.totalBurned), unit: '卡' },
      { label: '总时长', value: v.totalMinutes === null ? '—' : String(v.totalMinutes), unit: '分钟' },
      { label: '活跃天数', value: String(v.activeDays), unit: '天' },
    ]),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'type', label: '类型' },
        { key: 'category', label: '分类' },
        { key: 'minutes', label: '时长' },
        { key: 'burned', label: '消耗' },
        { key: 'distance', label: '距离' },
        { key: 'hr', label: '心率' },
        { key: 'note', label: '备注' },
      ],
      rows: v.rows.map((r) => ({
        date: r.date,
        type: r.type,
        category: r.category,
        minutes: fmtMinutes(r.minutes),
        burned: fmtBurned(r.burned),
        distance: fmtKm(r.distanceKm),
        hr: fmtHr(r.avgHr),
        note: fmtNote(r.note),
      })),
      caption: '运动记录明细（共 ' + v.sessions + ' 条）',
      emptyText: '本窗无运动记录',
    }),
    dataCopyArea('复制数据', {
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.exercise-records',
        data: {
          metrics: metricsOf({
            sessions: v.sessions, totalBurned: v.totalBurned,
            totalMinutes: v.totalMinutes, activeDays: v.activeDays,
          }),
        },
      },
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '运动记录 ' + v.start + ' ~ ' + v.end,
    eyebrow: 'calorie.view.exercise-records · 运动记录',
    subtitle: modeText(v),
    content: parts.join(''),
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
