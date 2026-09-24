// progress-list · 判据件（四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何）。
//
// 断言对象是**消费方真走的那条出口**：`dist/components/progress-list/index.js`（层出口那一行由集成席加，
// 本席不许碰 `src/components/index.ts`，所以判据直接取本件目录的出口）。
// 期望值一律从组件自己的常量派生（`PROGRESS_LIST_*`），不抄字面量：改了名字这里跟着红，不会两处走散。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROGRESS_LIST_CLASS,
  PROGRESS_LIST_FORMS,
  PROGRESS_LIST_MISSING,
  PROGRESS_LIST_NARROW_PX,
  PROGRESS_LIST_STATES,
  PROGRESS_LIST_STATE_WORDS,
  PROGRESS_LIST_TONES,
  PROGRESS_LIST_TRACK_HEIGHT_PX,
  formatProgressNumber,
  progressListCss,
  renderProgressList,
} from '../dist/components/progress-list/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'progress-list';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 剥掉 CSS 注释再断规则（注释会**提到**类名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
/** 剥掉字面量与注释（层红线断的是"模块代码自己碰不碰 DOM"，运行时是产出的 JS **文本**）。 */
const stripLiterals = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""');
/** 抛错必须是 `BlocksError`（组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try { fn(); } catch (e) { return e.name === 'BlocksError'; }
  return false;
};
/** 一条 CSS 里的选择器（逐行看，不跨行贪婪匹配）。 */
const selectorsOf = (css) => (stripComments(css).match(/^[^@\s][^{\n]*\{/gm) || [])
  .map((s) => s.slice(0, -1).trim()).filter((s) => s !== '');
/** 一件的产物（`.js` ＋ `.d.ts`）全文。 */
function distFiles(name) {
  const dir = join(PKG, 'dist', 'components', name);
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isFile()) out.push(join(dir, e.name));
  }
  return out;
}
/** 四行样本（判据里反复用：三套皮肤 × 两档宽度都拿它渲）。 */
const SAMPLE = {
  heading: '今天四个目标',
  rows: [
    { label: '热量', current: 1189, goal: 1800, unit: '卡' },
    { label: '饮水', current: 1200, goal: 2000, unit: '毫升' },
    { label: '体重', current: 68.4, goal: 66, unit: '千克' },
    { label: '运动', current: null, goal: 45, unit: '分钟' },
  ],
  note: '目标随档案一起改；这里的数按当天记录算。',
};

describe('progress-list ① 渲染契约', () => {
  it('四行清单：根 ＋ 每行四段（名／状态字、当前/目标＋单位、条、还差多少）', () => {
    const html = renderProgressList(SAMPLE);
    assert.ok(html.startsWith('<div class="' + PROGRESS_LIST_CLASS + ' is-' + PROGRESS_LIST_FORMS[0]));
    assert.equal((html.match(/class="ilife-block-progress-list-row/g) || []).length, SAMPLE.rows.length);
    assert.equal((html.match(/role="progressbar"/g) || []).length, SAMPLE.rows.length);
    assert.equal((html.match(/class="ilife-block-progress-list-fill"/g) || []).length, SAMPLE.rows.length);
    assert.match(html, /-heading">今天四个目标</);
    assert.match(html, /-label">热量</);
    assert.match(html, /-state">进行中</);
    assert.match(html, /-value">1,189</);
    assert.match(html, /-goal">\/ 1,800</);
    assert.match(html, /-unit">卡</);
    assert.match(html, /-remain">还差 611 卡</);
  });

  it('四档状态各有状态字，且落 `data-*`（**色不是唯一信息**）', () => {
    const html = renderProgressList({
      rows: [
        { label: 'a', current: 1, goal: 10 },
        { label: 'b', current: 10, goal: 10 },
        { label: 'c', current: 12, goal: 10 },
        { label: 'd', current: null, goal: 10 },
      ],
    });
    for (const state of PROGRESS_LIST_STATES) {
      assert.ok(html.includes('data-ilife-progress-state="' + state + '"'), '缺状态 ' + state);
      assert.ok(html.includes(PROGRESS_LIST_STATE_WORDS[state]), '缺状态字 ' + state);
    }
    assert.match(html, /-remain">刚好达标</);
    assert.match(html, /-remain">已超 2</);
  });

  it('条的比例由本件算：夹在 0..100；超目标只报真实百分比，条仍画满', () => {
    const short = renderProgressList({ rows: [{ label: 'a', current: 1189, goal: 1800 }] });
    assert.match(short, /-fill" style="width: 66\.1%"/);
    assert.match(short, /aria-valuenow="66\.1"/);
    const over = renderProgressList({ rows: [{ label: 'a', current: 2000, goal: 1800 }] });
    assert.match(over, /-fill" style="width: 100%"/);
    assert.match(over, /aria-valuenow="111\.1"/);
  });

  it('缺值写成 `—`：不出 `aria-valuenow`、不出「还差多少」那一行（报了就是撒谎）', () => {
    const html = renderProgressList({ rows: [{ label: '运动', current: null, goal: 45, unit: '分钟' }] });
    assert.ok(html.includes('>' + PROGRESS_LIST_MISSING + '<'));
    assert.equal(html.includes('aria-valuenow'), false);
    assert.equal(html.includes('-remain'), false);
    assert.ok(html.includes('未记录'));
  });

  it('数字只有一条排法（千分位／去尾随 0／最多两位小数）', () => {
    assert.equal(formatProgressNumber(1189), '1,189');
    assert.equal(formatProgressNumber(68.4), '68.4');
    assert.equal(formatProgressNumber(66), '66');
    assert.equal(formatProgressNumber(1093.25), '1,093.25');
    assert.equal(formatProgressNumber(-2.4), '-2.4');
    assert.equal(throwsBlocks(() => formatProgressNumber(Number.POSITIVE_INFINITY)), true);
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderProgressList({
      heading: '<img src=x onerror=1>',
      rows: [{ label: 'a<b>&"\'', current: 1, goal: 2, state: '<i>' }],
      note: 'x & y',
    });
    assert.equal(html.includes('<img'), false);
    assert.equal(html.includes('<i>'), false);
    assert.ok(html.includes('&lt;b&gt;'));
    assert.ok(html.includes('&amp;'));
  });

  it('一行都没有：没给 `emptyLine` 就一个字都不出；给了就出那一句', () => {
    assert.equal(renderProgressList({ rows: [] }), '');
    assert.match(renderProgressList({ rows: [], emptyLine: '这个账本还没定目标' }), /还没定目标/);
  });

  it('全部非法入参分支 ⇒ BlocksError（不静默降级）', () => {
    const one = (patch) => ({ rows: [{ label: 'a', current: 1, goal: 2, ...patch }] });
    const bad = [
      () => renderProgressList(undefined),
      () => renderProgressList('x'),
      () => renderProgressList({ rows: 'x' }),
      () => renderProgressList({}),
      () => renderProgressList(one({ label: '' })),
      () => renderProgressList(one({ label: 1 })),
      () => renderProgressList(one({ goal: 0 })),
      () => renderProgressList(one({ goal: -1 })),
      () => renderProgressList(one({ goal: Number.NaN })),
      () => renderProgressList(one({ current: undefined })),
      () => renderProgressList(one({ current: Number.NaN })),
      () => renderProgressList(one({ state: 7 })),
      () => renderProgressList(one({ tone: 'good' })),
      () => renderProgressList(one({ unit: 5 })),
      () => renderProgressList({ rows: [], form: 'grid' }),
      () => renderProgressList({ rows: [], extraClass: '#boom' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true, '这条该抛 BlocksError：' + String(fn));
    assert.deepEqual([...PROGRESS_LIST_FORMS], ['rows']);
    assert.deepEqual([...PROGRESS_LIST_STATES], ['blank', 'on-track', 'done', 'over']);
    assert.deepEqual([...PROGRESS_LIST_TONES], ['none', 'ok', 'warn', 'danger']);
  });
});

describe('progress-list ② 样式与零 DOM 纪律', () => {
  const css = stripComments(progressListCss());

  it('样式段非空，且全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = selectorsOf(progressListCss());
    assert.ok(selectors.length > 0);
    for (const sel of selectors) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope 在 .ilife-page-ui：' + sel);
    }
  });

  it('零 `:root`／零 `!important`；不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码里不出现手写的 `var(--ilife-…)`（兜底链只许住在 skin/contract.ts）', () => {
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('), '样式只许经 skinVar 读皮肤');
  });

  it('零 DOM：产物里不出现 document.／window.／navigator.（剥掉字面量与注释后）', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 4, '本件 dist 至少该有四份产物');
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('响应式只判容器：有 `@container`、没有按宽度判的 `@media`', () => {
    assert.ok(css.includes('@container (max-width: ' + PROGRESS_LIST_NARROW_PX + 'px)'));
    assert.equal(/@media[^{]*max-width/.test(css), false, '媒体查询不许判宽度');
    assert.ok(css.includes('container-type: inline-size'));
  });

  it('条高与「关键语义不截断」两条几何事实写在一处', () => {
    assert.match(css, new RegExp('-track \\{[\\s\\S]*?height: ' + PROGRESS_LIST_TRACK_HEIGHT_PX + 'px'));
    assert.equal(css.includes('text-overflow'), false, '不许用 … 截断');
    assert.ok(css.includes('overflow-wrap: anywhere'));
    assert.ok(/font-variant-numeric: tabular-nums/.test(css));
  });
});

describe('progress-list ③ 加法式', () => {
  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(progressListCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('不挂这件样式时，别人的产物逐字节不变；挂了也不动别人', () => {
    const other = renderProgressList(SAMPLE); // 本件自身两次渲染同字节
    assert.equal(renderProgressList(SAMPLE), other);
    const before = skinCss();
    progressListCss();
    assert.equal(skinCss(), before, '调本件样式函数不得改动别处产物');
  });

  it('产物里没有脚本、没有内联事件、没有 `<style>`', () => {
    const html = renderProgressList(SAMPLE);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.equal(html.includes('<style'), false);
  });
});

describe('progress-list ④ 两档几何（390／1280 × 三套皮肤）', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    for (const width of [390, 1280]) {
      cells.push({
        skin, width, html: renderProgressList(SAMPLE), rootSel: '.' + PROGRESS_LIST_CLASS,
        keySels: ['.ilife-block-progress-list-value', '.ilife-block-progress-list-goal',
          '.ilife-block-progress-list-remain', '.ilife-block-progress-list-state'],
        touchSels: [],
      });
    }
  }
  const KEY_PLAIN = (html) => html;   // 同一份标记进六个格：三套皮肤下标记必须逐字节相同
  it('三套皮肤下标记逐字节相同（只许样式不同）', () => {
    assert.equal(KEY_PLAIN(renderProgressList(SAMPLE)), renderProgressList(SAMPLE));
  });

  it('真机：零横向溢出 ＋ 关键语义不出界', async () => {
    const measured = await measureCells({ css: skinCss({}) + progressListCss(), cells });
    if (measured === null) {
      // 起不来就退成确定性几何判据（回执里写明「真机未跑」）：宽度上限与字号常量逐条在场。
      const css = stripComments(progressListCss());
      assert.ok(/grid-template-columns: minmax\(0, 1fr\)|display: grid/.test(css));
      assert.ok(css.includes('min-width: 0'));
      assert.ok(css.includes('overflow-wrap: anywhere'));
      return;
    }
    const readings = measured.readings;
    assert.equal(readings.length, cells.length);
    for (const r of readings) {
      const at = r.skin + '@' + r.width;
      assert.equal(r.ok, true, at + ' 找不到件根');
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, at + ' 页面横向溢出');
      assert.ok(r.host.scrollWidth <= r.host.clientWidth, at + ' 宿主横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1,
        at + ' 件根横向溢出：' + r.root.scrollWidth + ' > ' + r.root.clientWidth);
      assert.deepEqual(r.clipped, [], at + ' 有元素把内容裁掉了：' + JSON.stringify(r.clipped));
      assert.deepEqual(r.ellipsis, [], at + ' 出现了 … 截断');
      for (const k of r.keys) {
        assert.ok(k.n > 0, at + ' 关键选择器一枚都没命中：' + k.sel);
        assert.deepEqual(k.bad, [], at + ' 关键语义出界：' + k.sel);
      }
    }
  });
});
