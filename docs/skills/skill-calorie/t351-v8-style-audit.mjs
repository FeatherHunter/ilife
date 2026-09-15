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

const files = readdirSync(DIR).filter((f) => /^order\d+-.*\.html$/.test(f)).sort();
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
  // 重复句：剔掉纯日期/纯数字（那是数据本来的样子，不是文案冗余）
  const prose = lines.filter((s) => s.length > 6 && !/^[\d\s\-–—/.、:：]+$/.test(s));
  const dupes = [...new Set(prose.filter((s) => prose.filter((x) => x === s).length > 1))];
  const colors = new Set((styleText.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  rows.push({
    file: f,
    bp820: /@media\s*\(max-width:\s*820px\)/.test(styleText),
    touch44: /min-height:\s*(4[4-9]|[5-9]\d)px/.test(styleText),
    tap: /-webkit-tap-highlight-color/.test(styleText) && /touch-action/.test(styleText),
    styleBlocks: (pageHtml.match(/<style/gi) ?? []).length,
    inlineStyle: (pageHtml.match(/\sstyle="/g) ?? []).length,
    colors: colors.size,
    sep: sep.length,
    sepLines: sep,
    dupes: dupes.length,
    dupeLines: dupes,
  });
}

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('文件'.padEnd(26) + pad('820断点', 9) + pad('≥44px', 7) + pad('触屏三件', 9)
  + pad('样式块', 7) + pad('内联style', 10) + pad('色值数', 7) + pad('分隔符行', 9) + '重复句');
for (const r of rows) {
  console.log(pad(r.file, 26) + pad(r.bp820 ? 'Y' : '—', 9) + pad(r.touch44 ? 'Y' : '—', 7)
    + pad(r.tap ? 'Y' : '—', 9) + pad(r.styleBlocks, 7) + pad(r.inlineStyle, 10)
    + pad(r.colors, 7) + pad(r.sep, 9) + r.dupes);
}

const bad = {
  缺820断点: rows.filter((r) => !r.bp820).map((r) => r.file),
  缺触摸目标: rows.filter((r) => !r.touch44).map((r) => r.file),
  缺触屏三件: rows.filter((r) => !r.tap).map((r) => r.file),
  有分隔符懒政: rows.filter((r) => r.sep > 0).map((r) => r.file + '(' + r.sep + ')'),
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
