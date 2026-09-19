/**
 * #724 读数复核（规格归档票的对抗式自查；只读，不写工作区）。
 *
 * 复跑：node docs/skills/skill-bill/t724-读数复核.mjs
 * 口径：LF 只数 `\n`；「域读数」一律取 `git show <提交>:<路径>` 的冻结读数
 *（工作区常有在途席在改 `packages/skill-bill/src`，读工作区会得混合态）。
 * 老侧根：D:/2Study/StudyNotes/SKILLS/饼干记账（不在时打 SKIP，不静默当绿）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = 'D:/ilife';
const OLD = 'D:/2Study/StudyNotes/SKILLS/饼干记账';
const WRITE_AT = '9ec05336'; // 规格成文当刻的提交（2026-09-18 22:26，#687）
const HEAD = 'HEAD';

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const at = (commit, path) => git(['show', `${commit}:${path}`]).replace(/^\uFEFF/, '');
const filesAt = (commit, dir) => git(['ls-tree', '-r', '--name-only', commit, dir]).split('\n').filter(Boolean);
const lf = (s) => s.split('\n').length - 1;
const local = (p) => readFileSync(p, 'utf8').replace(/^\uFEFF/, '');

let pass = 0, fail = 0, skip = 0;
const ok = (name, detail, verdict) => {
  if (verdict === 'SKIP') skip++; else verdict ? pass++ : fail++;
  console.log(`${verdict === 'SKIP' ? 'SKIP' : verdict ? 'OK  ' : 'DIFF'} ${name}${detail ? '：' + detail : ''}`);
};

// ── ① 公共层块位闭集：按域页型表 §一 的行号逐一比对 ─────────────────────
const WANT = [
  ['renderPageShell', 218], ['renderTocBlock', 254], ['renderCaliberLine', 286], ['renderConclusionBar', 308],
  ['renderDistributionRows', 463], ['renderMiniBar', 432], ['renderChips', 500], ['renderChangeRows', 532],
  ['renderKpiCard', 579], ['renderKpiGrid', 623], ['renderDataTable', 679], ['renderChartBlock', 765],
  ['renderListRows', 810], ['renderPreBlock', 856], ['renderDetailSection', 903], ['renderDisclosure', 956],
  ['renderParamForm', 1012], ['renderEmptyBlock', 1099], ['renderCopyBlock', 1128], ['renderFeedbackBlock', 1220],
];
{
  const lines = local(`${ROOT}/packages/base-render/src/blocks.ts`).split('\n');
  const bad = WANT.filter(([n, want]) => lines.findIndex((l) => new RegExp(`^export function ${n}\\b`).test(l)) + 1 !== want);
  ok('blocks.ts 块位闭集 20 个函数行号', `不符 ${bad.length}/${WANT.length}`, bad.length === 0);
}

// ── ② 两侧 docPage：行数／字段数／调用点 ───────────────────────────────
const fieldsOf = (src) => {
  const m = src.match(/interface DocPageInput[^{]*\{([\s\S]*?)\n\}/);
  return m ? [...m[1].matchAll(/^\s{2}(?:readonly )?([a-zA-Z]\w*)\??:/gm)].map((x) => x[1]) : [];
};
for (const [pkg, wantLf, wantFields] of [['skill-calorie', 161, 11], ['skill-bill', 130, 5]]) {
  const src = local(`${ROOT}/packages/${pkg}/src/shared/docPage.ts`);
  const f = fieldsOf(src);
  ok(`${pkg} docPage.ts LF=${lf(src)} 字段=${f.length}`, `规格 LF=${wantLf} 字段=${wantFields}`, lf(src) === wantLf && f.length === wantFields);
}
{
  const count = (pkg, re, defRe) => {
    let n = 0, defs = 0;
    for (const f of filesAt(HEAD, `packages/${pkg}/src`)) {
      const t = at(HEAD, f);
      n += (t.match(re) || []).length;
      if (defRe.test(t)) defs++;
    }
    return { n, defs, calls: n - defs };
  };
  const cal = count('skill-calorie', /assembleDocPage\s*\(/g, /export (function|const) assembleDocPage\b/);
  ok('卡路里 assembleDocPage( 调用点', `命中 ${cal.n} − 定义 ${cal.defs} = ${cal.calls}（规格写 110）`, cal.calls === 110);
  const bill = count('skill-bill', /\bpageShell\s*\(/g, /export (function|const) pageShell\b/);
  ok('账单 pageShell( 调用点', `命中 ${bill.n} − 定义 ${bill.defs} = ${bill.calls}（规格写 34）`, bill.calls === 34);
}

// ── ③ 域读数：成文当刻 vs HEAD ─────────────────────────────────────────
const queryFive = (commit) => ['commands.ts', 'detail.ts', 'index.ts', 'list.ts', 'read.ts']
  .map((n) => lf(at(commit, `packages/skill-bill/src/query/${n}`)));
{
  const q = queryFive(WRITE_AT), sum = q.reduce((a, b) => a + b, 0);
  ok(`query 五件合计（${WRITE_AT} 成文当刻）`, `${q.join('/')} ⇒ ${sum}（规格写 727／43 行每场景）`, sum === 727);
  const qh = queryFive(HEAD);
  ok(`query 五件合计（HEAD，漂移登记）`, `${qh.join('/')} ⇒ ${qh.reduce((a, b) => a + b, 0)}`, 'SKIP');
}
for (const c of [WRITE_AT, HEAD]) {
  const fs2 = filesAt(c, 'packages/skill-bill/src/record');
  const tot = fs2.reduce((a, f) => a + lf(at(c, f)), 0);
  ok(`record/ 件数与 LF（${c === HEAD ? 'HEAD' : c}）`, `${fs2.length} 件／${tot} LF`, 'SKIP');
}
for (const c of [WRITE_AT, HEAD]) {
  ok(`test/ 件数（${c === HEAD ? 'HEAD' : c}）`, `${filesAt(c, 'packages/skill-bill/test').length}`, 'SKIP');
}
{
  // 账单测试面有没有块序判据：测试件里出现块位渲染函数名的件数必须是 0
  const names = WANT.map(([n]) => n);
  const hits = filesAt(HEAD, 'packages/skill-bill/test').filter((f) => names.some((n) => at(HEAD, f).includes(n)));
  ok('账单测试面「没有一条断块序次序」', `提到块位函数名的测试件 ${hits.length} 件`, hits.length === 0);
}
{
  // 写入域：16 件里只有 1 件走通用装配体（记支出 → collectBody／receiptBody）
  const scenes = filesAt(HEAD, 'packages/skill-bill/src/record').filter((f) => /scene-.*\.ts$/.test(f));
  const generic = scenes.filter((f) => /collect: collectBody|receipt: receiptBody/.test(at(HEAD, f)));
  ok('写入域 16 件里 1 件走通用装配体', `场景件 ${scenes.length} 件，走 collectBody／receiptBody 的 ${generic.length} 件：${generic.map((f) => f.split('/').pop()).join(' ')}`, scenes.length === 16 && generic.length === 1);
}

// ── ④ 老侧读数：分析／查询模板与锚点 ───────────────────────────────────
if (!existsSync(`${OLD}/templates/分析/analysis_view.html`)) {
  ok('老侧读数', `老技能根不在本机（${OLD}）——SKIP 放行，不静默当绿`, 'SKIP');
} else {
  const ana = readFileSync(`${OLD}/templates/分析/analysis_view.html`, 'utf8');
  const qry = readFileSync(`${OLD}/templates/query_view.html`, 'utf8');
  const anaFns = [...ana.matchAll(/^\s*(?:function|const)\s+(render\w+)\s*[=(]/gm)].map((m) => [m[1], ana.slice(0, m.index).split('\n').length]);
  const qryFns = [...qry.matchAll(/^\s*(?:function|const)\s+(render\w+)\s*[=(]/gm)].map((m) => [m[1], qry.slice(0, m.index).split('\n').length]);
  ok('分析模板 LF', `${lf(ana)}（讨论正文两处写 1,166 与 1,098）`, lf(ana) === 1166);
  ok('查询模板 LF', `${lf(qry)}（讨论正文写 503）`, lf(qry) === 548);
  const routerKeys = (ana.slice(ana.indexOf('const routers = {'), ana.indexOf('const fn = routers')).match(/^\s+\w+:/gm) || []).length;
  ok('分析域分发表 routers 键数', `${routerKeys}（讨论正文写 25 渲染器）`, routerKeys === 25);
  ok('renderBreakdown 在不在分析模板', `分析模板 ${/breakdown/i.test(ana) ? '有' : '无'}；查询模板 ${/renderBreakdown/.test(qry) ? '有' : '无'}（规格 §2.3 把它的行号 347-375 记在分析域那一族）`, 'SKIP');
  ok('分析域自己的页面级渲染器数', `全部 render* ${anaFns.length} 个（含 4 件 chrome：header／footer／error／actionBar；含图表助手 renderTrendChart@${(anaFns.find((f) => f[0] === 'renderTrendChart') || [])[1]}）`, 'SKIP');
  ok('§2.3「读数＋条」一行漏列的渲染器名', `${['renderOverview', 'renderWeek'].map((n) => n + '@' + ((anaFns.find((f) => f[0] === n) || [])[1] ?? '?')).join(' ')}（该行列 11 名、行内场景 13 个）`, 'SKIP');
  const tpl = `${OLD}/templates/写入`;
  if (existsSync(tpl)) {
    const rows = readdirSync(tpl).map((f) => `${f} ${lf(readFileSync(`${tpl}/${f}`, 'utf8'))}`);
    ok('老侧写入 5 张模板 LF', rows.join(' · '), 'SKIP');
  }
  const anchors = [
    ['expense_form.html', 46, /<header class="header">/], ['expense_form.html', 54, /class="prefill"/],
    ['expense_form.html', 56, /class="dup-warn"/], ['expense_form.html', 58, /<div class="card">/],
    ['expense_form.html', 80, /class="actions"/], ['expense_form.html', 83, /id="actionbar-zone"/],
    ['flow_confirm.html', 192, /name="cand"/],
  ];
  const bad = anchors.filter(([f, line, re]) => !re.test(readFileSync(`${tpl}/${f}`, 'utf8').split('\n')[line - 1] || ''));
  ok('§2.1 老侧锚点抽样 7 条', `不符 ${bad.length}/7`, bad.length === 0);
}

// ── ⑤ 本票交付物：三件规格文档的入仓读数 ───────────────────────────────
{
  const rows = [
    ['docs/skills/skill-bill/t685-接口与判据.md', 8090, 101, 'packages/skill-bill/docs/t685-接口与判据.md'],
    ['docs/skills/skill-bill/t685-按域页型表.md', 17513, 156, 'packages/skill-bill/docs/t685-按域页型表.md'],
    ['docs/skills/skill-bill/t685-讨论决策页.html', 27803, 279, 'packages/skill-bill/docs/t685-讨论决策页.html'],
  ];
  for (const [p, bytes, wantLf, workCopy] of rows) {
    const t = at(HEAD, p);
    const add = git(['log', '-1', '--format=%h', '--diff-filter=A', '--', p]).trim();
    const size = Buffer.byteLength(t, 'utf8');
    const bom = at(HEAD, p).charCodeAt(0) === 0xfeff;
    const crlf = t.includes('\r\n');
    const same = existsSync(`${ROOT}/${workCopy}`) ? readFileSync(`${ROOT}/${workCopy}`, 'utf8') === t : null;
    ok(`入仓 ${p}`, `首次入仓 ${add} · ${size} 字节 · LF ${lf(t)} · BOM ${bom} · CRLF ${crlf} · 与工作副本逐字相同 ${same === null ? '（工作副本已不在，SKIP）' : same}`,
      size === bytes && lf(t) === wantLf && !bom && !crlf && same !== false);
  }
}

console.log(`RESULT: ${pass}/${pass + fail}${skip ? `（另 SKIP ${skip} 条，只登记不判定）` : ''} ${fail === 0 ? 'PASS' : 'FAIL'}`);
process.exitCode = fail === 0 ? 0 : 1;
