/** relation-picker（关系选择器 · 形态 `overlay`「浮层选一个」／形态 `inline`「行内展开选一个」）· 契约测试。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤纪律：
 *  ① **渲染契约**：两形态各自的骨架（`overlay` 的触发键 ＋ 顶层浮面 ＋ 两组 ＋ 末行新建；
 *     `inline` 的字段行 ＋ 行内块 ＋ 选完那一行）／组序（最近用过在前、全部在后）／
 *     初值筛与命中词与真读数三样同步／选中两头同时可见（字段行读值 ＋ 那一行 `is-on`）／
 *     `inline` 选完收起与 `open` 硬摊开／同页多实例 `id` 逐实例派生／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`；含**全空白串**与**入参表以外的键**与**引用不命中**）／
 *     纯函数（同入参同字节）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下、
 *     零 `:root`／`!important`／零新 token／零视口宽度查询／必带本件自己的 `@container` 且自己声明了容器／
 *     零手写 `var(--ilife-…)`／零把 `ink` 系当面／零键帽语汇／零省略号式截断／窄档阈值只有一个出处／
 *     触控地板数字写在一处／按压侧标 2px／`dist/components/relation-picker/**` 剥字面量后零 DOM；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：容器 320／390／620／1280 下零横向溢出、
 *     不出现横向滚动容器、关键语义（名字／副语／读数／组头／按钮字）零截断、
 *     每一枚可点元素（触发键／清空键／新建键／「换」／最近一枚／**整行**）≥44×44、
 *     相邻两行之间 ≥8px、四套皮肤下标记逐字节相同；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机）**：点一行派发选中事件且字段行原地重写（两头同值）／`overlay` 下收起浮面、
 *     `inline` 下收成结果行／点了新建派发新建事件（带当前搜索词）／「换」重新摊开／
 *     输入即筛派发真读数／重复注入只绑一次。
 *
 * 期望值一律从组件自己的常量派生（`RELATION_PICKER_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  RELATION_PICKER_ATTR,
  RELATION_PICKER_BOUND_ATTR,
  RELATION_PICKER_CHANGE_ATTR,
  RELATION_PICKER_CHOSEN_ATTR,
  RELATION_PICKER_CLASS,
  RELATION_PICKER_CLEAR_ATTR,
  RELATION_PICKER_CONTAINER,
  RELATION_PICKER_CREATE_ATTR,
  RELATION_PICKER_EMPTY_ATTR,
  RELATION_PICKER_EVENT_CREATE,
  RELATION_PICKER_EVENT_QUERY,
  RELATION_PICKER_EVENT_SELECT,
  RELATION_PICKER_FOOT_ATTR,
  RELATION_PICKER_FORMS,
  RELATION_PICKER_FORM_ATTR,
  RELATION_PICKER_GAP_PX,
  RELATION_PICKER_GROUP_ATTR,
  RELATION_PICKER_HOVER_QUERY,
  RELATION_PICKER_INLINE_ATTR,
  RELATION_PICKER_ITEM_ATTR,
  RELATION_PICKER_NAME_ATTR,
  RELATION_PICKER_NARROW_PX,
  RELATION_PICKER_OPEN_ATTR,
  RELATION_PICKER_PANEL_ATTR,
  RELATION_PICKER_PANEL_MAX_PX,
  RELATION_PICKER_QUERY_ATTR,
  RELATION_PICKER_RECENT_ATTR,
  RELATION_PICKER_ROW_MIN_PX,
  RELATION_PICKER_RUNTIME_ATTR,
  RELATION_PICKER_SEARCH_ATTR,
  RELATION_PICKER_SLOTS,
  RELATION_PICKER_TEXT,
  RELATION_PICKER_TOUCH_PX,
  RELATION_PICKER_VALUE_ATTR,
  buildRelationPickerJs,
  relationPickerCss,
  relationPickerSlot,
  renderRelationPicker,
} from '../dist/components/relation-picker/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { relationPickerFoot, relationPickerHits } from '../dist/components/relation-picker/model.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { selectorsOf, skinVarSpans, cutSpans, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { styleSource } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'relation-picker');
const SLOT = (s) => relationPickerSlot(s);
/** 四套皮肤的取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));
/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};
const countOf = (html, re) => (html.match(re) || []).length;
/** 一行的标签正则以「类名 ＋ 边界」收尾：`…-row` 是 `…-rows`（行容器）的前缀，裸串会把容器也数进来。 */
const ROW_TAG = 'class="[^"]*' + SLOT('row') + '[" ]';
/** 现在**露着**的行（渲染期那一份 `hidden` 就是「露不露」的唯一事实；最近组与全部组是同一批选项的两处摆法，去重）。 */
const visibleKeys = (html) => [...new Set([...html.matchAll(new RegExp(ROW_TAG + '[^>]*' + RELATION_PICKER_ITEM_ATTR + '="([^"]+)"[^>]*', 'g'))]
  .filter((m) => !m[0].includes(' hidden')).map((m) => m[1]))];

/* ── 两份真实形状的入参 ─────────────────────────────────────────────── */

const OVERLAY = {
  id: 'pay-account',
  label: '账户',
  form: 'overlay',
  readingLabel: '余额',
  options: [
    { key: 'cmb-save', title: '招行储蓄卡', note: '上次 09-24，记了 3 笔', reading: '3,204.18' },
    { key: 'cmb-credit', title: '招行信用卡', note: '上次 09-18，记了 1 笔', reading: '-1,860.00' },
    { key: 'wechat', title: '微信', note: '零钱，上次 09-25', reading: '412.60' },
    { key: 'cash', title: '现金', note: '上次 09-25', reading: '180.00' },
  ],
  recentKeys: ['cmb-save', 'cmb-credit'],
  selectedKey: 'cmb-save',
};

const INLINE = {
  id: 'home-place',
  label: '物品放在哪儿',
  form: 'inline',
  options: [
    { key: 'tiaoliao', title: '厨房调料柜', note: '2 层，里面 6 件', reading: '上次 09-21' },
    { key: 'jinggui', title: '卫生间镜柜', note: '1 层，里面 4 件', reading: '上次 08-30' },
    { key: 'xiegui', title: '玄关鞋柜', note: '1 层，里面 2 件' },
  ],
  recentKeys: ['tiaoliao', 'jinggui'],
  selectedKey: 'tiaoliao',
};

/** 注入串：每个文本字段都塞一遍（转义面）。 */
const EVIL = '<img src=x onerror=alert(1)>&"\'<>';

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('relation-picker ① 渲染契约 · 两形态骨架', () => {
  it('overlay：触发键带 popovertarget 指浮面，浮面是原生 popover（零脚本也开得出来）', () => {
    const html = renderRelationPicker(OVERLAY);
    assert.ok(html.includes('popovertarget="pay-account-panel"'), '触发键指着浮面');
    assert.ok(html.includes('id="pay-account-panel"'), '浮面 id 按入参 id 派生');
    assert.ok(html.includes('popover="auto"'), '浮面是原生 popover');
    assert.ok(html.includes('role="dialog"'), '浮面是对话框语义');
    assert.ok(html.includes('aria-controls="pay-account-panel"'), '触发键的 aria-controls 指着自己那块');
    assert.ok(html.includes(RELATION_PICKER_PANEL_ATTR + '="pay-account"'), '浮面发现锚');
  });

  it('overlay：搜一行 ＋ 最近用过 ＋ 全部 ＋ 末行新建（组序：最近在前）', () => {
    const html = renderRelationPicker(OVERLAY);
    assert.ok(html.includes('class="' + SLOT('in') + '"'), '搜一行');
    assert.ok(html.includes(RELATION_PICKER_QUERY_ATTR + '="pay-account"'), '输入框发现锚');
    const recentAt = html.indexOf(RELATION_PICKER_TEXT.recentGroup);
    const allAt = html.indexOf('全部账户');
    assert.ok(recentAt >= 0 && allAt > recentAt, '最近用过排在全部前面');
    assert.ok(html.includes('class="' + SLOT('new') + '"'), '末行新建那一排');
    assert.ok(html.includes(RELATION_PICKER_CREATE_ATTR + '=""'), '空搜索词时新建键的值为空');
    assert.ok(html.includes('class="' + SLOT('colh') + '"'), '给了 readingLabel 就出列头行');
  });

  it('inline：字段行 ＋ 行内块（最近一排 ＋ 组头 ＋ 单列 ＋ 末行新建）＋ 选完那一行', () => {
    const html = renderRelationPicker(INLINE);
    assert.ok(html.includes(RELATION_PICKER_INLINE_ATTR + '="home-place"'), '行内块发现锚');
    assert.ok(html.includes('id="home-place-inline"'), '行内块 id 按入参 id 派生');
    assert.ok(html.includes('class="' + SLOT('quick') + '"'), '最近一排');
    assert.ok(html.includes('class="' + SLOT('gh') + '"'), '全部组头');
    assert.ok(html.includes('3 个'), '组头右端读几个');
    assert.ok(html.includes(RELATION_PICKER_CHOSEN_ATTR + '="home-place"'), '选完那一行');
    assert.ok(html.includes('class="' + SLOT('change') + '"'), '「换」是真按钮');
    assert.ok(html.includes('aria-controls="home-place-inline"'), '「换」指着行内那块');
  });

  it('inline：有选＝行内块收起（hidden），open:true 才硬摊开；没选＝摊开且不出结果行', () => {
    const shut = renderRelationPicker(INLINE);
    assert.ok(shut.includes('id="home-place-inline"'), '行内块在');
    assert.ok(/id="home-place-inline"[^>]*hidden/.test(shut), '有选时行内块收起');
    const open = renderRelationPicker({ ...INLINE, open: true });
    assert.ok(!/id="home-place-inline"[^>]*hidden/.test(open), 'open:true 硬摊开');
    const { selectedKey, ...rest } = INLINE;
    const bare = renderRelationPicker(rest);
    assert.ok(!/id="home-place-inline"[^>]*hidden/.test(bare), '没选时摊开');
    assert.ok(bare.includes(RELATION_PICKER_CHOSEN_ATTR + '="home-place"'), '结果行常渲（没选时藏着）');
    assert.ok(/data-ilife-relation-chosen="home-place" hidden/.test(bare), '没选时结果行 hidden');
    assert.ok(bare.includes(RELATION_PICKER_TEXT.unpicked), '没选时字段行读还没选');
  });

  it('选中两头同时可见：字段行读当前值、列表里那一行是选中态（形＋字，不只靠颜色）', () => {
    const html = renderRelationPicker(OVERLAY);
    const val = html.match(new RegExp(RELATION_PICKER_VALUE_ATTR + '="pay-account">([^<]*)<'));
    assert.ok(val, '字段行有读值那一格');
    assert.equal(val[1], '招行储蓄卡', '字段行读的是选中那一项的名字');
    const onRow = html.match(new RegExp(ROW_TAG + '[^>]*' + RELATION_PICKER_ITEM_ATTR + '="cmb-save"[^>]*>', ''));
    assert.ok(onRow, '选中那一行在');
    assert.ok(onRow[0].includes('is-on'), '选中行挂 is-on');
    assert.ok(onRow[0].includes('aria-current="true"'), '选中行带 aria-current');
    const inl = renderRelationPicker(INLINE);
    assert.ok(inl.includes('选好了 厨房调料柜'), '结果行读的是同一项');
    assert.ok(inl.includes(RELATION_PICKER_TEXT.pickedTag), '行尾写已选');
    assert.ok(inl.includes(RELATION_PICKER_TEXT.pickTag), '没选的行尾写选它');
  });

  it('初值筛：渲染期按 query 筛一遍（hidden）＋ 命中词标出来 ＋ 脚注是真读数', () => {
    const html = renderRelationPicker({ ...OVERLAY, query: '招', selectedKey: undefined });
    assert.deepEqual(visibleKeys(html).sort(), ['cmb-credit', 'cmb-save'], '只露命中的两行');
    assert.ok(html.includes('<mark'), '命中词标出来');
    assert.ok(html.includes(RELATION_PICKER_TEXT.footHitPre + '2' + RELATION_PICKER_TEXT.footHitPost), '脚注是真读数');
    const none = renderRelationPicker({ ...OVERLAY, query: '不存在的词', selectedKey: undefined });
    assert.deepEqual(visibleKeys(none), [], '一条不中');
    assert.ok(!none.includes(RELATION_PICKER_EMPTY_ATTR + '="pay-account" hidden'), '空态出来');
    assert.ok(none.includes(RELATION_PICKER_TEXT.footNone), '脚注换成换个词');
    assert.ok(none.includes('新建「不存在的词」'), '新建键把当前搜索词夹在中间');
  });

  it('同页多实例：两份不同 id 的浮面 id 与 aria-* 各指各的', () => {
    const a = renderRelationPicker({ ...OVERLAY, id: 'pay-a' });
    const b = renderRelationPicker({ ...OVERLAY, id: 'pay-b' });
    for (const frag of ['id="pay-a-panel"', 'id="pay-b-panel"', 'aria-controls="pay-a-panel"',
      'aria-controls="pay-b-panel"', 'popovertarget="pay-a-panel"', 'popovertarget="pay-b-panel"']) {
      assert.ok((a + b).includes(frag), '两份实例各指各：' + frag);
    }
    assert.ok(!a.includes('pay-b-panel') && !b.includes('pay-a-panel'), '不串味');
    const c = renderRelationPicker({ ...INLINE, id: 'place-a' });
    const d = renderRelationPicker({ ...INLINE, id: 'place-b' });
    assert.ok(c.includes('id="place-a-inline"') && d.includes('id="place-b-inline"'), '行内 id 也逐实例派生');
  });

  it('转义：每个文本字段都塞一遍注入串（名字／副语／读数／标签／组名／提示）', () => {
    const html = renderRelationPicker({
      id: 'evil',
      label: EVIL,
      allLabel: EVIL,
      hint: EVIL,
      readingLabel: EVIL,
      options: [{ key: 'k1', title: EVIL, note: EVIL, reading: EVIL }],
      recentKeys: ['k1'],
    });
    assert.ok(!html.includes(EVIL), '注入串原文不得出现在产物里');
    assert.ok(html.includes('&lt;img'), '尖括号被转义');
    assert.ok(html.includes('&amp;'), '& 被转义');
  });

  it('纯函数：同样的入参恒产同样的字节', () => {
    assert.equal(renderRelationPicker(OVERLAY), renderRelationPicker(OVERLAY));
    assert.equal(renderRelationPicker(INLINE), renderRelationPicker(INLINE));
  });

  it('全部非法入参分支（每个都断 BlocksError）', () => {
    const ok = (patch) => ({ ...OVERLAY, ...patch });
    const bad = [
      () => renderRelationPicker(undefined),
      () => renderRelationPicker(null),
      () => renderRelationPicker([]),
      () => renderRelationPicker({}),
      () => renderRelationPicker(ok({ id: '' })),
      () => renderRelationPicker(ok({ id: '   ' })),
      () => renderRelationPicker(ok({ id: 'not an id!' })),
      () => renderRelationPicker(ok({ label: '' })),
      () => renderRelationPicker(ok({ label: '   ' })),
      () => renderRelationPicker(ok({ options: [] })),
      () => renderRelationPicker(ok({ options: 'x' })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: 't' }, undefined][0] === undefined ? [undefined] : [] })),
      () => renderRelationPicker(ok({ options: [{ key: '', title: 't' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'bad key', title: 't' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: '' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: '   ' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: 't' }, { key: 'k1', title: 'u' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: 't', note: '   ' }] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: 't', reading: '   ' }] })),
      () => renderRelationPicker(ok({ options: ['k1'] })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1' }] })),
      () => renderRelationPicker(ok({ recentKeys: 'k1' })),
      () => renderRelationPicker(ok({ recentKeys: ['nope'] })),
      () => renderRelationPicker(ok({ recentKeys: ['cmb-save', 'cmb-save'] })),
      () => renderRelationPicker(ok({ recentKeys: ['cmb-save', 'cmb-credit', 'wechat', 'cash', 'cmb-save', 'cmb-credit', 'wechat'] })),
      () => renderRelationPicker(ok({ selectedKey: '   ' })),
      () => renderRelationPicker(ok({ selectedKey: 'nope' })),
      () => renderRelationPicker(ok({ selectedKey: 'bad key' })),
      () => renderRelationPicker(ok({ form: 'A' })),
      () => renderRelationPicker(ok({ form: 'B' })),
      () => renderRelationPicker(ok({ form: 'overlayx' })),
      () => renderRelationPicker(ok({ allLabel: '   ' })),
      () => renderRelationPicker(ok({ readingLabel: '   ' })),
      () => renderRelationPicker(ok({ newPrefix: '   ' })),
      () => renderRelationPicker(ok({ emptyText: '   ' })),
      () => renderRelationPicker(ok({ hint: '   ' })),
      () => renderRelationPicker(ok({ error: '   ' })),
      () => renderRelationPicker(ok({ open: 'yes' })),
      () => renderRelationPicker(ok({ extraClass: '   ' })),
      () => renderRelationPicker(ok({ extraClass: 'a b{c}' })),
      () => renderRelationPicker(ok({ bogus: 1 })),
      () => renderRelationPicker(ok({ options: [{ key: 'k1', title: 't', bogus: 1 }] })),
    ];
    /* 稀疏数组（空洞）＝拒：`new Array(1)` 的洞会让校验遍历跳过。 */
    const sparse = new Array(1);
    bad.push(() => renderRelationPicker(ok({ options: sparse })));
    const sparseRecent = new Array(1);
    bad.push(() => renderRelationPicker(ok({ recentKeys: sparseRecent })));
    bad.forEach((fn, i) => assert.ok(throwsBlocks(fn), '第 ' + i + ' 条非法入参不断 BlocksError'));
    /* 对照：合法的边角（空串＝未给）必须过。 */
    assert.ok(renderRelationPicker(ok({ query: '' })).length > 0, 'query 空串＝未给');
    assert.ok(renderRelationPicker(ok({ query: '   ' })).length > 0, 'query 只有空白＝未给');
    assert.ok(renderRelationPicker({ ...INLINE, open: false }).length > 0, 'open:false 合法');
  });
});

/* ── ② 样式与零 DOM 纪律 ─────────────────────────────────────────────── */

describe('relation-picker ② 样式与零 DOM 纪律', () => {
  const css = relationPickerCss();
  const clean = stripComments(css);

  it('样式段非空；每条选择器 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.length > 0, '样式段非空');
    for (const sel of selectorsOf(css)) {
      for (const part of sel.split(',')) {
        assert.ok(part.trim().startsWith('.ilife-page-ui'), 'scope 外的选择器：' + part);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／必带本件自己的 `@container` 且自己声明了容器', () => {
    assert.ok(!clean.includes(':root'), '不写 :root');
    assert.ok(!clean.includes('!important'), '不写 !important');
    assert.ok(!/@media[^{]*max-width/i.test(clean), '零视口宽度查询（max-width）');
    assert.ok(!/@media[^{]*min-width/i.test(clean), '零视口宽度查询（min-width）');
    assert.ok(clean.includes('@container ' + RELATION_PICKER_CONTAINER), '窄档必须由**本件自己的**容器判');
    assert.ok(clean.includes('container: ' + RELATION_PICKER_CONTAINER + ' / inline-size'), '写了 @container 就必须自己声明容器');
    const tokens = new Set([...clean.matchAll(/--ilife-([a-z0-9-]+)/g)].map((m) => m[1]));
    const known = new Set(Object.keys(SKINS[SKIN_NAMES[0]].values));
    for (const t of tokens) assert.ok(known.has(t), '新 token 名：' + t);
  });

  it('零手写 `var(--ilife-…)`：每一处都与 `skinVar()` 逐字相同', () => {
    skinVarSpans(assert, css, skinVar);
  });

  it('零把 `ink` 系当面：background 整段是墨色 var() 才算（淡洗不算）', () => {
    const naked = cutSpans(clean, []);
    const hits = [...naked.matchAll(/background(\s*:[^;}]+)/g)]
      .map((m) => m[1].trim())
      .filter((v) => /^:\s*var\(--ilife-ink(-[23])?,/.test(v));
    assert.deepEqual(hits, [], '实心墨块：' + hits.join(' ｜ '));
  });

  it('样式源码里零手写 var：`style*.ts` 合文本同一口径（拆分不松纪律）', () => {
    const src = styleSource('relation-picker');
    const naked = src.replace(/\/\*[\s\S]*?\*\//g, '');
    const uses = [...naked.matchAll(/skinVar\('([a-z0-9-]+)'\)/g)].map((m) => m[0]);
    assert.ok(uses.length > 10, '样式里读 token 的地方不对：' + uses.length);
    assert.ok(!/var\(--ilife-/.test(naked), '样式源码里手写 var(--ilife-…)（注释里的写法不算）');
  });

  it('零省略号式截断：名字与数量永不 `…`（超长换行）', () => {
    assert.ok(!clean.includes('text-overflow'), '不写 text-overflow');
    assert.ok(!clean.includes('line-clamp'), '不写 line-clamp');
    assert.ok(!clean.includes('white-space: nowrap') && !clean.includes('white-space:nowrap'), '不写 nowrap');
    assert.ok(!clean.includes('overflow-x:'), '不写 overflow-x');
    assert.ok(clean.includes('overflow-wrap: anywhere'), '长串换行');
  });

  it('零键盘语汇（标记与样式与运行时三处）：方向键／Tab／Esc／快捷键不当通路', () => {
    const js = buildRelationPickerJs();
    const html = renderRelationPicker(OVERLAY) + renderRelationPicker(INLINE);
    for (const [name, text] of [['css', clean], ['js', js], ['html', html]]) {
      for (const word of ['⌘', '⌥', '⇧', '↑', '↓', '←', '→', '快捷键', '方向键', '键帽']) {
        assert.ok(!text.includes(word), name + ' 里有键盘语汇：' + word);
      }
    }
    assert.ok(!/Esc/.test(js), '运行时里没有 Esc 通路');
  });

  it('窄档阈值只有一个出处（`attrs.ts`）；产出 CSS 里的 `@container` 逐条取同一个数', () => {
    const limits = [...clean.matchAll(/@container [\w-]+ \(max-width: (\d+(?:\.\d+)?)px\)/g)].map((m) => Number(m[1]));
    assert.ok(limits.length >= 2, '@container 窄档段落数不对：' + limits.length);
    for (const n of limits) assert.equal(n, RELATION_PICKER_NARROW_PX, '窄档阈值走散：' + n);
    assert.equal(RELATION_PICKER_NARROW_PX, 560, '窄档阈值读数（改了这里要同步改判据注释）');
  });

  it('触控地板写在一处：触发键／清空键／新建键／「换」≥44px高、一行≥52px高、行间 8px 缝、按压侧标 2px', () => {
    assert.equal(RELATION_PICKER_TOUCH_PX, 44);
    assert.equal(RELATION_PICKER_ROW_MIN_PX, 52);
    assert.equal(RELATION_PICKER_GAP_PX, 8);
    assert.ok(clean.includes('min-height: ' + RELATION_PICKER_TOUCH_PX + 'px'), '可点元素 44 高');
    assert.ok(clean.includes('min-height: ' + RELATION_PICKER_ROW_MIN_PX + 'px'), '整行 52 高');
    assert.ok(clean.includes('gap: ' + RELATION_PICKER_GAP_PX + 'px'), '行间 8px 缝');
    assert.ok(clean.includes('inset 2px 0 0 ' + skinVar('accent')), '整行选中侧标 2px');
  });

  it('`dist/components/relation-picker/**` 剥字面量与注释后零 `document.`／`window.`／`navigator.`', () => {
    const dir = join(PKG, 'dist', 'components', 'relation-picker');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      const naked = src.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*|\/\*[\s\S]*?\*\//g, '');
      for (const word of ['document.', 'window.', 'navigator.']) {
        assert.ok(!naked.includes(word), f + ' 里有 ' + word);
      }
    }
  });

  it('闭集里的槽名一个都不许是死声明（样式与标记各用一遍）', () => {
    const html = renderRelationPicker(OVERLAY) + renderRelationPicker(INLINE)
      + renderRelationPicker({ ...INLINE, selectedKey: undefined })
      + renderRelationPicker({ ...OVERLAY, id: 'hit-x', query: '招', selectedKey: undefined })
      + renderRelationPicker({ ...OVERLAY, id: 'err-x', error: '搜不到时去末行新建一个', hint: '选完记得点存' });
    for (const slot of RELATION_PICKER_SLOTS) {
      const cls = SLOT(slot);
      assert.ok(html.includes(cls), '标记里没有槽：' + slot);
      assert.ok(clean.includes('.' + cls) || clean.includes(cls), '样式里没有槽：' + slot);
    }
  });
});

/* ── ③ 加法式 ─────────────────────────────────────────────────────────── */

describe('relation-picker ③ 加法式', () => {
  it('不挂本件时同页产物逐字节不变（本件只读自己的类名）', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.ok(!base.includes('relation-picker'), '不挂本件时零命中');
    const other = renderPageHead({
      skill: '卡路里', title: '今日', reading: { value: '100', unit: '卡' },
    });
    assert.ok(!other.includes('relation-picker'), '渲染别件不带本件类名');
  });

  it('换前缀时 scope 与类名一起换（`.x-page-ui .x-block-relation-picker-…`）', () => {
    const css = relationPickerCss({ prefix: 'x-' });
    assert.ok(css.includes('.x-page-ui .x-block-relation-picker'), '前缀透传');
    assert.ok(!css.includes('.ilife-page-ui'), '旧前缀不残留');
    const html = renderRelationPicker(OVERLAY);
    assert.ok(html.includes('ilife-block-relation-picker'), '标记用缺省前缀');
  });
});

/* ── ④⑤ 两档几何 · 皮肤纪律 · 行为（真机 headless Chrome ＋ CDP） ─────── */

const LONG = '超长的一段名字，用来量窄档会不会把这一行顶出横向滚动'.repeat(4);

/** 被测用例（每个 `[data-case]` 是一个被测件；长串用例专量「永不截断」）。 */
function cases() {
  return [
    {
      name: 'overlay', form: 'overlay',
      html: renderRelationPicker({ ...OVERLAY, id: 'g-overlay' }),
    },
    {
      name: 'overlay-long', form: 'overlay',
      html: renderRelationPicker({
        id: 'g-overlay-long', label: LONG, form: 'overlay', readingLabel: '余额',
        options: [
          { key: 'a', title: LONG, note: LONG, reading: '12345678901234567890.00' },
          { key: 'b', title: '短名', note: '短副语', reading: '1.00' },
        ],
        recentKeys: ['a'],
        hint: '这句提示故意写得很长，用来量窄档会不会被顶出横向滚动。'.repeat(4),
      }),
    },
    {
      name: 'inline', form: 'inline',
      html: renderRelationPicker({ ...INLINE, id: 'g-inline' }),
    },
    {
      name: 'inline-open', form: 'inline',
      html: renderRelationPicker({ ...INLINE, id: 'g-inline-open', selectedKey: undefined }),
    },
    {
      name: 'inline-long', form: 'inline',
      html: renderRelationPicker({
        id: 'g-inline-long', label: LONG, form: 'inline',
        options: [{ key: 'a', title: LONG, note: LONG, reading: '12345678901234567890.00' }],
        hint: '提示也很长。'.repeat(10),
      }),
    },
  ];
}

const pageHtml = (list) => list.map((c) => '<section data-case="' + c.name + '">' + c.html + '</section>').join('');

/** 确定性几何判据（真机起不来时退到它）：定宽上限、触控地板写在样式里、收起态 hidden。 */
function assertStaticGeometry(css, listHtml) {
  const clean = stripComments(css);
  assert.ok(clean.includes('max-width: ' + RELATION_PICKER_PANEL_MAX_PX + 'px'), '根定宽不过浮面上限');
  assert.ok(clean.includes('minmax(0, 1fr)'), '名字那一列吃剩余宽（minmax(0,1fr)）');
  assert.ok(clean.includes('min-height: ' + RELATION_PICKER_TOUCH_PX + 'px'), '触控地板写在样式里');
  assert.ok(clean.includes('min-height: ' + RELATION_PICKER_ROW_MIN_PX + 'px'), '整行高度写在样式里');
  assert.ok(!clean.includes('white-space: nowrap') && !clean.includes('white-space:nowrap'), '无 nowrap');
  assert.ok(listHtml.includes('hidden'), '收起态（inline 有选）行内块 hidden');
}

describe('relation-picker ④⑤ 两档几何 · 皮肤纪律 · 行为（真机 headless Chrome ＋ CDP）', () => {
  it('容器 320／390／620／1280：零横溢／命中盒 ≥44／间距 ≥8／零截断／四套皮肤标记逐字节相同／行为逐条', async (t) => {
    const css = relationPickerCss();
    const js = buildRelationPickerJs();
    const list = cases();
    const listHtml = pageHtml(list);
    const evName = [RELATION_PICKER_EVENT_SELECT, RELATION_PICKER_EVENT_CREATE, RELATION_PICKER_EVENT_QUERY];
    const listener = '<script>window.__ev=[];'
      + '[' + evName.map((e) => JSON.stringify(e)).join(',') + '].forEach(function(name){'
      + 'document.addEventListener(name,function(e){var d=e.detail||{};'
      + 'window.__ev.push([name,d.id,d.key,d.title,d.query,d.hits,d.value]);});});'
      + '</script>';
    const page = await startShapesPage({
      html: SKIN_NAMES.map((skin) => '<div class="ilife-page-ui ' + skinClass(skin) + '">' + listHtml + '</div>').join('\n')
        + '<script>' + js + '</script>' + listener,
      css: skinCss() + '\n' + css,
      height: 1600,
    });
    if (page === null) {
      console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：定宽不过浮面上限／'
        + '名字列吃剩余宽／触控地板写在样式里／无 nowrap／收起态 hidden');
      assertStaticGeometry(css, listHtml);
      return t.skip('本机无 Chrome／Chromium：两档几何与行为判据需真浏览器');
    }
    try {
      const scope0 = '.' + skinClass(SKIN_NAMES[0]) + ' ';
      /* overlay 的浮面默认收着：先点开（真点，走 popover 通路），再量。 */
      await page.setWidth(390);
      await page.ev('(function(){var b=document.querySelector('
        + JSON.stringify(scope0 + '[data-case="overlay"] .' + SLOT('box')) + ');b.click();return true;}())');
      await page.ev('new Promise(function(r){setTimeout(r,300);});');
      const opened = await page.ev('(function(){var p=document.querySelector('
        + JSON.stringify(scope0 + '[data-case="overlay"] .' + SLOT('panel')) + ');'
        + 'return p===null?null:getComputedStyle(p).display;}())');
      assert.notEqual(opened, 'none', '点触发键 ⇒ 浮面打开（popover 通路，关着时 UA 给 display:none）');
      for (const width of [320, 390, 620, 1280]) {
        await page.setWidth(width);
        const frame = await page.frame();
        assert.ok(frame.fxScrollW <= frame.fxClientW, width + ' 档：夹具容器不得横向溢出');
        assert.ok(frame.docScrollW <= frame.docClientW + 1,
          width + ' 档：整页不得横向溢出 ' + frame.docScrollW + ' > ' + frame.docClientW);
        for (const skin of SKIN_NAMES) {
          for (const c of list) {
            const scope = '.' + skinClass(skin) + ' [data-case="' + c.name + '"] ';
            const root = await page.read([scope + '.' + RELATION_PICKER_CLASS]);
            assert.equal(root[0].count, 1, width + ' 档 ' + skin + '：找不到本件根');
            assert.ok(root[0].maxScrollW <= root[0].maxClientW + 1,
              width + ' 档 ' + skin + ' ' + c.name + '：根横向溢出 ' + root[0].maxScrollW + ' > ' + root[0].maxClientW);
            assert.equal(root[0].scrollsX, 0, width + ' 档 ' + skin + '：不许出现 overflow-x 滚动容器');
            /* 关键语义零截断：名字／副语／读数／组头／按钮字／脚注。 */
            const texts = await page.read([SLOT('name'), SLOT('note'), SLOT('reading'), SLOT('grp'),
              SLOT('value'), SLOT('foot'), SLOT('result'), SLOT('create'), SLOT('count')]
              .map((slot) => scope + '.' + slot));
            for (const one of texts) {
              assert.equal(one.clipped, 0, width + ' 档 ' + skin + ' ' + c.name + '：' + one.sel
                + ' 有 ' + one.clipped + ' 处被截断');
            }
            /* 几何：命中盒与间距（只量露着的）。 */
            const box = await page.ev('(function(){'
              + 'var root=document.querySelector(' + JSON.stringify(scope + '.' + RELATION_PICKER_CLASS) + ');'
              + 'if(!root) return {none:1};'
              + 'var vis=function(el){var r=el.getBoundingClientRect();'
              + 'return r.width>0&&r.height>0;};'
              + 'var tbs=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + SLOT('box') + ',.' + SLOT('clear')
                + ',.' + SLOT('create') + ',.' + SLOT('change') + ',.' + SLOT('chip')) + ')).filter(vis);'
              + 'var rows=[].slice.call(root.querySelectorAll(' + JSON.stringify('.' + SLOT('row')) + ')).filter(vis);'
              + 'var o={tbMin:1e9,rowMin:1e9,minGap:1e9,vis:[]};'
              + 'for(var i=0;i<tbs.length;i+=1){var r=tbs[i].getBoundingClientRect();'
              + 'var m=Math.min(r.width,r.height);if(m<o.tbMin)o.tbMin=Math.round(m);} '
              + 'for(var j=0;j<rows.length;j+=1){var r2=rows[j].getBoundingClientRect();'
              + 'if(Math.min(r2.width,r2.height)<o.rowMin)o.rowMin=Math.round(Math.min(r2.width,r2.height));'
              + 'o.vis.push([Math.round(r2.left),Math.round(r2.right),Math.round(r2.top),Math.round(r2.bottom)]);}'
              + 'for(var a=0;a<o.vis.length;a+=1){for(var b=a+1;b<o.vis.length;b+=1){'
              + 'var p=o.vis[a],q2=o.vis[b];var sameRow=Math.min(p[3],q2[3])-Math.max(p[2],q2[2])>0;'
              + 'if(sameRow){var g=q2[0]-p[1];if(g>=0&&g<o.minGap)o.minGap=g;}'
              + 'else{var g2=q2[2]-p[3];if(g2>=0&&g2<o.minGap)o.minGap=g2;}}}'
              + 'return o;}())');
            if (box.none === undefined) {
              if (box.tbMin !== 1e9) assert.ok(box.tbMin >= RELATION_PICKER_TOUCH_PX,
                width + ' 档 ' + skin + ' ' + c.name + '：可点元素命中盒不足 ' + String(RELATION_PICKER_TOUCH_PX) + '（' + box.tbMin + '）');
              if (box.rowMin !== 1e9) assert.ok(box.rowMin >= RELATION_PICKER_ROW_MIN_PX,
                width + ' 档 ' + skin + ' ' + c.name + '：整行命中区不足 ' + String(RELATION_PICKER_ROW_MIN_PX) + '（' + box.rowMin + '）');
              if (box.minGap !== 1e9) {
                assert.ok(box.minGap >= RELATION_PICKER_GAP_PX,
                  width + ' 档 ' + skin + ' ' + c.name + '：相邻行间距不足 ' + String(RELATION_PICKER_GAP_PX) + '（' + box.minGap + '）');
              }
            }
          }
        }
      }
      /* 换皮不换结构：四套皮肤容器里的标记逐字节相同。 */
      for (const c of list) {
        for (const width of [390, 1280]) {
          await page.setWidth(width);
          const marks = await page.ev('(function(){var out={};var skins=' + JSON.stringify(SKIN_NAMES) + ';'
            + 'for (var i = 0; i < skins.length; i += 1) {'
            + '  var el = document.querySelector(".ilife-skin-" + skins[i]'
            + ' + " [data-case=' + c.name + '] .' + RELATION_PICKER_CLASS + '");'
            + '  out[skins[i]] = el === null ? "" : el.innerHTML;'
            + '} return out;}())');
          const base = marks[SKIN_NAMES[0]];
          assert.ok(typeof base === 'string' && base.length > 0, width + ' 档：真机上拿不到标记');
          for (const skin of SKIN_NAMES.slice(1)) {
            assert.equal(marks[skin], base, width + ' 档 ' + c.name + '：' + skin + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同');
          }
        }
      }
      /* 三处取值：选中行走次要面、✓ 块走主色实底、触发键走强调软底。 */
      for (const skin of SKIN_NAMES) {
        const vals = SKIN_VALUES[skin];
        const sc = '.' + skinClass(skin) + ' [data-case="inline"] ';
        const colors = await page.ev('(function(){var sc=' + JSON.stringify(sc)
          + ';var row=document.querySelector(sc+' + JSON.stringify('.' + SLOT('row') + '.is-on') + ');'
          + 'var mk=document.querySelector(sc+' + JSON.stringify('.' + SLOT('row') + '.is-on > .' + SLOT('mk')) + ');'
          + 'var box=document.querySelector(sc+' + JSON.stringify('.' + SLOT('box')) + ');'
          + 'var res=document.querySelector(sc+' + JSON.stringify('.' + SLOT('result')) + ');'
          + 'return {rowBg: row===null?null:getComputedStyle(row).backgroundColor,'
          + ' mkBg: mk===null?null:getComputedStyle(mk).backgroundColor,'
          + ' boxBg: box===null?null:getComputedStyle(box).backgroundColor,'
          + ' resFg: res===null?null:getComputedStyle(res).color};}())');
        assert.equal(colors.rowBg, toRgb(vals['surface-2']), skin + '：选中行走次要面');
        assert.equal(colors.mkBg, toRgb(vals.accent), skin + '：✓ 块走主色实底');
        assert.equal(colors.boxBg, toRgb(vals['accent-soft']), skin + '：触发键走强调软底');
        assert.equal(colors.resFg, toRgb(vals['accent-text']), skin + '：结果行走强调文本档');
      }
      /* ⑤ 行为：点一行＝选中（事件 ＋ 字段行原地重写 ＋ 收起）。 */
      await page.setWidth(390);
      const iScope = scope0 + '[data-case="inline-open"] ';
      const st0 = await page.ev('(function(){var scope=' + JSON.stringify(iScope) + ';'
        + 'var root=document.querySelector(scope+' + JSON.stringify('.' + RELATION_PICKER_CLASS) + ');'
        + 'var val=root.querySelector(' + JSON.stringify('.' + SLOT('value')) + ');'
        + 'return {val:val.textContent,ev:window.__ev.slice()};}())');
      assert.equal(st0.val, RELATION_PICKER_TEXT.unpicked, '出发时没选');
      await page.ev('(function(){var row=document.querySelector(' + JSON.stringify(iScope + '.' + SLOT('row')
        + '[' + RELATION_PICKER_ITEM_ATTR + '="jinggui"]') + ');row.click();return true;}())');
      const st1 = await page.ev('(function(){var scope=' + JSON.stringify(iScope) + ';'
        + 'var root=document.querySelector(scope+' + JSON.stringify('.' + RELATION_PICKER_CLASS) + ');'
        + 'var val=root.querySelector(' + JSON.stringify('.' + SLOT('value')) + ');'
        + 'var res=root.querySelector(' + JSON.stringify('.' + SLOT('result')) + ');'
        + 'var inl=root.querySelector(' + JSON.stringify('.' + SLOT('inline')) + ');'
        + 'var on=root.querySelector(' + JSON.stringify('.' + SLOT('row') + '.is-on') + ');'
        + 'return {val:val.textContent,res:res?res.textContent:null,shut:inl.hasAttribute("hidden"),'
        + ' on:on?on.getAttribute(' + JSON.stringify(RELATION_PICKER_ITEM_ATTR) + '):null,'
        + ' ev:window.__ev.slice()};}())');
      assert.equal(st1.val, '卫生间镜柜', '字段行原地重写（两头同值）');
      assert.ok(st1.res !== null && st1.res.includes('卫生间镜柜'), '结果行读的是同一项');
      assert.equal(st1.shut, true, '选完行内块收起');
      assert.equal(st1.on, 'jinggui', '那一行挂上选中态');
      const selEv = st1.ev.filter((e) => e[0] === RELATION_PICKER_EVENT_SELECT).pop();
      assert.ok(selEv, '点一行派发选中事件');
      assert.equal(selEv[1], 'g-inline-open', '事件里带着这是哪一份实例');
      assert.equal(selEv[2], 'jinggui', '事件里带着选了哪一项');
      /* 「换」重新摊开。 */
      await page.ev('document.querySelector(' + JSON.stringify(iScope + '.' + SLOT('change')) + ').click(); true');
      const reopened = await page.ev('(function(){var inl=document.querySelector('
        + JSON.stringify(iScope + '.' + SLOT('inline')) + ');return inl.hasAttribute("hidden");}())');
      assert.equal(reopened, false, '点「换」⇒ 行内块重新摊开');
      /* 新建派发（带当前搜索词）：先打一个词，再点新建。 */
      await page.ev('(function(){var scope=' + JSON.stringify(iScope) + ';'
        + 'var root=document.querySelector(scope+' + JSON.stringify('.' + RELATION_PICKER_CLASS) + ');'
        + 'var q=root.querySelector(' + JSON.stringify('.' + SLOT('q')) + ');'
        + 'q.value="新柜子";q.dispatchEvent(new Event("input",{bubbles:true}));return true;}())');
      await page.ev('document.querySelector(' + JSON.stringify(iScope + '.' + SLOT('create')) + ').click(); true');
      const newEv = (await page.ev('window.__ev.slice()')).filter((e) => e[0] === RELATION_PICKER_EVENT_CREATE).pop();
      assert.ok(newEv, '点新建派发新建事件');
      assert.equal(newEv[6], '新柜子', '事件里带着当前搜索词');
      const qEv = (await page.ev('window.__ev.slice()')).filter((e) => e[0] === RELATION_PICKER_EVENT_QUERY).pop();
      assert.ok(qEv, '输入即筛派发真读数');
      assert.equal(qEv[4], '新柜子', '真读数里带着打的词');
      assert.equal(qEv[5], 0, '搜不到时 hits 为 0');
      /* overlay 下点一行：收起浮面。 */
      await page.ev('(function(){var row=document.querySelector(' + JSON.stringify(scope0 + '[data-case="overlay"] .'
        + SLOT('row') + '[' + RELATION_PICKER_ITEM_ATTR + '="wechat"]') + ');row.click();return true;}())');
      const ovShut = await page.ev('(function(){var p=document.querySelector('
        + JSON.stringify(scope0 + '[data-case="overlay"] .' + SLOT('panel')) + ');'
        + 'return getComputedStyle(p).display;}())');
      assert.equal(ovShut, 'none', 'overlay 下点一行 ⇒ 浮面收起');
      const ovVal = await page.ev('document.querySelector('
        + JSON.stringify(scope0 + '[data-case="overlay"] .' + SLOT('value')) + ').textContent');
      assert.equal(ovVal, '微信', '浮面里选完，字段行也重写');
      /* ⑤ 重复注入只绑一次（文档根上的幂等键）：再跑一遍同一段运行时，事件不许翻倍。 */
      const n0 = (await page.ev('window.__ev.slice()')).length;
      await page.ev(js);
      const runtimeAttr = await page.ev('document.documentElement.getAttribute(' + JSON.stringify(RELATION_PICKER_RUNTIME_ATTR) + ')');
      assert.equal(runtimeAttr, '1', '运行时在文档根上留幂等键');
      const bound = await page.ev('document.querySelector(' + JSON.stringify(iScope + '.' + RELATION_PICKER_CLASS)
        + ').getAttribute(' + JSON.stringify(RELATION_PICKER_BOUND_ATTR) + ')');
      assert.equal(bound, null, '根上不留 bound（bound 记在触发键上）');
      const boundBtn = await page.ev('document.querySelector(' + JSON.stringify(iScope + '.' + SLOT('box'))
        + ').getAttribute(' + JSON.stringify(RELATION_PICKER_BOUND_ATTR) + ')');
      assert.equal(boundBtn, '1', '触发键上留一枚已接管的读数');
      await page.ev('(function(){var row=document.querySelector(' + JSON.stringify(iScope + '.' + SLOT('row')
        + '[' + RELATION_PICKER_ITEM_ATTR + '="xiegui"]') + ');row.click();return true;}())');
      const n1 = (await page.ev('window.__ev.slice()')).length;
      assert.equal(n1 - n0, 1, '重复注入只绑一次：点一次只许派发一枚选中事件');
      assert.deepEqual(await page.ev('window.__errs'), [], '整场不得留下未捕获错误');
      /* 读数落盘：四档 × 本件根／那一行／触发键／结果行。 */
      for (const width of [320, 390, 620, 1280]) {
        await page.setWidth(width);
        const reads = await page.read([RELATION_PICKER_CLASS, SLOT('row'), SLOT('box'), SLOT('result')]
          .map((s) => scope0 + '[data-case="inline-long"] .' + s));
        console.log('READING relation-picker container=' + width + ' '
          + reads.map((r) => r.sel.replace(/.*\.ilife-/, '') + ' scroll=' + r.maxScrollW + '/' + r.maxClientW
            + ' clipped=' + r.clipped + ' visible=' + r.visible).join(' ｜ '));
      }
      await page.ev('window.__ev=[]; true');
    } finally { page.close(); }
  });
});

/* ── ⑥ 分隔符门（仓库唯一那把尺子） ─────────────────────────────────── */

describe('relation-picker ⑥ 分隔符门（`test/separator-probe.mjs` 的 R1–R3，零豁免）', () => {
  it('本件上屏的可见文本零命中（`·`／`；`／并列顿号一个都不许有）', () => {
    const list = [
      ['overlay', renderRelationPicker(OVERLAY)],
      ['overlay 没选', renderRelationPicker({ ...OVERLAY, selectedKey: undefined })],
      ['overlay 初值筛', renderRelationPicker({ ...OVERLAY, query: '招', selectedKey: undefined })],
      ['overlay 一条不中', renderRelationPicker({ ...OVERLAY, query: '没有这一项', selectedKey: undefined })],
      ['overlay 错态与提示', renderRelationPicker({ ...OVERLAY, error: '搜不到时去末行新建一个', hint: '选完记得点存' })],
      ['inline', renderRelationPicker(INLINE)],
      ['inline 没选', renderRelationPicker({ ...INLINE, selectedKey: undefined })],
      ['inline 初值筛', renderRelationPicker({ ...INLINE, query: '镜', selectedKey: undefined })],
    ];
    for (const [name, html] of list) {
      const r = auditHtml(html, name);
      assert.equal(exitCodeFor(r), 0, name + '：可见文本踩了分隔符门——'
        + JSON.stringify(r.node.hits.slice(0, 3))
        + '（修法：记号与文案里不许拿 `·`／`；`／并列顿号当排布手段；调用方自己给的 `note` 不在本门内）');
    }
  });

  it('自证：未选态那枚记号改回 `·` 必红（这一门不是空跑）', () => {
    const dirty = renderRelationPicker(OVERLAY).replace('>' + RELATION_PICKER_TEXT.dot + '<', '>·<');
    const r = auditHtml(dirty, 'dirty');
    assert.ok(r.node.hits.some((h) => h.tags.includes('R1')), '分隔符探针没抓到塞回去的 `·`（这一门空跑了）');
    assert.equal(exitCodeFor(r), 1, '塞回 `·` 却没判红');
  });
});

/* ── ⑧ 命中读数与脚注：一处定义 · 两处同跑（静态那一半） ───────────────── */

describe('relation-picker ⑧ 命中读数与脚注只有一处定义', () => {
  it('产出 JS 里嵌的就是渲染期跑的那两个函数（`toString()` 同一份源码，不是又写一遍）', () => {
    const js = buildRelationPickerJs();
    for (const [name, fn] of [['relationPickerHits', relationPickerHits], ['relationPickerFoot', relationPickerFoot]]) {
      const src = fn.toString();
      assert.ok(src.includes('function'), name + ' 不是函数（判据读错了东西）');
      assert.equal(js.split(src).length - 1, 1,
        name + ' 那段源码在产出 JS 里出现 ' + (js.split(src).length - 1) + ' 次（应为 1 次：两处跑的是同一份）');
    }
  });

  it('浮面贴触发键的两条能力查询：样式段与运行时段读同一个串', () => {
    const css = stripComments(relationPickerCss());
    const js = buildRelationPickerJs();
    const queries = [...css.matchAll(/@supports \(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(queries.length >= 2, '样式段里没有锚定定位那两道能力查询（实际 ' + queries.length + ' 条）');
    for (const one of queries) {
      assert.ok(js.includes(JSON.stringify(one)), '运行时没读同一条能力查询串：' + one);
    }
  });
});

/* ── ⑫ 脚注跟着实际分区走（静态那一半） ─────────────────────────────── */

/** 渲染期脚注里那句话（判据不抄字面量：走本件自己的文案表）。 */
function footTextOf(html) {
  const m = html.match(new RegExp(RELATION_PICKER_FOOT_ATTR + '="[^"]*"[^>]*>([^<]*)<'));
  return m === null ? '' : m[1];
}

/** 渲染期脚注里那个**数**（只有「命中 N 条」那一档有）。 */
function footHitsOf(html) {
  const text = footTextOf(html);
  const pre = RELATION_PICKER_TEXT.footHitPre;
  const post = RELATION_PICKER_TEXT.footHitPost;
  assert.ok(text.startsWith(pre) && text.endsWith(post), '渲染期脚注不是「命中 N 条」那一档：' + text);
  return Number(text.slice(pre.length, text.length - post.length));
}

describe('relation-picker ⑫ 脚注跟着实际分区走', () => {
  it('没有 `recentKeys` 时不说「「最近用过」排最前」（屏上没有那一组）', () => {
    const { recentKeys, ...noRecent } = INLINE;
    const withRecent = footTextOf(renderRelationPicker(INLINE));
    const without = footTextOf(renderRelationPicker(noRecent));
    assert.ok(withRecent.includes(RELATION_PICKER_TEXT.recentGroup), '有这一组时脚注说的才是「最近用过」排最前');
    assert.ok(without.length > 0, '脚注不许空着');
    assert.ok(!without.includes(RELATION_PICKER_TEXT.recentGroup),
      '没有这一组还写「「最近用过」排最前」＝一句屏上兑不出来的空许诺：' + without);
    assert.equal(without, RELATION_PICKER_TEXT.footIdlePlain, '空输入那一档的两句各管一种分区');
  });
});

/* ── 真指针夹具（本件自持：浮面住顶层，必须真改**视口**才量得到） ─────── */

/** 本机浏览器候选（与 `shapes-probe.mjs` 同一套；找不到＝null）。 */
function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

/**
 * 起一页**真指针**夹具。为什么不用现成的 `startShapesPage()`：
 *  · 它只把**夹具容器**改宽（视口写死 `宽＋80`），而浮面住顶层、`position: fixed` —— 量浮面的贴边必须真改**视口**；
 *  · 它没有输入通道，测试件里那些 `el.click()` 是**合成事件**：绕过命中测试（浮面盖住触发键照样绿）。
 *  这一段一律走 CDP 的 `Input.dispatchMouseEvent`（moved／pressed／released）与 `Input.insertText`。
 */
async function startPointerPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const width = opts.width === undefined ? 390 : opts.width;
  const height = opts.height === undefined ? 900 : opts.height;
  const events = [RELATION_PICKER_EVENT_SELECT, RELATION_PICKER_EVENT_CREATE, RELATION_PICKER_EVENT_QUERY];
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>'
    + opts.css + '\nhtml,body{margin:0;padding:0}#ptr{padding:10px 12px}#ptr section{display:block;padding:8px 0}\n'
    + '</style></head>\n<body>\n<div id="ptr" class="ilife-page-ui ' + skinClass(SKIN_NAMES[0]) + '">' + opts.html + '</div>\n'
    + '<script>window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
    + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});</script>\n'
    + '<script>window.__ev=[];' + JSON.stringify(events) + '.forEach(function(n){document.addEventListener(n,function(e){'
    + 'var d=e.detail||{};window.__ev.push({name:n,id:d.id,key:d.key,title:d.title,query:d.query,hits:d.hits,value:d.value});});});</script>\n'
    + '<script>' + buildRelationPickerJs() + '</script>\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-rp-pointer-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-rp-pointer-chrome-'));
  const port = 9720 + (process.pid % 150) + (opts.portOffset === undefined ? 0 : opts.portOffset);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profileDir,
    '--window-size=' + String(width + 40) + ',' + String(height), 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
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
      if (devUrl === null) await new Promise((r) => { setTimeout(r, 250); });
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const ws = new WebSocket(devUrl);
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== undefined && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
      }
    });
    await new Promise((res, rej) => {
      ws.addEventListener('open', () => res());
      ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
    });
    const send = (method, params, sessionId) => new Promise((res, rej) => {
      const id = nextId; nextId += 1;
      pending.set(id, { resolve: res, reject: rej });
      ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 100; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(40); }
    await sleep(300);
    return {
      ev,
      sleep,
      /** 真改**视口**（浮面 `position: fixed`：容器宽那种量法量不到它贴不贴触发键）。 */
      async setViewport(w, h) {
        await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
        await sleep(140);
      },
      /** 真指针序列：moved → pressed → released（**不是** `element.click()`，那会绕过命中测试）。 */
      async pointerClick(sel) {
        const at = await ev('(function(){var el=document.querySelector(' + JSON.stringify(sel) + ');'
          + 'if(!el)return null;el.scrollIntoView({block:"center"});var r=el.getBoundingClientRect();'
          + 'return {x:r.left+r.width/2,y:r.top+r.height/2,cls:el.className};}())');
        assert.ok(at !== null, '真指针点不到：' + sel);
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none', buttons: 0 });
        await sleep(16);
        await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 });
        await sleep(24);
        await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', buttons: 0, clickCount: 1 });
        await sleep(240);
        return at;
      },
      /** 真键入：先真点进那一格（拿真焦点），再 `Input.insertText`。 */
      async pointerType(sel, text) {
        await this.pointerClick(sel);
        await s('Input.insertText', { text });
        await sleep(300);
      },
      /** 关掉页上所有浮面（换档位之间要回到同一个出发状态）。 */
      closePopovers() {
        return ev('[].forEach.call(document.querySelectorAll("[data-ilife-relation-panel]"),'
          + 'function(p){ try{ p.hidePopover(); }catch(e){} });true');
      },
      events: () => ev('window.__ev.slice()'),
      clearEvents: () => ev('window.__ev=[];true'),
      errs: () => ev('window.__errs'),
      close: () => { try { ws.close(); } catch { /* 已关 */ } cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

/* ── ⑦⑧⑨⑩⑪ 真指针：chip 通路 · hits 三处对账 · 贴边四档 · 打字筛最近一排 · 跨实例 ── */

describe('relation-picker ⑦⑧⑨⑩⑪ 真指针 · 真窄视口（headless Chrome ＋ CDP）', () => {
  /** 夹具里的每一份实例（`[data-case]`）。 */
  const CASES = [
    ['ov', renderRelationPicker({ ...OVERLAY, id: 'q-ov' })],
    ['ovq', renderRelationPicker({ ...OVERLAY, id: 'q-ovq', query: '招', selectedKey: undefined })],
    ['inq', renderRelationPicker({ ...INLINE, id: 'q-in', query: '镜', selectedKey: undefined })],
    /* 要真点得到行内那一块：**不能带选中值**（带选中值＝行内那块渲染时就收起）。 */
    ['typ', renderRelationPicker({ ...INLINE, id: 'q-typ', selectedKey: undefined })],
    ['chip', renderRelationPicker({ ...INLINE, id: 'q-chip', selectedKey: undefined })],
    ['norec', renderRelationPicker((() => {
      const { recentKeys, ...rest } = INLINE; return { ...rest, id: 'q-norec', selectedKey: undefined };
    })())],
    ['a', renderRelationPicker({ ...OVERLAY, id: 'q-a' })],
    ['b', renderRelationPicker({ ...OVERLAY, id: 'q-b' })],
  ];
  const AT = (name) => '#ptr [data-case="' + name + '"] ';
  /** 槽类的**选择器**（`relationPickerSlot()` 给的是裸类名：拼选择器要自己带那个点）。 */
  const SEL = (slot) => '.' + SLOT(slot);
  const ROOT = (id) => '[data-ilife-relation-picker="' + id + '"]';
  /** 屏上真露着的项（按机器键去重：同一个选项在屏上有多处摆法）。 */
  const shownKeys = (page, id) => page.ev('(function(){var r=document.querySelector('
    + JSON.stringify(ROOT(id)) + ');var set={};'
    + '[].forEach.call(r.querySelectorAll("[' + RELATION_PICKER_ITEM_ATTR + ']"),function(el){'
    + 'if(!el.hasAttribute("hidden"))set[el.getAttribute("' + RELATION_PICKER_ITEM_ATTR + '")]=1;});'
    + 'return Object.keys(set).sort();}())');
  const snapOf = (page, id) => page.ev('(function(){var r=document.querySelector(' + JSON.stringify(ROOT(id)) + ');'
    + 'var q=function(s){var e=r.querySelector(s);return e===null?null:e.textContent;};'
    + 'var keys=function(s){return [].map.call(r.querySelectorAll(s),function(e){'
    + 'return e.getAttribute("' + RELATION_PICKER_ITEM_ATTR + '");});};'
    + 'var quick=r.querySelector(".' + SLOT('quick') + '");'
    + 'return {value:q(".' + SLOT('value') + '"),state:q(".' + SLOT('state') + '"),result:q(".' + SLOT('result') + '"),'
    + 'foot:q(".' + SLOT('foot') + '"),'
    + 'chosenHidden:r.querySelector(".' + SLOT('chosen') + '")===null?null:'
    + 'r.querySelector(".' + SLOT('chosen') + '").hasAttribute("hidden"),'
    + 'inlineHidden:r.querySelector(".' + SLOT('inline') + '")===null?null:'
    + 'r.querySelector(".' + SLOT('inline') + '").hasAttribute("hidden"),'
    + 'onChips:keys(".' + SLOT('chip') + '.is-on"),onRows:keys(".' + SLOT('row') + '.is-on"),'
    + 'curRows:keys(".' + SLOT('row') + '[aria-current]"),'
    + 'chips:[].map.call(r.querySelectorAll(".' + SLOT('chip') + '"),function(c){return ['
    + 'c.getAttribute("' + RELATION_PICKER_ITEM_ATTR + '"),c.hasAttribute("hidden")];}),'
    + 'quickH:quick===null?null:Math.round(quick.getBoundingClientRect().height),'
    + 'quickHidden:quick===null?null:quick.hasAttribute("hidden"),'
    + 'visRows:r.querySelectorAll(".' + SLOT('row') + ':not([hidden])").length};}())');

  it('真指针走完七条：chip 通路／hits 三处同值／贴边四档不盖触发键／打字筛最近一排／跨实例／脚注跟分区', async (t) => {
    const page = await startPointerPage({
      html: CASES.map(([n, h]) => '<section data-case="' + n + '">' + h + '</section>').join('\n'),
      css: skinCss() + '\n' + relationPickerCss(),
      width: 390, height: 900,
    });
    if (page === null) {
      console.log('READING 真指针判据未跑（本机无 Chrome／Chromium）⇒ 这三条读数需真浏览器：'
        + 'chip 通路／hits 三处对账／贴边四档');
      return t.skip('本机无 Chrome／Chromium：真指针与真窄视口读数需真浏览器');
    }
    try {
      const initEvents = await page.events();
      const initHits = (id) => {
        const one = initEvents.filter((e) => e.name === RELATION_PICKER_EVENT_QUERY && e.id === id)[0];
        return one === undefined ? null : one.hits;
      };

      /* ⑧ 三处同值对账：渲染期脚注里那个数 ／ 载入期事件派发的 hits ／ 屏上真露着的项数。 */
      for (const [name, id, html] of [['overlay 初值筛', 'q-ovq', CASES[1][1]], ['inline 初值筛', 'q-in', CASES[2][1]]]) {
        const render = footHitsOf(html);
        const runtime = initHits(id);
        const shown = (await shownKeys(page, id)).length;
        console.log('READING ⑧ ' + name + ' hits：渲染期=' + render + ' 运行时段=' + runtime + ' 屏上=' + shown);
        assert.equal(runtime, render, name + '：运行时段派发的 `hits` 与渲染期脚注里那个数不同值'
          + '（同一个数只许有一处定义，两处读同一份源码）');
        assert.equal(shown, render, name + '：屏上真露着的项数与那个数不同值（数了两遍／漏数）');
      }

      /* ⑫ 脚注跟着实际分区走（运行时段那一半：载入期它会重写这一句）。 */
      const norec = await snapOf(page, 'q-norec');
      assert.ok(!norec.foot.includes(RELATION_PICKER_TEXT.recentGroup),
        '没有「最近用过」这一组，脚注却还写「「最近用过」排最前」：' + norec.foot);
      assert.equal(norec.chips.length, 0, '没有 `recentKeys` 就不出最近一排');

      /* ⑩ 贴边四档：真指针点触发键，量浮面（不盖触发键／缝在合理区间／不越出视口）。 */
      for (const width of [320, 390, 620, 1280]) {
        await page.setViewport(width, 900);
        await page.closePopovers();
        await page.sleep(90);
        await page.pointerClick(AT('ov') + SEL('box'));
        const g = await page.ev('(function(){var b=document.querySelector(' + JSON.stringify(AT('ov') + SEL('box'))
          + ').getBoundingClientRect();var p=document.querySelector("[data-ilife-relation-panel=\'q-ov\']");'
          + 'var q=p.getBoundingClientRect();return {btn:[b.left,b.top,b.right,b.bottom],'
          + 'panel:[q.left,q.top,q.right,q.bottom],open:p.matches(":popover-open"),'
          + 'view:[document.documentElement.clientWidth,document.documentElement.clientHeight]};}())');
        const below = Math.round(g.panel[1] - g.btn[3]);
        const above = Math.round(g.btn[1] - g.panel[3]);
        const gap = below >= 0 ? below : above;
        console.log('READING ⑩ 贴边 ' + width + ' 档：btn=[' + g.btn.map(Math.round).join(',') + '] panel=['
          + g.panel.map(Math.round).join(',') + '] gapTop=' + below + ' coverTrigger='
          + !(g.panel[3] <= g.btn[1] || g.panel[1] >= g.btn[3]));
        assert.equal(g.open, true, width + ' 档：真指针点触发键 ⇒ 浮面打开');
        assert.ok(g.panel[3] <= g.btn[1] || g.panel[1] >= g.btn[3],
          width + ' 档：浮面盖住了触发键本身（' + JSON.stringify([g.btn, g.panel]) + '）');
        assert.ok(gap >= 0 && gap <= 32, width + ' 档：浮面与触发键那道缝不在合理区间（gap=' + gap + '）');
        assert.ok(g.panel[0] >= -0.5 && g.panel[2] <= g.view[0] + 0.5,
          width + ' 档：浮面越出视口左右（panel=' + JSON.stringify(g.panel) + ' view=' + JSON.stringify(g.view) + '）');
        assert.ok(g.panel[1] >= -0.5 && g.panel[3] <= g.view[1] + 0.5,
          width + ' 档：浮面越出视口上下（panel=' + JSON.stringify(g.panel) + ' view=' + JSON.stringify(g.view) + '）');
        assert.ok(Math.abs(g.panel[0] - g.btn[0]) <= 40,
          width + ' 档：浮面横向没贴着触发键（panel.left=' + Math.round(g.panel[0]) + ' btn.left=' + Math.round(g.btn[0]) + '）');
      }

      /* ⑩b 触发键顶到视口下沿：翻到它上方，照样不盖住它、照样在视口里。 */
      await page.setViewport(390, 700);
      await page.closePopovers();
      await page.ev('document.querySelector(' + JSON.stringify(AT('b') + SEL('box'))
        + ').scrollIntoView({block:"end"});true');
      await page.sleep(140);
      await page.pointerClick(AT('b') + SEL('box'));
      const gb = await page.ev('(function(){var b=document.querySelector(' + JSON.stringify(AT('b') + SEL('box'))
        + ').getBoundingClientRect();var q=document.querySelector("[data-ilife-relation-panel=\'q-b\']").getBoundingClientRect();'
        + 'return {btn:[b.left,b.top,b.right,b.bottom],panel:[q.left,q.top,q.right,q.bottom],'
        + 'view:[document.documentElement.clientWidth,document.documentElement.clientHeight]};}())');
      console.log('READING ⑩b 贴下沿：btn=[' + gb.btn.map(Math.round).join(',') + '] panel=['
        + gb.panel.map(Math.round).join(',') + '] gapAbove=' + Math.round(gb.btn[1] - gb.panel[3]));
      assert.ok(gb.panel[3] <= gb.btn[1] || gb.panel[1] >= gb.btn[3], '贴下沿那一档也盖住了触发键');
      assert.ok(gb.panel[1] >= -0.5 && gb.panel[3] <= gb.view[1] + 0.5, '翻上去之后越出视口上下');
      await page.closePopovers();

      /* ⑪ 打字筛最近一排（B1）：命中一枚 chip ／ 一枚都不中（那条带子要收干净）／清空后回来。 */
      await page.setViewport(390, 900);
      const inq0 = await snapOf(page, 'q-in');
      assert.deepEqual(inq0.chips, [['tiaoliao', true], ['jinggui', false]],
        '渲染期那枚没命中的 chip 要**常渲＋藏着**（不是从标记里删掉：删了清空搜索词就回不来）；'
        + '命中的那一枚不许被筛掉（一打字整排消失＝「最近用过」这条通路白设）');
      await page.clearEvents();
      await page.pointerType(AT('typ') + SEL('q'), '玄关');
      const typed = await snapOf(page, 'q-typ');
      const typedHits = (await page.events()).filter((e) => e.name === RELATION_PICKER_EVENT_QUERY).pop();
      console.log('READING ⑪ 真键入「玄关」：chips=' + JSON.stringify(typed.chips)
        + ' quickH=' + typed.quickH + ' visRows=' + typed.visRows + ' foot=' + typed.foot
        + ' hits=' + (typedHits === undefined ? null : typedHits.hits));
      assert.equal(typed.chips.filter((c) => !c[1]).length, 0, '一枚 chip 都不命中时，两枚都该藏着');
      assert.equal(typed.quickH, 0, '最近一排一枚都不露时，那条带子自己要收干净（不留空带）');
      assert.equal(typed.quickHidden, true, '最近一排一枚都不露时，那条带子挂 hidden');
      assert.equal(typed.visRows, 1, '「玄关」只命中玄关鞋柜一行');
      assert.ok(typed.foot.includes('1'), '脚注跟着真读数走：' + typed.foot);
      assert.equal(typedHits === undefined ? null : typedHits.hits, 1, '派发的 hits 跟着真读数走');
      await page.pointerClick(AT('typ') + SEL('clear'));
      const cleared = await snapOf(page, 'q-typ');
      assert.deepEqual(cleared.chips, [['tiaoliao', false], ['jinggui', false]], '清空搜索词 ⇒ 最近一排两枚都回来');
      assert.ok(cleared.quickH >= RELATION_PICKER_TOUCH_PX, '最近一排回来了，那条带子要有高度（' + cleared.quickH + '）');
      assert.equal(cleared.visRows, 3, '清空搜索词 ⇒ 三行都回来');
      /* 只中一枚 chip 的词：「镜」命中「卫生间镜柜」那一枚 ⇒ 那一枚必须留着（不是整排一起消失）。 */
      await page.clearEvents();
      await page.pointerType(AT('typ') + SEL('q'), '镜');
      const half = await snapOf(page, 'q-typ');
      const halfHits = (await page.events()).filter((e) => e.name === RELATION_PICKER_EVENT_QUERY).pop();
      console.log('READING ⑪ 真键入「镜」（只中一枚 chip）：chips=' + JSON.stringify(half.chips)
        + ' quickH=' + half.quickH + ' visRows=' + half.visRows + ' hits='
        + (halfHits === undefined ? null : halfHits.hits));
      assert.deepEqual(half.chips, [['tiaoliao', true], ['jinggui', false]],
        '命中的那一枚 chip 要留着（整排一起消失＝最近用过这条通路白设）');
      assert.ok(half.quickH >= RELATION_PICKER_TOUCH_PX, '还有一枚露着，那条带子要有高度（' + half.quickH + '）');
      assert.equal(half.visRows, 1, '「镜」只命中卫生间镜柜一行');
      assert.equal(halfHits === undefined ? null : halfHits.hits, 1,
        'chip 与整行是同一个选项的两处摆法：命中数只算一次');
      await page.pointerClick(AT('typ') + SEL('clear'));
      await page.sleep(120);

      /* ⑦ 真指针点「最近用过」那枚 chip：字段行／结果行／状态／选中态／事件读的是同一份事实。 */
      await page.clearEvents();
      const chipAt = await page.pointerClick(AT('chip') + SEL('chip')
        + '[' + RELATION_PICKER_ITEM_ATTR + '="tiaoliao"]');
      const after = await snapOf(page, 'q-chip');
      const selEv = (await page.events()).filter((e) => e.name === RELATION_PICKER_EVENT_SELECT).pop();
      console.log('READING ⑦ chip 通路：click=' + chipAt.cls + ' value=' + JSON.stringify(after.value)
        + ' state=' + JSON.stringify(after.state) + ' result=' + JSON.stringify(after.result)
        + ' onChips=' + JSON.stringify(after.onChips) + ' onRows=' + JSON.stringify(after.onRows)
        + ' ev=' + JSON.stringify(selEv === undefined ? null : [selEv.id, selEv.key, selEv.title]));
      assert.equal(after.value, '厨房调料柜', 'chip 与整行读同一份事实：字段行那一格读到的是这一项的名字（不是空串）');
      assert.equal(after.state, RELATION_PICKER_TEXT.stateLead + RELATION_PICKER_TEXT.picked,
        '字段行的状态跟着换成「已选」（不然「已选的项」旁边还写着「正在选」）');
      assert.ok(after.result.startsWith(RELATION_PICKER_TEXT.chosenPre + ' 厨房调料柜'),
        '结果行写的是同一项：' + after.result);
      assert.deepEqual(after.onChips, ['tiaoliao'], 'chip 自己挂选中态');
      assert.deepEqual(after.onRows, ['tiaoliao'], '**整行同时挂选中态**（不是把 is-on 从行上摘到 chip）');
      assert.deepEqual(after.curRows, ['tiaoliao'], '整行带 aria-current');
      assert.equal(after.chosenHidden, false, '选完收成结果行');
      assert.equal(after.inlineHidden, true, '选完行内那块收起');
      assert.ok(selEv !== undefined, '点 chip 派发选中事件');
      assert.equal(selEv.key, 'tiaoliao', '事件里带着选了哪一项');
      assert.equal(selEv.title, '厨房调料柜', '事件 `detail.title` 不是空串');

      /* ⑨ 跨实例：在 b 里打字／选行，a 一动不动；事件带的是 b 的 id。 */
      await page.clearEvents();
      const before = await snapOf(page, 'q-a');
      await page.pointerClick(AT('b') + SEL('box'));
      await page.pointerType(AT('b') + SEL('q'), '微信');
      const bTyped = await snapOf(page, 'q-b');
      await page.pointerClick(AT('b') + SEL('row') + '[' + RELATION_PICKER_ITEM_ATTR + '="wechat"]');
      const bAfter = await snapOf(page, 'q-b');
      const aAfter = await snapOf(page, 'q-a');
      const bEv = (await page.events()).filter((e) => e.name === RELATION_PICKER_EVENT_QUERY && e.id === 'q-b').pop();
      console.log('READING ⑨ 跨实例：b 打字后 hits=' + (bEv === undefined ? null : bEv.hits)
        + ' b 选中「' + bAfter.value + '」／a 仍是「' + aAfter.value + '」');
      assert.ok(bTyped.foot.includes('1'), 'b 自己的脚注跟着自己的词走：' + bTyped.foot);
      assert.equal(bAfter.value, '微信', 'b 里选完，b 的字段行重写');
      assert.equal(aAfter.value, before.value, 'a 的字段行一动不动（跨实例不许串味）');
      assert.equal(aAfter.foot, before.foot, 'a 的脚注一动不动');
      assert.deepEqual(aAfter.onRows.sort(), before.onRows.sort(), 'a 的选中态一动不动');
      assert.equal(bEv === undefined ? null : bEv.id, 'q-b', '真读数事件带的是 b 的 id');
      assert.deepEqual(await page.errs(), [], '整场不得留下未捕获错误');
    } finally { page.close(); }
  });
});
