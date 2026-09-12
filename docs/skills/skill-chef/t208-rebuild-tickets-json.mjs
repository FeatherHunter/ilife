#!/usr/bin/env node
/**
 * 重建 docs/skills/skill-chef/map-chef-tickets.json。
 *
 * 起因：早前用 PowerShell 的 Set-Content 回写这份 JSON，既带进了 BOM，又把原有 11 条冲掉了。
 * 本脚本以 **GitHub 上的子议题**为权威源（号码＋标题），座次取自 tickets-draft.md 的顺序：
 * 票是按 1..N 依序建的，故子议题号码升序 ＝ 票序。
 *
 * 用法：node rebuild-tickets-json.mjs [--map 208]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const REPO = 'FeatherHunter/ilife';
const MAP = Number(process.argv[process.argv.indexOf('--map') + 1]) || 208;
const DRAFT = 'D:/ilife/.scratch/chef-help/draft/tickets-draft.md';
const OUT = 'D:/ilife/docs/skills/skill-chef/map-chef-tickets.json';

const ghJson = (...args) => JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) || '[]');

// ── 草稿：票序 ＋ 类型 ＋ 标题 ──
const raw = readFileSync(DRAFT, 'utf8').replace(/^\uFEFF/, '');
const draft = [...raw.matchAll(/^<!--\s*TICKET\s+(\d+)\s*\|\s*([a-z]+)\s*\|\s*(.+?)\s*-->\s*$/gm)].map((m) => ({
  n: Number(m[1]),
  type: m[2],
  title: m[3],
}));
draft.sort((a, b) => a.n - b.n);

// ── GitHub：子议题（权威号码与标题）──
const subs = ghJson('api', `repos/${REPO}/issues/${MAP}/sub_issues`, '--paginate').sort((a, b) => a.number - b.number);
if (subs.length !== draft.length) {
  console.error(`FAIL：子议题 ${subs.length} 个，草稿 ${draft.length} 张票——对不上，不写盘。`);
  process.exit(1);
}

const list = draft.map((t, i) => {
  const sub = subs[i];
  if (!sub) throw new Error(`票 ${t.n} 没有对应的子议题`);
  return { n: t.n, issue: sub.number, type: t.type, title: sub.title || t.title };
});

writeFileSync(OUT, JSON.stringify(list, null, 4) + '\n', 'utf8');
console.log(`已重建 ${OUT}`);
for (const t of list) console.log(`  票 ${String(t.n).padStart(2)} → #${t.issue}  [${t.type}]  ${t.title}`);

// 校验：标题与草稿是否一致（不一致只警告，以 GitHub 为准）
for (const t of list) {
  const d = draft.find((x) => x.n === t.n);
  if (d && d.title !== t.title) console.log(`  ⚠ 票 ${t.n} 标题与草稿不同（以 GitHub 为准）：\n     草稿：${d.title}\n     线上：${t.title}`);
}
