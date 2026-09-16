/** T417-query · 查询域 18 份页「六条观感口径」机审（负责人那六条的**可机检部分**）。
 *
 * 照抄 `docs/skills/skill-bill/t407-v8-style-audit.mjs` 的判据与实现，只换两处：
 *   ① 产物文件名规则：本域是 `w01-…w17-…` 17 词 ＋ `w00-空态-…` 1 空态，**固定 18 份名单**
 *      （名单硬写在本文件里，不进目录登记表 —— 产物目录里另有墙页／索引，不进本册，靠目录筛会混进来）。
 *   ② 判据里的特例：本域种子备注全中文，无写域那三个 ASCII 夹具名；`FIXTURE_DATA` 只留空壳（命中即逐行列出由人裁）。
 *
 * 六条里能机检的：① 双端断点 ② 手机端四条手法（触摸目标／自约束／塌列／内距）③ 代码层面（内联样式、
 * 页内样式块数、色值数）④ 文字冗余（同一句重复出现）⑤ 分隔符懒政（`·`／`；`／`;`／`|` 顶替设计）。
 * 第 ⑥ 条（截图审美）机检不了，走墙＋人，不在本脚本。
 *
 * **本域要紧的一条口径**（与 t407 同）：18 份产物 `body` 之后**没有一个页内样式块**，全部外观来自 head 里那份
 * 共享样式表。所以每列的读数都出**两套**：「共享」与「本页」（0 就是本页什么都没写，不等于没做对）。
 *
 * 用法：
 *   node docs/skills/skill-bill/t417-query-audit.mjs --dir .scratch/t417-wall
 *   node docs/skills/skill-bill/t417-query-audit.mjs --dir <不存在的目录>     → 反例，exit 1 并点名缺件
 * 退出码：0 全绿（无分隔符懒政、无英文裸词、无重复句、18 份齐）；1 有命中或缺件；2 用法错。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const outArg = argv.indexOf('--dir');
if (outArg < 0 || argv[outArg + 1] === undefined) {
  console.error('必须显式给 --dir <产物目录>。例：--dir .scratch/t417-wall');
  process.exit(2);
}
const DIR = resolve(argv[outArg + 1]);

/** 本册 18 份（17 词 w01–w17 ＋ 空态 w00）。多一份少一份都要点名。 */
const FILES = [
  'w01-查今天.html',
  'w02-查昨天.html',
  'w03-查某天.html',
  'w04-查最近.html',
  'w05-查账单.html',
  'w06-查周.html',
  'w07-查月.html',
  'w08-查区间.html',
  'w09-查分类.html',
  'w10-查账户.html',
  'w11-查账本.html',
  'w12-搜备注.html',
  'w13-查标签.html',
  'w14-查欠款.html',
  'w15-查待报销.html',
  'w16-查分期.html',
  'w17-查账单详情.html',
  'w00-空态-查某天无记录.html',
];

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
/** 版式位（分隔符顶替设计的地方）：状态徽章／阻断条标题／提示行／提示副行／卡片副行／表头说明。
 *  刻意**不**含表格单元格与胶囊（`ilife-block-chip`）——单元格里的是数据，胶囊是独立形状，
 *  两者都不是拿标点当版式；混进来会把这一列冲成噪声。
 *  **眉头与页标题不再算版式位**（t407 整改裁定：标题写法允许保留一个分隔符）。 */
const DESIGN_POS = /(status-badge|error-title|toast-lines|toast-detail|kpi-card-detail|data-table-caption)/;
/** 标题写法位（允许保留一个分隔符，不进「分隔符懒政」的处数）。 */
const TITLE_POS = /(page-shell-eyebrow|page-shell-title)/;
/** 非版式位：落在这里的 `·`／`|` 只作旁证列出，不进处数。 */
const NON_DESIGN_POS = /(data-table-cell|param-form-input|param-form-label|param-form-required)/;
/** 载荷位：复制载荷、选择器回显——里面的标点是载荷本来的样子，不是页面文案。 */
const PAYLOAD_POS = /(pre-block-code|data-t|copy-btn|copy-menu|param-form-input)/;
const missing = FILES.filter((f) => !existsSync(join(DIR, f)));
const rows = [];
for (const f of FILES) {
  if (!existsSync(join(DIR, f))) continue;
  const html = readFileSync(join(DIR, f), 'utf8');
  const bodyStart = html.indexOf('<body');
  const pageHtml = bodyStart < 0 ? html : html.slice(bodyStart);
  const headCss = bodyStart < 0 ? '' : [...html.slice(0, bodyStart).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1]).join('\n');
  const styleText = [...pageHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const lines = visibleLines(html);
  const visibleArea = pageHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[\s\S]*?"/g, '');
  const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source', 'col', 'area', 'base', 'wbr']);
  const steps = [];
  for (const t of visibleArea.matchAll(/<[^>]*>/g)) steps.push({ at: t.index, end: t.index + t[0].length, tag: t[0] });
  const positions = [];
  {
    const stack = [];
    let ti = 0;
    let next = steps[0]?.at ?? Infinity;
    for (const m of visibleArea.matchAll(/·|；|;|\|/g)) {
      while (next < m.index && ti < steps.length) {
        const s = steps[ti++];
        const name = (s.tag.match(/^<\/?\s*([a-z0-9]+)/i) ?? [])[1]?.toLowerCase() ?? '';
        if (s.tag.startsWith('</')) {
          const keep = stack.lastIndexOf(name);
          if (keep >= 0) stack.length = keep;
        } else if (!VOID.has(name) && !s.tag.endsWith('/>')) {
          stack.push({ name, cls: (s.tag.match(/class="([^"]*)"/) ?? [])[1] ?? '' });
        }
        next = steps[ti]?.at ?? Infinity;
      }
      positions.push({ ch: m[0], cls: [...stack].reverse().find((x) => x.cls)?.cls ?? '', idx: m.index });
    }
  }
  const sep = lines.filter((s) => /[·；;|]/.test(s));
  const sepPos = positions;
  const designHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|') && DESIGN_POS.test(s.cls));
  const titleHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|') && TITLE_POS.test(s.cls));
  const nonDesignHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|')
    && !TITLE_POS.test(s.cls) && NON_DESIGN_POS.test(s.cls));
  const nearOf = (idx) => visibleArea.slice(Math.max(0, idx - 400), idx + 400)
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const claim = (hits) => {
    const nearList = hits.map((s) => nearOf(s.idx));
    return sep.filter((s) => /[·|]/.test(s)
      && (nearList.some((n) => n.includes(s)) || nearList.some((n) => s.includes(n))));
  };
  const designLines = claim(designHits);
  const nonDesignLines = claim(nonDesignHits).filter((s) => !designLines.includes(s));
  const cellText = new Set([...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  const MASK = /[‌﻿]/g;
  const prose = lines.map((s) => s.replace(MASK, '')).filter((s) => s.length > 6
    && !/^[\d\s\-–—/.、:：]+$/.test(s) && !cellText.has(s));
  const dupes = [...new Set(prose.filter((s) => prose.filter((x) => x === s).length > 1))];
  const liveCss = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const headLive = headCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const colors = new Set((liveCss.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  const headColors = new Set((headLive.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  const ASCII_OK = /20\d\d-\d\d-\d\d|\d\d:\d\d|L1|L2|L3|HTML|\d+\.\d{2}/g;
  // 本域种子全中文，无写域那三个 ASCII 夹具名；命中即逐行列出由人裁，不设豁免。
  const FIXTURE_DATA = /本域无豁免夹具名/g;
  const copyLines = visibleLines(html.replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<button[^>]*data-t="[^"]*"[\s\S]*?<\/button>/gi, ''));
  const asciiBad = copyLines
    .filter((s) => !cellText.has(s))
    .map((s) => ({ line: s, rest: s.replace(ASCII_OK, '').replace(FIXTURE_DATA, '') }))
    .filter((x) => /[A-Za-z]/.test(x.rest))
    .map((x) => x.line);
  rows.push({
    file: f,
    headCss: headCss.length,
    headBp820: /@media\s*\(max-width:\s*820px\)/.test(headCss),
    headBp640: /@media\s*\(max-width:\s*640px\)/.test(headCss),
    headMin44: /min-height:\s*44px/.test(headCss),
    headWrap: /flex-wrap/.test(headCss),
    headGridAuto: /grid-template-columns:\s*repeat\(auto-fit/.test(headCss),
    headPad: /@media\s*\(max-width:\s*820px\)[\s\S]{0,400}?padding:/.test(headCss),
    headColors: headColors.size,
    bp820: /@media\s*\(max-width:\s*820px\)/.test(styleText),
    tapTargets: (pageHtml.match(/<label|<summary|<button/g) ?? []).length,
    touch44: /min-height:\s*(4[4-9]|[5-9]\d)px/.test(styleText),
    tap: /-webkit-tap-highlight-color/.test(styleText) && /touch-action/.test(styleText),
    selfWidth: /max-width:\s*\d+/.test(styleText),
    collapse: /grid-template-columns|flex-wrap/.test(styleText),
    innerPad: /padding:/.test(styleText),
    styleBlocks: (pageHtml.match(/<style/gi) ?? []).length,
    inlineStyle: (pageHtml.match(/\sstyle="/g) ?? []).length,
    colors: colors.size,
    sep: sep.length,
    sepLines: sep,
    design: designHits.length,
    designLines,
    titleDots: titleHits.length,
    nonDesign: nonDesignHits.length,
    nonDesignLines,
    semi: sepPos.filter((s) => s.ch === '；' || s.ch === ';').length,
    semiPayload: sepPos.filter((s) => (s.ch === '；' || s.ch === ';') && PAYLOAD_POS.test(s.cls)).length,
    ascii: asciiBad.length,
    asciiLines: asciiBad,
    dupes: dupes.length,
    dupeLines: dupes,
  });
}

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('文件'.padEnd(30) + pad('820断点', 9) + pad('自造可点件', 11) + pad('≥44px', 7) + pad('触屏三件', 9)
  + pad('样式块', 7) + pad('内联style', 10) + pad('色值数', 7) + pad('懒政·', 7) + pad('分隔符行', 10)
  + pad('英文行', 7) + '重复句');
console.log('（断点／≥44px 两列给的是**本页**读数；公共层读数见下面汇总的「共享层」。'
  + '自造可点件为 0 的页，本页不写 ≥44px 是对的。）');
for (const r of rows) {
  console.log(pad(r.file, 30) + pad(r.bp820 ? 'Y' : '—', 9) + pad(r.tapTargets, 11)
    + pad(r.tapTargets === 0 ? '共享' : (r.touch44 ? 'Y' : '—'), 7)
    + pad(r.tap ? 'Y' : '—', 9) + pad(r.styleBlocks, 7) + pad(r.inlineStyle, 10)
    + pad(r.colors, 7) + pad(r.design, 7) + pad(r.sep, 10) + pad(r.ascii, 7) + r.dupes);
}

const bad = {
  本页缺820断点: rows.filter((r) => !r.bp820).map((r) => r.file),
  本页缺触摸目标: rows.filter((r) => r.tapTargets > 0 && !r.touch44).map((r) => r.file),
  本页缺触屏三件: rows.filter((r) => !r.tap).map((r) => r.file),
  有分隔符懒政: rows.filter((r) => r.design > 0).map((r) => r.file + '(' + r.design + ')'),
  有英文裸词: rows.filter((r) => r.ascii > 0).map((r) => r.file + '(' + r.ascii + ')'),
  有重复句: rows.filter((r) => r.dupes > 0).map((r) => r.file + '(' + r.dupes + ')'),
};
console.log('\n===== 逐条汇总（共 ' + rows.length + ' 份）=====');
for (const [k, v] of Object.entries(bad)) {
  console.log(k + '：' + (v.length === 0 ? '0 份' : v.length + ' 份 → ' + v.join('、')));
}
console.log('  合计：设计位 `·`／`|` ' + rows.reduce((a, r) => a + r.design, 0) + ' 处；'
  + '标题写法位（眉头／页标题，**允许保留**）'
  + rows.reduce((a, r) => a + r.titleDots, 0) + ' 处；'
  + '`；`／`;` ' + rows.reduce((a, r) => a + r.semi, 0) + ' 处（其中落在载荷位 '
  + rows.reduce((a, r) => a + r.semiPayload, 0) + ' 处，载荷里的分号是数据本来的样子）。');
const first = rows[0];
console.log('\n===== 共享层（head 里那份样式表，公共层的成绩，不是本页的）=====');
if (first) {
  console.log('head 样式表 ' + first.headCss + ' 字符；820 断点 ' + (first.headBp820 ? '有' : '无')
    + '；640 断点 ' + (first.headBp640 ? '有' : '无') + '；min-height:44px ' + (first.headMin44 ? '有' : '无')
    + '；flex-wrap ' + (first.headWrap ? '有' : '无') + '；auto-fit 塌列 ' + (first.headGridAuto ? '有' : '无')
    + '；窄屏内距 ' + (first.headPad ? '有' : '无') + '；色值 ' + first.headColors + ' 个');
}
const headSame = rows.filter((r) => r.headCss === first.headCss).length;
console.log('共享样式表逐字节同一份的页：' + headSame + '／' + rows.length);
console.log('本页 body 之后有样式块的页：' + (rows.filter((r) => r.styleBlocks > 0).length === 0
  ? '0 份 —— 18 份的外观全部来自共享样式表' : rows.filter((r) => r.styleBlocks > 0).map((r) => r.file).join('、')));
console.log('本页有内联 style 属性的页：' + (rows.filter((r) => r.inlineStyle > 0).length === 0
  ? '0 份' : rows.filter((r) => r.inlineStyle > 0).map((r) => r.file).join('、')));

console.log('\n分隔符懒政逐行（`·`／`|` 落在版式位上，只列有问题的）：');
for (const r of rows.filter((x) => x.design > 0)) {
  console.log('  [' + r.file + '  ' + r.design + ' 处]');
  for (const l of r.designLines) console.log('      ' + l);
}
console.log('\n英文裸词逐行（只列有问题的）：');
for (const r of rows.filter((x) => x.ascii > 0)) {
  console.log('  [' + r.file + '  ' + r.ascii + ' 行]');
  for (const l of r.asciiLines) console.log('      ' + l);
}
console.log('\n重复句逐行（只列有问题的）：');
for (const r of rows.filter((x) => x.dupes > 0)) {
  console.log('  [' + r.file + ']');
  for (const l of r.dupeLines) console.log('      ' + l);
}

// 红的判据＝**版式位**上的分隔符懒政（`·`／`|` 当版式用）＋英文裸词＋重复句＋清单缺件。
const failed = missing.length > 0 || bad.有分隔符懒政.length > 0 || bad.有英文裸词.length > 0
  || bad.有重复句.length > 0;
if (missing.length > 0) {
  console.log('\n清单点名缺件 ' + missing.length + ' 份 → ' + missing.join('、'));
}
console.log('\n读数：' + (failed ? '有命中（红）' : '全绿') + '；共 ' + rows.length + ' 份产物，缺 ' + missing.length + ' 份。');
process.exit(failed ? 1 : 0);
