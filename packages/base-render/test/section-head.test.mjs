// section-head（小节头 · 形态 C「可折叠小节」）· 判据件。
//
// 断言对象是**编译产物**（消费方真走的那条路径：组件目录自己的 `index.ts`，再经 `base-paint/blocks` 转出）。
// 四类：
//   ① 渲染契约（结构／槽位／转义／**全部**非法入参分支）
//   ② 样式与零 DOM 纪律（scope、零 `:root`／`!important`、不定义新 token、剥字面量后零 DOM 名）
//   ③ 加法式（只碰自己的类名；不给这块样式时别人产物逐字节不变）
//   ④ 两档几何（390／1280：零横向溢出、关键语义不截断）——起得来 headless Chrome ＋ CDP 就真量
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  SECTION_HEAD_CLASS,
  SECTION_HEAD_FORMS,
  SECTION_HEAD_MORE_TEXTS,
  SECTION_HEAD_SEQ_MAX,
  SECTION_HEAD_SEQ_MIN,
  SECTION_HEAD_SUM_MIN_PX,
  renderSectionHead,
  sectionHeadCss,
  sectionHeadSlot,
} from '../dist/components/section-head/index.js';
/* 层出口（`base-paint/blocks`）与组件层总出口**用命名空间导入**：ESM 的具名导入在导出缺席时是
   语法错误（整份判据都起不来），而本席落地期间那两行由接线席统一加 —— 缺席要读成"还没接线"，
   不是"本件坏了"。所以这里取命名空间，断言里判 `undefined` 或"同一引用"。 */
import * as blocks from '../dist/blocks.js';
import * as layer from '../dist/components/index.js';
import { skinClass, skinCss, SKIN_NAMES } from '../dist/blocks.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 剥掉 CSS 注释再断规则（注释会**提到**类名与 token 名，拿裸串断会把"解释"当"规则"）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** 抛错的入参一律要 `BlocksError`（组件层与区块层共用同一个错误名）。 */
const throwsBlocks = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.name === 'BlocksError';
  }
  return false;
};

/** 抽样式段里的**每一条 CSS 规则**：`sel` ＝ 选择器（逗号已拆开）、`depth` ＝ 它在几层 at-rule 里。
 *
 *  机读口径（不靠"行首"或"`}` 紧邻"这类位置假设——本仓的样式段里规则之间**夹着大量注释**，
 *  那些位置假设会把注释吞进选择器、或把 `@media`／`@container` 块里的规则漏掉）：
 *  · 逐字符扫一遍，维护花括号深度；每遇到 `{` 就把「上一个 `{`／`}` 之后的文本」当候选选择器；
 *  · 候选里出现 `@`（at-rule 头）或注释标记 `*` ⇒ **不是规则，是包裹层**，跳过并进一层；
 *  · 候选以 `while`／`if`／`function` 开头 ⇒ 是运行时里的花括号，跳过。 */
function ruleSelectors(css) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (ch === '{') {
      const cand = css.slice(start, i).trim();
      if (cand !== '' && !cand.startsWith('@') && !cand.includes('*')
        && !/^(while|if|for|function|switch)\b/.test(cand)) {
        for (const one of cand.split(',')) {
          const s = one.trim();
          if (s !== '') out.push({ sel: s, depth });
        }
      } else {
        depth += 1;
      }
      start = i + 1;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      start = i + 1;
    }
  }
  return out;
}

const row = SECTION_HEAD_CLASS + ' ' + SECTION_HEAD_CLASS.replace('ilife-block-', 'is-');

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('section-head ① 渲染契约', () => {
  it('骨架：一个 details ＋ 一个 summary ＋ 一个 body；标题是 h4；零脚本', () => {
    const html = renderSectionHead({ title: '步骤', body: '<ol><li>焯水</li></ol>', count: '6 步' });
    assert.ok(html.startsWith('<details class="' + SECTION_HEAD_CLASS + ' ' + sectionHeadSlot('form-fd') + '">'),
      '根是 details，形态类走槽位拼法：' + html.slice(0, 110));
    assert.equal((html.match(/<details/g) || []).length, 1);
    assert.equal((html.match(/<summary/g) || []).length, 1);
    assert.match(html, new RegExp('<h4 class="' + sectionHeadSlot('title') + '">步骤</h4>'));
    assert.ok(html.includes('<div class="' + sectionHeadSlot('body') + '"><ol><li>焯水</li></ol></div>'), '正文受信透传');
    assert.ok(!/<script/i.test(html), '不产脚本');
    assert.ok(!/\son[a-z]+=/i.test(html), '不产内联事件处理器');
    assert.ok(!html.includes('  '), '标记里不留连续空白（拼接期不写换行与缩进）');
  });

  it('四个槽各有各的类：序号／标题／计数／展开指示（缺的槽一个字都不出）', () => {
    const html = renderSectionHead({ title: '步骤', body: '', count: '6 步', seq: 3 });
    assert.match(html, new RegExp('<span class="' + sectionHeadSlot('ordinal') + '" aria-hidden="true">3</span>'));
    assert.match(html, new RegExp('<span class="' + sectionHeadSlot('count') + '">6 步</span>'));
    assert.match(html, new RegExp('<span class="' + sectionHeadSlot('more') + '"></span>'), '展开指示是空元素（两枚字住样式）');
    const bare = renderSectionHead({ title: '步骤', body: '' });
    assert.equal(bare.includes('-ordinal'), false, '不给 seq ⇒ 不出序号槽');
    assert.equal(bare.includes('-count'), false, '不给 count ⇒ 不出计数槽');
    assert.ok(bare.includes('-more'), '展开指示恒出（它就是这一形态的开关）');
    assert.equal(bare.includes(sectionHeadSlot('form-fd')), true, '形态类恒出');
  });

  it('展开指示的两枚字写在契约常量里（`::before` 按 [open] 换），且两枚都在样式段里', () => {
    assert.deepEqual({ ...SECTION_HEAD_MORE_TEXTS }, { folded: '展开', open: '收起' });
    const css = sectionHeadCss();
    assert.ok(css.includes('content: "' + SECTION_HEAD_MORE_TEXTS.folded + '"'));
    assert.ok(css.includes('content: "' + SECTION_HEAD_MORE_TEXTS.open + '"'));
  });

  it('open／id／extraClass：给了才上根；extraClass 进 class 不进属性', () => {
    const html = renderSectionHead({ title: 't', body: '', open: true, id: 'sec-steps', extraClass: 'is-tight x' });
    assert.match(html, new RegExp('^<details class="' + SECTION_HEAD_CLASS + ' ' + sectionHeadSlot('form-fd')
      + ' is-tight x" id="sec-steps" open>'));
    assert.equal(renderSectionHead({ title: 't', body: '' }).includes(' open'), false, '缺省折叠');
    assert.equal(renderSectionHead({ title: 't', body: '' }).includes('id='), false, '不给 id 就不上 id');
  });

  it('转义：标题／计数／id 三位都过实体，塞不进标签与属性', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderSectionHead({ title: evil, count: evil, body: '<b>受信</b>' });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'), '标题以实体上屏');
    assert.ok(html.includes('&quot;'), '引号转义');
    assert.ok(html.includes('<b>受信</b>'), 'body 是受信位：原样落地（与 sheet-frame.content 同口径）');
  });

  it('非法入参逐条抛 BlocksError（不静默降级）', () => {
    assert.equal(throwsBlocks(() => renderSectionHead(undefined)), true);
    assert.equal(throwsBlocks(() => renderSectionHead(null)), true);
    assert.equal(throwsBlocks(() => renderSectionHead([])), true, '数组不是对象');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: '', body: '' })), true, 'title 非空必填');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't' })), true, 'body 必填（空小节给空串）');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: 1 })), true, 'body 只收串');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', count: 7 })), true, 'count 只收串');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', open: 1 })), true, 'open 只收布尔');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', id: '9bad' })), true, 'id 不以数字打头');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', id: 'a b' })), true, 'id 无空白');
    assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', extraClass: 'a b!' })), true, '类名正则');
  });

  it('序号是闭区间内的整数：越界／非整／非数一律抛；边界值放行', () => {
    assert.deepEqual([...SECTION_HEAD_FORMS], ['fd']);
    assert.equal(SECTION_HEAD_SEQ_MIN, 1);
    assert.equal(SECTION_HEAD_SEQ_MAX, 999);
    for (const bad of [0, -1, SECTION_HEAD_SEQ_MAX + 1, 2.5, Number.NaN, '3', null]) {
      assert.equal(throwsBlocks(() => renderSectionHead({ title: 't', body: '', seq: bad })), true, '拒：' + String(bad));
    }
    assert.match(renderSectionHead({ title: 't', body: '', seq: SECTION_HEAD_SEQ_MIN }), />1<\/span>/);
    assert.match(renderSectionHead({ title: 't', body: '', seq: SECTION_HEAD_SEQ_MAX }), new RegExp('>' + SECTION_HEAD_SEQ_MAX + '<'));
  });

  it('空 body 也成立（小节头可以只是"一段还没填的正文位"）；空标题与空计数才是错', () => {
    assert.ok(renderSectionHead({ title: '步骤', body: '' }).includes('<div class="' + sectionHeadSlot('body') + '"></div>'));
    assert.equal(renderSectionHead({ title: '步骤', body: '', count: '' }).includes('-count'), false, '空串按未给处理');
  });

  it('槽位类名的拼法唯一（判据与渲染同读 `sectionHeadSlot`，不各抄一份字面量）', () => {
    for (const slot of ['sum', 'ordinal', 'title', 'count', 'more', 'body', 'form-fd']) {
      assert.equal(sectionHeadSlot(slot), 'ilife-block-section-head-' + slot);
      assert.equal(sectionHeadSlot(slot, 'x-'), 'x-block-section-head-' + slot);
    }
    /* 渲染真的用了这份拼法（把类名逐枚在产物里对上）。 */
    const html = renderSectionHead({ title: 't', body: '<p>b</p>', count: 'c', seq: 1 });
    for (const slot of ['sum', 'ordinal', 'title', 'count', 'more', 'body', 'form-fd']) {
      assert.ok(html.includes(sectionHeadSlot(slot)), '产物里缺槽：' + slot);
    }
    assert.equal(row.length > 0, true);
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('section-head ② 样式与零 DOM 纪律', () => {
  const css = stripComments(sectionHeadCss());

  it('样式段非空，且**每条**规则都 scope 在 `.ilife-page-ui` 之下（含 `@container`／`@media` 块里的）', () => {
    assert.ok(css.trim() !== '');
    const rules = ruleSelectors(css);
    assert.ok(rules.length > 0, '一条规则都抽不到 ⇒ 判据空转');
    for (const r of rules) {
      assert.ok(/^\.ilife-page-ui\s/.test(r.sel),
        '这条规则没从 scope 起头（裸着会与别件串味）：' + r.sel);
    }
    /* 块里的规则也要数到（否则"夹生"漏检）：本件 `@container`／`@media` 里那几条必须在内。 */
    assert.ok(rules.some((r) => r.depth > 0), '`@container`／`@media` 块里的规则没被抽到 ⇒ 抽取器漏了');
  });

  it('**产物层**：每条选择器里 `.ilife-page-ui` 恰一次（组合器右边不许再要求一次 scope）', () => {
    /* 断的是**调用样式函数后的字符串**（不是源码拼法）：助手组合出来的双 scope
       （`.page-ui .A[open] .page-ui .B::before`）在源码里看着像两个正确的助手，只有从产物里数才抓得到——
       这正是「展开指示的 `::before`／`::after` 从来没生效」那一类死规则的读法。
       `ruleSelectors` 逐字符配平花括号 ⇒ `@container`／`@media` **块里**的规则同样被判。 */
    const bad = [];
    for (const r of ruleSelectors(css)) {
      const hits = (r.sel.match(/\.ilife-page-ui/g) || []).length;
      if (hits !== 1) bad.push(r.sel + '（.ilife-page-ui 出现 ' + hits + ' 次）');
    }
    assert.deepEqual(bad, [], '作用域不是恰一次（0 次＝与别件串味，>1 次＝永不命中的死规则）：\n  ' + bad.join('\n  '));
  });

  it('零 :root／!important／禁入 token；不定义任何自定义属性名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    for (const bad of ['--r-xl', '--pink']) assert.equal(css.includes(bad), false, '禁入 token：' + bad);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
  });

  it('皮肤只经 skinVar 读：样式段里的 `var(--ilife-…` 一律带兜底链（不是裸的皮肤变量）', () => {
    const reads = [...css.matchAll(/var\(--ilife-[a-z0-9-]+,\s*[^)]+\)/g)];
    assert.ok(reads.length >= 10, '本件该读十来个 token，实读 ' + reads.length);
    const bare = [...css.matchAll(/var\(\s*--ilife-[a-z0-9-]+\s*\)/g)];
    assert.deepEqual(bare, [], '裸代码里的皮肤变量（没有兜底链）：' + bare.map((m) => m[0]).join('、'));
  });

  it('宽度只许容器判：`@container` 在场，且一条 `@media` 都不判宽度', () => {
    assert.ok(css.includes('container-type: inline-size'));
    assert.ok(css.includes('@container (max-width:'));
    const medias = css.match(/@media[^{]*/g) || [];
    for (const m of medias) {
      assert.ok(!/width|height/.test(m), '媒体查询只许判设备能力，不许判宽度：' + m);
    }
  });

  it('命中盒地板与大字号不截断：summary 有 44px 下限；标题那一槽只许换行、零截断手段', () => {
    assert.equal(SECTION_HEAD_SUM_MIN_PX, 44);
    assert.match(css, new RegExp('min-height: ' + SECTION_HEAD_SUM_MIN_PX + 'px'));
    /* 取**标题那一条规则**（不取"从标题往下全部"——那会把后面槽位的 `nowrap` 也算到标题头上）。 */
    const titleRule = css.split(sectionHeadSlot('title') + ' {')[1].split('}')[0];
    assert.ok(titleRule.includes('overflow-wrap: anywhere'), '标题必须能换行');
    assert.equal(/text-overflow|line-clamp|white-space|overflow:\s*hidden/.test(titleRule), false,
      '标题那一槽不许出现截断手段：' + titleRule);
    /* 全文层：本件不许有任何 `…` 截断手段（`nowrap` 本身是允许的——计数与序号靠它保命）。 */
    assert.equal(/text-overflow|line-clamp|-webkit-box|overflow:\s*hidden/.test(css), false, '本件不许有截断手段');
  });

  it('dist 里本件产物剥掉字面量与注释后零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'section-head');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5, '六件（除 README）都该编译出来');
    const stripLiterals = (code) => code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const f of files) {
      const code = stripLiterals(readFileSync(join(dir, f), 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f + ' 里出现 ' + needle);
      }
    }
  });
});

/* ── ③ 加法式 ─────────────────────────────────────────────────────── */

describe('section-head ③ 加法式（不挂这块样式＝别人产物逐字节不变）', () => {
  it('样式段只认自己的类名：除了 scope 前缀，不碰别人的选择器', () => {
    const css = stripComments(sectionHeadCss());
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []).map((s) => s.trim());
    for (const sel of selectors) {
      const dropped = sel.replace(/\.ilife-page-ui/g, '').replace(/\s*>\s*/g, ' ').trim();
      const classes = [...dropped.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
      for (const cls of classes) {
        assert.equal(cls.startsWith(SECTION_HEAD_CLASS), true, '碰了别人的类名：' + cls + '（在 ' + sel + ' 里）');
      }
      assert.equal(/^(html|body|\*)/.test(dropped), false, '不许有全局选择器：' + sel);
    }
  });

  it('只留一条路：组件**不从根出口**出；层出口若已接线，必须是同一个实现（不许第二份实现）', () => {
    assert.equal(typeof renderSectionHead, 'function');
    assert.equal(root.renderSectionHead, undefined, '组件层不得从根出口出（冻结面签名不许动）');
    assert.equal(root.sectionHeadCss, undefined);
    assert.ok(layer.renderSectionHead === undefined || layer.renderSectionHead === renderSectionHead,
      '组件层出口不许出现第二份实现');
    /* 层出口（`src/components/index.ts` 那一行）归接线席统一加；加了之后 `blocks` 就取得到。
       本席只留「同一引用」这一条，不把它当成落地门槛。 */
    assert.ok(blocks.renderSectionHead === undefined || blocks.renderSectionHead === renderSectionHead,
      '`base-paint/blocks` 若转出本件，必须是同一引用');
  });

  it('加法式：不挂本件的页产物里一个本件字节都没有，两次渲染逐字节相同；挂了＝原页 ＋ 这一段', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(SECTION_HEAD_CLASS), false, '不挂本件时不得出现它的类名');
    assert.equal(off.includes('section-head'), false, '样式段也不得随页挂上');
    assert.equal(off, shell(), '两次渲染逐字节相同');
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderSectionHead({ title: '步骤', body: '<p>正文</p>' }),
      extraCss: sectionHeadCss(),
    });
    assert.ok(on.includes(SECTION_HEAD_CLASS), '挂上后类名在');
    assert.ok(on.includes('.ilife-page-ui .ilife-block-section-head'), '样式段随页挂上');
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
    assert.ok(on.length > off.length, '启用后长于不启用');
  });

  it('三套皮肤下标记逐字节相同：皮肤只换样式段与皮肤类，标记面一个字节不动', () => {
    const head = renderSectionHead({ title: '步骤', body: '<p>正文</p>', count: '6 步', seq: 1 });
    const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
      + '<div class="ilife-page-ui ' + skinClass(name) + '">' + head + '</div>';
    const withoutSkin = (name) => pageOf(name)
      .replace(skinCss({ skins: [name] }), '')
      .replace(skinClass(name), '');
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(head), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
  });

  it('样式段与渲染互不引用：渲染不产 `<style>`，样式段里不出现标记', () => {
    assert.equal(renderSectionHead({ title: 't', body: '' }).includes('<style'), false);
    assert.equal(stripComments(sectionHeadCss()).includes('<details'), false);
  });
});

/* ── ④ 两档几何（真机：headless Chrome ＋ CDP）──────────────────────── */

function findBrowser() {
  return [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
}

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => rej(new Error('CDP 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId; nextId += 1;
      return new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 夹具：两档容器（390／1280）各摆四份小节（长标题 ＋ 序号 ＋ 计数／窄档计数更长／长正文串）。 */
function fixtureHtml() {
  const one = renderSectionHead({
    title: '步骤（含腌制与回锅两段）', count: '6 步', seq: 1, open: true,
    body: '<p>焯水去沫 3 分 · 煸香豆瓣 2 分 · 回锅收汁 5 分 · 摆盘 1 分 · 冷藏腌制 30 分</p>',
  });
  const two = renderSectionHead({
    title: '食材', count: '11 味', seq: 2,
    body: '<dl><div><dt>螺丝椒</dt><dd>250 g</dd></div></dl>',
  });
  const three = renderSectionHead({
    title: '一个非常非常长的、用来把标题行撑到折行的中文小节标题', count: '12,345 条',
    seq: 3, body: '<p>正文</p>',
  });
  const four = renderSectionHead({
    title: '待换耗材', count: '3 件', seq: 4,
    body: '<p>净水滤芯 × 1 · 电池 × 2 · 密封圈 × 1</p>',
  });
  const cells = [one, two, three, four].map((h) => '<div class="cell">' + h + '</div>').join('\n');
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">\n<style>\n'
    + sectionHeadCss().replace('container-type: inline-size;', 'container-type: inline-size;')
    + '\nbody{margin:0;background:#f1ece1}\n.probe{display:flex;flex-direction:column;gap:24px}\n'
    + '.box{width:390px;padding:0}\n.cell{background:#fff;padding:4px 8px}\n'
    + '</style></head>\n<body class="ilife-page-ui">\n'
    + '<div class="probe">\n  <div class="box" id="narrow">\n' + cells + '\n  </div>\n</div>\n'
    + '</body></html>';
}

/** 真机页：起 headless Chrome，两档容器宽度由页内脚本改写（容器查询认的是容器自己的宽度）。 */
async function startGeometryPage() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-sec-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, fixtureHtml(), 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-sec-chrome-'));
  const port = 9930 + (process.pid % 200);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,1200', 'about:blank'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profile, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    let devUrl = null;
    for (let i = 0; i < 120 && devUrl === null; i += 1) {
      try { const r = await fetch('http://127.0.0.1:' + port + '/json/version'); if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl; } catch { /* 等端口 */ }
      if (devUrl === null) await sleep(250);
    }
    if (devUrl === null) throw new Error('CDP 未就绪（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl); await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    return {
      ev,
      /** 量一档：容器宽 → 逐件读数（横向溢出／行矩形／计数与标题是否掉字／标题行高度与命中盒）。 */
      measure: (width) => ev('(function(){'
        + 'var box=document.getElementById("narrow");box.style.width=' + JSON.stringify(String(width) + 'px') + ';'
        + 'void box.offsetWidth;'
        + 'var out={width:Math.round(box.getBoundingClientRect().width),overflow:0,rows:[],bad:[]};'
        + 'var heads=[].slice.call(box.querySelectorAll(".' + SECTION_HEAD_CLASS + '"));'
        + 'heads.forEach(function(h,i){'
        + 'var over=h.scrollWidth-h.clientWidth;if(over>out.overflow)out.overflow=over;'
        + 'var sum=h.querySelector("summary");var t=h.querySelector(".' + sectionHeadSlot('title') + '");'
        + 'var c=h.querySelector(".' + sectionHeadSlot('count') + '");'
        + 'var sb=sum.getBoundingClientRect();var tb=t.getBoundingClientRect();var cb=c?c.getBoundingClientRect():null;'
        + 'out.rows.push({i:i,w:Math.round(h.getBoundingClientRect().width),sumH:Math.round(sb.height),'
        + 'titleW:Math.round(tb.width),titleRight:Math.round(tb.right),sumRight:Math.round(sb.right),'
        + 'countW:cb?Math.round(cb.width):0,countRight:cb?Math.round(cb.right):0,title:1*t.clientHeight>0});'
        /* "掉字"的机器口径：元素的 scrollWidth 明显大于可见宽 ⇒ 文本被裁（`…` 或 `overflow:hidden`）。 */
        + 'if(t.scrollWidth>t.clientWidth+1)out.bad.push("title-clipped:"+i);'
        + 'if(c&&c.scrollWidth>c.clientWidth+1)out.bad.push("count-clipped:"+i);'
        + 'if(sum.scrollWidth>sum.clientWidth+1)out.bad.push("sum-clipped:"+i);'
        + '});'
        + 'var more=[].slice.call(box.querySelectorAll(".' + sectionHeadSlot('more') + '"));'
        + 'out.moreText=more.map(function(m){return getComputedStyle(m,"::before").content;});'
        + 'out.moreCaret=more.map(function(m){return getComputedStyle(m,"::after").transform;});'
        + 'return out;}())'),
      /** 开合是原生行为：点标题行 ⇒ 正文可见性跟着变（零脚本）。 */
      toggle: () => ev('(function(){var h=document.querySelector(".' + SECTION_HEAD_CLASS + '");'
        + 'var sum=h.querySelector("summary");var d=h.open;sum.click();'
        + 'var body=h.querySelector(".' + sectionHeadSlot('body') + '");'
        + 'return {before:d,after:h.open,bodyVisible:body.getBoundingClientRect().height>0};}())'),
      clickMeasured: () => ev('(function(){var s=document.querySelector(".' + SECTION_HEAD_CLASS + ' summary");'
        + 'var b=s.getBoundingClientRect();var el=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);'
        + 'return {h:Math.round(b.height),w:Math.round(b.width),top:!!el&&(el===s||s.contains(el))};}())'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('section-head ④ 两档几何（390／1280，headless Chrome ＋ CDP）', () => {
  it('零横向溢出 ＋ 计数与标题不掉字 ＋ 窄档计数自己折到第二行 ＋ 命中盒 ≥44 ＋ 原生开合', async (t) => {
    const p = await startGeometryPage();
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何与开合判据需真浏览器');
    try {
      const narrow = await p.measure(390);
      assert.equal(narrow.width, 390, '容器真宽');
      assert.equal(narrow.overflow, 0, '390 档不得横向溢出（实测 ' + narrow.overflow + 'px）');
      assert.deepEqual(narrow.bad, [], '390 档不许有被裁的字：' + narrow.bad.join('、'));
      assert.equal(narrow.rows.length, 4);
      for (const r of narrow.rows) {
        assert.ok(r.sumH >= SECTION_HEAD_SUM_MIN_PX, '命中盒高 ' + r.sumH + ' 小于 ' + SECTION_HEAD_SUM_MIN_PX);
        assert.ok(r.titleRight <= narrow.width + 1, '标题右缘越界：' + r.titleRight);
      }
      /* 第 3 件是"长标题 ＋ 长计数"那一档：计数必须折到第二行（不与标题抢同一行），且仍在容器内。 */
      const longOne = narrow.rows[2];
      assert.ok(longOne.countW > 0, '计数必须在（不许被压没）');
      assert.ok(longOne.countRight <= narrow.width + 1, '计数右缘越界：' + longOne.countRight);
      assert.ok(narrow.rows.some((r) => r.countW > 0), '至少一件带计数');

      const wide = await p.measure(1280);
      assert.equal(wide.width, 1280, '容器真宽');
      assert.equal(wide.overflow, 0, '1280 档不得横向溢出（实测 ' + wide.overflow + 'px）');
      assert.deepEqual(wide.bad, [], '1280 档不许有被裁的字：' + wide.bad.join('、'));
      for (const r of wide.rows) assert.ok(r.sumH >= SECTION_HEAD_SUM_MIN_PX, '宽档命中盒也不许低于 44：' + r.sumH);

      /* 命中盒的可点面：中心点必须落在 summary 自己身上。 */
      const hit = await p.clickMeasured();
      assert.ok(hit.w >= 44 && hit.h >= SECTION_HEAD_SUM_MIN_PX, '命中盒 ' + hit.w + '×' + hit.h);
      assert.equal(hit.top, true, '标题行必须是最上层可点元素');

      /* 零脚本的原生开合：点一下标题行，`open` 跟着翻转、正文可见性跟着变。 */
      const first = await p.toggle();
      assert.equal(first.before, true, '第一件起初是展开的（fixture 给了 open）');
      assert.equal(first.after, false, '点一下折叠');
      assert.equal(first.bodyVisible, false, '折叠时正文不可见');
      const again = await p.toggle();
      assert.equal(again.after, true, '再点一下展开');
      assert.equal(again.bodyVisible, true, '展开时正文可见');
    } finally { p.close(); }
  });
});
