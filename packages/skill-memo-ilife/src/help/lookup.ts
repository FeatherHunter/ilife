// HELP 速查（M6）：WAKE_TABLE 唯一上游；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE, type MemoKey } from '../triggers/wakewords.js';
import { MEMO_KEY_SHAPES } from '../render/index.js';

export interface HelpHit { phrase: string; key: MemoKey; shape: string; cli: string; desc: string; }

function exampleParams(e: { needs?: string[]; preset?: Record<string, unknown> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  for (const n of e.needs || []) {
    if (p[n] === undefined) {
      // #850：示例照 HELP 字段名（`start`／`end`／`remind_at`／`note_id`），月份形 `timeRange` 已退役（此处不留示例）。
      if (n === 'id') p[n] = '<id>';
      else if (n === 'start') p[n] = '2026-07-01';
      else if (n === 'end') p[n] = '2026-07-07';
      else if (n === 'remind_at') p[n] = '2026-10-01 09:00';
      else if (n === 'note_id') p[n] = '<id>';
      else if (n === 'remindAt') p[n] = '2026-10-01 09:00';
      // #828：`设提醒` 的必填槽位 `content`（老 `memo_cli.py:1116-1117`）——速查示例给一句人话，不出占位符。
      else if (n === 'content') p[n] = '取牛奶';
      else p[n] = '<值>';
    }
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

// 键 → 一句话（HELP 速查表「说明」列）。**键的类型取自生成的 `MemoKey`**：写错一个字编译期就红，
// 不靠人记（#855 复核提的门洞：此处原是手写字符串表，写第二份 `'memo.search': 'list'` 也无人拦）。
const DESCS: Partial<Record<MemoKey, string>> = {
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
  // #850：两新键一句话（HELP 场景主名唯一上游，命令只做 HELP 承诺的事）。
  'memo.init': '初始化报告（首次使用，只渲染不建库）',
  'memo.reminder': '给已有笔记加提醒（note_id 可选，不给即独立提醒）',
};
// 注（#760）：`memo.auth` 无唤醒词（「飞书授权」退役），故速查表不再有它这一行；诊断走
// `memo.auth --params '{"step":"status"}'`（只读）或面板「飞书 CLI」状态行。

// 全量速查表（31 短语：19 显式 ＋ 12 子唤醒词；#760 起「飞书授权」退役，故 31 里没有它）。
// 数法：本表＝`WAKE_TABLE` 逐行派生，行数就是词数（#855 复核实测 31；此前注释写的「28 短语：16 显式」是陈旧值）。
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
