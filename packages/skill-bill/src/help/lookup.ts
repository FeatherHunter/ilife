// HELP 速查：WAKE_TABLE 唯一上游（`src/triggers/wakeTable.ts`）；短语→key/cli/一句话。构建期注入 SKILL.md（scripts/build-help.mjs）。
import { WAKE_TABLE } from '../triggers/wakeTable.js';
import type { BillKey } from '../triggers/routeSpec.js';
import { BILL_KEY_SHAPES } from '../render/index.js';
import { m } from '../entries/index.js';
import type { SkillBillMessageId } from '../entries/index.js';

export interface HelpHit { phrase: string; key: BillKey; shape: string; cli: string; desc: string; }

function exampleParams(key: BillKey, e: { readonly needs?: readonly string[]; readonly carries?: readonly string[]; readonly preset?: Readonly<Record<string, unknown>> }): string {
  const p: Record<string, unknown> = { ...(e.preset || {}) };
  // B2：record.add 示例须可直跑——补最小槽位 category/amount/note（kind preset 仅路由提示，校验忽略未认的名字）。
  if (key === 'bill.record.add') {
    if (p.category === undefined) p.category = '餐饮';
    if (p.amount === undefined) p.amount = -35;
    if (p.note === undefined) p.note = m('skill-bill.help-lookup.c001');
  }
  // #1280 第 5 步：合并分类的 `from`／`to` 是**分类串**（不是账户名——同在下面的 `from`／`to` 兜底
  // 给的是转账那一对账户），示例取值换成分类写法，否则速查表那一行照抄会被 `validateCategory` 拦下。
  if (key === 'bill.category.merge') { p['from'] = m('skill-bill.help-lookup.c002'); p['to'] = '餐饮'; }
  // `carries` 与 `needs` 一样进示例：改记录／撤销／恢复的 `id` 不拦，但示例里要给出「这一格填哪」那一眼。
  for (const n of [...(e.needs || []), ...(e.carries || [])]) {
    if (p[n] === undefined) p[n] = n === 'id' ? 1 : n === 'date' ? '2026-09-06' : n === 'start' || n === 'end' ? '2026-09-01' : n === 'month' ? '2026-09' : n === 'amount' ? 35 : n === 'q' ? m('skill-bill.help-lookup.c003') : n === 'tag' ? '旅行' : n === 'category' ? '餐饮' : n === 'account' ? m('skill-bill.help-lookup.c004') : n === 'ledger' ? m('skill-bill.help-lookup.c005') : n === 'name' ? m('skill-bill.help-lookup.c006') : n === 'from' ? m('skill-bill.help-lookup.c007') : n === 'to' ? m('skill-bill.help-lookup.c008') : n === 'file' ? 'bills.csv' : m('skill-bill.help-lookup.c009');
  }
  const keys = Object.keys(p);
  return keys.length ? ' --params \'' + JSON.stringify(p) + '\'' : '';
}

// 速查表每行的命令说明（`HelpHit.desc`）：表里只放词条键，取词发生在渲染期（模块级中文字面量会在 import 时定死语言）。
const DESC_KEYS: Record<string, SkillBillMessageId> = {
  'bill.record.add': 'skill-bill.help-lookup.c010',
  'bill.record.update': 'skill-bill.help-lookup.c011',
  'bill.category.merge': 'skill-bill.help-lookup.c012',
  'bill.record.today': 'skill-bill.help-lookup.c013',
  'bill.record.range': 'skill-bill.help-lookup.c014',
  'bill.record.search': 'skill-bill.help-lookup.c015',
  'bill.record.detail': 'skill-bill.help-lookup.c016',
  'bill.analysis.overview': 'skill-bill.help-lookup.c017',
  'bill.analysis.compare': 'skill-bill.help-lookup.c018',
  'bill.analysis.trend': 'skill-bill.help-lookup.c019',
  'bill.goal.write': 'skill-bill.help-lookup.c020',
  'bill.goal.query': 'skill-bill.help-lookup.c021',
  'bill.account.write': 'skill-bill.help-lookup.c022',
  'bill.account.query': 'skill-bill.help-lookup.c023',
  'bill.link.submit': 'skill-bill.help-lookup.c024',
  'bill.setup.run': 'skill-bill.help-lookup.c025',
  'bill.help.lookup': 'skill-bill.help-lookup.c026',
};

// 全量速查表（77 短语：72 功能 + 4 HELP + 1 补齐）。
export function buildHelpLookup(): HelpHit[] {
  return WAKE_TABLE.map((e) => ({
    phrase: e.phrase,
    key: e.key,
    shape: BILL_KEY_SHAPES[e.key] || '??',
    cli: 'bill-cmd-read ' + e.key + exampleParams(e.key, e),
    desc: DESC_KEYS[e.key] === undefined ? '' : m(DESC_KEYS[e.key]),
  }));
}

export function lookupWake(hits: HelpHit[], word: string): HelpHit[] {
  return hits.filter((h) => word.includes(h.phrase));
}
