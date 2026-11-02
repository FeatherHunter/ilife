/** 批量落地两页（HELP 场景 05「健身计划」下一级「落地训练」· 批量宿主独用）。
 *
 * 两态（同一命令，`dryRun` 分流，与单日链同形）：
 * - 过程页（`dryRun`）：可复制实跑指令先出 ＋ 逐天待落地表（日期／段／动作）＋
 *   待推送／待回写天数 ＋ 训记 KEY 有无 ＋ 0 段原因，远端未调用写在页头，不进任何子进程；
 * - 结果页：逐天结局表（日期／结局／说明）＋ 推送回写天数合计 ＋ 本地远端分清。
 *
 * 显示口径与单日链同源：逐天表直接摆计划行（段标签／动作名原文，不另算）；
 * 天数口径唯一定义地在 `landBatch.ts#batchDates`，本页只摆不算。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { promptCopyArea } from '../shared/copyArea.js';
import { copyBlock } from '../shared/copyBlock.js';
import type { PlanSessionRow } from './planStore.js';
import type { LandBatchSummary } from './landBatch.js';
import { xunjiKeyRow } from './xunjiKey.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

const DOC_TITLE = (): string => m('skill-calorie.workout-landBatchPages.c071');

/** 实跑命令原文（过程页首位可复制 prompt：照抄即跑同一批，单引号包 JSON 照本仓一贯口径）。 */
export function landBatchRealCommand(key: string, anchor: string): string {
  return 'calorie-cmd-read ' + key + ' --params \'{"date":"' + anchor + '"}\'';
}

/** 过程页（`dryRun`）：可复制实跑指令先出 ＋ 逐天待落地表；远端未调用写在页头。 */
export function buildLandBatchProcessPage(input: {
  key: string; params: Record<string, unknown>; wake: string; scopeLabel: string; anchor: string;
  dates: readonly string[]; perDay: readonly { date: string; sessions: readonly PlanSessionRow[] }[];
  receipt: CrudReceipt; planStart: string | null;
}): string {
  const { key, params, wake, scopeLabel, anchor, dates, perDay, receipt, planStart } = input;
  const segs = perDay.reduce((n, d) => n + d.sessions.length, 0);
  const end = dates[dates.length - 1] ?? anchor;
  const planStartText = planStart ?? m('skill-calorie.workout-landBatchPages.c001');
  const emptyWhy = m('skill-calorie.workout-landBatchPages.c002', { p0: String(planStartText) });
  const content = [
    promptCopyArea(landBatchRealCommand(key, anchor), m('skill-calorie.workout-landBatchPages.c003')),
    renderKpiGrid([
      { label: m('skill-calorie.workout-landBatchPages.c004'), value: m('skill-calorie.workout-landBatchPages.c005', { p0: String(anchor), p1: String(end) }), detail: m('skill-calorie.workout-landBatchPages.c006', { p0: String(scopeLabel) }) },
      { label: m('skill-calorie.workout-landBatchPages.c007'), value: m('skill-calorie.workout-landBatchPages.c008', { p0: String(dates.length) }), detail: m('skill-calorie.workout-landBatchPages.c009') },
      { label: m('skill-calorie.workout-landBatchPages.c010'), value: m('skill-calorie.workout-landBatchPages.c011', { p0: String(segs) }), detail: segs === 0 ? emptyWhy : m('skill-calorie.workout-landBatchPages.c012') },
    ]),
    renderDataTable({
      columns: [{ key: 'date', label: m('skill-calorie.workout-landBatchPages.c013') }, { key: 'segs', label: m('skill-calorie.workout-landBatchPages.c014') }, { key: 'moves', label: m('skill-calorie.workout-landBatchPages.c015') }],
      rows: perDay.map((d) => ({
        date: d.date,
        segs: d.sessions.length === 0 ? m('skill-calorie.workout-landBatchPages.c016') : listJoin(currentRenderLanguage(), d.sessions.map((s) => s.session_label)),
        moves: d.sessions.length === 0
          ? m('skill-calorie.workout-landBatchPages.c017')
          : d.sessions.map((s) => listJoin(currentRenderLanguage(), s.movements.map((mv) => mv.name ?? m('skill-calorie.workout-landBatchPages.c018')))).join('｜') || m('skill-calorie.workout-landBatchPages.c019'),
      })),
      caption: m('skill-calorie.workout-landBatchPages.c020'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-landBatchPages.c021') }, { key: 'v', label: m('skill-calorie.workout-landBatchPages.c022') }],
      rows: [
        { k: m('skill-calorie.workout-landBatchPages.c023'), v: m('skill-calorie.workout-landBatchPages.c024', { p0: String(dates.length) }) },
        { k: m('skill-calorie.workout-landBatchPages.c025'), v: m('skill-calorie.workout-landBatchPages.c026', { p0: String(dates.length) }) },
        { k: m('skill-calorie.workout-landBatchPages.c027'), v: m('skill-calorie.workout-landBatchPages.c028', { p0: String(segs) }) },
        { k: m('skill-calorie.workout-landBatchPages.c029'), v: m('skill-calorie.workout-landBatchPages.c030') },
        xunjiKeyRow(),
        ...(segs === 0 ? [{ k: m('skill-calorie.workout-landBatchPages.c031'), v: emptyWhy }] : []),
        { k: m('skill-calorie.workout-landBatchPages.c032'), v: m('skill-calorie.workout-landBatchPages.c033') },
      ],
      caption: m('skill-calorie.workout-landBatchPages.c034'),
    }),
    copyBlock(key, params, receipt, m('skill-calorie.workout-landBatchPages.c035')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: wake,
    eyebrow: m('skill-calorie.workout-landBatchPages.c036'),
    subtitle: m('skill-calorie.workout-landBatchPages.c037', { p0: String(dates.length) }),
    content,
    pageUi: true,
  });
}

/** 结果页：逐天结局 ＋ 推送回写天数合计 ＋ 本地远端分清，每步读数都在页上。 */
export function buildLandBatchResultPage(input: {
  key: string; params: Record<string, unknown>; wake: string; scopeLabel: string;
  summary: LandBatchSummary; message: string; receipt: CrudReceipt; stubbed: boolean;
}): string {
  const { key, params, wake, scopeLabel, summary, receipt, stubbed } = input;
  const dayDetail = (date: string): string => {
    const read = summary.reads.find((r) => r.date === date);
    if (read === undefined) return m('skill-calorie.workout-landBatchPages.c038');
    const stubPhrase = read.stubbed ? m('skill-calorie.workout-landBatchPages.c039') : '';
    if (read.ok) return m('skill-calorie.workout-landBatchPages.c040', { p0: String(read.index), p1: String(stubPhrase) });
    return m('skill-calorie.workout-landBatchPages.c041', { p0: String(read.index) });
  };
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-landBatchPages.c042'), value: m('skill-calorie.workout-landBatchPages.c043', { p0: String(summary.start), p1: String(summary.end) }), detail: m('skill-calorie.workout-landBatchPages.c044', { p0: String(scopeLabel) }) },
      { label: m('skill-calorie.workout-landBatchPages.c045'), value: m('skill-calorie.workout-landBatchPages.c046', { p0: String(summary.pushDays) }), detail: m('skill-calorie.workout-landBatchPages.c047') },
      { label: m('skill-calorie.workout-landBatchPages.c048'), value: m('skill-calorie.workout-landBatchPages.c049', { p0: String(summary.backfillDays) }), detail: m('skill-calorie.workout-landBatchPages.c050') },
    ]),
    renderDataTable({
      columns: [{ key: 'date', label: m('skill-calorie.workout-landBatchPages.c051') }, { key: 'done', label: m('skill-calorie.workout-landBatchPages.c052') }, { key: 'note', label: m('skill-calorie.workout-landBatchPages.c053') }],
      rows: summary.dates.map((date) => ({
        date,
        done: summary.reads.some((r) => r.date === date && r.ok) ? m('skill-calorie.workout-landBatchPages.c054') : m('skill-calorie.workout-landBatchPages.c055'),
        note: dayDetail(date),
      })),
      caption: m('skill-calorie.workout-landBatchPages.c056'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-landBatchPages.c057') }, { key: 'v', label: m('skill-calorie.workout-landBatchPages.c058') }],
      rows: [
        { k: m('skill-calorie.workout-landBatchPages.c059'), v: m('skill-calorie.workout-landBatchPages.c060') },
        { k: m('skill-calorie.workout-landBatchPages.c061'), v: m('skill-calorie.workout-landBatchPages.c062') },
        { k: m('skill-calorie.workout-landBatchPages.c063'), v: m('skill-calorie.workout-landBatchPages.c064') },
        ...(stubbed ? [{ k: m('skill-calorie.workout-landBatchPages.c065'), v: m('skill-calorie.workout-landBatchPages.c066') }] : []),
      ],
      caption: m('skill-calorie.workout-landBatchPages.c067'),
    }),
    copyBlock(key, params, receipt, m('skill-calorie.workout-landBatchPages.c068')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: wake,
    eyebrow: m('skill-calorie.workout-landBatchPages.c069'),
    subtitle: m('skill-calorie.workout-landBatchPages.c070'),
    content,
    pageUi: true,
  });
}
