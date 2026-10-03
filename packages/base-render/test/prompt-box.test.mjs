// prompt-box · 判据件（#1114 续做）：`paper` 形态＝判地 x01 `.prompt-box` 那枚暖底纯文本框。
// 判地＝`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>（几何账同目录 214 条第 88 条）。
// 口径：① card 形态逐字节不动（加法式）② paper 形态的标记与判地几何 ③ 拒收（静默吞掉＝拼错字段名还绿）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PROMPT_BOX_CLASS,
  PROMPT_BOX_FORMS,
  PROMPT_BOX_SLOTS,
  promptBoxCss,
  promptBoxSlot,
  renderPromptBox,
} from '../dist/components/prompt-box/index.js';

const LF = String.fromCharCode(10);

describe('prompt-box ① 形态闭集与拒收', () => {
  it('闭集＝card／paper 两格', () => {
    assert.deepEqual([...PROMPT_BOX_FORMS], ['card', 'paper']);
  });
  it('paper 不带 label／copyText／hint（判地那枚是纯文本框，给了一律拒）', () => {
    for (const extra of [{ label: 'x' }, { copyText: '复制' }, { hint: 'x' }]) {
      assert.throws(() => renderPromptBox({ text: 'a', form: 'paper', ...extra }), /form:paper 不带/);
    }
  });
  it('闭集外的形态拒', () => {
    assert.throws(() => renderPromptBox({ text: 'a', form: 'nope' }), /form 必须是/);
  });
  it('正文空串／非串拒', () => {
    assert.throws(() => renderPromptBox({ text: '', form: 'paper' }), /text/);
    assert.throws(() => renderPromptBox({ text: 1, form: 'paper' }), /text/);
  });
});

describe('prompt-box ② paper 形态的标记', () => {
  it('只出正文：根带 is-paper 与发现锚，正文住 -body 槽，且没有标题与按钮', () => {
    const html = renderPromptBox({ text: '第一行' + LF + '第二行', form: 'paper' });
    assert.equal(html.startsWith('<div class="' + PROMPT_BOX_CLASS + ' is-paper" data-ilife-prompt-box="1">'), true, html);
    assert.equal(html.includes('<p class="' + promptBoxSlot('body') + '">第一行' + LF + '第二行</p>'), true, html);
    assert.equal(html.includes('<button'), false, 'paper 形态不出复制按钮');
    assert.equal(html.includes(promptBoxSlot('head')), false, 'paper 形态不出标题');
    assert.equal(html.includes(promptBoxSlot('copy')), false);
  });
  it('用户串只经转义（换行与空格原样保留）', () => {
    const html = renderPromptBox({ text: '<b>a</b>  b', form: 'paper' });
    assert.equal(html.includes('&lt;b&gt;a&lt;/b&gt;  b'), true, html);
  });
  it('extraClass 照旧接在 is-paper 之后', () => {
    const html = renderPromptBox({ text: 'a', form: 'paper', extraClass: 'mine' });
    assert.equal(html.includes(' is-paper mine"'), true, html);
  });
});

describe('prompt-box ③ card 形态逐字节不动（加法式）', () => {
  it('缺省形态仍是 card：pre 正文 ＋ 复制按钮', () => {
    const html = renderPromptBox({ text: 'a' + LF + 'b' });
    assert.equal(html.startsWith('<div class="' + PROMPT_BOX_CLASS + ' is-card" data-ilife-prompt-box="1">'), true, html);
    assert.equal(html.includes('<pre class="' + promptBoxSlot('body') + '">a' + LF + 'b</pre>'), true, html);
    assert.equal(html.includes(promptBoxSlot('copy') + '" data-ilife-prompt-copy="1">复制</button>'), true, html);
  });
});

describe('prompt-box ④ paper 档的样式＝判地字面', () => {
  const css = promptBoxCss();
  it('判地那几条逐条在（底／边／圆角／内距／字号／行高／字色／pre-wrap）', () => {
    for (const want of ['background: #fbf7ec', 'border-radius: 12px', 'padding: 12px 13px 11px', 'color: #5f574a', 'font-size: 13.5px', 'line-height: 1.7', 'white-space: pre-wrap', 'overflow-wrap: anywhere']) {
      assert.equal(css.includes(want), true, '缺：' + want);
    }
  });
  it('授权字面逐值带出处那句话（同一个字符串里既有字面也有「判地字面 · 授权照抄」）', () => {
    for (const line of css.split(LF)) {
      if (!/#[0-9a-f]{6}|border-radius: 12px|13\.5px/.test(line)) continue;
      if (!line.includes('.is-paper') && !line.includes('is-paper')) continue;
      assert.equal(/授权照抄/.test(line), true, '缺出处：' + line);
    }
  });
  it('paper 正文槽把 card 那套（等宽／底／最小高）收回', () => {
    assert.equal(css.includes('.is-paper .' + promptBoxSlot('body')), true, css);
    const seg = css.slice(css.indexOf('.is-paper .' + promptBoxSlot('body')));
    for (const want of ['min-height: 0', 'background: none', 'font-family: inherit', 'font-size: inherit']) {
      assert.equal(seg.slice(0, 400).includes(want), true, '缺：' + want);
    }
  });
  it('槽位闭集没动（五个槽仍是原样）', () => {
    assert.deepEqual([...PROMPT_BOX_SLOTS], ['head', 'body', 'copy', 'action', 'hint']);
  });
});
