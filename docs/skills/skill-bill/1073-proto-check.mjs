// #1073 物证冻结 · 件数核对脚本
//
// 判据：manifest 点名的每一件都在盘上、且 sha256 与入库时逐字节相同。
// 全绿 ⇒ 打印「N 件；缺失 0 -> 可发」并 exit 0；
// 任一件不在盘上、或内容被改过一个字节 ⇒ exit 1 并点名那份。
//
// sha256 在这里的用途**只有一个**：文件同一性（墙右栏展示的那份 HTML
// ＝ 入库的这一份）。它不是"落地还原"的判据——那是像素的事，见 proto/视觉基线.md。
//
// 用法：node docs/skills/skill-bill/1073-proto-check.mjs <proto目录> <manifest.json>
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const [protoArg, manifestArg] = process.argv.slice(2);
if (!protoArg || !manifestArg) {
  process.stderr.write('用法：node 1073-proto-check.mjs <proto目录> <manifest.json>\n');
  process.exit(2);
}
const PROTO = resolve(protoArg);
const MANIFEST = resolve(manifestArg);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const relOf = (p) => relative(PROTO, p).split('\\').join('/');

/* ── 清单自身的三条硬要求 ─────────────────────────────────────────────── */
if (!existsSync(MANIFEST)) { console.error(`RED: 清单不在盘上：${manifestArg}`); process.exit(1); }
const raw = readFileSync(MANIFEST);
if (raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) { console.error('RED: 清单带签名(BOM)'); process.exit(1); }
const text = raw.toString('utf8');
if (/,\s*[}\]]/.test(text)) { console.error('RED: 清单带尾逗号'); process.exit(1); }
let M;
try { M = JSON.parse(text); } catch (e) { console.error(`RED: 清单解析失败：${e.message}`); process.exit(1); }
if (!Array.isArray(M.items) || !M.items.length) { console.error('RED: 清单没有 items'); process.exit(1); }

/* ── 逐件核对 ─────────────────────────────────────────────────────────── */
const bad = [];
const seen = new Map();
for (const it of M.items) {
  if (!it.rel || !it.sha256) { bad.push(`条目 #${it.seq} 缺 rel 或 sha256`); continue; }
  if (seen.has(it.rel)) { bad.push(`清单里 rel 重复：${it.rel}`); continue; }
  seen.set(it.rel, it);
  const abs = join(PROTO, it.rel);
  if (!abs.startsWith(PROTO)) { bad.push(`条目 #${it.seq} 的 rel 越出 proto 目录：${it.rel}`); continue; }
  if (!existsSync(abs)) { bad.push(`不在盘上：${it.rel}`); continue; }
  const got = sha256(readFileSync(abs));
  if (got !== it.sha256) bad.push(`sha256 不符：${it.rel}（清单 ${it.sha256.slice(0, 12)}… / 盘上 ${got.slice(0, 12)}…）`);
}

/* ── 盘上多出来的件（清单没点名 ⇒ 不该在判地目录里）───────────────────── */
const fsMod = await import('node:fs');
const walk = (dir, out = []) => {
  for (const d of fsMod.readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else if (/\.html$/.test(d.name)) out.push(relOf(p));
  }
  return out;
};
const onDisk = existsSync(PROTO) ? walk(PROTO).sort() : [];
const extra = onDisk.filter((f) => !seen.has(f));
if (extra.length) bad.push(`盘上多出 ${extra.length} 件未登记：${extra.join('、')}`);

/* ── 件数：票面记的数（写在清单的 expect / expectDomains 里）──────────── */
const byKind = {}, byDomain = {};
for (const it of M.items) {
  byKind[it.kind] = (byKind[it.kind] ?? 0) + 1;
  if (it.kind === 'proto') byDomain[it.domain] = (byDomain[it.domain] ?? 0) + 1;
}
for (const [k, n] of Object.entries(M.expect ?? {})) {
  if ((byKind[k] ?? 0) !== n) bad.push(`件数不符：kind=${k} 实到 ${byKind[k] ?? 0} 件，票面记 ${n} 件`);
}
for (const [d, n] of Object.entries(M.expectDomains ?? {})) {
  if ((byDomain[d] ?? 0) !== n) bad.push(`件数不符：域 ${d} 实到 ${byDomain[d] ?? 0} 件，票面记 ${n} 件`);
}

/* ── 回执 ─────────────────────────────────────────────────────────────── */
const N = M.items.length;
const first = bad.length
  ? `${N} 件；缺 ${bad.length} 处 -> 不可发`
  : `${N} 件；缺失 0 -> 可发`;
console.log(first);
if (bad.length) for (const b of bad) console.log(`  RED: ${b}`);
console.log('  按 kind：' + Object.entries(byKind).sort().map(([k, v]) => `${k} ${v}`).join(' / '));
console.log('  proto 按域：' + Object.entries(byDomain).sort().map(([k, v]) => `${k} ${v}`).join(' / '));
console.log(`RESULT: ${bad.length ? 'FAIL' : 'PASS'} items=${N} proto=${byKind.proto ?? 0} bad=${bad.length}`);
process.exit(bad.length ? 1 : 0);
