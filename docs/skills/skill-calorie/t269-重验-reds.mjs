#!/usr/bin/env node
/** #269 重验 · 红件清单抽取（可复跑）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t269-重验-reds.mjs <日志…>            # 打印每份日志的红件
 *   node docs/skills/skill-calorie/t269-重验-reds.mjs --diff A.log B.log # 打两份日志的红件差集
 *   node docs/skills/skill-calorie/t269-重验-reds.mjs --json <日志>      # 机器可读整份
 *
 * 解析对象＝Node 自带 reporter（`pnpm test` 走 `node --test`）的两段：
 *   ① 末尾摘要 `ℹ tests / pass / fail / skipped`；
 *   ② `✖ failing tests:` 之后每条 `test at <文件>:<行>:<列>` ＋ 下一行 `✖ 标题 (Nms)` ＋ 再一行断言行。
 * 红件集合的键＝`<文件>:<行>|<标题>`，两份日志可比。
 */
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const wantJson = argv.includes('--json');
const wantDiff = argv.includes('--diff');
const files = argv.filter((a) => !a.startsWith('--'));

function parse(path) {
  const head = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = head.split(/\r?\n/);
  const sum = {};
  for (const l of lines) {
    const m = /^\u2139 (tests|pass|fail|skipped|cancelled|todo|duration_ms) (\S+)$/.exec(l.trim());
    if (m !== null) sum[m[1]] = m[2];
  }
  const reds = [];
  for (let i = 0; i < lines.length; i += 1) {
    const at = /^test at (.+?):(\d+):(\d+)$/.exec(lines[i].trim());
    if (at === null) continue;
    const title = /^\u2716 (.+?)(?: \([\d.]+ms\))?$/.exec((lines[i + 1] ?? '').trim());
    const where = at[1].replace(/\\/g, '/');
    reds.push({
      file: where,
      line: Number(at[2]),
      title: title === null ? '(未取到标题)' : title[1],
      assert: (lines[i + 2] ?? '').trim(),
    });
  }
  return { log: path, sum, reds };
}

function byFile(reds) {
  const m = new Map();
  for (const r of reds) m.set(r.file, (m.get(r.file) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const parsed = files.map(parse);

if (wantDiff && parsed.length === 2) {
  const [a, b] = parsed;
  const key = (r) => r.file + ':' + r.line + '|' + r.title;
  const sa = new Set(a.reds.map(key));
  const sb = new Set(b.reds.map(key));
  const onlyA = a.reds.filter((r) => !sb.has(key(r)));
  const onlyB = b.reds.filter((r) => !sa.has(key(r)));
  console.log('A=' + a.log + ' 红 ' + a.reds.length + '（' + JSON.stringify(a.sum) + '）');
  console.log('B=' + b.log + ' 红 ' + b.reds.length + '（' + JSON.stringify(b.sum) + '）');
  console.log('只在 A 红（' + onlyA.length + '）：');
  for (const r of onlyA) console.log('  ' + r.file + ':' + r.line + '  ' + r.title);
  console.log('只在 B 红（' + onlyB.length + '）：');
  for (const r of onlyB) console.log('  ' + r.file + ':' + r.line + '  ' + r.title);
  process.exit(0);
}

for (const p of parsed) {
  if (wantJson) {
    console.log(JSON.stringify({ ...p, byFile: byFile(p.reds) }, null, 2));
    continue;
  }
  console.log('== ' + p.log);
  console.log('   摘要 ' + JSON.stringify(p.sum) + '；红件条目 ' + p.reds.length);
  for (const [f, n] of byFile(p.reds)) console.log('   ' + String(n).padStart(3) + '  ' + f);
}
