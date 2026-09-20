#!/usr/bin/env node
/**
 * #765 修正：票面里的产物文件名按仓里惯例改用**票号**（`t208-`／`t369-` 那一套），
 * 不用票序。原因：票序 `t5-` 与票号 `#770` 混放，后手搜 `t770` 找不到件；
 * 同图草稿里也已出现 `t765-t5-body.md`（那是本图的草稿件，与产物件不是一类）。
 *
 * 做三件事：
 *   1. 读 t765-tickets.json 取「票序 → 票号」映射；
 *   2. 把 13 份正文里的 `skill-chef/t<票序>-` 改成 `skill-chef/t<票号>-`，
 *      并把 `<本票号>` 占位换成真票号；
 *   3. 用 `gh issue edit --body-file` 逐票推回，并逐票校验（不留 `<本票号>`、
 *      不残留旧 `t<票序>-` 引用），任一条对不上即非零退出。
 *
 * 草稿 t765-tickets-draft.md 同步按票序节替换，保持「草稿 ↔ 线上」一致。
 *
 * 用法：node docs/skills/skill-chef/t765-renumber.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const ticketsJsonPath = join(here, 't765-tickets.json');
const draftPath = join(here, 't765-tickets-draft.md');

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** 把一段正文里的「票序引用」换成「票号引用」。尾部那个 `-` 保证 `t1-` 不会误吃 `t10-`。 */
function renumber(text, n, issue) {
  return text
    .split(`skill-chef/t${n}-`).join(`skill-chef/t${issue}-`)
    .split('<本票号>').join(String(issue));
}

const saved = JSON.parse(readFileSync(ticketsJsonPath, 'utf8').replace(/^\uFEFF/, ''));
const byN = new Map(saved.map((s) => [s.n, s.issue]));
console.log(`票序 → 票号：${saved.map((s) => `${s.n}→#${s.issue}`).join('，')}`);

// ── 1. 逐票正文 ──
const changed = [];
for (const { n, issue } of saved) {
  const bodyPath = join(here, `t765-t${n}-body.md`);
  const before = readFileSync(bodyPath, 'utf8').replace(/^\uFEFF/, '');
  const after = renumber(before, n, issue);
  if (after !== before) {
    writeFileSync(bodyPath, after, 'utf8');
    changed.push(`t${n} #${issue}`);
  }
}
console.log(`正文已改：${changed.length === 0 ? '（无差异）' : changed.join('，')}`);

// ── 2. 逐票推回 ＋ 校验 ──
const problems = [];
for (const { n, issue } of saved) {
  const bodyPath = join(here, `t765-t${n}-body.md`);
  gh('issue', 'edit', String(issue), '--repo', REPO, '--body-file', bodyPath);
  const online = (gh('issue', 'view', String(issue), '--repo', REPO, '--json', 'body', '--jq', '.body') || '').replace(/^\uFEFF/, '');
  if (online.includes('<本票号>')) problems.push(`#${issue} 线上正文仍留 <本票号> 占位`);
  if (online.includes(`skill-chef/t${n}-`)) problems.push(`#${issue} 线上正文仍引用票序 t${n}-`);
  if (!online.includes(`skill-chef/t${issue}-`) && !['t1-形状.md'].some((s) => false)) {
    // 只有引用产物的票才有 t<票号>- 引用；这里只做「引用票序」的反向检查，正向不强制
  }
  console.log(`  #${issue} 推回 ＋ 校验：${online.includes('<本票号>') ? 'FAIL' : 'ok'}（${online.length} 字符）`);
}

// ── 3. 草稿同步 ──
const raw = readFileSync(draftPath, 'utf8').replace(/^\uFEFF/, '');
const sep = /^<!--\s*TICKET\s+(\d+)\s*\|\s*([a-z]+)\s*\|\s*(.+?)\s*-->\s*$/gm;
const marks = [...raw.matchAll(sep)];
let out = '';
let cursor = 0;
for (let i = 0; i < marks.length; i++) {
  const start = marks[i].index;
  const endOfHead = start + marks[i][0].length;
  const end = i + 1 < marks.length ? marks[i + 1].index : raw.length;
  const n = Number(marks[i][1]);
  const issue = byN.get(n);
  out += raw.slice(cursor, endOfHead) + renumber(raw.slice(endOfHead, end), n, issue);
  cursor = end;
}
out += raw.slice(cursor);
writeFileSync(draftPath, out, 'utf8');
console.log(`草稿已同步：${draftPath}`);

if (problems.length) {
  console.error('\nFAIL：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('\nPASS：13 张票的正文引用已从票序改为票号，线上无占位残留。');
