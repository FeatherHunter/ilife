/** 落地训练两页（HELP 场景 05「健身计划」下一级「落地训练」· 宿主独用）。
 *
 * 两态（同一命令，`dryRun` 分流）：
 * - 过程页（`dryRun`）：可复制 prompt 先出 ＋ 四步预告（待写日历段／待记心愿／待推送段／回写区间），
 *   远端未调用写在页头，不进任何子进程；
 * - 结果页：四步逐段结局 ＋ 新增更新合计 ＋ 本地远端分清，每步读数都在页上。
 *
 * 显示口径（唯一定义地，别处引用）：时段空即默认 07:00~08:00／标题 `健身 段 时分`／
 * 备注前 3 动作 `、` 连接（`;` 不上屏）。宿主编排（`land.ts`）与本页用同一套，不另起第二份。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { planCopyBlock } from './planCopyBlock.js';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyLog, promptCopyArea } from '../shared/copyArea.js';
import { commandLine } from '../shared/writeParts.js';
import type { PlanSessionRow } from './planStore.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划回执';

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
  return '健身 ' + s.session_label + ' ' + ts + '-' + te;
}

/** 前 3 个动作用 `、` 连接（老 `; ` 改形状：`;` 不上屏）。 */
export function landNotesOf(s: PlanSessionRow): string {
  return (s.movements ?? []).slice(0, 3).map((m) => (m.name ?? '') + '多组').join('、');
}

function envelopeOf(key: string, message: string): SerializableEnvelope {
  return {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key,
    data: { ok: true, message },
  };
}

function copyBlock(key: string, params: Record<string, unknown>, receipt: CrudReceipt, source: string): string {
  return planCopyBlock({
    envelope: envelopeOf(key, receipt.summary),
    log: copyLog({
      command: commandLine(key, params),
      source,
      m5Line: receipt.m5Line,
      actionAt: receipt.meta.actionAt,
      version: DOC_VERSION,
    }),
  });
}

/** 实跑命令原文（过程页首位可复制 prompt：照抄即跑同一天，单引号包 JSON 照本仓一贯口径）。 */
export function landRealCommand(date: string): string {
  return 'calorie-cmd-read calorie.workout.land --params \'{"date":"' + date + '"}\'';
}

/** 过程页（`dryRun`）：可复制 prompt 先出 ＋ 四步预告；远端未调用写在页头。 */
export function buildLandProcessPage(input: {
  key: string; params: Record<string, unknown>; date: string;
  sessions: readonly PlanSessionRow[]; receipt: CrudReceipt;
}): string {
  const { key, params, date, sessions, receipt } = input;
  const moves = sessions.reduce((n, s) => n + (Array.isArray(s.movements) ? s.movements.length : 0), 0);
  const content = [
    promptCopyArea(landRealCommand(date), '复制实跑指令'),
    renderKpiGrid([
      { label: '日期', value: date, detail: '落地哪一天的计划' },
      {
        label: '待落地段', value: sessions.length + ' 段',
        detail: sessions.map((s) => s.session_label).join('、') || '当天没排练',
      },
      { label: '动作', value: moves + ' 个', detail: '四步共用同一份段表' },
    ]),
    renderDataTable({
      columns: [{ key: 'label', label: '训练段' }, { key: 'time', label: '时间' }, { key: 'moves', label: '动作' }],
      rows: sessions.length === 0
        ? [{ label: '空天', time: '无', moves: '这天没排练，四步即过零段' }]
        : sessions.map((s, i) => {
          const { ts, te } = landSpanOf(s, i);
          return {
            label: s.session_label,
            time: ts + ' 至 ' + te,
            moves: s.movements.map((m) => m.name ?? '未命名动作').join('、') || '段内无动作',
          };
        }),
      caption: '待写日历段',
    }),
    renderDataTable({
      columns: [{ key: 'content', label: '心愿正文' }, { key: 'due', label: '排期日期' }],
      rows: sessions.length === 0
        ? [{ content: '空天', due: '无' }]
        : sessions.map((s, i) => ({ content: landTitleOf(s, i), due: date })),
      caption: '待记心愿',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '待推送', v: sessions.length + ' 段原样推送' },
        { k: '待回写', v: date + ' 往前 1 天' },
        { k: '本地', v: '计划已读 ' + sessions.length + ' 段' },
        { k: '远端', v: '未调用' },
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(key, params, receipt, '训练计划（workout_plans）＋ 四步预演'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '落地训练',
    eyebrow: '健身计划',
    subtitle: '过程页（预演：四步只看不写）',
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
  const plan = find('补计划');
  const wish = find('记心愿');
  const content = [
    renderKpiGrid([
      { label: '日期', value: date, detail: '落地哪一天的计划' },
      { label: '补计划', value: plan === null ? '未跑' : plan.local, detail: plan === null ? '' : plan.remote },
      { label: '记心愿', value: wish === null ? '未跑' : wish.local, detail: wish === null ? '' : wish.remote },
    ]),
    renderDataTable({
      columns: [{ key: 'step', label: '步骤' }, { key: 'local', label: '本地' }, { key: 'remote', label: '远端' }],
      rows: steps.map((s) => ({ step: s.step, local: s.local, remote: s.remote })),
      caption: '四步结局',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '重复补计划', v: '按日期加时段加标题认同一条，重复跑不翻倍' },
        { k: '重复记心愿', v: '同文同排期日认同一条，重复跑不翻倍' },
        { k: '重复回写', v: '按单号加类型加序号三列认同一行，重复拉只更新不翻倍' },
        ...(stubbed ? [{ k: '数据来源', v: '本地挡板（未调远端）' }] : []),
      ],
      caption: '重复跑口径',
    }),
    copyBlock(key, params, receipt, '训练计划（workout_plans）＋ 四步读数'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '落地训练',
    eyebrow: '健身计划',
    subtitle: '结果页',
    content,
    pageUi: true,
  });
}
