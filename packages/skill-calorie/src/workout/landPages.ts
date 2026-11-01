/** 落地训练三页（HELP 场景 05「健身计划」下一级「落地训练」· 宿主独用）。
 *
 * 三态：
 * - 过程页（`dryRun`）：可复制 prompt 先出 ＋ 四步预告（待写日历段／待记心愿／待推送段／回写区间）
 *   ＋ 训记 KEY 有无 ＋ 空天原因，远端未调用写在页头，不进任何子进程；
 * - 结果页：四步逐段结局 ＋ 新增更新合计 ＋ 本地远端分清，每步读数都在页上；
 * - 「这天没有安排」页（#943：这天／这段没有可落地的训练段，四步一步没跑——既不是成功也不是失败）。
 *
 * 显示口径（唯一定义地，别处引用）：时段空即默认 07:00~08:00／标题 `健身 段 时分`／
 * 备注前 3 动作 `、` 连接（`;` 不上屏）。宿主编排（`land.ts`）与本页用同一套，不另起第二份。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { promptCopyArea } from '../shared/copyArea.js';
import { copyBlock } from '../shared/copyBlock.js';
import type { PlanSessionRow } from './planStore.js';
import { xunjiKeyRow } from './xunjiKey.js';
import { m } from '../entries/index.js';

const DOC_TITLE = (): string => m('skill-calorie.workout-landPages.c085');

/** 四步里一步的结局（编排层给，页层只摆不算）。 */
export interface LandStepRead {
  readonly step: string;
  readonly code: number;
  readonly local: string;
  readonly remote: string;
  readonly detail: string;
}

/** 会话时段（库内可空；空即按段序号顺延默认，保证合成写三元组不撞键，页上如实标时间）。 */
export function landSpanOf(s: PlanSessionRow, index = 0): { ts: string; te: string } {
  if (typeof s.time_start === 'string' && s.time_start !== '' && typeof s.time_end === 'string' && s.time_end !== '') {
    return { ts: s.time_start, te: s.time_end };
  }
  const hour = 7 + index * 2;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return { ts: pad(hour) + ':00', te: pad(hour + 1) + ':00' };
}

/** 日历标题与心愿正文（同题同文，老 `sync_plan.py:163` 与 `:210` 同形，连接符照老短横）。 */
export function landTitleOf(s: PlanSessionRow, index = 0): string {
  const { ts, te } = landSpanOf(s, index);
  return m('skill-calorie.workout-landPages.c001', { p0: String(s.session_label), p1: String(ts), p2: String(te) });
}

/** 前 3 个动作用 `、` 连接（老 `; ` 改形状：`;` 不上屏）。 */
export function landNotesOf(s: PlanSessionRow): string {
  return (s.movements ?? []).slice(0, 3).map((mv) => m('skill-calorie.workout-landPages.c002', { p0: String(mv.name ?? '') })).join('、');
}

/** 实跑命令原文（过程页首位可复制 prompt：照抄即跑同一天，单引号包 JSON 照本仓一贯口径）。 */
export function landRealCommand(date: string): string {
  return 'calorie-cmd-read calorie.workout.land --params \'{"date":"' + date + '"}\'';
}

/** 过程页（`dryRun`）：可复制 prompt 先出 ＋ 四步预告；远端未调用写在页头。 */
export function buildLandProcessPage(input: {
  key: string; params: Record<string, unknown>; date: string;
  sessions: readonly PlanSessionRow[]; receipt: CrudReceipt; startDate: string | null;
}): string {
  const { key, params, date, sessions, receipt, startDate } = input;
  const moves = sessions.reduce((n, s) => n + (Array.isArray(s.movements) ? s.movements.length : 0), 0);
  const startText = startDate ?? m('skill-calorie.workout-landPages.c003');
  const emptyWhy = m('skill-calorie.workout-landPages.c004', { p0: String(startText) });
  const content = [
    promptCopyArea(landRealCommand(date), m('skill-calorie.workout-landPages.c005')),
    renderKpiGrid([
      { label: m('skill-calorie.workout-landPages.c006'), value: date, detail: m('skill-calorie.workout-landPages.c007') },
      {
        label: m('skill-calorie.workout-landPages.c008'), value: m('skill-calorie.workout-landPages.c009', { p0: String(sessions.length) }),
        detail: sessions.map((s) => s.session_label).join('、') || m('skill-calorie.workout-landPages.c010'),
      },
      { label: m('skill-calorie.workout-landPages.c011'), value: m('skill-calorie.workout-landPages.c012', { p0: String(moves) }), detail: m('skill-calorie.workout-landPages.c013') },
    ]),
    renderDataTable({
      columns: [{ key: 'label', label: m('skill-calorie.workout-landPages.c014') }, { key: 'time', label: m('skill-calorie.workout-landPages.c015') }, { key: 'moves', label: m('skill-calorie.workout-landPages.c016') }],
      rows: sessions.length === 0
        ? [{ label: m('skill-calorie.workout-landPages.c017'), time: m('skill-calorie.workout-landPages.c018'), moves: emptyWhy }]
        : sessions.map((s, i) => {
          const { ts, te } = landSpanOf(s, i);
          return {
            label: s.session_label,
            time: m('skill-calorie.workout-landPages.c019', { p0: String(ts), p1: String(te) }),
            moves: s.movements.map((mv) => mv.name ?? m('skill-calorie.workout-landPages.c020')).join('、') || m('skill-calorie.workout-landPages.c021'),
          };
        }),
      caption: m('skill-calorie.workout-landPages.c022'),
    }),
    renderDataTable({
      columns: [{ key: 'content', label: m('skill-calorie.workout-landPages.c023') }, { key: 'due', label: m('skill-calorie.workout-landPages.c024') }],
      rows: sessions.length === 0
        ? [{ content: m('skill-calorie.workout-landPages.c025'), due: m('skill-calorie.workout-landPages.c026') }]
        : sessions.map((s, i) => ({ content: landTitleOf(s, i), due: date })),
      caption: m('skill-calorie.workout-landPages.c027'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-landPages.c028') }, { key: 'v', label: m('skill-calorie.workout-landPages.c029') }],
      rows: [
        { k: m('skill-calorie.workout-landPages.c030'), v: m('skill-calorie.workout-landPages.c031', { p0: String(sessions.length) }) },
        { k: m('skill-calorie.workout-landPages.c032'), v: m('skill-calorie.workout-landPages.c033', { p0: String(date) }) },
        { k: m('skill-calorie.workout-landPages.c034'), v: m('skill-calorie.workout-landPages.c035', { p0: String(sessions.length) }) },
        { k: m('skill-calorie.workout-landPages.c036'), v: m('skill-calorie.workout-landPages.c037') },
        xunjiKeyRow(),
        { k: m('skill-calorie.workout-landPages.c038'), v: m('skill-calorie.workout-landPages.c039') },
      ],
      caption: m('skill-calorie.workout-landPages.c040'),
    }),
    copyBlock(key, params, receipt, m('skill-calorie.workout-landPages.c041')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-landPages.c042'),
    eyebrow: m('skill-calorie.workout-landPages.c043'),
    subtitle: m('skill-calorie.workout-landPages.c044'),
    content,
    pageUi: true,
  });
}

/** 结果页：四步逐段结局 ＋ 本地远端分清，每步读数都在页上。 */
export function buildLandResultPage(input: {
  key: string; params: Record<string, unknown>; date: string;
  sessions: readonly PlanSessionRow[]; steps: readonly LandStepRead[];
  message: string; receipt: CrudReceipt; stubbed: boolean;
}): string {
  const { key, params, date, steps, receipt, stubbed } = input;
  const find = (name: string): LandStepRead | null => steps.find((s) => s.step === name) ?? null;
  const plan = find(m('skill-calorie.workout-landPages.c045'));
  const wish = find(m('skill-calorie.workout-landPages.c046'));
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-landPages.c047'), value: date, detail: m('skill-calorie.workout-landPages.c048') },
      { label: m('skill-calorie.workout-landPages.c049'), value: plan === null ? m('skill-calorie.workout-landPages.c050') : plan.local, detail: plan === null ? '' : plan.remote },
      { label: m('skill-calorie.workout-landPages.c051'), value: wish === null ? m('skill-calorie.workout-landPages.c052') : wish.local, detail: wish === null ? '' : wish.remote },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: m('skill-calorie.workout-landPages.c053') }, { key: 'local', label: m('skill-calorie.workout-landPages.c054') }, { key: 'remote', label: m('skill-calorie.workout-landPages.c055') }],
      rows: steps.map((s) => ({ step: s.step, local: s.local, remote: s.remote })),
      caption: m('skill-calorie.workout-landPages.c056'),
    }),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-landPages.c057') }, { key: 'v', label: m('skill-calorie.workout-landPages.c058') }],
      rows: [
        { k: m('skill-calorie.workout-landPages.c059'), v: m('skill-calorie.workout-landPages.c060') },
        { k: m('skill-calorie.workout-landPages.c061'), v: m('skill-calorie.workout-landPages.c062') },
        { k: m('skill-calorie.workout-landPages.c063'), v: m('skill-calorie.workout-landPages.c064') },
        ...(stubbed ? [{ k: m('skill-calorie.workout-landPages.c065'), v: m('skill-calorie.workout-landPages.c066') }] : []),
      ],
      caption: m('skill-calorie.workout-landPages.c067'),
    }),
    copyBlock(key, params, receipt, m('skill-calorie.workout-landPages.c068')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: m('skill-calorie.workout-landPages.c069'),
    eyebrow: m('skill-calorie.workout-landPages.c070'),
    subtitle: m('skill-calorie.workout-landPages.c071'),
    content,
    pageUi: true,
  });
}

/** 「这天没有安排」页（#943 第三选项）：无事可做那一态——说明为什么、下一步去哪，要跑的那几步标「没跑」。
 *  与过程页／结果页都不同：过程页是「预演（只看不写）」，结果页是「四步都跑了」；本页是**一步没跑**。
 *  落地三条键与「同步到训记」共用这一张页（同一件事一个形状）：两个格名由调用方给。 */
export function buildLandNothingPage(input: {
  key: string; params: Record<string, unknown>; wake: string; scope: string; why: string; receipt: CrudReceipt;
  /** 被数的那一格叫什么（落地链＝「可落地段」，训记推送＝「待推送段」）。 */
  readonly unitLabel: string;
  /** 这一族要跑的那几步在人话里叫什么（落地链＝「四步」，训记推送＝「推送」）。 */
  readonly stepLabel: string;
  /** 那一行「为什么」的行名（落地链＝「为什么没得落地」，训记推送＝「为什么没得推送」）。 */
  readonly whyLabel: string;
}): string {
  const { key, params, wake, scope, why, receipt, unitLabel, stepLabel, whyLabel } = input;
  const content = [
    renderKpiGrid([
      { label: m('skill-calorie.workout-landPages.c072'), value: scope, detail: m('skill-calorie.workout-landPages.c073') },
      { label: unitLabel, value: m('skill-calorie.workout-landPages.c074'), detail: m('skill-calorie.workout-landPages.c075') },
      { label: stepLabel, value: m('skill-calorie.workout-landPages.c076'), detail: m('skill-calorie.workout-landPages.c077') },
    ]),
    renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.workout-landPages.c078') }, { key: 'v', label: m('skill-calorie.workout-landPages.c079') }],
      rows: [
        { k: whyLabel, v: why },
        { k: m('skill-calorie.workout-landPages.c080'), v: m('skill-calorie.workout-landPages.c081') },
      ],
      caption: whyLabel,
    }),
    copyBlock(key, params, receipt, m('skill-calorie.workout-landPages.c082')),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE(),
    title: wake,
    eyebrow: m('skill-calorie.workout-landPages.c083'),
    subtitle: m('skill-calorie.workout-landPages.c084'),
    content,
    pageUi: true,
  });
}
