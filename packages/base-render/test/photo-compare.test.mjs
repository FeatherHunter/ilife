// photo-compare · 判据件（**重做件**：拖动之外还要给得出「变了多少」）。
// 四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何 ＋ 真机拖动。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PHOTO_COMPARE_CLASS,
  PHOTO_COMPARE_FORMS,
  PHOTO_COMPARE_MIN_HIT_PX,
  PHOTO_COMPARE_NARROW_PX,
  PHOTO_COMPARE_SPLIT_VAR,
  PHOTO_COMPARE_STEP,
  PHOTO_COMPARE_TONES,
  PHOTO_COMPARE_TONE_MARKS,
  buildPhotoCompareJs,
  photoCompareCss,
  renderPhotoCompare,
} from '../dist/components/photo-compare/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'photo-compare';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
const selectorsOf = (css) => (stripComments(css).match(/^@?[^@\s][^{\n]*\{/gm) || [])
  .map((s) => s.slice(0, -1).trim()).filter((s) => s !== '' && !s.startsWith('@'));
function distFiles(name) {
  const dir = join(PKG, 'dist', 'components', name);
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(dir, e.name));
}

const SAMPLE = {
  before: { date: '08-30', alt: '正面', caption: '沙发 · 修复前', size: '1120×1480 · 1.8 MB' },
  after: { date: '09-25', alt: '正面', caption: '沙发 · 修复后' },
  deltas: [
    { label: '体重', before: '70.8', after: '68.4', change: '−2.4 千克', tone: 'down' },
    { label: '腰围', before: '82', after: '79', change: '−3 厘米', tone: 'down' },
    { label: '体脂', before: '21.6%', after: '20.9%', change: '−0.7 个百分点', tone: 'down' },
    { label: '拍摄角度', before: '正面', after: '正面', change: '可比' },
  ],
  verdict: '比 08-30 轻 2.4 千克',
  note: '拖照片上那根竖线：左边 08-30，右边 09-25，相隔 26 天。',
};

describe('photo-compare ① 渲染契约', () => {
  it('三个读数一起给：拖动（竖线＋拖动条）／两张日期标签／数值差值行', () => {
    const html = renderPhotoCompare(SAMPLE);
    assert.ok(html.startsWith('<div class="' + PHOTO_COMPARE_CLASS + ' is-' + PHOTO_COMPARE_FORMS[0]));
    assert.ok(html.includes('data-ilife-photo-compare=""'), '根上要有发现锚');
    assert.ok(html.includes(PHOTO_COMPARE_SPLIT_VAR + ': 50%'), '服务端先把初值渲上（无脚本也成立）');
    assert.equal((html.match(/class="ilife-block-photo-compare-layer/g) || []).length, 2);
    assert.ok(html.includes('is-before') && html.includes('is-after'));
    assert.match(html, /-divider" aria-hidden="true">/);
    assert.match(html, /-range" type="range" min="0" max="100" step="2" value="50"/);
    /* 两张的日期标签：各贴在自己那张上 */
    assert.match(html, /-tag">08-30</);
    assert.match(html, /-tag">09-25</);
    /* 数值差值行 */
    assert.equal((html.match(/class="ilife-block-photo-compare-delta is-/g) || []).length, SAMPLE.deltas.length);
    assert.match(html, /-delta-label">体重</);
    assert.match(html, /<b>70\.8<\/b><span class="ilife-block-photo-compare-delta-arrow" aria-hidden="true">→<\/span><b>68\.4<\/b>/);
    assert.match(html, /-delta-change">−2\.4 千克</);
  });

  it('方向除色之外还有两样：**记号**（↓／↑／＝）与正负号', () => {
    const html = renderPhotoCompare({
      ...SAMPLE,
      deltas: [
        { label: 'a', before: '1', after: '2', change: '＋1', tone: 'up' },
        { label: 'b', before: '2', after: '1', change: '−1', tone: 'down' },
        { label: 'c', before: '1', after: '1', change: '没变' },
      ],
    });
    assert.ok(html.includes('>' + PHOTO_COMPARE_TONE_MARKS.up + '<'));
    assert.ok(html.includes('>' + PHOTO_COMPARE_TONE_MARKS.down + '<'));
    assert.ok(html.includes('>' + PHOTO_COMPARE_TONE_MARKS.same + '<'));
    assert.deepEqual([...PHOTO_COMPARE_TONES], ['down', 'up', 'same']);
  });

  it('**没有差值行的前后对比是错的**（这一件重做就是为了「变了多少」）', () => {
    assert.equal(throwsBlocks(() => renderPhotoCompare({ ...SAMPLE, deltas: [] })), true);
    assert.equal(throwsBlocks(() => renderPhotoCompare({ ...SAMPLE, deltas: [{ label: 'a', before: '1', after: '2' }] })), true);
  });

  it('占位物读得出是相片：取景角标 ＋ 相机记号 ＋ 题注条；有真图时相机记号不出', () => {
    const html = renderPhotoCompare(SAMPLE);
    assert.ok(html.includes('-marks'));
    assert.ok(html.includes('-lens'));
    assert.match(html, /-alt">正面</);
    assert.ok(html.includes('-frame ilife-block-photo-compare-frame-4-5"'), '定形框带比例档');
    assert.match(html, /<figcaption class="ilife-block-photo-compare-caption">/);
    const real = renderPhotoCompare({
      ...SAMPLE,
      after: { date: '09-25', alt: '正面', src: 'a/b.jpg' },
    });
    assert.ok(real.includes('<img class="ilife-block-photo-compare-img"'));
    assert.equal((real.match(/-lens/g) || []).length, 1, '只有没图的那一张出相机记号');
  });

  it('拖动条可键盘调：原生 `range` ＋ 步长常量（`←`／`→` 各一档）', () => {
    const html = renderPhotoCompare({ ...SAMPLE, position: 40 });
    assert.match(html, new RegExp('step="' + String(PHOTO_COMPARE_STEP) + '"'));
    assert.match(html, /value="40"/);
    assert.ok(html.includes('aria-label="拖动竖线，比较 08-30 与 09-25 两张照片"'));
    assert.ok(html.includes('aria-valuetext="左 08-30，右 09-25"'));
    assert.ok(html.includes(PHOTO_COMPARE_SPLIT_VAR + ': 40%'));
  });

  it('转义：五个字符进实体', () => {
    const html = renderPhotoCompare({
      ...SAMPLE,
      before: { date: '08-30', alt: '<b>x</b>', caption: 'a&b' },
    });
    assert.equal(html.includes('<b>x</b>'), false);
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
    assert.ok(html.includes('a&amp;b'));
  });

  it('全部非法入参分支 ⇒ BlocksError', () => {
    const bad = [
      () => renderPhotoCompare(undefined),
      () => renderPhotoCompare({}),
      () => renderPhotoCompare({ ...SAMPLE, before: { alt: 'x' } }),
      () => renderPhotoCompare({ ...SAMPLE, after: { date: '', alt: 'x' } }),
      () => renderPhotoCompare({ ...SAMPLE, after: { date: '08-30', alt: 'x' } }),
      () => renderPhotoCompare({ ...SAMPLE, deltas: 'x' }),
      () => renderPhotoCompare({ ...SAMPLE, deltas: [{ label: '', before: '1', after: '2', change: 'c' }] }),
      () => renderPhotoCompare({ ...SAMPLE, deltas: [{ label: 'a', before: '1', after: '2', change: 'c', tone: 'flat' }] }),
      () => renderPhotoCompare({ ...SAMPLE, position: 120 }),
      () => renderPhotoCompare({ ...SAMPLE, position: Number.NaN }),
      () => renderPhotoCompare({ ...SAMPLE, form: 'side' }),
      () => renderPhotoCompare({ ...SAMPLE, extraClass: '#' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true, '该抛：' + String(fn));
    assert.equal(PHOTO_COMPARE_MIN_HIT_PX, 44);
  });
});

describe('photo-compare ② 样式与零 DOM 纪律', () => {
  const raw = photoCompareCss();
  const css = stripComments(raw);

  it('样式段非空，全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = selectorsOf(raw);
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
  });

  it('零 `:root`／零 `!important`／零投影；不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('box-shadow'), false);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码里不出现手写的 `var(--ilife-…)`', () => {
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'));
    assert.equal([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('));
  });

  it('零 DOM：产物（含运行时段）剥掉字面量后不出现 document.／window.／navigator.', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 5);
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('拖动把手命中盒 ≥44×44：把手本体就是那个尺寸，且**不靠脚本**才成立', () => {
    assert.ok(new RegExp('::-webkit-slider-thumb \\{[\\s\\S]*?width: ' + PHOTO_COMPARE_MIN_HIT_PX + 'px;[\\s\\S]*?height: '
      + PHOTO_COMPARE_MIN_HIT_PX + 'px;').test(css));
    assert.ok(css.includes('-range::-moz-range-thumb'), 'Firefox 也要有把手');
    assert.ok(new RegExp('-range \\{[\\s\\S]*?min-height: ' + PHOTO_COMPARE_MIN_HIT_PX + 'px').test(css),
      '命中盒铺满台面（≥44）');
    assert.ok(/-range:focus-visible \{[^}]*outline: 2px solid/.test(css), '键盘焦点要看得见');
  });

  it('一个位置一处存：竖线／裁切都从同一个自定义属性算', () => {
    assert.ok(css.includes('inset(0 0 0 var(' + PHOTO_COMPARE_SPLIT_VAR + ', 50%))'), '裁切从它算');
    assert.ok(new RegExp('-divider \\{[\\s\\S]*?left: var\\(' + PHOTO_COMPARE_SPLIT_VAR).test(css), '竖线从它算');
    assert.equal(PHOTO_COMPARE_SPLIT_VAR.startsWith('--ilife-'), false,
      '它是本件自己的几何量，不是皮肤 token（不许借用 --ilife- 名字空间）');
    assert.equal(stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'))
      .includes("'--ilife-"), false, '源码里不许出现 --ilife- 字面量');
  });

  it('窄档退成左右并排 ＋ 差值条（判的是本件自己的宽度，不是视口宽）', () => {
    const narrow = new RegExp('@container \\(max-width: ' + PHOTO_COMPARE_NARROW_PX + 'px\\) \\{[\\s\\S]*?\\n\\}').exec(css);
    assert.ok(narrow !== null, '缺窄档那段');
    assert.ok(narrow[0].includes('-layer {\n    grid-area: auto;'), '窄档两张改并排');
    assert.ok(narrow[0].includes('clip-path: none;'), '窄档撤掉裁切');
    assert.ok(narrow[0].includes('-range { display: none; }'), '窄档收起拖动条');
    assert.ok(narrow[0].includes('-verdict { display: block; }'), '窄档差值条上屏');
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
  });

  it('样式段里没有过不了窄档的固定宽度（`width`／`min-width` 都 ≤ 390px）', () => {
    const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    assert.deepEqual(px(css).filter((v) => v > 390), [], '出现了按固定宽写的死宽度（换档阈值要写成窄档上界）');
  });

  it('零动效：没有 transition／animation／@keyframes（直接操作，减动效档下没有东西卡在半路）', () => {
    assert.equal(css.includes('transition'), false);
    assert.equal(css.includes('animation'), false);
    assert.equal(css.includes('@keyframes'), false);
  });
});

describe('photo-compare ③ 加法式', () => {
  it('每条选择器只要求一次 `.ilife-page-ui`（拼两遍就是永远匹配不到的死规则）', () => {
    for (const group of selectorsOf(photoCompareCss())) {
      for (const one of group.split(',')) {
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1, '死规则（scope 拼了不止一次）：' + one.trim());
      }
    }
  });

  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(photoCompareCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('同一入参两次渲染逐字节相同；调本件样式函数不动别处产物', () => {
    assert.equal(renderPhotoCompare(SAMPLE), renderPhotoCompare(SAMPLE));
    const before = skinCss();
    photoCompareCss();
    buildPhotoCompareJs();
    assert.equal(skinCss(), before);
  });

  it('产物里没有 `<script>` 与内联事件', () => {
    const html = renderPhotoCompare(SAMPLE);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
  });
});

describe('photo-compare ④ 两档几何 ＋ 真机拖动', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    /* 宽档排在前面：真机交互那一段在**第一格**上跑（窄档按设计把拖动条收起来了）。 */
    for (const width of [1280, 390]) {
      cells.push({
        skin, width, html: renderPhotoCompare(SAMPLE), rootSel: '.' + PHOTO_COMPARE_CLASS,
        keySels: ['.ilife-block-photo-compare-tag', '.ilife-block-photo-compare-delta-label',
          '.ilife-block-photo-compare-delta-change'],
        /* 拖动条只在宽档在屏（窄档按设计收起），所以只对宽档量命中盒 */
        touchSels: width === 1280 ? ['.ilife-block-photo-compare-range'] : [],
      });
    }
  }
  const SCRIPT = '(function(){'
    + 'var out={split0:"",split1:"",clip0:"",clip1:"",dx:0,w:0};'
    + 'var root=document.querySelector(".' + PHOTO_COMPARE_CLASS + '");'
    + 'var range=root.querySelector(".' + PHOTO_COMPARE_CLASS + '-range");'
    + 'var stage=root.querySelector(".' + PHOTO_COMPARE_CLASS + '-stage");'
    + 'var divider=root.querySelector(".' + PHOTO_COMPARE_CLASS + '-divider");'
    + 'var after=root.querySelector(".' + PHOTO_COMPARE_CLASS + '-layer.is-after");'
    + 'out.split0=root.style.getPropertyValue("' + PHOTO_COMPARE_SPLIT_VAR + '").trim();'
    + 'out.clip0=getComputedStyle(after).clipPath;'
    + 'range.value="80"; range.dispatchEvent(new Event("input",{bubbles:true}));'
    + 'out.split1=root.style.getPropertyValue("' + PHOTO_COMPARE_SPLIT_VAR + '").trim();'
    + 'out.clip1=getComputedStyle(after).clipPath;'
    + 'out.dx=Math.round(divider.getBoundingClientRect().left-stage.getBoundingClientRect().left);'
    + 'out.w=Math.round(stage.getBoundingClientRect().width);'
    + 'return out;}())';

  it('真机：拖动把位置写回那一个自定义属性，竖线与裁切跟着走', async () => {
    const measured = await measureCells({
      css: skinCss({}) + photoCompareCss(), cells, script: SCRIPT, runtime: buildPhotoCompareJs(),
    });
    if (measured === null) {
      const css = stripComments(photoCompareCss());
      assert.ok(css.includes('var(' + PHOTO_COMPARE_SPLIT_VAR + ', 50%)'));
      return;
    }
    const v = measured.scriptValue;
    assert.equal(v.split0, '50%', '进页时的初值来自服务端渲的那一份');
    assert.equal(v.split1, '80%', '拖到 80 后要写回同一个属性');
    assert.ok(v.clip0.indexOf('50%') >= 0, '裁切跟着初值：' + v.clip0);
    assert.ok(v.clip1.indexOf('80%') >= 0, '裁切跟着新值：' + v.clip1);
    assert.ok(Math.abs(v.dx - v.w * 0.8) <= 2, '竖线要落在台面 80% 处：实测 ' + v.dx + '/' + v.w);

    for (const r of measured.readings) {
      const at = r.skin + '@' + r.width;
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, at + ' 页面横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1, at + ' 件根横向溢出');
      assert.deepEqual(r.clipped, [], at + ' 有元素把内容裁掉了：' + JSON.stringify(r.clipped));
      assert.deepEqual(r.ellipsis, [], at + ' 出现了 … 截断');
      for (const k of r.keys) {
        assert.ok(k.n > 0, at + ' 关键选择器一枚都没命中：' + k.sel);
        assert.deepEqual(k.bad, [], at + ' 关键语义出界：' + k.sel);
      }
      for (const t of r.touch) {
        assert.ok(t.n > 0, at + ' 拖动条没量到：' + t.sel);
        assert.ok(t.minSide >= PHOTO_COMPARE_MIN_HIT_PX,
          at + ' 拖动条命中盒小于 44：实测 ' + t.minSide);
      }
    }
  });
});
