#!/usr/bin/env node
/**
 * #765 第四轮机（收口前的最后三处）：把仍带占位与票序文件名的三张票修掉。
 *   票 12（#777）：`t<票号>-册子片段.json` 无法用一个数字表达（要并 7 张域票的片段）⇒ 写成显式清单。
 *   票 14（#818）：验收命令里的 `<票号>` ⇒ 写死三张受影响票的票号。
 *   票 15（#819）：`<本票号>` ⇒ 819；`t765-t15-*` ⇒ `t819-*`（票号口径）。
 *
 * 用法：node docs/skills/skill-chef/t765-v4.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'FeatherHunter/ilife';
const here = dirname(fileURLToPath(import.meta.url));
const saved = JSON.parse(readFileSync(join(here, 't765-tickets.json'), 'utf8').replace(/^\uFEFF/, ''));
const byN = new Map(saved.map((s) => [s.n, s.issue]));
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const read = (n) => readFileSync(join(here, `t765-t${n}-body.md`), 'utf8').replace(/^\uFEFF/, '');
const write = (n, t) => writeFileSync(join(here, `t765-t${n}-body.md`), t, 'utf8');

const FRAGMENTS = [5, 6, 7, 8, 9, 10, 11].map((n) => `t${byN.get(n)}-册子片段.json`).join('、');
const WRITE_SIDE = [8, 9, 10].map((n) => `#${byN.get(n)}`).join('／');

const EDITS = [
  { n: 12, find: 't<票号>-册子片段.json', replace: `册子片段（${FRAGMENTS}）`, marker: '册子片段（t770' },
  { n: 14, find: 'gh issue view <票号> --json body --jq .body', replace: `gh issue view ${WRITE_SIDE} --json body --jq .body`, marker: 'gh issue view #773' },
  { n: 15, find: '<本票号>', replace: String(byN.get(15)), marker: `--ticket ${byN.get(15)}` },
  { n: 15, find: 't765-t15-', replace: `t${byN.get(15)}-`, marker: `t${byN.get(15)}-db-check.mjs` },
];

const touched = new Set();
for (const e of EDITS) {
  const before = read(e.n);
  if (e.marker && before.includes(e.marker)) { console.log(`  票 ${e.n}：已处理过（跳过）`); continue; }
  const hits = before.split(e.find).length - 1;
  if (hits < 1) throw new Error(`票 ${e.n} 找不到锚点：${e.find}`);
  write(e.n, before.split(e.find).join(e.replace));
  touched.add(e.n);
  console.log(`  票 ${e.n}：把「${e.find}」换成「${e.replace}」（原样出现 ${hits} 处）`);
}

const problems = [];
for (const n of [...touched].sort((a, b) => a - b)) {
  const issue = byN.get(n);
  gh('issue', 'edit', String(issue), '--repo', REPO, '--body-file', join(here, `t765-t${n}-body.md`));
  const online = gh('issue', 'view', String(issue), '--repo', REPO, '--json', 'body', '--jq', '.body');
  if (online.includes('<票号>') || online.includes('<本票号>')) problems.push(`#${issue} 线上仍留占位`);
  if (online.includes('t765-t1')) problems.push(`#${issue} 线上仍留票序文件名 t765-t1x-`);
  console.log(`  #${issue} 推回 ok（${online.length} 字符）`);
}
if (!touched.size) console.log('  （无需推回）');
if (problems.length) {
  console.error('\nFAIL：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('PASS：三张票的占位与票序文件名已清。');
