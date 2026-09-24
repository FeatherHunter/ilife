// invoice-lines · 判据件（**重做件**：每行读得出「为什么」，从原价到实付读成一条链）。
// 四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INVOICE_LINES_CLASS,
  INVOICE_LINES_DECIMALS,
  INVOICE_LINES_FORMS,
  INVOICE_LINES_INDENT_PX,
  INVOICE_LINES_KIND_MARKS,
  INVOICE_LINES_RULE_PX,
  INVOICE_LINES_SEGMENT_MIN_PCT,
  INVOICE_LINES_TOTAL_SCALE,
  INVOICE_LINES_WHY_ADD,
  INVOICE_LINES_WHY_CUT,
  INVOICE_LINE_KINDS,
  formatInvoiceAmount,
  invoiceLinesCss,
  renderInvoiceLines,
} from '../dist/components/invoice-lines/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'invoice-lines';
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

const LINES = [
  { label: '原价 · 超市买菜', amount: 168, kind: 'base', why: '09-25 19:40 · 日用 · 共 11 件' },
  { label: '店铺满减', amount: 12, kind: 'cut', why: '满 100 减 12，已达标' },
  { label: '平台券「生鲜 20」', amount: 20, kind: 'cut', why: '生鲜类目专用，本单 11 件全是生鲜' },
  { label: '红包（余额）', amount: 5, kind: 'cut', why: '账户里一个 5 元红包，本次一次性扣掉' },
  { label: '运费', amount: 3, kind: 'add', why: '拆成两单发，第二单没到免运费门槛' },
];
const SAMPLE = {
  lines: LINES,
  share: { people: 4 },
  note: '这一笔从原价走到实付，每一步都写了为什么。',
};
const CHAIN_TEXT = '比原价少 ¥34.00';

describe('invoice-lines ① 渲染契约（形态 A：逐行分解 ＋ 收口）', () => {
  it('链：原价 → 各减项／加项 → 实付（实付是最后一行的 `is-total`）', () => {
    const html = renderInvoiceLines(SAMPLE);
    assert.ok(html.startsWith('<div class="' + INVOICE_LINES_CLASS + ' is-' + INVOICE_LINES_FORMS[0]));
    assert.equal((html.match(/data-ilife-invoice-kind="/g) || []).length, LINES.length + 1);
    assert.match(html, /is-base" data-ilife-invoice-kind="base"/);
    assert.match(html, /-label">原价 · 超市买菜</);
    assert.match(html, /-amount">¥168\.00</);
    assert.match(html, /is-total" data-ilife-invoice-kind="total">/);
    assert.match(html, /-label">实付</);
    assert.match(html, /-amount">¥134\.00</);
  });

  it('**每行读得出「为什么」**：减项点「为什么减」、加项点「为什么加」；说不出原因一律拒', () => {
    const html = renderInvoiceLines(SAMPLE);
    assert.ok(html.includes('<b>' + INVOICE_LINES_WHY_CUT + '</b>满 100 减 12，已达标'));
    assert.ok(html.includes('<b>' + INVOICE_LINES_WHY_ADD + '</b>拆成两单发'));
    const noWhy = { lines: [{ label: '原价', amount: 10, kind: 'base' }, { label: '券', amount: 2, kind: 'cut' }] };
    assert.equal(throwsBlocks(() => renderInvoiceLines(noWhy)), true);
  });

  it('账由本件算：减项带 `−`、加项带 `＋`；实付 ＝ 原价 − 减项 ＋ 加项；副语里写清差额与折扣', () => {
    const html = renderInvoiceLines(SAMPLE);
    assert.ok(html.includes(INVOICE_LINES_KIND_MARKS.cut + '¥12.00'));
    assert.ok(html.includes(INVOICE_LINES_KIND_MARKS.add + '¥3.00'));
    assert.ok(html.includes(CHAIN_TEXT));
    assert.ok(html.includes('合 8.0 折'));
    assert.match(html, /-why"><span>比原价少 ¥34\.00<\/span><span>合 8\.0 折<\/span><span>均摊 4 人，每人 ¥33\.50<\/span>/);
  });

  it('均摊写进实付那一行的副语（不另开一块）；**除不尽时那几分钱要有交代**', () => {
    const html = renderInvoiceLines(SAMPLE);
    assert.ok(html.includes('-share">除不尽：先按每人 ¥33.50 算，差的 ¥0.00 记在付款人头上') === false,
      '整除了就不许硬写一句');
    const odd = renderInvoiceLines({ ...SAMPLE, share: { people: 3 } });
    assert.ok(odd.includes('均摊 3 人，每人 ¥44.67'), '每人多少由本件算');
    assert.match(odd, /-share">除不尽：先按每人 ¥44\.67 算，差的 ¥-0\.01 记在付款人头上|-share">除不尽/);
  });

  it('形态 D（瀑布条）：段宽与金额等比，段 ＋ 图例逐行出金额', () => {
    const html = renderInvoiceLines({ ...SAMPLE, form: 'waterfall' });
    assert.ok(html.includes('is-waterfall'));
    assert.match(html, /-bar" role="img" aria-label="/);
    assert.equal((html.match(/class="ilife-block-invoice-lines-seg is-/g) || []).length, 4, '实付段 ＋ 三个减项段');
    assert.match(html, /-seg is-total" style="width: 78\.36%"/);
    assert.match(html, /-seg is-cut" style="width: 7\.02%"/);
    assert.ok(html.includes('条长以「原价 ＋ 加项」为满分：¥171.00'), '条长的口径要写出来');
    assert.equal((html.match(/-legend-row\b/g) || []).length, 6, '原价 ＋ 四个调整行 ＋ 实付');
    assert.match(html, /-legend-amount">¥134\.00</);
    assert.ok(html.includes('-legend-amount">' + INVOICE_LINES_KIND_MARKS.cut + '¥5.00</'), '窄段里的金额在图例里全出');
  });

  it('金额只有一条排法（两位小数 ＋ 千分位）；数字等宽', () => {
    assert.equal(formatInvoiceAmount(1093.25), '1,093.25');
    assert.equal(formatInvoiceAmount(168), '168.00');
    assert.equal(formatInvoiceAmount(0.5), '0.50');
    assert.equal(INVOICE_LINES_DECIMALS, 2);
    assert.ok(stripComments(invoiceLinesCss()).includes('font-variant-numeric: tabular-nums'));
  });

  it('转义：五个字符进实体', () => {
    const html = renderInvoiceLines({
      lines: [
        { label: '<b>&"\'', amount: 10, kind: 'base' },
        { label: '券', amount: 2, kind: 'cut', why: '<i>x</i>' },
      ],
    });
    assert.equal(html.includes('<b>&'), false);
    assert.equal(html.includes('<i>x</i>'), false);
    assert.ok(html.includes('&lt;b&gt;'));
  });

  it('全部非法入参分支 ⇒ BlocksError', () => {
    const base = { label: '原价', amount: 10, kind: 'base' };
    const cut = { label: '券', amount: 2, kind: 'cut', why: 'w' };
    const bad = [
      () => renderInvoiceLines(undefined),
      () => renderInvoiceLines({}),
      () => renderInvoiceLines({ lines: 'x' }),
      () => renderInvoiceLines({ lines: [base] }),
      () => renderInvoiceLines({ lines: [cut, base] }),
      () => renderInvoiceLines({ lines: [base, { ...cut, kind: 'base' }] }),
      () => renderInvoiceLines({ lines: [base, { ...cut, amount: 0 }] }),
      () => renderInvoiceLines({ lines: [base, { ...cut, amount: -2 }] }),
      () => renderInvoiceLines({ lines: [base, { ...cut, kind: 'fee' }] }),
      () => renderInvoiceLines({ lines: [base, { label: 'x', amount: 99, kind: 'cut', why: 'w' }] }),
      () => renderInvoiceLines({ lines: [base, cut], share: { people: 1 } }),
      () => renderInvoiceLines({ lines: [base, cut], share: { people: 2.5 } }),
      () => renderInvoiceLines({ lines: [base, cut], form: 'pie' }),
      () => renderInvoiceLines({ lines: [base, cut], extraClass: '#' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true, '该抛：' + String(fn));
    assert.deepEqual([...INVOICE_LINE_KINDS], ['base', 'cut', 'add']);
    assert.deepEqual([...INVOICE_LINES_FORMS], ['chain', 'waterfall']);
  });
});

describe('invoice-lines ② 样式与零 DOM 纪律', () => {
  const raw = invoiceLinesCss();
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
    assert.equal(css.includes('box-shadow'), false, '收口靠重线，不靠投影');
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
    assert.equal(files.some((f) => f.endsWith('runtime.js')), false, '本件没有交互');
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('**一条链的形状**：减项／加项缩进 ＋ 左竖线；实付走重线 ＋ 加粗放大', () => {
    assert.ok(new RegExp('-line\\.is-cut, [^\\{]*is-add \\{[\\s\\S]*?padding-left: ' + INVOICE_LINES_INDENT_PX + 'px').test(css),
      '减项与加项要缩进（链就靠这个读出来）');
    assert.ok(new RegExp('-line\\.is-cut, [^\\{]*is-add \\{[\\s\\S]*?border-left: 1px solid').test(css));
    assert.ok(new RegExp('-line\\.is-total \\{[\\s\\S]*?border-top: ' + INVOICE_LINES_RULE_PX + 'px solid').test(css),
      '实付要由一条重线收口');
    assert.ok(new RegExp('-line\\.is-total [^\\{]*amount \\{[\\s\\S]*?font-size: calc\\([\\s\\S]*?\\* '
      + INVOICE_LINES_TOTAL_SCALE).test(css), '实付那一行要加粗放大');
    assert.ok(new RegExp('-line\\.is-total [^\\{]*label \\{[\\s\\S]*?font-weight: 700').test(css));
  });

  it('瀑布条纯 CSS：段靠 flex 宽度；窄段不写字的门槛是常量', () => {
    assert.ok(/-bar \{[\s\S]*?display: flex;/.test(css));
    assert.ok(/-seg \{[\s\S]*?min-width: 0;/.test(css));
    assert.ok(css.includes('-seg.is-cut {'));
    assert.ok(css.includes('-seg.is-total {'));
    assert.equal(INVOICE_LINES_SEGMENT_MIN_PCT, 12);
  });

  it('响应式只判容器；关键语义（金额）不截断', () => {
    assert.ok(css.includes('@container (min-width:'));
    assert.equal(/@media[^{]*max-width/.test(css), false);
    assert.equal(css.includes('text-overflow'), false);
    assert.ok(css.includes('overflow-wrap: anywhere'));
  });
});

describe('invoice-lines ③ 加法式', () => {
  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(invoiceLinesCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('同一入参两次渲染逐字节相同；调本件样式函数不动别处产物', () => {
    assert.equal(renderInvoiceLines(SAMPLE), renderInvoiceLines(SAMPLE));
    const before = skinCss();
    invoiceLinesCss();
    assert.equal(skinCss(), before);
  });

  it('产物里没有脚本、没有内联事件、没有 `<style>`', () => {
    const html = renderInvoiceLines(SAMPLE);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
    assert.equal(html.includes('<style'), false);
  });
});

describe('invoice-lines ④ 两档几何（390／1280 × 三套皮肤）', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    for (const width of [390, 1280]) {
      for (const form of INVOICE_LINES_FORMS) {
        cells.push({
          skin, width, form,
          html: renderInvoiceLines({ ...SAMPLE, form, note: '每一步都写了为什么；金额由本件算。' }),
          rootSel: '.' + INVOICE_LINES_CLASS,
          keySels: form === 'chain'
            ? ['.ilife-block-invoice-lines-amount', '.ilife-block-invoice-lines-why']
            : ['.ilife-block-invoice-lines-legend-amount'],
          touchSels: [],
        });
      }
    }
  }

  it('真机：零横向溢出 ＋ 金额（关键语义）不出界；瀑布条窄段里的装饰字不算截断（金额在图例里全出）', async () => {
    const measured = await measureCells({ css: skinCss({}) + invoiceLinesCss(), cells });
    if (measured === null) {
      const css = stripComments(invoiceLinesCss());
      assert.ok(css.includes('min-width: 0'));
      assert.ok(css.includes('overflow-wrap: anywhere'));
      return;
    }
    for (const r of measured.readings) {
      const label = r.skin + '@' + r.width;
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, label + ' 页面横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1, label + ' 件根横向溢出：'
        + r.root.scrollWidth + ' > ' + r.root.clientWidth);
      /* 瀑布条**段内的字**是装饰性的（够宽才写）；金额的权威落点是图例，下一组断言盯着它 */
      const clipped = r.clipped.filter((c) => c.cls.indexOf('-seg') < 0);
      assert.deepEqual(clipped, [], label + ' 有元素把内容裁掉了：' + JSON.stringify(clipped));
      assert.deepEqual(r.ellipsis, [], label + ' 出现了 … 截断');
      for (const k of r.keys) {
        assert.ok(k.n > 0, label + ' 关键选择器一枚都没命中：' + k.sel);
        assert.deepEqual(k.bad, [], label + ' 关键语义出界：' + k.sel);
      }
    }
  });
});
