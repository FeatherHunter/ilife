/** 组件层**样式纪律**横切判据（一条跑完全件；与 `皮肤矩阵.test.mjs` 分工不重叠）。
 *
 *  为什么要有这一条：单件判据再全，也断不出**「两件放一起才坏」**的事——而这一层正是
 *  「六个技能同页挂十几件」。这里断四类**单件看不见、合起来才犯**的错：
 *
 *   ① **串味**：一条规则的**选择器是纯字面量**（不含本件名字，如 `'.is-warn {'`）。
 *      两件各写一条，后挂的那段就命中前一件的元素。本层的写法是 `.<prefix>page-ui` ＋
 *      自己那份槽类（`ilife-block-<件名>-<槽>`），所以「带自己名字」是能机械判的。
 *   ② **抢样式**：`!important`（本层禁用：定了就不让调用方改）。
 *   ③ **视口分档**：`@media (min-width|max-width: …)`。件会被嵌进侧栏／面板／卡片，
 *      **视口宽 ≠ 件宽**，按视口分档会在「宽屏里的小面板」上判错 ⇒ 宽度只许 `@container` 判。
 *      媒体查询只许判**设备能力**（hover／pointer／reduced-motion）。
 *   ④ **死容器查询**：写了 `@container` 却没在件里声明容器（`container`／`container-type`）——
 *      那条查询会去找祖先里最近的容器，件里没有、页上也可能没有 ⇒ **永远不生效**。
 *
 *  两条判据自己踩过的坑（写在这么明确是因为它会重复发生）：
 *   · **注释也算源码**：本层每个件的件头都写着「零 `!important`」这类纪律句，若拿整份源码做
 *     子串匹配，**声明纪律的那一行本身**会把纪律判红 ⇒ 一律只扫**去注释后的代码行**；
 *   · **范围要从层出口读**：出口里除了件还有 `skin`（皮肤层，没有 `style.ts`），
 *     若把出口每一项都当件，判据会去问皮肤层要样式段 ⇒ 范围＝出口点名的**有 `style.ts` 的目录**。
 *   · **一件的样式来源是一批文件**：`style.ts` ＋ 同目录 `style-*.ts`（拆件先例 `scatter-fit/style-forms.ts`、
 *     `date-range/style-calendar.ts`）。只扫 `style.ts` 会让「按规矩拆了文件、压了行数」的件**少扫一半**——
 *     纪律被「压线」反向削弱。故扫描面一律走 `styleSources()`（件怎么发现不变，看 `style.ts` 在不在）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleSource, styleSources } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BR = join(HERE, '..');
const COMP = join(BR, 'src', 'components');

/** 层出口点名的目录（新增组件只改出口一行，本判据自动跟上）。 */
function doorDirs() {
  const src = readFileSync(join(COMP, 'index.ts'), 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/from '\.\/([^/']+)\/index\.js'/g)) names.add(m[1]);
  return [...names].sort();
}

/** 出口里**不是件**的目录（没样式段，或本层之外的装配器）。 */
const NON_COMPONENT = new Set(['skin']);

/** 豁免：**不是**本层出的目录（冻结面那几件，样式早于本契约），逐条注明原因、不许悄悄放过。
 *  这几件的宽度媒体查询是**老账**——改它们会动到六个技能既有页面产物，属另一笔账；
 *  本判据只保证**本层**不再新增。 */
const EXEMPT = new Map([
  ['charts', '冻结面（`blocks.ts` 12 区之一）：图表内部窄宽分档早于本契约'],
  ['page-bars', '冻结面（12 区之一）：页面条带早于本契约'],
  ['page-nav', '冻结面（12 区之一）：分段导航早于本契约'],
  ['page-ui', '页面外壳本身：它就是那个 `.page-ui` 作用域，不是可挂载件'],
  ['style', '样式区装配器，不是件'],
  ['text', '文本产出器，不是件'],
  ['help', '帮助壳（`CONTROL_STYLE_SECTIONS` 闭集），不是件'],
  ['template', '模板填充器，不是件'],
  ['page', '页面装配器，不是件'],
  ['controls', '控件层（冻结面），不是件'],
]);

/** 去掉注释后的代码行（行号保留）：注释里写着纪律句，不能拿它判纪律。 */
function codeLines(src) {
  return src.split('\n')
    .map((raw, i) => ({ n: i + 1, t: raw.trim() }))
    .filter(({ t }) => t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*'));
}

/** 抽出「规则选择器行」的选择器部分（以 `{` 收尾的那些）。 */
function selectorsOf(src) {
  const out = [];
  for (const { n, t } of codeLines(src)) {
    if (!/\{\s*'?\s*,?\s*$/.test(t)) continue;
    const sel = t.replace(/\{\s*'?\s*,?\s*$/, '').replace(/\+$/, '').trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push({ n, sel, raw: t });
  }
  return out;
}

const door = doorDirs();
const components = door.filter((n) => existsSync(join(COMP, n, 'style.ts')));
const notComponents = door.filter((n) => !existsSync(join(COMP, n, 'style.ts')));

/* 样式源码的读法住在共用助手 `_style-sources.mjs`（上面那条口径的落点）：一件的样式来源 ＝
   `style.ts` ＋ 同目录 `style-*.ts`。本判据 ①b 与文末的仓库级横切门守着这条口径：
   **件的发现口径不变**（仍看 `<件>/style.ts` 在不在），变的只是扫的范围。 */

describe('组件层样式纪律 ①：扫描面非空且对得上盘', () => {
  it('出口点名的、没有样式段的目录必须都是已知的非件目录', () => {
    assert.deepEqual(notComponents.filter((n) => !NON_COMPONENT.has(n)), [],
      '出口点了名却没有 `style.ts`：' + notComponents.join('、') + '（若确实不是件，请加进 NON_COMPONENT 并写明它是什么）');
  });
  it('有样式段的件数够多（否则本判据可能在空转）', () => {
    assert.ok(components.length >= 40, '带 `style.ts` 的件应 ≥ 40，实际 ' + components.length);
    const missing = components.filter((n) => !EXEMPT.has(n) && !existsSync(join(COMP, n, 'style.ts')));
    assert.deepEqual(missing, []);
  });
});

describe('组件层样式纪律 ①b：范围自检（件拆出的 `style-*.ts` 必须被扫到）', () => {
  /** 盘上真拆了样式段的件：同目录另有 `style-*.ts`（先例 `scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`）。 */
  const splitPieces = components.filter((n) => readdirSync(join(COMP, n)).some((f) => /^style-[^/]+\.ts$/.test(f)));

  it('拆了样式段的件，判据扫到的就是它目录下**全部** `style*.ts`（少扫一个＝红）', () => {
    assert.ok(splitPieces.length >= 1, '盘上一个拆了样式段的件都找不到 ⇒ 这条自检在空转'
      + '（先例 `scatter-fit/style-forms.ts`、`date-range/style-calendar.ts`）；'
      + '若确实一个都不剩，把这条自检连同 `styleSources()` 的件头一起收掉');
    const bad = [];
    for (const name of splitPieces) {
      const onDisk = readdirSync(join(COMP, name)).filter((f) => /^style(?:-[^/]+)?\.ts$/.test(f)).sort();
      const scanned = styleSources(name).map((s) => s.file);
      if (scanned.join() !== onDisk.join()) {
        bad.push(name + '：盘上 ' + onDisk.join('／') + '，扫的却是 ' + (scanned.length > 0 ? scanned.join('／') : '（空）'));
      }
    }
    assert.deepEqual(bad, [], '这些件拆出了 `style-*.ts`，判据却没扫到（按件只读 `style.ts` 单文件，'
      + '会把拆出去的那半放进盲区——「按规矩拆件压行数」反而让纪律变松）：\n  ' + bad.join('\n  '));
    console.log('读数：盘上拆了样式段的件 ' + splitPieces.length + ' 个，判据逐件扫到全部 `style*.ts`——'
      + splitPieces.map((n) => n + '（' + styleSources(n).map((f) => f.file).join('＋') + '）').join('；'));
  });

  it('本判据里不许再出现「按件读 `style.ts` 单文件」的写法（范围只许从 `styleSources()` 出）', () => {
    const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const hits = [...self.matchAll(/readFileSync\([^)]*'style\.ts'/g)].map((m) => m[0]);
    assert.deepEqual(hits, [], '本判据里还有直接读单份 `style.ts` 的地方（拆出去的那半就扫不到了）：\n  ' + hits.join('\n  ')
      + '\n（修法：样式源码一律经 `styleSources(<件名>)` 取——它按文件名排序给出该件目录下全部 `style*.ts`）');
  });
});

describe('组件层样式纪律 ②：串味与抢样式', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：规则选择器都带自己那份名字 ＋ 零 `!important`', () => {
      const sources = styleSources(name);
      const bad = [];
      for (const { file, src } of sources) {
        for (const { n, sel, raw } of selectorsOf(src)) {
          const code = sel.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
          const hasIdentifier = /[A-Za-z_$][\w$]*/.test(code);
          const literal = [...sel.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2] ?? '').join('');
          if (!hasIdentifier && !/ilife-/.test(literal)) bad.push(file + ':' + n + '：' + raw);
        }
      }
      assert.deepEqual(bad, [], name + ' 有纯字面量选择器（会与别件串味）：\n  ' + bad.join('\n  ')
        + '\n（修法：选择器一律经本件的槽位助手拼，如 `s(\'hd\')`／`sc(\'head\')`——名字只从 `attrs.ts` 的闭集取）');
      const bangs = sources.flatMap(({ file, src }) => codeLines(src)
        .filter(({ t }) => /!important/.test(t)).map(({ n, t }) => file + ':' + n + '：' + t));
      assert.deepEqual(bangs, [], name + ' 用了 `!important`（本层禁用）');
    });
  }
});

describe('组件层样式纪律 ③：宽度只许容器判（视口分档＝红）', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：零 `@media (min|max)-width`', () => {
      const hits = styleSources(name).flatMap(({ file, src }) => codeLines(src)
        .filter(({ t }) => /'@media \((?:max|min)-width/.test(t)).map(({ n, t }) => file + ':' + n + '：' + t));
      assert.deepEqual(hits, [], name + ' 按**视口**分档了（件宽 ≠ 视口宽）：\n  ' + hits.join('\n  ')
        + '\n（修法：`container-type: inline-size` ＋ `@container (max-width: …)`；媒体查询只判 hover／pointer／reduced-motion）');
    });
  }
});

describe('组件层样式纪律 ④：容器查询必须有容器（死规则＝红）', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：用了 `@container` 就自己声明容器', () => {
      const lines = codeLines(styleSource(name));
      const usesCq = lines.some(({ t }) => /'@container/.test(t));
      if (!usesCq) return;
      const declares = lines.some(({ t }) => /container(-type)?\s*:/.test(t));
      assert.ok(declares, name + ' 写了 `@container` 却没声明容器 ⇒ 那条查询会去找祖先里最近的容器，'
        + '件里没有、页上也可能没有，**永远不生效**（修法：件根加 `container-type: inline-size;`）');
    });
  }
});

/** 从产物 CSS 里抽出**每条规则的选择器**（`@media`／`@container` 里的也算）。
 *
 *  为什么不用正则：早先用 `/(^|\})\s*([^{}@]+)\{/g` 抽，**漏掉 at-rule 块里的规则**——
 *  块里第一条选择器前面隔的是 `@media (…) {` 那一行（不是 `}`）⇒ 匹配不到；块里第二条起虽匹配到，
 *  但它的选择器文本不带前导 scope ⇒ `>1` 的判据放行。净效果是「双 scope 的规则若住在 at-rule 里就抓不到」
 *  （由 F1 席在 #950 返修时读出来）。故改成**逐字符配平花括号**的扫描：每遇到 `{`，
 *  拿走它前面攒下的那一段当选择器（`@` 开头的是 at-rule 前奏，丢掉）；每遇到 `}` 清空缓冲。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

describe('组件层样式纪律 ⑥：一条选择器里作用域只许出现一次（死规则＝红）', () => {
  /** 由目录名推样式函数名（`status-row` ⇒ `statusRowCss`）。 */
  const camel = (n) => n.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：产出的每条选择器里 `.page-ui` 至多一次', async () => {
      const mod = await import(new URL('../dist/components/' + name + '/style.js', import.meta.url).href);
      const fnName = camel(name) + 'Css';
      const fn = typeof mod[fnName] === 'function' ? mod[fnName]
        : Object.entries(mod).find(([k, v]) => /Css$/.test(k) && typeof v === 'function' && k !== 'sheetCss')?.[1];
      assert.equal(typeof fn, 'function', name + ' 的产物里找不到样式函数（期望导出 ' + fnName + '）');
      // **先剥注释再数**：件里的说明性注释常引用 `.ilife-page-ui` 这个写法本身
      //（「中段一律用裸槽类，否则会拼出 `.ilife-page-ui ` 两次」就是这样一句话），
      // 若不剥，判据会把「写着纪律的那一行」判红——2026-09 实测踩过。
      const css = String(fn({})).replace(/\/\*[\s\S]*?\*\//g, '');
      const bad = [];
      // 选择器抽取走 `ruleSelectors()`（配平花括号的扫描）——`@media`／`@container` **块里**的规则也算，
      // 正则式抽取会漏掉它们（这一段由来见 `ruleSelectors()` 的件头）。
      for (const raw of ruleSelectors(css)) {
        for (const sel of raw.split(',')) {
          const s = sel.trim();
          if (s === '') continue;
          const hits = (s.match(/\.ilife-page-ui/g) || []).length;
          if (hits > 1) bad.push(s + '　（.page-ui 出现 ' + hits + ' 次）');
        }
      }
      assert.deepEqual(bad, [], name + ' 有选择器把作用域拼了两遍（**永不命中**＝死规则）：\n  ' + bad.join('\n  ')
        + '\n（典型来源：把「已带 scope 的选择器」再拼一次 scope，写出 `.page-ui .A + .page-ui .B`。'
        + '修法：件内加一个**不带 scope 的裸槽选择器**助手，嵌套时只用裸的）');
    });
  }
});

describe('组件层样式纪律 ⑥b：抽取器自证（守门人的守门人）', () => {
  it('`ruleSelectors()` 必须抓到住在 `@media`／`@container` 块里的规则', () => {
    const sample = [
      '.ilife-page-ui .a { color: red; }',
      '@media (hover: hover) {',
      '  .ilife-page-ui .b > .ilife-page-ui .c { color: red; }',
      '}',
      '@container ilife-x (max-width: 460px) {',
      '  .ilife-page-ui .d + .ilife-page-ui .e { color: red; }',
      '  .ilife-page-ui .f { color: red; }',
      '}',
    ].join('\n');
    const got = ruleSelectors(sample);
    assert.deepEqual(got, [
      '.ilife-page-ui .a',
      '.ilife-page-ui .b > .ilife-page-ui .c',
      '.ilife-page-ui .d + .ilife-page-ui .e',
      '.ilife-page-ui .f',
    ], '抽取器漏了规则或把声明当成了选择器（漏了 at-rule 块的话，⑥ 会放过住在里面的双 scope 规则）');
    const dup = got.filter((s) => (s.match(/\.ilife-page-ui/g) || []).length > 1);
    assert.equal(dup.length, 2, 'at-rule 块里的两条双 scope 规则应当都被判出来，实际 ' + JSON.stringify(dup));
  });
});

/** 剥掉 `var(...)`（**含嵌套与带括号的兜底**）后的剩余 CSS：兜底链里的颜色字面量是允许的
 *  （那是老页面零接线用的），剥掉它们之后还剩下的颜色字面量才是"不跟皮肤"的硬编码。
 *
 *  为什么不是一根正则：兜底尾巴里会出现带括号的东西——`skinVar('shadow')` 那条链就是
 *  `var(--ilife-shadow, var(--shadow, 0 1px 2px rgba(0,0,0,.04), …))`，`var\([^()]*\)` 啃不动它，
 *  于是链里的 `rgba(` 会被读成"件里的硬编码颜色"，把读投影的件（`skeleton`／`timer-card`）判成假红
 *  （2026-09-24 实测踩过：有席位为了迁就这根正则去改**契约的字面量**，方向反了——该修的是这把剥壳器）。
 *  故改成**配平括号的扫描**：见 `var(` 就一路吃到与它配对的 `)`，整条（连同嵌套）一起丢。 */
function stripVarFns(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('var(', i)) {
      let depth = 0;
      let j = i + 3;
      for (; j < css.length; j += 1) {
        if (css[j] === '(') depth += 1;
        else if (css[j] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      i = j + 1;
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

/** 取一件的产出 CSS（`<件>/style.js` 的 `xCss()`），注释先剥掉。 */
async function producedCss(name) {
  const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const mod = await import(new URL('../dist/components/' + name + '/style.js', import.meta.url).href);
  const fn = typeof mod[camel + 'Css'] === 'function' ? mod[camel + 'Css']
    : Object.entries(mod).find(([k, v]) => /Css$/.test(k) && typeof v === 'function' && k !== 'sheetCss')?.[1];
  assert.equal(typeof fn, 'function', name + ' 的产物里找不到样式函数');
  return String(fn({})).replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 一条声明的值是不是"**整个值就是正文墨色**"（＝拿字色当面）。
 *  `var(--ilife-ink, var(--fg, #1d1d1f))` 这种整值算命中；
 *  `color-mix(in srgb, var(--ilife-ink) 13%, var(--ilife-surface))` 这种淡底**不算**——
 *  淡洗是合法的面，实测里也这么用（`skeleton` 的占位块）；这一条禁的是"**实心墨块**"。 */
function isInkFace(value) {
  const v = value.trim();
  return /^var\(\s*--(?:ilife-ink(?:-[23])?|fg[23]?)\s*[,)]/.test(v);
}

describe('组件层样式纪律 ⑦：选中／强调不许拿正文墨色当面（"反白"写法＝红）', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：背景不许是正文墨色；颜色字面量只许住在兜底链里', async () => {
      const css = await producedCss(name);
      const bad = [];
      for (const m of css.matchAll(/(background(?:-color)?)\s*:\s*([^;{}]+)/g)) {
        if (isInkFace(m[2])) bad.push(m[1] + ': ' + m[2].trim());
      }
      assert.deepEqual(bad, [], name + ' 拿正文墨色当了"面"（选中／填充＝实心墨块）：\n  ' + bad.join('\n  ')
        + '\n（口径见 docs/base/base-render/选中态与皮肤语言.md 第三节法则表：'
        + '有文字的选中面走 `accent-soft` 底＋`accent-text` 字＋`accent` 描边；无文字的点／格／条走 `accent` 实底；'
        + '整行选中走 `surface-2`＋`accent` 侧标）');
      const bare = [...stripVarFns(css).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
      assert.deepEqual([...new Set(bare)], [], name + ' 的产出里有不跟皮肤的颜色字面量（' + [...new Set(bare)].join('、')
        + '）——只有 `skinVar()` 兜底链里那一处允许手写字面量');
    });
  }
});

describe('组件层样式纪律 ⑤：豁免名单与范围不许过期', () => {
  it('豁免的目录必须真的存在，且不许把本层的件写进豁免', () => {
    const stale = [...EXEMPT.keys()].filter((n) => !existsSync(join(COMP, n)));
    assert.deepEqual(stale, [], '豁免名单里有盘上不存在的目录（过期）：' + stale.join('、'));
    const sneaked = [...EXEMPT.keys()].filter((n) => components.includes(n));
    assert.deepEqual(sneaked, [], '本层的件不许出现在豁免名单里：' + sneaked.join('、'));
  });
  it('每个件都至少有一条自己的规则选择器（防「空样式段」蒙混）', () => {
    const empty = components.filter((n) => !EXEMPT.has(n) && selectorsOf(styleSource(n)).length === 0);
    assert.deepEqual(empty, [], '这些件的样式段里抽不到任何规则选择器：' + empty.join('、'));
  });
});

/** 判据侧「按件读样式源码」的写法：`readFileSync`／`join`／`resolve` 直接吃到字面量 `'style.ts'`。
 *  **只认「读」不认「发现件」**：`existsSync(join(COMP, <件名>, 'style.ts'))` 是**件的发现口径**
 *  （形状见 `src/components/清单.ts` §三），照旧允许——受管的是「拿它当**样式源码**读」。
 *  只认字面量：路径若先落进一个变量再读（`const p = join(DIR,'style.ts'); readFileSync(p)`），
 *  本正则抓不到——那种写法要**人**看得见，故 `skin.test.mjs` 那种「先建路径表再读」的写法也一并收口。 */
const SINGLE_FILE_SCAN = /(?:readFileSync|join|resolve)\([^)\n]*'style\.ts'/;

/** 收口期豁免：**只给在途席改动中的判据文件**，一条一行、必须带登记日期与去处，且**逐条打印警告**
 *  （不许静默跳过）。表**缺省为空**——谁的改动落地了就把自己那条删掉。
 *  格式：`['<文件名>', '<理由>（在途席：<谁>）｜登记 2026-09-25｜去处：<谁在何时清>']` */
const STYLE_SCAN_EXEMPT = new Map([]);

/** 判据目录下全部判据文件（`test/*.test.mjs`）。 */
const judgeFiles = () => readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();

/** 一个判据文件里「按件只读 `<件>/style.ts`」的行（行号 ＋ 原文）；件的发现口径不算。 */
function singleFileScans(name) {
  const out = [];
  readFileSync(join(HERE, name), 'utf8').split('\n').forEach((line, i) => {
    if (!SINGLE_FILE_SCAN.test(line)) return;
    if (/existsSync\([^)]*'style\.ts'/.test(line)) return;
    out.push({ line: i + 1, text: line.trim() });
  });
  return out;
}

describe('组件层样式纪律 ⑧：判据侧的范围（仓库级横切门：不许按件只读一份 `style.ts`）', () => {
  it('凡按件读样式源码的判据，都得经 `_style-sources.mjs` 取该件全部 `style*.ts`', () => {
    const bad = [];
    for (const f of judgeFiles()) {
      if (f === '组件样式纪律.test.mjs') continue; // 本门自己只扫别人（本判据 ①b 的第二条自守）
      if (STYLE_SCAN_EXEMPT.has(f)) continue;
      for (const s of singleFileScans(f)) bad.push(f + ':' + s.line + '：' + s.text);
    }
    for (const [f, why] of STYLE_SCAN_EXEMPT) console.error('豁免（在途席改动中，收敛时删）：' + f + '——' + why);
    assert.deepEqual(bad, [], '这些判据按件只读 `<件>/style.ts`：拆出去的那半（`style-*.ts`）它一无所知，'
      + '「按规矩拆件压行数」反而让纪律变松（本层已 6 件拆分）。\n'
      + '  修法：读取换成 `styleSource(<件名>)`／`styleSources(<件名>)`（`test/_style-sources.mjs`，'
      + '按文件名排序给出该件全部 `style*.ts`）；确实要读一份**不是件**的 `style.ts`，'
      + '照 `STYLE_SCAN_EXEMPT` 的格式记一条带日期的豁免并写明它不是件：\n  ' + bad.join('\n  '));
  });

  it('豁免表不许过期、不许不带日期（缺省为空表）', () => {
    const stale = [...STYLE_SCAN_EXEMPT.keys()].filter((f) => !existsSync(join(HERE, f)) || singleFileScans(f).length === 0);
    assert.deepEqual(stale, [], '豁免表里这些文件已不再按单文件读（或文件不存在）⇒ 把这一条删掉：' + stale.join('、'));
    const undated = [...STYLE_SCAN_EXEMPT.entries()].filter(([, why]) => !/\d{4}-\d{2}-\d{2}/.test(why)).map(([f]) => f);
    assert.deepEqual(undated, [], '豁免必须带登记日期（只有「在途席改动中」才准豁免）：' + undated.join('、'));
    console.log('读数：判据件 ' + judgeFiles().length + ' 个过门；单文件扫的判据 0 个'
      + (STYLE_SCAN_EXEMPT.size === 0 ? '（豁免表空）' : '；豁免 ' + STYLE_SCAN_EXEMPT.size + ' 条'));
  });
});

/* ── ⑨ 零键盘语汇（用户第一条打分口径） ────────────────────────────── */

/** **法条全表**：键盘语汇里**只有一种意思**的那些——键帽字形／中文词／DOM 与事件名／键名。
 *
 *  **判什么**（2026-09-25 父席裁决，第一性）：法条禁的是**依赖键盘**（手机上没有方向键、键盘不能是唯一通路），
 *  **不是**禁「给键盘加增强」。故本门**键盘只作增强：判红看「用户看得见」，运行时分支只报不判**——
 *   · **判红**（用户看得见的那一档）：产出标记／文案里的键名与 `键帽`／`快捷键`／`键位`／`方向键`、
 *     CSS `content:` 里的、以及会被渲染出来的**文案常量**（如 `TOOLTIP_HINT = '…'`）；
 *   · **读数档**（不判红、逐条打印）：**运行时**的 `keydown`／`keyup`／`onkey*`／`e.key==="Enter"|"Escape"` 分支
 *     ——那些件照样可点可触（命中盒与可点元素另有判据），键盘只是白送的增强。
 *
 *  **匹配口径**（写死这一处，谁调表先读这段；第一版不设这几道，实测扫出 80+ 条假阳性）：
 *   · **中文词与纯符号**（`⌘ ⌥ ⇧ 键帽 快捷键 键位 方向键 键盘`）：串匹配（中文不分大小写）；
 *   · **DOM／事件名**（`kbd` `keydown` `keyup` `onkey*`）：按词边界、大小写不敏感——它们只可能是键盘通路；
 *     `onkey` 是**前缀**（`onkeydown`／`onkeyup`／`onkeypress` 全收），只卡前边界；
 *   · **键名**（`Esc`／`Escape`／`Tab`／`Enter`）：**只在字符串字面量里**、且**按键盘写法（首字母大写）**匹配。
 *     为什么加这两道：`esc()`（HTML 转义助手）与 `'../shared/escape.js'`（模块路径）都含这两个词，
 *     大小写不敏感地全扫会把本层几十件一起判红（实测就是这么红的）；`Table`／`Enterprises` 由词边界挡掉。
 *     代价：小写 `enter` 文案抓不到——那种写法请在评审里说清（口径写在这儿，不是漏）。
 *   · **注释不算**：先把块注释整段挖掉（含**写在字符串里的 CSS 注释**——那类行以 `'` 开头、`codeLines()` 剥不掉），
 *     再逐行扫——件头／段内写「本件不带键盘通路」是纪律句，不是缺陷；
 *   · 扫三处：**产出 CSS**（`xCss()` 的产物）、**该件源码**（该件目录下的全部 `.ts`）、
 *     **清单示例标记**（拿清单里的示例入参渲染出来的标记；渲染不出来的**照实记一行读数**，不静默跳过）。 */
const KEYBOARD_WORDS = ['⌘', '⌥', '⇧', '键帽', '快捷键', '键位', '方向键', '键盘', 'kbd', 'keydown', 'keyup', 'onkey'];
const KEYBOARD_NAMES = ['Esc', 'Escape', 'Tab', 'Enter'];

/** **运行时分支**的识别（命中落到这一档就只报不判）：键盘事件接线／按键分支的写法。 */
const RUNTIME_KEYBOARD = /addEventListener\(\s*['"]key|\.key\s*[!=]==|onkey|\bkeyup\b|\bkeydown\b/;

/** 一行命中算不算「运行时分支」（是 ⇒ 读数档；否 ⇒ 用户看得见那一档，判红）。 */
const isRuntimeBranch = (line) => RUNTIME_KEYBOARD.test(line);

/** **读数档**（不判红、逐条打印）：方向箭头另有「涨跌／流程箭头」的正当用法
 *  （实测：`bulk-bar` 的 `→` 是"旧值 → 新值"，不是键帽），判红会误伤 ⇒ 列出来给人判。 */
const ARROW_GLYPHS = ['↑', '↓', '←', '→'];

/** 把**块注释**整段挖掉（多行也算），**保持行数与列位**（非换行字符一律换成空格）。 */
function blankBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 一行里的**字符串字面量**内容（键名只在这一面上认：代码标识符与模块路径不算 UI 文案）。 */
function literalsIn(line) {
  return [...line.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '').join(' ');
}

/** 一个词在一行里的命中（返回**实际命中的那段原文**，如 `onkeydown`）；没有则 `null`。 */
function keyboardHit(word, line) {
  if (!/^[A-Za-z]+$/.test(word)) return line.includes(word) ? word : null;
  const hit = (word === 'onkey' ? /\bonkey/i : new RegExp('\\b' + word + '\\b', 'i')).exec(line);
  return hit === null ? null : hit[0];
}

/** 逐行扫一段文本：命中登记 `{ line, word, text }`（一个词一行只记一次）。 */
function keyboardHitsIn(text) {
  const out = [];
  for (const { n, t } of codeLines(blankBlockComments(text))) {
    for (const w of KEYBOARD_WORDS) {
      const hit = keyboardHit(w, t);
      if (hit !== null) out.push({ line: n, word: hit, text: t });
    }
    const lits = literalsIn(t);
    for (const w of KEYBOARD_NAMES) {
      const hit = new RegExp('\\b' + w + '\\b').exec(lits);
      if (hit !== null) out.push({ line: n, word: hit[0], text: t });
    }
  }
  return out;
}

/** 方向箭头那几枚字的命中（读数档：也可能只是流程图上的箭头）。 */
function arrowGlyphsIn(text) {
  const out = [];
  for (const { n, t } of codeLines(blankBlockComments(text))) {
    for (const w of ARROW_GLYPHS) if (t.includes(w)) out.push({ line: n, word: w, text: t });
  }
  return out;
}

/** 该件目录下的源码文件（`.ts`：`attrs`／`model`／`render`／`fields`／`style*`／`index`…；不含 README）。 */
function componentSources(name) {
  const dir = join(COMP, name);
  return readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()
    .map((file) => ({ file, src: readFileSync(join(dir, file), 'utf8') }));
}

/** 命中处的一小段上下文（报错要说清"哪一条"）。 */
function around(text, needle) {
  const i = text.indexOf(needle);
  return (i < 0 ? text.slice(0, 80) : text.slice(Math.max(0, i - 40), i + 50)).replace(/\s+/g, ' ').trim();
}

/** **收口期豁免**（键＝`<件名> ｜ <词>`）：只登记**已经存在的可见命中**，一条一行、必须带登记日期与去处，
 *  且**逐条打印警告**（不许静默跳过）。命中修掉后把这一条删掉——本判据自会点名（豁免过期＝红）。
 *  格式：`['<件名> ｜ <词>', '<哪一处>｜登记 2026-09-25｜去处：<谁在何时清>']`
 *
 *  **现况：空表**。2026-09-25 首跑扫出的 16 条里，15 条是**运行时分支**（按父席裁决改走读数档、不进这里），
 *  第 16 条 `tooltip ｜ Esc`（`TOOLTIP_HINT` 的可见文案）已由父席改成「点别处关掉」——故本条一并删掉。
 *  将来真出现「可见但一时修不动」的命中，照上面格式加一条**带日期**的条目即可。 */
const KEYBOARD_EXEMPT = new Map([]);

/** 豁免表的键：件名 ｜ 词（可见命中按「件 × 词」记，运行时分支不记）。 */
const exemptKey = (name, word) => name + ' ｜ ' + word;

describe('组件层样式纪律 ⑨：零键盘语汇（手机与电脑端同时在用 ⇒ 不存在方向键那类东西）', () => {
  it('逐件扫产出 CSS 与该件源码（剥注释）：判红只看「用户看得见」那一档', async () => {
    const bad = [];
    const known = [];
    const runtime = [];
    const arrows = [];
    const record = (name, where, h) => {
      const seen = name + ' ｜ ' + h.word + ' ｜ ' + where + '：' + h.text.slice(0, 80);
      if (isRuntimeBranch(h.text)) { runtime.push(seen); return; }
      (KEYBOARD_EXEMPT.has(exemptKey(name, h.word)) ? known : bad).push(seen);
    };
    for (const name of components) {
      if (EXEMPT.has(name)) continue;
      const css = await producedCss(name);
      for (const h of keyboardHitsIn(css)) record(name, '产出 CSS 第 ' + h.line + ' 行', h);
      for (const h of arrowGlyphsIn(css)) arrows.push(name + ' ｜ 产出 CSS 第 ' + h.line + ' 行 ｜ ' + h.text.slice(0, 60));
      for (const { file, src } of componentSources(name)) {
        for (const h of keyboardHitsIn(src)) record(name, file + ':' + h.line, h);
        for (const h of arrowGlyphsIn(src)) arrows.push(name + ' ｜ ' + file + ':' + h.line + ' ｜ ' + h.text.slice(0, 60));
      }
    }
    for (const line of known) console.error('豁免（已登记的既有可见命中，待派人修）：' + line);
    console.log('读数：键盘语汇——**用户看得见**（判红档）' + bad.length + ' 条；**运行时分支**（读数档，键盘只作增强）'
      + runtime.length + ' 条；方向箭头（读数档）' + arrows.length + ' 处；豁免表 ' + KEYBOARD_EXEMPT.size + ' 条');
    if (runtime.length > 0) console.log('读数：运行时键盘分支命中（只报不判，件照样可点可触）：' + runtime.join('；'));
    if (arrows.length > 0) {
      console.log('读数：方向箭头那几枚字命中 ' + arrows.length + ' 处（**读数档，不判红**——也可能是涨跌／流程箭头，'
        + '要人判）：' + arrows.join('；'));
    }
    assert.deepEqual(bad, [], '这些地方有**用户看得见**的键盘语汇（用户口径：手机与电脑端同时在用，'
      + '不存在方向键等键盘相关的东西）：\n  '
      + bad.join('\n  ') + '\n（注释不算；键名只在**字符串字面量**里、按键盘写法首字母大写认——口径见 `KEYBOARD_WORDS` 的件头）');
  });

  it('豁免表不许过期、不许不带日期', () => {
    const undated = [...KEYBOARD_EXEMPT.entries()].filter(([, why]) => !/\d{4}-\d{2}-\d{2}/.test(why)).map(([k]) => k);
    assert.deepEqual(undated, [], '豁免必须带登记日期：' + undated.join('、'));
    const stale = [...KEYBOARD_EXEMPT.keys()].filter((k) => {
      const [name, word] = k.split(' ｜ ');
      if (!components.includes(name)) return true;
      const texts = [...componentSources(name).map((f) => f.src)];
      return !texts.some((t) => keyboardHitsIn(t).some((h) => h.word === word));
    });
    assert.deepEqual(stale, [], '豁免表里这些命中已经不在盘上（修掉了／拼错）⇒ 把这一条删掉：' + stale.join('、'));
    console.log('读数：键盘语汇豁免 ' + KEYBOARD_EXEMPT.size + ' 条（件 × 词；收口期临时账，逐条已打印）');
  });

  it('清单示例标记那一面：拿清单里的示例入参渲染出来再扫一遍', async () => {
    const { COMPONENTS } = await import(new URL('../dist/components/清单.js', import.meta.url).href);
    const bad = [];
    const runtime = [];
    const notRendered = [];
    for (const row of COMPONENTS) {
      if (EXEMPT.has(row.name)) continue;
      if (row.render === '' || row.sample === null) { notRendered.push(row.name + '（清单里没有渲染入口／示例入参）'); continue; }
      let html = '';
      try {
        const mod = await import(new URL('../dist/components/' + row.name + '/index.js', import.meta.url).href);
        if (typeof mod[row.render] !== 'function') { notRendered.push(row.name + '（产物里取不到 `' + row.render + '`）'); continue; }
        html = mod[row.render](row.sample);
      } catch (e) {
        notRendered.push(row.name + '（示例入参渲染报错：' + String(e && e.message ? e.message : e).slice(0, 50) + '）');
        continue;
      }
      for (const w of KEYBOARD_WORDS.concat(KEYBOARD_NAMES)) {
        const hit = KEYBOARD_NAMES.includes(w) ? keyboardHit(w, literalsIn(String(html))) : keyboardHit(w, String(html));
        if (hit === null) continue;
        const seen = row.name + ' ｜ ' + hit + ' ｜ 示例标记：…' + around(String(html), hit) + '…';
        if (isRuntimeBranch(around(String(html), hit))) { runtime.push(seen); continue; }
        if (KEYBOARD_EXEMPT.has(exemptKey(row.name, hit))) {
          console.error('豁免（已登记的既有可见命中，待派人修）：' + seen);
          continue;
        }
        bad.push(seen);
      }
      const arrows = ARROW_GLYPHS.filter((w) => String(html).includes(w)).map((w) => w + '（…' + around(String(html), w) + '…）');
      if (arrows.length > 0) {
        console.log('读数：' + row.name + ' 的示例标记里有方向箭头（读数档，不判红）：' + arrows.join('；'));
      }
    }
    if (notRendered.length > 0) {
      console.log('读数：' + notRendered.length + ' 件的示例标记渲染不出来（源码那一面照扫）：' + notRendered.join('；'));
    }
    console.log('读数：示例标记那一面——可见命中（判红档）' + bad.length + ' 条；运行时分支（读数档）' + runtime.length + ' 条');
    if (runtime.length > 0) console.log('读数：示例标记里的运行时键盘分支（只报不判）：' + runtime.join('；'));
    assert.deepEqual(bad, [], '示例标记里有键盘语汇：\n  ' + bad.join('\n  '));
  });
});
