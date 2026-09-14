#!/usr/bin/env node
/** #420 独立审查探针（审查席自设件，与实施席脚本不同人不同脚本）。
 *
 * 用法（会写工作区的动作必须先持锁，见 `tooling/run-locked.mjs`）：
 *   node docs/base/base-render/t420-review-probe.mjs          # P1／P2／P3（只读：读 dist ＋ git 只读子命令）
 *   node docs/base/base-render/t420-review-probe.mjs --p4     # 另跑 P4（`tsc -b`／`pnpm build`，**须持锁**）
 *
 * 四条探针各打实施席脚本的一处盲区：
 *   P1 打印 opt-in 在**真实页面**上成立：走技能侧整页装配（`src/shared/docPage.ts` 的 `assembleDocPage`，
 *      非 bline 路＝真调 `renderPageShell`）产一页，再按真 `renderPageShell` 的差量产可打印那页；
 *      断言默认页标记里**零**该类、可打印页**恰一处**且落在版面根；两页全文逐字符差异**只有**该根类
 *      （单点插入），两页的样式段与脚本段逐字相同（无别的样式漂移）。
 *   P2 打印段没有漏网的全局规则：自写花括号解析器（**不用**实施席的「行尾 `{` ＋ 不拆逗号」启发式）——
 *      逗号选择器逐个判、单行规则照样判；具名页只许 `@page printable`，裸 `@page` 零处。
 *   P3 提交归属边界：`git show` 逐笔核三件只含本票声明的路径；**只看 diff 不看提交说明**地数 #397
 *      参数表单段标志串（提交说明里出现该词属正常，diff 里出现即裹入）。
 *   P4 门禁红归因复核：`pnpm -C packages/base-render exec tsc -b` 与 `pnpm build` 两边错行逐条对齐，
 *      断言错行零条落在 `packages/base-render/`（`--p4` 才跑）。
 *
 * 口径（照 `docs/agents/wording.md`）：本探针只读仓库、不写任何文件；退出码 0=全过、1=有红。
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const WANT_P4 = process.argv.includes('--p4');

let pass = 0;
const failures = [];
function check(id, fn) {
  try {
    const note = fn();
    pass += 1;
    console.log('PROBE ' + id + ' PASS' + (note ? ' :: ' + note : ''));
  } catch (err) {
    failures.push(id);
    console.log('PROBE ' + id + ' FAIL :: ' + (err && err.message ? err.message : String(err)));
  }
}
function readout(id, text) {
  console.log('PROBE-' + id + ' ' + text);
}

/** 取本仓文件（`file://` 直取，不经包名解析）。 */
const at = (...seg) => join(ROOT, ...seg);
const importFile = (p) => import(pathToFileURL(p).href);

const blocks = await importFile(at('packages/base-render', 'dist', 'blocks.js'));
const base = await importFile(at('packages/base-render', 'dist', 'index.js'));

/** 技能侧整页装配：优先工作区源码（活树），退化到包内 dist；两条路都记读数。 */
let docPage = null;
let docPageSource = '(未取到)';
for (const p of [at('packages/skill-calorie', 'src', 'shared', 'docPage.ts'), at('packages/skill-calorie', 'dist', 'shared', 'docPage.js')]) {
  try {
    const mod = await importFile(p);
    if (typeof mod.assembleDocPage === 'function') { docPage = mod; docPageSource = p.replace(ROOT, ''); break; }
  } catch { /* 试下一个 */ }
}
readout('P1-src', 'docPage 来源=' + docPageSource);

/* ══════════════════ P1 打印 opt-in 在真实页面上成立 ══════════════════ */

const ASSET_RE = /<(style|script)\b[\s\S]*?<\/\1>/g;
const assetsOf = (html) => html.match(ASSET_RE) ?? [];
/** 剥掉 `<style>`／`<script>` 资产段，只留文档标记。 */
const markupOf = (html) => html.replace(ASSET_RE, '<asset/>');
/** 全文单点插入差异：返回 null（不是「插一段」）或 `{ at, text }`。 */
function singleInsertion(a, b) {
  if (b.length <= a.length) return null;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  return { at: i, text: b.slice(i, b.length - (a.length - i)) };
}
const countOf = (hay, needle) => hay.split(needle).length - 1;

const PAGE_TITLE = '审查探针页';
const PAGE_CONTENT = blocks.renderTocBlock({
  items: [{ id: 'sec-kpi', text: '指标' }, { id: 'sec-copy', text: '复制区' }],
})
  + blocks.renderKpiCard({ label: '本周目标完成率', value: '57', unit: '%' })
  + blocks.renderCaliberLine('周目标口径＝每日目标 × 7')
  + blocks.renderCopyBlock({ title: '复制区', dataText: 'calorie.exercise.update {"id":1,"minutes":40}' });

let pageDefault = '';
let shellDefault = '';
check('P1-0 技能侧整页装配产得出整页文档', () => {
  assert.ok(docPage !== null, '两条路都取不到 assembleDocPage');
  pageDefault = docPage.assembleDocPage({
    docTitle: '卡路里·审查探针', title: PAGE_TITLE, eyebrow: '', subtitle: null, content: PAGE_CONTENT,
  });
  assert.ok(pageDefault.startsWith('<!doctype html'), '产物不是整页文档');
  assert.ok(pageDefault.includes(PAGE_CONTENT.slice(0, 40)), '装配页没带上区块内容');
  return '来源=' + docPageSource + ' 页长=' + pageDefault.length;
});

check('P1-1 装配页确由真 renderPageShell 拼成（版面壳恰一处）', () => {
  shellDefault = blocks.renderPageShell({ title: PAGE_TITLE, content: PAGE_CONTENT });
  assert.equal(countOf(pageDefault, shellDefault), 1, '装配页里 default 版面壳不是恰一处');
  return '壳长=' + shellDefault.length;
});

check('P1-2 默认页：标记里零个 ilife-page-printable（该类没有绑定到任何元素）', () => {
  const markup = markupOf(pageDefault);
  assert.equal(countOf(markup, 'ilife-page-printable'), 0, '默认页标记里出现打印根类');
  const rootTag = /<section class="([^"]*)">/.exec(markup);
  assert.ok(rootTag, '没找到版面根 section');
  assert.ok(!rootTag[1].includes('ilife-page-printable'), '默认页版面根带了打印类：' + rootTag[1]);
  // 规则**在**共享样式段里（样式是共享资产），但没有元素命中 —— 这就是「不含 page: 绑定」的读数口径。
  assert.ok(pageDefault.includes('.ilife-page-printable {'), '共享样式段里缺打印规则');
  assert.ok(pageDefault.includes('page: printable;'), '共享样式段里缺 page 绑定声明');
  return '版面根类=[' + rootTag[1] + ']；样式段有规则但零命中';
});

let pagePrintable = '';
check('P1-3 可打印页：该类恰一处且落在版面根', () => {
  const shellPrintable = blocks.renderPageShell({ title: PAGE_TITLE, content: PAGE_CONTENT, printable: true });
  // 差量**只**取自真函数：真函数带开关的产物去掉该类后必须逐字等于不带开关的产物。
  assert.equal(shellPrintable.replace(' ilife-page-printable', ''), shellDefault, '真函数差值不止该根类');
  pagePrintable = pageDefault.replace(shellDefault, shellPrintable);
  const markup = markupOf(pagePrintable);
  assert.equal(countOf(markup, 'ilife-page-printable'), 1, '可打印页该类不是恰一处：' + countOf(markup, 'ilife-page-printable'));
  assert.ok(/<section class="[^"]*\bilife-page-printable\b[^"]*">/.test(markup), '该类不在版面根上');
  return '两页长度差=' + (pagePrintable.length - pageDefault.length) + '（＝1 个类 21 字符）';
});

check('P1-4 两页差异只是该根类：全文单点插入 ＋ 样式段／脚本段逐字相同', () => {
  const diff = singleInsertion(pageDefault, pagePrintable);
  assert.ok(diff, '两页差异不是「单点插入」');
  assert.equal(diff.text, ' ilife-page-printable', '插入的差量不是该根类：' + JSON.stringify(diff.text));
  const a = assetsOf(pageDefault);
  const b = assetsOf(pagePrintable);
  assert.equal(a.length, b.length, '资产段条数不同：' + a.length + ' vs ' + b.length);
  for (let i = 0; i < a.length; i += 1) assert.equal(a[i], b[i], '第 ' + i + ' 段资产不同（样式漂移）');
  return 'insert@' + diff.at + ' delta=' + JSON.stringify(diff.text) + ' 资产段 ' + a.length + ' 段逐字相同';
});

check('P1-5 缺省零变（真函数口径）', () => {
  const a = blocks.renderPageShell({ title: PAGE_TITLE, content: PAGE_CONTENT });
  const b = blocks.renderPageShell({ title: PAGE_TITLE, content: PAGE_CONTENT, printable: false });
  const c = blocks.renderPageShell({ title: PAGE_TITLE, content: PAGE_CONTENT, printable: true });
  assert.equal(a, b, 'printable: false 与缺省不等 → 老调用方会变');
  assert.ok(!a.includes('ilife-page-printable'), '缺省出了打印类');
  assert.equal(c.replace(' ilife-page-printable', ''), a, '开与不开除该类外不等');
  return '缺省≡给假；给真≡缺省+1 类';
});

check('P1-6 打印段的隐藏对象在真页面上确实存在（导航／复制区块）', () => {
  const markup = markupOf(pageDefault);
  assert.ok(markup.includes('ilife-block-toc'), '真实页里没有页内导航区块');
  assert.ok(markup.includes('ilife-block-copy-block'), '真实页里没有复制区块');
  return '两区都在页面上，打印段各自 display:none';
});

/* ══════════════════ P2 打印段没有漏网的全局规则 ══════════════════ */

const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** 从 `css[i]` 读一条规则；返回 `{ prelude, body, end }`，读不动返回 null。 */
function readRule(css, i) {
  let open = -1;
  for (let j = i; j < css.length; j += 1) {
    if (css[j] === '{') { open = j; break; }
    if (css[j] === '}') return null;
  }
  if (open < 0) return null;
  let depth = 0;
  let close = css.length;
  for (let k = open; k < css.length; k += 1) {
    if (css[k] === '{') depth += 1;
    else if (css[k] === '}') {
      depth -= 1;
      if (depth === 0) { close = k; break; }
    }
  }
  return { prelude: css.slice(i, open).trim(), body: css.slice(open + 1, close), end: close + 1 };
}
/** 扫描一段 CSS：style 规则（选择器**逐个逗号项**拆开）＋ 段内 at-rule 头。 */
function scan(css) {
  const styleRules = [];
  const atHeads = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;
    const rule = readRule(css, i);
    if (!rule) break;
    if (rule.prelude.startsWith('@')) {
      atHeads.push(rule.prelude);
      if (/^@media\b/.test(rule.prelude)) {
        const nested = scan(rule.body);
        styleRules.push(...nested.styleRules);
        atHeads.push(...nested.atHeads);
      }
    } else {
      styleRules.push({
        raw: rule.prelude,
        selectors: rule.prelude.split(',').map((s) => s.trim()).filter((s) => s !== ''),
        body: rule.body,
      });
    }
    i = rule.end;
  }
  return { styleRules, atHeads };
}
const printBody = () => {
  const css = withoutComments(blocks.blocksCss());
  const rule = readRule(css, css.indexOf('@media print'));
  assert.ok(rule && rule.prelude === '@media print', '取不到 @media print 段体');
  return rule.body;
};

check('P2-1 blocksCss 恰一段 @media print，段内 at-rule 只有具名页', () => {
  const css = withoutComments(blocks.blocksCss());
  assert.equal(css.split('@media print').length - 1, 1, '@media print 段数不为 1');
  const { atHeads } = scan(printBody());
  assert.deepEqual(atHeads, ['@page printable'], '段内 at-rule 不是唯一的具名页：' + JSON.stringify(atHeads));
  return '段内 at-rule=' + JSON.stringify(atHeads);
});

check('P2-2 打印段每条规则的每个逗号选择器都以 .ilife-page-printable 起头', () => {
  const { styleRules } = scan(printBody());
  assert.ok(styleRules.length >= 3, '打印段 style 规则偏少：' + styleRules.length);
  const all = styleRules.flatMap((r) => r.selectors);
  const bad = all.filter((s) => !s.startsWith('.ilife-page-printable'));
  assert.deepEqual(bad, [], '有未加打印作用域的选择器：' + JSON.stringify(bad));
  return '规则 ' + styleRules.length + ' 条／选择器 ' + all.length + ' 个：' + JSON.stringify(all);
});

check('P2-3 全表不得出现裸 @page 或非具名页', () => {
  const css = withoutComments(blocks.blocksCss());
  const heads = [...css.matchAll(/@page\b[^{]*/g)].map((m) => m[0].trim());
  assert.ok(heads.length >= 1, '全表缺 @page');
  const bad = heads.filter((h) => !/^@page\s+printable$/.test(h));
  assert.deepEqual(bad, [], '出现非具名／裸 @page：' + JSON.stringify(bad));
  return '@page 出现 ' + heads.length + ' 处，均为 ' + JSON.stringify(heads[0]);
});

check('P2-4 打印段确实隐藏页内导航与复制区', () => {
  const { styleRules } = scan(printBody());
  const has = (sel) => styleRules.some((r) => r.selectors.includes(sel) && /display:\s*none/.test(r.body));
  assert.ok(has('.ilife-page-printable .ilife-block-toc'), '未隐藏页内导航');
  assert.ok(has('.ilife-page-printable .ilife-block-copy-block'), '未隐藏复制区块');
  return '两区 display:none 齐备';
});

check('P2-5 打印段不读未冻结 token（11 键闭集内）', () => {
  const used = new Set([...printBody().matchAll(/var\((--[A-Za-z0-9-]+)\)/g)].map((m) => m[1]));
  const bad = [...used].filter((n) => !Object.hasOwn(base.CSS_VAR_TOKENS, n));
  assert.deepEqual(bad, [], '打印段读了未冻结 token：' + JSON.stringify(bad));
  return '打印段用 token ' + JSON.stringify([...used]);
});

/* ══════════════════ P3 提交归属边界 ══════════════════ */

const DELIVERED = {
  dc16ba1: ['packages/base-render/src/blocks.ts', 'packages/base-render/test/page-finish-420.test.mjs'],
  '9a56df3': ['packages/base-render/src/blocks.ts', 'packages/base-render/test/page-finish-420.test.mjs'],
  '8873b5e': ['docs/base/base-render/t420-page-finish.md'],
};
/** #397 参数表单段的标志串（只数 diff：提交说明里提到该词属正常，diff 里出现即裹入）。 */
const OTHER_TICKET_MARKS = ['optNumeric', 'optOptions', 'renderParamForm'];
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const countAll = (hay, words) => words.reduce((n, w) => n + (hay.split(w).length - 1), 0);

for (const [commit, declared] of Object.entries(DELIVERED)) {
  check('P3-' + commit + ' 改动路径 ⊆ 本票声明的件', () => {
    const files = git('show', '--name-only', '--format=', '--no-renames', commit).split('\n').map((s) => s.trim()).filter(Boolean);
    assert.deepEqual([...files].sort(), [...declared].sort(), '改动路径与声明不符');
    return files.join(' , ');
  });
  check('P3-' + commit + ' 别票（#397 参数表单段）hunk 未裹入', () => {
    // 只数**代码面** hunk：证据件正文里出现该词属正常（§6 就是写「同文件他席在途改动」的），
    // 故把判定面收到 `packages/` 路径；提交说明同理不数。
    const codeDiff = countAll(git('show', '--format=', '--no-renames', commit, '--', 'packages/'), OTHER_TICKET_MARKS);
    const docDiff = countAll(git('show', '--format=', '--no-renames', commit, '--', 'docs/'), OTHER_TICKET_MARKS);
    const withMsg = countAll(git('show', '--no-renames', commit), OTHER_TICKET_MARKS);
    assert.equal(codeDiff, 0, 'packages/ 面 diff 里出现别票标志串 ' + codeDiff + ' 处');
    return '代码面命中 0／证据件面命中 ' + docDiff + '（文字说明）／含提交说明命中 ' + withMsg;
  });
}

/* ══════════════════ 附：台账口径读数（冻结 token／12 区闭集／闭集外类名） ══════════════════ */

check('X-1 11 个冻结 token 与 12 区闭集未动', () => {
  const tokens = Object.keys(base.CSS_VAR_TOKENS);
  const sections = [...blocks.BLOCK_STYLE_SECTIONS];
  assert.equal(tokens.length, 11, '冻结 token 数=' + tokens.length);
  assert.equal(sections.length, 12, '区块样式区数=' + sections.length);
  return 'tokens=' + tokens.length + ' sections=' + sections.length;
});

check('X-2 三个新类不产闭集外类名、也不落控件台账面', () => {
  const css = blocks.blocksCss();
  assert.ok(css.includes('.ilife-block-toc'), '缺 .ilife-block-toc');
  assert.ok(css.includes('.ilife-block-caliber'), '缺 .ilife-block-caliber');
  assert.ok(!css.includes('.ilife-toc'), '出现闭集外类名 .ilife-toc');
  assert.ok(!css.includes('.ilife-caliber'), '出现闭集外类名 .ilife-caliber');
  assert.ok(!css.includes('.ilife-printable'), '出现 .ilife-printable（应恒为 .ilife-page-printable）');
  const sheet = base.buildStyleSheet().css;
  for (const cls of ['.ilife-block-toc', '.ilife-block-caliber', '.ilife-page-printable']) {
    assert.equal(sheet.includes(cls), false, cls + ' 落进了 buildStyleSheet（台账面被污染）');
  }
  return '三新类只在 blocksCss（控件台账判定面外）';
});

/* ══════════════════ P4 门禁红归因复核（--p4） ══════════════════ */

if (WANT_P4) {
  const runPnpm = (args) => {
    try {
      const out = execFileSync('pnpm', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true, maxBuffer: 64 * 1024 * 1024 });
      return { code: 0, out };
    } catch (err) {
      return { code: typeof err.status === 'number' ? err.status : 1, out: String(err.stdout ?? '') + String(err.stderr ?? '') };
    }
  };
  const errLines = (out) => out.split('\n').map((s) => s.trim()).filter((s) => /^\S+\.tsx?\(\d+,\d+\): error TS\d+/.test(s));
  const scope = runPnpm(['-C', 'packages/base-render', 'exec', 'tsc', '-b']);
  readout('P4-a', 'pnpm -C packages/base-render exec tsc -b exit=' + scope.code + ' errs=' + errLines(scope.out).length);
  check('P4-a 本票范围编译绿', () => {
    assert.equal(scope.code, 0, '本票范围编译红：' + errLines(scope.out).join(' | '));
    return 'exit=0';
  });
  const full = runPnpm(['build']);
  const fullErrs = errLines(full.out);
  readout('P4-b', 'pnpm build exit=' + full.code + ' errs=' + fullErrs.length);
  for (const line of fullErrs) readout('P4-b-err', line);
  check('P4-b pnpm build 错行零条落在 packages/base-render/', () => {
    const mine = fullErrs.filter((l) => l.startsWith('packages/base-render/'));
    assert.deepEqual(mine, [], '错行落进本票写面：' + JSON.stringify(mine));
    return '全仓错行 ' + fullErrs.length + ' 条／本票写面 0 条（' + (full.code === 0 ? 'exit=0 全绿' : 'exit=' + full.code) + '）';
  });
}

console.log('PROBE-RESULT ' + (failures.length === 0 ? 'PASS' : 'FAIL') + ' pass=' + pass + ' fail=' + failures.length
  + (failures.length ? ' red=' + failures.join(',') : ''));
process.exitCode = failures.length === 0 ? 0 : 1;
