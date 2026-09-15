/** T407-v8 · 写入域 32 份页「六条观感口径」机审（负责人那六条的**可机检部分**）。
 *
 * 照抄 `docs/skills/skill-calorie/t351-v8-style-audit.mjs` 的判据与实现，只改两处：
 *   ① 产物文件名规则：本域是 `t407-页-<唤醒词>-采集页|回执页.html` 加上两张代表页，**固定 32 份名单**
 *      （名单硬写在本文件里，不进目录登记表 —— 目录里另有老样／对照／墙页等不进本册的 HTML，靠目录筛会混进来）。
 *   ② 判据里的特例：本域 `；` 大量出现在说明句里当**句末分号**，另加 `|` 也要查（分隔符懒政四种字符）。
 *
 * 六条里能机检的：① 双端断点 ② 手机端四条手法（触摸目标／自约束／塌列／内距）③ 代码层面（内联样式、
 * 页内样式块数、色值数）④ 文字冗余（同一句重复出现）⑤ 分隔符懒政（`·`／`；`／`;`／`|` 顶替设计）。
 * 第 ⑥ 条（截图审美）机检不了，走人工＋视觉模型评审，不在本脚本。
 *
 * **本域要紧的一条口径**：32 份产物 `body` 之后**没有一个页内样式块**，全部外观来自 head 里那份共享样式表
 * （约 34KB，820 断点／44px／flex-wrap 都在里面）。所以每列的读数都出**两套**：
 *   「共享」＝ head 里那份样式表是不是这么写的（公共层的成绩）；
 *   「本页」＝ 本页自己在 body 之后写了什么（0 就是本页什么都没写，不等于没做对）。
 * 把公共层的成绩记到本页头上，是这支脚本最要紧的误报来源。
 *
 * 用法：
 *   node docs/skills/skill-bill/t407-v8-style-audit.mjs --dir docs/skills/skill-bill
 *   node docs/skills/skill-bill/t407-v8-style-audit.mjs --dir <不存在的目录>     → 反例，exit 1 并点名缺件
 * 退出码：0 全绿（无分隔符懒政、无英文裸词、无重复句、32 份齐）；1 有命中或缺件；2 用法错。
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const outArg = argv.indexOf('--dir');
if (outArg < 0 || argv[outArg + 1] === undefined) {
  console.error('必须显式给 --dir <产物目录>。例：--dir docs/skills/skill-bill');
  process.exit(2);
}
const DIR = resolve(argv[outArg + 1]);

/** 本册 32 份（唤醒词 15 条 × 采集／回执 ＋ 2 张代表页）。多一份少一份都要点名。 */
const FILES = [
  't407-代表-记支出-采集页.html',
  't407-代表-记支出-回执页.html',
  ...['记收入', '记报销', '拍账单', '批量录入', '记退款', '报销到账', '记借出', '记借入',
    '记收回', '记偿还', '记分期', '记一笔', '改记录', '撤销', '恢复']
    .flatMap((w) => [`t407-页-${w}-采集页.html`, `t407-页-${w}-回执页.html`]),
];

/** 剥掉样式与脚本，取可见文本行（复制载荷 `data-t` 不算可见文本）。
 *  本域另有一处载荷：`<pre class="ilife-block-pre-block-code">` 里是**写库指令**（照抄触发器的载荷，不是页面文案），
 *  与卡路里剔 `<pre>` 同口径。这里只对英文裸词那一列剔，分隔符懒政照查（载荷里也不许用 `·` 串内容）。 */
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
 *  刻意**不**含表格单元格（`data-table-cell`）与表单回显件（`param-form-input`／`param-form-label`／
 *  `param-form-required`）——单元格里的 `·` 是数据，选择器里的是回显的槽位名，两者都不是页面文案在排班式；
 *  混进来会把「分隔符懒政」这一列冲成噪声（见下面单独列出的「非版式位」那一节）。
 *
 *  **眉头与页标题不再算版式位**（t407 整改（一）裁定，2026-09-15）：上级原话「页面标题与眉头允许保留一个
 *  分隔符（那是标题写法），其余一律改成形状或拆开」。整改后这两处剩下的 `·` 是**标题写法**，不是偷懒：
 *  眉头 `记账 · 写入域` 32 份逐字同一句，页标题 `记支出 · 回执` 是「唤醒词 · 这一页是什么」的固定写法。
 *  把它们留在判据里，判据就会永远红；故本列只管**正文里的**版式位，标题写法另在证据件里逐处写明。 */
const DESIGN_POS = /(status-badge|error-title|toast-lines|toast-detail|kpi-card-detail|data-table-caption)/;
/** 标题写法位（允许保留一个分隔符，不进「分隔符懒政」的处数；逐处在证据件第三节写明）。 */
const TITLE_POS = /(page-shell-eyebrow|page-shell-title)/;
/** 非版式位：落在这里的 `·`／`|` 只作旁证列出，不进「分隔符懒政」的处数。 */
const NON_DESIGN_POS = /(data-table-cell|param-form-input|param-form-label|param-form-required)/;
/** 载荷位：写库指令、复制载荷、选择器回显——里面的标点是载荷本来的样子，不是页面文案。 */
const PAYLOAD_POS = /(pre-block-code|data-t|copy-btn|copy-menu|param-form-input)/;
const missing = FILES.filter((f) => !existsSync(join(DIR, f)));
const rows = [];
for (const f of FILES) {
  if (!existsSync(join(DIR, f))) continue;
  const html = readFileSync(join(DIR, f), 'utf8');
  // **只认页内样式块**：head 里那一块是共享样式表（约 34KB，820 断点与 44px 都在里面），
  // 拿它来判「本页有没有做双端／触摸目标」会全绿 —— 那是公共层的成绩。页内样式一律在 <body> 之后插。
  const bodyStart = html.indexOf('<body');
  const pageHtml = bodyStart < 0 ? html : html.slice(bodyStart);
  const headCss = bodyStart < 0 ? '' : [...html.slice(0, bodyStart).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1]).join('\n');
  const styleText = [...pageHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const lines = visibleLines(html);
  // 分隔符懒政四种：`·`（间隔号）／`；`／`;`／`|`。**只在可见文本区判**：先剔样式、脚本与 `data-t` 复制载荷
  // （载荷里那些 `;` 是数据本来的样子，剔不掉就会把整页刷成红的）。
  const visibleArea = pageHtml
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/data-t="[\s\S]*?"/g, '');
  // 位置归类用一个**单遍扫描器**，不用 `indexOf('>')` 反推：属性值里可以带换行（复制载荷就带），
  // 按「下一个 `>`」找标签收尾会在那里找错，把版式位判成「无元素」，这一列的读数就废了。
  // 扫描器维护一个标签栈，栈顶就是这一处所在的元素（`class=` 正则天然跨换行）。
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
  // 逐字符判位置：`·`／`|` 是**顶替设计**的四种字符里最要紧的两种（拿标点当版式），单列一列；
  // `；`／`;` 大量是正经的句末分号，只在与两者同列时一并给原文，不替人判好坏。
  const sepPos = positions;
  const designHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|') && DESIGN_POS.test(s.cls));
  /** 标题写法位上还留着的 `·`（眉头／页标题）：只报数另列，不进「分隔符懒政」的处数。 */
  const titleHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|') && TITLE_POS.test(s.cls));
  const nonDesignHits = sepPos.filter((s) => (s.ch === '·' || s.ch === '|')
    && !TITLE_POS.test(s.cls) && NON_DESIGN_POS.test(s.cls));
  // 命中落到「可见行」上：取命中处前后各 400 字符的原文认领（含关系任一成立即算）。
  // 窗口要给得足：表格行拆成多个单元格、提示行的二级中点离行首很远，窗口太小会认领不到行、读数看着像漏了。
  // 版式位与非版式位**分开认领**，`·` 落在表格单元格／选择器上时不进懒政这一列（那是数据与回显，不是版式）。
  const nearOf = (idx) => visibleArea.slice(Math.max(0, idx - 400), idx + 400)
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const claim = (hits) => {
    const nearList = hits.map((s) => nearOf(s.idx));
    return sep.filter((s) => /[·|]/.test(s)
      && (nearList.some((n) => n.includes(s)) || nearList.some((n) => s.includes(n))));
  };
  const designLines = claim(designHits);
  const nonDesignLines = claim(nonDesignHits).filter((s) => !designLines.includes(s));
  // 表格**单元格**里的文字是数据（同一条规则在三行预填格上各命中一次，原因句就会重复三遍），
  // 不是页面文案在说两遍同一件事——重复句只判「正文文案」，故先把单元格文本摘出来剔掉。
  const cellText = new Set([...html.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()));
  // 重复句：剔掉纯日期／纯数字（那是数据本来的样子），再剔掉表格单元格。
  // 行文里夹着不可见字符（零宽空格 U+200B／字面 \uFEFF）时，两句看着一样、比出来却不一样——先抹掉再比。
  const MASK = /[\u200b\ufeff]/g;
  const prose = lines.map((s) => s.replace(MASK, '')).filter((s) => s.length > 6
    && !/^[\d\s\-–—/.、:：]+$/.test(s) && !cellText.has(s));
  const dupes = [...new Set(prose.filter((s) => prose.filter((x) => x === s).length > 1))];
  // 色值数只数**活的声明**：先剥掉 CSS 注释（注释里常引老页色值当出处，那不是本页用的色）。
  const liveCss = styleText.replace(/\/\*[\s\S]*?\*\//g, '');
  const headLive = headCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const colors = new Set((liveCss.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  const headColors = new Set((headLive.match(/#[0-9a-fA-F]{3,8}/g) ?? []).map((c) => c.toLowerCase()));
  // 英文裸词／内部标识：可见正文里出现 ASCII 字母的行。`bill.record.add`／`category`／`data-slot` 看着像数据，
  // 实则是命令名或内部标识名 —— 这一类正是机审要抓的。
  //
  // 允许清单必须**说得清来路**，不许放宽成「像数据就放过」（那等于没查）：
  //   ① 本就该有英文的：日期时间、金额／单位、三级分类示例（L1/L2/L3）、唤醒词资产里的 HTML；
  //   ② 唤醒词本身：`bill.record.add` 这类**命令名**印在屏上算不算裸词，由报告逐页判定，脚本先原样列出，
  //      不放进允许清单（放进去就查不到了）。
  const ASCII_OK = /20\d\d-\d\d-\d\d|\d\d:\d\d|L1|L2|L3|HTML|\d+\.\d{2}/g;
  // 夹具自己的数据值（用户自己起的名字，不是内部标识）：`v1（写库回执）` / `示例改名` / `副本`。
  // 夹具一换这里要同步改（写在下面一行，改的是同一处）。
  const FIXTURE_DATA = /v\d+（写库回执）|示例改名|副本/g;
  // 复制载荷（写库指令）与**表格单元格**都不是「本页写的文案」：单元格里的值取自库内那一行（id／category／
  // 字段名都是真数据的样子），载荷是照抄唤醒词资产的。两处都先剔掉，只查页面自己写的句子——
  // 不剔就会把 32 页一起刷成「有英文裸词」，那等于没查（与卡路里剔 `<pre>`、剔单元格同口径）。
  // 载荷摘不干净：预览按钮上的**可见**标签（`text`／`json`／`csv`）也是真数据格式名，保留在读数里。
  const copyLines = visibleLines(html.replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<button[^>]*data-t="[^"]*"[\s\S]*?<\/button>/gi, ''));
  const asciiBad = copyLines
    .filter((s) => !cellText.has(s))
    .map((s) => ({ line: s, rest: s.replace(ASCII_OK, '').replace(FIXTURE_DATA, '') }))
    .filter((x) => /[A-Za-z]/.test(x.rest))
    .map((x) => x.line);
  rows.push({
    file: f,
    // 公共层（head 里那份共享样式表）
    headCss: headCss.length,
    headBp820: /@media\s*\(max-width:\s*820px\)/.test(headCss),
    headBp640: /@media\s*\(max-width:\s*640px\)/.test(headCss),
    headMin44: /min-height:\s*44px/.test(headCss),
    headWrap: /flex-wrap/.test(headCss),
    headGridAuto: /grid-template-columns:\s*repeat\(auto-fit/.test(headCss),
    headPad: /@media\s*\(max-width:\s*820px\)[\s\S]{0,400}?padding:/.test(headCss),
    headColors: headColors.size,
    // 本页（body 之后）
    bp820: /@media\s*\(max-width:\s*820px\)/.test(styleText),
    // 本页**自造**的可点件：0 个的页不必自带触摸目标，那件事由共享样式表负责，本页不该重复画一遍。
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
    /** 标题写法位（眉头／页标题）上还留着的 `·`：**允许**，只报数（整改裁定见 `DESIGN_POS` 上面那段说明）。 */
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
console.log('（「懒政·」＝ `·`／`|` 落在徽章／副标题／说明行这类**版式位**上的处数，就是分隔符懒政；'
  + '「分隔符行」含句末分号，是宽读数。）');
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
const headVary = rows.filter((r) => r.headBp820 !== first.headBp820 || r.headBp640 !== first.headBp640
  || r.headMin44 !== first.headMin44 || r.headWrap !== first.headWrap || r.headGridAuto !== first.headGridAuto);
// 共享样式表在 32 份之间**不是逐字节同一份**（较新那批多一条 `.ilife-block-page-shell-body > * + .ilife-block`
// 的间距开关，比代表页长 2,185 字符）。上面那几项读数逐份比过：32 份一致，结论不受影响。
console.log('共享样式表逐字节同一份的页：' + headSame + '／' + rows.length
  + '；上面那几项读数（820／640／44px／flex-wrap／auto-fit）逐份不一致的页：'
  + (headVary.length === 0 ? '0 份' : headVary.map((r) => r.file).join('、')));
console.log('本页 body 之后有样式块的页：' + (rows.filter((r) => r.styleBlocks > 0).length === 0
  ? '0 份 —— 32 份的外观全部来自共享样式表' : rows.filter((r) => r.styleBlocks > 0).map((r) => r.file).join('、')));
console.log('本页有内联 style 属性的页：' + (rows.filter((r) => r.inlineStyle > 0).length === 0
  ? '0 份' : rows.filter((r) => r.inlineStyle > 0).map((r) => r.file).join('、')));

console.log('\n分隔符懒政逐行（`·`／`|` 落在版式位上，只列有问题的；这是本域要紧的一列）：');
for (const r of rows.filter((x) => x.design > 0)) {
  console.log('  [' + r.file + '  ' + r.design + ' 处]');
  for (const l of r.designLines) console.log('      ' + l);
}
console.log('\n非版式位上的 `·`／`|`（表格单元格／选择器回显——是数据与回显，不是版式，另列作旁证）：');
for (const r of rows.filter((x) => x.nonDesign > 0)) {
  console.log('  [' + r.file + '  ' + r.nonDesign + ' 处]');
  for (const l of r.nonDesignLines.length ? r.nonDesignLines : ['（这几处落在单元格与选择器里，原文见上面「分隔符懒政」那一节同页的行）'])
    console.log('      ' + l);
}
console.log('\n英文裸词逐行（只列有问题的）：');
console.log('（三类：① 命令名 `bill.record.*`——页上写出来是有意的；② 成串的库列名（一行只有列名和顿号）；'
  + '③ 内建型名（`expense`／`income`／`refund`）与内部词（`prompt`／`restore`）——后两类屏上不该有。）');
for (const r of rows.filter((x) => x.ascii > 0)) {
  console.log('  [' + r.file + '  ' + r.ascii + ' 行，其中成串列名 '
    + r.asciiLines.filter((l) => /^[A-Za-z_]+(、[A-Za-z_]+)+$/.test(l)).length + ' 行]');
  for (const l of r.asciiLines) console.log('      ' + l);
}
console.log('\n重复句逐行（只列有问题的）：');
for (const r of rows.filter((x) => x.dupes > 0)) {
  console.log('  [' + r.file + ']');
  for (const l of r.dupeLines) console.log('      ' + l);
}

// 红的判据＝**版式位**上的分隔符懒政（`·`／`|` 当版式用）＋英文裸词＋重复句＋清单缺件。
// `；`／`;` 不进红的判据：本域大量是正经的句末分号，拿它判红会把每页都判红、等于没判。
// 「本页缺820断点／缺触摸目标」也不进：本域 32 页都不自带样式，那件事由共享样式表负责（见上面「共享层」）。
const failed = missing.length > 0 || bad.有分隔符懒政.length > 0 || bad.有英文裸词.length > 0
  || bad.有重复句.length > 0;
if (missing.length > 0) {
  console.log('\n清单点名缺件 ' + missing.length + ' 份 → ' + missing.join('、'));
}
console.log('\n读数：' + (failed ? '有命中（红）' : '全绿') + '；共 ' + rows.length + ' 份产物，缺 ' + missing.length + ' 份。');
process.exit(failed ? 1 : 0);
