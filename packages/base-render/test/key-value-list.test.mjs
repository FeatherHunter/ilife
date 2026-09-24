// key-value-list（档案行 · 形态 A「两列，值右对齐」）· 判据件。
//
// 断言对象是**编译产物**（组件目录自己的 `index.ts`，再经 `base-paint/blocks` 转出）。四类：
//   ① 渲染契约（结构／槽位／转义／**全部**非法入参分支）② 样式与零 DOM 纪律
//   ③ 加法式（只碰自己的类名；`blocks` 与组件层出口是同一引用）④ 两档几何（390／1280，真机量）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  KEY_VALUE_CLASS,
  KEY_VALUE_FORMS,
  KEY_VALUE_MIN_ROW_PX,
  KEY_VALUE_MISSING,
  keyValueSlot,
  renderKeyValueList,
  keyValueListCss,
} from '../dist/components/key-value-list/index.js';
/* 层出口与组件层总出口**用命名空间导入**：具名导入在导出缺席时是语法错误（整份判据都起不来），
   而本席落地期间那两行由接线席统一加 —— 缺席要读成"还没接线"，不是"本件坏了"。 */
import * as blocks from '../dist/blocks.js';
import * as layer from '../dist/components/index.js';
import { skinClass, skinCss, SKIN_NAMES } from '../dist/blocks.js';
import { renderDocShell } from '../dist/docShell.js';
import * as root from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
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
 *  机读口径（不靠"行首"或"`}` 紧邻"这类位置假设——本仓样式段里规则之间夹着大量注释，
 *  那些假设会把注释吞进选择器、或把 `@container` 块里的规则整条漏掉）：
 *  · 逐字符扫，配平花括号；每遇 `{` 就把「上一个 `{`／`}` 之后的文本」当候选选择器；
 *  · 候选含 `@`（at-rule 头）或 `*`（注释标记）⇒ 是包裹层/注释，不是规则；
 *  · 候选以 `while`／`if`／`function` 起头 ⇒ 是运行时里的花括号。 */
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

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('key-value-list ① 渲染契约', () => {
  it('骨架：一个 dl ＋ 逐行一个 div（dt 字段 ＋ dd 值）；值右对齐是形态 A 的识别特征', () => {
    const html = renderKeyValueList({ rows: [{ label: '身高', value: '172 cm', num: true }], heading: '用户档案' });
    assert.ok(html.startsWith('<div class="' + KEY_VALUE_CLASS + ' ' + keyValueSlot('form-rows') + '">'),
      '根带形态类：' + html.slice(0, 100));
    assert.match(html, new RegExp('<p class="' + keyValueSlot('heading') + '">用户档案</p>'));
    assert.equal((html.match(/<dl/g) || []).length, 1);
    assert.equal((html.match(/<dt/g) || []).length, 1);
    assert.match(html, new RegExp('<dt class="' + keyValueSlot('term') + '">身高</dt>'));
    assert.match(html, new RegExp('<dd class="' + keyValueSlot('value') + ' ' + keyValueSlot('value-num') + '">172 cm</dd>'));
    assert.ok(!html.includes('  '), '标记里不留连续空白');
  });

  it('**不画点线**：标记里不出现引导线槽，也不出现分隔符（那一段由列距承担）', () => {
    const html = renderKeyValueList({ rows: [{ label: '身高', value: '172' }, { label: '性别', value: '男' }] });
    assert.equal(html.includes('-leader'), false, '点线归账目行 ledger-rows，不归本件');
    assert.ok(!/[·:：]/.test(html), '标记里不许写分隔符：' + html);
  });

  it('缺槽不出：不给 heading 就没有标题行；不给 note 就没有后缀说明那一格', () => {
    const bare = renderKeyValueList({ rows: [{ label: '身高', value: '172' }] });
    assert.equal(bare.includes('-heading'), false);
    assert.equal(bare.includes('-note'), false);
    assert.equal(bare.includes(keyValueSlot('value-num')), false, '不给 num 就不出数字档');
  });

  it('后缀说明（note）是可省的第三个槽：给了就出，且它自己不带数字档', () => {
    const html = renderKeyValueList({ rows: [{ label: '目标体重', value: '65.0 kg', note: '还需减 3.4 kg', num: true }] });
    assert.match(html, new RegExp('<dd class="' + keyValueSlot('note') + '">还需减 3.4 kg</dd>'));
    assert.equal((html.match(new RegExp(keyValueSlot('value-num'), 'g')) || []).length, 1, '数字档只在值位那一格');
  });

  it('多行：逐行一个 div，行序按入参（读屏按定义列表配对读）', () => {
    const html = renderKeyValueList({ rows: [
      { label: '身高', value: '172 cm' }, { label: '性别', value: '男' }, { label: '出生年', value: '1993' },
    ] });
    assert.equal((html.match(/<div class="ilife-block-key-value-list-row">/g) || []).length, 3);
    assert.ok(html.indexOf('身高') < html.indexOf('性别') && html.indexOf('性别') < html.indexOf('出生年'));
  });

  it('转义：字段名／值／后缀说明／小标题四位都过实体', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderKeyValueList({ rows: [{ label: evil, value: evil, note: evil }], heading: evil });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;'));
    assert.equal((html.match(/&lt;script&gt;/g) || []).length, 4, '四位都得转义');
  });

  it('空数组＝空串（**空清单不是档案**）；标题单独给也不出（没有行就没有"档案"）', () => {
    assert.equal(renderKeyValueList({ rows: [] }), '');
    assert.equal(renderKeyValueList({ rows: [], heading: '用户档案' }), '');
  });

  it('非法入参逐条抛 BlocksError（不静默降级，逐行带下标）', () => {
    assert.equal(throwsBlocks(() => renderKeyValueList(undefined)), true);
    assert.equal(throwsBlocks(() => renderKeyValueList(null)), true);
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: 'x' })), true, 'rows 必须是数组');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: null })), true);
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [null] })), true, '行必须是对象');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: '', value: '1' }] })), true, 'label 非空');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '' }] })), true, 'value 非空');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '   ' }] })), true, 'value 不许全空白');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: 1 }] })), true, 'value 只收串');
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '1', note: 2 }] })), true);
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '1', num: 'yes' }] })), true);
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '1' }], form: 'grouped' })), true);
    assert.equal(throwsBlocks(() => renderKeyValueList({ rows: [{ label: 'a', value: '1' }], extraClass: 'a b!' })), true);
    /* 报错文案带行下标：调用方一眼定位是第几行。 */
    assert.throws(() => renderKeyValueList({ rows: [{ label: 'a', value: '1' }, { label: '', value: '2' }] }),
      /rows\[1\]/);
  });

  it('缺值写 `—`（契约常量）；槽位类名的拼法唯一（判据与渲染同读 `keyValueSlot`）', () => {
    assert.equal(KEY_VALUE_MISSING, '\u2014');
    assert.match(renderKeyValueList({ rows: [{ label: '退款', value: KEY_VALUE_MISSING }] }),
      new RegExp('>' + KEY_VALUE_MISSING + '<'));
    assert.deepEqual([...KEY_VALUE_FORMS], ['rows']);
    for (const slot of ['heading', 'list', 'row', 'term', 'value', 'note', 'value-num', 'form-rows']) {
      assert.equal(keyValueSlot(slot), 'ilife-block-key-value-list-' + slot);
      assert.equal(keyValueSlot(slot, 'x-'), 'x-block-key-value-list-' + slot);
    }
    const html = renderKeyValueList({ rows: [{ label: 'l', value: 'v', note: 'n', num: true }], heading: 'h' });
    for (const slot of ['heading', 'list', 'row', 'term', 'value', 'note', 'value-num', 'form-rows']) {
      assert.ok(html.includes(keyValueSlot(slot)), '产物里缺槽：' + slot);
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('key-value-list ② 样式与零 DOM 纪律', () => {
  const css = stripComments(keyValueListCss());

  it('样式段非空，且**每条**规则都 scope 在 `.ilife-page-ui` 之下（含 `@container` 块里的）', () => {
    assert.ok(css.trim() !== '');
    const rules = ruleSelectors(css);
    assert.ok(rules.length > 0, '一条规则都抽不到 ⇒ 判据空转');
    for (const r of rules) {
      assert.ok(/^\.ilife-page-ui\s/.test(r.sel), '这条规则没从 scope 起头（裸着会与别件串味）：' + r.sel);
    }
  });

  it('零 :root／!important／禁入 token；不定义任何自定义属性名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    for (const bad of ['--r-xl', '--pink']) assert.equal(css.includes(bad), false);
    const decls = css.match(/--[a-z0-9-]+\s*:/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
  });

  it('皮肤只经 skinVar 读：`var(--ilife-…` 一律带兜底链（无裸读）', () => {
    const reads = [...css.matchAll(/var\(--ilife-[a-z0-9-]+,\s*[^)]+\)/g)];
    assert.ok(reads.length >= 8, '本件该读好几个 token，实读 ' + reads.length);
    assert.deepEqual([...css.matchAll(/var\(\s*--ilife-[a-z0-9-]+\s*\)/g)], [], '裸代码里的皮肤变量');
  });

  it('**产物层**：每条选择器里 `.ilife-page-ui` 恰一次（组合器右边不许再要求一次 scope）', () => {
    /* 断的是**调用样式函数后的字符串**（不是源码拼法）：助手组合出来的双 scope
       （`.page-ui .A + .page-ui .B`）在源码里看着像两个正确的助手，只有从产物里数才抓得到——
       这正是「相邻行那条发丝线从来没画出来」那一类死规则的读法。
       `ruleSelectors` 逐字符配平花括号 ⇒ `@container` 块里的规则同样被判。 */
    const bad = [];
    for (const r of ruleSelectors(css)) {
      const hits = (r.sel.match(/\.ilife-page-ui/g) || []).length;
      if (hits !== 1) bad.push(r.sel + '（.ilife-page-ui 出现 ' + hits + ' 次）');
    }
    assert.deepEqual(bad, [], '作用域不是恰一次（0 次＝与别件串味，>1 次＝永不命中的死规则）：\n  ' + bad.join('\n  '));
  });

  it('几何契约：值位右对齐 ＋ 数字成列；行高下限 44；长值只换行不截断', () => {
    assert.match(css, /justify-self: end/);
    assert.match(css, /text-align: right/);
    assert.ok(css.includes('font-variant-numeric: tabular-nums'));
    assert.equal(KEY_VALUE_MIN_ROW_PX, 44);
    assert.match(css, new RegExp('min-height: ' + KEY_VALUE_MIN_ROW_PX + 'px'));
    assert.ok(css.includes('overflow-wrap: anywhere'));
    assert.equal(/text-overflow|line-clamp/.test(css), false, '本件不许有任何截断手段');
    const valueRule = css.split(keyValueSlot('value') + ' {')[1].split('}')[0];
    assert.ok(valueRule.includes('overflow-wrap: anywhere'), '值位必须能换行');
    assert.ok(valueRule.includes('text-align: right'), '值位右对齐住它自己的规则里');
  });

  it('宽度只许容器判：两列收一列走 `@container`，没有判宽度的 `@media`', () => {
    assert.ok(css.includes('container-type: inline-size'));
    assert.ok(css.includes('@container (max-width:'));
    assert.deepEqual(css.match(/@media[^{]*/g) || [], [], '本件一条 @media 都不该有');
  });

  it('dist 里本件产物剥掉字面量与注释后零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'key-value-list');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length >= 5);
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

describe('key-value-list ③ 加法式（不挂这块样式＝别人产物逐字节不变）', () => {
  it('样式段只认自己的类名；不许有全局选择器', () => {
    const css = stripComments(keyValueListCss());
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []).map((s) => s.trim());
    for (const sel of selectors) {
      const dropped = sel.replace(/\.ilife-page-ui/g, '').replace(/\s*>\s*/g, ' ').replace(/\s*\+\s*/g, ' ').trim();
      for (const m of dropped.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
        assert.equal(m[1].startsWith(KEY_VALUE_CLASS), true, '碰了别人的类名：' + m[1] + '（在 ' + sel + ' 里）');
      }
      assert.equal(/^(html|body|\*)/.test(dropped), false, '不许有全局选择器：' + sel);
    }
  });

  it('只留一条路：组件**不从根出口**出；层出口若已接线，必须是同一个实现', () => {
    assert.equal(typeof renderKeyValueList, 'function');
    assert.equal(root.renderKeyValueList, undefined, '组件层不得从根出口出');
    assert.equal(root.keyValueListCss, undefined);
    assert.ok(layer.renderKeyValueList === undefined || layer.renderKeyValueList === renderKeyValueList,
      '组件层出口不许出现第二份实现');
    assert.ok(blocks.renderKeyValueList === undefined || blocks.renderKeyValueList === renderKeyValueList,
      '`base-paint/blocks` 若转出本件，必须是同一引用');
  });

  it('加法式：不挂本件的页产物里一个本件字节都没有；挂了＝原页 ＋ 这一段', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(KEY_VALUE_CLASS), false, '不挂本件时不得出现它的类名');
    assert.equal(off.includes('key-value-list'), false, '样式段也不得随页挂上');
    assert.equal(off, shell(), '两次渲染逐字节相同');
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderKeyValueList({ rows: [{ label: '身高', value: '172 cm' }] }),
      extraCss: keyValueListCss(),
    });
    assert.ok(on.includes(KEY_VALUE_CLASS), '挂上后类名在');
    assert.ok(on.includes('.ilife-page-ui .ilife-block-key-value-list'), '样式段随页挂上');
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('三套皮肤下标记逐字节相同：皮肤只换样式段与皮肤类，标记面一个字节不动', () => {
    const list = renderKeyValueList({ rows: [{ label: '身高', value: '172 cm', num: true }] });
    const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
      + '<div class="ilife-page-ui ' + skinClass(name) + '">' + list + '</div>';
    const withoutSkin = (name) => pageOf(name)
      .replace(skinCss({ skins: [name] }), '')
      .replace(skinClass(name), '');
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(list), '挖掉皮肤后标记必须原样在');
    for (const name of SKIN_NAMES) {
      assert.equal(withoutSkin(name), bare, name + ' 的标记面与 ' + SKIN_NAMES[0] + ' 不同');
    }
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

/** 夹具：长值／长字段名／数字值／缺值四档都要在场（要断的就是"值不许被裁"）。 */
function fixtureHtml() {
  const rows = [
    { label: '身高', value: '172 cm', num: true },
    { label: '目标体重', value: '65.0 kg', note: '还需减 3.4 kg', num: true },
    { label: '一个非常非常长的字段名用来把左栏撑满并折行', value: '中等活动量（每周 3–4 次）' },
    { label: '证件号码', value: '4405 1993 1234 5678 9012', num: true },
    { label: '存放位置', value: '书房 · 第二层抽屉 · 靠里那格 · 蓝色收纳盒', note: '取用后请归位' },
    { label: '退款', value: KEY_VALUE_MISSING },
  ];
  const one = renderKeyValueList({ heading: '用户档案', rows });
  const two = renderKeyValueList({ rows: [{ label: '账户', value: '招商银行储蓄卡（尾号 4321）· 主账户' }] });
  const cells = [one, two].map((h) => '<div class="cell">' + h + '</div>').join('\n');
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">\n<style>\n' + keyValueListCss()
    + '\nbody{margin:0;background:#f1ece1}\n.box{width:390px;padding:0}\n.cell{background:#fff;padding:4px 8px}\n'
    + '</style></head>\n<body class="ilife-page-ui">\n<div class="box" id="box">\n' + cells + '\n</div>\n</body></html>';
}

async function startGeometryPage() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-kv-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, fixtureHtml(), 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-kv-chrome-'));
  const port = 9730 + (process.pid % 200);
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,1400', 'about:blank'],
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
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 80; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    return {
      ev,
      measure: (width) => ev('(function(){'
        + 'var box=document.getElementById("box");box.style.width=' + JSON.stringify(String(width) + 'px') + ';'
        + 'void box.offsetWidth;'
        + 'var out={width:Math.round(box.getBoundingClientRect().width),overflow:0,rows:[],bad:[]};'
        + 'var lists=[].slice.call(box.querySelectorAll(".' + KEY_VALUE_CLASS + '"));'
        + 'lists.forEach(function(l){var o=l.scrollWidth-l.clientWidth;if(o>out.overflow)out.overflow=o;'
        + 'var rows=[].slice.call(l.querySelectorAll(".' + keyValueSlot('row') + '"));'
        + 'rows.forEach(function(r,i){'
        + 'var dt=r.querySelector(".' + keyValueSlot('term') + '");var dd=r.querySelector(".' + keyValueSlot('value') + '");'
        + 'var rb=r.getBoundingClientRect();var vb=dd.getBoundingClientRect();'
        + 'var cs=getComputedStyle(dd);'
        + 'out.rows.push({w:Math.round(rb.width),h:Math.round(rb.height),'
        + 'valueRight:Math.round(vb.right),valueText:dd.textContent,'
        + 'align:cs.textAlign,nums:cs.fontVariantNumeric});'
        + 'if(r.scrollWidth>r.clientWidth+1)out.bad.push("row-overflow:"+i);'
        + 'if(dd.scrollWidth>dd.clientWidth+1||dt.scrollWidth>dt.clientWidth+1)out.bad.push("cell-clipped:"+i);'
        + '});});'
        + 'return out;}())'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('key-value-list ④ 两档几何（390／1280，headless Chrome ＋ CDP）', () => {
  it('零横向溢出 ＋ 值不掉字 ＋ 宽档值右缘成列 ＋ 窄档收成一列', async (t) => {
    const p = await startGeometryPage();
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      const wide = await p.measure(1280);
      assert.equal(wide.width, 1280, '容器真宽');
      assert.equal(wide.overflow, 0, '1280 档不得横向溢出（实测 ' + wide.overflow + 'px）');
      assert.deepEqual(wide.bad, [], '1280 档不许有被裁的格：' + wide.bad.join('、'));
      for (const r of wide.rows) {
        assert.equal(r.align, 'right', '宽档值位右对齐：' + r.valueText);
        assert.equal(r.nums, 'tabular-nums', '值位一律 tabular-nums');
      }
      /* 值右缘成列：同一张档案里各行的值右缘差 ≤1px（"右对齐"这句话的机器口径）。 */
      const listOne = wide.rows.slice(0, 6);
      const rights = listOne.map((r) => r.valueRight);
      assert.ok(Math.max(...rights) - Math.min(...rights) <= 1, '值右缘没成列：' + rights.join(','));

      const narrow = await p.measure(390);
      assert.equal(narrow.width, 390, '容器真宽');
      assert.equal(narrow.overflow, 0, '390 档不得横向溢出（实测 ' + narrow.overflow + 'px）');
      assert.deepEqual(narrow.bad, [], '390 档不许有被裁的字：' + narrow.bad.join('、'));
      for (const r of narrow.rows) {
        assert.equal(r.align, 'left', '窄档收成一列后左端对齐（再右对齐会与标签拉出空档）：' + r.valueText);
        assert.ok(r.h >= 2, '行不可能压成零高：' + r.h);
      }
    } finally { p.close(); }
  });
});
