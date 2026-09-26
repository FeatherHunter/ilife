/** quick-capture（快速录入条 · 形态 `oneline`「一行式录入 ＋ 解析预览」）· 契约测试。
 *
 *  覆盖四类判据（工艺书 §6）＋ 皮肤与分隔符纪律：
 *  ① **渲染契约**：骨架（写的那一行 ＋ 解析预览 ＋「记过的」）／每一格都是真按钮（`aria-expanded` ＋
 *     `aria-controls` 指到它自己的候选带）／补出来的那一格（虚线 ＋ 不带引号 ＋ 只有格名）／
 *     候选带里「现在这一枚」的选中态／**一屏只留一层话**（原型里被砍掉的那几句一句都不许回来、
 *     收起的候选带不算上屏、上屏的字不超过原型砍字后那版）／转义面／**全部**非法入参分支
 *     （含空数组、空串、`NaN`、超量、未知键（含继承来的与不可枚举的）、**零宽字符当必填文本**、
 *     稀疏数组、`from` 与 `label` 两个都给／都不给、`value` 不在 `choices` 里）／纯函数／
 *     README 示例入参直渲／分隔符门；
 *  ② **样式与零 DOM 纪律**：样式段非空、每条选择器 scope 在 `.ilife-page-ui` 之下且只出现一次／
 *     零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器／几何事实取常量
 *     （44／8／14／32／120／560）／零省略手段（每一格的读数与候选名永不截断）／`:focus-visible` 在／
 *     三条形与色的口径（主按钮的底走 `accent-text`、选中面走软底、补出来的那一格走虚线）／
 *     不拿 ink 系当面／零手写色值与零手写 `var(--ilife-…)`／零键盘语汇／
 *     `dist/components/quick-capture/**` 剥字面量后零 DOM／运行时段是产出的文本（IIFE、幂等、无 `innerHTML`）／
 *     **嵌进去的那个纯函数在只有序幕自己的作用域里真跑得起来**（名字一个都不许悬空）；
 *  ③ **加法式**：不启用它的页面零命中、逐字节不变；渲染本件不改别件产物；前缀透传；四套皮肤下标记逐字节相同；
 *  ④ **四档几何（真机 headless Chrome ＋ CDP，容器宽 320／390／620／1280）**：零横向溢出、
 *     每一格的读数与候选名零截断、每一枚可点件 ≥44×44、同一排里相邻两枚的缝 ≥8px、
 *     渲染期一条候选带都不摊开、输入框不被两颗按钮挤没；**起不来就退确定性几何判据并打印原因**；
 *  ⑤ **行为（真机 · 真指针）**：全走 CDP 的 `Input.dispatchMouseEvent`（`mousePressed`／`mouseReleased`，
 *     浏览器自己合成那枚 `click`）——点某一格摊开它的候选（其余先收）／点一枚候选改掉那一格
 *     （机器读数 ＋ 屏上读数 ＋ 候选带选中态三处一起翻）／「不改」＝取消（值一动不动、一条事件都不派）／
 *     「存」报出每一格现在的读数／点记过的一条把句子填回输入框／真打字报出新句子／重复注入只绑一次。
 *     **`element.click()` 替不了这一条**：它不经指针、也不看元素到不到得了（本批已有件栽在这上面）。
 *
 *  期望值一律从组件自己的常量派生（`QUICK_CAPTURE_*`），不抄字面量：改了名字这里跟着红。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  QUICK_CAPTURE_ATTR,
  QUICK_CAPTURE_BOUND_ATTR,
  QUICK_CAPTURE_BOX_ATTR,
  QUICK_CAPTURE_BOX_MIN_PX,
  QUICK_CAPTURE_CELL_ATTR,
  QUICK_CAPTURE_CLASS,
  QUICK_CAPTURE_CONTAINER,
  QUICK_CAPTURE_EVENT_CHANGE,
  QUICK_CAPTURE_EVENT_PICK,
  QUICK_CAPTURE_EVENT_SAVE,
  QUICK_CAPTURE_EVENT_SPLIT,
  QUICK_CAPTURE_FORMS,
  QUICK_CAPTURE_FORM_ATTR,
  QUICK_CAPTURE_GAP_PX,
  QUICK_CAPTURE_HOVER_QUERY,
  QUICK_CAPTURE_KEEP_ATTR,
  QUICK_CAPTURE_MAX_CELLS,
  QUICK_CAPTURE_MAX_CHOICES,
  QUICK_CAPTURE_MAX_RECENT,
  QUICK_CAPTURE_MIN_CELLS,
  QUICK_CAPTURE_MIN_CHOICES,
  QUICK_CAPTURE_NARROW_PX,
  QUICK_CAPTURE_PEN_PX,
  QUICK_CAPTURE_PICK_ATTR,
  QUICK_CAPTURE_READ_ATTR,
  QUICK_CAPTURE_RECALL_ATTR,
  QUICK_CAPTURE_RUNTIME_ATTR,
  QUICK_CAPTURE_SAVE_ATTR,
  QUICK_CAPTURE_SLOTS,
  QUICK_CAPTURE_SPLIT_ATTR,
  QUICK_CAPTURE_TEXT,
  QUICK_CAPTURE_TEXT_ATTR,
  QUICK_CAPTURE_TICK,
  QUICK_CAPTURE_TICK_PX,
  QUICK_CAPTURE_TOUCH_PX,
  QUICK_CAPTURE_TRAY_ATTR,
  QUICK_CAPTURE_VALUE_ATTR,
  buildQuickCaptureJs,
  quickCaptureChoiceOn,
  quickCaptureCss,
  quickCaptureSlot,
  renderQuickCapture,
} from '../dist/components/quick-capture/index.js';
import { renderDocShell } from '../dist/docShell.js';
import { renderPageHead } from '../dist/components/page-head/index.js';
import { SKINS, SKIN_NAMES, skinClass, skinCss, skinVar } from '../dist/components/skin/index.js';
import { contrast, stripComments, throwsBlocks } from './overlay-probe.mjs';
import { auditHtml, exitCodeFor } from './separator-probe.mjs';
import { styleSource, styleSources } from './_style-sources.mjs';
import { startShapesPage } from './shapes-probe.mjs';
import { derive } from '../scripts/gen-components.mjs';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const DIR = join(PKG, 'src', 'components', 'quick-capture');
const SLOT = (s) => quickCaptureSlot(s);
/** 槽位选择器（页内查元素用）。 */
const SEL = (s) => '.' + SLOT(s);
/** 属性选择器。 */
const ATTR = (name) => '[' + name + ']';
const q = (s) => JSON.stringify(s);
const countOf = (html, needle) => (html.match(new RegExp(needle, 'g')) || []).length;
/** 本件的样式源码：经 `_style-sources.mjs` 取该件全部 `style*.ts`（拆出去的那半也在扫面里）。 */
const STYLE_SRC = styleSource('quick-capture');
/** 一个字面量串进正则前的转义。 */
const re = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 把一串 CSS 里的每条规则选择器抽出来（配平花括号；`@` 开头的 at-rule 前奏不算）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') { buf = ''; } else { buf += ch; }
  }
  return out;
}
/** 收起的候选带（`hidden`）那一整段。 */
const TRAY_RE = new RegExp('<div class="' + re(SLOT('tray')) + '"[^>]*hidden>[\\s\\S]*?</div>', 'g');
/** 剥掉收起的候选带（「上屏的字」只算现在真的看得见的那一份）。 */
const dropTrays = (html) => html.replace(TRAY_RE, '');
/** 一段标记里**看得见的字**：段间一个空格（口径与 `.scratch/ui-组件墙/新件/_瘦身-字数账.mjs` 同一套剥壳，
 *  只把「段与段之间加什么」换成单个空格——那边加 ` · ` 是为了在账本上读得清）。 */
const visibleText = (html) => String(html)
  .replace(/<(input|textarea)\b[^>]*\bvalue="([^"]*)"[^>]*>/gi, '\u0001$2\u0001')
  .replace(/<[^>]*>/g, '\u0001')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/[\u0001]+/g, '\u0002').split('\u0002')
  .map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ');

/* ── 三份真实形状的入参 ─────────────────────────────────────────────── */

const CELLS = [
  { key: 'category', value: 'canyin', from: '午饭',
    choices: [{ key: 'canyin', label: '餐饮' }, { key: 'jiaotong', label: '交通' }, { key: 'gouwu', label: '购物' }] },
  { key: 'amount', value: 'y32', from: '32 元',
    choices: [{ key: 'y32', label: '32.00' }, { key: 'j32', label: '3.20' }] },
  { key: 'account', value: 'cash', from: '现金',
    choices: [{ key: 'cash', label: '现金账户' }, { key: 'wechat', label: '微信' }] },
  { key: 'date', label: '日期', value: 'today',
    choices: [{ key: 'today', label: '今天' }, { key: 'yest', label: '昨天' }] },
];
const RECENT = ['早饭 12 元 微信', '打车 28.5 现金', '超市 241.5 招行'];
const PLAIN = { id: 'qcap-lunch', text: '午饭 32 元 现金', cells: CELLS, recent: RECENT };
/** 不带「记过的」那一条带（那一条整条不出）。 */
const BARE = { id: 'qcap-bare', text: '昨天买书 68 微信', cells: [CELLS[0], CELLS[3]] };
/** 一份最小的合法入参（非法入参分支都从它改一处）。 */
const OK = {
  id: 'ok-cap',
  text: '甲 1',
  cells: [{ key: 'a', value: 'a1', from: '甲',
    choices: [{ key: 'a1', label: '甲类' }, { key: 'a2', label: '甲类二' }] }],
};
/** 注入串（每个文本字段都塞一遍）。 */
const EVIL = '<img src=x onerror=alert(1)>&"\'<>';
/** README 里那一份显式示例入参（判据与派生器读**同一块**）。 */
const README_SAMPLE = (() => {
  const blocks = [...readFileSync(join(DIR, 'README.md'), 'utf8').matchAll(/```json 示例入参\n([\s\S]*?)```/g)]
    .map((m) => m[1]);
  assert.equal(blocks.length, 1, 'README 里恰好一块显式示例入参（信息串带「示例入参」四字）');
  return JSON.parse(blocks[0]);
})();

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('quick-capture ① 渲染契约 · 骨架与三层话', () => {
  const html = renderQuickCapture(PLAIN);

  it('根 ＋ 写的那一行 ＋ 解析预览 ＋「记过的」；形态键是英文骨架名（不是格号 A）', () => {
    assert.deepEqual([...QUICK_CAPTURE_FORMS], ['oneline'], '形态闭集只落地「一行式录入」，键名是骨架名');
    assert.match(html, new RegExp('^<div class="' + QUICK_CAPTURE_CLASS + ' ' + SLOT('host') + ' is-oneline"'));
    assert.ok(html.includes(QUICK_CAPTURE_ATTR + '="qcap-lunch"'), '根上要有本件的发现锚');
    assert.ok(html.includes(QUICK_CAPTURE_FORM_ATTR + '="oneline"'), '形态照实写进标记');
    assert.ok(html.includes(QUICK_CAPTURE_TEXT_ATTR + '="午饭 32 元 现金"'), '那一句话住在根上（机器读数）');
    assert.ok(html.includes('value="午饭 32 元 现金"'), '输入框里是同一句话（同一件事的另一种摆法）');
    assert.ok(html.includes(QUICK_CAPTURE_BOX_ATTR + '="qcap-lunch"'), '输入框带发现锚（运行时按它认「哪句话变了」）');
    assert.ok(html.includes('>' + QUICK_CAPTURE_TEXT.lead + '<'), '行首那枚三个字的小签');
    assert.ok(html.includes('>' + QUICK_CAPTURE_TEXT.split + '<'), '「分开填」在');
    assert.ok(html.includes('>' + QUICK_CAPTURE_TEXT.save + '<'), '「存」在');
    assert.ok(html.includes(QUICK_CAPTURE_SPLIT_ATTR + '="qcap-lunch"'), '「分开填」带本件的发现锚');
    assert.ok(html.includes(QUICK_CAPTURE_SAVE_ATTR + '="qcap-lunch"'), '「存」带本件的发现锚');
    assert.ok(html.includes(SLOT('parse')) && html.includes(SLOT('recent')), '解析预览与「记过的」两条带都在');
    assert.equal(/<script|onclick=/i.test(html), false, '标记里不带脚本');
  });

  it('解析预览：每一格都是真按钮，整枚就是命中盒，读数住在 `-to` 那一格里', () => {
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('chip')), CELLS.length, '四格各一枚');
    for (const cell of CELLS) {
      assert.ok(html.includes(QUICK_CAPTURE_CELL_ATTR + '="' + cell.key + '"'), '这一格在：' + cell.key);
      assert.ok(html.includes(QUICK_CAPTURE_VALUE_ATTR + '="' + cell.value + '"'), '这一格现在认成的机器键：' + cell.key);
      assert.ok(html.includes(QUICK_CAPTURE_READ_ATTR + '="' + cell.key + '"'), '这一格有一格专门放读数：' + cell.key);
    }
    /* `aria-controls` 指到**那一格自己的**候选带：四格四条，且 id 逐实例派生。 */
    assert.equal(countOf(html, 'aria-expanded="false"'), CELLS.length, '四格都收起（渲染期只写「收起」这一态）');
    for (const cell of CELLS) {
      assert.ok(html.includes('aria-controls="qcap-lunch-tray-' + cell.key + '"'), '格指着它自己的带：' + cell.key);
      assert.ok(html.includes('id="qcap-lunch-tray-' + cell.key + '"'), '带的 id 按「入参 id ＋ 格键」派生：' + cell.key);
    }
  });

  it('候选带常渲但收起：一条都不摊开，每格带里是它自己的候选 ＋ 末一枚「不改」', () => {
    assert.equal(countOf(html, SLOT('tray')), CELLS.length, '四格四条带');
    assert.equal(countOf(html, 'class="' + SLOT('tray') + '[^"]*"[^>]* hidden'), CELLS.length, '四条带渲染期都收起');
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('pick')), CELLS.reduce((n, c) => n + c.choices.length, 0),
      '候选总数＝每一格候选数之和');
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('keep')), CELLS.length, '每格带里恰好一枚「不改」');
    for (const cell of CELLS) {
      assert.ok(html.includes('>' + QUICK_CAPTURE_TEXT.keep + '<'), '「不改」那两个字在');
      for (const one of cell.choices) {
        assert.ok(html.includes(QUICK_CAPTURE_PICK_ATTR + '="' + one.key + '"'), '这一枚候选在：' + one.key);
        assert.ok(html.includes('>' + one.label + '<'), '候选名上屏：' + one.label);
      }
    }
  });

  it('「现在这一枚」照法条：软底 ＋ 主色字 ＋ 主色描边 ＋ 勾 ＋ 槽位固定；其余落回', () => {
    for (const cell of CELLS) {
      const onKey = quickCaptureChoiceOn(cell.choices.map((c) => c.key), cell.value);
      const on = cell.choices.filter((c) => c.key === onKey);
      assert.equal(on.length, 1, '每一格恰好一枚是现在这一枚：' + cell.key);
      assert.ok(new RegExp(re(SLOT('pick')) + ' is-on" ' + re(QUICK_CAPTURE_PICK_ATTR) + '="' + re(onKey) + '"').test(html),
        '现在这一枚挂 is-on：' + onKey);
    }
    assert.equal(countOf(html, 'aria-current="true"'), CELLS.length, '四格各一枚带 aria-current');
  });

  it('补出来的那一格与认出来的格子形上分得开：虚线 ＋ 不带引号 ＋ 只有格名', () => {
    const added = CELLS.filter((c) => c.label !== undefined);
    assert.equal(added.length, 1, '这一份入参里恰好一格是补出来的');
    assert.equal(countOf(html, 'class="' + SLOT('chip') + ' is-added"'), added.length, '补出来的那一格挂 is-added');
    assert.ok(html.includes('>' + added[0].label + QUICK_CAPTURE_TEXT.eq + '<'), '那一格印的是**格名**（日期＝）');
    assert.equal(html.includes('「' + added[0].label + '」'), false, '补出来的那一格不带引号（它不是原文里认出来的）');
    for (const cell of CELLS.filter((c) => c.from !== undefined)) {
      assert.ok(html.includes('「' + cell.from + '」'), '认出来的那一格印的是**原文那一截**：' + cell.from);
    }
    assert.equal(countOf(html, QUICK_CAPTURE_TEXT.eq), CELLS.length, '每一格一枚「＝」把两边连起来');
    assert.equal(countOf(html, 'class="' + SLOT('pen') + '" aria-hidden="true">' + QUICK_CAPTURE_TEXT.pen + '<'),
      CELLS.length, '每一格一枚「改」（它说明点它会改这一格）');
  });

  it('「记过的」那一条带：点一条＝把那句话填回输入框（不打字也能换一句话）', () => {
    assert.equal(countOf(html, '<button type="button" class="' + SLOT('recall')), RECENT.length, '三条都在');
    for (const said of RECENT) {
      assert.ok(html.includes('>' + said + '<'), '那一句原样上屏：' + said);
    }
    assert.ok(html.includes('>' + QUICK_CAPTURE_TEXT.recentLead + '<'), '带首那三个字在');
    assert.equal(countOf(html, QUICK_CAPTURE_RECALL_ATTR), RECENT.length, '每条带本件的发现锚');
    const bare = renderQuickCapture(BARE);
    assert.equal(bare.includes(SLOT('recent')), false, '不给 recent ⇒ 这一条带整条不出');
    assert.equal(countOf(bare, '<button type="button" class="' + SLOT('recall')), 0);
  });

  it('**一屏只留一层话**：被砍掉的那几句一句都不许回来；收起的候选带不算上屏；上屏的字不超过原型那版', () => {
    const shown = visibleText(dropTrays(html));
    for (const gone of ['解析成', '这样记过的', '认不出', '慢慢填', '补一句', '点一下就能改', '记到哪儿', '常驻']) {
      assert.equal(shown.includes(gone), false, '屏上出现了原型里被砍掉的话：' + gone);
    }
    for (const one of CELLS[0].choices) {
      assert.equal(shown.includes(one.label), one.label === '餐饮', '收起的候选带一个字都不许算上屏：' + one.label);
    }
    /* 口径：段间一个空格。原型砍字后那版（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 86 件 A 档）
       同一口径是 **111**；落地不许比它多一个字（多一个就是新一轮「文字太多」）。 */
    console.log('quick-capture 上屏的字 ' + shown.length + '：' + shown);
    assert.ok(shown.length <= 111, '上屏的字比原型砍字后那版还多：' + shown.length + '＞111');
    /* 同一件事再按**瘦身账本那一套口径**（段间 ` · `，见 `_瘦身-字数账.mjs` 的 `visible()`）算一遍：
       原型砍字后那版是 **149**；落地 145（一个字都没多——只是「＝」并进了左边那一截，少了一处分隔）。 */
    const ledger = String(dropTrays(html))
      .replace(/<(input|textarea)\b[^>]*\bvalue="([^"]*)"[^>]*>/gi, '\u0001$2\u0001')
      .replace(/<[^>]*>/g, '\u0001')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      .replace(/[\u0001]+/g, '\u0002').split('\u0002')
      .map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');
    console.log('quick-capture 上屏的字（账本口径）' + ledger.length + '：' + ledger);
    assert.ok(ledger.length <= 149, '账本口径下比原型砍字后那版还多：' + ledger.length + '＞149');
    /* 同一个数只印一次：那句话只在输入框里印一次（根上的那份是机器读数，不是字）。 */
    assert.equal(countOf(shown, '午饭 32 元 现金'), 1, '那一句话只印一次');
  });

  it('转义面：id／那句话／原文那一截／格名／候选名／记过的逐位转义', () => {
    const one = renderQuickCapture({
      ...OK,
      id: 'evil-one',
      text: EVIL,
      cells: [{ ...OK.cells[0], from: EVIL, choices: [{ key: 'a1', label: EVIL }, { key: 'a2', label: '乙' }] }],
      recent: [EVIL],
    });
    assert.equal(/<script/i.test(one), false, '不得出现可执行脚本标签');
    assert.equal(one.includes('<img'), false, '不得把注入的标签原样吐出来');
    assert.ok(one.includes('&lt;img'), '原文以实体上屏');
    assert.ok(one.includes('&quot;'), '引号转义');
    assert.ok(one.includes('&amp;'), '与号转义');
  });

  it('入参违规一律拒（不静默降级）：逐条断 `BlocksError`', () => {
    const B = (input) => throwsBlocks(() => renderQuickCapture(input));
    assert.equal(B(undefined), true, '非对象');
    assert.equal(B(null), true);
    assert.equal(B([]), true, '数组不是入参');
    assert.equal(B('qcap'), true, '字符串不是入参');
    assert.equal(B({ ...OK, id: undefined }), true, '缺 id');
    assert.equal(B({ ...OK, id: '' }), true, '空 id');
    assert.equal(B({ ...OK, id: 'a b' }), true, 'id 里有空格');
    assert.equal(B({ ...OK, id: '记一笔' }), true, 'id 里有非标识符字符');
    assert.equal(B({ ...OK, text: undefined }), true, '缺那句话');
    assert.equal(B({ ...OK, text: '' }), true, '空句（空串＝未给）');
    assert.equal(B({ ...OK, text: 1 }), true, '那句话不是字符串');
    assert.equal(B({ ...OK, cells: undefined }), true, '缺 cells');
    assert.equal(B({ ...OK, cells: 'x' }), true, 'cells 不是数组');
    assert.equal(B({ ...OK, cells: [] }), true, '空数组（一句话至少拆出一格）');
    assert.equal(B({ ...OK, cells: Array.from({ length: QUICK_CAPTURE_MAX_CELLS + 1 },
      (_, i) => ({ ...OK.cells[0], key: 'k' + i })) }), true, '格数超量');
    assert.equal(B({ ...OK, cells: [null] }), true, '一格不是对象');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], key: undefined }] }), true, '缺这一格的键');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], key: 'a b' }] }), true, '这一格的键不是标识符');
    assert.equal(B({ ...OK, cells: [OK.cells[0], { ...OK.cells[0], key: OK.cells[0].key }] }), true, '两格键重了');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], value: 'nope' }] }), true, '现在认成的那一枚不在候选里');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], value: undefined }] }), true, '缺 value');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: undefined }] }), true, '缺候选');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [] }] }), true,
      '一枚候选都不给（那一格改不了）');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: Array.from(
      { length: QUICK_CAPTURE_MAX_CHOICES + 1 }, (_, i) => ({ key: 'c' + i, label: '候' + i })) }] }), true, '候选超量');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [null, { key: 'a2', label: '乙' }] }] }), true, '候选不是对象');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ label: '甲' }] }] }), true, '缺候选的键');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: 'a1', label: '甲' }, { key: 'a1', label: '乙' }] }] }),
      true, '同一格里候选键重了');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: 'a1', label: 1 }] }] }), true, '候选名不是字符串');
    assert.equal(B({ ...OK, cells: [{ key: 'a', value: 'a1', from: '甲', label: '甲类',
      choices: [{ key: 'a1', label: '甲类' }] }] }), true, 'from 与 label 两个都给');
    assert.equal(B({ ...OK, cells: [{ key: 'a', value: 'a1', choices: [{ key: 'a1', label: '甲类' }] }] }), true,
      'from 与 label 一个都不给（这一格没有名字）');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], from: '' }] }), true, '空串 ＝ 未给（于是这一格没有名字）');
    assert.equal(B({ ...OK, cells: [{ key: 'a', value: 'a1', label: '甲类', choices: [{ key: 'a1', label: '甲类' }] }] }),
      false, '只给 label ＝ 补出来的那一格，合法');
    assert.equal(B({ ...OK, recent: 'x' }), true, 'recent 不是数组');
    assert.equal(B({ ...OK, recent: Array.from({ length: QUICK_CAPTURE_MAX_RECENT + 1 }, (_, i) => '第' + i + '句') }),
      true, 'recent 超量');
    assert.equal(B({ ...OK, recent: [''] }), true, '记过的一条是空串');
    assert.equal(B({ ...OK, recent: ['甲', '甲'] }), true, '记过的两条重复');
    assert.equal(B({ ...OK, recent: [1] }), true, '记过的一条不是字符串');
    assert.equal(B({ ...OK, recent: [] }), false, '给空数组＝不出这一条带，合法');
    /* `NaN`／`Infinity` 那一路：它们 `typeof` 是 number，靠「先断是字符串」的守卫拦下。 */
    assert.equal(B({ ...OK, id: NaN }), true, 'id 是 NaN');
    assert.equal(B({ ...OK, text: NaN }), true, '那句话是 NaN');
    assert.equal(B({ ...OK, text: Infinity }), true, '那句话是 Infinity');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], value: NaN }] }), true, 'value 是 NaN');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], key: NaN }] }), true, '格的键是 NaN');
    assert.equal(B({ ...OK, recent: [NaN] }), true, '记过的一条是 NaN');
    assert.equal(B({ ...OK, cells: [NaN] }), true, '一格整个是 NaN');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: NaN, label: '甲' }] }] }), true, '候选的键是 NaN');
    assert.equal(B({ ...OK, form: 'A' }), true, '形态闭集外（格号不是键）');
    assert.equal(B({ ...OK, form: 'inline' }), true, '形态闭集外（B 档不落）');
    assert.equal(B({ ...OK, form: undefined, extraClass: undefined }), false, '入参表里的键给 undefined 按未给算');
    assert.equal(B({ ...OK, extraClass: 'a"b' }), true, '附加类名过不了类名正则');
    assert.equal(B({ ...OK, extraClass: 'ok-class other' }), false, '合法附加类名照收');
    const sparseCells = [OK.cells[0]];
    sparseCells.length = 2;
    assert.equal(B({ ...OK, cells: sparseCells }), true, '稀疏数组（空洞）');
    const sparseChoices = [{ key: 'a1', label: '甲' }];
    sparseChoices.length = 2;
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: sparseChoices }] }), true, '候选数组有空洞');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: 'a1', label: '甲' }] }] }), false,
      '一格一枚候选（现在这一枚）合法：改不了别的，但那枚候选就是它自己');
    assert.equal(B({ ...OK, cells: [OK.cells[0], { key: 'b', value: 'b1', label: '乙格',
      choices: [{ key: 'b1', label: '乙一' }] }] }), false, '两格（一格认出来的 ＋ 一格补出来的）合法');
  });

  it('**上屏文本全空白＝拒**（空格类 ＋ **零宽字符类**）：收下会在屏上留一块空白', () => {
    const BLANKS = ['   ', '\t', '　', ' 　 '].concat(['\u200b', '\u200b\u200b', '\ufeff', '\u00ad', '\u200e\u200f', '\u2060', '\u200b\u200d']);
    const slots = [
      ['那句话', (b) => ({ ...OK, text: b })],
      ['原文那一截', (b) => ({ ...OK, cells: [{ ...OK.cells[0], from: b }] })],
      ['补出来的那一格的格名', (b) => ({ ...OK, cells: [{ key: 'a', value: 'a1', label: b,
        choices: [{ key: 'a1', label: '甲' }] }] })],
      ['候选名', (b) => ({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: 'a1', label: b }] }] })],
      ['记过的一条', (b) => ({ ...OK, recent: [b] })],
    ];
    for (const [what, patch] of slots) {
      for (const blank of BLANKS) {
        assert.equal(throwsBlocks(() => renderQuickCapture(patch(blank))), true,
          what + ' 收到全空白串（' + JSON.stringify(blank) + '）必须拒');
      }
    }
  });

  it('**入参表以外的键＝拒**（顶层与每一格每一枚候选里 ＋ **继承来的与不可枚举的**键）', () => {
    const B = (input) => throwsBlocks(() => renderQuickCapture(input));
    assert.equal(B({ ...OK, bogus: 1 }), true, '顶层多给一个键');
    assert.equal(B({ ...OK, text_: '打错名' }), true, '顶层写错键名');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], bogus: 1 }] }), true, '一格多给一个键');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], on: true }] }), true, '「现在这一枚」是算出来的，入参不许给');
    assert.equal(B({ ...OK, cells: [{ ...OK.cells[0], choices: [{ key: 'a1', label: '甲', on: true }] }] }), true,
      '候选里也不许多给');
    assert.equal(B(Object.create({ ...OK, bogus: 1 })), true, '顶层：原型链上继承来的未知键');
    assert.equal(B({ ...OK, cells: [Object.create({ ...OK.cells[0], bogus: 1 })] }), true, '一格：继承来的未知键');
    const hidden = { ...OK };
    Object.defineProperty(hidden, 'bogus', { value: 1, enumerable: false });
    assert.equal(B(hidden), true, '顶层：不可枚举的自有键（`Object.keys` 看不见它）');
  });

  it('纯函数：同样的入参恒产同样的字节；README 示例入参直渲成功；派生器认得本件', () => {
    assert.equal(renderQuickCapture(PLAIN), renderQuickCapture(PLAIN));
    assert.equal(renderQuickCapture(BARE), renderQuickCapture(BARE));
    const one = renderQuickCapture(README_SAMPLE);
    assert.ok(one.includes(QUICK_CAPTURE_ATTR + '="' + README_SAMPLE.id + '"'), '示例的 id 上屏');
    assert.ok(one.includes('value="' + README_SAMPLE.text + '"'), '示例那句话上屏');
    assert.equal(countOf(one, '<button type="button" class="' + SLOT('chip')), README_SAMPLE.cells.length,
      '示例的每一格都渲出来了');
    const seen = derive(PKG).pieces.find((p) => p.name === 'quick-capture');
    assert.ok(seen !== undefined, '派生器不认得本件（形状：index.ts／render.ts／style.ts）');
    assert.equal(seen.cn, '快速录入条', 'README 首行是「# quick-capture · 快速录入条」');
    assert.deepEqual(seen.variants, ["QUICK_CAPTURE_FORMS=('oneline')"], '形态闭集抽得出来且只有一格');
    assert.equal(seen.render, 'renderQuickCapture');
    assert.equal(seen.style, 'quickCaptureCss');
    assert.equal(JSON.stringify(seen.sample), JSON.stringify(README_SAMPLE), '清单里的示例入参就是 README 显式块那一份');
    console.log('quick-capture 派生读数：' + JSON.stringify({ cn: seen.cn, variants: seen.variants,
      runtime: seen.runtime, layerLine: seen.layerLine }));
  });

  it('「哪一枚是现在这一枚」只有一处口径：渲染期标的那一枚与函数算的是同一枚', () => {
    assert.equal(quickCaptureChoiceOn(['a', 'b'], 'b'), 'b');
    assert.equal(quickCaptureChoiceOn(['a', 'b'], 'nope'), '', '一枚都不命中＝空串（不兜底猜谜）');
    assert.equal(quickCaptureChoiceOn([], 'a'), '');
    for (const cell of CELLS) {
      const onKey = quickCaptureChoiceOn(cell.choices.map((c) => c.key), cell.value);
      assert.equal(onKey, cell.value, '这一份入参里每一格的值都命中候选：' + cell.key);
    }
  });

  it('分隔符门：样例渲染的可见文本零命中（`·`／`；`／≥3 段并列）', () => {
    for (const sample of [PLAIN, BARE, README_SAMPLE]) {
      const r = auditHtml('<html><body>' + renderQuickCapture(sample) + '</body></html>');
      assert.equal(exitCodeFor(r), 0, '分隔符命中：' + JSON.stringify(r.node.hits.slice(0, 2)));
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('quick-capture ② 样式与零 DOM 纪律', () => {
  const css = quickCaptureCss();
  const clean = stripComments(css);

  it('样式段非空，每条选择器都 scope 在 `.ilife-page-ui` 之下且只出现一次', () => {
    assert.ok(clean.trim() !== '', '样式段必须非空');
    const selectors = ruleSelectors(clean);
    assert.ok(selectors.length >= 25, '选择器数量不对：' + selectors.length);
    for (const sel of selectors) {
      for (const part of sel.split(',')) {
        const one = part.trim();
        if (one === '') continue;
        assert.ok(one.includes('.ilife-page-ui'), '选择器必须 scope 在 .ilife-page-ui：' + one);
        /* **带点的类名**：`quickCaptureSlot()` 只产类名本身，少写一个点就变成**标签选择器**（一条不命中）。 */
        assert.ok(one.includes('.' + QUICK_CAPTURE_CLASS), '选择器必须只碰本件类名根（类名要带点）：' + one);
        assert.equal((one.match(/\.ilife-page-ui\b/g) || []).length, 1,
          'scope 类名在一条选择器里只许出现一次（拼两遍＝永不命中的死规则）：' + one);
      }
    }
  });

  it('零 `:root`／`!important`／零新 token／零视口宽度查询／容器查询自己声明了容器', () => {
    assert.equal(clean.includes(':root'), false);
    assert.equal(clean.includes('!important'), false);
    assert.equal(/'@media \((?:max|min)-width/.test(css), false, '本件不判视口宽度（件宽 ≠ 视口宽）');
    assert.ok(clean.includes('@container ' + QUICK_CAPTURE_CONTAINER + ' (max-width:'), '窄档必须由容器判');
    assert.ok(new RegExp(re(SLOT('host')) + '\\s*\\{[^}]*container-type: inline-size').test(clean),
      'container-type 必须挂在宿主槽上（写了 @container 就必须自己声明容器，否则永不生效）');
    assert.ok(clean.includes('container-name: ' + QUICK_CAPTURE_CONTAINER));
    assert.deepEqual(clean.match(/--[a-z0-9-]+\s*:/g) || [], [], '不得定义新 token');
    assert.ok(clean.includes('@media ' + QUICK_CAPTURE_HOVER_QUERY), '悬停增强读的是常量里的能力查询串');
    assert.ok(clean.includes('@media (prefers-reduced-motion: reduce)'), '减动效那一档要在');
  });

  it('几何事实写在一处（44／8／14／32／120／560 都取常量）；读数零省略手段', () => {
    assert.equal(QUICK_CAPTURE_TOUCH_PX, 44);
    assert.equal(QUICK_CAPTURE_GAP_PX, 8);
    assert.equal(QUICK_CAPTURE_MIN_CELLS, 1, '一句话至少拆出一格');
    assert.equal(QUICK_CAPTURE_MIN_CHOICES, 1, '一格至少给一枚（就是它现在那一枚）');
    const touch = String(QUICK_CAPTURE_TOUCH_PX) + 'px';
    assert.ok(clean.includes('min-height: ' + touch), '每一枚可点件取触控地板的常量');
    assert.ok(clean.includes('gap: ' + String(QUICK_CAPTURE_GAP_PX) + 'px'), '相邻那道缝取常量');
    assert.ok(clean.includes('width: ' + String(QUICK_CAPTURE_TICK_PX) + 'px'), '候选的勾选槽位取常量');
    assert.ok(clean.includes('min-height: ' + String(QUICK_CAPTURE_PEN_PX) + 'px'), '格尾那枚「改」取常量');
    assert.ok(clean.includes('max-width: ' + String(QUICK_CAPTURE_NARROW_PX) + 'px'), '窄档断点取常量');
    assert.ok(clean.includes('min-width: ' + String(QUICK_CAPTURE_BOX_MIN_PX) + 'px'),
      '窄档输入框的可用宽下限取常量');
    assert.equal(clean.includes('text-overflow'), false, '不许出现省略截断');
    assert.equal(clean.includes('line-clamp'), false, '不许多行截断');
    assert.equal(clean.includes('nowrap'), false, '读数永不截断：连 `nowrap` 都不许');
    assert.equal(clean.includes('overflow-x'), false, '不许藏横滑');
    assert.ok(clean.includes(':focus-visible'), '`:focus-visible` 必须有（真实键盘用户的地板）');
    assert.equal(clean.includes('cursor: not-allowed'), false, '本件没有按不动的控件');
    assert.equal(css.includes('disabled'), false, '本件不许有变灰的控件');
    /* **收起必须真的收起**：作者层的 `display: flex` 会盖掉浏览器默认那条 `[hidden] { display: none }`
       （作者规则赢过 UA 规则）。变异自证：把这条规则删掉 ⇒ 四档几何里
       「收起的候选带必须真的不在屏上」那一条红（2026-09-25 实测：这条就是被变异逼出来的）。 */
    assert.ok(new RegExp(re(SLOT('tray')) + '\\[hidden\\]\\s*\\{[^}]*display: none').test(clean),
      '收起的候选带要有一条自己的 `display: none`');
  });

  it('三条形与色的口径：主按钮走 `accent-text` 底、选中面走软底、补出来的那一格走虚线', () => {
    /* 主按钮：底是强调色的**文本档**（`accent-ink` on `accent` 在 neutral 只有 4.02，正文级按钮字过不了 4.5）。 */
    const save = new RegExp(re(SLOT('save')) + '\\s*\\{[^}]*background: ' + re(skinVar('accent-text'))).test(clean);
    assert.ok(save, '「存」的底要走 accent-text（不是 accent）');
    assert.ok(new RegExp(re(SLOT('save')) + '\\s*\\{[^}]*color: ' + re(skinVar('accent-ink'))).test(clean),
      '「存」上面的字走 accent-ink');
    /* 法条：有文字的选中面＝软底 ＋ 主色字 ＋ 主色描边。 */
    assert.ok(new RegExp(re(SLOT('chip')) + '\\.is-open\\s*\\{[^}]*background: ' + re(skinVar('accent-soft'))).test(clean),
      '摊开那一格走软底');
    assert.ok(new RegExp(re(SLOT('pick')) + '\\.is-on\\s*\\{[^}]*background: ' + re(skinVar('accent-soft'))).test(clean),
      '候选带里现在这一枚走软底');
    assert.ok(new RegExp(re(SLOT('pick')) + '\\.is-on\\s*\\{[^}]*border-color: ' + re(skinVar('accent'))).test(clean),
      '软底那一格的主色描边');
    assert.ok(new RegExp(re(SLOT('pick')) + '\\.is-on\\s*\\{[^}]*color: ' + re(skinVar('accent-text'))).test(clean),
      '软底上的字走强调色的文本档');
    /* 勾是「形」那一半；槽位固定（未选也留同宽：一排候选左右沿齐平）。 */
    assert.ok(new RegExp(re(SLOT('pick')) + '::before\\s*\\{[^}]*width: ' + String(QUICK_CAPTURE_TICK_PX) + 'px').test(clean),
      '候选的勾选槽位固定（未选也留）');
    assert.ok(clean.includes('content: "' + QUICK_CAPTURE_TICK + '"'), '现在这一枚写上勾（形，不只靠颜色）');
    /* 补出来的那一格：形是虚线（另一个信号是它不带引号，见 ①）。 */
    assert.ok(new RegExp(re(SLOT('chip')) + '\\.is-added\\s*\\{[^}]*border-style: dashed').test(clean),
      '补出来的那一格走虚线边');
    assert.ok(clean.includes('font-weight: 700'), '选中的那一枚字重加粗（字那一半）');
  });

  it('主按钮的字过文本地板（四套皮肤逐套算）：`accent-ink` on `accent-text` ≥4.5', () => {
    for (const name of SKIN_NAMES) {
      const v = SKINS[name].values;
      const r = contrast(v['accent-ink'], v['accent-text']);
      assert.ok(r >= 4.5, name + '：accent-ink on accent-text 只有 ' + r.toFixed(2) + ':1');
      assert.ok(contrast(v['accent-text'], v['accent-soft']) >= 4.5, name + '：软底上的主色字要 ≥4.5');
      assert.ok(contrast(v['accent'], v['accent-soft']) >= 3, name + '：软底上的主色描边要 ≥3（图形地板）');
      assert.ok(contrast(v['ink-3'], v['surface-2']) >= 4.5, name + '：弱文字压在次要面（候选带底下那一档）要 ≥4.5');
    }
  });

  it('零手写色值（兜底链那一处除外）、源码级零手写 `var(--ilife-…)`、不拿 ink 系当面', () => {
    const files = styleSources('quick-capture');
    assert.ok(files.some((f) => f.file === 'style.ts'), '取不到本件的样式源码：' + files.map((f) => f.file).join('、'));
    for (const { file, src } of files) {
      assert.deepEqual([...stripComments(src).matchAll(/var\(\s*--ilife-/g)].map((m) => m[0]), [],
        file + ' 里请改走 skinVar()（注释里提一句不算手写）');
    }
    /* 每一处 `var(--ilife-…)` 都必须是 `skinVar(名)` 的逐字产物。 */
    let n = 0;
    for (const m of clean.matchAll(/var\(\s*--ilife-([a-z0-9-]+)/g)) {
      assert.ok(clean.startsWith(skinVar(m[1]), m.index), '`' + m[1] + '` 处的 var() 串与 skinVar() 走散');
      n += 1;
    }
    assert.ok(n >= 20, '读皮肤的处数不对：' + n);
    for (const m of clean.matchAll(/background(?:-color)?\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim();
      assert.equal(/^var\(\s*--ilife-ink(?:-[23])?\s*[,)]/.test(value), false, '拿文字墨色当了「面」：' + value);
    }
  });

  it('零键盘语汇（标记与会过屏的字里没有键位提示），也不接任何键盘事件', () => {
    const words = ['⌘', '⌥', '⇧', '⌃', 'Esc', 'Tab', '方向键', '快捷键', '键帽', '键盘', '长按', '双击', '按住'];
    const js = buildQuickCaptureJs();
    const seen = [renderQuickCapture(PLAIN), stripComments(css), js, stripComments(STYLE_SRC)].join('');
    for (const w of words) assert.equal(seen.includes(w), false, '出现键盘语汇：' + w);
    assert.equal(/addEventListener\("key/.test(js), false, '不许把键盘做成通路');
    assert.equal(/\.key\s*[!=]==/.test(js), false, '也不许按 `event.key` 分支');
  });

  it('`dist/components/quick-capture/**` 零 DOM（剥字面量与注释后逐名扫）', () => {
    const dir = join(PKG, 'dist', 'components', 'quick-capture');
    const files = readdirSync(dir).filter((n) => n.endsWith('.js'));
    assert.ok(files.length >= 6, '产物不全：' + files.join('、'));
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

  it('运行时段是**产出的文本**：IIFE、幂等、无 `innerHTML`、三处一起翻的写法都在', () => {
    const js = buildQuickCaptureJs();
    assert.ok(js.startsWith('(function(){'), '是一段可独立注入的 IIFE');
    assert.ok(js.trimEnd().endsWith('}());'));
    assert.ok(js.includes(QUICK_CAPTURE_RUNTIME_ATTR), '幂等开关');
    assert.ok(js.includes(QUICK_CAPTURE_BOUND_ATTR), '根上要记一枚 bound 读数（幂等的可读痕迹）');
    for (const needle of ['document', 'addEventListener', 'textContent', 'CustomEvent', 'closest', 'setAttribute']) {
      assert.ok(js.includes(needle), '运行时该用到 ' + needle + '（它在产出的文本里，不在模块代码里）');
    }
    assert.equal(js.includes('innerHTML'), false, '读数与选中态用节点文字拼，不碰 innerHTML');
    assert.equal(js.includes('outerHTML'), false);
    assert.equal(js.includes('draggable'), false, '本件没有拖拽');
    assert.equal(js.includes('pointerdown'), false, '通路只有点一下');
    for (const ev of [QUICK_CAPTURE_EVENT_CHANGE, QUICK_CAPTURE_EVENT_PICK, QUICK_CAPTURE_EVENT_SAVE,
      QUICK_CAPTURE_EVENT_SPLIT]) {
      assert.ok(js.includes(ev), '运行时要派发本件那条事件：' + ev);
    }
    assert.ok(js.includes('classList.add(ON)') && js.includes('classList.remove(ON)'),
      '候选带里选中态两向都写（只在渲染期写它 ⇒ 真机上点出来永远没有那一档形）');
    assert.ok(js.includes('classList.add(OPEN)') && js.includes('classList.remove(OPEN)'), '摊开那一格的形两向都写');
    assert.ok(js.includes('aria-expanded'), '摊开／收起要跟着改无障碍态');
    assert.ok(js.includes('aria-current'), '候选带的选中态要跟着改无障碍态');
    assert.ok(js.includes(QUICK_CAPTURE_TEXT_ATTR), '那句话的机器读数在根上要跟着写');
    assert.ok(js.includes(quickCaptureChoiceOn.toString()), '「哪一枚是现在这一枚」取自渲染期那个函数');
  });

  /* **嵌进去的函数必须自己站得住**：运行时段把渲染期那个纯函数 `toString()` 后原样嵌进 IIFE，
   *  被嵌的那份源码里只要引用了一个序幕没声明的名字，真机上点一枚候选就抛 `ReferenceError`
   *  ——候选带选中态一动不动，而「文本里确实含这份源码」的判据全绿（字形对得上，跑起来才露）。
   *  故这里把**序幕那一段**单独取出来、在只有它自己的作用域里跑一遍，再逐条比对读数。 */
  it('运行时段嵌进去的那个纯函数，在只有序幕自身的作用域里真跑得起来（嵌进去的名字一个都不许悬空）', () => {
    const js = buildQuickCaptureJs();
    const start = js.indexOf('var A_ROOT=');
    const end = js.indexOf('var doc=document;');
    assert.ok(start >= 0 && end > start, '运行时段的序幕形状变了：取不到那一段常量与嵌入函数的声明');
    const block = js.slice(start, end);
    const names = [...block.matchAll(/var ([A-Za-z_$][A-Za-z0-9_$]*)=/g)].map((m) => m[1]);
    assert.ok(names.length >= 8, '序幕里读到的声明太少：' + names.join('、'));
    let env;
    try {
      env = new Function(block + '\nreturn {' + names.join(', ') + '};\n')();
    } catch (e) {
      assert.fail('运行时段的序幕自己跑不起来：' + e.constructor.name + ': ' + e.message);
    }
    const embedded = names.map((n) => env[n]).find((v) => String(v) === quickCaptureChoiceOn.toString());
    assert.ok(embedded !== undefined, '运行时段里没嵌到「哪一枚是现在这一枚」那份源码');
    for (const [keys, value] of [[['a', 'b'], 'b'], [['a', 'b'], 'nope'], [[], 'a'], [['a'], 'a']]) {
      assert.equal(embedded(keys, value), quickCaptureChoiceOn(keys, value),
        '嵌进去的那一份与渲染期走散：' + JSON.stringify([keys, value]));
    }
  });

  it('槽位闭集与类名一致，且**闭集里每一枚槽类都真的落在标记里**（死声明门）', () => {
    assert.equal(quickCaptureSlot('chip'), QUICK_CAPTURE_CLASS + '-chip');
    assert.equal(quickCaptureSlot('chip', 'x-'), 'x-block-quick-capture-chip');
    for (const slot of QUICK_CAPTURE_SLOTS) assert.ok(quickCaptureSlot(slot).startsWith(QUICK_CAPTURE_CLASS + '-'));
    const want = ['host', 'line', 'lead', 'input', 'more', 'save', 'parse', 'chip', 'src', 'field', 'to',
      'pen', 'tray', 'pick', 'keep', 'recent', 'lb', 'recall'];
    for (const slot of want) assert.ok(QUICK_CAPTURE_SLOTS.includes(slot), '槽位闭集里少了 ' + slot);
    assert.equal(QUICK_CAPTURE_SLOTS.length, want.length, '槽位闭集多出了没对上的槽：'
      + QUICK_CAPTURE_SLOTS.filter((s) => !want.includes(s)).join('、'));
    /* 变异自证：把根上的 `quickCaptureSlot('host')` 摘掉 ⇒ 本条红在 `槽位闭集里的 host`。 */
    const html = renderQuickCapture(PLAIN);
    for (const slot of QUICK_CAPTURE_SLOTS) {
      assert.ok(html.includes(quickCaptureSlot(slot)),
        '槽位闭集里的 `' + slot + '` 在标记里没有这个类（死声明）：' + quickCaptureSlot(slot));
    }
    /* 容器名与槽名不许互为前缀（判据在标记串上找槽位时才不会把容器当项）。 */
    for (const slot of QUICK_CAPTURE_SLOTS) {
      const other = QUICK_CAPTURE_SLOTS.filter((s) => s !== slot);
      assert.equal(other.some((s) => s.startsWith(slot) || slot.startsWith(s)), false,
        '槽名互为前缀（判据会把容器当项）：' + slot);
    }
  });
});

/* ── ③ 加法式 ───────────────────────────────────────────────────────── */

describe('quick-capture ③ 加法式（不启用即逐字节不变）', () => {
  it('页面壳不带本件时零命中，且两次渲染逐字节相同；不从根出口出', () => {
    const base = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    assert.equal(base.includes(QUICK_CAPTURE_CLASS), false, '不带本件时不得出现它的类名');
    assert.equal(base, renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }));
    assert.equal(root.renderQuickCapture, undefined, '组件层不进根出口');
    assert.equal(root.quickCaptureCss, undefined);
  });

  it('渲染本件不改动同页别的件的产物', () => {
    const headBefore = renderPageHead({ skill: '记账', title: '今天', reading: { value: '32.00', unit: '元' } });
    const shellBefore = renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    renderQuickCapture(PLAIN);
    assert.equal(renderPageHead({ skill: '记账', title: '今天', reading: { value: '32.00', unit: '元' } }), headBefore,
      '别件的产物逐字节不变');
    assert.equal(renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' }), shellBefore);
  });

  it('前缀透传：换前缀时 scope 与类名一起换（不写死 `ilife-`）', () => {
    const one = stripComments(quickCaptureCss({ prefix: 'x-' }));
    assert.ok(one.includes('.x-page-ui .x-block-quick-capture'), '前缀必须作用到 scope 与类名两处');
    assert.equal(one.includes('.ilife-page-ui'), false);
  });

  it('同一份入参渲染四次逐字节相同；不带皮肤类；四套皮肤下标记逐字节相同', () => {
    const one = renderQuickCapture(PLAIN);
    assert.equal(renderQuickCapture(PLAIN), one);
    assert.equal(renderQuickCapture(PLAIN), one);
    assert.equal(renderQuickCapture(PLAIN), one);
    assert.equal(/ilife-skin-/.test(one), false, '皮肤由页面挂，换皮要机械地不换结构');
    for (const name of SKIN_NAMES) {
      assert.equal(renderQuickCapture(PLAIN), one, name + '：标记不许跟着皮肤改');
      assert.ok(skinCss().includes(skinClass(name)), name + '：皮肤段里有那一套类');
      assert.equal(one.includes(skinClass(name)), false, name + '：标记里不该出现皮肤类');
    }
  });
});

/* ── ④ 四档几何（真机 headless Chrome ＋ CDP） ──────────────────────── */

const ROOT_S = q(ATTR(QUICK_CAPTURE_ATTR));
const HOST_S = q(SEL('host'));
const LINE_S = q(SEL('line'));
const INPUT_S = q(SEL('input'));
const MORE_S = q(SEL('more'));
const SAVE_S = q(SEL('save'));
const PARSE_S = q(SEL('parse'));
const CHIP_S = q(SEL('chip'));
const SRC_S = q(SEL('src'));
const FIELD_S = q(SEL('field'));
const TO_S = q(SEL('to'));
const PEN_S = q(SEL('pen'));
const TRAY_S = q(SEL('tray'));
const PICK_S = q(SEL('pick'));
const KEEP_S = q(SEL('keep'));
const RECENT_S = q(SEL('recent'));
const LB_S = q(SEL('lb'));
const RECALL_S = q(SEL('recall'));
/** 落进「零横溢／零截断」扫面的槽位（**不含输入框**：文本域的内容天生可横向滚动，那不是版面截断）。 */
const FLOW_SELECTORS = [ROOT_S, HOST_S, LINE_S, MORE_S, SAVE_S, PARSE_S, CHIP_S, SRC_S, FIELD_S, TO_S, PEN_S,
  TRAY_S, PICK_S, KEEP_S, RECENT_S, LB_S, RECALL_S].map((s) => JSON.parse(s));

/** 页内：逐 case 量几何（每一枚可点件的命中盒、两条带里的缝、摊开没摊开、输入框的宽与值）。 */
const BOX_FN = '(function(){'
  + 'function box(el){var r=el.getBoundingClientRect();return {w:r.width,h:r.height,l:r.left,t:r.top};}'
  + 'function shown(el){var cs=getComputedStyle(el),r=el.getBoundingClientRect();'
  + 'return cs.display!=="none"&&cs.visibility!=="hidden"&&r.width>0&&r.height>0;}'
  + 'function all(sel,scope){return [].slice.call((scope||document).querySelectorAll(sel)).filter(shown);}'
  /* 候选带**不管收没收起都算进来**：收起的那些要能证明它真的不在屏上（`hidden` 被作者层的
     `display: flex` 盖掉过一次——2026-09-25 由变异自证读出）。 */
  + 'function traysOf(root){return [].slice.call(root.querySelectorAll(' + TRAY_S + ')).map(function(t){'
  + 'return {key:t.getAttribute("' + QUICK_CAPTURE_TRAY_ATTR + '"),hidden:t.hasAttribute("hidden"),'
  + 'shown:shown(t),items:[].slice.call(t.children).filter(shown).map(box)};});}'
  + 'var cases=[].slice.call(document.querySelectorAll("[data-case]"));'
  + 'var out=[];'
  + 'for(var i=0;i<cases.length;i+=1){'
  + ' var root=cases[i].querySelector(' + ROOT_S + ');'
  + ' var traies=traysOf(root);'
  + ' var open=traies.filter(function(t){return t.shown;});'
  + ' var input=root.querySelector(' + INPUT_S + ');'
  + ' out.push({'
  + '  chips:all(' + CHIP_S + ',root).map(box),'
  + '  picks:all(' + PICK_S + ',root).map(box),'
  + '  keeps:all(' + KEEP_S + ',root).map(box),'
  + '  recalls:all(' + RECALL_S + ',root).map(box),'
  + '  acts:all(' + q(SEL('more') + ',' + SEL('save')) + ',root).map(box),'
  + '  trays:traies,'
  + '  trayCount:traies.length, traysOpen:open.length, traysHidden:traies.filter(function(t){return t.hidden;}).length,'
  + '  ties:[].slice.call(root.querySelectorAll(' + TO_S + ')).map(function(n){'
  + '    var b=box(n);b.text=n.textContent;b.scrollW=n.scrollWidth;b.clientW=n.clientWidth;return b;}),'
  + '  box:box(input), value:input.value,'
  + '  hosts:root.matches(' + HOST_S + ')?1:0});'
  + '}return out;}())';

/** 相邻两枚之间的缝（同一行量左右、折行量上下）：**量未取整的几何**（取整后相减会凭空量出 7px）。 */
function gapsOf(boxes) {
  const out = [];
  for (let i = 1; i < boxes.length; i += 1) {
    const a = boxes[i - 1];
    const b = boxes[i];
    out.push(Math.abs(a.t - b.t) < 3 ? b.l - (a.l + a.w) : b.t - (a.t + a.h));
  }
  return out;
}

describe('quick-capture ④ 四档几何（真机 headless Chrome ＋ CDP · 容器 320／390／620／1280）', async () => {
  const page = await startShapesPage({
    css: skinCss() + '\n' + quickCaptureCss(),
    html: '<div class="ilife-page-ui" data-case="plain">' + renderQuickCapture(PLAIN) + '</div>'
      + '<div class="ilife-page-ui" data-case="bare">' + renderQuickCapture(BARE) + '</div>',
    portOffset: 51,
  });
  if (page === null) {
    it('真机未跑（本机没有 Chrome）：退确定性几何判据', (t) => {
      console.log('quick-capture 几何：真机未跑（本机没有 Chrome），原因=startShapesPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  it('四档零横向溢出、读数零截断、每枚可点件 ≥44 见方、相邻 ≥8px、渲染期一条带都不摊开', async () => {
    for (const width of [320, 390, 620, 1280]) {
      await page.setWidth(width);
      const rows = await page.read(FLOW_SELECTORS);
      const frame = await page.frame();
      let cases = await page.ev(BOX_FN);
      console.log('quick-capture 几何读数 ' + JSON.stringify({ width, frame,
        rows: rows.map((r) => ({ sel: r.sel, visible: r.visible, clipped: r.clipped,
          overflow: Math.max(0, r.maxScrollW - r.maxClientW), scrollsX: r.scrollsX })),
        cases: cases.map((c) => ({ chips: c.chips.length, trayCount: c.trayCount, traysOpen: c.traysOpen,
          traysHidden: c.traysHidden, box: Math.round(c.box.w), value: c.value,
          to: c.ties.map((t) => t.text) })) }));
      assert.ok(frame.fxScrollW <= width + 1, width + ' 档夹具容器横溢：' + JSON.stringify(frame));
      assert.ok(frame.docScrollW <= frame.innerW + 1, width + ' 档页面横溢：' + JSON.stringify(frame));
      for (const r of rows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档 ' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档 ' + r.sel + ' 有节点被压字／截断（读数永不 `…`）：' + JSON.stringify(r));
        assert.equal(r.scrollsX, 0, width + ' 档 ' + r.sel + ' 藏了横滑：' + JSON.stringify(r));
      }
      for (const [at, c] of cases.entries()) {
        const want = at === 0
          ? { chips: CELLS.length, picks: CELLS.reduce((n, x) => n + x.choices.length, 0), keeps: CELLS.length, recalls: RECENT.length }
          : { chips: 2, picks: 5, keeps: 2, recalls: 0 };
        assert.equal(c.chips.length, want.chips, width + ' 档格数不对');
        assert.equal(c.trayCount, want.keeps, width + ' 档候选带条数不对');
        assert.equal(c.traysOpen, 0, width + ' 档渲染期一条候选带都不许摊开（一屏只留一层话）');
        assert.equal(c.traysHidden, c.trayCount,
          width + ' 档收起的候选带必须**真的**不在屏上（`hidden` 与作者层的 `display` 打架过一次）：'
          + JSON.stringify(c.trays));
        assert.equal(c.hosts, 1, width + ' 档宿主只有一个');
        assert.equal(c.value, at === 0 ? PLAIN.text : BARE.text, width + ' 档那一句话原样在输入框里');
        /* 命中盒：每一格、每一枚候选、「不改」、记过的每一条、两颗按钮都要 ≥44 见方。 */
        for (const b of c.chips.concat(c.picks, c.keeps, c.recalls, c.acts)) {
          assert.ok(b.w >= QUICK_CAPTURE_TOUCH_PX && b.h >= QUICK_CAPTURE_TOUCH_PX,
            width + ' 档可点件命中盒不足 44：' + JSON.stringify(b));
        }
        /* 输入框不许被两颗按钮挤没（窄档有下限），高度也要够点得着。 */
        assert.ok(c.box.w >= QUICK_CAPTURE_BOX_MIN_PX - 1, width + ' 档输入框被挤没了：' + JSON.stringify(c.box));
        assert.ok(c.box.h >= QUICK_CAPTURE_TOUCH_PX, width + ' 档输入框太矮：' + JSON.stringify(c.box));
        /* 每一格的读数不与它的格子等宽（没被压）：读数那一格自己不许横向滚动。 */
        for (const t of c.ties) {
          assert.ok(t.scrollW <= t.clientW + 1, width + ' 档读数被压：' + JSON.stringify(t));
          assert.ok(t.text.length > 0, width + ' 档有一格读数是空的');
        }
        /* 相邻触控目标的缝 ≥8px：格与格、记过的与记过的、两颗按钮之间。
           **只在收起态量**：摊开时候选带整条占满一行，格与格之间隔着的那条带不是 flex 的 `gap`
           （量出来是「格 → 带 → 下一格」的距离，量不到那条缝；2026-09-25 由变异自证读出）。 */
        for (const list of [c.chips, c.recalls, c.acts]) {
          for (const g of gapsOf(list)) {
            assert.ok(g >= QUICK_CAPTURE_GAP_PX - 0.5, width + ' 档相邻两枚之间那道缝不足 '
              + String(QUICK_CAPTURE_GAP_PX) + 'px（量到 ' + g.toFixed(2) + '）：' + JSON.stringify(list));
          }
        }
      }
      assert.equal((await page.errs()).length, 0, '页内零未捕获错误');
      /* 摊开全部候选带：候选与「不改」的命中盒与缝只有在摊开时量得到。 */
      await page.ev('[].forEach.call(document.querySelectorAll(' + TRAY_S + '),function(t){t.removeAttribute("hidden");});true');
      const openRows = await page.read(FLOW_SELECTORS);
      cases = await page.ev(BOX_FN);
      for (const r of openRows) {
        assert.ok(r.maxScrollW <= r.maxClientW + 1, width + ' 档（摊开）' + r.sel + ' 溢出：' + JSON.stringify(r));
        assert.equal(r.clipped, 0, width + ' 档（摊开）' + r.sel + ' 有节点被压字：' + JSON.stringify(r));
      }
      console.log('quick-capture 摊开读数 ' + JSON.stringify({ width,
        gaps: cases.map((c) => ({ tray: c.trays.map((t) => gapsOf(t.items).map((g) => Math.round(g * 100) / 100)) })) }));
      for (const c of cases) {
        assert.equal(c.traysOpen, c.trayCount, width + ' 档摊开后每一条带都摊开了');
        for (const g of c.trays.flatMap((t) => gapsOf(t.items))) {
          assert.ok(g >= QUICK_CAPTURE_GAP_PX - 0.5, width + ' 档候选带里相邻两枚之间那道缝不足 '
            + String(QUICK_CAPTURE_GAP_PX) + 'px（量到 ' + g.toFixed(2) + '）');
        }
      }
      assert.equal((await page.errs()).length, 0, '页内零未捕获错误（摊开之后）');
      await page.ev('[].forEach.call(document.querySelectorAll(' + TRAY_S + '),function(t){t.setAttribute("hidden","");});true');
    }
  });

  it('关页', () => { page.close(); });
});

/* ── ⑤ 行为（真机 · **真指针**） ───────────────────────────────────── */

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
 * 起一页**真指针**夹具（本件自持）。为什么不用现成的 `startShapesPage()`：
 * 它只把**夹具容器**改宽、也没有输入通道；测试件里那些 `el.click()` 是**合成事件**
 * ——绕过命中测试（被盖住、零宽零高的元素它照样点得动）⇒ 能在一份「真用户走不通」的通路上全绿。
 * 这一段一律走 CDP 的 `Input.dispatchMouseEvent`（moved／pressed／released）与 `Input.insertText`。
 */
async function startPointerPage(opts) {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const width = opts.width === undefined ? 390 : opts.width;
  const height = opts.height === undefined ? 900 : opts.height;
  const events = [QUICK_CAPTURE_EVENT_CHANGE, QUICK_CAPTURE_EVENT_PICK, QUICK_CAPTURE_EVENT_SAVE,
    QUICK_CAPTURE_EVENT_SPLIT];
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>'
    + opts.css + '\nhtml,body{margin:0;padding:0}#ptr{padding:10px 12px}\n'
    + '</style></head>\n<body>\n<div id="ptr" class="ilife-page-ui ' + skinClass(SKIN_NAMES[0]) + '">'
    + opts.html + '</div>\n'
    + '<script>window.__errs=[];window.addEventListener("error",function(e){window.__errs.push(String(e.message));});'
    + 'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rejection:"+String(e.reason));});</script>\n'
    + '<script>window.__ev=[];window.__tl=[];' + JSON.stringify(events) + '.forEach(function(n){'
    + 'document.addEventListener(n,function(e){var d=e.detail||{};window.__ev.push({name:n,id:d.id,text:d.text,'
    + 'key:d.key,value:d.value,to:d.to,cells:d.cells});});});'
    + '["pointerdown","pointerup","click"].forEach(function(n){document.addEventListener(n,function(e){'
    + 'var t=e.target;window.__tl.push(n+"|"+(t&&t.getAttribute?String(t.getAttribute("'
    + QUICK_CAPTURE_PICK_ATTR + '")||t.getAttribute("' + QUICK_CAPTURE_CELL_ATTR + '")||t.getAttribute("'
    + QUICK_CAPTURE_SAVE_ATTR + '")||t.getAttribute("' + QUICK_CAPTURE_KEEP_ATTR + '")||"?"):"?"));},true);});</script>\n'
    + '<script>' + buildQuickCaptureJs() + '</script>\n</body></html>';
  const dir = mkdtempSync(join(tmpdir(), 't-qcap-pointer-'));
  const pageFile = join(dir, 'fixture.html');
  writeFileSync(pageFile, html, 'utf8');
  const profileDir = mkdtempSync(join(tmpdir(), 't-qcap-pointer-chrome-'));
  const port = 9880 + (process.pid % 120) + (opts.portOffset === undefined ? 0 : opts.portOffset);
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
    await s('Page.navigate', { url: pathToFileURL(pageFile).href });
    for (let i = 0; i < 100; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(40); }
    await sleep(300);
    return {
      ev,
      sleep,
      /** 真指针序列：moved → pressed → released（**不是** `element.click()`，那会绕过命中测试）。 */
      async pointerClick(sel, index) {
        const at = await ev('(function(){var all=document.querySelectorAll(' + JSON.stringify(sel) + ');'
          + 'var el=all[' + String(index === undefined ? 0 : index) + '];'
          + 'if(!el)return null;el.scrollIntoView({block:"center"});var r=el.getBoundingClientRect();'
          + 'return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),'
          + 'h:Math.round(r.height),disp:getComputedStyle(el).display};}())');
        assert.ok(at !== null, '真指针点不到：' + sel + '（第 ' + String(index === undefined ? 0 : index) + ' 个）');
        await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y, button: 'none', buttons: 0 });
        await sleep(16);
        await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', buttons: 1, clickCount: 1 });
        await sleep(24);
        await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', buttons: 0, clickCount: 1 });
        await sleep(200);
        return at;
      },
      /** 真键入：先真点进那一格（拿真焦点），再 `Input.insertText`。 */
      async pointerType(sel, text) {
        await this.pointerClick(sel);
        await s('Input.insertText', { text });
        await sleep(200);
      },
      events: () => ev('window.__ev.slice()'),
      seq: () => ev('window.__tl.slice()'),
      clearEvents: () => ev('window.__ev=[];window.__tl=[];true'),
      errs: () => ev('window.__errs'),
      /** 回到开页时那一份（`it` 之间是同一张页；每条行为判据都从同一个出发状态开始）。 */
      async reset() {
        await s('Page.navigate', { url: pathToFileURL(pageFile).href });
        for (let i = 0; i < 100; i += 1) {
          if (await ev('document.readyState === "complete"') === true) break;
          await sleep(40);
        }
        await sleep(200);
      },
      close() { ws.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('quick-capture ⑤ 行为（真机 · 真指针 CDP Input）', async () => {
  const p = await startPointerPage({
    css: skinCss() + '\n' + quickCaptureCss(),
    html: renderQuickCapture(PLAIN),
    portOffset: 52,
  });
  if (p === null) {
    it('真机未跑（本机没有 Chrome）：行为判据跳过', (t) => {
      console.log('quick-capture 行为：真机未跑（本机没有 Chrome），原因=startPointerPage 返回 null');
      t.skip('本机没有 Chrome');
    });
    return;
  }

  const CELL = (key) => ATTR(QUICK_CAPTURE_CELL_ATTR + '="' + key + '"');
  const PICK = (key) => ATTR(QUICK_CAPTURE_PICK_ATTR + '="' + key + '"');
  const TRAY = (key) => ATTR(QUICK_CAPTURE_TRAY_ATTR + '="' + key + '"');
  const CHIP_SEL = (key) => SEL('chip') + CELL(key);
  const TRAY_SEL = (key) => SEL('tray') + TRAY(key);
  const PICK_SEL = (key) => SEL('pick') + PICK(key);
  const KEEP_SEL = (key) => SEL('keep') + ATTR(QUICK_CAPTURE_KEEP_ATTR + '="' + key + '"');
  const SAVE_SEL = SEL('save');
  const MORE_SEL = SEL('more');
  /** 记过的一条：按它在带里第几个来点（同一个类名重复出现，选择器认不出是哪一句）。 */
  const RECALL_AT = RECENT.indexOf(RECENT[1]);

  /** 一份页内快照：那一句话的两处读数、每一格的机器键与屏上读数、带摊开没摊开、候选选中没选中。 */
  const SNAP = '(function(){var root=document.querySelector(' + ROOT_S + ');'
    + 'function list(sel){return [].slice.call(root.querySelectorAll(sel));}'
    + 'var input=root.querySelector(' + INPUT_S + ');'
    + 'return {textAttr:root.getAttribute(' + q(QUICK_CAPTURE_TEXT_ATTR) + '),value:input.value,'
    + 'bound:root.getAttribute(' + q(QUICK_CAPTURE_BOUND_ATTR) + '),'
    + 'cells:list(' + CHIP_S + ').map(function(c){'
    + 'var read=c.querySelector(' + q(ATTR(QUICK_CAPTURE_READ_ATTR)) + ');'
    + 'return {key:c.getAttribute(' + q(QUICK_CAPTURE_CELL_ATTR) + '),'
    + 'value:c.getAttribute(' + q(QUICK_CAPTURE_VALUE_ATTR) + '),'
    + 'read:read?read.textContent:"",expanded:c.getAttribute("aria-expanded"),'
    + 'open:c.classList.contains("is-open"),added:c.classList.contains("is-added")};}),'
    + 'trays:list(' + TRAY_S + ').map(function(t){return {key:t.getAttribute('
    + q(QUICK_CAPTURE_TRAY_ATTR) + '),hidden:t.hasAttribute("hidden")};}),'
    + 'picks:list(' + PICK_S + ').map(function(o){return {key:o.getAttribute('
    + q(QUICK_CAPTURE_PICK_ATTR) + '),on:o.classList.contains("is-on"),'
    + 'current:o.getAttribute("aria-current")};})};}())';
  const openKeys = (snap) => snap.trays.filter((t) => !t.hidden).map((t) => t.key);
  const onKeys = (snap) => snap.picks.filter((o) => o.on).map((o) => o.key);
  const cellOf = (snap, key) => snap.cells.find((c) => c.key === key);

  /** 真指针点一下 ＋ **可达性**：宽高非零且不小于触控地板，那一点上命中的就是它自己（或它的孩子）。 */
  const tapAt = async (sel, index) => {
    const at = await p.pointerClick(sel, index);
    assert.ok(at.w > 0 && at.h > 0, '真指针要点的元素量出来是零宽／零高（屏上到不了它）：' + sel + ' ' + JSON.stringify(at));
    assert.ok(at.w >= QUICK_CAPTURE_TOUCH_PX && at.h >= QUICK_CAPTURE_TOUCH_PX,
      '真指针要点的元素命中盒不足 ' + String(QUICK_CAPTURE_TOUCH_PX) + '：' + sel + ' ' + JSON.stringify(at));
    return at;
  };

  it('点某一格摊开**它自己的**候选带（其余先收；再点一下收起）；这一步一条事件都不派', async () => {
    await p.reset();
    await p.clearEvents();
    const before = await p.ev(SNAP);
    assert.deepEqual(openKeys(before), [], '开页时一条带都不摊开（收起的候选带不算上屏）');
    const at = await tapAt(CHIP_SEL('category'));
    let snap = await p.ev(SNAP);
    console.log('quick-capture 真指针摊开 ' + JSON.stringify({ at, open: openKeys(snap), cell: cellOf(snap, 'category') }));
    assert.deepEqual(openKeys(snap), ['category'], '只摊开被点的那一格');
    assert.equal(cellOf(snap, 'category').expanded, 'true', '那一格的无障碍态跟着改');
    assert.equal(cellOf(snap, 'category').open, true, '那一格挂上「正在改」的形（is-open）');
    assert.equal(cellOf(snap, 'amount').open, false, '别的格没有这一档形');
    await tapAt(CHIP_SEL('amount'));
    snap = await p.ev(SNAP);
    assert.deepEqual(openKeys(snap), ['amount'], '换一格＝旧的先收（一次只摊开一格）');
    assert.equal(cellOf(snap, 'category').expanded, 'false', '旧那一格的无障碍态落回');
    await tapAt(CHIP_SEL('amount'));
    snap = await p.ev(SNAP);
    assert.deepEqual(openKeys(snap), [], '再点一下收起');
    assert.equal((await p.events()).length, 0, '摊开／收起只是看，一条事件都不派');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('点一枚候选改掉那一格：**真指针完整事件序列** ＋ 机器读数／屏上读数／候选选中态三处一起翻', async () => {
    await p.reset();
    await p.clearEvents();
    await tapAt(CHIP_SEL('category'));
    const antes = await p.ev(SNAP);
    assert.equal(cellOf(antes, 'category').value, 'canyin', '出发前这一格认成「餐饮」');
    await tapAt(PICK_SEL('jiaotong'));
    const snap = await p.ev(SNAP);
    const seq = await p.seq();
    const evts = await p.events();
    const was = seq.slice(-3);
    console.log('quick-capture 真指针改一格 ' + JSON.stringify({ was, cell: cellOf(snap, 'category'),
      on: onKeys(snap), evt: evts[evts.length - 1] }));
    /* 完整事件序列：三条都落在那一枚候选上（浏览器自己合成的那枚 `click` 也在）。 */
    assert.deepEqual(was, ['pointerdown|jiaotong', 'pointerup|jiaotong', 'click|jiaotong'],
      '真指针点一下的完整事件序列（三条都落在那一枚候选上）：' + JSON.stringify(seq));
    assert.deepEqual(openKeys(snap), [], '改完带子收起');
    assert.equal(cellOf(snap, 'category').value, 'jiaotong', '机器读数改成新的那一枚');
    assert.equal(cellOf(snap, 'category').read, '交通', '屏上读数跟着换成同一枚的名字');
    assert.equal(cellOf(snap, 'category').open, false, '「正在改」的形落回');
    assert.deepEqual(onKeys(snap), ['jiaotong', 'y32', 'cash', 'today'], '**每一格恰好一枚候选是现在这一枚**（换的那一枚挪过去了）');
    assert.deepEqual(evts.map((e) => e.name + '|' + e.key + '|' + e.value + '|' + e.to),
      [QUICK_CAPTURE_EVENT_PICK + '|category|jiaotong|交通'], '只派发一条事件，带的是改完之后那一格的读数');
    const one = await p.ev('(function(){var o=document.querySelector(' + JSON.stringify(PICK_SEL('jiaotong')) + ');'
      + 'return {current:o.getAttribute("aria-current"),cls:o.className};}())');
    assert.equal(one.current, 'true', '新那一枚带 aria-current');
    assert.equal(one.cls.includes('is-on'), true, '新那一枚挂 is-on');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('「不改」＝取消：**真指针点它** → 带收起、那一格一动不动、一条事件都不派', async () => {
    await p.reset();
    await p.clearEvents();
    const antes = await p.ev(SNAP);
    await tapAt(CHIP_SEL('account'));
    const opened = await p.ev(SNAP);
    assert.deepEqual(openKeys(opened), ['account'], '先摊开这一格');
    await tapAt(KEEP_SEL('account'));
    const snap = await p.ev(SNAP);
    console.log('quick-capture 真指针取消 ' + JSON.stringify({ cell: cellOf(snap, 'account'), evts: (await p.events()).length }));
    assert.deepEqual(openKeys(snap), [], '带子收起');
    assert.equal(cellOf(snap, 'account').value, antes.cells.find((c) => c.key === 'account').value, '值一动不动');
    assert.equal(cellOf(snap, 'account').read, '现金账户', '屏上读数一动不动');
    assert.deepEqual(onKeys(snap), ['canyin', 'y32', 'cash', 'today'], '候选带里的选中一枚没挪窝');
    assert.equal((await p.events()).length, 0, '没变化就不报数：一条事件都不派');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('「存」：**真指针点它** → 报出那句话与每一格现在的读数（顺序＝屏上顺序）', async () => {
    await p.reset();
    await p.clearEvents();
    await tapAt(CHIP_SEL('date'));
    await tapAt(PICK_SEL('yest'));
    await tapAt(SAVE_SEL);
    const evts = await p.events();
    const snap = await p.ev(SNAP);
    console.log('quick-capture 真指针存 ' + JSON.stringify(evts));
    assert.deepEqual(evts.map((e) => e.name), [QUICK_CAPTURE_EVENT_PICK, QUICK_CAPTURE_EVENT_SAVE],
      '先改一格再存：两条事件，各一条');
    const save = evts[1];
    assert.equal(save.id, PLAIN.id);
    assert.equal(save.text, snap.value, '存出去的那句话＝输入框里那一句');
    assert.deepEqual(save.cells, snap.cells.map((c) => ({ key: c.key, value: c.value, to: c.read })),
      '存出去的是每一格**现在的**读数（机器键 ＋ 屏上那一串），顺序＝屏上顺序');
    assert.deepEqual(save.cells.map((c) => c.key), CELLS.map((c) => c.key), '顺序与入参一致');
    assert.equal(cellOf(snap, 'date').value, 'yest', '存之前刚改的那一格读的是「昨天」');
    assert.equal(cellOf(snap, 'date').read, '昨天', '屏上读数与机器读数同一枚');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('「分开填」：**真指针点它** → 报一条「去字段表单」（本件不开表单）', async () => {
    await p.reset();
    await p.clearEvents();
    await tapAt(MORE_SEL);
    const evts = await p.events();
    assert.deepEqual(evts.map((e) => e.name), [QUICK_CAPTURE_EVENT_SPLIT], '只派发分开填那一条');
    assert.equal(evts[0].id, PLAIN.id);
    assert.equal(evts[0].text, PLAIN.text, '带的是现在那一句话（表单要按它预填）');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('点一条记过的：**真指针点它** → 把那句话填回输入框（不打字也能换一句话）', async () => {
    await p.reset();
    await p.clearEvents();
    const said = RECENT[1];
    await tapAt(SEL('recall'), RECALL_AT);
    const snap = await p.ev(SNAP);
    const evts = await p.events();
    assert.equal(snap.value, said, '输入框里换成那一句');
    assert.equal(snap.textAttr, said, '机器读数与它一起写（两处摆法同一件事）');
    assert.deepEqual(evts.map((e) => e.name + '|' + e.text), [QUICK_CAPTURE_EVENT_CHANGE + '|' + said],
      '派一条「那句话变了」');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('真打字（走 CDP 的输入通道）：**先真点进输入框**再键入 → 句子变了就报一条', async () => {
    await p.reset();
    await p.clearEvents();
    /* 先清空（这是**布置**不是动作：动作走指针／CDP 输入通道），好让键入的位置确定。 */
    await p.ev('document.querySelector(' + INPUT_S + ').value="";true');
    await p.pointerType(SEL('input'), '晚饭 45 元 招行');
    const snap = await p.ev(SNAP);
    const evts = await p.events();
    console.log('quick-capture 真打字 ' + JSON.stringify({ value: snap.value, evts }));
    assert.equal(snap.value, '晚饭 45 元 招行', '键入真的进了那一格');
    assert.equal(snap.textAttr, snap.value, '机器读数与输入框里的字一起写');
    assert.deepEqual(evts.map((e) => e.name), [QUICK_CAPTURE_EVENT_CHANGE], '报一条「那句话变了」');
    assert.equal(evts[0].text, snap.value, '带的是新句子');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('重复注入只绑一次：第二遍整段直接返回（根上那枚 bound 读数也在）', async () => {
    await p.reset();
    const before = await p.ev(SNAP);
    assert.equal(before.bound, '1', '根上记一枚 bound 读数');
    const rt = await p.ev('document.documentElement.getAttribute(' + q(QUICK_CAPTURE_RUNTIME_ATTR) + ')');
    assert.equal(rt, '1', '幂等开关挂在 <html> 上');
    await p.ev(buildQuickCaptureJs());
    await p.ev(buildQuickCaptureJs());
    await p.clearEvents();
    await tapAt(CHIP_SEL('category'));
    const snap = await p.ev(SNAP);
    assert.deepEqual(openKeys(snap), ['category'], '第二遍注入没有把事件绑乱（点一下仍然只摊开一格）');
    assert.equal((await p.events()).length, 0, '摊开仍然不派事件');
    assert.equal((await p.errs()).length, 0, '页内零未捕获错误');
  });

  it('关页', () => { p.close(); });
});
