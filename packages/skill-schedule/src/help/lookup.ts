// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type ScheduleKey } from '../policy/index.js';
import { SCHEDULE_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: ScheduleKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { key: ScheduleKey; needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) {
      p[n] = n === 'id' ? 1 : n === 'start' || n === 'end' ? '2026-09-01' : n === 'date' ? '2026-09-01' : '<值>';
    }
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

const DESCS: Record<string, string> = {
  'schedule.record.today': '查单日作息（相对日期直写，缺省今天；初始化即开库）',
  'schedule.record.range': '区间汇总（一级时长 metrics；须 start/end 或 range/recentDays）',
  'schedule.record.detail': '单条详情（须 id；或 date 看首条）',
  'schedule.record.write': '记作息 op=add / 修正 op=amend（须 id）/ 写摘要 op=summary',
  'schedule.record.compare': '对比 kind=months/ranges/category/anomaly',
  'schedule.plan.today': '查日程（单日/多日/标题搜）',
  'schedule.plan.write': '商量预览/落盘/补/改/删/复盘/飞书同步（op 分流）',
  'schedule.help.lookup': 'HELP 现找（q 可空，不过滤即全表）',
};

// 全量速查表（WAKE_TABLE 有几条就有几行）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: SCHEDULE_KEY_SHAPES[e.key] || '??',
    cli: 'schedule-cmd-read ' + e.key + exampleParams(e),
    desc: DESCS[e.key] || '',
  }));
}

export function lookupHelp(hits: HelpHit[], word: string): HelpHit[] {
  if (!word || !word.trim()) return hits;
  return hits.filter((h) => word.includes(h.phrase) || h.phrase.includes(word.trim()));
}
