/** 健身计划结果/过程整页装配（T351 视觉修复·实施兵B）。
 *
 * 融合方案 `docs/skills/skill-calorie/t351-visual-fix-plan-20260914.md` §2：
 * 结果/读验证迁老 `workout_plan_view` 版式（周次＋会话＋动作三级）装新 `PlanView` 数据；
 * 过程迁老 `process_progress` 五段式（标题＋进度＋步骤＋复制区）装新
 * `PlanWizardView`／`WritePreview` 数据。数据只读既有取数层，不跨能力取数；
 * 新增装配接口 4 个（本文件 4 导出），复制与页面模板只用共用位
 *（`shared/docPage`＋`shared/copyArea`，与实施兵A同形：复制数据＋复制日志双按钮），
 * 零内联脚本，中文单语（操作名一律中文，不出现 `op=`／`prompt` 裸词）。
 */
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import { nowStamp } from './receipt.js';
import type { PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import type { WritePreview } from '../workout/write.js';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';

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
}

/** 复制区（与实施兵A同形）：复制数据（三格式菜单）＋复制日志双按钮。 */
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

/** 结果/读验证：周次＋会话＋动作三级（老 `workout_plan_view` 版式，新 `PlanView` 数据）。 */
export function buildPlanResultDoc(v: PlanView, opts: PlanDocOpts): string {
  const byWeek = new Map<number, typeof v.sessions>();
  for (const s of v.sessions) {
    const list = byWeek.get(s.week_number) ?? [];
    list.push(s);
    byWeek.set(s.week_number, list);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  const planName = v.title ?? '未命名计划';
  const parts: string[] = [
    renderKpiGrid([
      { label: '计划', value: planName, detail: v.totalWeeks === null ? '' : '共 ' + v.totalWeeks + ' 周' },
      { label: '会话', value: v.totalSessions + ' 个', detail: '动作 ' + v.totalMovements + ' 个' },
      { label: '周数', value: weeks.length + ' 周有安排', detail: v.totalWeeks === null ? '' : '计划共 ' + v.totalWeeks + ' 周' },
    ]),
  ];
  if (weeks.length === 0) {
    parts.push(renderDataTable({
      columns: [
        { key: 'day', label: '日期' },
        { key: 'slot', label: '时段' },
        { key: 'moves', label: '动作' },
      ],
      rows: [],
      caption: '训练安排',
      emptyText: '本窗无训练安排（空窗有页，不返空）',
    }));
  }
  for (const wn of weeks) {
    const rows = (byWeek.get(wn) ?? []).map((s) => {
      const moves = Array.isArray(s.movements) ? s.movements : [];
      const names = moves.map((m) => m.name ?? '').filter((n) => n !== '');
      return {
        day: DOW[s.day_of_week] ?? '周' + s.day_of_week,
        slot: s.is_rest_day === 1 ? (s.session_label || '休息') + '（休息）' : (s.session_label || '训练'),
        moves: s.is_rest_day === 1 ? '—（休息日）' : (names.length > 0 ? names.join('、') : '—'),
        count: moves.length + ' 个',
      };
    });
    parts.push(renderDataTable({
      columns: [
        { key: 'day', label: '日期' },
        { key: 'slot', label: '时段' },
        { key: 'moves', label: '动作' },
        { key: 'count', label: '动作数', align: 'right' },
      ],
      rows,
      caption: '第 ' + wn + ' 周（' + rows.length + ' 场）',
      emptyText: '本周无训练安排',
    }));
  }
  parts.push(dualCopy(opts.key, opts.command, 'workout_plans（训练计划查看）', {
    totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks,
  }));
  const head = opts.wakeWord ? opts.wakeWord + ' · ' : '';
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '训练计划查看',
    eyebrow: '健身计划 · 看训练计划',
    subtitle: head + planName + ' · 共 ' + v.totalSessions + ' 场 · ' + v.totalMovements + ' 个动作',
    content: parts.join(''),
  });
}

/** 结果：计划对比实际（完成率＋动作级表）。 */
export function buildPlanVsActualDoc(v: PlanVsActualView, opts: PlanDocOpts): string {
  const rows = v.days
    .filter((d) => d.planned.length > 0 || d.logged.length > 0)
    .map((d) => ({
      date: d.date,
      plan: d.planned.length > 0 ? d.planned.join('、') : '—',
      done: d.logged.length > 0 ? d.logged.join('、') : '—',
      miss: d.missed.length === 0 ? '全命中' : '漏 ' + d.missed.join('、'),
    }));
  const parts: string[] = [
    renderKpiGrid([
      { label: '完成率', value: v.completionRate === null ? '—' : v.completionRate + '%', detail: v.start + ' ~ ' + v.end },
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
    dualCopy(opts.key, opts.command, 'workout_plans＋exercise_log（计划对比实际）', {
      plannedCount: v.plannedCount, doneCount: v.doneCount, completionRate: v.completionRate,
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
      title: '确认说明',
      contentHtml: renderListRows({
        items: [
          { left: '方式', main: '复制指令后执行写命令', right: '' },
          { left: '影响', main: v.note === '' ? '—' : v.note, right: '' },
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
