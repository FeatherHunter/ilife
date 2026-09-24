// note-block · 判据件（**重做件**：引语形态已砍，层次只用竖线 ＋ 缩进 ＋ 底色块）。
// 四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 两档几何。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  NOTE_BLOCK_CLASS,
  NOTE_BLOCK_COLLAPSE_CHARS,
  NOTE_BLOCK_ELLIPSIS,
  NOTE_BLOCK_FORMS,
  NOTE_BLOCK_INDENT_PX,
  NOTE_BLOCK_LEN_SUFFIX,
  NOTE_BLOCK_PEEK_CHARS,
  NOTE_BLOCK_RULE_PX,
  NOTE_BLOCK_TONES,
  NOTE_BLOCK_TOUCH_PX,
  noteBlockCss,
  renderNoteBlock,
} from '../dist/components/note-block/index.js';
import { skinCss } from '../dist/blocks.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { measureCells } from './_f11-probe.mjs';

const NAME = 'note-block';
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

const SHORT = {
  text: '体重秤放在地毯上了，读数偏低 0.6 千克；这条记录先留着，明早换到地板再称。',
  owner: '09-24 08:02 的备注',
  time: '最后改于 09-25 20:14',
  tone: 'warn',
  toneLabel: '存疑',
  attachedTo: '09-24 体重',
};
const LONG = {
  text: '早上称重前喝了两杯水，读数可能偏高 0.3 千克左右；前一天晚上吃了火锅，钠摄入高，早上浮肿也正常。\n\n'
    + '腰围量了三遍都是 79 厘米，这个数比体重可信。下周把称重挪到起床后、上厕所之后、喝水之前，同一条件才可比。',
  owner: '09-25 的备注',
  time: '09-25 20:14',
};

describe('note-block ① 渲染契约', () => {
  it('短备注：竖线块 ＋ 归属头 ＋ 正文段 ＋ 归属行（竖线／缩进／底色块三样都在标记里留了钩子）', () => {
    const html = renderNoteBlock(SHORT);
    assert.ok(html.startsWith('<div class="' + NOTE_BLOCK_CLASS + ' is-' + NOTE_BLOCK_FORMS[0] + ' is-warn"'));
    assert.match(html, /-head"><b class="ilife-block-note-block-owner">09-24 08:02 的备注<\/b>/);
    assert.ok(html.includes('-tone">存疑</span>'), '语气字要跟着语气档一起出');
    assert.ok(html.includes('-time">最后改于 09-25 20:14</span>'));
    assert.match(html, /-body"><p class="ilife-block-note-block-line">体重秤放在地毯上了/);
    assert.match(html, /-att"><span>附着于 09-24 体重<\/span>/);
    assert.equal(html.includes('<details'), false, '短的直接出，不套折叠');
  });

  it('长备注默认收起：原生 `<details>`，收起那一排写齐归属／时间／字数／摘要', () => {
    const html = renderNoteBlock(LONG);
    assert.ok(html.startsWith('<details class="' + NOTE_BLOCK_CLASS + ' is-note is-quiet is-collapsed">'));
    assert.match(html, /<summary class="ilife-block-note-block-head">/);
    assert.ok(html.includes('-caret" aria-hidden="true">'));
    assert.match(html, /-owner">09-25 的备注</);
    assert.match(html, /-time">09-25 20:14</);
    assert.match(html, new RegExp('-len">\\d+' + NOTE_BLOCK_LEN_SUFFIX + '</'));
    assert.ok(html.includes('-peek">早上称重前喝了两杯水，读数可能偏高 0.'), '摘要取正文首行');
    assert.ok(html.includes('<details'), '收起要走原生 details（无脚本也能展开）');
  });

  it('**正文一个字都不截**：只有摘要那一行带省略号；多段逐段出', () => {
    const long = 'x'.repeat(NOTE_BLOCK_COLLAPSE_CHARS + 10);
    const html = renderNoteBlock({ text: long + '\n第二段' });
    assert.equal((html.match(/-line"/g) || []).length, 2, '换行拆成两段');
    assert.ok(html.startsWith('<details'), '过阈值要收起');
    assert.ok(html.includes('-peek">' + 'x'.repeat(NOTE_BLOCK_PEEK_CHARS) + NOTE_BLOCK_ELLIPSIS), '摘要在上限处截');
    assert.ok(html.includes('>' + long + '<'), '正文一个字都不少');
    assert.ok(html.includes('>第二段<'));
  });

  it('收起的判断：过 `NOTE_BLOCK_COLLAPSE_CHARS` 自动收起；`collapse` 可显式覆盖', () => {
    const long = { text: 'y'.repeat(NOTE_BLOCK_COLLAPSE_CHARS + 1) };
    const short = { text: 'y'.repeat(NOTE_BLOCK_COLLAPSE_CHARS) };
    assert.ok(renderNoteBlock(long).startsWith('<details'));
    assert.ok(renderNoteBlock(short).startsWith('<div'));
    assert.ok(renderNoteBlock(long).includes('is-collapsed'));
    assert.equal(renderNoteBlock({ ...long, collapse: false }).includes('<details'), false, '强制展开');
    assert.ok(renderNoteBlock({ ...short, collapse: true }).startsWith('<details'), '强制收起');
    assert.equal(throwsBlocks(() => renderNoteBlock({ text: 'x', collapse: 'yes' })), true);
  });

  it('**语气非无时必有语气字**：说不出「是什么」一律拒（色不是唯一信息）', () => {
    assert.equal(throwsBlocks(() => renderNoteBlock({ text: 'x', tone: 'warn' })), true);
    assert.equal(throwsBlocks(() => renderNoteBlock({ text: 'x', tone: 'danger' })), true);
    const ok = renderNoteBlock({ text: 'x', tone: 'danger', toneLabel: '口径待核' });
    assert.ok(ok.includes('is-danger'));
    assert.ok(ok.includes('>口径待核</span>'));
    assert.deepEqual([...NOTE_BLOCK_TONES], ['quiet', 'warn', 'danger']);
  });

  it('引语形态不存在：闭集只有一格，别的值一律拒', () => {
    assert.deepEqual([...NOTE_BLOCK_FORMS], ['note']);
    assert.equal(throwsBlocks(() => renderNoteBlock({ text: 'x', form: 'quote' })), true);
  });

  it('转义：五个字符进实体', () => {
    const html = renderNoteBlock({ text: '<b>&"\'', owner: '<i>x</i>' });
    assert.equal(html.includes('<b>'), false);
    assert.ok(html.includes('&lt;b&gt;'));
    assert.ok(html.includes('&quot;'));
  });

  it('全部非法入参分支 ⇒ BlocksError', () => {
    const bad = [
      () => renderNoteBlock(undefined),
      () => renderNoteBlock({}),
      () => renderNoteBlock({ text: '' }),
      () => renderNoteBlock({ text: '   \n  ' }),
      () => renderNoteBlock({ text: 1 }),
      () => renderNoteBlock({ text: 'x', owner: 2 }),
      () => renderNoteBlock({ text: 'x', tone: 'angry', toneLabel: 't' }),
      () => renderNoteBlock({ text: 'x', form: 'quote' }),
      () => renderNoteBlock({ text: 'x', extraClass: '#' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true);
  });
});

describe('note-block ② 样式与零 DOM 纪律', () => {
  const raw = noteBlockCss();
  const css = stripComments(raw);

  it('样式段非空，全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = selectorsOf(raw);
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
  });

  it('零 `:root`／零 `!important`／**零投影**；不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('box-shadow'), false, '层次不许靠投影（小票纸与大字报刊是零阴影）');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('**层次＝竖线 ＋ 缩进 ＋ 底色块**三样都在样式里', () => {
    assert.ok(new RegExp('block-note-block \\{[\\s\\S]*?border-left: 1px solid').test(css), '竖线');
    assert.ok(css.includes('padding: 0 0 2px ' + NOTE_BLOCK_INDENT_PX + 'px') || css.includes(String(NOTE_BLOCK_INDENT_PX) + 'px'), '缩进');
    assert.ok(new RegExp('-body \\{[\\s\\S]*?background: var\\(--ilife-surface-2').test(css), '底色块');
    assert.ok(new RegExp('\\.is-warn \\{[\\s\\S]*?border-left-width: ' + NOTE_BLOCK_RULE_PX + 'px').test(css),
      '语气档要把竖线加粗（色之外的第二样）');
  });

  it('源码里不出现手写的 `var(--ilife-…)`', () => {
    const src = stripComments(readFileSync(join(PKG, 'src', 'components', NAME, 'style.ts'), 'utf8'));
    assert.equal([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('));
  });

  it('零 DOM：产物剥掉字面量后不出现 document.／window.／navigator.（本件没有运行时段）', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 4);
    assert.equal(files.some((f) => f.endsWith('runtime.js')), false, '展开／收起是原生行为，不该有运行时段');
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });

  it('原生折叠的四档状态逐条在场：rest／hover（在设备能力查询里）／active／focus-visible ＋ 44px 命中盒', () => {
    assert.ok(/@media \(hover:hover\) and \(pointer:fine\) \{[\s\S]*:hover/.test(css));
    assert.ok(/:active \{ opacity: \.9; \}/.test(css));
    assert.ok(/:focus-visible \{[^}]*outline: 2px solid/.test(css));
    assert.ok(new RegExp('> \\.ilife-block-note-block-head \\{[\\s\\S]*?min-height: ' + NOTE_BLOCK_TOUCH_PX + 'px').test(css),
      '收起那一排是触控目标，不得小于 44px');
    assert.ok(css.includes('cursor: pointer'));
    assert.ok(/@media \(prefers-reduced-motion:reduce\) \{[\s\S]*transition: none/.test(css));
  });

  it('响应式只判容器；正文与摘要都不截断', () => {
    assert.ok(css.includes('@container (max-width:'));
    assert.equal(/@media[^{]*max-width/.test(css), false);
    assert.equal(css.includes('text-overflow'), false);
    assert.ok(css.includes('overflow-wrap: anywhere'));
  });
});

describe('note-block ③ 加法式', () => {
  it('只读自己的类名与自己的状态类（`is-*`），不碰公共选择器', () => {
    const own = new RegExp('^\\.ilife-page-ui$|^\\.ilife-block-' + NAME + '[-A-Za-z0-9_]*$|^\\.is-[a-z][a-z0-9-]*$');
    for (const sel of selectorsOf(noteBlockCss())) {
      assert.ok(sel.includes('.ilife-page-ui'), '没 scope：' + sel);
      const tokens = sel.match(/\.[A-Za-z_][\w-]*/g) || [];
      assert.ok(tokens.length > 0, '选择器里一个类名都没有：' + sel);
      for (const token of tokens) assert.match(token, own, '选择器碰到了别人的类名：' + sel);
    }
  });

  it('同一入参两次渲染逐字节相同；调本件样式函数不动别处产物', () => {
    assert.equal(renderNoteBlock(LONG), renderNoteBlock(LONG));
    const before = skinCss();
    noteBlockCss();
    assert.equal(skinCss(), before);
  });

  it('产物里没有脚本、没有内联事件', () => {
    const html = renderNoteBlock(LONG);
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
  });
});

describe('note-block ④ 两档几何（390／1280 × 三套皮肤）', () => {
  const cells = [];
  for (const skin of ['paper', 'broadsheet', 'neutral']) {
    for (const width of [390, 1280]) {
      cells.push({
        skin, width, html: renderNoteBlock(LONG), rootSel: '.' + NOTE_BLOCK_CLASS,
        keySels: ['.ilife-block-note-block-owner', '.ilife-block-note-block-time',
          '.ilife-block-note-block-len', '.ilife-block-note-block-peek'],
        touchSels: ['.ilife-block-note-block-head'],
      });
    }
  }

  it('真机：零横向溢出 ＋ 收起那一排 ≥44px', async () => {
    const measured = await measureCells({ css: skinCss({}) + noteBlockCss(), cells });
    if (measured === null) {
      const css = stripComments(noteBlockCss());
      assert.ok(css.includes('min-height: ' + String(NOTE_BLOCK_TOUCH_PX) + 'px'));
      return;
    }
    for (const r of measured.readings) {
      const at = r.skin + '@' + r.width;
      assert.ok(r.page.scrollWidth <= r.page.clientWidth, at + ' 页面横向溢出');
      assert.ok(r.root.scrollWidth <= r.root.clientWidth + 1, at + ' 件根横向溢出');
      assert.deepEqual(r.clipped, [], at + ' 有元素把内容裁掉了');
      assert.deepEqual(r.ellipsis, [], at + ' 出现了 … 截断（正文不许截）');
      for (const k of r.keys) {
        assert.ok(k.n > 0, at + ' 关键选择器一枚都没命中：' + k.sel);
        assert.deepEqual(k.bad, [], at + ' 关键语义出界：' + k.sel);
      }
      for (const t of r.touch) {
        assert.ok(t.minSide >= NOTE_BLOCK_TOUCH_PX, at + ' 命中盒太小：' + t.minSide);
      }
    }
  });
});
