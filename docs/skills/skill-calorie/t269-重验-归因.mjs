#!/usr/bin/env node
/** #269 重验 · 红的归因（可复跑）。
 *
 * 用法：
 *   node docs/skills/skill-calorie/t269-重验-归因.mjs <node --test 日志> [--only-a=<A／B 差集件>] [--src=packages] [--out=…]
 *
 * 三类规则（机械可核，写进报告）：
 *   ① 归 #269      —— 只在「#269 生效」侧红。本脚本不猜：名单由 `--only-a` 显式传入
 *                      （取自 `t269-重验-reds.mjs --diff`），缺省即空集。
 *   ② 归别的线     —— 断言点名的字面量在当前源码树里**仍在**（判据没写错，是别处走散）。
 *   ③ 判据本身陈旧 —— 断言点名的字面量在当前源码树里**零命中**（判据要的东西设计已不再产出）。
 *   取不到字面量 ⇒ 记 `未分开`，不硬塞。
 *
 * 字面量来源三种断言形态：正则 `/X/`；`expected:`／`actual:` 标量；`+ actual - expected` 对比块。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const logPath = argv.find((a) => !a.startsWith('--'));
const argOf = (n, d) => {
  const hit = argv.find((a) => a.startsWith('--' + n + '='));
  return hit === undefined ? d : hit.slice(n.length + 3);
};
const ONLY_A = new Set(argOf('only-a', '').split(';').filter((s) => s !== ''));
const ROOTS = argOf('src', 'packages').split(';').filter((s) => s !== '');

const lines = readFileSync(logPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
const sum = {};
for (const l of lines) {
  const m = /^\u2139 (tests|pass|fail|skipped) (\S+)$/.exec(l.trim());
  if (m !== null) sum[m[1]] = m[2];
}

const blocks = [];
for (let i = 0; i < lines.length; i += 1) {
  const at = /^test at (.+?):(\d+):(\d+)$/.exec(lines[i].trim());
  if (at === null) continue;
  const title = /^\u2716 (.+?)(?: \([\d.]+ms\))?$/.exec((lines[i + 1] ?? '').trim());
  const body = [];
  for (let k = i + 2; k < lines.length && !/^test at /.test(lines[k].trim()); k += 1) body.push(lines[k]);
  blocks.push({
    file: at[1].replace(/\\/g, '/'),
    line: Number(at[2]),
    title: title === null ? '(未取到标题)' : title[1],
    assert: (body[0] ?? '').trim(),
    body,
  });
}

const cache = new Map();
function searchSrc(needle) {
  if (cache.has(needle)) return cache.get(needle);
  let hit = null;
  try {
    const o = execFileSync('rg', ['-F', '-n', '--no-heading', '-m', '1',
      '--glob', '**/src/**', '--glob', '!**/test/**', '--glob', '!**/*.test.*',
      '--', needle, ...ROOTS], { encoding: 'utf8' }).trim();
    if (o !== '') hit = o.split(/\r?\n/).find((l) => l.includes('/src/') || l.includes('\\src\\')) ?? null;
  } catch {
    outer: for (const root of ROOTS) {
      if (!existsSync(root)) continue;
      const stack = [root];
      while (stack.length > 0) {
        const d = stack.pop();
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') stack.push(p); continue; }
          if (!/\.(ts|tsx|mjs|js|json|md|yaml)$/.test(e.name)) continue;
          let t;
          try { t = readFileSync(p, 'utf8'); } catch { continue; }
          const at = t.indexOf(needle);
          if (at >= 0) { hit = p + ':' + (t.slice(0, at).split('\n').length); break outer; }
        }
      }
      if (hit !== null) break;
    }
  }
  cache.set(needle, hit);
  return hit;
}

/** 从块里取「判据要的」与「产品给的」两侧字面量。 */
function sides(b) {
  const want = new Set();
  const got = new Set();
  const pushTo = (set, s) => { const t = String(s).trim().replace(/^['"]|['"]$/g, ''); if (t.length >= 2 && !/^\d+$/.test(t)) set.add(t); };
  const joined = b.body.join('\n');
  const re = /did not match the regular expression \/(.+?)\//.exec(b.assert);
  if (re !== null && !re[1].includes('\\')) pushTo(want, re[1]);
  for (const m of b.assert.matchAll(/[「『]([^」』]+)[」』]/g)) pushTo(want, m[1]);
  let diff = false;
  for (const l of b.body) {
    if (/^\s*\+\s*actual\s*-\s*expected\s*$/.test(l)) { diff = true; continue; }
    const exp = /^\s*expected:\s*(.+?),?\s*$/.exec(l);
    if (exp !== null && !/^\w+$/.test(exp[1])) pushTo(want, exp[1]);
    const act = /^\s*actual:\s*(.+?),?\s*$/.exec(l);
    if (act !== null && !/^\w+$/.test(act[1])) pushTo(got, act[1]);
    if (diff) {
      const line = l.replace(/^\s+/, '');
      if (line.startsWith('+')) pushTo(got, line.slice(1));
      else if (line.startsWith('-')) pushTo(want, line.slice(1));
    }
  }
  if (/Expected values to be strictly equal/.test(joined) || /strictEqual|deepStrictEqual/.test(joined)) { /* 两侧已由标量／块取到 */ }
  return { want: [...want], got: [...got] };
}

const rows = [];
for (const b of blocks) {
  const key = b.file + ':' + b.line + '|' + b.title;
  const { want, got } = sides(b);
  let cls = '未分开';
  let why = '断言里取不到字面量（布尔／计数类）';
  if (ONLY_A.has(key)) { cls = '①'; why = 'A／B 差集：只在 #269 生效侧红'; }
  else if (want.length === 0) { cls = '未分开'; }
  else {
    const went = want.map((w) => [w, searchSrc(w)]);
    const gotAlive = got.map((g) => [g, searchSrc(g)]).filter(([, h]) => h !== null);
    const wantAlive = went.filter(([, h]) => h !== null);
    if (wantAlive.length === 0 && gotAlive.length > 0) {
      cls = '③';
      why = '判据要的字面量源码零命中，产品给的在源码里：' + gotAlive.map(([g, h]) => '「' + g + '」→ ' + h).join('；');
    } else if (wantAlive.length > 0) {
      cls = '②';
      why = '判据要的字面量源码仍在：' + wantAlive.map(([w, h]) => '「' + w + '」→ ' + h).join('；');
    } else { why = '两侧字面量都零命中，分不开'; }
  }
  rows.push({ ...b, body: undefined, cls, why, want, got });
}

console.log('日志 ' + logPath + '；摘要 ' + JSON.stringify(sum) + '；红 ' + rows.length + ' 条');
for (const cls of ['①', '②', '③', '未分开']) {
  const g = rows.filter((r) => r.cls === cls);
  if (g.length === 0) { console.log('== ' + cls + '  0 条'); continue; }
  console.log('== ' + cls + '  ' + g.length + ' 条');
  const byFile = new Map();
  for (const r of g) byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1);
  for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    console.log('   ' + String(n).padStart(3) + '  ' + f);
  }
  const s = g[0];
  console.log('   样例断言：' + s.file + ':' + s.line);
  console.log('     ' + s.assert);
  console.log('     依据：' + s.why);
}
const out = argOf('out', '');
if (out !== '') writeFileSync(out, JSON.stringify(rows, null, 1), 'utf8');
