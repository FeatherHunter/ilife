// HELP 速查（M6）：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type MemoKey } from '../policy/index.js';
import { MEMO_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: MemoKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) p[n] = n === 'id' ? '<id>' : n === 'timeRange' ? '2026-09' : n === 'remindAt' ? '2026-10-01' : '<值>';
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

const DESCS: Record<string, string> = {
  'memo.search': '搜笔记（关键词/CJK 子串，可按分类过滤）',
  'memo.detail': '看单条详情（须 id）',
  'memo.create': '记一条（含记提醒须 remindAt）',
  'memo.update': '更新笔记（须 id；完成心愿走 done）',
  'memo.remove': '删除（须 confirm；废弃提醒走 abandon 留笔记）',
  'memo.remind': '查提醒（含已完成）',
  'memo.wish': '心愿排期',
  'memo.sync': '飞书同步（须 lark 四门全绿）',
  'memo.batch': '批量改分类向导',
  'memo.stats': '聚合统计',
};

// 全量速查表（28 短语：16 显式 + 12 子唤醒词）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: MEMO_KEY_SHAPES[e.key] || '??',
    cli: 'memo-cmd-read ' + e.key + exampleParams(e),
    desc: DESCS[e.key] || '',
  }));
}

export function lookupWake(hits: HelpHit[], word: string): HelpHit[] {
  return hits.filter((h) => word.includes(h.phrase));
}
