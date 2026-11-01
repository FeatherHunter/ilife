// HELP 速查：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type ScheduleKey } from '../policy/index.js';
import { SCHEDULE_KEY_SHAPES } from '../render/index.js';
import { m } from '../entries/index.js';

export interface HelpHit { phrase: string; key: ScheduleKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { key: ScheduleKey; needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) {
      // 示例要**照抄即能跑**：每个槽位给一个真能过校验的样例值（数组槽位给数组，别给 "<值>"）。
      p[n] = n === 'id' ? 1
        : n === 'start' || n === 'end' || n === 'date' ? '2026-09-01'
          : n === 'dates' ? ['2026-09-21', '2026-09-22']
            : n === 'time_start' ? '09:00'
              : n === 'time_end' ? '10:00'
                : n === 'title' ? m('skill-schedule.help-lookup.c001')
                  : m('skill-schedule.help-lookup.c002');
    }
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

/** 每条命令一句话（HELP 速查那一列）。#1197：由模块级常量表改成函数——`m()` 只在渲染期取词。 */
function descs(): Record<string, string> {
  return {
    'schedule.record.today': m('skill-schedule.help-lookup.c003'),
    'schedule.record.range': m('skill-schedule.help-lookup.c004'),
    'schedule.record.detail': m('skill-schedule.help-lookup.c005'),
    'schedule.record.write': m('skill-schedule.help-lookup.c006'),
    'schedule.record.compare': m('skill-schedule.help-lookup.c007'),
    'schedule.plan.today': m('skill-schedule.help-lookup.c008'),
    'schedule.plan.write': m('skill-schedule.help-lookup.c009'),
    'schedule.help.lookup': m('skill-schedule.help-lookup.c010'),
  };
}

// 全量速查表（WAKE_TABLE 有几条就有几行）。
export function buildHelpLookup(): HelpHit[] {
  const descTable = descs();
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: SCHEDULE_KEY_SHAPES[e.key] || '??',
    cli: 'schedule-cmd-read ' + e.key + exampleParams(e),
    desc: descTable[e.key] || '',
  }));
}

export function lookupHelp(hits: HelpHit[], word: string): HelpHit[] {
  if (!word || !word.trim()) return hits;
  return hits.filter((h) => word.includes(h.phrase) || h.phrase.includes(word.trim()));
}
