/** 健身计划结果/过程整页装配（T351 重做「看完整计划」·实施兵）。
 *
 * 计划查看页（order176–185 共用本件）照规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` 重做：
 * 页头（大标题「健身计划」＋说明/版本/周数/起日）→ 指标卡（总场次／总动作／总周数）→ 每周一个原生
 * `<details open>`（纯 HTML、零内联脚本，替代老页 JS 页签）→ 周内每场一张会话卡（周X · 时段 · label ·
 * 组数 · 节奏）→ 卡内四列动作明细表（动作＋副行／部位／组数×次数／重量；表住 `./workoutMovementTable.js`）
 * → 空窗出完整空页（不返白页）→ 底部「复制数据／复制日志」双按钮。
 *
 * 复制数据载荷不照抄老页 `scene.snapshot`：计划数据投影成信封 `list` 形（`items` 逐周一行、`total` 记会话数），
 * 日志用 `CopyLogFields` 五键；底部复制区走共用件 `./planCopyBlock.js`。只读既有取数层（`PlanView`／
 * `WritePreview`），不跨能力取数；动作字段形状的唯一出处是 `workout/planStore.ts` 的 `PlanMovement`
 * （本件只由会话卡经 `./workoutMovementTable.js` 用它的取数口径，不再自己认字段）。
 * 页面只用共用位（`shared/docPage` ＋ `base-paint/blocks` 的整页版式／指标卡／表格／折叠／空态）。
 * 过程型两页走原五段式，页底加本写词的逐字 prompt（预检确认页要能复制 prompt 回给 AI）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderEmptyBlock, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import { planCopyBlock } from './planCopyBlock.js';
import type { PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import type { PlanSessionRow } from '../workout/planStore.js';
import type { WritePreview } from '../workout/write.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyLog } from '../shared/copyArea.js';
import { DASH, movementTableHtml, tempoOf } from './workoutMovementTable.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划';

const DOW = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

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
  /** 该写词的逐字 prompt（预检确认页「复制 prompt」那一路）；结果页不传。 */
  readonly prompt?: string;
}

/** 复制区（过程型两页）：与结果页同形——冻结双按钮，并前置本写词的逐字 prompt（预检确认页的核心是
 *  「复制 prompt 回给 AI」，顺序照 `copyArea` 的 prompt 在前；两段的装配住 `./planCopyBlock.js`）。
 *  `dataTitle` 为必填的中文标题：不给时 `buildDataText` 回落到信封 `key`，页面上就会
 *  出现英文命令键（如 `calorie.view.plan-write-preview`）——负责人已明令中文单语，别退回去。 */
function dualCopy(input: {
  readonly key: string; readonly command: string; readonly source: string;
  readonly dataTitle: string; readonly prompt: string; readonly metrics: Record<string, number | null | undefined>;
}): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: input.key,
    data: { metrics: metricsOf(input.metrics) },
  };
  return planCopyBlock({
    envelope, dataTitle: input.dataTitle, prompt: input.prompt,
    log: copyLog({
      command: input.command, source: input.source,
      actionAt: nowStamp(), version: DOC_VERSION,
    }),
  });
}

/** 休息日卡的会话名：空 label 与「休息」都写「休息日」；已含「休息日」的（库中休息日行就这样）不追加。 */
const restLabel = (raw: string): string =>
  raw === '' || raw === '休息' ? '休息日' : raw.includes('休息日') ? raw : raw + '（休息日）';

/** 会话卡（原生 `<details open>`）：标题「周X · 时段 · 会话名 · N 组 · 节奏 …」＋卡内四列动作明细表
 * （表住 `./workoutMovementTable.js`）；休息日不出表也不加节奏，出一句「不排训练动作」。
 *  节奏取该场动作备注里方括号内逗号之后那段——同一场内恒定，摆在表里就是整列重复，故只上标题行。 */
function sessionCard(s: PlanSessionRow): string {
  const moves = Array.isArray(s.movements) ? s.movements : [];
  const rest = s.is_rest_day === 1;
  const setsCount = s.total_sets ?? moves.reduce((n, m) => n + (m.sets ?? []).length, 0);
  const raw = s.session_label ?? '';
  const label = rest ? restLabel(raw) : (raw === '' ? '训练' : raw);
  const start = s.time_start;
  const time = start === null || start === undefined || start === ''
    ? ''
    : (s.time_end === null || s.time_end === undefined || s.time_end === '' || s.time_end === start ? start : start + '–' + s.time_end);
  const tempo = rest ? '' : tempoOf(moves);
  const title = [
    DOW[s.day_of_week] ?? '周' + s.day_of_week,
    time,
    label,
    rest || setsCount === 0 ? '' : setsCount + ' 组',
    tempo === '' ? '' : '节奏 ' + tempo,
  ].filter((t) => t !== '').join(' · ');
  return renderDisclosure({
    title,
    open: true,
    contentHtml: rest
      ? renderEmptyBlock({ text: '休息日，本场不排训练动作' })
      : movementTableHtml(moves),
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
      { label: '总周数', value: String(v.totalWeeks ?? weeks.length), unit: '周',
        detail: '周有安排 ' + weeks.length + ' 周' + (v.totalWeeks === null ? '（计划未标总周数）' : '') },
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
  parts.push(planCopyBlock({
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
      data: { items: weeks.map((wn) => weekLine(wn, byWeek.get(wn) ?? [])), total: v.totalSessions },
    },
    dataTitle: '【calorie · 训练计划查看】',
    log: copyLog({
      command: opts.command,
      source: 'workout_plans（训练计划，只读）',
      actionAt: nowStamp(), version: DOC_VERSION,
    }),
  }));
  const meta = [
    v.version === null || v.version === '' ? '' : '版本 ' + v.version,
    v.totalWeeks === null ? '' : '共 ' + v.totalWeeks + ' 周',
    v.startDate === null || v.startDate === '' ? '' : '起日 ' + v.startDate,
  ].filter((t) => t !== '').join(' · ');
  const head = opts.wakeWord ? opts.wakeWord + ' · ' : '';
  // 副标题＝计划名 ＋ 计划说明（`config.description`，有则印、无则省）＋ 版本/总周数/起日。
  const desc = v.description === null || v.description === undefined || v.description === '' ? '' : v.description;
  const subtitle = head + planName + (desc === '' ? '' : ' · ' + desc) + (meta === '' ? '' : ' · ' + meta);
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '健身计划',
    eyebrow: '训练计划查看',
    subtitle,
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
    planCopyBlock({
      envelope: {
        version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: opts.key,
        data: {
          items: rows.map((r) => r.date + ' · 计划 ' + r.plan + ' · 完成 ' + r.done + ' · ' + r.miss),
          total: v.plannedCount,
        },
      },
      dataTitle: '【calorie · 计划对比实际】',
      log: copyLog({
        command: opts.command,
        source: 'workout_plans ＋ exercise_log（计划对比实际，只读）',
        actionAt: nowStamp(), version: DOC_VERSION,
      }),
    }),
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
      title: '确认说明', open: true,
      contentHtml: renderListRows({
        items: [
          { left: '方式', main: '复制指令后执行写命令', right: '' },
          { left: '影响', main: v.note === '' ? DASH : v.note, right: '' },
        ],
      }),
    }),
    dualCopy({
      key: opts.key, command: opts.command, source: 'workout_plans（写前预览，只读）',
      dataTitle: '【calorie · 写前预览】', prompt: opts.prompt ?? '',
      metrics: { beforeLines: v.before.length, afterLines: v.after.length },
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
      { label: '已检查', value: v.checkedSessions + ' 个会话' + (v.errorCount > 0 ? '（' + v.errorCount + '硬止）' : ''), detail: '纯校验，不写库' },
    ]),
    // 零条时不出折叠块：KPI 卡已出「错误 0 项／警告 0 项」，两块空折叠是噪声（展开也无内容）。
    // 有硬止时那两块就是「为什么不能写」的正据，默认展开；警告是次要面，仍折叠。
    ...(v.errors.length === 0 ? [] : [renderDisclosure({
      title: '硬止错误（' + v.errors.length + ' 条）', open: true,
      contentHtml: renderListRows({ items: v.errors.map((e, i) => ({ left: '错误' + (i + 1), main: e, right: '' })) }),
    })]),
    ...(v.warnings.length === 0 ? [] : [renderDisclosure({
      title: '警告（' + v.warnings.length + ' 条）',
      contentHtml: renderListRows({ items: v.warnings.map((w, i) => ({ left: '警告' + (i + 1), main: w, right: '' })) }),
    })]),
    dualCopy({
      key: opts.key, command: opts.command, source: 'planStore 校验（构建向导，纯校验）',
      dataTitle: '【calorie · 构建向导】', prompt: opts.prompt ?? '',
      metrics: { errorCount: v.errorCount, warningCount: v.warningCount, checkedSessions: v.checkedSessions },
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
