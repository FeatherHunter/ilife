// toast-card · 判据件（四类：① 渲染契约 ② 样式与零 DOM 纪律 ③ 加法式 ④ 真机两档 ＋ 交互）。
//
// 断言对象是**消费方真走的那条出口**：`dist/components/toast-card/index.js`。
// 真机那一段自己起 headless Chrome（**端口由 Chrome 自己挑**：`--remote-debugging-port=0` ＋
// 读 `user-data-dir` 下的 `DevToolsActivePort`——不猜端口，猜端口会连到别人的浏览器上量错页面）：
// 视口恒 1440，两档容器 390／1280，量溢出／命中盒／焦点描边／自动消失／堆 3 挤最旧／危险档 role／
// 指针停住时计时被拖住／`prefers-reduced-motion` 下不卡在半路。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  TOAST_CARD_ACTION_ATTR,
  TOAST_CARD_BOUND_ATTR,
  TOAST_CARD_CLASS,
  TOAST_CARD_CLOSE_ATTR,
  TOAST_CARD_CLOSE_LABEL,
  TOAST_CARD_DEFAULT_MS,
  TOAST_CARD_DURATION_ATTR,
  TOAST_CARD_EVENT_ACTION,
  TOAST_CARD_ITEM_ATTR,
  TOAST_CARD_LEAVING_CLASS,
  TOAST_CARD_MAX_ATTR,
  TOAST_CARD_MAX_MS,
  TOAST_CARD_MAX_STACK,
  TOAST_CARD_MIN_MS,
  TOAST_CARD_NARROW_PX,
  TOAST_CARD_PAUSED_ATTR,
  TOAST_CARD_SLOTS,
  TOAST_CARD_STACK_ATTR,
  TOAST_CARD_TONES,
  TOAST_CARD_TONE_ATTR,
  TOAST_CARD_TONE_GLYPHS,
  TOAST_CARD_TONE_LIVE,
  TOAST_CARD_TONE_ROLES,
  TOAST_CARD_TONE_RULES,
  TOAST_CARD_TONE_WORDS,
  TOAST_CARD_TOUCH_PX,
  buildToastCardJs,
  renderToastCard,
  renderToastCardStack,
  toastCardCss,
  toastCardSlot,
} from '../dist/components/toast-card/index.js';
import { skinCss } from '../dist/blocks.js';
// 冻结面那件 `renderToast` 走**根出口**（`blocks.ts` 不转出它）——加法式那一条要拿它做「一字没动」的对照。
import { renderToast } from '../dist/index.js';
import { CSS_VAR_TOKENS } from '../dist/spec/index.js';
import { styleSource } from './_style-sources.mjs';

const NAME = 'toast-card';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const PAGE_UI = 'ilife-page-ui';
/** 槽位选择器（唯一拼法住在 attrs.ts）。 */
const SEL = (slot) => '.' + toastCardSlot(slot);

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
/** 抽出**每条规则的选择器**（配平花括号扫描：`@media`／`@container` 块里的规则也算）。 */
function ruleSelectors(css) {
  const out = [];
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      const sel = buf.trim();
      buf = '';
      if (sel !== '' && !sel.startsWith('@')) out.push(sel);
    } else if (ch === '}') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}
function distFiles(name) {
  const dir = join(PKG, 'dist', 'components', name);
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(dir, e.name));
}
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const SAMPLE = {
  title: '写入 3 条',
  detail: '记账与备忘已写进「九月」多维表。',
  action: { id: 'undo', label: '撤销' },
};

describe('toast-card ① 渲染契约', () => {
  it('一条提示：图标底盘 ＋ 语气字·标题 ＋ 细节 ＋ 动作 ＋ 关闭（锚与 role 全在）', () => {
    const html = renderToastCard(SAMPLE);
    assert.ok(html.startsWith('<div class="' + TOAST_CARD_CLASS + ' is-ok"'));
    assert.ok(html.includes(TOAST_CARD_ITEM_ATTR + '=""'), '根上要有「这是一条提示」的锚');
    assert.ok(html.includes(TOAST_CARD_TONE_ATTR + '="ok"'));
    assert.ok(html.includes(TOAST_CARD_DURATION_ATTR + '="' + String(TOAST_CARD_DEFAULT_MS) + '"'),
      '时长要进标记（运行时按它给每条独立计时）');
    assert.match(html, /role="status" aria-live="polite"/);
    assert.match(html, new RegExp('<span class="' + toastCardSlot('icon') + '" aria-hidden="true">' + TOAST_CARD_TONE_GLYPHS.ok + '</span>'));
    assert.ok(html.includes('>' + TOAST_CARD_TONE_WORDS.ok + '</span>'), '语气字（色之外的第二样）');
    assert.match(html, new RegExp('<b class="' + toastCardSlot('title') + '">写入 3 条</b>'));
    assert.match(html, new RegExp('<p class="' + toastCardSlot('detail') + '">记账与备忘已写进「九月」多维表。</p>'));
    assert.ok(html.includes(TOAST_CARD_ACTION_ATTR + '="undo"'), '动作名进锚');
    assert.match(html, new RegExp('<button class="' + toastCardSlot('action') + '"[^>]*>撤销</button>'));
    assert.ok(html.includes(TOAST_CARD_CLOSE_ATTR + '=""'), '关闭键的锚');
    assert.ok(html.includes('aria-label="' + TOAST_CARD_CLOSE_LABEL + '"'), '关闭键要有可读名字');
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false, '零内联事件处理器');
  });

  it('不给 action 就不出动作键；语气档三样（竖条粗细／字形／语气字）逐档不同', () => {
    const bare = renderToastCard({ title: '已同步' });
    assert.equal(bare.includes(TOAST_CARD_ACTION_ATTR), false, '没有动作就不该留空壳按钮');
    assert.ok(bare.includes(TOAST_CARD_CLOSE_ATTR), '关闭键恒在');
    assert.deepEqual([...TOAST_CARD_TONES], ['ok', 'warn', 'danger']);
    assert.equal(new Set([...TOAST_CARD_TONES].map((t) => TOAST_CARD_TONE_WORDS[t])).size, 3, '语气字三档要各不相同');
    assert.equal(new Set([...TOAST_CARD_TONES].map((t) => TOAST_CARD_TONE_GLYPHS[t])).size, 3, '字形三档要各不相同');
    assert.equal(new Set([...TOAST_CARD_TONES].map((t) => TOAST_CARD_TONE_RULES[t])).size, 3, '竖条粗细三档要各不相同');
    for (const tone of TOAST_CARD_TONES) {
      const html = renderToastCard({ title: 'x', tone, detail: 'y' });
      assert.ok(html.includes('is-' + tone), tone + ' 的语气类');
      assert.ok(html.includes('>' + TOAST_CARD_TONE_WORDS[tone] + '</span>'), tone + ' 的语气字');
      assert.ok(html.includes(TOAST_CARD_TONE_ATTR + '="' + tone + '"'));
    }
  });

  it('危险档：`role="alert"` ＋ `assertive`，且**必须说得清**（不给 detail 一律拒）', () => {
    const html = renderToastCard({ title: '没能写入', tone: 'danger', detail: '多维表拒收：列名对不上。' });
    assert.match(html, /role="alert" aria-live="assertive"/);
    assert.ok(html.includes('is-danger'));
    assert.ok(html.includes('>' + TOAST_CARD_TONE_WORDS.danger + '</span>'));
    assert.equal(throwsBlocks(() => renderToastCard({ title: '没能写入', tone: 'danger' })), true);
    assert.deepEqual(TOAST_CARD_TONE_ROLES.danger, 'alert');
    assert.deepEqual(TOAST_CARD_TONE_LIVE.danger, 'assertive');
  });

  it('堆栈：空宿主 ＋ 容量锚（缺省 3，可降到 1～3）', () => {
    const html = renderToastCardStack();
    assert.equal(html, '<div class="' + toastCardSlot('stack') + '" ' + TOAST_CARD_STACK_ATTR + '="" '
      + TOAST_CARD_MAX_ATTR + '="' + String(TOAST_CARD_MAX_STACK) + '"></div>');
    assert.ok(renderToastCardStack({ max: 2 }).includes(TOAST_CARD_MAX_ATTR + '="2"'));
    assert.equal(TOAST_CARD_MAX_STACK, 3);
    assert.equal(throwsBlocks(() => renderToastCardStack({ max: 4 })), true);
    assert.equal(throwsBlocks(() => renderToastCardStack({ max: 0 })), true);
    assert.equal(throwsBlocks(() => renderToastCardStack({ max: 1.5 })), true);
    assert.equal(throwsBlocks(() => renderToastCardStack({ max: 'x' })), true);
    assert.equal(throwsBlocks(() => renderToastCardStack({ extraClass: '#' })), true);
  });

  it('时长：缺省 4 秒，只许 3–5 秒（要更久就让用户点关闭）', () => {
    assert.equal(TOAST_CARD_DEFAULT_MS, 4000);
    assert.equal(TOAST_CARD_MIN_MS, 3000);
    assert.equal(TOAST_CARD_MAX_MS, 5000);
    assert.ok(renderToastCard({ title: 'x', durationMs: TOAST_CARD_MIN_MS })
      .includes(TOAST_CARD_DURATION_ATTR + '="' + String(TOAST_CARD_MIN_MS) + '"'));
    for (const bad of [0, 1000, 2999, 5001, 60000, -4000, 3200.5, 'x', NaN, Infinity, true]) {
      assert.equal(throwsBlocks(() => renderToastCard({ title: 'x', durationMs: bad })), true,
        '这个时长该被拒：' + String(bad));
    }
  });

  it('槽位闭集与类名面：十个槽、前缀拼法唯一', () => {
    assert.deepEqual([...TOAST_CARD_SLOTS],
      ['stack', 'icon', 'body', 'head', 'tone', 'title', 'detail', 'tool', 'action', 'close']);
    assert.equal(toastCardSlot('close'), 'ilife-block-toast-card-close');
    assert.equal(toastCardSlot('close', 'demo-'), 'demo-block-toast-card-close');
    assert.equal(TOAST_CARD_CLASS, 'ilife-block-toast-card');
  });

  it('转义：五个字符进实体，不进标记', () => {
    const html = renderToastCard({
      title: '<script>x</script>', detail: '<b>&"\'</b>', closeLabel: '<i>x</i>',
      action: { id: 'undo', label: '<em>撤销</em>' },
    });
    assert.equal(html.includes('<script>'), false);
    assert.equal(html.includes('<b>&'), false);
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&quot;'));
    assert.ok(html.includes('&amp;'));
  });

  it('全部非法入参分支 ⇒ BlocksError（逐个字段点名）', () => {
    const bad = [
      () => renderToastCard(undefined),
      () => renderToastCard(null),
      () => renderToastCard([]),
      () => renderToastCard('写入 3 条'),
      () => renderToastCard({}),
      () => renderToastCard({ title: '' }),
      () => renderToastCard({ title: '   ' }),
      () => renderToastCard({ title: 7 }),
      () => renderToastCard({ title: 'x', detail: 7 }),
      () => renderToastCard({ title: 'x', tone: 'fine' }),
      () => renderToastCard({ title: 'x', tone: 'error' }),
      () => renderToastCard({ title: 'x', tone: 'danger' }),
      () => renderToastCard({ title: 'x', tone: 'danger', detail: '' }),
      () => renderToastCard({ title: 'x', action: [] }),
      () => renderToastCard({ title: 'x', action: [{ id: 'undo', label: '撤销' }] }),
      () => renderToastCard({ title: 'x', action: 'undo' }),
      () => renderToastCard({ title: 'x', action: {} }),
      () => renderToastCard({ title: 'x', action: { id: '', label: '撤销' } }),
      () => renderToastCard({ title: 'x', action: { id: 'Undo', label: '撤销' } }),
      () => renderToastCard({ title: 'x', action: { id: '2undo', label: '撤销' } }),
      () => renderToastCard({ title: 'x', action: { id: 'undo' } }),
      () => renderToastCard({ title: 'x', action: { id: 'undo', label: 7 } }),
      () => renderToastCard({ title: 'x', closeLabel: 7 }),
      () => renderToastCard({ title: 'x', extraClass: '#x' }),
      () => renderToastCardStack(7),
      () => renderToastCardStack({ max: 'x' }),
    ];
    for (const fn of bad) assert.equal(throwsBlocks(fn), true, '这条非法入参没被拦：' + String(fn));
    assert.equal(throwsBlocks(() => renderToastCard({ title: 'x', tone: 'danger', detail: 'y' })), false,
      '危险档给了 detail 就该过');
  });

  it('运行时段是**文本**：事件名与锚都在，没有模块语法、没有脚本标签', () => {
    const js = buildToastCardJs();
    assert.equal(typeof js, 'string');
    assert.ok(js.includes(TOAST_CARD_EVENT_ACTION));
    assert.ok(js.includes(TOAST_CARD_STACK_ATTR) && js.includes(TOAST_CARD_ITEM_ATTR));
    assert.ok(js.includes(TOAST_CARD_PAUSED_ATTR), '「拖住计时」要有记号可读');
    assert.ok(js.includes(String(TOAST_CARD_DEFAULT_MS)) && js.includes(String(TOAST_CARD_MAX_STACK)));
    assert.equal(/^\s*import |^\s*export /m.test(js), false, '运行时段是经典脚本，不是模块');
    assert.equal(js.includes('</script'), false, '不许把脚本标签写进文本');
  });
});

describe('toast-card ② 样式与零 DOM 纪律', () => {
  const raw = toastCardCss();
  const css = stripComments(raw);
  const rules = ruleSelectors(css);

  it('样式段非空；**每条规则**的 scope 在 `.ilife-page-ui` 之下', () => {
    assert.ok(css.trim() !== '');
    assert.ok(rules.length > 0);
    for (const sel of rules) {
      for (const one of sel.split(',')) {
        assert.ok(one.includes('.' + PAGE_UI), '没 scope：' + one.trim());
        assert.equal((one.match(/\.ilife-page-ui/g) || []).length, 1, '死规则（scope 拼了不止一次）：' + one.trim());
      }
    }
  });

  it('零 `:root`／零 `!important`／**零投影**；不重定义那 11 个冻结 token', () => {
    assert.equal(css.includes(':root'), false);
    assert.equal(css.includes('!important'), false);
    assert.equal(css.includes('box-shadow'), false, '层次不许靠投影（小票纸与大字报刊是零阴影）');
    assert.equal(css.includes('text-overflow'), false, '不许 `…` 截断关键语义');
    for (const frozen of Object.keys(CSS_VAR_TOKENS)) {
      assert.equal(css.includes(frozen + ':'), false, '重定义了冻结 token：' + frozen);
    }
  });

  it('源码里不出现手写的 `var(--ilife-…)`；样式只经 `skinVar()` 读皮肤', () => {
    const src = stripComments(styleSource(NAME));
    assert.equal([...src.matchAll(/var\(\s*--ilife-/g)].length, 0);
    assert.ok(src.includes('skinVar('));
  });

  it('**零阴影、零圆角下立层次**：左竖条（三档粗细）＋ 图标底盘（发丝线＋软底）＋ 字重字级', () => {
    assert.ok(new RegExp(TOAST_CARD_CLASS + ' \\{[\\s\\S]*?border: 1px solid').test(css), '面上一圈发丝线');
    assert.ok(new RegExp(TOAST_CARD_CLASS + ' \\{[\\s\\S]*?border-left: ' + String(TOAST_CARD_TONE_RULES.ok) + 'px solid').test(css),
      '左竖条（成功档）');
    assert.ok(css.includes('.is-warn { border-left-width: ' + String(TOAST_CARD_TONE_RULES.warn) + 'px'));
    assert.ok(css.includes('.is-danger { border-left-width: ' + String(TOAST_CARD_TONE_RULES.danger) + 'px'),
      '危险档把竖条加粗（色之外的第二样）');
    assert.ok(new RegExp(SEL('icon') + ' \\{[\\s\\S]*?border: 1px solid').test(css), '图标底盘：一圈发丝线');
    assert.ok(new RegExp(SEL('icon') + ' \\{[\\s\\S]*?background: ' + 'var\\(--ilife-ok-soft').test(css), '图标底盘：软底');
    assert.ok(new RegExp(SEL('title') + ' \\{[\\s\\S]*?font-weight: 700').test(css), '标题带字重（层次靠字重）');
    assert.ok(new RegExp(SEL('detail') + ' \\{[\\s\\S]*?font-size: ').test(css), '细节自成一档字级');
  });

  it('两个可点元素都给足地板：命中盒 ≥' + TOAST_CARD_TOUCH_PX + 'px、`:focus-visible` ≥2px', () => {
    for (const slot of ['action', 'close']) {
      assert.ok(new RegExp(SEL(slot) + ' \\{[\\s\\S]*?min-height: ' + String(TOAST_CARD_TOUCH_PX) + 'px').test(css),
        slot + ' 的命中盒不得小于 ' + TOAST_CARD_TOUCH_PX + 'px');
      assert.ok(new RegExp(SEL(slot) + ' \\{[\\s\\S]*?min-width: ' + String(TOAST_CARD_TOUCH_PX) + 'px').test(css),
        slot + ' 的命中盒不得小于 ' + TOAST_CARD_TOUCH_PX + 'px');
      assert.ok(new RegExp(SEL(slot) + ' \\{[\\s\\S]*?cursor: pointer').test(css), slot + ' 要有可点提示');
    }
    for (const sel of rules) {
      if (!sel.includes(':focus-visible')) continue;
      /* 焦点那一条要 2px 可见描边 */
      const at = css.indexOf(sel + ' {');
      assert.ok(at >= 0, '抽不到焦点规则：' + sel);
      const body = css.slice(at, css.indexOf('}', at));
      assert.match(body, /outline: 2px solid/, '焦点描边要 2px 实线：' + body);
      assert.match(body, /outline-offset: 2px/);
    }
    assert.ok(rules.some((s) => s.includes(':focus-visible')), '样式段里必须有 :focus-visible 那一条');
  });

  it('状态矩阵逐条在场：hover 包在设备能力查询里、active、focus-visible、离场、reduced-motion', () => {
    assert.ok(/@media \(hover:hover\) and \(pointer:fine\) \{[\s\S]*:hover/.test(css), 'hover 要在设备能力查询里');
    assert.ok(/:not\(:disabled\):active \{ transform: scale\(\.98\); \}/.test(css), ':active 要真按下');
    assert.ok(css.includes('.' + TOAST_CARD_LEAVING_CLASS), '离场那一档');
    assert.ok(/@media \(prefers-reduced-motion:reduce\) \{[\s\S]*transition: none/.test(css),
      'reduced-motion 下不做动效（没有东西会卡在半路）');
  });

  it('响应式只判容器：`@container` 且**自己声明了容器**；零视口分档', () => {
    assert.ok(css.includes('@container (max-width: ' + String(TOAST_CARD_NARROW_PX) + 'px)'));
    assert.ok(css.includes('container-type: inline-size'), '用了 @container 就必须自己声明容器（否则那条查询永不生效）');
    assert.equal(/@media[^{]*max-width/.test(css), false, '不许按视口分档（件宽 ≠ 视口宽）');
    assert.equal(/@media[^{]*min-width/.test(css), false);
  });

  it('样式段里没有过不了窄档的固定宽度（`width`／`min-width` 都 ≤ 390px）', () => {
    const px = (s) => [...s.matchAll(/(?:^|[;\s"'({])(?:min-)?width\s*:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    assert.deepEqual(px(css).filter((v) => v > 390), [], '出现了按固定宽写的死宽度');
  });

  it('零 DOM：产物剥掉字面量后不出现 `document.`／`window.`／`navigator.`', () => {
    const files = distFiles(NAME);
    assert.ok(files.length >= 5);
    assert.ok(files.some((f) => f.endsWith('runtime.js')), '本件有交互，运行时段必须在产物里');
    for (const f of files) {
      const code = stripLiterals(readFileSync(f, 'utf8'));
      for (const needle of ['document.', 'window.', 'navigator.']) {
        assert.equal(code.includes(needle), false, f.replace(/.*dist/, 'dist') + ' 里出现了 ' + needle);
      }
    }
  });
});

describe('toast-card ③ 加法式', () => {
  it('同一份入参渲染三次逐字节相同；标记不带皮肤类', () => {
    assert.equal(renderToastCard(SAMPLE), renderToastCard(SAMPLE));
    assert.equal(renderToastCard(SAMPLE), renderToastCard({ ...SAMPLE }));
    assert.equal(renderToastCardStack(), renderToastCardStack());
    assert.equal(/ilife-skin-/.test(renderToastCard(SAMPLE)), false, '皮肤由页面挂，标记里不许自带');
  });

  it('不挂本件时页面产物逐字节相同：皮肤段与冻结面那件 toast 一个字没动', () => {
    const frozen = { msg: '写入 3 条', icon: 'ok', detail: '记账与备忘已写进「九月」多维表。' };
    const beforeSkin = skinCss();
    const beforeToast = renderToast(frozen);
    toastCardCss();
    buildToastCardJs();
    renderToastCard(SAMPLE);
    renderToastCardStack();
    assert.equal(skinCss(), beforeSkin, '本件的样式函数不许动皮肤段');
    assert.equal(renderToast(frozen), beforeToast, '冻结面那件 renderToast 必须逐字节不变（两件并存，不是替代）');
  });

  it('两件的类名面零交集：本件的标记不碰冻结 toast 的类名', () => {
    const mine = renderToastCard(SAMPLE) + renderToastCardStack();
    const classes = [...mine.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c !== '');
    const frozen = ['ilife-toast', 'ilife-toast-icon', 'ilife-toast-body', 'ilife-toast-close', 'ilife-toast-title',
      'ilife-toast-detail', 'ilife-toast-act', 'ilife-toast-chip', 'ilife-toast-code'];
    for (const c of classes) {
      assert.equal(frozen.includes(c), false, '碰到了冻结面的类名：' + c);
      assert.ok(c === 'is-ok' || c.startsWith('ilife-block-toast-card'), '本件的类名一律走自己的前缀：' + c);
    }
    assert.ok(classes.includes(TOAST_CARD_CLASS));
  });

  it('产物里没有 `<script>` 与内联事件（脚本由页面自己拼进 helpers 槽）', () => {
    const html = renderToastCard(SAMPLE) + renderToastCardStack();
    assert.equal(/<script/i.test(html), false);
    assert.equal(/\son[a-z]+=/i.test(html), false);
  });
});

/* ── ④ 真机两档（headless Chrome ＋ CDP；**自己起的端口**由 Chrome 挑） ─────────────── */

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

/** 页内那条「量一遍」的脚本（只读不动：拿 rect 与计算样式，不写一个字节）。 */
function readScript(names) {
  const S = (slot) => JSON.stringify('.' + toastCardSlot(slot));
  return '(function(){'
    + 'var names=' + JSON.stringify(names) + ';'
    + 'var out={page:{sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,vis:document.visibilityState},cells:{},leaving:document.querySelectorAll(".' + TOAST_CARD_LEAVING_CLASS + '").length};'
    + 'for (var i=0;i<names.length;i+=1){'
    + ' var id=names[i];'
    + ' var host=document.querySelector("[data-host=\\""+id+"\\"]");'
    + ' var stage=document.querySelector("[data-cell=\\""+id+"\\"]");'
    + ' if(!host||!stage){ out.cells[id]={missing:true}; continue; }'
    + ' var items=[].slice.call(host.querySelectorAll("[' + TOAST_CARD_ITEM_ATTR + ']"));'
    + ' var rec={items:items.length,gone:0,leaving:0,paused:0,titles:[],durations:[],bounds:[],pausedFlags:[],toneWords:[],roles:[],lives:[],rules:[],'
    + '  stage:{sw:stage.scrollWidth,cw:stage.clientWidth},host:{sw:host.scrollWidth,cw:host.clientWidth},'
    + '  clipped:[],ellipsis:[],keys:[],touch:[],toolRow:null,bodyCol:null,itemW:0};'
    + ' for (var j=0;j<items.length;j+=1){'
    + '  var el=items[j];'
    + '  if (String(el.className).indexOf("' + TOAST_CARD_LEAVING_CLASS + '")>=0) rec.leaving+=1;'
    + '  if (el.getAttribute("' + TOAST_CARD_BOUND_ATTR + '")==="gone") rec.gone+=1;'
    + '  if (el.hasAttribute("' + TOAST_CARD_PAUSED_ATTR + '")) { rec.paused+=1; rec.pausedFlags.push(el.getAttribute("' + TOAST_CARD_ITEM_ATTR + '")); }'
    + '  rec.bounds.push(el.getAttribute("' + TOAST_CARD_BOUND_ATTR + '"));'
    + '  rec.titles.push(el.querySelector(' + S('title') + ').textContent);'
    + '  rec.durations.push(el.getAttribute("' + TOAST_CARD_DURATION_ATTR + '"));'
    + '  rec.toneWords.push(el.querySelector(' + S('tone') + ').textContent);'
    + '  rec.roles.push(el.getAttribute("role")); rec.lives.push(el.getAttribute("aria-live"));'
    + '  rec.rules.push(Math.round(parseFloat(getComputedStyle(el).borderLeftWidth)));'
    + '  var box=el.getBoundingClientRect();'
    + '  var all=el.querySelectorAll("*");'
    + '  for (var k=0;k<all.length;k+=1){'
    + '   var cs=getComputedStyle(all[k]), ov=cs.overflowX;'
    + '   if((ov==="hidden"||ov==="auto"||ov==="scroll"||ov==="clip")&&all[k].scrollWidth>all[k].clientWidth+1) rec.clipped.push(String(all[k].className));'
    + '   if(cs.textOverflow==="ellipsis") rec.ellipsis.push(String(all[k].className));'
    + '   var r=all[k].getBoundingClientRect();'
    + '   if(r.left<box.left-1||r.right>box.right+1) rec.keys.push({cls:String(all[k].className),left:Math.round(r.left),right:Math.round(r.right)});'
    + '  }'
    + ' }'
    + ' var touches=host.querySelectorAll(' + JSON.stringify(SEL('action') + ', ' + SEL('close')) + ');'
    + ' for (var t=0;t<touches.length;t+=1){'
    + '  var b=touches[t].getBoundingClientRect();'
    + '  rec.touch.push({cls:String(touches[t].className),w:Math.round(b.width),h:Math.round(b.height),min:Math.round(Math.min(b.width,b.height))});'
    + ' }'
    + ' if (items.length>0){'
    + '  var tool=items[0].querySelector(' + S('tool') + '), body=items[0].querySelector(' + S('body') + ');'
    + '  rec.toolRow=getComputedStyle(tool).gridRowStart;'
    + '  rec.bodyCol=getComputedStyle(body).gridColumnStart+"/"+getComputedStyle(body).gridColumnEnd;'
    + '  rec.itemW=Math.round(items[0].getBoundingClientRect().width);'
    + ' }'
    + ' out.cells[id]=rec;'
    + '}'
    + 'return out;}())';
}

/** 一页装下全部格子：视口恒 1440，两档容器 390／1280（**每格自己的宽度**），三套皮肤都摆上。 */
function fixturePage() {
  const stack = renderToastCardStack();
  const cell = (id, width, skin) => '<div class="cell" data-cell="' + id + '" style="width:' + String(width) + 'px">'
    + '<div class="' + PAGE_UI + ' ilife-skin-' + (skin === undefined ? 'paper' : skin) + '" style="width:' + String(width) + 'px">'
    + '<div class="host" data-host="' + id + '">' + stack + '</div></div></div>';
  const body = [
    cell('A', 390), cell('E', 390), cell('B', 390), cell('C', 390), cell('D', 390), cell('F', 1280),
    cell('G', 390, 'broadsheet'), cell('H', 390, 'neutral'), cell('I', 1280, 'broadsheet'), cell('J', 1280, 'neutral'),
  ].join('\n');
  const watch = 'window.__events=[];window.__pauses=[];'
    + 'document.addEventListener(' + JSON.stringify(TOAST_CARD_EVENT_ACTION)
    + ',function(e){window.__events.push({action:e.detail.action,tone:e.detail.tone,title:e.target.querySelector('
    + JSON.stringify(SEL('title')) + ').textContent});});'
    // 谁把哪条提示「拖住」了（诊断读数：本件在 mouseover／focusin 上停表）。
    + '["mouseover","focusin"].forEach(function(t){document.addEventListener(t,function(e){'
    + 'var c=e.target&&e.target.closest?e.target.closest(' + JSON.stringify('[' + TOAST_CARD_ITEM_ATTR + ']') + '):null;if(!c) return;'
    + 'var h=c.closest("[data-host]");window.__pauses.push({t:t,cell:h?h.getAttribute("data-host"):"?",x:e.clientX||0,y:e.clientY||0,title:c.textContent.slice(0,8)});},true);});';
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><style>\n'
    + 'html,body{margin:0;padding:0;background:#f5f5f7}\n.cell{display:block;margin:0 0 10px;min-height:600px}\n'
    + skinCss({}) + '\n' + toastCardCss() + '\n</style></head>\n<body>\n' + body + '\n'
    + '<script>' + buildToastCardJs() + '</script>\n'
    + '<script>' + watch + '</script>\n</body></html>';
}

/** 起一次真机（端口交给 Chrome：`--remote-debugging-port=0` ＋ 读 `DevToolsActivePort`）。 */
async function startMachine() {
  const browser = findBrowser();
  if (browser === undefined) return null;
  const dir = mkdtempSync(join(tmpdir(), 't-toastcard-'));
  const page = join(dir, 'fixture.html');
  writeFileSync(page, fixturePage(), 'utf8');
  const profile = mkdtempSync(join(tmpdir(), 't-toastcard-chrome-'));
  // stdio 一律 'ignore' ＋ windowsHide：Chrome 的输出与 node:test 的 IPC 之间不许有任何搭线机会。
  const chrome = spawn(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--disable-extensions', '--hide-scrollbars', '--allow-file-access-from-files',
    // 计时器不许被后台节流：本判据量的就是「到点自己走」，被节流后量到的是节流不是这件的行为。
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
  const cleanup = () => {
    try { chrome.kill(); } catch { /* 已退出 */ }
    for (const d of [profile, dir]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* 临时目录 */ } }
  };
  try {
    const active = join(profile, 'DevToolsActivePort');
    let devUrl = null;
    for (let i = 0; i < 200 && devUrl === null; i += 1) {
      if (existsSync(active)) {
        const lines = readFileSync(active, 'utf8').split('\n');
        const port = (lines[0] === undefined ? '' : lines[0]).trim();
        if (/^\d+$/.test(port)) {
          try {
            const r = await fetch('http://127.0.0.1:' + port + '/json/version');
            if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
          } catch { /* 端口刚写、还没起来 */ }
        }
      }
      if (devUrl === null) await sleep(100);
    }
    if (devUrl === null) throw new Error('DevToolsActivePort 里读不到可用端口（headless Chrome 起不来）');
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const ev = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails !== undefined) {
        const d = r.exceptionDetails;
        throw new Error('页内抛错：' + (d.exception && d.exception.description ? d.exception.description : d.text));
      }
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    // 把这一面放到台前：后台页里的计时器会被节流，量到的是节流不是本件的行为。
    await s('Page.bringToFront');
    await s('Page.navigate', { url: pathToFileURL(page).href });
    for (let i = 0; i < 120; i += 1) { if (await ev('document.readyState === "complete"') === true) break; await sleep(50); }
    await sleep(200);
    const push = async (id, html) => ev('(function(){var h=document.querySelector("[data-host=\\""+' + JSON.stringify(id) + '+"\\"]");'
      + 'if(!h) return false; h.insertAdjacentHTML("beforeend",' + JSON.stringify(html) + '); return true;}())');
    const move = async (x, y) => s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    const clickAt = async (target) => {
      const box = await ev('(function(){var el=document.querySelector(' + JSON.stringify(target) + ');'
        + 'if(!el) return null; el.scrollIntoView({block:"center"});'
        + 'var r=el.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}())');
      if (box === null) return null;
      await move(box.x, box.y);
      await s('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      return box;
    };
    const rectAt = async (target) => ev('(function(){var el=document.querySelector(' + JSON.stringify(target) + ');'
      + 'if(!el) return null; el.scrollIntoView({block:"center"});'
      + 'var r=el.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};}())');
    const styleOf = async (target, prop) => ev('(function(){var el=document.querySelector(' + JSON.stringify(target) + ');'
      + 'return el?getComputedStyle(el)[' + JSON.stringify(prop) + ']:null;}())');
    return { ev, s, push, move, clickAt, rectAt, styleOf, close: () => { cdp.close(); cleanup(); } };
  } catch (e) {
    cleanup();
    throw e;
  }
}

describe('toast-card ④ 真机两档（视口恒 1440，容器 390／1280）', () => {
  it('两档零横溢 ＋ 命中盒 ≥44 ＋ 焦点描边 ≥2px ＋ 自动消失 ＋ 堆 3 挤最旧 ＋ 危险档 role=alert', async (t) => {
    let m = null;
    try {
      m = await startMachine();
    } catch (e) {
      m = null;
      console.log('真机未跑：' + String(e && e.message ? e.message : e));
    }
    if (m === null) {
      // 起不来（没装 Chrome）时退到不依赖浏览器的那一半，并把「真机未跑」写在回执里。
      const css = stripComments(toastCardCss());
      assert.ok(css.includes('min-height: ' + String(TOAST_CARD_TOUCH_PX) + 'px'));
      assert.ok(css.includes('outline: 2px solid'));
      assert.ok(css.includes('@container (max-width: ' + String(TOAST_CARD_NARROW_PX) + 'px)'));
      t.diagnostic('真机未跑（本机没找到 Chrome）：④ 只跑了静态几何判据');
      return;
    }
    try {
      const pushA = [1, 2, 3, 4].map((n) => renderToastCard({
        title: '第 ' + String(n) + ' 条',
        detail: '这是第 ' + String(n) + ' 条回执的细节句。',
        durationMs: TOAST_CARD_MAX_MS,
        ...(n === 4 ? { action: { id: 'undo', label: '撤销' } } : {}),
      }));
      const started = Date.now();
      assert.equal(await m.push('A', pushA[0]), true);
      assert.equal(await m.push('A', pushA[1]), true);
      assert.equal(await m.push('A', pushA[2]), true);
      assert.equal(await m.push('A', pushA[3]), true);
      assert.equal(await m.push('B', renderToastCard({ title: '自己走的那条', durationMs: TOAST_CARD_MIN_MS })), true);
      assert.equal(await m.push('D', renderToastCard({
        title: '没能写入', tone: 'danger', detail: '多维表拒收：列名对不上。', durationMs: TOAST_CARD_MAX_MS,
      })), true);
      assert.equal(await m.push('F', renderToastCard({ title: '宽档那条', durationMs: TOAST_CARD_MAX_MS })), true);
      /* 另两套皮肤各摆两档（换皮不换结构；两档的横溢／命中盒一起量）：**同一份标记**灌进去。 */
      const skinCard = renderToastCard({
        title: '换皮不换结构那条',
        detail: '同一份入参在三套皮肤下的标记逐字节相同。',
        action: { id: 'open', label: '看详情' },
        durationMs: TOAST_CARD_MAX_MS,
      });
      for (const id of ['G', 'H', 'I', 'J']) assert.equal(await m.push(id, skinCard), true);
      await sleep(400);
      const markup = await m.ev('(function(){var out={};["G","H","I","J"].forEach(function(id){'
        + 'var h=document.querySelector("[data-host=\\""+id+"\\"]"); out[id]=h?h.innerHTML:null;}); return out;}())');
      assert.ok(typeof markup.G === 'string' && markup.G.length > 0);
      assert.equal(markup.H, markup.G, 'neutral 下的标记与 paper 下不同（只许样式不同）');
      assert.equal(markup.I, markup.G, 'broadsheet（1280）下的标记与 paper 下不同');
      assert.equal(markup.J, markup.G, 'neutral（1280）下的标记与 paper 下不同');

      /* ── 几何与状态读数（三套皮肤 × 两档，共八格） ── */
      const GEOM = ['A', 'B', 'D', 'F', 'G', 'H', 'I', 'J'];
      const read = await m.ev(readScript(GEOM));
      assert.equal(read.page.cw, 1440, '视口必须恒 1440，实测 ' + String(read.page.cw));
      assert.ok(read.page.sw <= read.page.cw, '整页横向溢出：' + String(read.page.sw) + ' > ' + String(read.page.cw));
      for (const [id, r] of Object.entries(read.cells)) {
        const at = id + '：';
        assert.ok(r.stage.sw <= r.stage.cw, at + '容器横向溢出 ' + String(r.stage.sw) + '/' + String(r.stage.cw));
        assert.ok(r.host.sw <= r.host.cw, at + '宿主横向溢出 ' + String(r.host.sw) + '/' + String(r.host.cw));
        assert.deepEqual(r.clipped, [], at + '有元素把内容裁掉了');
        assert.deepEqual(r.ellipsis, [], at + '出现了 … 截断');
        assert.deepEqual(r.keys, [], at + '有元素出界');
        for (const touch of r.touch) {
          assert.ok(touch.min >= TOAST_CARD_TOUCH_PX, at + '命中盒小于 ' + String(TOAST_CARD_TOUCH_PX) + 'px：'
            + touch.cls + ' 实测 ' + String(touch.w) + '×' + String(touch.h));
        }
      }
      /* 宽度只判容器（三套皮肤同一口径）：390 档动作排落到第二行、正文占满上行；1280 档回到第一行。 */
      for (const id of ['A', 'G', 'H']) {
        assert.equal(read.cells[id].toolRow, '2', id + '（390 档，容器 ≤ ' + String(TOAST_CARD_NARROW_PX) + 'px）：动作排该落到第二行');
        assert.equal(read.cells[id].bodyCol, '2/4', id + '（390 档）正文该占满上行');
      }
      for (const id of ['F', 'I', 'J']) {
        assert.equal(read.cells[id].toolRow, '1', id + '（1280 档）：动作排该回到正文那一行');
        assert.ok(read.cells[id].itemW > TOAST_CARD_NARROW_PX, id + ' 的件宽应大于窄档阈值，实测 ' + String(read.cells[id].itemW));
      }
      for (const id of ['G', 'H']) assert.equal(read.cells[id].itemW, 390, id + ' 的件宽＝容器宽');
      for (const id of ['I', 'J']) assert.equal(read.cells[id].itemW, 1280, id + ' 的件宽＝容器宽');

      /* ── 堆 3 挤最旧 ── */
      assert.equal(read.cells.A.items, TOAST_CARD_MAX_STACK, '同一时刻最多堆 ' + String(TOAST_CARD_MAX_STACK) + ' 条');
      assert.deepEqual(read.cells.A.titles, ['第 2 条', '第 3 条', '第 4 条'], '第 4 条来时该挤掉最旧的那条');
      assert.equal(read.cells.A.leaving, 0, '挤掉的那条要真删，不许留隐形壳');
      assert.equal(read.cells.A.gone, 0);

      /* ── 危险档：role=alert ＋ assertive ＋ 竖条更粗（色之外还有形） ── */
      assert.deepEqual(read.cells.D.roles, ['alert'], '危险档 role 该是 alert');
      assert.deepEqual(read.cells.D.lives, ['assertive']);
      assert.deepEqual(read.cells.D.toneWords, [TOAST_CARD_TONE_WORDS.danger]);
      assert.equal(read.cells.D.rules[0], TOAST_CARD_TONE_RULES.danger, '危险档竖条更粗');
      assert.equal(read.cells.A.rules[0], TOAST_CARD_TONE_RULES.ok, '成功档竖条是细的那档');
      assert.ok(read.cells.D.rules[0] > read.cells.A.rules[0], '两档竖条粗细必须可分辨（不只是色）');

      /* ── 焦点：Tab 走到卡片按钮上，读 :focus-visible 的描边 ── */
      const TAB = '(function(){var el=document.activeElement;'
        + 'if(!el||!el.getAttribute) return null;'
        + 'if(!el.hasAttribute("' + TOAST_CARD_CLOSE_ATTR + '")&&!el.hasAttribute("' + TOAST_CARD_ACTION_ATTR + '")) return null;'
        + 'var cs=getComputedStyle(el);'
        + 'return {cls:String(el.className),w:cs.outlineWidth,style:cs.outlineStyle,visible:el.matches(":focus-visible")};}())';
      let focus = null;
      for (let i = 0; i < 60 && focus === null; i += 1) {
        await m.s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        await m.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        focus = await m.ev(TAB);
      }
      assert.ok(focus !== null, 'Tab 走了 60 步都没落到本件的按钮上（键盘到不了＝红）');
      assert.equal(focus.visible, true, 'Tab 到的那枚键该命中 :focus-visible');
      assert.equal(focus.style, 'solid', '焦点描边要是实线，实测 ' + String(focus.style));
      assert.ok(parseFloat(focus.w) >= 2, '焦点描边该 ≥2px，实测 ' + String(focus.w));

      /* ── 动作键：真鼠标点一下 → 派发事件 ＋ 这条自己走 ── */
      const clicked = await m.clickAt('[data-host="A"] ' + SEL('action'));
      assert.ok(clicked !== null, '找不到动作键');
      // 点完把指针挪开：一条提示离场后下面的格子会上移，指针停着就可能落到别格的提示上
      //（那会让那条被「拖住计时」——这正是本件的行为，但会污染后面「到点自己走」的读数）。
      await m.move(1435, 5);
      await sleep(300);
      const events = await m.ev('window.__events');
      assert.equal(events.length, 1, '动作键该派发一次事件，实测 ' + String(events.length));
      assert.deepEqual(events[0], { action: 'undo', tone: 'ok', title: '第 4 条' });
      const afterClick = await m.ev(readScript(['A']));
      assert.deepEqual(afterClick.cells.A.titles, ['第 2 条', '第 3 条'], '按过动作的那条该自己走');

      /* ── 自动消失：没人碰过的那条到点真删 ── */
      const spent = Date.now() - started;
      if (spent < TOAST_CARD_MIN_MS + 1200) await sleep(TOAST_CARD_MIN_MS + 1200 - spent);
      const afterB = await m.ev(readScript(['B']));
      const pauseLog = await m.ev('window.__pauses');
      assert.equal(afterB.cells.B.items, 0, '自动消失的时间到了就该真删，实测还剩 '
        + String(afterB.cells.B.items) + ' 条（B 读数 ' + JSON.stringify(afterB.cells.B)
        + '；起表在 ' + String(TOAST_CARD_MIN_MS) + 'ms 前；停表记录 ' + JSON.stringify(pauseLog) + '）');

      /* ── 指针停住 ⇒ 计时被拖住（WCAG 2.2.1） ── */
      assert.equal(await m.push('E', renderToastCard({ title: '读第二遍的那条', durationMs: TOAST_CARD_MIN_MS })), true);
      await sleep(150);
      const hoverBox = await m.rectAt('[data-host="E"] .' + TOAST_CARD_CLASS);
      assert.ok(hoverBox !== null, '找不到 E 格那条');
      await m.move(hoverBox.x, hoverBox.y);
      await sleep(TOAST_CARD_MIN_MS + 400);
      const hovered = await m.ev(readScript(['E']));
      assert.equal(hovered.cells.E.items, 1, '指针停在上面时这条不许自己走（时长 ' + String(TOAST_CARD_MIN_MS) + 'ms 早过了）');
      assert.equal(hovered.cells.E.paused, 1, '「计时被拖住」要有记号');
      await m.move(1435, 5);
      await sleep(TOAST_CARD_MIN_MS + 1200);
      const unhovered = await m.ev(readScript(['E']));
      assert.equal(unhovered.cells.E.items, 0, '指针移开后要重新计满并真的走掉');

      /* ── prefers-reduced-motion：不做动效，也不卡在半路 ── */
      await m.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await m.push('C', renderToastCard({ title: '无动效的那条', durationMs: TOAST_CARD_MIN_MS }));
      await sleep(120);
      const rmTail = await m.ev(readScript(['C']));
      const transition = await m.styleOf('[data-host="C"] .' + TOAST_CARD_CLASS, 'transitionDuration');
      assert.equal(transition, '0s', 'reduced-motion 下不该有过渡，实测 ' + String(transition));
      await sleep(TOAST_CARD_MIN_MS + 1000);
      const rm = await m.ev(readScript(['C']));
      assert.equal(rmTail.cells.C.items, 1, '刚放进去那条该在');
      assert.equal(rm.cells.C.items, 0, 'reduced-motion 下也要真的走掉（不卡在半路）');
      assert.equal(rm.leaving, 0, '全页不许留 is-leaving 的半路元素，实测 ' + String(rm.leaving));

      const durations = read.cells.A.durations;
      assert.deepEqual(durations, [String(TOAST_CARD_MAX_MS), String(TOAST_CARD_MAX_MS), String(TOAST_CARD_MAX_MS)],
        '时长要逐条进标记');
      t.diagnostic('真机读数：视口 ' + String(read.page.cw) + '（visibility=' + String(read.page.vis) + '）'
        + '；390 档 toolRow=' + String(read.cells.A.toolRow)
        + ' bodyCol=' + String(read.cells.A.bodyCol) + ' 件宽=' + String(read.cells.A.itemW)
        + '；1280 档 toolRow=' + String(read.cells.F.toolRow) + ' 件宽=' + String(read.cells.F.itemW)
        + '；三套皮肤 × 两档：broadsheet/neutral 390 档 toolRow=' + String(read.cells.G.toolRow) + '/' + String(read.cells.H.toolRow)
        + '、1280 档 toolRow=' + String(read.cells.I.toolRow) + '/' + String(read.cells.J.toolRow)
        + '，件宽 ' + String(read.cells.G.itemW) + '/' + String(read.cells.H.itemW) + '/' + String(read.cells.I.itemW) + '/' + String(read.cells.J.itemW)
        + '，四格标记逐字节相同'
        + '；命中盒 ' + JSON.stringify(read.cells.A.touch.map((x) => x.min))
        + '；焦点 ' + String(focus.w) + ' ' + String(focus.style)
        + '；危险档 role=' + String(read.cells.D.roles[0]) + ' 竖条 ' + String(read.cells.D.rules[0]) + 'px（成功档 '
        + String(read.cells.A.rules[0]) + 'px）；堆 3 挤最旧后 ' + JSON.stringify(read.cells.A.titles));
    } finally {
      m.close();
    }
  });
});
