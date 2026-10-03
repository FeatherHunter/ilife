#!/usr/bin/env node
/** #1081 判据一二三 · 95 页 ok 总账核对器（判据件，不是评分表）。
 *
 * 用法：node docs/skills/skill-bill/1081-95check.mjs <总账.md>
 *
 * 三条判据（票面原文）：
 *   ① 总账 94 行（manifest kind=proto 95 件去重 1 行）、seq 无重复无遗漏 → 否则 exit 1 并点名缺哪个 seq；
 *   ② 每行 verdict ∈ {ok,不ok,未判}；conclusion 指向的件在盘上，且**只认本域结论件**（路径须 `docs/skills/skill-bill/` 开头——门只收不放）；不ok 行必须有 if-not-ok 票号且该票存在 → 否则 exit 1 并点名该行；
 *   ③ 全部 verdict ＝ ok 才 exit 0；否则 exit 1 并打印「未判 N 页／不ok M 页」。
 *
 * 行数 94 的口径（票面 2026-10-04 登记）：manifest 的 kind=proto 共 95 件，其中
 *   query/w09-查分类-v2.1.html 与 w09/w09-查分类-v2.2.html 是同一页两版、负责人批的是 v2.2 ⇒ 只算一行；
 *   w00-空态-查某天无记录 单列一行（不并入 w03）⇒ 95 − 1 ＝ 94。期望 seq 清单**从 manifest 现读**，不手抄。
 *
 * 退出码：0＝94 行全 ok；1＝任一判据不成立（逐条打 RED 并点名）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const ledgerArg = argv.find((a) => !a.startsWith('--'));
const skipTicketProbe = argv.includes('--no-ticket-probe');
if (!ledgerArg) { console.error('用法：node docs/skills/skill-bill/1081-95check.mjs <总账.md>'); process.exit(2); }
const LEDGER = resolve(ledgerArg);
if (!existsSync(LEDGER)) { console.error('RED 总账不在盘上：' + LEDGER); process.exit(1); }

/* ── 期望 seq：从 manifest 现读（去重那条写死为一个 rel，可核对） ── */
const DEDUPED = 'query/w09-查分类-v2.1.html';
const man = JSON.parse(readFileSync(join(HERE, 'proto', 'manifest.json'), 'utf8'));
const protos = man.items.filter((i) => i.kind === 'proto');
const expected = protos.filter((i) => i.rel !== DEDUPED).map((i) => ({ seq: basename(i.rel).match(/^([a-z][0-9][0-9])-/)[1], rel: i.rel }));
const EXPECTED_N = expected.length;
const DOMAINS = new Set(['query', 'write-receipt', 'analysis', 'acct', 'say', 'setup-help']);
const VERDICTS = new Set(['ok', '不ok', '未判']);

/* ── 解析总账：表头七列之后每一行一条 ── */
const text = readFileSync(LEDGER, 'utf8');
const lines = text.split(String.fromCharCode(10));
const rows = [];
const bad = [];
const RED = (s) => bad.push(s);
for (let n = 0; n < lines.length; n++) {
  const raw = lines[n];
  if (!/^\|\s*[a-z][0-9][0-9]\s*\|/.test(raw)) continue;
  const cells = raw.split('|').map((s) => s.trim());
  if (cells.length !== 9) { RED('行结构不是七列（第 ' + String(n + 1) + ' 行）：' + raw.slice(0, 60)); continue; }
  rows.push({ line: n + 1, seq: cells[1], domain: cells[2], proto: cells[3], impl: cells[4], verdict: cells[5], conclusion: cells[6], ifNotOk: cells[7] });
}

/* ── 判据① 行数与 seq ── */
const seen = new Map();
for (const r of rows) seen.set(r.seq, (seen.get(r.seq) ?? 0) + 1);
const dup = [...seen.entries()].filter(([, c]) => c > 1).map(([s]) => s);
const expectSet = new Set(expected.map((e) => e.seq));
const missing = expected.filter((e) => !seen.has(e.seq));
const extra = [...seen.keys()].filter((s) => !expectSet.has(s));
const countOk = rows.length === EXPECTED_N && dup.length === 0 && missing.length === 0 && extra.length === 0;

/* ── 判据② 字段合法 ＋ conclusion 在盘 ＋ 不ok 的去处票 ── */
const ticketExists = (n) => {
  const r = spawnSync('gh', ['issue', 'view', String(n), '-R', 'FeatherHunter/ilife', '--json', 'number'], { encoding: 'utf8' });
  return r.status === 0;
};
const fieldBad = [];
const conclMissing = [];
const notOkBad = [];
for (const r of rows) {
  if (!VERDICTS.has(r.verdict)) fieldBad.push(r.seq + '（verdict=' + r.verdict + '）');
  if (!DOMAINS.has(r.domain)) fieldBad.push(r.seq + '（domain=' + r.domain + '）');
  const m = r.conclusion.match(/(docs\/skills\/skill-bill\/[^\s（(；]+\.(?:md|json))/);
  if (!m) fieldBad.push(r.seq + '（conclusion 未给出结论件路径）');
  else if (!existsSync(join(resolve(HERE, '..', '..', '..'), m[1]))) conclMissing.push(r.seq + '（缺 ' + m[1] + '）');
  if (r.verdict === '不ok') {
    const t = r.ifNotOk.match(/#([0-9]+)/);
    if (!t) notOkBad.push(r.seq + '（不ok 但 if-not-ok 没有票号）');
    else if (!skipTicketProbe && !ticketExists(t[1])) notOkBad.push(r.seq + '（不ok 的去处票 #' + t[1] + ' 不存在）');
  }
}

/* ── 判据③ 终局：全 ok 才算可收 ── */
const byVerdict = { ok: 0, '不ok': 0, '未判': 0 };
for (const r of rows) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
const fieldOkN = rows.length - new Set(fieldBad.map((s) => s.split('（')[0])).size;
const conclOkN = rows.length - conclMissing.length;
const printable = (a, k) => a.slice(0, k).join('、') + (a.length > k ? ' …（共 ' + String(a.length) + ' 条）' : '');

console.log('SCAN: ' + LEDGER);
console.log('① 行数与 seq：实得 ' + String(rows.length) + ' 行／期望 ' + String(EXPECTED_N) + ' 行；seq 重复 ' + String(dup.length) + '、缺 ' + String(missing.length) + '、多 ' + String(extra.length));
if (!countOk) {
  if (rows.length !== EXPECTED_N) RED('① 行数不符：实得 ' + String(rows.length) + ' 行／期望 ' + String(EXPECTED_N) + ' 行（manifest kind=proto 95 件去重 1 行）');
  if (dup.length) RED('① seq 重复：' + printable(dup, 10));
  if (missing.length) RED('① 缺 seq：' + printable(missing.map((e) => e.seq), 10));
  if (extra.length) RED('① 多出未登记 seq：' + printable(extra, 10));
}
console.log('② 字段：verdict 合法 ' + String(fieldOkN) + '/' + String(rows.length) + '；conclusion 在盘 ' + String(conclOkN) + '/' + String(rows.length) + '；不ok 行 ' + String(byVerdict['不ok']));
if (fieldBad.length) RED('② 字段不合法：' + printable(fieldBad, 8));
if (conclMissing.length) RED('② conclusion 指向的件不在盘上（' + String(conclMissing.length) + ' 行）：' + printable(conclMissing, 8));
if (notOkBad.length) RED('② 不ok 行的去处票不成立：' + printable(notOkBad, 8));
console.log('③ 终局：ok ' + String(byVerdict.ok) + '/' + String(rows.length) + '；未判 ' + String(byVerdict['未判']) + '；不ok ' + String(byVerdict['不ok']));
for (const r of bad) console.log('RED ' + r);
if (!bad.length && byVerdict['未判'] === 0 && byVerdict['不ok'] === 0 && byVerdict.ok === rows.length) {
  console.log('RESULT: ' + String(rows.length) + ' 行；未判 0；不ok 0 → 本图可收');
  console.log('PASS: 总账 94 行、字段合法、结论件齐、逐页 ok');
  process.exit(0);
}
console.log('RESULT: 未判 ' + String(byVerdict['未判']) + ' 页／不ok ' + String(byVerdict['不ok']) + ' 页 → 不可收');
process.exit(1);
