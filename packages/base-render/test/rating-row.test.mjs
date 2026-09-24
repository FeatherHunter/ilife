/** ratingRow（评分行 · 形态 A「星级＋分数」）· **判据件**。
 *
 *  断言对象是本件**自己的唯一出口**：`dist/components/rating-row/index.js`
 *  （组件层不进冻结面、不从根出口；层出口那一行由接线席统一加）。
 *
 *  四类（契约 §五）＋ 三条本件特有的硬判据：
 *   ① **渲染契约**：标题行／星组（真 radiogroup）／**数字读数**／上次对照／缺值 `—`／半颗；
 *      禁用／加载／错态；**全部**非法入参分支走 `BlocksError`；
 *   ② **样式与零 DOM 纪律**：只经 `skinVar()` 读皮肤／scope／零 `:root`／零 `!important`／零新 token／
 *      媒体查询只判设备能力／零 `…` 截断手段／**读数是大字号**（≥ 正文 1.5 倍）；
 *   ③ **加法式**：不挂本件时同页产物逐字节相同；标记里不出现别件的类名；
 *   ④ **真机两档**（headless Chrome ＋ CDP）：容器宽 **390 与 1280** 零横向溢出、
 *      **每颗星是可聚焦的 44×44 按钮**、**星星之外有数字读数且不被裁**、
 *      **选中态不只靠颜色**（大字报刊下实心星是**换了字形**，不只是换色）、点了／按方向键都改分并派发事件。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  RATING_ROW_CLASS,
  RATING_ROW_DEFAULT_MAX,
  RATING_ROW_FORMS,
  RATING_ROW_HALF_ATTR,
  RATING_ROW_MAX_MAX,
  RATING_ROW_MISSING,
  RATING_ROW_NUM_SCALE,
  RATING_ROW_SLOTS,
  RATING_ROW_STAR_ATTR,
  RATING_ROW_STAR_PX,
  buildRatingRowJs,
  ratingRowCss,
  ratingRowSlot,
  renderRatingRow,
} from '../dist/components/rating-row/index.js';
import { SKIN_NAMES, SKIN_TOKEN_NAMES, skinClass, skinCss, skinTokenVar, skinVar } from '../dist/components/skin/index.js';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};
const selectorsOf = (css) => {
  const out = [];
  for (const m of stripComments(css).matchAll(/([^{}]*)\{/g)) {
    const sel = m[1].split('}').pop().trim();
    if (sel === '' || sel.startsWith('@')) continue;
    out.push(sel);
  }
  return out;
};
const skinVarSpans = (css) => {
  const spans = [];
  for (const m of css.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
    const expected = skinVar(m[1]);
    assert.ok(css.startsWith(expected, m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
    spans.push([m.index, m.index + expected.length]);
  }
  return spans;
};
const cutSpans = (text, spans) => {
  let out = '';
  let at = 0;
  for (const [from, to] of spans) { out += text.slice(at, from); at = to; }
  return out + text.slice(at);
};

/* ── 夹具入参 ───────────────────────────────────────────────────────── */

/** 一页真实形状的评分（私家大厨「给这道菜打分」）。 */
const REAL = {
  name: 'dishRating',
  label: '给「番茄炒蛋」打分',
  value: 4,
  max: 5,
  prevNote: '上次 09-18 给了 3 分',
  hint: '折合 8 分',
};

/** 敌意入参：超长标题 ＋ 超长上次对照 ＋ 10 档（窄档也要放得下）。 */
const HOSTILE = {
  name: 'dishRating-hostile',
  label: '给「番茄炒蛋加了一大段说明的一整句长标题」打分，这句长到必须在窄容器里折行而且不许出现省略号',
  value: 7,
  max: 10,
  prevNote: '上次 09-18 给了 3 分，那一次的心得是「番茄再炒久一点更甜、火候再猛一点更好吃」',
  hint: '折合 7 分（10 分制）',
  extraClass: 'ok-class other',
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('ratingRow ① 渲染契约', () => {
  it('槽位齐全：标题行（主段＋上次对照）／星组（radiogroup 内逐颗可聚焦按钮）／**大数字读数**', () => {
    const html = renderRatingRow(REAL);
    assert.match(html, /^<div class="ilife-block-rating-row is-stars" data-ilife-rating-name="dishRating"/, html.slice(0, 100));
    assert.match(html, /data-ilife-rating-form="stars"/);
    assert.match(html, /data-ilife-rating-max="5"/);
    assert.match(html, /data-ilife-rating-value="4"/, '机器值落属性');
    assert.match(html, /-label"><b class="ilife-block-rating-row-label-title">给「番茄炒蛋」打分<\/b><span class="ilife-block-rating-row-prev">上次 09-18 给了 3 分<\/span><\/p>/);
    assert.match(html, /-stars" role="radiogroup" aria-label="给「番茄炒蛋」打分"/);
    assert.equal((html.match(/<button type="button"/g) || []).length, 5, '五颗星＝五枚按钮');
    assert.equal((html.match(/role="radio"/g) || []).length, 5);
    assert.equal((html.match(/aria-checked="true"/g) || []).length, 4, '4 分 ⇒ 前四颗实心');
    assert.equal((html.match(/aria-checked="false"/g) || []).length, 1);
    assert.match(html, /aria-label="4 分" data-ilife-rating-star="4" tabindex="0"/, '选中的那颗是可聚焦的那一颗（漫游 tabindex）');
    assert.equal((html.match(/tabindex="0"/g) || []).length, 1, '组内恰有一颗 tabbable');
    assert.match(html, /-score"><b class="ilife-block-rating-row-num">4<\/b><span class="ilife-block-rating-row-den">\/ 5 星<\/span><span class="ilife-block-rating-row-hint">折合 8 分<\/span><\/p>/, '星星之外**必须有**那枚数字读数');
    assert.equal(/<script/i.test(html), false, '不产脚本');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不产内联事件处理器');
  });

  it('缺值与 0 是两件事：`null` ⇒ 读数 `—`、五颗全空；`0` ⇒ 读数 `0`', () => {
    const missing = renderRatingRow({ name: 'n', label: '打分' });
    assert.match(missing, /-num">—</, '缺值写成 —（与 0 区分）');
    assert.equal(missing.includes('data-ilife-rating-value'), false, '缺值不落机器值属性');
    assert.equal((missing.match(/aria-checked="true"/g) || []).length, 0, '一颗都不实心');
    assert.match(missing, /aria-label="1 分" data-ilife-rating-star="1" tabindex="0"/, '没有分值时第一颗可聚焦');
    const zero = renderRatingRow({ name: 'n', label: '打分', value: 0 });
    assert.match(zero, /data-ilife-rating-value="0"/);
    assert.match(zero, /-num">0</);
  });

  it('小数（4.5）只影响显示：前四颗实心、第五颗半颗（`data-*` 标记 ＋ 形状）', () => {
    const html = renderRatingRow({ name: 'n', label: '打分', value: 4.5 });
    assert.match(html, /data-ilife-rating-value="4.5"/);
    assert.match(html, /-num">4.5</, '读数把小数印出来（读得出 4 与 4.5 的差别）');
    assert.equal((html.match(/aria-checked="true"/g) || []).length, 4);
    assert.equal((html.match(/data-ilife-rating-half="1"/g) || []).length, 1, '恰有一颗半颗');
    assert.match(html, /aria-label="5 分"[^>]*data-ilife-rating-half="1"/, '半颗落在那颗星上');
    assert.equal(renderRatingRow({ name: 'n', label: '打分', value: 3 }).includes(RATING_ROW_HALF_ATTR), false, '整数分不出半颗');
  });

  it('满档可换（`max`）：10 档就十颗星、分母跟着换', () => {
    const html = renderRatingRow({ name: 'n', label: '打分', value: 7, max: 10 });
    assert.equal((html.match(/role="radio"/g) || []).length, 10);
    assert.match(html, /-den">\/ 10 星</);
    assert.match(html, /data-ilife-rating-max="10"/);
    assert.equal(RATING_ROW_DEFAULT_MAX, 5, '缺省满档仍是五颗星');
    assert.ok(RATING_ROW_MAX_MAX >= 10, '十档必须允许');
  });

  it('缺槽不出：不给上次对照／补充就不出那一句（不留空位、不拿占位符顶替）', () => {
    const html = renderRatingRow({ name: 'n', label: '打分', value: 3 });
    assert.equal(html.includes('-prev'), false);
    assert.equal(html.includes('-hint'), false);
    assert.equal(html.includes('-why'), false);
    assert.equal(html.includes('-error'), false);
  });

  it('三个状态各出各的骨架：禁用（写原因）／加载（读数原地换字）／错态（写在旁边 ＋ aria-describedby）', () => {
    const dis = renderRatingRow({ name: 'n', label: '打分', value: 3, disabled: true, disabledReason: '这道菜还没做完' });
    assert.match(dis, /data-ilife-rating-disabled="1"/);
    assert.equal((dis.match(/ disabled>/g) || []).length, 5, '不可评时五颗星都落 `disabled`');
    assert.match(dis, /-why">这道菜还没做完</, '禁用原因写出来（不只染色）');
    const loading = renderRatingRow({ name: 'n', label: '打分', value: 3, loading: true });
    assert.match(loading, /data-ilife-rating-loading="1"/);
    assert.match(loading, /-score" role="status"><b class="ilife-block-rating-row-num">正在读取<\/b>/, '读数**原地换字**并让读屏也知道');
    assert.equal(loading.includes('>3<'), false, '加载态不再显示旧分数');
    assert.match(loading, /-stars" role="radiogroup" aria-label="打分" aria-busy="true"/);
    const err = renderRatingRow({ name: 'n', label: '打分', value: 3, error: '先给这道菜打个分' });
    assert.match(err, /-stars" role="radiogroup" aria-label="打分" aria-invalid="true" aria-describedby="ilife-rating-err-n"/);
    assert.match(err, /-error" id="ilife-rating-err-n">先给这道菜打个分</);
  });

  it('转义：机器键／标题／上次对照／补充逐位转义，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderRatingRow({ name: 'n1', label: evil, prevNote: evil, hint: evil });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.equal(/\son[a-z]+=/i.test(html), false, '不得出现内联事件处理器');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.throws(() => renderRatingRow({ ...REAL, extraClass: '.x' }), /只许空格分隔的类名/);
    assert.match(renderRatingRow({ ...REAL, extraClass: 'ok-1 other' }), /is-stars ok-1 other"/);
  });

  it('形态键是闭集：闭集外一律 BlocksError', () => {
    assert.deepEqual([...RATING_ROW_FORMS], ['stars']);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...REAL, form: 'slider' })), true);
    assert.match(renderRatingRow({ ...REAL, form: 'stars' }), /is-stars/);
  });

  it('非法入参**逐条**走 BlocksError（不静默降级、不「尽量猜」）', () => {
    const ok = { name: 'n', label: '打分' };
    assert.equal(throwsBlocks(() => renderRatingRow(undefined)), true);
    assert.equal(throwsBlocks(() => renderRatingRow(null)), true);
    assert.equal(throwsBlocks(() => renderRatingRow([])), true);
    assert.equal(throwsBlocks(() => renderRatingRow('x')), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ label: '打分' })), true, 'name 必填');
    assert.equal(throwsBlocks(() => renderRatingRow({ name: '', label: '打分' })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ name: 'n' })), true, 'label 必填（没这句读不出在评什么）');
    assert.equal(throwsBlocks(() => renderRatingRow({ name: 'n', label: '' })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: 4.7 })), true, '只许整数或 .5 档');
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: -1 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: 6 })), true, '超过满档');
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: 'abc' })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: {} })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, max: 0 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, max: 2.5 })), true, '满档必须是整数');
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, max: RATING_ROW_MAX_MAX + 1 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, prevNote: 1 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, required: 'yes' })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, disabledReason: '没做完' })), true, 'disabledReason 只在 disabled 时给');
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, loadingText: '稍等' })), true, 'loadingText 只在 loading 时给');
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, error: 1 })), true);
    assert.equal(throwsBlocks(() => renderRatingRow({ ...ok, value: null })), false, '`null` 是**还没评过**的合法表达');
    assert.equal(renderRatingRow({ ...ok, value: null }).includes('data-ilife-rating-value'), false);
  });

  it('纯函数：同入参两次逐字节相同', () => {
    assert.equal(renderRatingRow(REAL), renderRatingRow(REAL));
    assert.notEqual(renderRatingRow(REAL), renderRatingRow(HOSTILE));
  });
});

/* ── ② 样式与零 DOM 纪律 ────────────────────────────────────────────── */

describe('ratingRow ② 样式纪律', () => {
  const css = stripComments(ratingRowCss());

  it('样式段非空，且**全部**规则 scope 在 `.ilife-page-ui` 之下', () => {
    const selectors = selectorsOf(css);
    assert.ok(selectors.length >= 18, '本件规则数不对：' + selectors.length);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '选择器没 scope 在 .ilife-page-ui：' + sel);
      assert.ok(sel.includes('.' + RATING_ROW_CLASS), '选择器必须挂在件根类之下：' + sel);
    }
  });

  it('零 `:root`／零 `!important`／零新 token 名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.deepEqual(css.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
  });

  it('复合选择器的拼法：槽类接在组合器后面时**不许**再带作用域前缀（`> .ilife-page-ui …` 永远匹配不到）', () => {
    const bad = /(?:>|~|\+)\s*\.ilife-page-ui/.exec(css);
    assert.equal(bad, null, '拼错的复合选择器（规则会静默不生效）：'
      + (bad === null ? '' : css.slice(bad.index, bad.index + 60)));
    assert.match(css, /(?:>|~)\s*\.ilife-block-rating-row-/);
  });

  it('**只经 `skinVar()` 读皮肤**：每一处 var() 都与 skinVar() 逐字相同', () => {
    const spans = skinVarSpans(css);
    assert.ok(spans.length >= 12, '读皮肤的处数不对（判据可能空转）：' + spans.length);
    const rest = cutSpans(css, spans);
    assert.equal(rest.includes('var(--'), false, '手写了 var(--…)');
    const known = new Set(SKIN_TOKEN_NAMES.map((k) => skinTokenVar(k)));
    for (const n of new Set([...css.matchAll(/var\(\s*(--ilife-[a-z0-9-]+)/g)].map((m) => m[1]))) {
      assert.ok(known.has(n), '名单外的 token 名：' + n);
    }
  });

  it('**宽度只许容器判**：媒体查询只判设备能力，窄档走一条 `@container`', () => {
    for (const m of css.matchAll(/@media\s*\(([^)]*)\)/g)) {
      assert.ok(/hover|pointer|prefers-reduced-motion/.test(m[1]), '媒体查询只许判设备能力：' + m[1]);
    }
    assert.match(css, /@container \(max-width: \d+px\)/, '必须有窄档容器查询');
    assert.match(css, /container-type: inline-size;/, '本件必须自己是容器');
  });

  it('**不许 `…` 截断**：样式段里没有截断手段（唯一的 `overflow: hidden` 是半颗星的裁切，不是截字）', () => {
    for (const bad of ['text-overflow', 'line-clamp', 'white-space: nowrap']) {
      assert.equal(css.includes(bad), false, '出现了截断手段：' + bad);
    }
    for (const at of [...css.matchAll(/overflow: hidden/g)].map((m) => m.index)) {
      const before = css.slice(Math.max(0, at - 220), at);
      assert.ok(/data-ilife-rating-half="1"/.test(before), '除半颗星的裁切外不许用 `overflow: hidden`：' + before.slice(-90));
    }
    assert.ok((css.match(/overflow-wrap: anywhere/g) || []).length >= 6, '长串折行覆盖不足');
    assert.ok(css.includes('min-width: 0;'), 'flex/grid 子件必须 min-width: 0（防压字）');
  });

  it('焦点地板：`:focus-visible` 有 ≥2px 可见描边，且没有「只写 outline:none」', () => {
    assert.match(css, /:focus-visible/, '必须有 :focus-visible 规则');
    assert.match(css, /outline: 2px solid /, '焦点描边 ≥2px 且可见');
    assert.equal(/outline:\s*(none|0)/.test(css), false, '不许只写 outline:none 而不给替代');
  });

  it('几何事实：每颗星 44×44；**读数是大字号**；选中态换了**字形**（不只是换色）', () => {
    assert.ok(RATING_ROW_STAR_PX >= 44, '星的命中盒必须 ≥44：' + RATING_ROW_STAR_PX);
    assert.ok(css.includes('width: ' + String(RATING_ROW_STAR_PX) + 'px'), '星宽取常量');
    assert.ok(css.includes('height: ' + String(RATING_ROW_STAR_PX) + 'px'), '星高取常量');
    assert.ok(RATING_ROW_NUM_SCALE >= 1.5, '数字读数必须明显大于正文：' + RATING_ROW_NUM_SCALE);
    assert.ok(css.includes('font-size: calc(' + skinVar('fs-body') + ' * ' + String(RATING_ROW_NUM_SCALE) + ')'),
      '读数取「正文档 × 倍数」（唯一一处尺寸事实）');
    assert.match(css, /font-variant-numeric: tabular-nums/, '读数是等宽数字（数位一变宽就跳版）');
    assert.match(css, /content: "\\2606"/, '空心星（形状之一）');
    assert.match(css, /content: "\\2605"/, '实心星（形状之二）');
    assert.match(css, /\[aria-checked="true"\]/, '实心判在 `aria-checked` 上（不另挂短类名）');
    assert.match(css, new RegExp('\\[' + RATING_ROW_HALF_ATTR + '="1"\\]'), '半颗走 `data-*` 标记');
    for (const short of ['.is-on', '.is-half', '.is-off']) {
      assert.equal(css.includes(short), false, '不许用短类名修饰态：' + short);
    }
  });

  it('槽位闭集与类名拼法：逐槽都能拼出 `ilife-block-rating-row-<槽>`', () => {
    for (const slot of RATING_ROW_SLOTS) {
      assert.equal(ratingRowSlot(slot), 'ilife-block-rating-row-' + slot);
    }
  });

  it('层红线：`dist/components/rating-row/**` 零 DOM、零内联脚本', () => {
    const dir = join(PKG, 'dist', 'components', 'rating-row');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    assert.ok(files.length >= 5, '编译产物不全：' + files.length);
    const strip = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = strip(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(PKG, '') + ' 的代码里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ＋ ⑤ 皮肤矩阵 ────────────────────────────────────────── */

describe('ratingRow ③ 加法式（opt-in：不挂这件＝零变化）', () => {
  it('纯函数 ＋ 可选的样式/运行时段：不挂它，别人产物一个字节不变', () => {
    const a = renderRatingRow(REAL);
    assert.equal(a, renderRatingRow(REAL), '两次渲染逐字节相同');
    assert.equal(a.includes('.ilife-page-ui'), false, '标记里不带任何选择器');
    assert.equal(a.includes('ilife-block-page-head'), false, '标记里不出现别件的类名');
    assert.equal(a.includes('ilife-block-multi-checks'), false, '标记里不出现别件的类名');
    assert.equal(typeof renderRatingRow, 'function');
    assert.equal(root.renderRatingRow, undefined, '组件层不得从根出口出（冻结面签名不许动）');
  });

  it('样式段与运行时段都是**字符串**：页面不调它们就没有任何字节', () => {
    assert.ok(ratingRowCss().includes('.' + RATING_ROW_CLASS));
    assert.ok(buildRatingRowJs().includes('data-ilife-rating-runtime'));
  });
});

describe('ratingRow ⑤ 皮肤矩阵（三套皮肤下标记逐字节相同）', () => {
  const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
    + '<div class="ilife-page-ui ' + skinClass(name) + '">' + renderRatingRow(REAL) + '</div>';
  const withoutSkin = (name) => pageOf(name)
    .replace(skinCss({ skins: [name] }), '')
    .replace(skinClass(name), '');

  it('三套皮肤：差异只落在皮肤样式段与皮肤类上，标记面逐字节相同', () => {
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(renderRatingRow(REAL)), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
    assert.notEqual(pageOf(SKIN_NAMES[0]), pageOf(SKIN_NAMES[1]), '两套皮肤的页产物必须真的不同');
    assert.equal(renderRatingRow(REAL).includes('skin-'), false, '标记里不许自带皮肤类');
  });

  it('「大字报刊」皮肤下强调色＝墨黑：星星的**字形**与那枚数字必须自己扛', () => {
    const broadsheet = skinCss({ skins: ['broadsheet'] });
    const accent = /--ilife-accent:\s*([^;\n]+)/.exec(broadsheet);
    assert.ok(accent !== null, '截不出大字报刊的强调色');
    assert.match(accent[1], /^#14110d\b/i, '前提变了：大字报刊的强调色不再是墨黑');
    assert.match(ratingRowCss(), /content: "\\2605"/);
    assert.match(ratingRowCss(), /content: "\\2606"/);
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP）───────────────────────────── */

const WIDTHS = [390, 1280];
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId; nextId += 1;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 夹具页：视口恒 1440，容器宽由 `style="width:Npx"` 给；皮肤＝**大字报刊**（强调色＝墨黑）。 */
function buildFixture(width) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>rating-row 两档</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n'
    + 'body{padding:16px}\n'
    + skinCss() + '\n' + ratingRowCss() + '\n'
    + '</style></head>\n<body>\n'
    + '<div class="stage ilife-page-ui ' + skinClass('broadsheet') + '" style="width:' + width + 'px">'
    + renderRatingRow(REAL) + renderRatingRow(HOSTILE)
    + '</div>\n</body>\n</html>';
}

/** 页内量测：溢出、每颗星的命中盒、读数字号与是否被裁、字形（实心／空心）。 */
const MEASURE = '(function(){'
  + 'var stage=document.querySelector(".stage");'
  + 'function box(el){var r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)};}'
  + 'var roots=[].slice.call(document.querySelectorAll(".ilife-block-rating-row"));'
  + 'var out={stageSw:stage.scrollWidth,stageCw:stage.clientWidth,docSw:document.documentElement.scrollWidth,'
  + 'docCw:document.documentElement.clientWidth,ellipsis:document.body.innerText.indexOf("\\u2026")>=0,roots:[],stars:[],score:null};'
  + 'for(var i=0;i<roots.length;i++){var h=roots[i];'
  + 'var num=h.querySelector(".ilife-block-rating-row-num");var ns=getComputedStyle(num);'
  + 'out.roots.push({sw:h.scrollWidth,cw:h.clientWidth,box:box(h),value:h.getAttribute("data-ilife-rating-value"),'
  + 'readout:num.textContent});'
  + 'if(i===0)out.score={fs:parseFloat(ns.fontSize),rootFs:parseFloat(getComputedStyle(h).fontSize),'
  + 'sw:num.scrollWidth,cw:num.clientWidth,sh:num.scrollHeight,ch:num.clientHeight,box:box(num),vk:ns.fontVariantNumeric};'
  + 'var stars=[].slice.call(h.querySelectorAll("button[data-ilife-rating-star]"));'
  + 'for(var j=0;j<stars.length;j++){var st=stars[j];var g=st.querySelector(".ilife-block-rating-row-glyph");'
  + 'var cs=getComputedStyle(st);'
  + 'out.stars.push({idx:i+"-"+j,box:box(st),checked:st.getAttribute("aria-checked"),'
  + 'tabbable:st.getAttribute("tabindex")==="0",focusable:typeof st.focus==="function"&&!st.disabled,'
  + 'half:st.getAttribute("data-ilife-rating-half")==="1",'
  + 'glyph:getComputedStyle(g,"::before").content,color:cs.color,disabled:st.disabled});}'
  + '}'
  + 'return out;}())';

async function startFixture() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-rating-row-'));
  const profileDir = mkdtempSync(join(tmpdir(), 't-rating-row-chrome-'));
  const pages = {};
  for (const w of WIDTHS) {
    const p = join(dir, 'fixture-' + w + '.html');
    writeFileSync(p, buildFixture(w), 'utf8');
    pages[w] = p;
  }
  const port = 9800 + (process.pid % 200);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir, '--window-size=1440,900', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'ignore'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profileDir, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('DOM.enable');
    await s('CSS.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const open = async (width) => {
      await s('Page.navigate', { url: pathToFileURL(pages[width]).href });
      for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(120);
      await ev('window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
        + 'window.__hits=[];document.addEventListener("ilife:rating-change",function(e){window.__hits.push(e.detail);});'
        + 'var s=document.createElement("script");s.textContent=' + JSON.stringify(buildRatingRowJs()) + ';document.body.appendChild(s);true');
      await sleep(150);
      return ev(MEASURE);
    };
    const clickStar = async (star) => {
      const box = await ev('(function(){var b=document.querySelectorAll(".ilife-block-rating-row")[0]'
        + '.querySelector(\'button[data-ilife-rating-star="' + String(star) + '"]\');'
        + 'var r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}())');
      await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(120);
    };
    /** 真按方向键（键盘路径：焦点在星上时右键应当"移动并随即选中"）。 */
    const pressArrow = async (key) => {
      await s('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'ArrowRight' ? 39 : 37 });
      await s('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: key === 'ArrowRight' ? 39 : 37 });
      await sleep(120);
    };
    const focusStar = async (star) => {
      await ev('document.querySelectorAll(".ilife-block-rating-row")[0]'
        + '.querySelector(\'button[data-ilife-rating-star="' + String(star) + '"]\').focus();true');
      await sleep(60);
    };
    return {
      open, clickStar, pressArrow, focusStar, measure: () => ev(MEASURE),
      hits: () => ev('window.__hits'),
      errs: () => ev('window.__errs'),
      activeStar: () => ev('(function(){var a=document.activeElement;'
        + 'return a&&a.getAttribute("data-ilife-rating-star")?a.getAttribute("data-ilife-rating-star"):null;}())'),
      narrowScoreDisplay: () => ev('(function(){return getComputedStyle(document.querySelector(".ilife-block-rating-row-score")).marginLeft;}())'),
      starOutline: async () => {
        const { root: docRoot } = await s('DOM.getDocument', { depth: 1 });
        const { nodeId } = await s('DOM.querySelector', { nodeId: docRoot.nodeId, selector: 'button[data-ilife-rating-star]' });
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus-visible'] });
        const out = await ev('(function(){var b=document.querySelector("button[data-ilife-rating-star]");'
          + 'var cs=getComputedStyle(b);return {w:parseFloat(cs.outlineWidth),style:cs.outlineStyle};}())');
        await s('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        return out;
      },
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('ratingRow ④ 真机两档（390／1280 容器；视口恒 1440；皮肤＝大字报刊）', () => {
  it('零横向溢出 ＋ 每颗星 44×44 可聚焦 ＋ 数字读数不被裁且够大 ＋ 换字形不只换色 ＋ 点了／方向键都改分', async (t) => {
    const p = await startFixture();
    if (p === null) return t.skip('本机无 Chrome／Chromium：真机几条退化为 ② 的确定性几何判据');
    try {
      const readings = [];
      for (const width of WIDTHS) {
        const m = await p.open(width);
        const why = width + 'px 容器：';
        assert.ok(m.docSw <= m.docCw, why + '页面横向溢出 doc ' + m.docSw + ' > ' + m.docCw);
        assert.ok(m.stageSw <= m.stageCw, why + '容器横向溢出 ' + m.stageSw + ' > ' + m.stageCw);
        assert.equal(m.ellipsis, false, why + '页面上出现了省略号');
        assert.equal(m.roots.length, 2, why + '夹具应有两件');
        for (const r of m.roots) {
          assert.ok(r.sw <= r.cw, why + '件根横向溢出 ' + r.sw + ' > ' + r.cw);
          assert.ok(Math.abs(r.cw - width) <= 1, why + '件根的容器宽不是 ' + width + '：' + r.cw);
        }
        for (const st of m.stars) {
          assert.ok(st.box.w >= 44 && st.box.h >= 44, why + '第 ' + st.idx + ' 颗星命中盒 ' + st.box.w + '×' + st.box.h + ' 小于 44×44');
          assert.equal(st.focusable, true, why + '第 ' + st.idx + ' 颗星必须是可聚焦的按钮');
          if (st.half) assert.equal(st.box.w >= 44, true, '半颗星的命中盒同样 ≥44');
        }
        /* 星星之外**必须有**数字读数：字号够大、tabular-nums、不被裁 */
        assert.ok(m.score.fs >= 1.5 * m.score.rootFs, why + '读数 ' + m.score.fs + 'px 不到正文 ' + m.score.rootFs + 'px 的 1.5 倍');
        assert.match(m.score.vk, /tabular-nums/, why + '读数必须是等宽数字');
        assert.ok(m.score.sw <= m.score.cw + 1, why + '读数被裁（宽 ' + m.score.sw + ' > ' + m.score.cw + '）');
        assert.ok(m.score.sh <= m.score.ch + 1, why + '读数被裁（高 ' + m.score.sh + ' > ' + m.score.ch + '）');
        /* 选中态：**换了字形**（实心 ★ vs 空心 ☆），不只是换色 */
        const first = m.stars.filter((st) => st.idx.startsWith('0-'));
        const on = first.filter((st) => st.checked === 'true');
        const off = first.filter((st) => st.checked !== 'true');
        assert.ok(on.length >= 1 && off.length >= 1, why + '第 1 件应当既有实心星也有空心星');
        assert.notEqual(on[0].glyph, off[0].glyph, why + '实心星与空心星的字形居然一样（那就只剩颜色了）');
        assert.match(on[0].glyph, /\\2605|★/, why + '实心星的字形应当是 ★：' + on[0].glyph);
        assert.match(off[0].glyph, /\\2606|☆/, why + '空心星的字形应当是 ☆：' + off[0].glyph);
        readings.push(width + 'px: scrollWidth ' + m.stageSw + ' ≤ clientWidth ' + m.stageCw
          + '｜星 ' + m.stars.length + ' 颗，最小命中盒 ' + Math.min(...m.stars.map((s2) => s2.box.h)) + 'px'
          + '｜读数 ' + m.score.fs.toFixed(1) + 'px（正文 ' + m.score.rootFs.toFixed(1) + 'px）'
          + '｜字形 ' + on[0].glyph + '／' + off[0].glyph);
      }
      /* 窄档差异**只可能来自容器查询**：两档视口都是 1440 */
      await p.open(390);
      const narrow = await p.narrowScoreDisplay();
      await p.open(1280);
      const wide = await p.narrowScoreDisplay();
      assert.notEqual(narrow, wide, '390 与 1280 档的读数排布居然一样（@container 没生效）：' + narrow);
      assert.ok(parseFloat(narrow) === 0, '390 容器：读数另起一行、左对齐（margin-left 归零）：' + narrow);

      /* 交互一：点第 5 颗 ⇒ 分数＝5，读数与 aria-checked 当场改，事件带上改前值 */
      await p.open(1280);
      const before = (await p.hits()).length;
      await p.clickStar(5);
      let m = await p.measure();
      assert.equal(m.roots[0].value, '5', '机器值就地更新');
      assert.equal(m.roots[0].readout, '5', '那枚大数字就地更新');
      assert.equal(m.stars.filter((s2) => s2.idx.startsWith('0-') && s2.checked === 'true').length, 5, '五颗全实心');
      const hits = await p.hits();
      assert.equal(hits.length, before + 1, '点星必须派发一次事件');
      assert.equal(hits[hits.length - 1].name, 'dishRating');
      assert.equal(hits[hits.length - 1].value, 5);
      assert.equal(hits[hits.length - 1].prev, 4, '事件带改前值');
      /* 交互二：方向键（`role="radio"` 该有的那一套）：左移一颗并随即选中 */
      await p.focusStar(5);
      await p.pressArrow('ArrowLeft');
      assert.equal(await p.activeStar(), '4', '方向键把焦点移到前一顆');
      m = await p.measure();
      assert.equal(m.roots[0].value, '4', '方向键移动**随即选中**');
      assert.equal(m.roots[0].readout, '4');
      assert.equal((await p.hits()).length, before + 2, '方向键改分同样派发事件');

      const outline = await p.starOutline();
      assert.ok(outline.w >= 2 && outline.style !== 'none', '焦点描边不可见：' + JSON.stringify(outline));
      assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
      console.log('  [真机读数] ' + readings.join('\n  [真机读数] '));
      console.log('  [真机读数] 点第 5 颗 → 读数 ' + m.roots[0].readout + '；方向键 → 焦点 ' + (await p.activeStar())
        + '；:focus-visible outline=' + outline.w + 'px ' + outline.style);
    } finally { p.close(); }
  });
});
