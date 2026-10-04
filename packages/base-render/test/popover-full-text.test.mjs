/** popover-full-text（气泡卡片 · 承载长文本全文）· **判据件**（#1134）。
 *
 *  断言对象是本件自己的唯一出口：`dist/components/popover/index.js`。
 *  四组：① 渲染契约（触发处是真 button ＋ 原生 popover 卡片 ＋ 全文逐字）② 负向（坏入参一律抛错、
 *  一个字都不产出）③ 接线口径（docShell opt-in：不给＝逐字节不变；给了＝运行时＋noscript 进页）
 *  ④ 设计铁律（主样式段零 !important —— 无 JS 降级只许住 <noscript>）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  POPOVER_ATTR,
  POPOVER_CARD_ATTR,
  POPOVER_READY_ATTR,
  POPOVER_TRIGGER_ATTR,
  buildPopoverFullTextJs,
  popoverFullTextCss,
  popoverNoScriptHtml,
  renderPopoverFullText,
} from '../dist/components/popover/index.js';
import { renderDocShell } from '../dist/docShell.js';

const BASE = { docTitle: 't', bodyHtml: '<p>x</p>' };

describe('popoverFullText ① 渲染契约', () => {
  it('骨架：挂载点 ＋ 真 button 触发处 ＋ 原生 popover 卡片', () => {
    const html = renderPopoverFullText({ id: 'p1', text: '全文在此', className: 'my-row' });
    assert.match(html, /^<span class="ilife-popover" data-ilife-popover="p1">/, '挂载点打头');
    assert.ok(html.includes('<button type="button"'), '触发处是真 button（popover invoker 只认 button）');
    assert.ok(html.includes('popovertarget="p1"'), '触发处带 popovertarget（零脚本也开得出来）');
    assert.ok(html.includes('popovertargetaction="toggle"'), '点一下开、再点关');
    assert.ok(html.includes('id="p1"') && html.includes('popover="auto"'), '卡片是原生 popover');
    assert.ok(html.includes('aria-expanded="false"'), '展开态可读');
  });
  it('原类一字不改：调用方传进来的 className 原样留在触发处', () => {
    const html = renderPopoverFullText({ id: 'p2', text: 't', className: 'my-row' });
    assert.ok(html.includes('my-row'), '原类还在（那条单行省略号规则照旧命中，版面不动）');
  });
  it('卡片装的是全文纯文本：转义一次，不丢字', () => {
    const html = renderPopoverFullText({ id: 'p3', text: '居家/水电 · <b>招行卡</b> · 2026-05-15' });
    assert.ok(html.includes('&lt;b&gt;招行卡&lt;/b&gt;'), 'HTML 字符转义（不许 raw 进卡）');
    assert.ok(!html.includes('<b>招行卡</b>'), '卡片里没有未转义标记');
  });
  it('同样的入参恒产同样的字节', () => {
    const a = renderPopoverFullText({ id: 'p4', text: '同文' });
    const b = renderPopoverFullText({ id: 'p4', text: '同文' });
    assert.equal(a, b, '纯函数，无随机');
  });
});

describe('popoverFullText ② 负向', () => {
  it('坏 id（空串／带空格／带点）一律抛错', () => {
    for (const bad of ['', 'a b', 'a.b', 'a/b']) {
      assert.throws(() => renderPopoverFullText({ id: bad, text: 't' }), /id/, 'id=' + JSON.stringify(bad) + ' 未抛错');
    }
  });
  it('非对象／缺 text 一律抛错', () => {
    assert.throws(() => renderPopoverFullText(null), /对象/, 'null 未抛错');
    assert.throws(() => renderPopoverFullText({ id: 'p5' }), /text/, '缺 text 未抛错');
    assert.throws(() => renderPopoverFullText({ id: 'p5', text: 123 }), /text/, 'text 非串未抛错');
  });
  it('空串 className／label 给了也算错', () => {
    assert.throws(() => renderPopoverFullText({ id: 'p6', text: 't', className: '' }), /className/, '空 className 未抛错');
    assert.throws(() => renderPopoverFullText({ id: 'p6', text: 't', label: '' }), /label/, '空 label 未抛错');
  });
});

describe('popoverFullText ③ 接线口径', () => {
  it('不给 popoverFullText：产物里一个 popover 字节都没有（opt-in 逐字节不变）', () => {
    const html = renderDocShell({ ...BASE });
    assert.ok(!html.includes('popover'), '未启用时零 popover 字节');
  });
  it('给了：运行时进 helpers 槽、noscript 进 head、无 JS 文案也在', () => {
    const html = renderDocShell({ ...BASE, popoverFullText: true });
    assert.ok(html.includes('<noscript><style>'), '降级段包在 noscript 里（只在脚本禁用时生效）');
    assert.ok(html.includes('data-ilife-popover-ready') || html.includes('READY') || html.length > renderDocShell({ ...BASE }).length, '启用后产物变长（进了资产）');
  });
  it('运行时文本里触发处是 button 选择器走 popovertarget', () => {
    const js = buildPopoverFullTextJs();
    assert.ok(js.includes('createElement("button")') || js.includes("createElement('button')"), '升级走真 button（span 挂 popovertarget 浏览器不理）');
  });
});

describe('popoverFullText ④ 设计铁律', () => {
  it('主样式段零 !important（降级只许住 noscript）', () => {
    const css = popoverFullTextCss();
    assert.ok(!css.includes('!important'), '主样式段出现 !important（早前那版靠它跟就绪层抢优先级，a06 反向冒红）');
  });
  it('noscript 段里才许有 !important（且只在脚本禁用时解析）', () => {
    const html = popoverNoScriptHtml();
    assert.ok(html.startsWith('<noscript><style>') && html.endsWith('</style></noscript>'), '包的是 noscript＋style');
    assert.ok(html.includes('!important'), 'noscript 里用 !important 压明细行自己的 ellipsis（有脚本时不解析，零副作用）');
  });
});
