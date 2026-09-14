/** 健身计划结果/过程整页装配（T351 重做「看完整计划」·实施兵）。
 *
 * 计划查看页（order176–185 共用本件）照规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` 重做：
 * 页头（大标题「健身计划」＋版本/周数/起日）→ 指标卡（总场次／总动作／总周数）→ 每周一个原生
 * `<details open>`（纯 HTML、零内联脚本，替代老页 JS 页签）→ 周内每场一张会话卡（周X · 时段 · label
 * · 组数）→ 卡内六列动作明细表（动作／部位／类型／组数×次数／重量／备注；老页的休息列库里无字段，
 * 列位让给备注）→ 空窗出完整空页（不返白页）→ 底部「复制数据／复制日志」双按钮。
 * 复制数据载荷不照抄老页 `scene.snapshot`：计划数据投影成信封 `list` 形（`items` 逐周一行、
 * `total` 记会话数），日志用 `CopyLogFields` 五键。
 *
 * 只读既有取数层（`PlanView`／`WritePreview`），不跨能力取数；动作字段形状的唯一出处是
 * `workout/planStore.ts` 的 `PlanMovement`，本层只按它收窄消费，不另立概念。页面只用共用位
 *（`shared/docPage` ＋ `base-paint/blocks` 的页面壳／指标卡／表格／折叠／空态），不新增样式、
 * 不新增公共层件。过程型两页（写前预览／构建向导，order186–190）仍走原五段式，本次不动。
 */
import type { SerializableEnvelope } from 'base-paint';
import { buildDataText, buildLogText } from 'base-paint';
import { renderCopyBlock, renderDataTable, renderDisclosure, renderEmptyBlock, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import type { PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import type { PlanMovement, PlanSessionRow } from '../workout/planStore.js';
import type { WritePreview } from '../workout/write.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

const DOW = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
/** 库里缺的字段一律写短横线，不印空白格（老页同口径）。 */
const DASH = '—';

/** 写前预览操作的中文名（老 `process_progress` 复制区同口径，页上不出现英文 `op`）。 */
const OP_ZH: Record<string, string> = {
  copy: '复制训练计划',
  'set-week': '定一周计划',
  'add-movement': '加训练动作',
  'set-rest': '定休息日',
  update: '改训练计划',
  'update-day': '改某天训练',
  'delete-day': '删某天训练',
  'update-movement': '改动作',
  delete: '撤销训练计划',
};

interface PlanDocOpts {
  readonly key: string;
  readonly command: string;
  readonly wakeWord?: string;
}

/** 复制区（计划查看页）：单格式数据文本 ＋ 日志文本直挂冻结双按钮（与 201–207 同形：
 *  无三格式菜单、无英文菜单项、无与按钮同名的大标题），按钮 id 补成冻结表那两颗。 */
function planCopyBlock(envelope: SerializableEnvelope, title: string, command: string, source: string): string {
  return renderCopyBlock({
    dataText: buildDataText({ envelope, title }),
    logText: buildLogText({
      envelope,
      copyLog: copyLog({ command, source, actionAt: nowStamp(), version: DOC_VERSION }),
    }),
  })
    .replace('data-action-id="ilife-copy-data"', 'id="ilife-copy-data" data-action-id="ilife-copy-data"')
    .replace('data-action-id="ilife-copy-log"', 'id="ilife-copy-log" data-action-id="ilife-copy-log"');
}

/** 复制区（过程型两页，本次不动）：复制数据（三格式菜单）＋复制日志双按钮。 */
function dualCopy(key: string, command: string, source: string, metrics: Record<string, number | null | undefined>): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key,
    data: { metrics: metricsOf(metrics) },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

/** 单元格文本：库里缺字段或空串写短横线。 */
function cell(value: string | undefined): string {
  return value === undefined || value === '' ? DASH : value;
}

/** 组数×次数（组数＝`sets.length`，次数＝`sets[].reps`）：同重复数写「3组×12次」，
 *  逐组不同写「3组×10／12次」；库里没有 `sets` 写短横线。 */
function setsText(m: PlanMovement): string {
  const sets = m.sets ?? [];
  if (sets.length === 0) return DASH;
  const reps = [...new Set(sets.map((s) => s.reps))];
  return sets.length + '组×' + reps.join('／') + '次';
}

/** 重量（重量＝`sets[].weight` ＋ `unit`）：逐组同一写「35kg」，逐组不同写「30／35kg」；
 *  逐组都没有正数重量时，单位是 `kg`／`自重` 写「自重」、其余写短横线（老页同口径）。 */
function weightText(m: PlanMovement): string {
  const sets = m.sets ?? [];
  if (sets.length === 0) return DASH;
  const unit = sets[0].unit;
  const weights = [...new Set(sets.map((s) => s.weight))];
  if (!weights.some((w) => w > 0)) return unit === 'kg' || unit === '自重' ? '自重' : DASH;
  return weights.join('／') + unit;
}

/** 会话卡（原生 `<details open>`）：标题「周X · 时段 · 会话名 · N 组」＋卡内六列动作明细表；
 *  休息日不出表，出一句「不排训练动作」。 */
function sessionCard(s: PlanSessionRow): string {
  const moves = Array.isArray(s.movements) ? s.movements : [];
  const rest = s.is_rest_day === 1;
  const setsCount = s.total_sets ?? moves.reduce((n, m) => n + (m.sets ?? []).length, 0);
  const raw = s.session_label ?? '';
  const label = rest
    ? (raw === '' || raw === '休息' ? '休息日' : raw + '（休息日）')
    : (raw === '' ? '训练' : raw);
  const start = s.time_start;
  const time = start === null || start === undefined || start === ''
    ? ''
    : (s.time_end === null || s.time_end === undefined || s.time_end === '' || s.time_end === start ? start : start + '–' + s.time_end);
  const title = [
    DOW[s.day_of_week] ?? '周' + s.day_of_week,
    time,
    label,
    rest || setsCount === 0 ? '' : setsCount + ' 组',
  ].filter((t) => t !== '').join(' · ');
  if (rest) {
    return renderDisclosure({ title, open: true, contentHtml: renderEmptyBlock({ text: '休息日，本场不排训练动作' }) });
  }
  return renderDisclosure({
    title,
    open: true,
    contentHtml: renderDataTable({
      columns: [
        { key: 'move', label: '动作' },
        { key: 'part', label: '部位' },
        { key: 'type', label: '类型' },
        { key: 'sets', label: '组数×次数', align: 'right' },
        { key: 'weight', label: '重量', align: 'right' },
        { key: 'note', label: '备注' },
      ],
      rows: moves.map((m) => ({
        move: cell(m.name), part: cell(m.part), type: cell(m.type),
        sets: setsText(m), weight: weightText(m), note: cell(m.note),
      })),
      emptyText: '本场无动作明细',
    }),
  });
}

/** 复制数据的一行＝一周：周次 ＋ 场数 ＋ 逐场「周X 会话名 N 个动作」。 */
function weekLine(wn: number, list: readonly PlanSessionRow[]): string {
  const brief = list.map((s) => {
    const dow = DOW[s.day_of_week] ?? '周' + s.day_of_week;
    if (s.is_rest_day === 1) return dow + ' 休息日';
    const moves = Array.isArray(s.movements) ? s.movements : [];
    return dow + ' ' + (s.session_label === '' || s.session_label === undefined ? '训练' : s.session_label) + ' ' + moves.length + ' 个动作';
  });
  return '第 ' + wn + ' 周 · ' + list.length + ' 场 · ' + brief.join(' · ');
}

/** 结果/读验证（order176–184）：页头＋指标卡＋每周折叠＋会话卡六列明细＋空态＋复制区。 */
export function buildPlanResultDoc(v: PlanView, opts: PlanDocOpts): string {
  const byWeek = new Map<number, PlanSessionRow[]>();
  for (const s of v.sessions) {
    const list = byWeek.get(s.week_number) ?? [];
    list.push(s);
    byWeek.set(s.week_number, list);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  const planName = v.title === null || v.title === '' ? '未命名计划' : v.title;
  const parts: string[] = [
    renderKpiGrid([
      { label: '总场次', value: String(v.totalSessions), unit: '场' },
      { label: '总动作', value: String(v.totalMovements), unit: '个' },
      {
        label: '总周数', value: String(weeks.length), unit: '周有安排',
        detail: v.totalWeeks === null ? '计划未标总周数' : '计划共 ' + v.totalWeeks + ' 周',
      },
    ]),
  ];
  if (weeks.length === 0) {
    parts.push(renderEmptyBlock({ title: '训练安排', text: '本窗无训练安排（换一周，或先定训练计划）' }));
  }
  for (const wn of weeks) {
    const list = byWeek.get(wn) ?? [];
    parts.push(renderDisclosure({
      title: '第 ' + wn + ' 周 · ' + list.length + ' 场',
      open: true,
      contentHtml: list.map(sessionCard).join(''),
    }));
  }
  parts.push(planCopyBlock(
    {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
      data: { items: weeks.map((wn) => weekLine(wn, byWeek.get(wn) ?? [])), total: v.totalSessions },
    },
    '【calorie · 训练计划查看】',
    opts.command,
    'workout_plans（训练计划，只读）',
  ));
  const meta = [
    v.version === null || v.version === '' ? '' : '版本 ' + v.version,
    v.totalWeeks === null ? '' : '共 ' + v.totalWeeks + ' 周',
    v.startDate === null || v.startDate === '' ? '' : '起日 ' + v.startDate,
  ].filter((t) => t !== '').join(' · ');
  const head = opts.wakeWord ? opts.wakeWord + ' · ' : '';
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '健身计划',
    eyebrow: '训练计划查看',
    subtitle: head + planName + (meta === '' ? '' : ' · ' + meta),
    content: parts.join(''),
  });
}

/** 结果：计划对比实际（完成率＋动作级表）。 */
export function buildPlanVsActualDoc(v: PlanVsActualView, opts: PlanDocOpts): string {
  const rows = v.days
    .filter((d) => d.planned.length > 0 || d.logged.length > 0)
    .map((d) => ({
      date: d.date,
      plan: d.planned.length > 0 ? d.planned.join('、') : DASH,
      done: d.logged.length > 0 ? d.logged.join('、') : DASH,
      miss: d.missed.length === 0 ? '全命中' : '漏 ' + d.missed.join('、'),
    }));
  const parts: string[] = [
    renderKpiGrid([
      { label: '完成率', value: v.completionRate === null ? DASH : v.completionRate + '%', detail: v.start + ' ~ ' + v.end },
      { label: '计划', value: v.plannedCount + ' 个', detail: '窗内计划动作' },
      { label: '完成', value: v.doneCount + ' 个', detail: '命中动作' },
    ]),
    renderDataTable({
      columns: [
        { key: 'date', label: '日期' },
        { key: 'plan', label: '计划动作' },
        { key: 'done', label: '实际完成' },
        { key: 'miss', label: '缺口' },
      ],
      rows,
      caption: '逐日对照（' + v.start + ' ~ ' + v.end + '）',
      emptyText: '范围内无计划或实绩数据',
    }),
    planCopyBlock(
      {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
        data: {
          items: rows.map((r) => r.date + ' · 计划 ' + r.plan + ' · 完成 ' + r.done + ' · ' + r.miss),
          total: v.plannedCount,
        },
      },
      '【calorie · 计划对比实际】',
      opts.command,
      'workout_plans ＋ exercise_log（计划对比实际，只读）',
    ),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '计划对比实际',
    eyebrow: '健身计划 · 看训练计划',
    subtitle: v.start + ' ~ ' + v.end + ' · 完成 ' + v.doneCount + '/' + v.plannedCount,
    content: parts.join(''),
  });
}

/** 过程：写前预览五段式（标题＋进度＋改前/改后＋复制区，老 `process_progress` 版式）。 */
export function buildPlanProcessDoc(v: WritePreview, opts: PlanDocOpts): string {
  const opName = OP_ZH[v.op] ?? '写前预览';
  const beforeRows = v.before.map((b, i) => ({ n: String(i + 1), c: b }));
  const afterRows = v.after.map((a, i) => ({ n: String(i + 1), c: a }));
  const parts: string[] = [
    renderKpiGrid([
      { label: '操作', value: opName, detail: v.title },
      { label: '改前', value: v.before.length + ' 行' },
      { label: '改后', value: v.after.length + ' 行' },
    ]),
    renderDataTable({
      columns: [{ key: 'n', label: '序号' }, { key: 'c', label: '改前快照' }],
      rows: beforeRows,
      caption: '改前快照（' + v.before.length + ' 行）',
      emptyText: '改前为空',
    }),
    renderDataTable({
      columns: [{ key: 'n', label: '序号' }, { key: 'c', label: '改后预览' }],
      rows: afterRows,
      caption: '改后预览（' + v.after.length + ' 行，只读不写库）',
      emptyText: '改后为空',
    }),
    renderDisclosure({
      title: '确认说明',
      contentHtml: renderListRows({
        items: [
          { left: '方式', main: '复制指令后执行写命令', right: '' },
          { left: '影响', main: v.note === '' ? DASH : v.note, right: '' },
        ],
      }),
    }),
    dualCopy(opts.key, opts.command, 'workout_plans（写前预览，只读）', {
      beforeLines: v.before.length, afterLines: v.after.length,
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '写前预览 · ' + opName,
    eyebrow: '健身计划 · 预检确认页',
    subtitle: v.title,
    content: parts.join(''),
  });
}

/** 过程：构建向导五段式（校验结论＋错误/警告＋复制区）。 */
export function buildPlanWizardDoc(v: PlanWizardView, opts: PlanDocOpts): string {
  const ok = v.errorCount === 0;
  const parts: string[] = [
    renderKpiGrid([
      { label: '构建向导', value: ok ? '可落地' : '有硬止', status: ok ? 'ok' : 'warn' },
      { label: '错误', value: v.errorCount + ' 项' },
      { label: '警告', value: v.warningCount + ' 项' },
      { label: '已检查', value: '已检查 ' + v.checkedSessions + ' 个会话' + (v.errorCount > 0 ? '（' + v.errorCount + '硬止）' : ''), detail: '纯校验，不写库' },
    ]),
    renderDisclosure({
      title: '硬止错误（' + v.errors.length + ' 条）',
      contentHtml: renderListRows({
        items: v.errors.map((e, i) => ({ left: '错误' + (i + 1), main: e, right: '' })),
        emptyText: '无硬止错误',
      }),
    }),
    renderDisclosure({
      title: '警告（' + v.warnings.length + ' 条）',
      contentHtml: renderListRows({
        items: v.warnings.map((w, i) => ({ left: '警告' + (i + 1), main: w, right: '' })),
        emptyText: '无警告',
      }),
    }),
    dualCopy(opts.key, opts.command, 'planStore 校验（构建向导，纯校验）', {
      errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions,
    }),
  ];
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '构建向导 · 定训练计划',
    eyebrow: '健身计划 · 预检确认页',
    subtitle: ok ? '可落地 · 已检查 ' + v.checkedSessions + ' 个会话' : '有硬止 · 先改计划再确认',
    content: parts.join(''),
  });
}
