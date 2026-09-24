/** command-palette（命令面板 · 形态 A「单栏分组结果（动作在前／页面在后）」）· 契约测试。
 *
 * 覆盖四类判据（工艺书 §6）＋ 皮肤纪律：
 *  ① **渲染契约**：骨架（入口 ＋ 面板 ＋ 两组 ＋ 脚注）／组序（动作在前、页面在后）／
 *     初值筛与命中词与真读数三样同步／三档状态（载入／错态／停用）／转义面／
 *     **全部**非法入参分支（每个都断 `BlocksError`；含**全空白串**九类与**入参表以外的键**）／纯函数（同入参同字节）；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次、
 *     零 `:root`／`!important`／零新 token／零视口宽度查询／零手写 `var(--ilife-…)`／
 *     零把 `ink` 系当面／零键帽语汇／行内两侧格封顶且窄档**不折列**／按压侧标 2px／
 *     `dist/components/command-palette/**` 剥字面量后零 DOM；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；
 *  ④ **两档几何（真机 headless Chrome ＋ CDP）**：视口 390 与 1280 下点开面板 → 零横向溢出、
 *     每一枚可点元素（入口／✕／输入框／**整行**）≥44×44、相邻两行之间 ≥8px、脚注真读数；
 *     另有三组真机读数：**不给来源技能片**的行排两列（主文字吃剩余宽、行右格贴右缘）、
 *     **极端长 `skill`／`go`** 不许把主文字那一列挤到 0、**注入两遍**幂等（bound 读数 ＋ 事件不翻倍）；
 *     一组**容器隔离读数**（视口恒 1440，把面板放进 390／1280 定宽舞台）证明窄档落位
 *     是 `@container` 判的、不是视口判的；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **皮肤纪律**：同一份入参渲染三次逐字节相同、标记不带皮肤类，真机上四套皮肤里的
 *     `panel.innerHTML` 逐字节相同（换皮不换结构）。
 *
 * 期望值一律从组件自己的常量派生（`COMMAND_PALETTE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMMAND_PALETTE_ATTR,
  COMMAND_PALETTE_CLASS,
  COMMAND_PALETTE_CONTAINER,
  COMMAND_PALETTE_EDGE_PX,
  COMMAND_PALETTE_EVENT_QUERY,
  COMMAND_PALETTE_EVENT_RUN,
  COMMAND_PALETTE_FORMS,
  COMMAND_PALETTE_GAP_PX,
  COMMAND_PALETTE_HOVER_QUERY,
  COMMAND_PALETTE_ITEM_ATTR,
  COMMAND_PALETTE_KINDS,
  COMMAND_PALETTE_NARROW_PX,
  COMMAND_PALETTE_PANEL_ATTR,
  COMMAND_PALETTE_PANEL_MAX_PX,
  COMMAND_PALETTE_QUERY_ATTR,
  COMMAND_PALETTE_ROW_MIN_PX,
  COMMAND_PALETTE_SLOTS,
  COMMAND_PALETTE_TEXT,
  COMMAND_PALETTE_TOUCH_PX,
  buildCommandPaletteJs,
  commandPaletteCss,
  commandPaletteSlot,
  renderCommandPalette,
} from '../dist/components/command-palette/index.js';
import { renderScaleBar } from '../dist/components/scale-bar/index.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';
import { selectorsOf, startBrowser, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { styleSource } from './_style-sources.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'command-palette');
const SLOT = (s) => commandPaletteSlot(s);
/** 皮肤取值表（期望色**从表里读**，判据里不抄色字面量）。 */
const SKIN_VALUES = Object.fromEntries(SKIN_NAMES.map((s) => [s, SKINS[s].values]));
/** 取值表里的 `#rrggbb` → 浏览器 `getComputedStyle` 报出来的 `rgb(r, g, b)` 串。 */
const toRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return 'rgb(' + [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(', ') + ')';
};
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;
/** 一行的标签正则以「类名 ＋ 边界」收尾：`…-row` 是 `…-rows`（行容器）的前缀，裸串会把容器也数进来。 */
const ROW_TAG = 'class="[^"]*' + commandPaletteSlot('row') + '[" ]';
/** 现在**露着**的行（渲染期那一份 `hidden` 就是「露不露」的唯一事实）。 */
const visibleIds = (html) => [...html.matchAll(new RegExp(ROW_TAG + '[^>]*data-ilife-command-palette-item="([^"]+)"[^>]*', 'g'))]
  .filter((m) => !m[0].includes(' hidden')).map((m) => m[1]);

/* ── 一份真实形状的入参（六个技能混在一条面板里：动作三条、页面三条） ────── */

const REAL = {
  id: 'cmdk-main',
  items: [
    { id: 'log-weight', kind: 'action', label: '记体重', note: '上次 68.4 kg（09-24）', skill: '卡路里', primary: true },
    { id: 'see-weight', kind: 'action', label: '看体重曲线', note: '最近 30 天，18 个点', skill: '卡路里', go: '打开' },
    { id: 'log-meal', kind: 'action', label: '记一餐', note: '写进今天', skill: '卡路里' },
    { id: 'page-sleep', kind: 'page', label: '今日作息', note: '今天，已记 6 条', skill: '作息' },
    { id: 'page-notes', kind: 'page', label: '笔记里搜体重', note: '全部笔记，命中 4 条', skill: '备忘' },
    { id: 'page-shop', kind: 'page', label: '买菜清单', note: '本周 3 样', skill: '私家大厨' },
  ],
};

/** 混排：**有片与不给片**两种行各两条（不给片的那一行几何上是最容易塌的，见契约第 13 条）。 */
const MIXED = {
  id: 'cmdk-main',
  items: [
    { id: 'with-sk', kind: 'action', label: '看体重曲线', note: '最近 30 天', skill: '卡路里' },
    { id: 'no-sk', kind: 'action', label: '看体重曲线', note: '最近 30 天' },
    { id: 'no-sk-long', kind: 'action', label: '把这一条很长的命令名整句读完再看下一行', note: '没有来源技能片的那一行' },
    { id: 'no-sk-short', kind: 'action', label: '记一餐' },
  ],
};

/** 极端长串：200 字的 `skill` 与 200 字的 `go`（两侧格封顶之前会把主文字那一列挤到 0）。 */
const HUGE = {
  id: 'cmdk-main',
  items: [
    { id: 'long-skill', kind: 'action', label: '看体重曲线', note: '最近 30 天', skill: '长'.repeat(200) },
    { id: 'long-go', kind: 'action', label: '看体重曲线', note: '最近 30 天', skill: '卡路里', go: '打开'.repeat(100) },
  ],
};

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('command-palette ① 渲染契约 · 骨架与组序', () => {
  const html = renderCommandPalette(REAL);

  it('入口是**看得见、点得到**的一枚按钮：`popovertarget` 指着面板，零脚本也开得出来', () => {
    assert.match(html, new RegExp('^<div class="' + COMMAND_PALETTE_CLASS + ' is-A"'));
    assert.ok(html.includes(COMMAND_PALETTE_ATTR + '="cmdk-main"'), '根上要有本件的发现锚');
    const open = html.slice(html.indexOf(SLOT('open')), html.indexOf(SLOT('hint')));
    assert.ok(open.includes('popovertarget="cmdk-main"'), '入口键要带 popovertarget（开合不靠脚本）');
    assert.ok(open.includes('aria-haspopup="dialog"'), '入口键要说清它开出来的是什么');
    assert.ok(open.includes('aria-expanded="false"'), '收起态是 false，运行时段再同步');
    assert.ok(open.includes(COMMAND_PALETTE_TEXT.entry), '缺省的字就是原型那一句');
    assert.ok(html.includes(SLOT('hint')) && html.includes(COMMAND_PALETTE_TEXT.hint), '入口旁那行提示');
  });

  it('面板：原生 `popover` ＋ `role="dialog"` ＋ 无障碍名；输入行里一枚 44 的关掉键', () => {
    const panel = html.slice(html.indexOf(SLOT('panel')), html.indexOf(SLOT('grp')));
    assert.ok(panel.includes('popover="auto"'), '面板是原生 popover：点面板外关掉是浏览器给的');
    assert.ok(panel.includes('role="dialog"'), '面板的语义角色');
    assert.ok(panel.includes('id="cmdk-main"') && panel.includes(COMMAND_PALETTE_PANEL_ATTR + '="cmdk-main"'));
    assert.ok(panel.includes('aria-label="' + COMMAND_PALETTE_TEXT.entry + '"'), '不给 label 就用入口键上的字');
    assert.ok(panel.includes(COMMAND_PALETTE_QUERY_ATTR + '="cmdk-main"'), '输入框带本件的锚');
    assert.ok(panel.includes('aria-label="' + COMMAND_PALETTE_TEXT.query + '"'), '输入框有无障碍名');
    const close = panel.slice(panel.indexOf(SLOT('x')), panel.indexOf(SLOT('grp')));
    assert.ok(close.includes('popovertargetaction="hide"'), '关掉键是浏览器给的 hide，不靠脚本');
    assert.ok(close.includes('aria-label="' + COMMAND_PALETTE_TEXT.close + '"'), '关掉键有无障碍名');
    assert.ok(close.includes('✕'), '键上画的是那枚 ✕');
  });

  it('**两组的分界就是形态本身**：动作在前（就地做）、页面在后（跳走），各带一句说明', () => {
    assert.deepEqual([...COMMAND_PALETTE_FORMS], ['A']);
    assert.deepEqual([...COMMAND_PALETTE_KINDS], ['action', 'page'], '闭集顺序＝屏上顺序');
    assert.equal(countOf(html, 'class="[^"]*' + SLOT('grp') + '"'), 2, '两组各一枚标题');
    assert.equal(countOf(html, COMMAND_PALETTE_GRP('action')), 1);
    assert.equal(countOf(html, COMMAND_PALETTE_GRP('page')), 1);
    assert.ok(html.indexOf(SLOT('grp') + '" data-ilife-command-palette-group="action"')
      < html.indexOf(SLOT('grp') + '" data-ilife-command-palette-group="page"'), '动作组必须排在页面组前面');
    const kinds = [...html.matchAll(new RegExp('-row[^"]*" ' + COMMAND_PALETTE_ITEM_ATTR
      + '="[^"]+" data-ilife-command-palette-kind="(action|page)"', 'g'))].map((m) => m[1]);
    assert.deepEqual(kinds, ['action', 'action', 'action', 'page', 'page', 'page'],
      '行的屏上顺序＝动作组 ＋ 页面组（组内保持调用方给的次序）');
    assert.ok(html.includes(COMMAND_PALETTE_TEXT.actionNote) && html.includes(COMMAND_PALETTE_TEXT.pageNote),
      '两组各带一句说明（读者不用猜这一组是就地做还是跳走）');
  });

  it('一行＝**面板里唯一那颗按钮**：来源技能片 ＋ 主文字 ＋ 副文字 ＋ 行右那格；没有第二颗按钮', () => {
    assert.equal(countOf(html, 'data-ilife-command-palette-item="'), REAL.items.length);
    for (const one of REAL.items) {
      assert.ok(html.includes(COMMAND_PALETTE_ITEM_ATTR + '="' + one.id + '"'), '缺行：' + one.id);
      assert.ok(html.includes('>' + one.label + '<') || html.includes(one.label), '主文字上屏：' + one.label);
    }
    assert.equal(countOf(html, '<button'), REAL.items.length + 2, '入口键 ＋ 关掉键 ＋ 每行一颗，不许再多');
    assert.equal(countOf(html, '<button'), countOf(html, '</button>'), '按钮必须成对');
    assert.equal(countOf(html, 'class="[^"]*' + SLOT('act') + '"'), REAL.items.length, '每行都写明要干什么');
    assert.ok(html.includes('>' + COMMAND_PALETTE_TEXT.actAction + '<'), '动作行默认写「执行」');
    assert.ok(html.includes('>' + COMMAND_PALETTE_TEXT.actPage + '<'), '页面行默认写「打开」');
    assert.equal(countOf(html, SLOT('sk')), 6, '六行都有来源技能');
    assert.equal(countOf(html, SLOT('nt')), 6, '六行都有副文字');
    assert.equal(html.includes('tabindex'), false, '表里不许自己做 Tab 序（点得到才算数）');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
  });

  it('整行带可搜底串（主文字 ＋ 副文字 ＋ 来源技能 ＋ 别名）；脚注与空态配好', () => {
    assert.ok(html.includes('data-ilife-command-palette-search="记体重 上次 68.4 kg（09-24） 卡路里"'),
      '可搜底串＝上屏的字，小写');
    const foot = html.slice(html.indexOf(SLOT('foot')));
    assert.ok(foot.includes(COMMAND_PALETTE_TEXT.footIdle), '空输入时脚注说的是「列的是常用去处」');
    assert.ok(html.includes(SLOT('empty')) && html.includes('hidden'), '没命中之前空态不上屏');
    assert.ok(!/等您按|按 ⌘|快捷键/.test(html), '零键帽语汇：不许出现「按某个键才怎样」这路话');
  });

  it('单档输入只出一枚组标题（另一组一条都没有就整组不出，不留空标题）', () => {
    const only = renderCommandPalette({ id: 'cmdk-one', items: [{ id: 'a-one', kind: 'action', label: '记体重' }] });
    assert.equal(countOf(only, 'class="[^"]*' + SLOT('grp') + '"'), 1, '只有动作档 ⇒ 只出一枚「动作」标题');
    assert.equal(countOf(only, COMMAND_PALETTE_GRP('action')), 1);
    assert.equal(countOf(only, 'data-ilife-command-palette-group="page"'), 0, '页面那一组一条都没有，标题也不出');
    const onlyPage = renderCommandPalette({ id: 'cmdk-two', items: [{ id: 'p-one', kind: 'page', label: '今日作息' }] });
    assert.equal(countOf(onlyPage, COMMAND_PALETTE_GRP('page')), 1, '只有页面档 ⇒ 只出一枚「页面」标题');
    assert.equal(countOf(onlyPage, 'data-ilife-command-palette-group="action"'), 0);
    assert.ok(onlyPage.includes('>' + COMMAND_PALETTE_TEXT.actPage + '<'), '页面行缺省仍写「打开」');
  });

  it('缺省与附加类名逐条落进标记：`label` 缺省＝`entry`、`extraClass` 落根 class', () => {
    const named = renderCommandPalette({
      id: 'cmdk-entry-name', entry: '去哪儿', extraClass: 'ok-class other',
      items: [{ id: 'a-one', kind: 'action', label: 'a' }],
    });
    assert.ok(named.includes('aria-label="去哪儿"'), '不给 label 就用入口键上的字（不是缺省那句）');
    assert.ok(named.includes('>去哪儿<'), '入口键上是调用方给的那一句');
    assert.match(named, new RegExp('^<div class="' + COMMAND_PALETTE_CLASS + ' is-A ok-class other"'),
      '附加类名要落进根 class（过完类名正则之后再拼）');
    assert.ok(named.includes('id="cmdk-entry-name"') && named.includes('popovertarget="cmdk-entry-name"'),
      'id 三处同一份（面板 id／锚／popovertarget）');
  });
});

/** 分组标题的「按档取」查找串（判据不另抄一份字面量）。 */
function COMMAND_PALETTE_GRP(kind) {
  return 'class="[^"]*' + SLOT('grp') + '" data-ilife-command-palette-group="' + kind + '"';
}

describe('command-palette ① 渲染契约 · 输入即筛的三样同步', () => {
  it('初值筛：不匹配的行带 `hidden`、整组被筛空时标题也收起来、脚注写**真数**', () => {
    const html = renderCommandPalette({ ...REAL, query: '体重' });
    assert.deepEqual(visibleIds(html), ['log-weight', 'see-weight', 'page-notes'], '命中三行：两条动作、一条页面');
    assert.equal(countOf(html, 'data-ilife-command-palette-hit="1"'), 3, '三条命中各标出一处');
    assert.ok(html.includes('>' + COMMAND_PALETTE_TEXT.footHitPre + '3' + COMMAND_PALETTE_TEXT.footHitPost + '<'),
      '脚注是算出来的真数');
    assert.equal(countOf(html, COMMAND_PALETTE_GRP('action')) + countOf(html, COMMAND_PALETTE_GRP('page')), 2);
    const skinned = renderCommandPalette({ ...REAL, query: '买菜' });
    assert.deepEqual(visibleIds(skinned), ['page-shop'], '只命中页面组那一行');
    assert.ok(new RegExp(COMMAND_PALETTE_GRP('action') + ' hidden').test(skinned), '动作组标题要收起来（一行不剩）');
    assert.equal(new RegExp(COMMAND_PALETTE_GRP('page') + ' hidden').test(skinned), false, '页面组标题露着');
  });

  it('一条都没中：所有行与两枚标题都收起来，空态出来（句子里夹着用户打的词），脚注换词', () => {
    const html = renderCommandPalette({ ...REAL, query: 'zzz' });
    assert.equal(visibleIds(html).length, 0, '一行都不露');
    assert.equal(countOf(html, 'data-ilife-command-palette-hit="1"'), 0, '不命中就不标词');
    assert.equal(countOf(html, ROW_TAG), 6, '六行都还在 DOM 里（只翻 hidden，不删节点）');
    assert.equal(countOf(html, ' hidden'), 8, '六行 ＋ 两枚标题被收起来');
    assert.ok(html.includes(COMMAND_PALETTE_TEXT.emptyPre + 'zzz' + COMMAND_PALETTE_TEXT.emptyPost), '空态把词念出来');
    assert.ok(html.includes(COMMAND_PALETTE_TEXT.footNone), '脚注换成「换个短一点的词试试」');
    const empty = html.slice(html.indexOf(SLOT('empty')), html.indexOf(SLOT('foot')));
    assert.ok(empty.includes('role="status"'), '空态是活的（换词时屏读器会念）');
  });

  it('大小写不敏感，且别名（`keywords`）与来源技能都算命中', () => {
    const withAlias = renderCommandPalette({
      id: 'cmdk-x',
      items: [{ id: 'a-one', kind: 'action', label: 'Log Weight', keywords: '记体重 tizhong', skill: '卡路里' }],
    });
    assert.deepEqual(visibleIds(withAlias), ['a-one'], '不给 query 时全都露着');
    const byAlias = renderCommandPalette({
      id: 'cmdk-x',
      items: [{ id: 'a-one', kind: 'action', label: 'Log Weight', keywords: '记体重 tizhong' }],
      query: 'TIZHONG',
    });
    assert.deepEqual(visibleIds(byAlias), ['a-one'], '别名命中 ⇒ 这一行露着');
    const bySkill = renderCommandPalette({
      id: 'cmdk-x', items: [{ id: 'a-one', kind: 'action', label: 'Log Weight', skill: '卡路里' }], query: '卡路里',
    });
    assert.deepEqual(visibleIds(bySkill), ['a-one'], '来源技能也进可搜底串');
    const upper = renderCommandPalette({
      id: 'cmdk-x', items: [{ id: 'a-one', kind: 'action', label: 'Log Weight' }], query: 'weight',
    });
    assert.equal(countOf(upper, 'data-ilife-command-palette-hit="1"'), 1, '大小写不敏感：小写词标到大写文字上');
    assert.ok(upper.includes('>Log <mark class="' + SLOT('hit') + '" data-ilife-command-palette-hit="1">Weight</mark>'),
      '命中词逐处标出来（槽类名与锚两样都写）');
  });

  it('命中词**逐处**标出来：同一行里出现两次就标两个 `<mark>`（不是只标第一处）', () => {
    const twice = renderCommandPalette({
      id: 'cmdk-twice', query: '体重',
      items: [{ id: 'a-one', kind: 'action', label: '体重记体重' }],
    });
    assert.deepEqual(visibleIds(twice), ['a-one']);
    assert.equal(countOf(twice, 'data-ilife-command-palette-hit="1"'), 2, '两处都要标：' + twice);
    assert.ok(twice.includes('<mark class="' + SLOT('hit') + '" data-ilife-command-palette-hit="1">体重</mark>记'
      + '<mark class="' + SLOT('hit') + '" data-ilife-command-palette-hit="1">体重</mark>'),
      '标记落在两处原文上，中间那截原样留着');
    const none = renderCommandPalette({ id: 'cmdk-twice', query: '体重', items: [{ id: 'a-one', kind: 'action', label: '今日作息' }] });
    assert.equal(countOf(none, 'data-ilife-command-palette-hit="1"'), 0, '不命中就不标词（不整行染色）');
  });

  it('`query` 的首尾空白（含全角空格 U+3000）两侧同口径：渲染期那次筛说同一件事', () => {
    const bare = renderCommandPalette({ ...REAL, query: '体重' });
    for (const padded of [' 体重', '体重 ', '  体重  ', '\u3000体重\u3000', '\u3000 体重 \u3000']) {
      const one = renderCommandPalette({ ...REAL, query: padded });
      assert.equal(one, bare, '首尾空白要 trim 掉（「' + padded + '」与前后的读数字节应当相同）');
    }
    assert.equal(renderCommandPalette({ ...REAL, query: '   ' }), renderCommandPalette(REAL),
      '只有空白 ⇒ 按未给算（搜索词不是上屏的字，README「入参纪律」那条例外）');
    assert.ok(renderCommandPalette({ ...REAL, query: '\u3000' }).includes(COMMAND_PALETTE_TEXT.footIdle),
      '只有全角空格时脚注仍是「列的是常用去处」');
  });

  it('三档状态：载入（原地换字）／错态（写在控件旁边）／停用（说得清为什么）', () => {
    const busy = renderCommandPalette({ ...REAL, loading: true });
    assert.ok(busy.includes('aria-busy="true"') && busy.includes('data-ilife-command-palette-loading="1"'));
    assert.ok(busy.includes(COMMAND_PALETTE_TEXT.footBusy), '载入时脚注原地换字');
    assert.equal(countOf(busy, '<button'), REAL.items.length + 2, '载入档不动行');
    const bad = renderCommandPalette({ ...REAL, error: '搜索服务连不上，先把下面几条当常用去处看。' });
    assert.ok(bad.includes(SLOT('err')) && bad.includes('role="alert"'), '错态要出在输入框旁边');
    assert.ok(bad.includes('aria-describedby="cmdk-main-err"'), '输入框要指到那句错');
    assert.ok(bad.includes('aria-invalid="true"'), '不只染色：还要落 aria-invalid');
    const off = renderCommandPalette({
      id: 'cmdk-off',
      items: [{ id: 'a-one', kind: 'action', label: '记体重', skill: '卡路里', disabled: true, why: '这条今天记过了' }],
    });
    assert.ok(off.includes(' disabled'), '停用那一行点不动');
    assert.ok(off.includes(COMMAND_PALETTE_TEXT.offPrefix + '这条今天记过了'), '停用要说得清为什么');
    assert.ok(off.includes('>' + COMMAND_PALETTE_TEXT.off + '<'), '行右那格换字');
    assert.ok(off.includes('is-off'), '样式按这一档分（cursor: not-allowed 见样式段）');
  });

  it('转义面：入口／提示／无障碍名／错态／初值／主文字／副文字／来源技能逐位转义', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderCommandPalette({
      id: 'cmdk-evil',
      entry: evil, hint: evil, label: evil, error: evil, query: evil,
      items: [{ id: 'a-one', kind: 'action', label: evil, note: evil, skill: evil, go: evil, keywords: evil }],
    });
    assert.equal(/<script/i.test(html), false, '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '原文以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.equal(countOf(html, '<button'), 3, '转义之后按钮还是那些（入口／关掉／一行）');
  });

  it('入参违规一律拒（不静默降级）：逐条断 `BlocksError`', () => {
    assert.deepEqual([...COMMAND_PALETTE_FORMS], ['A'], '本件只落地形态 A');
    const ok = { id: 'cmdk-ok', items: [{ id: 'a-one', kind: 'action', label: '记体重' }] };
    assert.equal(throwsBlocks(() => renderCommandPalette(undefined)), true, '非对象');
    assert.equal(throwsBlocks(() => renderCommandPalette(null)), true);
    assert.equal(throwsBlocks(() => renderCommandPalette([])), true, '数组不是入参');
    assert.equal(throwsBlocks(() => renderCommandPalette('x')), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ items: ok.items })), true, '缺 id');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, id: '' })), true, '空 id');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, id: 7 })), true, 'id 不是串');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, id: 'a b' })), true, 'id 里有空格');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, id: '面板一' })), true, 'id 里有非标识符字符');
    assert.equal(throwsBlocks(() => renderCommandPalette({ id: 'cmdk-ok' })), true, '缺 items');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [] })), true, '一条都没有');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: 'x' })), true, 'items 不是数组');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [null] })), true, '元素不是对象');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ kind: 'action', label: 'a' }] })), true, '缺行 id');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'x y', kind: 'action', label: 'a' }] })), true,
      '行 id 里有空格');
    assert.equal(throwsBlocks(() => renderCommandPalette({
      ...ok, items: [{ id: 'same', kind: 'action', label: 'a' }, { id: 'same', kind: 'page', label: 'b' }],
    })), true, '行 id 面板内唯一');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', label: 'a' }] })), true, '缺 kind');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'jump', label: 'a' }] })), true,
      'kind 闭集外');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action' }] })), true, '缺主文字');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: '' }] })), true,
      '空主文字');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', note: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', skill: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', go: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', keywords: 1 }] })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', disabled: 'yes' }] })), true,
      'disabled 不是布尔');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', disabled: true }] })), true,
      '停用没给原因');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, items: [{ id: 'a', kind: 'action', label: 'a', primary: 'x' }] })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, form: 'B' })), true, '形态闭集外');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, entry: 1 })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, hint: 1 })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, label: 1 })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, query: 1 })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, error: 1 })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, loading: 'x' })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, extraClass: 'a"b' })), true);
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, extraClass: 'ok-class other' })), false, '合法附加类名照收');
  });

  it('**全空白串＝拒**（九类上屏文本）：`\'   \'` 会在屏上留一块空白，一律 `BlocksError`', () => {
    const ok = { id: 'cmdk-ok', items: [{ id: 'a-one', kind: 'action', label: '记体重' }] };
    /** 一处一处点名：每一类都写出「收下会变成什么」，免得日后有人把它当「宽松一点也没事」。 */
    const blanks = [
      ['行主文字（收下 ⇒ 空壳行）', { items: [{ id: 'a-one', kind: 'action', label: '   ' }] }],
      ['入口键上的字（收下 ⇒ 无字入口键）', { entry: '   ' }],
      ['停用原因（收下 ⇒ 「不可用：   」，说不清为什么）', { items: [{ id: 'a-one', kind: 'action', label: '记体重', disabled: true, why: '   ' }] }],
      ['错态那句（收下 ⇒ `aria-invalid` 指着一个空句子）', { error: '   ' }],
      ['行右那格的字（收下 ⇒ 一格空白）', { items: [{ id: 'a-one', kind: 'action', label: '记体重', go: '   ' }] }],
      ['副文字', { items: [{ id: 'a-one', kind: 'action', label: '记体重', note: '   ' }] }],
      ['来源技能片', { items: [{ id: 'a-one', kind: 'action', label: '记体重', skill: '   ' }] }],
      ['别名', { items: [{ id: 'a-one', kind: 'action', label: '记体重', keywords: '   ' }] }],
      ['入口旁那行提示', { hint: '   ' }],
    ];
    for (const [what, patch] of blanks) {
      for (const blank of ['   ', '\t', '\u3000', ' \u3000 ']) {
        assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, ...patch })), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
    /* 空串＝未给：这一条与全层 `optText` 同口径，**不是**上面那条的例外。 */
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, entry: '' })), false, '空串＝未给（用缺省那句）');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, hint: '' })), false);
    const blankHint = renderCommandPalette({ ...ok, hint: '' });
    assert.ok(blankHint.includes(COMMAND_PALETTE_TEXT.hint), '空串的 hint 用的是缺省那句');
    /* 搜索词那一处**例外**：不上屏的字，只有空白＝未给（见 README「入参纪律」）。 */
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, query: '   ' })), false, 'query 只有空白＝未给');
    assert.equal(renderCommandPalette({ ...ok, query: '   ' }), renderCommandPalette(ok), 'query 只有空白与「不给」同一份字节');
  });

  it('**入参表以外的键＝拒**（顶层与行内两处）：写错一个键名不许静默吞掉', () => {
    const ok = { id: 'cmdk-ok', items: [{ id: 'a-one', kind: 'action', label: '记体重', note: '写进今天' }] };
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, bogus: 1 })), true, '顶层多给一个键');
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, notes: '打错名' })), true, '顶层写错键名（notes）');
    assert.equal(throwsBlocks(() => renderCommandPalette({
      ...ok, items: [{ ...ok.items[0], bogus: 1 }],
    })), true, '行内多给一个键');
    assert.equal(throwsBlocks(() => renderCommandPalette({
      ...ok, items: [{ ...ok.items[0], notes: '打错名' }],
    })), true, '行内写错键名（notes）');
    /* 入参表里的键给了 `undefined` 不算「多给」（调用方拼对象时常见）。 */
    assert.equal(throwsBlocks(() => renderCommandPalette({ ...ok, query: undefined, error: undefined, loading: undefined })), false,
      '入参表里的键给 undefined 按未给算');
  });

  it('纯函数：同样的入参恒产同样的字节；缺省那几档也对', () => {
    assert.equal(renderCommandPalette(REAL), renderCommandPalette(REAL));
    const bare = renderCommandPalette({ id: 'cmdk-bare', items: [{ id: 'a-one', kind: 'page', label: '今日作息' }] });
    assert.ok(bare.includes('>' + COMMAND_PALETTE_TEXT.actPage + '<'), '页面行缺省写「打开」');
    assert.equal(bare.includes(SLOT('sk')), false, '没给来源技能就不出那枚片');
    assert.equal(bare.includes(SLOT('nt')), false, '没给副文字就不出那一行');
    assert.ok(bare.includes(COMMAND_PALETTE_TEXT.entry), '入口键缺省那句');
    const named = renderCommandPalette({
      id: 'cmdk-named', label: '去别处', entry: '去哪儿', hint: '点它就行。',
      items: [{ id: 'a-one', kind: 'action', label: 'a' }],
    });
    assert.ok(named.includes('aria-label="去别处"') && named.includes('>去哪儿<') && named.includes('点它就行。'));
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('command-palette ② 样式与零 DOM 纪律', () => {
  const css = commandPaletteCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且**只出现一次**', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = selectorsOf(clean);
    assert.ok(selectors.length >= 30, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        assert.ok(one.includes(COMMAND_PALETTE_CLASS), '选择器必须只碰本件类名根：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／必带 `@container` 且自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/'@media \((?:max|min)-width/.test(css), false, '本件不判视口宽度（件宽 ≠ 视口宽）');
    assert.ok(clean.includes('@container ' + COMMAND_PALETTE_CONTAINER + ' (max-width:'), '窄档必须由容器判');
    assert.ok(clean.includes('container: ' + COMMAND_PALETTE_CONTAINER + ' / inline-size'),
      '写了 @container 就必须自己声明容器（否则永不生效）');
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.ok(clean.includes('@media ' + COMMAND_PALETTE_HOVER_QUERY), '悬停增强读的是常量里的能力查询串');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
    assert.equal(clean.includes('transitionend'), false, '状态不许依赖 transitionend');
  });

  it('几何事实写在一处：44／48／8／窄档断点／面板宽上限都取常量', () => {
    assert.equal(COMMAND_PALETTE_TOUCH_PX, 44);
    assert.ok(COMMAND_PALETTE_ROW_MIN_PX >= COMMAND_PALETTE_TOUCH_PX, '行高不得低于触控地板');
    assert.equal(COMMAND_PALETTE_GAP_PX, 8);
    assert.ok(clean.includes('min-height: ' + String(COMMAND_PALETTE_ROW_MIN_PX) + 'px'), '行高取常量');
    assert.ok(clean.includes('min-height: ' + String(COMMAND_PALETTE_TOUCH_PX) + 'px'), '命中盒取常量');
    assert.ok(clean.includes('gap: ' + String(COMMAND_PALETTE_GAP_PX) + 'px'), '行间那道缝取常量');
    assert.ok(clean.includes('max-width: ' + String(COMMAND_PALETTE_NARROW_PX) + 'px'), '窄档断点取常量');
    assert.equal(clean.includes('text-overflow'), false, '不许出现 `…` 截断手段');
    assert.equal(clean.includes('overflow-x'), false, '不许藏横滑');
    assert.equal(clean.includes('cursor: not-allowed'), true, '停用那一档要说得出点不动');
  });

  it('行内落位：两侧格各自封顶、不给来源技能片的那一行排两列、窄档**不折列**', () => {
    /* 封顶：两侧格各自的 `max-width`（不封顶时那两条 `auto` 轨会把主文字挤到 0）。 */
    assert.equal(countOf(clean, 'max-width: 8em'), 2, '来源技能片与行右那格各自封顶一处');
    /* 不给片的那一行：`:not(:has(…-sk))` 收成两列。 */
    assert.ok(new RegExp(SLOT('row') + ':not\\(:has\\(\\.' + SLOT('sk') + '\\)\\)\\s*\\{[^}]*grid-template-columns: minmax\\(0, 1fr\\) auto').test(clean),
      '不给来源技能片的那一行必须收成两列（否则主文字落到那条只剩几十像素的 `auto` 轨上）');
    /* 窄档：**列一道也不折**——原型 `:133-134` 明写窄档仍留三列，落地不许再出现折行那两行写法。 */
    assert.equal(clean.includes('grid-column: 1 / -1'), false, '窄档折列那两行写法必须删掉（原型明确否掉）');
    const narrow = clean.slice(clean.indexOf('@container ' + COMMAND_PALETTE_CONTAINER));
    assert.equal(narrow.includes('grid-template-columns'), false, '窄档不许再改列数');
    assert.ok(narrow.includes('column-gap: ' + String(COMMAND_PALETTE_GAP_PX) + 'px'),
      '窄档只收行内那道缝（10px → 8px，与行间那道缝同一口径）');
  });

  it('按压那一档：整行换次要面 ＋ **2px** 主色侧标（法条第三节；原型写 4px，落地按法条收窄）', () => {
    assert.ok(new RegExp(SLOT('row') + ':active\\s*\\{[^}]*background:[^;]*surface-2[^;]*;').test(clean), '整行换次要面');
    assert.ok(clean.includes('box-shadow: inset 2px 0 0 '), '侧标 2px（整行选中那一档的法条口径）');
    assert.equal(clean.includes('inset 4px 0 0'), false, '4px 是原型写法，落地按法条收成 2px（判据拦住回退）');
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    for (const m of clean.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      const before = clean.slice(Math.max(0, m.index - 160), m.index);
      assert.ok(before.includes('var(--ilife-'), '硬编码颜色：' + m[0] + ' 不在皮肤兜底链里');
    }
    const bare = [...stripVarFns(clean).matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g)].map((m) => m[0]);
    assert.deepEqual([...new Set(bare)], [], '兜底链之外的颜色字面量：' + [...new Set(bare)].join('、'));
    const src = stripComments(styleSource('command-palette'));
    assert.deepEqual([...src.matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [], 'style.ts 里请改走 skinVar()');
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
    assert.ok(clean.includes('accent-soft'), '强调那一档走软底（实底上不写正文级小字）');
    assert.ok(clean.includes('color-mix(in srgb,'), '淡洗与遮罩都从 token 算出来');
    assert.equal(clean.includes('var(--ilife-shadow'), false, '不拿投影表达「浮起来」');
  });

  it('皮肤读法与常量对得上：每一处 `var(--ilife-…)` 都是 `skinVar(名)` 的逐字产物', () => {
    const spans = [];
    for (const m of clean.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      const expected = skinVar(m[1]);
      assert.ok(clean.startsWith(expected, m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      spans.push([m.index, m.index + expected.length]);
    }
    assert.ok(spans.length >= 20, '读皮肤的处数不对：' + spans.length);
  });

  it('零键帽语汇（标记与会过屏的字里没有键位提示，也没有「按某个键才怎样」）', () => {
    const words = ['⌘', '⌥', '⇧', '⌃', '↵', '⌫', 'Esc', 'Tab', '方向键', '快捷键', '键帽', '回车键', '键盘'];
    const html = [renderCommandPalette(REAL), renderCommandPalette({ ...REAL, id: 'x-1', query: '体重' })].join('')
      + stripComments(css);
    for (const w of words) assert.equal(html.includes(w), false, '出现键帽语汇：' + w);
  });

  it('`dist/components/command-palette/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'command-palette');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 5, '产物不全：' + files.join('、'));
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const name of files) {
      const code = stripLiterals(readFileSync(join(dir, name), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, name + ' 里出现了 ' + needle);
      }
    }
  });

  it('运行时段是**产出的文本**：它自己跑得起来（IIFE）、幂等、且 DOM 名只在这段文本里', () => {
    const js = buildCommandPaletteJs();
    assert.ok(js.startsWith('(function(){'), '是一段可独立注入的 IIFE');
    assert.ok(js.trimEnd().endsWith('}());'));
    assert.ok(js.includes('data-ilife-command-palette-runtime'), '幂等开关');
    for (const needle of ['document', 'window.matchMedia', 'addEventListener', 'createElement']) {
      assert.ok(js.includes(needle), '运行时该用到 ' + needle + '（它在产出的文本里，不在模块代码里）');
    }
    assert.equal(js.includes('onclick'), false, '不用内联事件');
    assert.equal(/addEventListener\("keydown"/.test(js), false, '不许把键盘做成通路');
    assert.equal(js.includes('innerHTML'), false, '命中词重画不碰 innerHTML');
    /* 面板恒在根里 ⇒ 按根找就够；先前那段「根里找不到就按 id 扫全文档」是不可达分支（死代码）。 */
    assert.equal(js.includes('panelById'), false, '不可达的全文档兜底必须删掉（分支永不可达＝死代码）');
    assert.ok(js.includes('roots[k].querySelector("["+A_PANEL+"]")'), '面板按**根**找（render 把它写在根内）');
    assert.ok(js.includes('A_BOUND'), '入口键上要记一枚 bound 读数（幂等的可读痕迹）');
  });

  it('槽位闭集与类名一致（判据不另抄一份字面量）', () => {
    assert.equal(commandPaletteSlot('panel'), COMMAND_PALETTE_CLASS + '-panel');
    assert.equal(commandPaletteSlot('panel', 'x-'), 'x-block-command-palette-panel');
    for (const slot of COMMAND_PALETTE_SLOTS) {
      assert.ok(commandPaletteSlot(slot).startsWith(COMMAND_PALETTE_CLASS + '-'));
    }
    for (const slot of ['entry', 'open', 'panel', 'q', 'x', 'row', 'act', 'foot']) {
      assert.ok(COMMAND_PALETTE_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    }
  });
});

/** 剥掉 `var(...)`（含嵌套与带括号的兜底）后的剩余 CSS：兜底链里的颜色字面量是允许的。 */
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

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('command-palette ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同；不从根出口出', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(COMMAND_PALETTE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.equal(root.renderCommandPalette, undefined, '组件层不进根出口');
    assert.equal(root.commandPaletteCss, undefined);
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const barBefore = renderScaleBar({ value: 860, goal: 1850 });
    const headBefore = renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } });
    renderCommandPalette(REAL);
    assert.equal(renderScaleBar({ value: 860, goal: 1850 }), barBefore, '别件的产物逐字节不变');
    assert.equal(renderPageHead({ skill: '卡路里', title: '今日', reading: { value: '860', unit: '卡' } }), headBefore);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const css = stripComments(commandPaletteCss({ prefix: 'x-' }));
    assert.ok(css.includes('.x-page-ui .x-block-command-palette'), '前缀必须作用到 scope 与类名两处');
    assert.equal(css.includes('.ilife-page-ui'), false);
  });

  it('同一份入参渲染三次逐字节相同，且标记不带皮肤类', () => {
    const one = renderCommandPalette(REAL);
    assert.equal(renderCommandPalette(REAL), one);
    assert.equal(renderCommandPalette(REAL), one);
    assert.equal(/ilife-skin-/.test(one), false, '皮肤由页面挂，换皮要机械地不换结构');
  });
});

/* ── ⑥ 说明书与实现同一口径 ─────────────────────────────────────────── */

describe('command-palette ⑥ 说明书的偏离表与实现同一口径', () => {
  const readme = readFileSync(join(DIR, 'README.md'), 'utf8');

  it('住顶层那条偏离：**遮罩**由浏览器给、**焦点锁不给**（README 不许再声称焦点锁）', () => {
    assert.equal(readme.includes('焦点锁与遮罩由浏览器给'), false,
      '旧那句（声称焦点锁由浏览器给）必须删掉——真机实测不成立（背景没被 inert、Tab 跑得出面板）');
    assert.ok(/焦点锁(不给|不做)/.test(readme), '要写清这一档没给，以及代价（背景没被 inert、Tab 跑得出面板）');
    assert.ok(readme.includes('showModal'), '要写清原型点名的那条路（`<dialog>` ＋ `showModal()`）与不采纳的理由');
    const html = renderCommandPalette(REAL);
    assert.equal(/<dialog|showModal|inert/.test(html), false, '实现里没有 `<dialog>`／`showModal`／`inert`（面板是原生 popover）');
    assert.ok(html.includes('popover="auto"'), '实现走的是原生 popover（零脚本开合那一档）');
    assert.equal(buildCommandPaletteJs().includes('inert'), false, '运行时段也不动宿主的背景（那是宿主的活）');
  });
});

/* ── ④⑤ 两档几何（真机）＋ 皮肤纪律 ─────────────────────────────────── */

/** 一页：皮肤取值表 ＋ 本件样式段 ＋ 本件标记 ＋ 运行时段（可选）。
 *  `extraInput` 覆盖渲染入参的若干位；`runtimeTimes` 把那一段运行时段**注入几遍**（幂等那条要两遍）。 */
function fixture(withRuntime, extraHead, skin, items, query, error, extraInput, runtimeTimes) {
  const times = runtimeTimes === undefined ? 1 : runtimeTimes;
  const script = withRuntime ? new Array(times).fill('<script>' + buildCommandPaletteJs() + '</script>').join('\n') : '';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><title>command-palette</title>\n<style>\n'
    + 'html,body{margin:0;padding:0}\n' + skinCss() + '\n' + commandPaletteCss() + '\n'
    + (extraHead === undefined ? '' : extraHead + '\n')
    + '</style></head>\n<body>\n'
    + '<div class="ilife-page-ui ' + skinClass(skin === undefined ? 'paper' : skin) + '" style="padding:16px">'
    + '<p>页头上面的正文</p>'
    + renderCommandPalette({
      id: 'cmdk-main', items: items === undefined ? REAL.items : items, query: query, error: error, ...extraInput,
    })
    + '<p style="height:700px">页面正文</p></div>\n'
    + (script === '' ? '' : script + '\n')
    + '</body></html>';
}

/** 行内落位：每行的内容宽、三格盒子、算出来的轨数与轨宽、主文字几行（`getComputedStyle` 报的是**用出来的**轨）。 */
const ROW_GEOM = '(function(){'
  + 'function box(el){ var r=el.getBoundingClientRect();'
  + 'return {l:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height)}; }'
  + 'var panel=document.getElementById("cmdk-main");'
  + 'var rows=[].slice.call(panel.querySelectorAll(".' + SLOT('row') + '"));'
  + 'return rows.map(function(row){'
  + ' var cs=getComputedStyle(row), rb=row.getBoundingClientRect(), kids={};'
  + ' [].slice.call(row.children).forEach(function(el){ kids[String(el.className).split("-").pop()]=box(el); });'
  + ' return {id:row.getAttribute("' + COMMAND_PALETTE_ITEM_ATTR + '"), box:box(row),'
  + '  contentW:Math.round(rb.width)-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),'
  + '  padRight:parseFloat(cs.paddingRight), colGap:parseFloat(cs.columnGap),'
  + '  tracks:cs.gridTemplateColumns.split(" ").filter(function(s){return s!=="";}).length, kids:kids,'
  + '  lbLines:Math.round(row.querySelector(".' + SLOT('lb') + '").getBoundingClientRect().height/17)};'
  + '});}())';

/** 页内量测：面板与逐枚可点元素的盒子、行间缝、脚注真读数、计算色。 */
const GEOM = '(function(){'
  + 'function box(el){ if(!el) return null; var r=el.getBoundingClientRect();'
  + 'return {l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom),'
  + 'w:Math.round(r.width),h:Math.round(r.height)}; }'
  + 'var root=document.querySelector(".' + COMMAND_PALETTE_CLASS + '");'
  + 'var open=root.querySelector(".' + SLOT('open') + '");'
  + 'var panel=document.getElementById("cmdk-main");'
  + 'var rows=[].slice.call(panel.querySelectorAll(".' + SLOT('row') + '"));'
  + 'var gaps=[]; for(var i=1;i<rows.length;i++){ var a=rows[i-1].getBoundingClientRect(), b=rows[i].getBoundingClientRect();'
  + ' if (Math.abs(a.left-b.left)<2) gaps.push(Math.round(b.top-a.bottom)); }'
  + 'var x=panel.querySelector(".' + SLOT('x') + '"), input=panel.querySelector(".' + SLOT('q') + '");'
  + 'var act=panel.querySelector(".' + SLOT('row') + '.is-primary .' + SLOT('act') + '");'
  + 'var sk=panel.querySelector(".' + SLOT('sk') + '");'
  + 'var foot=panel.querySelector(".' + SLOT('foot') + '");'
  + 'var empty=panel.querySelector(".' + SLOT('empty') + '");'
  + 'var de=document.documentElement;'
  + 'return {openState:panel.matches(":popover-open"), expanded:open.getAttribute("aria-expanded"),'
  + 'openBox:box(open), panelBox:box(panel), xBox:box(x), inputBox:box(input), footBox:box(foot), skBox:box(sk), actBox:box(act),'
  + 'rowBoxes:rows.map(box), rowCount:rows.length, visible:rows.filter(function(r){return !r.hasAttribute("hidden");}).length,'
  + 'minGap:gaps.length?Math.min.apply(null,gaps):-1,'
  + 'panelScrollW:panel.scrollWidth, panelClientW:panel.clientWidth,'
  + 'docScrollW:de.scrollWidth, docClientW:de.clientWidth, innerW:window.innerWidth,'
  + 'actBg:act?getComputedStyle(act).backgroundColor:"", actFg:act?getComputedStyle(act).color:"",'
  + 'footText:foot.textContent, emptyHidden:empty===null?null:empty.hasAttribute("hidden"),'
  + 'active:(document.activeElement&&document.activeElement.className)||""};}())';

const OPEN_CENTER = '(function(){var b=document.querySelector(".' + SLOT('open') + '");'
  + 'var r=b.getBoundingClientRect();return [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)];}())';

const SET_QUERY = (v) => '(function(){var i=document.getElementById("cmdk-main").querySelector(".' + SLOT('q') + '");'
  + 'i.value=' + JSON.stringify(v) + ';i.dispatchEvent(new Event("input",{bubbles:true}));return i.value;}())';

const ROW_CENTER = '(function(){var r=document.querySelector(".' + SLOT('row') + '[data-ilife-command-palette-item=\\"see-weight\\"]");'
  + 'var b=r.getBoundingClientRect();return [Math.round(b.left+b.width/2),Math.round(b.top+b.height/2)];}())';

/** 静态几何判据（真机起不来时的退路）：标记与样式段里不得有超过窄档的固定宽度。 */
function assertStaticGeometry(css, html) {
  const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
  const wide = [...px(html), ...px(css)].filter((v) => v > 390);
  assert.deepEqual(wide, [], '出现过不了窄档（390）的固定宽度：' + wide.join('、'));
  assert.ok(css.includes('min-height: ' + String(COMMAND_PALETTE_TOUCH_PX) + 'px'), '触控地板在样式段里');
}

const PROBE_EVENTS = 'window.__cp=[];'
  + '["' + COMMAND_PALETTE_EVENT_RUN + '","' + COMMAND_PALETTE_EVENT_QUERY + '"].forEach(function(n){'
  + 'document.addEventListener(n,function(e){window.__cp.push({type:n,detail:e.detail});});});true';

describe('command-palette ④ 两档几何（真机 headless Chrome ＋ CDP）', () => {
  it('视口 390 与 1280：点开面板 → 零横向溢出 ＋ 每枚可点元素 ≥44×44 ＋ 行间 ≥8px ＋ 脚注真读数',
    async (t) => {
      const css = commandPaletteCss();
      const p = await startBrowser({ portOffset: 27 });
      if (p === null) {
        console.log('READING 真机未跑（本机无 Chrome／Chromium）⇒ 退回确定性几何判据：标记与样式段里没有超过 390px 的固定宽度');
        assertStaticGeometry(css, renderCommandPalette(REAL));
        return t.skip('本机无 Chrome／Chromium：两档几何判据需真浏览器');
      }
      try {
        const readings = [];
        for (const [w, h] of [[390, 780], [1280, 900]]) {
          await p.at(fixture(true), { width: w, height: h });
          await p.ev(PROBE_EVENTS);
          const why = w + '×' + h + '：';
          const [cx, cy] = await p.ev(OPEN_CENTER);
          await p.mouse(cx, cy);
          const m = await p.ev(GEOM);
          assert.equal(m.openState, true, why + '入口键点一下就要开出面（popovertarget 那条路）');
          assert.equal(m.expanded, 'true', why + 'aria-expanded 要同步');
          assert.ok(m.panelBox.l >= 0 && m.panelBox.r <= m.innerW, why + '面板横向越界：' + JSON.stringify(m.panelBox));
          /* 面板宽：宽档取上限（＋1px 边框 ×2），窄档两边各留 `COMMAND_PALETTE_EDGE_PX`。 */
          assert.ok(m.panelBox.w >= m.innerW - 2 * COMMAND_PALETTE_EDGE_PX - 4
            || m.panelBox.w <= COMMAND_PALETTE_PANEL_MAX_PX + 4,
          why + '面板宽：' + m.panelBox.w);
          assert.ok(m.panelScrollW <= m.panelClientW + 1,
            why + '面板内容横溢：' + m.panelScrollW + ' > ' + m.panelClientW);
          assert.ok(m.docScrollW <= m.docClientW + 1, why + '整页横溢：' + m.docScrollW + ' > ' + m.docClientW);
          assert.ok(m.openBox.h >= COMMAND_PALETTE_TOUCH_PX, why + '入口键高 ' + m.openBox.h + ' 小于 44');
          assert.ok(m.xBox.w >= COMMAND_PALETTE_TOUCH_PX && m.xBox.h >= COMMAND_PALETTE_TOUCH_PX,
            why + '关掉键 ' + m.xBox.w + '×' + m.xBox.h + ' 小于 44×44');
          assert.ok(m.inputBox.h >= COMMAND_PALETTE_TOUCH_PX, why + '输入框高 ' + m.inputBox.h + ' 小于 44');
          for (const [i, box] of m.rowBoxes.entries()) {
            assert.ok(box.w >= COMMAND_PALETTE_TOUCH_PX && box.h >= COMMAND_PALETTE_ROW_MIN_PX,
              why + '第 ' + (i + 1) + ' 行命中盒 ' + box.w + '×' + box.h + ' 不达标（要 ≥44×' + COMMAND_PALETTE_ROW_MIN_PX + '）');
          }
          assert.ok(m.minGap >= COMMAND_PALETTE_GAP_PX, why + '相邻两行的缝只有 ' + m.minGap + '（要 ≥8）');
          assert.equal(m.visible, REAL.items.length, why + '初值空 ⇒ 常用去处全露着');
          assert.ok(m.footText.includes(COMMAND_PALETTE_TEXT.footIdle), why + '脚注：' + m.footText);
          /* 输入即筛：真数、行数、空态三样同步（`input` 事件走委派） */
          await p.ev(SET_QUERY('体重'));
          const q = await p.ev(GEOM);
          assert.equal(q.visible, 3, why + '「体重」应命中三行，实际 ' + q.visible);
          assert.ok(q.footText.includes(COMMAND_PALETTE_TEXT.footHitPre + '3'), why + '脚注真数：' + q.footText);
          assert.equal(await p.ev('document.querySelectorAll(".' + SLOT('hit') + '").length'), 3, why + '命中词标三处');
          assert.equal(q.emptyHidden, true, why + '有命中就不出空态');
          await p.ev(SET_QUERY('zzz'));
          const none = await p.ev(GEOM);
          assert.equal(none.visible, 0, why + '一条都不该露');
          assert.equal(none.emptyHidden, false, why + '一条没中要出空态');
          assert.ok(none.footText.includes(COMMAND_PALETTE_TEXT.footNone), why + '脚注换成换词的提示');
          /* 载入档原地换字：宽度与脚注的高度都不动 */
          const before = none.footBox;
          await p.ev(SET_QUERY(''));
          const idle = await p.ev(GEOM);
          assert.equal(idle.footBox.w, before.w, why + '脚注宽度不跳版');
          /* 整行可点＝执行：点第二行 → 面板收起、事件带机器值、焦点回入口键 */
          const [rx, ry] = await p.ev(ROW_CENTER);
          await p.mouse(rx, ry);
          const after = await p.ev(GEOM);
          assert.equal(after.openState, false, why + '点一行之后面板要收起');
          assert.equal(after.expanded, 'false', why + 'aria-expanded 要回落');
          assert.ok(String(after.active).includes(SLOT('open')), why + '焦点要还给入口键，实际 ' + after.active);
          const evts = await p.ev('window.__cp');
          const run = evts.filter((e) => e.type === COMMAND_PALETTE_EVENT_RUN);
          assert.equal(run.length, 1, why + '点一行恰好一条 run 事件：' + JSON.stringify(run));
          assert.equal(run[0].detail.value, 'see-weight', why + '事件带机器值');
          assert.equal(run[0].detail.kind, 'action', why + '事件带档');
          assert.ok(String(run[0].detail.label).includes('看体重曲线'), why + '事件带那一行的主文字');
          const asked = evts.filter((e) => e.type === COMMAND_PALETTE_EVENT_QUERY);
          assert.ok(asked.length >= 1, why + '筛完要报真读数');
          assert.equal(asked[asked.length - 1].detail.hits, idle.visible, why + 'hits 与露着的行数同一份真值');
          readings.push({ w, panel: m.panelBox, rowH: m.rowBoxes[0].h, gap: m.minGap,
            panelScrollW: m.panelScrollW, panelClientW: m.panelClientW,
            docScrollW: m.docScrollW, docClientW: m.docClientW, openH: m.openBox.h, xW: m.xBox.w });
        }
        /* 换皮不换结构：四套皮肤下**面板里的标记**逐字节相同（顶层元素照样继承皮肤取值）。 */
        const marks = [];
        for (const skin of SKIN_NAMES) {
          await p.at(fixture(true, undefined, skin), { width: 390, height: 780 });
          marks.push(await p.ev('document.getElementById("cmdk-main").innerHTML'));
        }
        for (let i = 1; i < marks.length; i += 1) {
          assert.equal(marks[i], marks[0], SKIN_NAMES[i] + ' 下的标记与 ' + SKIN_NAMES[0] + ' 下不同（只许样式不同）');
        }
        /* 强调那一档在皮肤下取值也对得上（`primary` 行右那格＝强调软底 ＋ 强调文本档）。 */
        for (const skin of SKIN_NAMES) {
          await p.at(fixture(true, undefined, skin), { width: 1280, height: 900 });
          const [bx, by] = await p.ev(OPEN_CENTER);
          await p.mouse(bx, by);
          const m = await p.ev(GEOM);
          assert.equal(m.actBg, toRgb(SKIN_VALUES[skin]['accent-soft']), skin + '：强调那一档的底取 accent-soft');
          assert.equal(m.actFg, toRgb(SKIN_VALUES[skin]['accent-text']), skin + '：强调那一档的字取 accent-text');
        }
        assert.deepEqual(await p.errs(), [], '整场不得留下未捕获错误');
        for (const r of readings) {
          console.log('READING command-palette viewport=' + r.w
            + ' panel=' + r.panel.w + '×' + r.panel.h + '（左右 ' + r.panel.l + '/' + r.panel.r + '）'
            + ' rowH=' + r.rowH + ' rowGap=' + r.gap + ' openH=' + r.openH + ' closeW=' + r.xW
            + ' panelScrollW=' + r.panelScrollW + '/' + r.panelClientW
            + ' docScrollW=' + r.docScrollW + '/' + r.docClientW);
        }
      } finally { p.close(); }
    });

  it('容器隔离读数：视口恒 1440，面板放进 390／1280 定宽舞台 → 窄档落位是**容器**判的', async (t) => {
    const p = await startBrowser({ portOffset: 31 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：容器隔离读数需真浏览器');
    /** 夹具把面板从顶层摘下来放进舞台（**判据夹具的覆盖**，不是组件的一部分）：
     *  `@container` 要能判到件自己的宽度，而顶层元素的可用宽度是视口、不是宿主容器。 */
    const extract = '.ilife-page-ui .' + SLOT('panel')
      + '{position:static !important;inset:auto !important;margin:0 !important;display:block !important;'
      + 'max-height:none !important;width:auto !important}';
    const stage = (w) => '<div class="ilife-page-ui ' + skinClass('paper') + '" style="width:' + w + 'px">'
      + renderCommandPalette({ ...REAL, id: 'cmdk-' + w }) + '</div>';
    const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
      + 'html,body{margin:0}\n' + skinCss() + '\n' + commandPaletteCss() + '\n' + extract + '\n'
      + '</style></head>\n<body>\n' + stage(390) + '\n' + stage(1280) + '\n</body></html>';
    try {
      await p.at(html, { width: 1440, height: 1200 });
      const read = (id) => '(function(){var panel=document.getElementById("' + id + '");'
        + 'var row=panel.querySelector(".' + SLOT('row') + '");'
        + 'var sk=row.querySelector(".' + SLOT('sk') + '"), act=row.querySelector(".' + SLOT('act') + '"),'
        + 'tx=row.querySelector(".' + SLOT('tx') + '");'
        + 'var a=sk.getBoundingClientRect(), b=act.getBoundingClientRect(), c=tx.getBoundingClientRect();'
        + 'var cs=getComputedStyle(row), rb=row.getBoundingClientRect();'
        + 'return {panelW:Math.round(panel.getBoundingClientRect().width), rowW:Math.round(rb.width),'
        + 'contentW:Math.round(rb.width)-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),'
        + 'txW:Math.round(c.width), colGap:parseFloat(cs.columnGap),'
        + 'tracks:cs.gridTemplateColumns.split(" ").filter(function(s){return s!=="";}).length,'
        + 'skTop:Math.round(a.top), actTop:Math.round(b.top),'
        /* 同一行＝两枚格子的**中线**对齐（行内 `align-items: center`；折了列就会差一整行）。 */
        + 'sameLine:Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<2,'
        + 'scrollW:panel.scrollWidth, clientW:panel.clientWidth};}())';
      const narrow = await p.ev(read('cmdk-390'));
      const wide = await p.ev(read('cmdk-1280'));
      assert.equal(wide.sameLine, true, '1280 舞台：来源技能片与行右那格同一行');
      assert.equal(narrow.sameLine, true, '390 舞台：**列一道也不折**（原型 :133-134 口径）——片与行右那格仍同一行');
      assert.equal(narrow.tracks, 3, '390 舞台仍是三列（折成两列就是把原型明确否掉的写法做回来了）');
      assert.ok(narrow.txW >= narrow.contentW * 0.4,
        '390 舞台：主文字那一列仍吃剩余宽（实测 ' + narrow.txW + '/' + narrow.contentW + '）');
      assert.ok(narrow.colGap < wide.colGap, '窄档那条容器查询真的生效：行内那道缝收到 '
        + String(COMMAND_PALETTE_GAP_PX) + 'px（390 舞台 ' + narrow.colGap + ' vs 1280 舞台 ' + wide.colGap + '）');
      assert.equal(wide.colGap, 10, '宽档舞台行内那道缝是 10px');
      assert.ok(narrow.scrollW <= narrow.clientW + 1, '窄舞台里也不许横溢');
      console.log('READING command-palette 容器隔离（视口恒 1440）：390 舞台 panelW=' + narrow.panelW
        + ' rowW=' + narrow.rowW + ' 主文字列=' + narrow.txW + '/' + narrow.contentW
        + ' 轨数=' + narrow.tracks + ' 行内缝=' + narrow.colGap + ' sameLine=' + narrow.sameLine
        + '；1280 舞台 panelW=' + wide.panelW + ' rowW=' + wide.rowW + ' 主文字列=' + wide.txW + '/' + wide.contentW
        + ' 轨数=' + wide.tracks + ' 行内缝=' + wide.colGap + ' sameLine=' + wide.sameLine);
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });

  it('不给来源技能片的那一行：排**两列**、主文字吃剩余宽、行右那格贴右缘（1280 与 390）', async (t) => {
    const p = await startBrowser({ portOffset: 43 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：行内落位那条要真浏览器');
    try {
      for (const [w, h] of [[1280, 900], [390, 780]]) {
        await p.at(fixture(true, undefined, 'paper', MIXED.items), { width: w, height: h });
        const [cx, cy] = await p.ev(OPEN_CENTER);
        await p.mouse(cx, cy);
        const rows = await p.ev(ROW_GEOM);
        assert.equal(rows.length, MIXED.items.length, w + '：行的枚数');
        for (const r of rows) {
          const why = w + ' · ' + r.id + '：';
          /* 行右那格**恒贴行右缘**（不是被拉成通栏，也不是缩在左边） */
          assert.ok(Math.abs(r.kids.act.r - (r.box.r - r.padRight)) <= 1,
            why + '行右那格右缘 ' + r.kids.act.r + ' 应贴行右缘 ' + (r.box.r - r.padRight));
          /* 主文字那一格吃**剩下的一整段**（内容宽 − 左侧格与缝 − 行右格与缝） */
          const left = r.kids.sk === undefined ? 0 : r.kids.sk.w + r.colGap;
          assert.ok(r.kids.tx.w >= r.contentW - left - r.kids.act.w - r.colGap - 1,
            why + '主文字格 ' + r.kids.tx.w + ' 没吃满剩余宽（内容 ' + r.contentW + ' − 左侧 ' + left
            + ' − 行右 ' + r.kids.act.w + ' − 缝 ' + r.colGap + '）');
          assert.ok(r.kids.tx.w >= r.contentW * 0.3, why + '主文字格只占内容宽的 '
            + Math.round(100 * r.kids.tx.w / r.contentW) + '%');
          assert.ok(r.kids.act.w <= COMMAND_PALETTE_TOUCH_PX * 1.5,
            why + '行右那格被拉成了 ' + r.kids.act.w + 'px 通栏（正常 ' + COMMAND_PALETTE_TOUCH_PX + ' 上下）');
          if (r.kids.sk === undefined) {
            assert.equal(r.tracks, 2, why + '不给来源技能片 ⇒ 行是两列（三列里那一列空着会挤掉主文字）');
            assert.ok(r.kids.tx.w >= r.contentW * 0.8, why + '两列时主文字几乎吃掉整行：' + r.kids.tx.w);
          } else {
            assert.equal(r.tracks, 3, why + '给了来源技能片 ⇒ 三列');
          }
        }
        const scale = await p.ev('(function(){var p=document.getElementById("cmdk-main");'
          + 'return {sw:p.scrollWidth,cw:p.clientWidth}}())');
        assert.ok(scale.sw <= scale.cw + 1, w + '：面板内容横溢 ' + scale.sw + ' > ' + scale.cw);
        console.log('READING command-palette 不给 skill @' + w + '：'
          + rows.map((r) => r.id + ' 轨数=' + r.tracks + ' 主文字=' + r.kids.tx.w + '/' + r.contentW
            + '（' + Math.round(100 * r.kids.tx.w / r.contentW) + '%） 行右=' + r.kids.act.w).join('；'));
      }
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });

  it('极端长 `skill`／`go`（各 200 字）：主文字那一列不许被挤到 0（1280 与 390）', async (t) => {
    const p = await startBrowser({ portOffset: 47 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：极端长串那条要真浏览器');
    try {
      for (const [w, h] of [[1280, 900], [390, 780]]) {
        await p.at(fixture(true, undefined, 'paper', HUGE.items), { width: w, height: h });
        const [cx, cy] = await p.ev(OPEN_CENTER);
        await p.mouse(cx, cy);
        const rows = await p.ev(ROW_GEOM);
        for (const r of rows) {
          const why = w + ' · ' + r.id + '：';
          assert.ok(r.kids.tx.w > 0, why + '主文字那一列被挤到 0（两侧封顶之前就是这样：`518px 0px 50px`）');
          assert.ok(r.kids.tx.w >= r.contentW * 0.3, why + '主文字那一列只剩 ' + r.kids.tx.w + '/'
            + r.contentW + '（' + Math.round(100 * r.kids.tx.w / r.contentW) + '%）');
          assert.ok(r.kids.tx.w >= r.contentW - r.kids.sk.w - r.kids.act.w - 2 * r.colGap - 1,
            why + '两侧封顶之后主文字要吃满剩下的那一段');
          assert.ok(r.kids.sk.w <= 8 * 16, why + '来源技能片封顶在八个字以内：' + r.kids.sk.w);
        }
        const scale = await p.ev('(function(){var p=document.getElementById("cmdk-main");'
          + 'return {sw:p.scrollWidth,cw:p.clientWidth}}())');
        assert.ok(scale.sw <= scale.cw + 1, w + '：面板内容横溢 ' + scale.sw + ' > ' + scale.cw);
        console.log('READING command-palette 极端长串 @' + w + '：'
          + rows.map((r) => r.id + ' 主文字=' + r.kids.tx.w + '/' + r.contentW
            + '（' + Math.round(100 * r.kids.tx.w / r.contentW) + '%） skill 格=' + r.kids.sk.w
            + ' 行右格=' + r.kids.act.w + ' 行高=' + r.box.h).join('；'));
      }
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });

  it('运行时段注入**两遍**：幂等（bound 读数 ＋ 事件不翻倍），载入档脚注不被筛走', async (t) => {
    const p = await startBrowser({ portOffset: 51 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：幂等那条要真浏览器');
    try {
      await p.at(fixture(true, undefined, 'paper', REAL.items, undefined, undefined, { loading: true }, 2),
        { width: 1280, height: 900 });
      await p.ev(PROBE_EVENTS);
      const bound = await p.ev('document.querySelector(".' + SLOT('open') + '")'
        + '.getAttribute("data-ilife-command-palette-bound")');
      assert.equal(bound, '1', '入口键上要记一枚 bound 读数（幂等开关落在 <html> 上）');
      const [cx, cy] = await p.ev(OPEN_CENTER);
      await p.mouse(cx, cy);
      assert.equal(await p.ev('document.getElementById("cmdk-main").matches(":popover-open")'), true, '两遍注入照样开得出来');
      /* 载入档：筛行照旧（行与宽度都不动），但脚注**原地不动**（还是「正在找…」）。 */
      const before = (await p.ev('window.__cp')).filter((e) => e.type === COMMAND_PALETTE_EVENT_QUERY).length;
      await p.ev(SET_QUERY('体重'));
      const m = await p.ev(GEOM);
      assert.equal(m.visible, 3, '载入档照样筛行（「体重」命中三行）');
      assert.ok(m.footText.includes(COMMAND_PALETTE_TEXT.footBusy),
        '载入档脚注不许被筛走（应当是「' + COMMAND_PALETTE_TEXT.footBusy + '」，实际 ' + m.footText + '）');
      const qs = (await p.ev('window.__cp')).filter((e) => e.type === COMMAND_PALETTE_EVENT_QUERY);
      assert.equal(qs.length - before, 1, '一次 input 只该报一条真读数（注入两遍不准翻倍）：'
        + before + ' → ' + qs.length);
      assert.equal(qs[qs.length - 1].detail.hits, 3, 'hits 是露着的行数');
      /* 全角空格也要 trim（运行时段那一处口径与渲染期同一份）。 */
      await p.ev(SET_QUERY('\u3000体重\u3000'));
      const wide = await p.ev(GEOM);
      assert.equal(wide.visible, 3, '全角空格打头的词照样命中三行');
      const [rx, ry] = await p.ev(ROW_CENTER);
      await p.mouse(rx, ry);
      const runs = (await p.ev('window.__cp')).filter((e) => e.type === COMMAND_PALETTE_EVENT_RUN);
      assert.equal(runs.length, 1, '点一行只该报一条 run（注入两遍不准翻倍），实际 ' + runs.length);
      assert.equal(runs[0].detail.value, 'see-weight');
      console.log('READING command-palette 幂等：bound=' + bound + ' 一次 input 报 ' + (qs.length - before)
        + ' 条 query、点一行报 ' + runs.length + ' 条 run；载入档脚注=' + m.footText);
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });

  it('每条选择器都命中**至少一个真节点**（死规则＝红）＋ 面板外那层遮罩是按皮肤算出来的', async (t) => {
    const p = await startBrowser({ portOffset: 39 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：死规则那条要真浏览器');
    /** 五档节点都要在场：有命中／被筛掉／整组被筛空／停用行／强调行／**不给来源技能片的那一行**
     *  （最后这一条是 `…-row:not(:has(…-sk))` 那条规则唯一的命中面——夹具里没有它，那条规则就永远查不出死活了）。 */
    const items = REAL.items.concat([
      { id: 'log-off', kind: 'action', label: '记体重（今天已记）', skill: '卡路里', disabled: true, why: '这条今天记过了' },
      { id: 'no-sk', kind: 'action', label: '记体重', note: '这一行不给来源技能片' },
    ]);
    try {
      await p.at(fixture(true, undefined, 'paper', items, '买菜', '搜索服务连不上，先把下面几条当常用去处看。'),
        { width: 1280, height: 900 });
      const [cx, cy] = await p.ev(OPEN_CENTER);
      await p.mouse(cx, cy);
      /** 伪元素与交互态在 `querySelectorAll` 里量不到：`:active`／`:focus-visible` 脱掉，伪元素整条跳过。 */
      const parts = selectorsOf(stripComments(commandPaletteCss()))
        .flatMap((sel) => sel.split(','))
        .map((one) => one.trim().replace(/:active|:focus-visible|:hover/g, ''))
        .filter((one) => one !== '' && !one.includes('::'));
      assert.ok(parts.length >= 30, '选择器数不对：' + parts.length);
      const dead = await p.ev('(function(){var list=' + JSON.stringify(parts) + ';var out=[];'
        + 'for (var i=0;i<list.length;i+=1){ try{ if (document.querySelectorAll(list[i]).length===0) out.push(list[i]); }'
        + 'catch(e){ out.push("ERR " + list[i]); } } return out;}())');
      assert.deepEqual(dead, [], '这些选择器在真页面上一个节点都不命中（永不生效的死规则）：\n  ' + dead.join('\n  '));
      const scrim = await p.ev('getComputedStyle(document.getElementById("cmdk-main"),"::backdrop").backgroundColor');
      assert.notEqual(scrim, 'rgba(0, 0, 0, 0)', '面板外那层要给色（它是「面板浮在页面上」的那半张脸）');
      assert.ok(String(scrim).includes('0.42'), '遮罩是皮肤主色的淡洗（比例写在样式段里）：' + scrim);
      console.log('READING command-palette 选择器 ' + parts.length + ' 条全命中真节点；::backdrop=' + scrim);
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });

  it('零脚本也开得出来：不挂运行时段时，点入口键面板照样开、点面板外照样关', async (t) => {
    const p = await startBrowser({ portOffset: 35 });
    if (p === null) return t.skip('本机无 Chrome／Chromium：零脚本那条需真浏览器');
    try {
      await p.at(fixture(false), { width: 390, height: 780 });
      const [cx, cy] = await p.ev(OPEN_CENTER);
      await p.mouse(cx, cy);
      assert.equal(await p.ev('document.getElementById("cmdk-main").matches(":popover-open")'), true,
        '没有运行时段也要开得出来（`popovertarget` 是浏览器的活儿）');
      const closed = await p.ev('(function(){var panel=document.getElementById("cmdk-main");'
        + 'var row=panel.querySelector(".' + SLOT('row') + '");'
        + 'return {rows:panel.querySelectorAll(".' + SLOT('row') + '").length,'
        + 'hidden:row.getAttribute("hidden"), foot:panel.querySelector(".' + SLOT('foot') + '").textContent};}())');
      assert.equal(closed.rows, REAL.items.length, '零脚本下降级：两组清单照常可读可点');
      assert.ok(closed.foot.includes(COMMAND_PALETTE_TEXT.footIdle), '脚注照常有那句状态');
      assert.ok(closed.hidden === null, '零脚本下不筛（初值为空 ⇒ 全露着）');
      /* 点面板外那一下（light dismiss）——面板左上角之外 */
      await p.mouse(2, 2);
      assert.equal(await p.ev('document.getElementById("cmdk-main").matches(":popover-open")'), false,
        '点面板外要关掉（浏览器给的 light dismiss）');
      assert.deepEqual(await p.errs(), []);
    } finally { p.close(); }
  });
});
