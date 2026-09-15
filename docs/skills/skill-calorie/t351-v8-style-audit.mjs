/** T351-v8 · 全量页面「六条观感口径」机审（负责人 2026-09-15 给的那六条的**可机检部分**）。
 *
 * 六条里能机检的：① 双端断点 ② 手机端四条手法（触摸目标／自约束／塌列／内距）③ 代码层面（内联样式、
 * 页内样式块数、色值数）④ 文字冗余（同一句重复出现）⑤ 分隔符懒政（`·`／`；` 顶替设计）。
 * 第 ⑥ 条（截图审美）机检不了，走人工＋VLM 评审，见证据件。
 *
 * 用法：node docs/skills/skill-calorie/t351-v8-style-audit.mjs --dir <产物目录>
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const outArg = argv.indexOf('--dir');
if (outArg < 0 || argv[outArg + 1] === undefined) {
  console.error('必须显式给 --dir <产物目录>。例：--dir .scratch/t351-fix/final-v8');
  process.exit(2);
}
const DIR = resolve(argv[outArg + 1]);

/** 剥掉样式与脚本，取可见文本行（复制载荷 `data-t` 不算可见文本）。 */
function visibleLines(html) {
  const body = html
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[^"]*"/g, '')
    .replace(/<[^>]+>/g, '\n');
  return body.split('\n').map((s) => s.trim()).filter(Boolean);
}

const files = readdirSync(DIR).filter((f) => /^order\d+-.*\.html$/.test(f)
  // 也接受**自造用例**的文件名（空态／大号用例：`wizard-empty.html` 这种）——
  // 那些路径 37 份夹具走不到，正是判据最该照到的地方。
  || (/^[a-z][a-z0-9-]*\.html$/.test(f) && !f.includes('detail'))).sort();
const rows = [];
for (const f of files) {
  const html = readFileSync(join(DIR, f), 'utf8');
  // **只认页内样式块**：head 里那一块是共享样式表（36KB，helpShell 的 820 与 44px 都在里面），
  // 拿它来判「本页有没有做双端/触摸目标」会全绿——那是别人的成绩。页内样式一律在 <body> 之后插。
  const bodyStart = html.indexOf('<body');
  const pageHtml = bodyStart < 0 ? html : html.slice(bodyStart);
  const styleText = [...pageHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const lines = visibleLines(html);
  const sep = lines.filter((s) => /[·；;]/.test(s));
  // 表格**单元格**里的文字是数据（同一条规则在三个计划格上各命中一次，原因句就会重复三遍），
  // 不是页面文案在说两遍同一件事——重复句只判「正文文案」，故先把单元格文本摘出来剔掉。
  const cellText = new Set([...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  // 重复句：剔掉纯日期/纯数字（那是数据本来的样子），剔掉「周X 不排训练」（空日占位句按周各出一份），
  // 再剔掉表格单元格。
  const prose = lines.filter((s) => s.length > 6 && !/^[\d\s\-–—/.、:：]+$/.test(s)
    && !/不排训练$/.test(s) && !cellText.has(s));
  const dupes = [...new Set(prose.filter((s) => prose.filter((x) => x === s).length > 1))];
  // 色值数只数**活的声明**：先剥掉 CSS 注释（注释里常引老页色值当出处，那不是本页用的色）。
  const liveCss = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const colors = new Set((liveCss.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  // 英文裸词／内部标识：可见正文里出现 ASCII 字母的行。**五条机检查不出这一类**——
  // `plan`／`all`／`W1D3`／`getPlan` 看着都像数据，实则是内部键名或函数名（第 ④ 条）。
  //
  // 白名单分两类，都必须**说得清来路**，不许放宽成「像数据就放过」（那等于没查）：
  //   ① 本就该有英文的：日期时间、单位（kg／ml／RPM／BMI）、器械名（T-bar）、提示词里的 HTML／AI；
  //   ② **夹具自己的数据值**——`t1计划`（计划名）／`v1`（版本）／`示例改名`／`副本`：那是用户数据，
  //      真用户的计划名自己起。夹具一换，这里要同步改（写在下面一行，改的是同一处）。
  const ASCII_OK = /20\d\d-\d\d-\d\d|\d\d:\d\d|\d+\s*(?:kg|ml|km|cm)|RPM|BMI|HTML|\bAI\b|T-?bar/g;
  const FIXTURE_DATA = /t1计划|v\d+|示例改名|副本/g;
  // 提示词区块（`<pre>`）是**照抄触发器资产**的载荷——页上照抄、另有判据逐字对账（机检「逐字 prompt」那条）。
  // 它里面的 `(kg,选填)` 属那份资产的写法，改它要动唤醒词资产（不在本图）；ASCII 只查**本页写的文案**，
  // 故先剔掉 `<pre>`（与剔 `data-t` 载荷同口径：载荷不是文案）。
  const copyLines = visibleLines(html.replace(/<pre[\s\S]*?<\/pre>/gi, ''));
  const asciiBad = copyLines
    .map((s) => ({ line: s, rest: s.replace(FIXTURE_DATA, '').replace(ASCII_OK, '') }))
    .filter((x) => /[A-Za-z]/.test(x.rest))
    .map((x) => x.line);
  // 本页**自造**的可点件（页签／折叠头）：0 个的页（如 185 只有共享复制按钮）不必自带触摸目标，
  // 那件事由共享样式表负责，本页不该重复画一遍。
  const tapTargets = (pageHtml.match(/<label|<summary/g) ?? []).length;
  rows.push({
    file: f,
    bp820: /@media\s*\(max-width:\s*820px\)/.test(styleText),
    tapTargets,
    touch44: tapTargets === 0 || /min-height:\s*(4[4-9]|[5-9]\d)px/.test(styleText),
    tap: /-webkit-tap-highlight-color/.test(styleText) && /touch-action/.test(styleText),
    styleBlocks: (pageHtml.match(/<style/gi) ?? []).length,
    inlineStyle: (pageHtml.match(/\sstyle="/g) ?? []).length,
    colors: colors.size,
    sep: sep.length,
    sepLines: sep,
    ascii: asciiBad.length,
    asciiLines: asciiBad,
    dupes: dupes.length,
    dupeLines: dupes,
  });
}

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('文件'.padEnd(26) + pad('820断点', 9) + pad('自造可点件', 11) + pad('≥44px', 7) + pad('触屏三件', 9)
  + pad('样式块', 7) + pad('内联style', 10) + pad('色值数', 7) + pad('分隔符行', 9) + pad('英文行', 7) + '重复句');
for (const r of rows) {
  console.log(pad(r.file, 26) + pad(r.bp820 ? 'Y' : '—', 9) + pad(r.tapTargets, 11)
    + pad(r.tapTargets === 0 ? '共享' : (r.touch44 ? 'Y' : '—'), 7)
    + pad(r.tap ? 'Y' : '—', 9) + pad(r.styleBlocks, 7) + pad(r.inlineStyle, 10)
    + pad(r.colors, 7) + pad(r.sep, 9) + pad(r.ascii, 7) + r.dupes);
}

const bad = {
  缺820断点: rows.filter((r) => !r.bp820).map((r) => r.file),
  缺触摸目标: rows.filter((r) => !r.touch44).map((r) => r.file),
  缺触屏三件: rows.filter((r) => !r.tap).map((r) => r.file),
  有分隔符懒政: rows.filter((r) => r.sep > 0).map((r) => r.file + '(' + r.sep + ')'),
  有英文裸词: rows.filter((r) => r.ascii > 0).map((r) => r.file + '(' + r.ascii + ')'),
  有重复句: rows.filter((r) => r.dupes > 0).map((r) => r.file + '(' + r.dupes + ')'),
};
console.log('\n===== 逐条汇总（共 ' + rows.length + ' 份）=====');
for (const [k, v] of Object.entries(bad)) {
  console.log(k + '：' + (v.length === 0 ? '0 份' : v.length + ' 份 → ' + v.join('、')));
}
console.log('\n分隔符逐行（只列有问题的）：');
for (const r of rows.filter((x) => x.sep > 0)) {
  console.log('  [' + r.file + ']');
  for (const l of r.sepLines) console.log('      ' + l);
}
console.log('\n英文裸词逐行（只列有问题的）：');
for (const r of rows.filter((x) => x.ascii > 0)) {
  console.log('  [' + r.file + ']');
  for (const l of r.asciiLines) console.log('      ' + l);
}
