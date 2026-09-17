/** 批量落地两页（HELP 场景 05「健身计划」下一级「落地训练」· 批量宿主独用）。
 *
 * 两态（同一命令，`dryRun` 分流，与单日链同形）：
 * - 过程页（`dryRun`）：可复制实跑指令先出 ＋ 逐天待落地表（日期／段／动作）＋
 *   待推送／待回写天数，远端未调用写在页头，不进任何子进程；
 * - 结果页：逐天结局表（日期／结局／说明）＋ 推送回写天数合计 ＋ 本地远端分清。
 *
 * 显示口径与单日链同源：逐天表直接摆计划行（段标签／动作名原文，不另算）；
 * 天数口径唯一定义地在 `landBatch.ts#batchDates`，本页只摆不算。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { planCopyBlock } from '../render/planCopyBlock.js';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyLog, promptCopyArea } from '../shared/copyArea.js';
import { commandLine } from '../shared/writeParts.js';
import type { PlanSessionRow } from './planStore.js';
import type { LandBatchSummary } from './landBatch.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·健身计划回执';

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

/** 实跑命令原文（过程页首位可复制 prompt：照抄即跑同一批，单引号包 JSON 照本仓一贯口径）。 */
export function landBatchRealCommand(key: string, anchor: string): string {
  return 'calorie-cmd-read ' + key + ' --params \'{"date":"' + anchor + '"}\'';
}

/** 过程页（`dryRun`）：可复制实跑指令先出 ＋ 逐天待落地表；远端未调用写在页头。 */
export function buildLandBatchProcessPage(input: {
  key: string; params: Record<string, unknown>; wake: string; scopeLabel: string; anchor: string;
  dates: readonly string[]; perDay: readonly { date: string; sessions: readonly PlanSessionRow[] }[];
  receipt: CrudReceipt;
}): string {
  const { key, params, wake, scopeLabel, anchor, dates, perDay, receipt } = input;
  const segs = perDay.reduce((n, d) => n + d.sessions.length, 0);
  const end = dates[dates.length - 1] ?? anchor;
  const content = [
    promptCopyArea(landBatchRealCommand(key, anchor), '复制实跑指令'),
    renderKpiGrid([
      { label: '范围', value: anchor + ' 至 ' + end, detail: '落地到' + scopeLabel },
      { label: '待落地天', value: dates.length + ' 天', detail: '逐天复用单日链' },
      { label: '待落地段', value: segs + ' 段', detail: '多天共用同一份段表' },
    ]),
    renderDataTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'segs', label: '训练段' }, { key: 'moves', label: '动作' }],
      rows: perDay.map((d) => ({
        date: d.date,
        segs: d.sessions.length === 0 ? '空天' : d.sessions.map((s) => s.session_label).join('、'),
        moves: d.sessions.length === 0
          ? '这天没排练，单日链即过零段'
          : d.sessions.map((s) => s.movements.map((m) => m.name ?? '未命名动作').join('、')).join('｜') || '段内无动作',
      })),
      caption: '逐天待落地表',
    }),
    renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '待推送', v: dates.length + ' 天逐天原样推送' },
        { k: '待回写', v: dates.length + ' 天与推送同一份天数' },
        { k: '本地', v: '计划已读 ' + segs + ' 段' },
        { k: '远端', v: '未调用' },
      ],
      caption: '本地成远端没成分得清',
    }),
    copyBlock(key, params, receipt, '训练计划（workout_plans）＋ 批量预演'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: wake,
    eyebrow: '健身计划',
    subtitle: '过程页（预演：' + dates.length + ' 天只看不写）',
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
    if (read === undefined) return '未跑';
    if (read.ok) return '第 ' + read.index + ' 天已过' + (read.stubbed ? '（挡板）' : '');
    return '第 ' + read.index + ' 天失败';
  };
  const content = [
    renderKpiGrid([
      { label: '范围', value: summary.start + ' 至 ' + summary.end, detail: '落地到' + scopeLabel },
      { label: '推送', value: summary.pushDays + ' 天', detail: '与回写同一份天数' },
      { label: '回写', value: summary.backfillDays + ' 天', detail: '逐天单日链同源' },
    ]),
    renderDataTable({
      columns: [{ key: 'date', label: '日期' }, { key: 'done', label: '结局' }, { key: 'note', label: '说明' }],
      rows: summary.dates.map((date) => ({
        date,
        done: summary.reads.some((r) => r.date === date && r.ok) ? '已落地' : '失败',
        note: dayDetail(date),
      })),
      caption: '逐天结局',
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
    copyBlock(key, params, receipt, '训练计划（workout_plans）＋ 批量读数'),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: wake,
    eyebrow: '健身计划',
    subtitle: '结果页',
    content,
    pageUi: true,
  });
}
