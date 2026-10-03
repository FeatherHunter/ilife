// ticket-button · 判据件（#1113：票据纸主按钮 ＋ **新增的禁用态公开形状位**）。
//
// 判地＝docs/skills/skill-bill/proto/acct-goal/b01-新增账户-采集-v2.2.html 的内嵌 <style>：
//   .btn{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:13px;
//        font-size:16px;font-weight:800;letter-spacing:.5px;border:0;padding:12px 14px}
//   .btn-primary{background:linear-gradient(180deg,#d34a35,#b93222);color:#fff;
//        box-shadow:0 8px 20px rgba(185,50,34,.28),inset 0 1px 0 rgba(255,255,255,.25)}
//   .btn-primary:disabled{background:#c9c2b4;color:#fff;box-shadow:none;opacity:.9;cursor:not-allowed}
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TICKET_BUTTON_CLASS,
  TICKET_BUTTON_FONT_PX,
  TICKET_BUTTON_MIN_HEIGHT_PX,
  TICKET_BUTTON_PRIMARY,
  TICKET_BUTTON_RADIUS_PX,
  renderTicketButton,
  ticketButtonCss,
} from '../dist/components/ticket-button/index.js';

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const CSS = stripComments(ticketButtonCss()).replace(/[ \t]+/g, ' ');
const ROOT = '.ilife-page-ui .' + TICKET_BUTTON_CLASS;
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map((m) => ({ sels: m[1].split(',').map((s) => s.trim()), body: m[2] }));
const declsOf = (selector) => {
  const hit = RULES.find((r) => r.sels.includes(selector));
  return hit === undefined ? null : hit.body.split(';').map((s) => s.trim()).filter(Boolean);
};
const OK = { label: '填好后复制这句话去跟助手说', actionId: 'ilife-acct-new', copyText: '新增账户' };

describe('#1113 ticket-button ① 渲染契约', () => {
  it('一颗按钮 ＝ class 根 ＋ is-primary，带动作号与复制载荷两个属性', () => {
    const html = renderTicketButton(OK);
    assert.ok(html.startsWith('<button type="button" class="' + TICKET_BUTTON_CLASS + ' ' + TICKET_BUTTON_PRIMARY + '"'),
      '类名根或主按钮修饰类不对：' + html);
    assert.ok(html.includes('data-action-id="' + OK.actionId + '"'));
    assert.ok(html.includes('data-t="' + OK.copyText + '"'));
    assert.ok(html.endsWith('</button>'));
  });

  it('**新增的公开形状位 disabled**：不给＝可点（无属性）；给 true ＝裸 disabled ＋ aria-disabled', () => {
    const on = renderTicketButton(OK);
    assert.equal(/\sdisabled(\s|>)/.test(on), false, '不给 disabled 就不该出属性：' + on);
    assert.equal(on.includes('aria-disabled'), false);
    const off = renderTicketButton({ ...OK, disabled: true });
    assert.ok(/ disabled( |>)/.test(off), '给 true 必须出**裸** disabled（读屏与键盘都认）：' + off);
    assert.ok(off.includes('aria-disabled="true"'));
    assert.equal(renderTicketButton({ ...OK, disabled: false }), on, 'false 与不给同形');
  });

  it('入参不合法一律 BlocksError：缺字／空串／disabled 给非布尔', () => {
    const throws = (fn) => { try { fn(); return false; } catch (e) { return e.name === 'BlocksError'; } };
    assert.equal(throws(() => renderTicketButton({ ...OK, label: '' })), true, 'label 空串要报错');
    assert.equal(throws(() => renderTicketButton({ ...OK, actionId: 42 })), true, 'actionId 非字符串要报错');
    assert.equal(throws(() => renderTicketButton({ ...OK, copyText: '' })), true, 'copyText 空串要报错');
    assert.equal(throws(() => renderTicketButton({ ...OK, disabled: 'yes' })), true, 'disabled 非布尔要报错');
    assert.equal(throws(() => renderTicketButton(null)), true);
    assert.equal(throws(() => renderTicketButton({ ...OK, zzUnknown: 1 })), true, '未知键一律拒（静默吞掉＝调用方拼错字段名还绿）');
  });

  it('文本一律转义（label 里的尖括号不会跑成标签）', () => {
    const html = renderTicketButton({ ...OK, label: '<img src=x onerror=1>' });
    assert.equal(html.includes('<img'), false, 'label 没转义');
  });
});

describe('#1113 ticket-button ② 形状（判地逐条）', () => {
  it('基础档 .btn：整行 48px／圆角 13px／16px w800／内距 12px 14px／无边框', () => {
    const got = declsOf(ROOT);
    assert.notEqual(got, null, '缺基础档规则');
    for (const want of ['display: flex', 'align-items: center', 'justify-content: center', 'width: 100%',
      'min-height: ' + TICKET_BUTTON_MIN_HEIGHT_PX + 'px', 'padding: 12px 14px', 'border: 0',
      'border-radius: ' + TICKET_BUTTON_RADIUS_PX + 'px', 'font-size: ' + TICKET_BUTTON_FONT_PX + 'px',
      'font-weight: 800', 'letter-spacing: .5px', 'cursor: pointer']) {
      assert.ok(got.includes(want), '基础档缺声明：' + want);
    }
  });

  it('实心档 .is-primary：判地那支暖红渐变 ＋ 白字 ＋ 字面投影与内高光', () => {
    const body = (RULES.find((r) => r.sels.includes(ROOT + '.' + TICKET_BUTTON_PRIMARY)) || {}).body || '';
    assert.ok(body.includes('linear-gradient(180deg, #d34a35, #b93222)'), '渐变与判地不一致：' + body);
    assert.ok(body.includes('color: #fff'));
    assert.ok(/rgba\(185,\s*50,\s*34,\s*\.28\)/.test(body), '缺字面投影');
    assert.ok(body.includes('inset 0 1px 0'), '缺内高光');
  });

  it('**禁用档 = 判地 .btn-primary:disabled 五条**（这就是 #1113 新增的公开形状位）', () => {
    const got = declsOf(ROOT + '[disabled]');
    assert.notEqual(got, null, '缺 [disabled] 那一档规则');
    assert.deepEqual(got, ['background: #c9c2b4', 'color: #fff', 'box-shadow: none', 'opacity: .9',
      'cursor: not-allowed'], '禁用档与判地不一致');
    assert.ok(CSS.includes(ROOT + ':disabled {'), '缺 :disabled 那条选择器');
    console.log('读数：禁用档五条 —— ' + got.join(' ／ '));
  });

  it('样式纪律：scope 全在 .ilife-page-ui 下、零 :root／零 !important／零冻结 token 重定义', () => {
    for (const r of RULES) for (const s of r.sels) assert.ok(s.startsWith('.ilife-page-ui '), '规则没进页面作用域：' + s);
    assert.equal(CSS.includes(':root'), false);
    assert.equal(CSS.includes('!important'), false);
    const frozen = ['--fg', '--fg2', '--fg3', '--bg', '--card', '--line', '--blue', '--blue2', '--soft', '--ok', '--shadow'];
    for (const f of frozen) assert.equal(new RegExp('\\s' + f + ':').test(CSS), false, '重定义了冻结 token：' + f);
  });

  it('前缀可换（{prefix} 换掉 scope 与类名两头）', () => {
    const other = stripComments(ticketButtonCss({ prefix: 'x-' }));
    assert.equal(other.includes('.x-page-ui .x-block-ticket-button'), true);
    assert.equal(other.includes('.ilife-block-ticket-button'), false);
  });
});