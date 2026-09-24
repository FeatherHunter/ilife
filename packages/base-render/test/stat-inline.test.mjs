// stat-inline（行内读数 · 形态 A「分隔点行内串」）· 判据件。
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
  STAT_INLINE_CLASS,
  STAT_INLINE_FORMS,
  STAT_INLINE_MISSING,
  STAT_INLINE_SEP,
  statInlineSlot,
  renderStatInline,
  statInlineCss,
} from '../dist/components/stat-inline/index.js';
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

/* ── ① 渲染契约 ─────────────────────────────────────────────────────── */

describe('stat-inline ① 渲染契约', () => {
  it('骨架：一个容器 ＋ 逐项一个 nowrap 单元（标签／值／字尾三枚）；项间一枚分隔点', () => {
    const html = renderStatInline({ items: [
      { label: '餐费', value: '12', unit: '笔' },
      { label: '合计', value: '¥2,140.00' },
      { label: '占', value: '49.9%' },
    ] });
    assert.ok(html.startsWith('<div class="' + STAT_INLINE_CLASS + ' ' + statInlineSlot('form-dots') + '">'),
      '根带形态类：' + html.slice(0, 100));
    assert.equal((html.match(new RegExp(statInlineSlot('item'), 'g')) || []).length, 3);
    assert.equal((html.match(new RegExp(statInlineSlot('sep'), 'g')) || []).length, 2, 'N 项 ⇒ N-1 枚分隔点');
    assert.match(html, new RegExp('<span class="' + statInlineSlot('label') + '">餐费</span>'
      + '<b class="' + statInlineSlot('value') + '">12</b>'
      + '<span class="' + statInlineSlot('label') + '">笔</span>'));
    assert.ok(!html.includes('  '), '标记里不留连续空白');
  });

  it('分隔点是 `·`（U+00B7）且 `aria-hidden`（读屏听到的是几段完整的话，不是一串逗号）', () => {
    const html = renderStatInline({ items: [{ value: '1' }, { value: '2' }] });
    assert.equal(STAT_INLINE_SEP, '\u00B7');
    assert.match(html, new RegExp('<span class="' + statInlineSlot('sep') + '" aria-hidden="true">'
      + STAT_INLINE_SEP + '</span>'));
    assert.equal(html.includes('\u30FB'), false, '不许用片假名中点');
    assert.equal(html.includes('\u2022'), false, '不许用 bullet');
  });

  it('`interpunct:false` 时整槽不出，其余一字不差', () => {
    const items = [{ value: '1' }, { value: '2' }, { value: '3' }];
    const with_ = renderStatInline({ items });
    const without = renderStatInline({ items, interpunct: false });
    assert.equal((with_.match(new RegExp(statInlineSlot('sep'), 'g')) || []).length, 2);
    assert.equal(without.includes(statInlineSlot('sep')), false);
    assert.equal(without, with_.replace(new RegExp('<span class="' + statInlineSlot('sep')
      + '" aria-hidden="true">' + STAT_INLINE_SEP + '</span>', 'g'), ''), '关掉分隔点只少这几枚 span');
  });

  it('单项不出分隔点（两枚都不出）：N=1 ⇒ N-1=0', () => {
    const html = renderStatInline({ items: [{ label: '合计', value: '¥2,140.00' }] });
    assert.equal(html.includes(statInlineSlot('sep')), false);
    assert.equal((html.match(new RegExp(statInlineSlot('item'), 'g')) || []).length, 1);
  });

  it('缺槽不出：不给 label／unit 就只有值那一枚（不留空格子）', () => {
    const html = renderStatInline({ items: [{ value: '—' }] });
    assert.equal(html.includes(statInlineSlot('label')), false);
    assert.match(html, new RegExp('<b class="' + statInlineSlot('value') + '">' + STAT_INLINE_MISSING + '</b>'));
  });

  it('转义：标签／值／字尾三位都过实体', () => {
    const evil = '"><script>alert(1)</script>';
    const html = renderStatInline({ items: [{ label: evil, value: evil, unit: evil }] });
    assert.ok(!/<script/i.test(html), '不得出现可执行脚本标签');
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;'));
    assert.equal((html.match(/&lt;script&gt;/g) || []).length, 3, '三位都得转义');
  });

  it('空数组＝空串（空串只会在页面上留一条空线）；这是**唯一**不抛错误的空形态', () => {
    assert.equal(renderStatInline({ items: [] }), '');
    assert.equal(renderStatInline({ items: [], interpunct: true }), '');
  });

  it('非法入参逐条抛 BlocksError（不静默降级，逐项带下标）', () => {
    assert.equal(throwsBlocks(() => renderStatInline(undefined)), true);
    assert.equal(throwsBlocks(() => renderStatInline(null)), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: 'x' })), true, 'items 必须是数组');
    assert.equal(throwsBlocks(() => renderStatInline({ items: null })), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: [null] })), true, '项必须是对象');
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '' }] })), true, 'value 非空');
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '  ' }] })), true, 'value 不许全空白');
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: 1 }] })), true, 'value 只收串');
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '1', label: 2 }] })), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '1', unit: 2 }] })), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '1' }], interpunct: 'yes' })), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '1' }], form: 'badge' })), true);
    assert.equal(throwsBlocks(() => renderStatInline({ items: [{ value: '1' }], extraClass: 'a b!' })), true);
    assert.throws(() => renderStatInline({ items: [{ value: '1' }, { value: '' }] }), /items\[1\]/);
  });

  it('extraClass 进容器；槽位类名的拼法唯一（判据与渲染同读 `statInlineSlot`）', () => {
    assert.match(renderStatInline({ items: [{ value: '1' }], extraClass: 'is-tight' }),
      new RegExp('^<div class="' + STAT_INLINE_CLASS + ' ' + statInlineSlot('form-dots') + ' is-tight">'));
    assert.deepEqual([...STAT_INLINE_FORMS], ['dots']);
    assert.equal(STAT_INLINE_MISSING, '\u2014');
    for (const slot of ['item', 'label', 'value', 'sep', 'form-dots']) {
      assert.equal(statInlineSlot(slot), 'ilife-block-stat-inline-' + slot);
      assert.equal(statInlineSlot(slot, 'x-'), 'x-block-stat-inline-' + slot);
    }
    const html = renderStatInline({ items: [{ label: 'l', value: 'v', unit: 'u' }, { value: 'w' }] });
    for (const slot of ['item', 'label', 'value', 'sep', 'form-dots']) {
      assert.ok(html.includes(statInlineSlot(slot)), '产物里缺槽：' + slot);
    }
  });
});

/* ── ② 样式与零 DOM 纪律 ───────────────────────────────────────────── */

describe('stat-inline ② 样式与零 DOM 纪律', () => {
  const css = stripComments(statInlineCss());

  it('样式段非空，且全部规则 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []).filter((sel) => !sel.trim().startsWith('@'));
    assert.ok(selectors.length > 0);
    for (const sel of selectors) assert.ok(sel.includes('.ilife-page-ui'), '必须 scope：' + sel.trim());
  });

  it('零 :root／!important／禁入 token；不定义任何自定义属性名', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    for (const bad of ['--r-xl', '--pink']) assert.equal(css.includes(bad), false);
    const decls = css.match(/--[a-z0-9-]+\s*:\s/g) || [];
    assert.equal(decls.length, 0, '不得定义新 token：' + decls.join(' '));
  });

  it('皮肤只经 skinVar 读：`var(--ilife-…` 一律带兜底链（无裸读）', () => {
    const reads = [...css.matchAll(/var\(--ilife-[a-z0-9-]+,\s*[^)]+\)/g)];
    assert.ok(reads.length >= 5, '本件该读好几个 token，实读 ' + reads.length);
    assert.deepEqual([...css.matchAll(/var\(\s*--ilife-[a-z0-9-]+\s*\)/g)], [], '裸代码里的皮肤变量');
  });

  it('几何契约：每一项恒 nowrap ＋ 整行可折行（`flex-wrap`）；数字 tabular-nums；不截断', () => {
    const itemRule = css.split(statInlineSlot('item') + ' {')[1].split('}')[0];
    assert.ok(itemRule.includes('white-space: nowrap'), '项恒不换行（值与其标签不许分家）');
    const boxRule = css.split(STAT_INLINE_CLASS + ' {')[1].split('}')[0];
    assert.ok(boxRule.includes('flex-wrap: wrap'), '整行必须能折行');
    assert.ok(css.includes('font-variant-numeric: tabular-nums'));
    assert.ok(css.includes('overflow-wrap: anywhere'));
    assert.equal(/text-overflow|line-clamp|overflow:hidden/.test(css), false, '本件不许有任何截断手段');
    assert.deepEqual(css.match(/@media[^{]*/g) || [], [], '本件没有设备能力差异：一条 @media 都不该有');
    assert.equal(css.includes('@container'), false, '本件不需要宽度档（折行由内在尺寸承担）');
  });

  it('dist 里本件产物剥掉字面量与注释后零 document.／window.／navigator.', () => {
    const dir = join(PKG, 'dist', 'components', 'stat-inline');
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

describe('stat-inline ③ 加法式（不挂这块样式＝别人产物逐字节不变）', () => {
  it('样式段只认自己的类名；不许有全局选择器', () => {
    const css = stripComments(statInlineCss());
    const selectors = (css.match(/^[^@\s][^{\n]*\{/gm) || []).map((s) => s.trim());
    for (const sel of selectors) {
      const dropped = sel.replace(/\.ilife-page-ui/g, '').replace(/\s*>\s*/g, ' ').trim();
      for (const m of dropped.matchAll(/\.([A-Za-z0-9_-]+)/g)) {
        assert.equal(m[1].startsWith(STAT_INLINE_CLASS), true, '碰了别人的类名：' + m[1] + '（在 ' + sel + ' 里）');
      }
      assert.equal(/^(html|body|\*)/.test(dropped), false, '不许有全局选择器：' + sel);
    }
  });

  it('只留一条路：组件**不从根出口**出；层出口若已接线，必须是同一个实现', () => {
    assert.equal(typeof renderStatInline, 'function');
    assert.equal(root.renderStatInline, undefined, '组件层不得从根出口出');
    assert.equal(root.statInlineCss, undefined);
    assert.ok(layer.renderStatInline === undefined || layer.renderStatInline === renderStatInline,
      '组件层出口不许出现第二份实现');
    assert.ok(blocks.renderStatInline === undefined || blocks.renderStatInline === renderStatInline,
      '`base-paint/blocks` 若转出本件，必须是同一引用');
  });

  it('加法式：不挂本件的页产物里一个本件字节都没有；挂了＝原页 ＋ 这一段', () => {
    const shell = () => renderDocShell({ docTitle: 'T', bodyHtml: '<p>x</p>', extraCss: '' });
    const off = shell();
    assert.equal(off.includes(STAT_INLINE_CLASS), false, '不挂本件时不得出现它的类名');
    assert.equal(off.includes('stat-inline'), false, '样式段也不得随页挂上');
    assert.equal(off, shell(), '两次渲染逐字节相同');
    const on = renderDocShell({
      docTitle: 'T', bodyHtml: '<p>x</p>' + renderStatInline({ items: [{ label: '合计', value: '¥2,140.00' }] }),
      extraCss: statInlineCss(),
    });
    assert.ok(on.includes(STAT_INLINE_CLASS), '挂上后类名在');
    assert.ok(on.includes('.ilife-page-ui .ilife-block-stat-inline'), '样式段随页挂上');
    assert.ok(on.indexOf(off.slice(0, 200)) === 0, '页壳头部逐字节不变');
  });

  it('三套皮肤下标记逐字节相同：皮肤只换样式段与皮肤类，标记面一个字节不动', () => {
    const line = renderStatInline({ items: [{ label: '合计', value: '¥2,140.00' }] });
    const pageOf = (name) => '<style>' + skinCss({ skins: [name] }) + '</style>'
      + '<div class="ilife-page-ui ' + skinClass(name) + '">' + line + '</div>';
    const withoutSkin = (name) => pageOf(name)
      .replace(skinCss({ skins: [name] }), '')
      .replace(skinClass(name), '');
    const bare = withoutSkin(SKIN_NAMES[0]);
    assert.ok(bare.includes(line), '挖掉皮肤后标记必须原样在');
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

/** 夹具：五个数的小结行（原型那一档）＋ 长文案 ＋ 缺值项。 */
function fixtureHtml() {
  const one = renderStatInline({ items: [
    { label: '餐费', value: '12', unit: '笔' },
    { label: '合计', value: '¥2,140.00' },
    { label: '占', value: '49.9%' },
    { label: '较上月', value: '+15.1%' },
    { label: '日均', value: '¥85.60' },
  ] });
  const two = renderStatInline({ items: [
    { label: '有记录', value: '6', unit: '天' },
    { label: '合计', value: '8,420', unit: '卡' },
    { label: '退款', value: STAT_INLINE_MISSING },
    { label: '一个很长很长的标签文案', value: '12,345.678' },
  ] });
  const cells = [one, two].map((h) => '<div class="cell">' + h + '</div>').join('\n');
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8">\n<style>\n' + statInlineCss()
    + '\nbody{margin:0;background:#f1ece1}\n.box{width:390px;padding:0}\n.cell{background:#fff;padding:4px 8px}\n'
    + '</style></head>\n<body class="ilife-page-ui">\n<div class="box" id="box">\n' + cells + '\n</div>\n</body></html>';
}

async function startGeometryPage() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-si-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, fixtureHtml(), 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-si-chrome-'));
  const port = 9750 + (process.pid % 200);
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
      measure: (width) => ev('(function(){'
        + 'var box=document.getElementById("box");box.style.width=' + JSON.stringify(String(width) + 'px') + ';'
        + 'void box.offsetWidth;'
        + 'var out={width:Math.round(box.getBoundingClientRect().width),overflow:0,items:0,seps:0,bad:[]};'
        + 'var lines=[].slice.call(box.querySelectorAll(".' + STAT_INLINE_CLASS + '"));'
        + 'lines.forEach(function(l,i){var o=l.scrollWidth-l.clientWidth;if(o>out.overflow)out.overflow=o;'
        + 'var lh=parseFloat(getComputedStyle(l).lineHeight);'
        + 'var its=[].slice.call(l.querySelectorAll(".' + statInlineSlot('item') + '"));'
        + 'out.items+=its.length;'
        + 'out.seps+=[].slice.call(l.querySelectorAll(".' + statInlineSlot('sep') + '" )).length;'
        /* 项内不分家：一个项的高度超过一行 ⇒ 值与其标签被拆开了（这一形态的第一条不变量）。 */
        + 'its.forEach(function(it,j){var h=it.getBoundingClientRect().height;'
        + 'if(h>lh*1.5)out.bad.push("item-wrapped:"+i+"."+j+"("+Math.round(h)+">"+Math.round(lh)+")");'
        + 'if(it.scrollWidth>it.clientWidth+1)out.bad.push("item-clipped:"+i+"."+j);});'
        + 'var v=l.querySelector(".' + statInlineSlot('value') + '");'
        + 'out.nums=getComputedStyle(v).fontVariantNumeric;'
        + '});'
        + 'return out;}())'),
      close: () => { cdp.close(); cleanup(); },
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('stat-inline ④ 两档几何（390／1280，headless Chrome ＋ CDP）', () => {
  it('零横向溢出 ＋ 每一项不被拆行（值与其标签不许分家）＋ 数字成列', async (t) => {
    const p = await startGeometryPage();
    if (p === null) return t.skip('本机无 Chrome／Chromium：几何判据需真浏览器');
    try {
      for (const width of [390, 1280]) {
        const m = await p.measure(width);
        assert.equal(m.width, width, '容器真宽');
        assert.equal(m.overflow, 0, width + ' 档不得横向溢出（实测 ' + m.overflow + 'px）');
        assert.deepEqual(m.bad, [], width + ' 档不许有被拆行／被裁的项：' + m.bad.join('、'));
        assert.equal(m.nums, 'tabular-nums', '值位一律 tabular-nums');
      }
      const wide = await p.measure(1280);
      assert.equal(wide.items, 9, '两行共九项都在场（容器查询没把谁藏起来）');
      assert.equal(wide.seps, 7, '分隔点 N-1：五项行 4 枚、四项行 3 枚');
      const narrow = await p.measure(390);
      assert.equal(narrow.items, wide.items, '窄档项数不许变（只折行，不丢项）');
      assert.equal(narrow.seps, wide.seps, '窄档分隔点数不许变');
    } finally { p.close(); }
  });
});
