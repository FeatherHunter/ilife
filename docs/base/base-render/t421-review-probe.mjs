#!/usr/bin/env node
/**
 * #421 页面融合四件（`renderMiniBar`／`renderDistributionRows`／`renderChips`／`renderChangeRows`）
 * **独立对抗审查席探针**（与实施席脚本不同人、不同写法；只读票面与被审提交，不采信实施席结论）。
 *
 * 用法（工作目录＝仓库根）：
 *   1) 只读探针（不写工作区，不需要持锁）：
 *        node docs/base/base-render/t421-review-probe.mjs
 *      → P1 色值字面量零出现／P2 判据鉴别力／P4 提交边界。
 *   2) 追加 P3 新旧零变 A/B（**会临时改源**：换入 `a187b537:packages/base-render/src/blocks.ts`，
 *      编译采集后逐文件还原并复编；必须走加锁包装器）：
 *        node tooling/run-locked.mjs --ticket 421 -- node docs/base/base-render/t421-review-probe.mjs --ab
 *
 * 口径说明：本探针只打印读数与逐条 PASS／FAIL，**恒以 exit 0 收尾**（它是读数工具，
 * 不是门禁命令；避免在 gate-runs 台账里落非零退出条目）。P2.3 的「实测退化仍全绿」
 * 读数来自真跑判据的变异（草稿 `.scratch/t421-review/mutate-ab.mjs` 的 M3），
 * 本探针给出的是同一条判据谓词的合成读数，两者互为旁证。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const SRC = path.join(root, 'packages/base-render/src/blocks.ts');
const DIST = path.join(root, 'packages/base-render/dist/blocks.js');
const TEST421 = path.join(root, 'packages/base-render/test/page-viz-421.test.mjs');
const TSC = path.join(root, 'node_modules/typescript/bin/tsc');
const SCRATCH = path.join(root, '.scratch/t421-review');
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const say = (...args) => console.log(...args);

/** 票面口径的色值字面量：`#` 开头的十六进制色与 `rgb(`／`rgba(`。 */
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
const colorLiterals = (html) => [...String(html).matchAll(COLOR_LITERAL)].map((m) => m[0]);

/** #421 新收的 13 个类（票面逐字）。 */
const NEW_CLASSES = [
  'ilife-block-mini-bar', 'ilife-block-mini-bar-fill', 'ilife-block-dist-row', 'ilife-block-dist-row-name',
  'ilife-block-dist-row-bar', 'ilife-block-dist-row-fill', 'ilife-block-dist-row-val', 'ilife-block-chip',
  'ilife-block-change-row', 'ilife-block-change-row-label', 'ilife-block-change-row-old',
  'ilife-block-change-row-new', 'ilife-block-change-row-arrow',
];

const checks = [];
const check = (id, pass, reading) => {
  checks.push({ id, pass });
  say((pass ? 'PASS ' : 'FAIL ') + id + ' :: ' + reading);
};

/** 实施席判据的类名匹配口径（整词）：`class="a b"` 按空白切分后整词比对。 */
const tagsWithClass = (html, cls) => [...String(html).matchAll(/<[a-z]+ [^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => ((tag.match(/class="([^"]*)"/) ?? [])[1] ?? '').split(/\s+/).includes(cls));

/* ────────────────────────── 采集模式（--collect，供 P3 用） ────────────────────────── */

const NEW_FNS = ['renderMiniBar', 'renderDistributionRows', 'renderChips', 'renderChangeRows'];

const SAMPLES = (m) => ({
  renderPageShell: () => m.renderPageShell({ title: 'T', subtitle: 'S', eyebrow: 'E', content: '<p>x</p>' }),
  renderPageShell_printable: () => m.renderPageShell({ title: 'T', content: '<p>x</p>', printable: true }),
  renderTocBlock: () => m.renderTocBlock({ items: [{ id: 'a', text: '甲' }] }),
  renderCaliberLine: () => m.renderCaliberLine('口径 X'),
  renderKpiCard: () => m.renderKpiCard({ label: 'L', value: '12', unit: 'kg', detail: 'D', status: 'ok', statusText: 'S' }),
  renderKpiGrid: () => m.renderKpiGrid([{ label: 'L', value: '1' }, { label: 'L2', value: '2', status: 'warn' }]),
  renderDataTable: () => m.renderDataTable({ columns: [{ key: 'a', label: 'A', align: 'right' }], rows: [{ a: '1' }], caption: 'C' }),
  renderChartBlock: () => m.renderChartBlock({ kind: 'progress', input: { pct: 62 }, title: 'P' }),
  renderListRows: () => m.renderListRows({ items: [{ main: 'm', left: 'l', done: true }], emptyText: '无' }),
  renderPreBlock: () => m.renderPreBlock({ command: 'echo hi', label: 'L', actionId: 'a1' }),
  renderDisclosure: () => m.renderDisclosure({ title: 'T', contentHtml: '<p>x</p>', open: true }),
  renderParamForm: () => m.renderParamForm({ fields: [{ name: 'n', label: 'L', hint: 'H', value: 'v' }, { name: 'n2', label: 'L2', min: 1, max: 9 }] }),
  renderEmptyBlock: () => m.renderEmptyBlock({ title: 'T', text: '无', hint: 'H' }),
  renderCopyBlock: () => m.renderCopyBlock({ title: 'T', dataText: 'd', dataActionId: 'a' }),
  renderFeedbackBlock: () => m.renderFeedbackBlock({ title: 'T', toast: { msg: 'M' } }),
  renderMiniBar: () => m.renderMiniBar({ pct: 42 }),
  renderDistributionRows: () => m.renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 42 }] }),
  renderChips: () => m.renderChips({ items: [{ text: '甲' }] }),
  renderChangeRows: () => m.renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2' }] }),
  blocksCss: () => m.blocksCss(),
});

if (process.argv[2] === '--collect') {
  const module = await import(pathToFileURL(DIST).href);
  const products = {};
  for (const [name, fn] of Object.entries(SAMPLES(module))) {
    try {
      products[name] = sha256(String(fn()));
    } catch (err) {
      products[name] = 'THROW:' + String(err && err.message);
    }
  }
  const css = module.blocksCss();
  const cssClasses = [...new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((x) => x[1]))].sort();
  fs.writeFileSync(process.argv[3], JSON.stringify({ products, cssClasses, cssLiterals: colorLiterals(css) }, null, 1));
  say('COLLECT ' + process.argv[3] + ' products=' + Object.keys(products).length + ' cssClasses=' + cssClasses.length);
  process.exit(0);
}

/* ────────────────────────── P0 票面逐条直读（本席自建 oracle） ────────────────────────── */

const probe = await import(pathToFileURL(DIST).href);
say('== P0 票面逐条直读（不借实施席测试件的 helper）==');
const TICKET_CLASSES = {
  renderMiniBar: ['ilife-block-mini-bar', 'ilife-block-mini-bar-fill'],
  renderDistributionRows: ['ilife-block-dist-row', 'ilife-block-dist-row-name', 'ilife-block-dist-row-bar', 'ilife-block-dist-row-fill', 'ilife-block-dist-row-val'],
  renderChips: ['ilife-block-chip'],
  renderChangeRows: ['ilife-block-change-row', 'ilife-block-change-row-label', 'ilife-block-change-row-old', 'ilife-block-change-row-new', 'ilife-block-change-row-arrow'],
};
const ticketProducts = {
  renderMiniBar: probe.renderMiniBar({ pct: 76, color: 'var(--accent)' }),
  renderDistributionRows: probe.renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 52, color: 'var(--accent)' }] }),
  renderChips: probe.renderChips({ items: [{ text: '甲' }] }),
  renderChangeRows: probe.renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2' }] }),
};
const classTokensOf = (html) => new Set([...String(html).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
for (const [fn, wanted] of Object.entries(TICKET_CLASSES)) {
  const have = classTokensOf(ticketProducts[fn]);
  const missing = wanted.filter((c) => !have.has(c));
  check('P0.1 ' + fn + ' 产票面类名齐备', missing.length === 0,
    '缺=' + JSON.stringify(missing) + ' 实产=' + JSON.stringify([...have]));
}
const emptyProducts = {
  'renderDistributionRows({rows: []})': probe.renderDistributionRows({ rows: [] }),
  'renderChips({items: []})': probe.renderChips({ items: [] }),
  'renderChangeRows({rows: []})': probe.renderChangeRows({ rows: [] }),
};
check('P0.2 空 rows／items → 空串', Object.values(emptyProducts).every((v) => v === ''), JSON.stringify(emptyProducts));

const widths = {
  '76': (ticketProducts.renderMiniBar.match(/style="([^"]*)"/) ?? [])[1],
  '120': (probe.renderMiniBar({ pct: 120 }).match(/style="([^"]*)"/) ?? [])[1],
  '-5': (probe.renderMiniBar({ pct: -5 }).match(/style="([^"]*)"/) ?? [])[1],
  '76.5': (probe.renderMiniBar({ pct: 76.5 }).match(/style="([^"]*)"/) ?? [])[1],
};
check('P0.3 pct 逐字写宽＋两端夹取（76→76%、120→100%、-5→0%、76.5 不夹坏）',
  widths['76'] === 'width:76%;background:var(--accent)' && widths['120'] === 'width:100%'
  && widths['-5'] === 'width:0%' && widths['76.5'] === 'width:76.5%', JSON.stringify(widths));
const badResults = [Number.NaN, Number.POSITIVE_INFINITY, '76', undefined].map((v) => {
  try {
    probe.renderMiniBar({ pct: v });
    return 'no-throw';
  } catch (err) {
    return err.name + '/' + err.code;
  }
});
check('P0.4 非数 pct → BlocksError／bad-input（NaN／Infinity／字串／缺参）',
  badResults.every((r) => r === 'BlocksError/bad-input'), JSON.stringify(badResults));

const arrowOn = probe.renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2', arrow: true }] });
const arrowOff = probe.renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2', arrow: false }] });
const arrowTag = (html) => (String(html).match(/<span class="ilife-block-change-row-arrow"[^>]*>/) ?? ['(缺)'])[0];
check('P0.5 arrow: false 仍占箭位（元素在＋字形在＋visibility:hidden；除可见性外与真箭逐字同）',
  arrowTag(arrowOff).includes('visibility:hidden') && arrowOff.includes('→')
  && arrowOff.replace(' style="visibility:hidden"', '') === arrowOn,
  '箭位标签=' + arrowTag(arrowOff) + '，去可见性后与 arrow:true 逐字同='
  + (arrowOff.replace(' style="visibility:hidden"', '') === arrowOn));

const indexModule = await import(pathToFileURL(path.join(root, 'packages/base-render/dist/index.js')).href);
check('P0.6 11 个冻结 token 与 12 区闭集都不动',
  Object.keys(indexModule.CSS_VAR_TOKENS).length === 11 && probe.BLOCK_STYLE_SECTIONS.length === 12,
  'token=' + Object.keys(indexModule.CSS_VAR_TOKENS).length + '，区=' + probe.BLOCK_STYLE_SECTIONS.length
  + ' ' + JSON.stringify(probe.BLOCK_STYLE_SECTIONS));

const closedSetCss = probe.blocksCss();
const outsideClasses = ['.ilife-bar', '.ilife-dist'].filter((c) => closedSetCss.includes(c + ' {') || closedSetCss.includes(c + '{'));
const srcText = fs.readFileSync(SRC, 'utf8');
const domainWords = ['力量', '有氧', '柔韧', '日常'].filter((w) => srcText.includes(w));
check('P0.7 闭集外类名 .ilife-bar／.ilife-dist 未出现', outsideClasses.length === 0, '命中=' + JSON.stringify(outsideClasses));
check('P0.8 公共层源码零领域词（力量／有氧／柔韧／日常）', domainWords.length === 0, '命中=' + JSON.stringify(domainWords));

/* ────────────────────────── P1 色值字面量零出现 ────────────────────────── */

say('== P1 色值字面量零出现（边界输入五组）==');
const CASES = [
  ['不给 color', undefined],
  ['token 名 --accent', '--accent'],
  ['整条 var(--accent)', 'var(--accent)'],
  ['十六进制 #ff0000', '#ff0000'],
  ['rgb(1, 2, 3)', 'rgb(1, 2, 3)'],
];
const productsOf = (color) => {
  const withColor = (base) => (color === undefined ? base : { ...base, color });
  const row = (base) => (color === undefined ? base : { ...base, color });
  return [
    ['renderMiniBar', probe.renderMiniBar(withColor({ pct: 42 }))],
    ['renderDistributionRows', probe.renderDistributionRows({ rows: [row({ label: '甲', value: '1', pct: 42 })] })],
    ['renderChips', probe.renderChips({ items: [{ text: '甲' }] })],
    ['renderChangeRows', probe.renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2' }] })],
  ];
};
const literalCounts = {};
for (const [label, color] of CASES) {
  const hits = productsOf(color).flatMap(([name, html]) => colorLiterals(html).map((lit) => name + ':' + lit));
  literalCounts[label] = hits;
  say('  输入[' + label + '] 产物色值字面量=' + hits.length + (hits.length === 0 ? '' : ' ' + JSON.stringify(hits)));
}
check('P1.a 缺省（不给 color）四件产物零色值字面量', literalCounts['不给 color'].length === 0,
  '命中=' + JSON.stringify(literalCounts['不给 color']));
check('P1.b 给 token 名时产物零色值字面量', literalCounts['token 名 --accent'].length === 0,
  '命中=' + JSON.stringify(literalCounts['token 名 --accent']));
check('P1.c 给十六进制时产物仍零色值字面量（票面判据字面读法）', literalCounts['十六进制 #ff0000'].length === 0,
  '命中=' + JSON.stringify(literalCounts['十六进制 #ff0000']));
check('P1.d 给 rgb() 时产物仍零色值字面量（票面判据字面读法）', literalCounts['rgb(1, 2, 3)'].length === 0,
  '命中=' + JSON.stringify(literalCounts['rgb(1, 2, 3)']));

// 缺省是否带兜底色：产物层（内联声明）＋ 样式层（blocksCss 规则体）。
const miniDefault = probe.renderMiniBar({ pct: 42 });
const inlineBackground = [...miniDefault.matchAll(/style="([^"]*)"/g)].flatMap((m) => m[1].split(';'))
  .filter((decl) => decl.startsWith('background:'));
check('P1.e 不给 color 时不落内联兜底色（产物层）', inlineBackground.length === 0,
  '内联 background 声明=' + JSON.stringify(inlineBackground) + ' 产物=' + miniDefault);

const css = probe.blocksCss();
const ruleOf = (cls) => (css.match(new RegExp('\\.' + cls + ' \\{[^}]*\\}')) ?? ['(无此规则)'])[0];
const defaultFills = ['ilife-block-mini-bar-fill', 'ilife-block-dist-row-fill']
  .map((cls) => cls + ' → ' + (ruleOf(cls).match(/background:\s*[^;]+/) ?? ['(无 background)'])[0]);
const hasDefaultFill = defaultFills.some((line) => !line.includes('(无 background)'));
check('P1.f 不给 color 时样式层也没有兜底色（视觉层）', !hasDefaultFill,
  '样式段缺省填充色=' + JSON.stringify(defaultFills) + '（存在即「颜色只从入参来」在视觉层不成立）');
const newRuleLiterals = colorLiterals(NEW_CLASSES.map((cls) => ruleOf(cls)).join('\n'));
check('P1.g 13 个新类自己的规则体零色值字面量（票面「区块自身不写死色值」的样式侧）', newRuleLiterals.length === 0,
  '命中=' + JSON.stringify(newRuleLiterals));
const cssLiterals = colorLiterals(css);
say('  旁读（票面外的全表读数）：blocksCss 全文色值字面量命中=' + cssLiterals.length + ' ' + JSON.stringify(cssLiterals)
  + '；其中 `#104`／`#179` 是注释里的票号（正则误命中），`rgba(`／`#b25000` 是 #104 起的既有规则——新旧零变见 P3 的「字面量命中数不变」读数');

/* ────────────────────────── P2 判据鉴别力 ────────────────────────── */

say('== P2 判据鉴别力（实施席断言是否自己满足自己）==');
const testSrc = fs.readFileSync(TEST421, 'utf8');

// P2.1 类名断言是整词还是子串：喂一枚「根类＋后缀」的退化产物，看两种判据谁被蒙住。
const degradedChip = '<span class="ilife-block-chip-x">甲</span>';
const wholeWord = tagsWithClass(degradedChip, 'ilife-block-chip').length;
const substring = [...String(degradedChip).matchAll(/<[a-z]+ [^>]*>/g)].filter((m) => m[0].includes('ilife-block-chip')).length;
check('P2.1 实施席类名断言按整词比对（子串退化拦得住）', wholeWord === 0 && substring === 1,
  '喂 <span class="ilife-block-chip-x">：整词判据命中=' + wholeWord + '，子串判据命中=' + substring + '（后者会误判）');

// P2.2 空态覆盖面：票面「rows／items 为空 → 空串」到底测了哪些「空」。
const emptyProbe = testSrc.match(/rows: \[\]|items: \[\]/g) ?? [];
const emptyUndefined = testSrc.match(/rows: undefined|items: undefined|\{\s*\)/g) ?? [];
say('  实施席测试件里 `[] 空态` 断言锚点=' + JSON.stringify(emptyProbe) + '；`undefined 空态`锚点=' + JSON.stringify(emptyUndefined));
const undefinedEmpty = [() => probe.renderDistributionRows({ rows: undefined }), () => probe.renderChips({ items: undefined })];
const undefinedOutcome = undefinedEmpty.map((fn) => { try { return 'return:' + JSON.stringify(fn()); } catch (err) { return 'throw:' + err.code; } });
say('  实测 `rows／items: undefined` 的走向=' + JSON.stringify(undefinedOutcome));
check('P2.2 空态判据只锚 `[]`（`undefined` 走向 bad-input，票面「空→空串」若含 undefined 则未被判据覆盖）',
  undefinedOutcome.every((x) => x === 'throw:bad-input'), '读数=' + JSON.stringify(undefinedOutcome) + '（实施席判据只断言 `[]`→空串）');

// P2.3 样式判据的鉴别力：把 13 个新类规则体整段抽掉，实施席唯一一条对 blocksCss 的判据仍为真。
const stripped = NEW_CLASSES.reduce((acc, cls) => acc.replace(new RegExp('(\\.' + cls + ' \\{)[^}]*\\}'), '$1}'), css);
const selectorPredicate = NEW_CLASSES.filter((cls) => stripped.includes('.' + cls + ' {')).length;
const bodyKept = NEW_CLASSES.filter((cls) => (stripped.match(new RegExp('\\.' + cls + ' \\{([^}]*)\\}')) ?? [])[1]?.trim() !== '').length;
check('P2.3 规则体清空后「13 个类各有规则块」判据仍真（样式判据对视觉退化无鉴别力）',
  selectorPredicate === 13 && bodyKept === 0,
  '抽掉规则体后选择器判据命中=' + selectorPredicate + '/13，仍带声明的规则数=' + bodyKept
  + '（真跑判据的实证见草稿变异 M3）；实施席对 blocksCss 的断言仅 ' + (testSrc.match(/css\.includes\('\.' \+ cls \+ ' \{'\)/g) ?? []).length + ' 条选择器谓词');

// P2.4 空列表判据是否等价变异体：`[].map(f).join('')` 与早返同值。
const guardEquivalent = [].map((x) => x).join('') === '' && String(probe.renderChips({ items: [] })) === '';
check('P2.4 空列表判据是等价变异体（删掉它也同值）', guardEquivalent,
  'renderChips({items: []})=' + JSON.stringify(probe.renderChips({ items: [] })) + '，`[].map().join()`=' + JSON.stringify([].map((x) => x).join('')));
say('  鉴别力缺口（实测见草稿变异）：M2 删掉 renderChips 空判据 → 判据仍全绿；M3 清空 13 类规则体 → 判据仍全绿；M4 去 role/aria-label → 判据仍全绿。');

/* ────────────────────────── P4 提交边界（只读 git） ────────────────────────── */

say('== P4 提交边界 ==');
const git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const stat = git(['show', '--numstat', '--format=', 'f481af5']);
const statLines = stat.stdout.trim().split('\n').filter((l) => l.trim() !== '');
say('  git show --numstat f481af5 →\n' + statLines.map((l) => '    ' + l).join('\n'));
const declared = ['docs/base/base-render/t421-page-viz.md', 'packages/base-render/src/blocks.ts', 'packages/base-render/test/page-viz-421.test.mjs'];
const filesInCommit = statLines.map((l) => l.split('\t')[2]).sort();
check('P4.a 提交只含声明的三件', JSON.stringify(filesInCommit) === JSON.stringify([...declared].sort()),
  '实际=' + JSON.stringify(filesInCommit) + '（279／300／151 行全新增）');

const diffSrc = git(['diff', 'a187b537', 'f481af5', '--', 'packages/base-render/src/blocks.ts']).stdout;
const addedLines = diffSrc.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
const removedLines = diffSrc.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
const hunkCount = (diffSrc.match(/^@@/gm) ?? []).length;
check('P4.b 本票对 blocks.ts 是纯新增（0 删除行）', removedLines.length === 0,
  'hunk=' + hunkCount + '，新增行=' + addedLines.length + '，删除行=' + removedLines.length);

const foreign = addedLines.filter((l) => /optNumeric|PRINTABLE_PAGE_NAME|PRINTABLE_SLUG|paramForm|page-printable|renderTocBlock\(/.test(l));
check('P4.c 别票（#397 参数表单段／#420 打印段）的代码 hunk 未被裹进本票', foreign.length === 0,
  '本票新增行里命中别票标识符的行=' + JSON.stringify(foreign));
const mention420 = addedLines.filter((l) => l.includes('#420'));
say('  本票新增行里提及 #420 的仅注释：' + JSON.stringify(mention420.map((l) => l.trim().slice(0, 60))));

const treeSame = git(['diff', '--quiet', 'f481af5', '--', ...declared]);
check('P4.d 当刻工作区三件与 f481af5 逐字相同（未被实施后偷改）', treeSame.status === 0,
  'git diff --quiet f481af5 -- <三件> exit=' + treeSame.status);

/* ────────────────────────── P3 新旧零变 A/B（--ab，需持锁） ────────────────────────── */

if (process.argv.includes('--ab')) {
  say('== P3 新旧零变 A/B（临时换入 a187b537 的 blocks.ts，逐文件还原）==');
  fs.mkdirSync(SCRATCH, { recursive: true });
  const original = fs.readFileSync(SRC, 'utf8');
  const originalSha = sha256(original);
  const compile = (label) => {
    const r = spawnSync(process.execPath, [TSC, '-b', 'packages/base-render'], { cwd: root, stdio: 'inherit' });
    say('  compile[' + label + '] exit=' + r.status);
    return r.status;
  };
  const collect = (outName) => {
    const outPath = path.join(SCRATCH, outName);
    const r = spawnSync(process.execPath, [path.join(root, 'docs/base/base-render/t421-review-probe.mjs'), '--collect', outPath], { cwd: root, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('采集失败 ' + outName);
    return JSON.parse(fs.readFileSync(outPath, 'utf8'));
  };
  try {
    const oldSrc = git(['show', 'a187b537:packages/base-render/src/blocks.ts']).stdout;
    fs.writeFileSync(SRC, oldSrc);
    compile('old');
    const before = collect('p3-old.json');
    fs.writeFileSync(SRC, original);
    const restored1 = sha256(fs.readFileSync(SRC, 'utf8')) === originalSha;
    compile('new');
    const after = collect('p3-new.json');

    const existing = Object.keys(after.products).filter((k) => !NEW_FNS.includes(k) && k !== 'blocksCss');
    const same = existing.filter((k) => before.products[k] === after.products[k]);
    const differ = existing.filter((k) => before.products[k] !== after.products[k]);
    const newAbsent = NEW_FNS.filter((k) => String(before.products[k]).startsWith('THROW:'));
    const newPresent = NEW_FNS.filter((k) => !String(after.products[k]).startsWith('THROW:'));
    const oldSet = new Set(before.cssClasses);
    const newSet = new Set(after.cssClasses);
    const cssAdded = [...newSet].filter((c) => !oldSet.has(c)).sort();
    const cssRemoved = [...oldSet].filter((c) => !newSet.has(c)).sort();
    say('  既有区块产物逐字比对：相同=' + same.length + '／' + existing.length + '，差异=' + JSON.stringify(differ));
    say('  blocksCss 类名差：新增=' + JSON.stringify(cssAdded) + '，消失=' + JSON.stringify(cssRemoved));
    check('P3.a 既有区块函数产物两侧逐字相同（sha 相等，blocksCss 单列）', differ.length === 0,
      '相同=' + same.length + '／' + existing.length + '，差异键=' + JSON.stringify(differ));
    check('P3.b 差异只落在四个新函数与 blocksCss', differ.every((k) => k === 'blocksCss') && before.products.blocksCss !== after.products.blocksCss,
      'blocksCss sha 旧=' + String(before.products.blocksCss).slice(0, 12) + ' 新=' + String(after.products.blocksCss).slice(0, 12));
    check('P3.c 四个新函数在旧产物里不存在、在新产物里齐备', newAbsent.length === 4 && newPresent.length === 4,
      '旧侧缺席=' + JSON.stringify(newAbsent) + ' 新侧在册=' + JSON.stringify(newPresent));
    check('P3.d 样式差异恰为 13 个新类（无闭集外类名、无既有类被删）', cssAdded.length === 13 && cssRemoved.length === 0,
      '新增=' + JSON.stringify(cssAdded) + ' 消失=' + JSON.stringify(cssRemoved));
    check('P3.e 还原后源码 sha 与入场同值', restored1 && sha256(fs.readFileSync(SRC, 'utf8')) === originalSha,
      'restored=' + restored1 + ' sha=' + sha256(fs.readFileSync(SRC, 'utf8')).slice(0, 16) + ' 入场=' + originalSha.slice(0, 16));
    check('P3.g 新旧 blocksCss 的色值字面量命中数相同（本票没往样式表里加色值字面量）',
      before.cssLiterals.length === after.cssLiterals.length,
      '旧=' + before.cssLiterals.length + ' ' + JSON.stringify(before.cssLiterals) + ' 新=' + after.cssLiterals.length + ' ' + JSON.stringify(after.cssLiterals));
  } finally {
    fs.writeFileSync(SRC, original);
    compile('final-restore');
    const diffAfter = git(['diff', '--quiet', '--', 'packages/base-render/src/blocks.ts']);
    check('P3.f 收尾还原干净（git diff -- blocks.ts 为空）', diffAfter.status === 0,
      'git diff --quiet -- packages/base-render/src/blocks.ts exit=' + diffAfter.status
      + '；收尾 sha=' + sha256(fs.readFileSync(SRC, 'utf8')).slice(0, 16));
  }
} else {
  say('== P3 未跑（加 --ab 并在加锁包装器内跑）==');
}

const failed = checks.filter((c) => !c.pass);
say('PROBE-SUMMARY checks=' + checks.length + ' pass=' + (checks.length - failed.length) + ' fail=' + failed.length
  + ' failedIds=' + JSON.stringify(failed.map((c) => c.id)));
