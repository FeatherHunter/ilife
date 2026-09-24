// photo-grid · 判据件（**重做件**：占位必须读得出是相片）。四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何。
//
// 判据里点名要断到的两样：**照片位的定形框**（产物里的比例类 ↦ 样式段里的 `aspect-ratio`）与**题注**（`<figcaption>`）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PHOTO_GRID_ADD_LABEL,
  PHOTO_GRID_ADD_MARK,
  PHOTO_GRID_CLASS,
  PHOTO_GRID_EMPTY_TEXT,
  PHOTO_GRID_FORMS,
  PHOTO_GRID_MARK_ARM_PX,
  PHOTO_GRID_MIN_STACK,
  PHOTO_GRID_RATIOS,
  PHOTO_GRID_TOUCH_PX,
  PHOTO_GRID_TWO_COL_MAX_PX,
  photoGridCss,
  renderPhotoGrid,
} from '../dist/components/photo-grid/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'photo-grid';
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
const selectorsOf = (css) => (stripComments(css).match(/^[^@\s][^{\n]*\{/gm) || [])
  .map((s) => s.slice(0, -1).trim()).filter((s) => s !== '');
function distFiles(name) {
  const dir = join(PKG, 'dist', 'components', name);
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(dir, e.name));
}

const PHOTOS = [
  { alt: '正面 · 晨起', date: '09-25', caption: '正面 · 晨起', count: 3 },
  { alt: '侧面', date: '09-25', caption: '侧面' },
  { alt: '正面 · 晨起', date: '09-18', caption: '正面 · 晨起' },
  { src: 'a/b.jpg', alt: '背面', date: '09-11', caption: '背面' },
];
const SAMPLE = { photos: PHOTOS, note: '按拍摄日期排' };
const GROUPS = {
  groups: [
    { month: '2026 年 9 月', note: '共 4.2 MB', photos: PHOTOS.slice(0, 2) },
    { month: '2026 年 8 月', photos: [{ alt: '正面', date: '08-30', caption: '正面' }] },
  ],
};

describe('photo-grid ① 渲染契约', () => {
  it('一格 ＝ `<figure>`（定形框）＋ `<figcaption>`（题注条）', () => {
    const html = renderPhotoGrid(SAMPLE);
    assert.ok(html.startsWith('<div class="' + PHOTO_GRID_CLASS + ' is-' + PHOTO_GRID_FORMS[0]));
    assert.equal((html.match(/<figure class="ilife-block-photo-grid-cell/g) || []).length, PHOTOS.length,
      '一格照片一个 figure（末尾「加一张」是内容格，不是 figure）');
    assert.equal((html.match(/<figcaption class="ilife-block-photo-grid-caption"/g) || []).length, PHOTOS.length);
    assert.match(html, /-frame ilife-block-photo-grid-frame-4-5"/, '定形框带比例档');
    assert.match(html, /-caption"><span class="ilife-block-photo-grid-date">09-25<\/span>/);
    assert.match(html, /-text">正面 · 晨起</);
  });

  it('**定形框与题注在产物里断得到**：比例类在标记里，`aspect-ratio` 在样式段里，两处对得上', () => {
    const html = renderPhotoGrid(SAMPLE);
    const css = stripComments(photoGridCss());
    for (const ratio of PHOTO_GRID_RATIOS) {
      const cls = '.ilife-block-photo-grid-frame-' + ratio;
      const ratioCss = ratio.split('-').join(' / ');
      assert.ok(css.includes('.ilife-page-ui ' + cls + ' { aspect-ratio: ' + ratioCss + '; }'),
        '样式段缺定形框规则：' + cls);
    }
    assert.ok(html.includes('ilife-block-photo-grid-frame-4-5'), '缺省比例档要落在标记里');
  });

  it('**占位读得出是相片**：取景角标 ＋ 相机记号 ＋ 那句「放什么」三样都在；真图格反过来', () => {
    const placeholder = renderPhotoGrid({ photos: [{ alt: '正面 · 晨起' }] });
    assert.ok(placeholder.includes('-marks'), '缺四角取景角标');
    assert.ok(placeholder.includes('-lens'), '缺中央相机记号');
    assert.match(placeholder, /-alt">正面 · 晨起</);
    assert.ok(placeholder.includes('is-placeholder'), '占位格有专门的类（虚线内圈）');
    const real = renderPhotoGrid({ photos: [{ alt: '正面', src: 'a/b.jpg' }] });
    assert.match(real, /<img class="ilife-block-photo-grid-img" src="a\/b\.jpg" alt="正面" loading="lazy" decoding="async">/);
    assert.equal(real.includes('-lens'), false, '有真图就不出相机记号');
    assert.equal(real.includes('is-placeholder'), false);
    assert.ok(real.includes('is-photo'));
  });

  it('取景角标是 8 层背景（四角各一横一竖），不是一块灰', () => {
    const css = stripComments(photoGridCss());
    const rule = /-marks \{[\s\S]*?\n\}/.exec(css);
    assert.ok(rule !== null, '缺取景角标规则');
    assert.equal((rule[0].match(/linear-gradient/g) || []).length, 8, '四角各两条边＝8 层');
    assert.ok(rule[0].includes('px ' + PHOTO_GRID_MARK_ARM_PX + 'px'), '臂长常量要落在规则里');
    assert.ok(rule[0].includes('background-repeat: no-repeat'));
  });

  it('末尾「加一张」是虚线框 ＋ 加号（靠**边框样式**与内容格分开）', () => {
    const html = renderPhotoGrid(SAMPLE);
    assert.match(html, /-add"><span class="ilife-block-photo-grid-add-mark" aria-hidden="true">＋<\/span>/);
    assert.ok(html.includes(PHOTO_GRID_ADD_MARK + '</span>'));
    assert.ok(html.includes('>' + PHOTO_GRID_ADD_LABEL + '</span>'));
    assert.equal((html.match(new RegExp('-add"', 'g')) || []).length, 1, '「加一张」只许出现一格');
    assert.ok(stripComments(photoGridCss()).includes('-add {\n  display: grid;'));
    assert.equal(renderPhotoGrid({ ...SAMPLE, add: false }).includes('-add"'), false, '给 false 就不出那一格');
  });

  it('同一天多张：到 `PHOTO_GRID_MIN_STACK` 才出张数角标', () => {
    const html = renderPhotoGrid(SAMPLE);
    assert.match(html, /-stack">3 张</);
    assert.equal(renderPhotoGrid({ photos: [{ alt: 'x', count: 1 }] }).includes('-stack'), false, '1 张不出角标');
    assert.equal(throwsBlocks(() => renderPhotoGrid({ photos: [{ alt: 'x', count: 0 }] })), true);
    assert.equal(throwsBlocks(() => renderPhotoGrid({ photos: [{ alt: 'x', count: 2.5 }] })), true);
    assert.equal(PHOTO_GRID_MIN_STACK, 2);
  });

  it('按月分组：组头写月份与「几天 · 几张」（由本件算）；平铺时不出现组头', () => {
    const html = renderPhotoGrid(GROUPS);
    assert.equal((html.match(/ilife-block-photo-grid-group"/g) || []).length, 2);
    assert.match(html, /-month">2026 年 9 月</);
    assert.match(html, /-group-count">1 天 · 2 张</, '两张同日 ⇒ 一天');
    assert.match(html, /-group-count">1 天 · 1 张</);
    assert.match(html, /-note">共 4\.2 MB</);
    assert.equal(renderPhotoGrid(SAMPLE).includes('-group-head'), false);
  });

  it('脚注写「共 N 张」（张数由本件算）＋ 可选口径段', () => {
    const html = renderPhotoGrid(SAMPLE);
    assert.match(html, /-count">共 4 张</);
    assert.match(html, /-foot">[\s\S]*按拍摄日期排/);
  });

  it('一格都没有 ⇒ 空态 ＋ 只剩「加一张」那一格（新账本本来就没有照片）', () => {
    const html = renderPhotoGrid({ photos: [] });
    assert.ok(html.includes(PHOTO_GRID_EMPTY_TEXT));
    assert.equal((html.match(/<figure/g) || []).length, 0);
    assert.ok(html.includes('-add"'));
  });

  it('转义：src／alt／题注五个字符进实体', () => {
    const html = renderPhotoGrid({ photos: [{ alt: 'a<b>&"\'', caption: '<i>x</i>', src: 'x" onload="y' }] });
    assert.equal(html.includes('<i>x</i>'), false);
    assert.equal(html.includes('onload="y"'), false);
    assert.ok(html.includes('&lt;b&gt;'));
  });

  it('全部非法入参分支 ⇒ BlocksError（含 `photos`／`groups` 二选一）', () => {
    const bad = [
      () => renderPhotoGrid(undefined),
      () => renderPhotoGrid({}),
      () => renderPhotoGrid({ photos: [] , groups: [] }),
      () => renderPhotoGrid({ photos: 'x' }),
      () => renderPhotoGrid({ groups: 'x' }),
      () => renderPhotoGrid({ photos: [{ alt: '' }] }),
      () => renderPhotoGrid({ photos: [{ alt: 1 }] }),
      () => renderPhotoGrid({ photos: [{ alt: 'a', src: 2 }] }),
      () => renderPhotoGrid({ photos: [{ alt: 'a' }], ratio: '16-9' }),
      () => renderPhotoGrid({ groups: [{ photos: [] }] }),
      () => renderPhotoGrid({ groups: [{ month: '', photos: [] }] }),
      () => renderPhotoGrid({ photos: [], form: 'months' }),
      () => renderPhotoGrid({ photos: [], extraClass: '#' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true);
    assert.deepEqual([...PHOTO_GRID_RATIOS], ['4-5', '1-1', '3-4', '4-3']);
  });
});

describe('photo-grid ② 样式与零 DOM 纪律', () => {
  const raw = photoGridCss();
  const css = stripComments(raw);

  it('样式段非空，全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = selectorsOf(raw);
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
  });

  it('零 `:root`／零 `!important`；不重定义那 11 个冻结 token；零投影（层次不靠它）', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('box-shadow'), false, '零阴影皮肤下层次要照样成立');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码里不出现手写的 `var(--ilife-…)`', () => {
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'));
    assert.equal([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('));
  });

  it('零 DOM：产物剥掉字面量后不出现 document.／window.／navigator.（本件没有运行时段）', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 4);
    assert.equal(files.some((f) => f.endsWith('runtime.js')), false, '本件不做交互，不该有运行时段');
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('响应式只判容器：缺省三列 ↦ 窄档两列走 `@container`（阈值常量落两处对得上）', () => {
    assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), '缺省＝宽档三列');
    assert.ok(css.includes('@container (max-width: ' + PHOTO_GRID_TWO_COL_MAX_PX + 'px)'));
    assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), '窄档覆盖成两列');
    assert.equal(/@media[^{]*max-width/.test(css), false);
    assert.ok(css.includes('container-type: inline-size'));
  });

  it('样式段里没有过不了窄档的固定宽度（`width`／`min-width` 都 ≤ 390px）', () => {
    const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    assert.deepEqual(px(css).filter((v) => v > 390), [], '出现了按固定宽写的死宽度（换列阈值要写成窄档上界）');
  });

  it('题注条与空态各有专门规则；正文不截断（零 `text-overflow`）', () => {
    assert.ok(/-caption \{[\s\S]*?border-top: 1px solid/.test(css), '题注条要有上发丝线');
    assert.ok(/-empty \{/.test(css));
    assert.equal(css.includes('text-overflow'), false);
    assert.ok(css.includes('overflow-wrap: anywhere'));
    assert.ok(new RegExp('-add \\{[\\s\\S]*?min-height: ' + PHOTO_GRID_TOUCH_PX + 'px').test(css), '「加一张」命中盒不得小于 44');
    assert.ok(/-add \{[\s\S]*?border: 1px dashed/.test(css), '虚线框是它与内容格的分家手段');
  });
});

describe('photo-grid ③ 加法式', () => {
  it('每条选择器只要求一次 `.ilife-page-ui`（拼两遍就是永远匹配不到的死规则）', () => {
    for (const group of selectorsOf(photoGridCss())) {
      for (const one of group.split(',')) {
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1, '死规则（scope 拼了不止一次）：' + one.trim());
      }
    }
  });

  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(photoGridCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('同一入参两次渲染逐字节相同；调本件样式函数不动别处产物', () => {
    assert.equal(renderPhotoGrid(SAMPLE), renderPhotoGrid(SAMPLE));
    const before = skinCss();
    photoGridCss();
    assert.equal(skinCss(), before);
  });

  it('产物里没有脚本、没有内联事件', () => {
    const html = renderPhotoGrid(SAMPLE);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
  });
});

describe('photo-grid ④ 两档几何（390／1280 × 三套皮肤）', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    for (const width of [390, 1280]) {
      cells.push({
        skin, width, html: renderPhotoGrid({ ...GROUPS, addHint: '支持 JPG／PNG，单张 ≤ 10 MB' }),
        rootSel: '.' + PHOTO_GRID_CLASS,
        keySels: ['.ilife-block-photo-grid-caption', '.ilife-block-photo-grid-date',
          '.ilife-block-photo-grid-text', '.ilife-block-photo-grid-group-count',
          '.ilife-block-photo-grid-add-label', '.ilife-block-photo-grid-alt'],
        touchSels: ['.ilife-block-photo-grid-add'],
      });
    }
  }

  it('真机：零横向溢出 ＋ 定形框／题注不出界 ＋ 「加一张」命中盒 ≥44', async () => {
    const measured = await measureCells({ css: skinCss({}) + photoGridCss(), cells });
    if (measured === null) {
      const css = stripComments(photoGridCss());
      assert.ok(css.includes('aspect-ratio'));
      assert.ok(css.includes('min-width: 0'));
      return;
    }
    for (const r of measured.readings) {
      const at = r.skin + '@' + r.width;
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, at + ' 页面横向溢出');
      assert.ok(r.host.scrollWidth <= r.host.clientWidth, at + ' 宿主横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1, at + ' 件根横向溢出');
      assert.deepEqual(r.clipped, [], at + ' 有元素把内容裁掉了：' + JSON.stringify(r.clipped));
      assert.deepEqual(r.ellipsis, [], at + ' 出现了 … 截断');
      for (const k of r.keys) {
        assert.ok(k.n > 0, at + ' 关键选择器一枚都没命中：' + k.sel);
        assert.deepEqual(k.bad, [], at + ' 关键语义出界：' + k.sel);
      }
      for (const t of r.touch) {
        assert.ok(t.minSide >= PHOTO_GRID_TOUCH_PX, at + ' 命中盒太小：' + t.minSide);
      }
    }
  });
});
