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
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

describe('组件层样式纪律 ②：串味与抢样式', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：规则选择器都带自己那份名字 ＋ 零 `!important`', () => {
      const src = readFileSync(join(COMP, name, 'style.ts'), 'utf8');
      const bad = [];
      for (const { n, sel, raw } of selectorsOf(src)) {
        const code = sel.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
        const hasIdentifier = /[A-Za-z_$][\w$]*/.test(code);
        const literal = [...sel.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2] ?? '').join('');
        if (!hasIdentifier && !/ilife-/.test(literal)) bad.push('line ' + n + '：' + raw);
      }
      assert.deepEqual(bad, [], name + ' 有纯字面量选择器（会与别件串味）：\n  ' + bad.join('\n  ')
        + '\n（修法：选择器一律经本件的槽位助手拼，如 `s(\'hd\')`／`sc(\'head\')`——名字只从 `attrs.ts` 的闭集取）');
      const bangs = codeLines(src).filter(({ t }) => /!important/.test(t)).map(({ n, t }) => 'line ' + n + '：' + t);
      assert.deepEqual(bangs, [], name + ' 用了 `!important`（本层禁用）');
    });
  }
});

describe('组件层样式纪律 ③：宽度只许容器判（视口分档＝红）', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：零 `@media (min|max)-width`', () => {
      const src = readFileSync(join(COMP, name, 'style.ts'), 'utf8');
      const hits = codeLines(src).filter(({ t }) => /'@media \((?:max|min)-width/.test(t))
        .map(({ n, t }) => 'line ' + n + '：' + t);
      assert.deepEqual(hits, [], name + ' 按**视口**分档了（件宽 ≠ 视口宽）：\n  ' + hits.join('\n  ')
        + '\n（修法：`container-type: inline-size` ＋ `@container (max-width: …)`；媒体查询只判 hover／pointer／reduced-motion）');
    });
  }
});

describe('组件层样式纪律 ④：容器查询必须有容器（死规则＝红）', () => {
  for (const name of components) {
    if (EXEMPT.has(name)) continue;
    it(name + '：用了 `@container` 就自己声明容器', () => {
      const src = readFileSync(join(COMP, name, 'style.ts'), 'utf8');
      const lines = codeLines(src);
      const usesCq = lines.some(({ t }) => /'@container/.test(t));
      if (!usesCq) return;
      const declares = lines.some(({ t }) => /container(-type)?\s*:/.test(t));
      assert.ok(declares, name + ' 写了 `@container` 却没声明容器 ⇒ 那条查询会去找祖先里最近的容器，'
        + '件里没有、页上也可能没有，**永远不生效**（修法：件根加 `container-type: inline-size;`）');
    });
  }
});

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
      // 规则头＝`… {` 之前那一段；按 `{`／`}` 切块后取每块的头部，连 @container／@media 里的也算。
      for (const m of css.matchAll(/(^|\})\s*([^{}@]+)\{/g)) {
        for (const sel of m[2].split(',')) {
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

describe('组件层样式纪律 ⑤：豁免名单与范围不许过期', () => {
  it('豁免的目录必须真的存在，且不许把本层的件写进豁免', () => {
    const stale = [...EXEMPT.keys()].filter((n) => !existsSync(join(COMP, n)));
    assert.deepEqual(stale, [], '豁免名单里有盘上不存在的目录（过期）：' + stale.join('、'));
    const sneaked = [...EXEMPT.keys()].filter((n) => components.includes(n));
    assert.deepEqual(sneaked, [], '本层的件不许出现在豁免名单里：' + sneaked.join('、'));
  });
  it('每个件都至少有一条自己的规则选择器（防「空样式段」蒙混）', () => {
    const empty = components.filter((n) => !EXEMPT.has(n) && selectorsOf(readFileSync(join(COMP, n, 'style.ts'), 'utf8')).length === 0);
    assert.deepEqual(empty, [], '这些件的样式段里抽不到任何规则选择器：' + empty.join('、'));
  });
});
