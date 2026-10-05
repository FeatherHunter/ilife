/** #1001 第 4 期 · **产物面计算值门禁**：真渲染生成页 → 枚举可聚焦文本录入控件 → 断言
 *  `parseFloat(getComputedStyle(el).fontSize) ≥ PAGE_LIMITS.textEntryMinPx`。
 *
 *  **为什么不能只扫源码**：静态正则看不见三类面——① 字号写成表达式（`skinVar('fs-sm')`）的；
 *  ② 规则里根本不写 `font-size`、吃祖先字号的；③ 被别处更高权规则覆盖的。只有把**真产物 CSS
 *  灌进真浏览器、量真元素的计算值**，这三类才一起被兜住。故本件是「真机门禁」，不是静态锁
 *  （静态那半在 `text-entry-min-font-1001.test.mjs`：源码与产物同锁 ＋ 范围锁 ＋ 变异自证）。
 *
 *  **页清单只许变长**：`PAGES` 是产品里**带文本录入控件**的页面清单；加页是正常动作，删页＝红。
 *  **无调用点的选择器不上锁**：只锁真渲染出来的元素，不锁模板里没人调的类（如 `.fp-input`）。
 *
 *  **本件只覆盖共享层**：技能侧手写覆盖（`.pe-param input` 等）随第 5 期逐包并入，届时往 `PAGES` 加页。
 *  共享层里**已知**仍低于下限的 5 处（bulk-bar 确认框／date-range／wizard-shell 答案框／quick-capture／
 *  search-field，读数见票面「遗留出口」）**还没进本清单**——它们一进来就是红的；随修随加。
 *
 *  运行（**单独跑**：全量套件里十几个用例同时起无头 Chrome 会争用成 `CDP 未就绪`）：
 *  `node --test packages/base-render/test/text-entry-computed-1001.test.mjs`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildSharedHelpersJs, buildStyleSheet, pageUiCss, STYLE_PREFIX } from '../dist/index.js';
import { blocksCss, renderParamForm } from '../dist/blocks.js';
import { skinCss } from '../dist/components/skin/index.js';
import { NON_ENTRY_INPUT_TYPES, PAGE_LIMITS } from '../dist/pageUi.js';
import { startControlsPage } from './input-controls-probe.mjs';

/** 产物 CSS 的唯一拼法：皮肤段 ＋ 页面级配方 ＋ 共享样式表 ＋ 区块样式资产（与页面装配同源）。 */
const CSS = [
  skinCss(),
  pageUiCss({ prefix: STYLE_PREFIX }),
  buildStyleSheet().css,
  blocksCss({ prefix: STYLE_PREFIX }),
].join('\n');

const WIDTHS = [390, 1280];
const MIN_PX = PAGE_LIMITS.textEntryMinPx;

/** 参数表单区块页（真渲染：`renderParamForm`）。 */
function paramFormBody() {
  return renderParamForm({
    description: '记一笔：参数表单（共享层区块）',
    fields: [
      { name: 'amount', label: '金额', value: '500.5', hint: '0.00', required: true, unit: '元' },
      { name: 'account', label: '账户', value: 'cmb', options: [{ value: 'cmb', label: '招商银行储蓄卡' }, { value: 'cash', label: '现金' }] },
      { name: 'date', label: '日期', value: '2026-10-03', hint: '选填' },
      { name: 'note', label: '备注', value: '与朋友聚餐 AA，含服务费', hint: '选填', helpText: '最多 50 字' },
    ],
  });
}

/** HELP 速查台页：搜索框与参数字段输入框由**运行时**（`buildSharedHelpersJs()`）注入，
 *  故标记只给「挂载点」：shell ＋ tab-bar ＋ 带 prompt／field-value 的卡。 */
function helpShellBody() {
  return '<div class="ilife-help-shell">'
    + '<div class="ilife-help-shell-tab-bar"><button type="button" class="ilife-help-shell-tab">记录</button></div>'
    + '<div class="ilife-help-shell-card">'
    + '<div class="ilife-help-shell-card-top"></div>'
    + '<pre class="ilife-help-shell-prompt">记一餐 {meal}</pre>'
    + '<ul class="ilife-help-shell-fields">'
    + '<li class="ilife-help-shell-field"><span class="ilife-help-shell-field-label">餐别</span>'
    + '<span class="ilife-help-shell-field-value">午餐</span>'
    + '<span class="ilife-help-shell-field-hint">选填</span></li>'
    + '</ul>'
    + '</div></div>';
}

/** 页清单（**只许变长**）。 */
const PAGES = [
  { name: '参数表单区块页', body: paramFormBody() },
  { name: 'HELP 速查台页', body: helpShellBody() },
];

/** 页内读数：枚举可聚焦文本录入控件 ＋ 逐枚取计算字号。
 *  **排除集与地板选择器同源**（`NON_ENTRY_INPUT_TYPES`）——一个概念只许一处定义。 */
const EXCLUDED_TYPES = JSON.stringify(NON_ENTRY_INPUT_TYPES.map((t) => t.toLowerCase()));
const MEASURE = '(function(){'
  + 'var NON=' + EXCLUDED_TYPES + ';'
  + 'function isEntry(el){'
  + 'if(el.tagName==="TEXTAREA"||el.tagName==="SELECT")return true;'
  + 'var t=(el.getAttribute("type")||"text").toLowerCase();'
  + 'return NON.indexOf(t)<0;}'
  + 'var all=[].slice.call(document.querySelectorAll("input,select,textarea"));'
  + 'return all.filter(isEntry).map(function(el){'
  + 'var cs=getComputedStyle(el);'
  + 'return {cls:String(el.className),tag:el.tagName.toLowerCase(),type:el.getAttribute("type")||"",'
  + 'px:parseFloat(cs.fontSize),display:cs.display,visible:el.offsetParent!==null,disabled:el.disabled===true};});'
  + '}())';

describe('#1001 ④ 产物面计算值门禁', () => {
  it('页清单只许变长（本件至少覆盖两页）', () => {
    assert.ok(PAGES.length >= 2, '页清单被删短了：' + PAGES.length);
    for (const page of PAGES) assert.ok(page.body.length > 0, page.name + ' 是空页');
  });

  for (const page of PAGES) {
    it(page.name + '：每枚可聚焦文本录入控件的计算字号 ≥ ' + MIN_PX + 'px（390／1280）', async (t) => {
      const p = await startControlsPage({ css: CSS, runtime: buildSharedHelpersJs(), body: page.body, widths: WIDTHS });
      if (p === null) return t.skip('本机无 Chrome／Chromium：本件退化为静态锁（text-entry-min-font-1001.test.mjs）');
      try {
        for (const width of WIDTHS) {
          const list = await p.at(width, MEASURE);
          const why = page.name + ' @' + width + '：';
          assert.ok(Array.isArray(list), why + '读数不是数组');
          assert.ok(list.length >= 1, why + '一枚文本录入控件都没量到（页面没渲染出来？）');
          /* 机器可读摘要行（协议 §2.2.3）：复核只读这一行，明细在断言里。 */
          console.log('RESULT 页=' + page.name + ' 宽=' + width + ' 控件=' + list.length
            + ' 最小字号=' + Math.min(...list.map((r) => r.px)) + 'px 下限=' + MIN_PX + 'px'
            + ' 明细=' + list.map((r) => r.tag + '/' + r.px).join(','));
          for (const r of list) {
            assert.ok(r.visible && r.display !== 'none', why + '量到不可见控件 ' + r.cls);
            assert.ok(r.px >= MIN_PX, why + r.tag + '.' + r.cls + ' 计算字号 ' + r.px + 'px < 下限 ' + MIN_PX + 'px');
          }
        }
      } finally {
        p.close();
      }
    });
  }

  it('判式自证：页内把字号压到 13px，读数必须跟着降到下限之下（否则本件绿而无鉴别力）', async (t) => {
    const p = await startControlsPage({ css: CSS, runtime: buildSharedHelpersJs(), body: PAGES[0].body, widths: [390] });
    if (p === null) return t.skip('本机无 Chrome／Chromium');
    try {
      const before = await p.at(390, MEASURE);
      assert.ok(before.every((r) => r.px >= MIN_PX), '前置：正常态应全部 ≥ 下限');
      await p.ev('(function(){var s=document.createElement("style");'
        + 's.textContent="input,select,textarea{font-size:13px !important}";document.head.appendChild(s);return true;}())');
      const after = await p.ev(MEASURE);
      assert.ok(after.some((r) => r.px < MIN_PX), '压到 13px 后读数仍 ≥ 下限 ⇒ 判式没咬住字号');
    } finally {
      p.close();
    }
  });
});
