#!/usr/bin/env node
/** #1081 · 终局复跑器（入仓，随票走）：一条命令在**冻结快照**上把五面墙重出并打全终局读数。
 *
 * 为什么要有它：负责人只做一次人眼终验，那一刻不能靠 .scratch 里的临时件（#1079 的教训＝渲染器不在仓 ⇒ 墙重建不了）。
 *
 * 七段：① 五面真跑（各面入仓渲染器 → 产物＋manifest）；② 五面墙重建（各面入仓墙生成器，墙与产物**同目录**，iframe 相对路径才落得到）；
 *   ③ 逐面数 格数／iframe／lazy（懒加载＝0 是硬读数）；④ 1081-页族总检 94 行读数；⑤ 两包全量测试逐条 tests/pass/fail（base-render 另给「并行 vs 单跑」两行）；
 *   ⑥ 五面墙 sha256 表；⑦ 末行 RESULT 汇总（哪些绿、哪些红并点名），并把全部读数落 docs/skills/skill-bill/1081-终局复跑读数.md。
 *
 * 用法（仓根）：node docs/skills/skill-bill/1081-终局复跑.mjs [--out .scratch/1081-终局] [--no-tests]
 * 期望格数**不手抄**：逐面从各墙生成器源码读它自己的 `EXPECTED`（读不到则读该面样本集的条目数），只报「实测 vs 该生成器 EXPECTED」。
 * 红线：只写 --out 目录（预演一律 .scratch/1081-终局/，**不覆盖 canonical 墙**）；不碰 packages/**、不改原型、不重录指纹账本。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const OUT = resolve(ROOT, argOf('--out', '.scratch/1081-终局'));
const SKIP_TESTS = argv.includes('--no-tests');
const D = join(ROOT, 'docs', 'skills', 'skill-bill');
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const run = (args, label) => {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
  const lines = String(r.stdout ?? '').split(/\r?\n/);
  const tail = lines.map((s) => s.trim()).filter(Boolean).slice(-1)[0] ?? '';
  const res = lines.map((s) => s.trim()).filter((s) => s.startsWith('RESULT')).slice(-1)[0] ?? '';
  return { status: r.status, tail, res, out: String(r.stdout ?? ''), stderr: String(r.stderr ?? '').slice(-300) };
};

const FACES = [
  { id: 'query', cn: '查询域 17 页', renderer: '1074-query-渲染17页.mjs', wall: '1074-query-验收墙.mjs', wallName: 'compare-query.html', samples: null },
  { id: 'write', cn: '写入域 16 页', renderer: '1117-write-渲染16页.mjs', wall: '1117-write-验收墙.mjs', wallName: 'compare-write.html', samples: '1117-write-样本集.json' },
  { id: 'analysis', cn: '分析域 25 页', renderer: '1076-analysis-渲染25页.mjs', wall: '1076-analysis-验收墙.mjs', wallName: 'compare-analysis.html', samples: null },
  { id: 'acct', cn: '账户与目标域 13 页', renderer: '1118-acct-渲染13页.mjs', wall: '1118-acct-验收墙.mjs', wallName: 'compare-acct.html', samples: null, rendererOut: '.scratch/1118-acct' },
  { id: 'say', cn: 'SAY 采集 16 页', renderer: '1079-say-渲染16页.mjs', wall: '1079-say-验收墙.mjs', wallName: 'wall.html', samples: '1079-say-样本集.json' },
];

/** 期望格数：读墙生成器自己的 EXPECTED；读不到再退到该面样本集条目数。**不手抄**。 */
function expectedOf(f) {
  const src = readFileSync(join(D, f.wall), 'utf8');
  const m = src.match(/EXPECTED\s*=\s*(\d+)/);
  if (m) return { n: Number(m[1]), from: 'EXPECTED@' + f.wall };
  if (f.samples) {
    const j = JSON.parse(readFileSync(join(D, f.samples), 'utf8'));
    const n = (j.items ?? j.rows ?? []).length;
    if (n > 0) return { n, from: 'items@' + f.samples };
  }
  return { n: null, from: '（该生成器没有 EXPECTED，也没有可读样本集）' };
}

const log = [];
const say = (s) => { log.push(s); console.log(s); };
mkdirSync(OUT, { recursive: true });
say('# #1081 终局复跑读数（预演）');
say('');
say('- 生成时刻：' + new Date().toISOString());
say('- 产出目录：`' + OUT.replace(ROOT + '\\', '').split('\\').join('/') + '`（预演：**不覆盖** canonical 墙）');
say('- 提交：' + spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim());
say('- `cmd_read.js` sha256：`' + sha256(join(ROOT, 'packages/skill-bill/dist/cli/cmd_read.js')) + '`');
say('');
say('## ① 五面真跑 ＋ ② 五面墙重建 ＋ ③ 格数／iframe／lazy');
say('');
say('| 面 | 渲染器 RESULT | 墙 | 实测格数 | 期望格数（来源） | iframe | lazy | 墙 sha256（前 16） |');
say('|---|---|---|---|---|---|---|---|');
const faceRows = [];
let bad = 0;
for (const f of FACES) {
  const outDir = join(OUT, f.id);
  mkdirSync(outDir, { recursive: true });
  // 渲染器 CLI 不一：能给 --out 的按 --out 落预览目录；1118-acct 那支没有 CLI（OUT 硬编码在件里），
  // 于是它写回自己的默认产物目录，本器把产物**复制**进预览目录再用（墙与产物必须同目录，iframe 相对路径才落得到）。
  const r1 = run(f.rendererOut === undefined ? [join(D, f.renderer), '--out', outDir] : [join(D, f.renderer)], f.id + ' 渲染');
  if (f.rendererOut !== undefined) {
    const srcDir = join(ROOT, f.rendererOut);
    for (const n of readdirSync(srcDir)) if (n.endsWith('.html') || n.endsWith('.json')) copyFileSync(join(srcDir, n), join(outDir, n));
  }
  const wallArgs = f.id === 'say'
    ? [join(D, f.wall), '--products', outDir, '--out', join(outDir, f.wallName), '--width', '390']
    : [join(D, f.wall), outDir, f.wallName];
  const r2 = run(wallArgs, f.id + ' 墙');
  const wallPath = join(outDir, f.wallName);
  const html = existsSync(wallPath) ? readFileSync(wallPath, 'utf8') : '';
  const cells = (html.match(/<figure data-seq=/g) || []).length || (html.match(/<section class="cell"/g) || []).length;
  const iframes = (html.match(/<iframe/g) || []).length;
  const lazy = html.split('loading="lazy"').length - 1;
  const exp = expectedOf(f);
  const problems = [];
  if (r1.status !== 0) problems.push('渲染 exit=' + String(r1.status) + '｜' + (r1.stderr || '（无 stderr）'));
  if (r2.status !== 0) problems.push('墙 exit=' + String(r2.status) + '｜' + (r2.stderr || '（无 stderr）'));
  if (exp.n !== null && cells !== exp.n) problems.push('格数 ' + String(cells) + ' != EXPECTED ' + String(exp.n));
  if (lazy !== 0) problems.push('lazy iframe ' + String(lazy) + ' 处');
  if (iframes === 0) problems.push('iframe 0 个');
  if (problems.length) bad += 1;
  const sha = existsSync(wallPath) ? sha256(wallPath).slice(0, 16) : '（墙未落盘）';
  say('| ' + f.cn + ' | ' + (r1.tail || '（无 RESULT 行）') + ' | ' + f.wallName + ' | **' + String(cells) + '** | ' + String(exp.n) + '（' + exp.from + '） | ' + String(iframes) + ' | ' + String(lazy) + ' | `' + sha + '` |');
  faceRows.push({ ...f, cells, exp, iframes, lazy, sha, problems, outDir, wallPath });
}
say('');
say('（iframe 期望＝格数 × 2：每格左右／上下两张；lazy 必须 0——#1079 踩过「下半墙永远空白」。）');
say('');
say('## ④ 页族总检（`1081-页族总检.mjs`，94 行）');
say('');
mkdirSync(join(OUT, '页族'), { recursive: true });
// 总检器的 `--out` 会 `join(ROOT, 传入值)` ⇒ 只能喂**相对仓根**的路径（给绝对路径会拼成 D:\ilife\D:\ilife\… 而 ENOENT）。
const zongRel = relative(ROOT, join(OUT, '页族')).split('\\').join('/');
const zong = run([join(D, '1081-页族总检.mjs'), '--out', zongRel], '页族总检');
const failNames = (out) => String(out).split(/\r?\n/).map((s) => s.trim()).filter((s) => s.startsWith('✖ ')).slice(0, 5);
say('```');
say('node docs/skills/skill-bill/1081-页族总检.mjs --out .scratch/1081-终局/页族');
say('  ' + (zong.res || zong.tail || '（无 RESULT 行）') + '   exit=' + String(zong.status));
if (zong.status !== 0) say('  stderr：' + (zong.stderr || '（无）'));
say('```');
say('');
say('## ⑤ 两包全量测试（逐条 tests/pass/fail）');
say('');
const suites = [];
if (!SKIP_TESTS) {
  const sb = run(['--test', 'packages/skill-bill/test/*.test.mjs'], 'skill-bill 全量');
  const sbLog = String(spawnSync(process.execPath, ['--test', 'packages/skill-bill/test/*.test.mjs'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '');
  const g = (k) => (sbLog.match(new RegExp('ℹ ' + k + ' (\\d+)')) ?? [])[1] ?? '?';
  suites.push(['skill-bill 全量（并行）', g('tests'), g('pass'), g('fail'), failNames(sbLog).join('；')]);
  const br = String(spawnSync(process.execPath, ['--test', 'packages/base-render/test/*.test.mjs'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '');
  const gb = (k) => (br.match(new RegExp('ℹ ' + k + ' (\\d+)')) ?? [])[1] ?? '?';
  suites.push(['base-render 全量（并行）', gb('tests'), gb('pass'), gb('fail'), failNames(br).join('；')]);
  const one = String(spawnSync(process.execPath, ['--test', 'packages/base-render/test/status-row.test.mjs'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '');
  const go = (k) => (one.match(new RegExp('ℹ ' + k + ' (\\d+)')) ?? [])[1] ?? '?';
  suites.push(['base-render status-row 单跑（并行假红的对照）', go('tests'), go('pass'), go('fail')]);
} else {
  suites.push(['（--no-tests：本轮跳过）', '-', '-', '-']);
}
say('| 套件 | tests | pass | fail | 红条点名 |');
say('|---|---|---|---|---|');
for (const s of suites) say('| ' + s.slice(0, 4).join(' | ') + ' | ' + (s[4] ?? '') + ' |');
say('');
say('（base-render 的 Chrome 类测试整包并行跑会 `EBUSY DevToolsActivePort`／`CDP 未就绪` —— 那是**并行假红**，故同批给「单跑」一行作对照。）');
say('');
say('## ⑥ 五面墙 sha256');
say('');
say('| 面 | 墙文件 | 字节 | sha256 |');
say('|---|---|---|---|');
for (const fr of faceRows) {
  const ok = existsSync(fr.wallPath);
  say('| ' + fr.cn + ' | `' + fr.wallPath.replace(ROOT + '\\', '').split('\\').join('/') + '` | ' + (ok ? String(statSync(fr.wallPath).size) : '—') + ' | `' + (ok ? sha256(fr.wallPath) : '—') + '` |');
}
say('');
say('## ⑦ 末行 RESULT');
say('');
const reds = [];
for (const fr of faceRows) for (const p of fr.problems) reds.push(fr.id + '：' + p);
if (zong.status !== 0) reds.push('页族总检：exit=' + String(zong.status) + ' ' + zong.tail);
for (const s of suites) if (s[3] !== '0' && s[3] !== '-') reds.push(s[0] + '：fail=' + s[3] + (s[4] ? '（' + s[4] + '）' : ''));
const marks = faceRows.filter((f) => f.problems.length === 0);
const redFaces = faceRows.length - marks.length;
say('```');
say('RESULT: 五面墙 ' + String(marks.length) + '/' + String(faceRows.length) + ' 绿（格数对 EXPECTED、lazy=0）；红面 ' + String(redFaces) + (redFaces ? ' -> ' + faceRows.filter((f) => f.problems.length).map((f) => f.id + '(' + f.problems.join(';') + ')').join(' ') : ''));
say('RESULT: 页族总检 ' + (zong.status === 0 ? '绿' : '红') + '（' + zong.tail + '）');
say('RESULT: 全量测试 ' + suites.map((s) => s[0] + '=' + s[2] + '/' + s[1] + '（fail ' + s[3] + '）').join('；'));
say('RESULT: 总红条 ' + String(reds.length) + (reds.length ? ' -> ' + reds.join(' ｜ ') : '（全绿）'));
say('```');
say('');
const md = log.join(String.fromCharCode(10)) + String.fromCharCode(10);
writeFileSync(join(OUT, '终局复跑读数.md'), md, 'utf8');
writeFileSync(join(ROOT, 'docs', 'skills', 'skill-bill', '1081-终局复跑读数.md'), md, 'utf8');
console.log('READINGS-WRITTEN ' + join(ROOT, 'docs', 'skills', 'skill-bill', '1081-终局复跑读数.md'));
process.exit(reds.length === 0 ? 0 : 1);