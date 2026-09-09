/** #88 S4 真实浏览器实证（headless Chrome ＋ **CDP**／`file://`／无服务／无宿主注入／零 CDN）。
 *
 *  跑法（仓根）：`node docs/research/t88-browser-evidence-b.mjs`
 *  前置：`node docs/research/t88-probe-impl-b.mjs`（生成 `.scratch/t88/out/卡路里_HELP_preview_b.html`）。
 *  退出码：0＝全部断言通过；1＝有断言失败；2＝**找不到浏览器／CDP 未建立／缺样本**（实证未完成，绝不静默变绿）。
 *
 *  被验对象：`packages/base-render/src/controls.ts` 的 `buildSharedHelpersJs()` 在**真实 HELP 页面**
 *  （样本逐字，**不注入任何探针**）里的运行时行为：卡级复制按钮 436／`data-t` 与 `<pre>` 逐字相等／
 *  委派点击复制／搜索＋`<mark>`＋命中计数＋清空＋跳页／`#backTop` 在 `scrollY>400` 出现 ＋ 点击回顶／
 *  二次注入幂等；以及**关闭脚本引擎**后的 CSS-only 降级面。
 *
 *  为什么用 CDP 而不是 `--dump-dom`：本机实测（`.scratch/t88/cdp-scroll-test.mjs`）headless Chrome 在
 *  `--dump-dom`（含 `--virtual-time-budget`）下**不投递原生 scroll 事件**（`win/doc/docCap` 全 0），
 *  而 CDP 真实时间下 `window/document(捕获)` 均命中 1 → H-19「scrollY>400 才出现」只能用 CDP 证。
 *  另：CDP 下样本页面**原样**加载（不插探针脚本），断言由驱动侧 `Runtime.evaluate` 完成。
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const OUT_DIR = resolve(ROOT, '.scratch', 't88', 'out');
const BROWSER_DIR = join(OUT_DIR, 'browser');
const SAMPLE = join(OUT_DIR, '卡路里_HELP_preview_b.html');
const CARD_COPY = 'ilife-help-shell-card-copy';

const transcript = [];
function log(line = '') {
  transcript.push(line);
  console.log(line);
}
const results = [];
function check(id, label, ok, actual) {
  results.push({ id, label, ok, actual: String(actual) });
  log('[ASSERT] ' + id.padEnd(5) + ' ' + label.padEnd(60) + (ok ? 'PASS' : 'FAIL') + '  actual=' + actual);
  return ok;
}
function die(code, message) {
  log('RESULT: ABORT exit=' + code + ' :: ' + message);
  process.exit(code);
}
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/* ── 0. 路径守卫 ＋ 样本指纹 ─────────────────────────────────────────────── */

if (!BROWSER_DIR.replace(/\\/g, '/').includes('/.scratch/t88/out/browser')) die(2, '输出目录路径守卫失败：' + BROWSER_DIR);
if (!existsSync(SAMPLE)) die(2, '缺渲染样本 ' + SAMPLE + '（先跑 node docs/research/t88-probe-impl-b.mjs）');
mkdirSync(BROWSER_DIR, { recursive: true });
const sampleText = readFileSync(SAMPLE, 'utf8');
const sampleSha = createHash('sha256').update(sampleText).digest('hex');

/* ── 1. 找浏览器（找不到 → 显式失败，不静默跳过） ─────────────────────────── */

const CANDIDATES = [
  process.env.DSH_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter((p) => typeof p === 'string' && p !== '');

function whichOnPath(name) {
  const exts = (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean);
  for (const dir of (process.env.PATH || '').split(delimiter).filter(Boolean)) {
    for (const ext of ['', ...exts]) {
      const full = join(dir, name + ext);
      if (existsSync(full)) return full;
    }
  }
  return null;
}

let browser = null;
for (const candidate of CANDIDATES) {
  if (existsSync(candidate)) { browser = candidate; break; }
  if (!candidate.includes('\\') && !candidate.includes('/')) {
    const found = whichOnPath(candidate);
    if (found !== null) { browser = found; break; }
  }
}
if (browser === null) {
  die(2, '未找到 Chrome／Edge：S4 的卡级按钮是**运行时注入**，静态 HTML 查不到 → 真实浏览器实证**缺失**'
    + '（不静默跳过）。已探测：' + JSON.stringify(CANDIDATES) + '；请安装浏览器或用 DSH_BROWSER=<路径> 指定。');
}

/* ── 2. 起 headless Chrome ＋ CDP 会话 ──────────────────────────────────── */

const profileDir = join(BROWSER_DIR, '_profile');
rmSync(profileDir, { recursive: true, force: true });
mkdirSync(profileDir, { recursive: true });
const url = pathToFileURL(SAMPLE).href;
const child = spawn(browser, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-breakpad',
  '--disable-dev-shm-usage',
  '--mute-audio',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--window-size=1280,900',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profileDir,
  url,
], { stdio: 'ignore' });

let port = null;
const portFile = join(profileDir, 'DevToolsActivePort');
for (let i = 0; i < 200; i += 1) {
  if (existsSync(portFile)) { port = readFileSync(portFile, 'utf8').split(LF)[0].trim(); break; }
  await sleep(100);
}
if (port === null) { child.kill(); die(2, 'CDP 未建立：未等到 DevToolsActivePort（' + portFile + '）'); }

let target = null;
for (let i = 0; i < 100; i += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    target = list.find((t) => t.type === 'page' && typeof t.webSocketDebuggerUrl === 'string');
  } catch (err) { /* CDP 端口未就绪 */ }
  if (target) break;
  await sleep(100);
}
if (!target) { child.kill(); die(2, 'CDP 未建立：/json/list 无 page 目标'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
await new Promise((r) => { ws.addEventListener('open', r); });
function send(method, params) {
  return new Promise((resolve) => {
    msgId += 1;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params: params ?? {} }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) {
    throw new Error('Runtime.evaluate 抛错：' + JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  }
  return r.result && r.result.result ? r.result.result.value : undefined;
}
async function evalJson(expression) {
  const raw = await evaluate('JSON.stringify(' + expression + ')');
  return raw === undefined ? undefined : JSON.parse(raw);
}

await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
// 等页面 load ＋ helpers 跑完（boot() 在 body 末尾同步执行，再给 200ms 余量）
for (let i = 0; i < 100; i += 1) {
  if (await evaluate('document.readyState === "complete"') === true) break;
  await sleep(100);
}
await sleep(200);

log('#88 S4 真实浏览器实证（headless Chrome ＋ CDP，file://，样本逐字未插探针）');
log('browser=' + browser);
log('sample=' + SAMPLE);
log('sampleSha256=' + sampleSha);
log('sampleBytes=' + Buffer.byteLength(sampleText, 'utf8'));

/* ── 3. 卡级复制按钮（R1-1） ─────────────────────────────────────────────── */

const counts = await evalJson(`(function () {
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cards = qa('.ilife-help-shell-card');
  var perCard = cards.map(function (c) { return qa('.${CARD_COPY}', c); });
  var sample = perCard[0] ? perCard[0][0] : null;
  var cs = sample ? getComputedStyle(sample) : null;
  return {
    cards: cards.length,
    total: qa('.${CARD_COPY}').length,
    oneEach: perCard.filter(function (a) { return a.length === 1; }).length,
    inCardTop: perCard.filter(function (a) { return a.length === 1 && a[0].parentNode && a[0].parentNode.className === 'ilife-help-shell-card-top'; }).length,
    dataTEqualsPre: perCard.filter(function (a, i) {
      var p = cards[i].querySelector('.ilife-help-shell-prompt');
      return a.length === 1 && p !== null && a[0].getAttribute('data-t') === p.textContent;
    }).length,
    actionId: perCard.filter(function (a) { return a.length === 1 && a[0].getAttribute('data-action-id') === 'ilife-help-copy-prompt'; }).length,
    label: perCard.filter(function (a) { return a.length === 1 && a[0].textContent === '复制指令'; }).length,
    classExact: perCard.filter(function (a) { return a.length === 1 && a[0].className === '${CARD_COPY}'; }).length,
    cssRule: qa('style').some(function (s) { return s.textContent.indexOf('.${CARD_COPY}') > -1; }),
    display: cs ? cs.display : null,
    borderRadius: cs ? cs.borderRadius : null,
    color: cs ? cs.color : null,
    cursor: cs ? cs.cursor : null,
    inlineHandlers: qa('*').reduce(function (n, el) {
      return n + Array.prototype.slice.call(el.attributes).filter(function (a) { return /^on/i.test(a.name); }).length;
    }, 0),
  };
}())`);
log('cardCopy = ' + JSON.stringify(counts));
check('B1', '场景卡 436 张', counts.cards === 436, counts.cards);
check('B2', '卡头注入按钮 436（每卡恰 1 个）', counts.total === 436 && counts.oneEach === 436, counts.total + '/' + counts.oneEach);
check('B3', '注入落点 = 卡头 card-top', counts.inCardTop === 436, counts.inCardTop);
check('B4', 'data-t 与该卡 <pre> 逐字相等 436/436', counts.dataTEqualsPre === 436, counts.dataTEqualsPre);
check('B5', 'actionId = HELP_COPY_ACTIONS.prompt 逐字', counts.actionId === 436, counts.actionId);
check('B6', '文案 = HELP_COPY_ACTIONS.prompt.label 逐字', counts.label === 436, counts.label);
check('B7', '注入按钮真带新类名（蓝队 N-4）：className 恰为 ' + CARD_COPY, counts.classExact === 436, counts.classExact);
check('B8', '该类名有 CSS 规则且生效（computed 非默认值）', counts.cssRule === true && counts.borderRadius === '999px' && counts.color === 'rgb(0, 122, 255)' && counts.display === 'flex' && counts.cursor === 'pointer', counts.display + ' / ' + counts.borderRadius + ' / ' + counts.color + ' / ' + counts.cursor);
check('B9', '全页零内联 on* 处理器（零注入面）', counts.inlineHandlers === 0, counts.inlineHandlers);

const clickResult = await evalJson(`(function () {
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cards = qa('.ilife-help-shell-card');
  var copied = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function (t) { copied.push(t); return Promise.resolve(); } } });
  qa('.${CARD_COPY}').forEach(function (b) { b.click(); });
  var expected = cards.map(function (c) { var p = c.querySelector('.ilife-help-shell-prompt'); return p ? p.textContent : null; });
  return {
    clicked: qa('.${CARD_COPY}').length,
    copied: copied.length,
    equalsPre: copied.length === expected.length && copied.every(function (t, i) { return t === expected[i]; }),
    firstCopy: copied[0],
    firstPre: expected[0],
    toastCapped: qa('.ilife-toast-stack > .ilife-toast').length,
  };
}())`);
log('delegatedClick = ' + JSON.stringify({ clicked: clickResult.clicked, copied: clickResult.copied, equalsPre: clickResult.equalsPre, toastCapped: clickResult.toastCapped }));
await sleep(300);
const toastCount = await evaluate("document.querySelectorAll('.ilife-toast-stack > .ilife-toast').length");
log('toastAfterClick = ' + toastCount);
check('B10', '委派点击复制 436/436 且文本 = 该卡 <pre>', clickResult.clicked === 436 && clickResult.copied === 436 && clickResult.equalsPre === true, clickResult.clicked + ' copied=' + clickResult.copied + ' equalsPre=' + clickResult.equalsPre);
check('B11', '复制反馈经既有 toast 栈（容量上限生效）', typeof toastCount === 'number' && toastCount > 0 && toastCount <= 5, toastCount);

/* ── 4. 搜索／高亮／计数／跳页／清空 ─────────────────────────────────────── */

const search = await evalJson(`(function () {
  var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var q1 = function (s, r) { return (r || document).querySelector(s); };
  var cards = qa('.ilife-help-shell-card');
  var input = q1('.ilife-help-shell-tab-search-input');
  var count = q1('.ilife-help-shell-page-hitcount');
  var clear = q1('.ilife-help-shell-tab-search-clear');
  var pageOf = function (el) {
    var has = function (n, c) { return n && (' ' + (n.className || '') + ' ').indexOf(' ' + c + ' ') > -1; };
    var p = el; while (p && !has(p, 'ilife-help-shell-page')) p = p.parentNode; return p;
  };
  var hitPages = function (term) {
    var seen = [];
    cards.forEach(function (c) { if (c.textContent.toLowerCase().indexOf(term) > -1) { var pg = pageOf(c); if (pg && seen.indexOf(pg) < 0) seen.push(pg); } });
    return seen;
  };
  var term = null;
  ['记录', '看', '主页', '饮食', '目标', '分析'].forEach(function (cand) { if (term === null && hitPages(cand).length >= 2) term = cand; });
  var expected = cards.filter(function (c) { return c.textContent.toLowerCase().indexOf(term) > -1; }).length;
  input.value = term;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  var marks = qa('.ilife-help-shell-card-mark');
  var checked = q1('.ilife-help-shell-tab-input:checked');
  var out = {
    hasBox: input !== null && count !== null && clear !== null,
    placeholder: input ? input.getAttribute('placeholder') : null,
    term: term,
    expected: expected,
    hidden: qa('.ilife-help-shell-card-hidden').length,
    visible: cards.filter(function (c) { return c.className.indexOf('card-hidden') < 0; }).length,
    hiddenSubgroups: qa('.ilife-help-shell-subgroup-hidden').length,
    marks: marks.length,
    markTag: marks.length > 0 ? marks[0].tagName : null,
    marksAllTerm: marks.length > 0 && marks.every(function (m) { return m.textContent === term; }),
    hitText: count.textContent,
    autoOpenedSheets: qa('.ilife-help-shell-card > .ilife-help-shell-sheet[open]').length,
    checkedIsHitPage: checked !== null && pageOf(checked) === hitPages(term)[0],
    checkedIdBefore: checked ? checked.id : null,
    hitPageIds: hitPages(term).map(function (pg) { var r = pg.querySelector('.ilife-help-shell-tab-input'); return r ? r.id : '(none)'; }),
    checkedPageId: checked ? (pageOf(checked).querySelector('.ilife-help-shell-tab-input') || {}).id : null,
    checkedCount: qa('.ilife-help-shell-tab-input:checked').length,
  };
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  out.checkedIdAfter = q1('.ilife-help-shell-tab-input:checked').id;
  out.enterChangedPage = out.checkedIdBefore !== out.checkedIdAfter;
  clear.click();
  out.afterClearValue = input.value;
  out.afterClearHidden = qa('.ilife-help-shell-card-hidden').length;
  out.afterClearMarks = qa('.ilife-help-shell-card-mark').length;
  out.afterClearSubgroupHidden = qa('.ilife-help-shell-subgroup-hidden').length;
  out.afterClearSheets = qa('.ilife-help-shell-card > .ilife-help-shell-sheet[open]').length;
  out.afterClearHitText = count.textContent;
  out.afterClearCheckedId = q1('.ilife-help-shell-tab-input:checked').id;
  return out;
}())`);
log('search = ' + JSON.stringify(search));
check('B12', '搜索框存在（placeholder 逐字 F3「搜索全部场景」）', search.hasBox === true && search.placeholder === '搜索全部场景', search.placeholder);
check('B13', '输入后过滤生效（隐藏＋可见数自洽）', search.hidden > 0 && search.visible === search.expected && search.hidden + search.visible === 436, 'hidden=' + search.hidden + ' visible=' + search.visible + ' expected=' + search.expected);
check('B14', '<mark> 高亮生效且文本 = 搜索词', search.marks > 0 && search.marksAllTerm === true && search.markTag === 'MARK', 'marks=' + search.marks + ' tag=' + search.markTag);
check('B15', '命中计数逐字（匹配 N 个场景）', search.hitText === '匹配 ' + search.expected + ' 个场景', search.hitText);
check('B16', '自动展开命中卡片的 Sheet ＋ 隐藏无命中子功能组', search.autoOpenedSheets > 0 && search.hiddenSubgroups > 0, 'sheets=' + search.autoOpenedSheets + ' sgHidden=' + search.hiddenSubgroups);
check('B17', '自动跳页到第一个命中分组页', search.checkedIsHitPage === true, search.checkedIsHitPage);
check('B18', 'Enter 在命中分组页间跳页', search.enterChangedPage === true, search.checkedIdBefore + ' → ' + search.checkedIdAfter);
check('B19', '清空复原（输入空＋无隐藏／无 mark／无残留展开／计数空）', search.afterClearValue === '' && search.afterClearHidden === 0 && search.afterClearMarks === 0 && search.afterClearSubgroupHidden === 0 && search.afterClearSheets === 0 && search.afterClearHitText === '', JSON.stringify({ v: search.afterClearValue, h: search.afterClearHidden, m: search.afterClearMarks, sg: search.afterClearSubgroupHidden, sh: search.afterClearSheets, t: search.afterClearHitText }));

/* ── 5. #backTop（H-19）：原生滚动 ＋ 可信点击 ───────────────────────────── */

const bt0 = await evalJson(`(function () {
  var b = document.getElementById('backTop');
  var cs = b ? getComputedStyle(b) : null;
  return {
    exists: b !== null,
    id: b ? b.id : null,
    className: b ? b.className : null,
    label: b ? b.textContent : null,
    ariaLabel: b ? b.getAttribute('aria-label') : null,
    opacity: cs ? cs.opacity : null,
    position: cs ? cs.position : null,
    size: cs ? cs.width + 'x' + cs.height : null,
    borderRadius: cs ? cs.borderRadius : null,
    bottom: cs ? cs.bottom : null,
    right: cs ? cs.right : null,
    pointerEvents: cs ? cs.pointerEvents : null,
    scrollY: document.scrollingElement.scrollTop,
  };
}())`);
log('backTop@top = ' + JSON.stringify(bt0));
check('B20', '#backTop 存在（id／字形／无障碍名）', bt0.exists === true && bt0.id === 'backTop' && bt0.label === '↑' && bt0.ariaLabel === '回到顶部', bt0.id + ' ' + bt0.label + ' ' + bt0.ariaLabel);
check('B21', '初始隐藏（opacity 0 ＋ pointer-events none）＋ 42px 圆形 fixed 右下 24px', bt0.opacity === '0' && bt0.pointerEvents === 'none' && bt0.position === 'fixed' && bt0.size === '42pxx42px' && bt0.borderRadius === '50%' && bt0.bottom === '24px' && bt0.right === '24px', bt0.opacity + ' ' + bt0.pointerEvents + ' ' + bt0.size + ' ' + bt0.borderRadius + ' ' + bt0.bottom + '/' + bt0.right);

await evaluate('window.scrollTo(0, 900)');
await sleep(400);
const bt1 = await evalJson(`(function () {
  var b = document.getElementById('backTop');
  return { scrollY: document.scrollingElement.scrollTop, className: b.className, opacity: getComputedStyle(b).opacity, pointerEvents: getComputedStyle(b).pointerEvents };
}())`);
log('backTop@scroll900 = ' + JSON.stringify(bt1));
check('B22', '原生滚动 scrollY>400 → 出现（-show ＋ opacity 1 ＋ 可点击）', bt1.scrollY > 400 && bt1.className.indexOf('-show') > -1 && bt1.opacity === '1' && bt1.pointerEvents === 'auto', bt1.scrollY + ' ' + bt1.className + ' ' + bt1.opacity + ' ' + bt1.pointerEvents);

// 可信点击（Input.dispatchMouseEvent，走真实命中测试）
const rect = await evalJson(`(function () {
  var r = document.getElementById('backTop').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}())`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
await sleep(1200);
const bt2 = await evalJson(`(function () {
  var b = document.getElementById('backTop');
  return { scrollY: document.scrollingElement.scrollTop, className: b.className, opacity: getComputedStyle(b).opacity };
}())`);
log('backTop@clicked = ' + JSON.stringify(bt2));
check('B23', '可信点击回顶（平滑滚动到 0）', bt1.scrollY > 400 && bt2.scrollY === 0, bt1.scrollY + ' → ' + bt2.scrollY);
check('B24', '回到顶部后按钮再次隐藏', bt2.className.indexOf('-show') < 0 && bt2.opacity === '0', bt2.className + ' ' + bt2.opacity);

/* ── 6. 幂等：删掉 marker 后二次注入同一份 helpers（比 marker 早退更强的判据） ── */

const idem = await evalJson(`(function () {
  var qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var src = null;
  qa('script').forEach(function (el) {
    if (src === null && el.textContent.indexOf('data-ilife-helpers') > -1 && el.textContent.indexOf('function boot()') > -1) src = el;
  });
  var marker = document.querySelector('[data-ilife-helpers="1"]');
  if (marker && marker.parentNode) marker.parentNode.removeChild(marker);
  var again = document.createElement('script');
  again.textContent = src ? src.textContent : '';
  document.body.appendChild(again);
  return {
    cardCopy: qa('.${CARD_COPY}').length,
    searchBoxes: qa('.ilife-help-shell-tab-search').length,
    backTops: qa('#backTop').length,
    markers: qa('[data-ilife-helpers="1"]').length,
    inputs: qa('.ilife-help-shell-tab-search-input').length,
  };
}())`);
await sleep(200);
log('idempotency = ' + JSON.stringify(idem));
check('B25', '幂等（删 marker 后二次注入）：卡级按钮仍 436／搜索框 1／#backTop 1／marker 1', idem.cardCopy === 436 && idem.searchBoxes === 1 && idem.backTops === 1 && idem.markers === 1 && idem.inputs === 1, JSON.stringify(idem));

/* ── 7. Sheet 参数实时预览：真实 payload 的 editable_fields = 0（与 F3 同形） ── */

const fields = await evalJson(`(function () {
  var qa = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  return { fields: qa('.ilife-help-shell-field').length, inputs: qa('.ilife-help-shell-field-input').length, sheets: qa('.ilife-help-shell-sheet').length };
}())`);
log('sheetFields = ' + JSON.stringify(fields));
check('B26', 'Sheet 参数实时预览：真实 payload 0 条 editable_fields（与 F3 同形，见报告 §偏离；能力由夹具测试覆盖）', fields.fields === 0 && fields.inputs === 0 && fields.sheets === 436, JSON.stringify(fields));

/* ── 8. 无 JS 降级（Emulation.setScriptExecutionDisabled ＋ reload ＋ DOM.getOuterHTML） ── */

// 先记录第二个分组标签的坐标（布局在 reload 前后一致）→ 无 JS 时用它做**原生点击**，证 CSS-only Tab 真能切换。
const tabRect = await evalJson(`(function () {
  var labels = document.querySelectorAll('.ilife-help-shell-tab');
  var r = labels[1].getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, count: labels.length };
}())`);
const checkedBeforeNoJs = await evaluate("(document.querySelector('.ilife-help-shell-tab-input:checked') || {}).id");

await send('Emulation.setScriptExecutionDisabled', { value: true });
await send('Page.reload', { ignoreCache: true });
await sleep(2500);
const doc = await send('DOM.getDocument', { depth: -1, pierce: false });
const outer = await send('DOM.getOuterHTML', { nodeId: doc.result.root.nodeId });
const noJsDom = outer.result.outerHTML || '';
writeFileSync(join(BROWSER_DIR, 'dom-nojs.html'), noJsDom, 'utf8');
const countOf = (re) => (noJsDom.match(re) ?? []).length;
const noJs = {
  bytes: Buffer.byteLength(noJsDom, 'utf8'),
  cards: countOf(/<article class="ilife-help-shell-card"/g),
  prompts: countOf(/<pre class="ilife-help-shell-prompt"/g),
  cardCopy: countOf(new RegExp('class="' + CARD_COPY + '"', 'g')),
  search: countOf(/class="ilife-help-shell-tab-search"/g),
  backTop: countOf(/id="backTop"/g),
  marker: countOf(/data-ilife-helpers="1"/g),
  tabLabels: countOf(/class="ilife-help-shell-tab"/g),
  checkedRadio: countOf(/type="radio"[^>]*checked/g),
  cssOnlyTabRule: countOf(/\.ilife-help-shell-tab-input:checked \+ \.ilife-help-shell-page-body/g),
  staticCopyButtons: countOf(/data-action-id=/g),
  checkedBeforeNoJs: checkedBeforeNoJs,
  tabRect: tabRect,
};
log('noJs = ' + JSON.stringify(noJs));
check('B27', '无 JS：436 卡 ＋ 436 prompt ＋ 静态 1308 复制按钮 ＋ 0 运行时注入', noJs.cards === 436 && noJs.prompts === 436 && noJs.staticCopyButtons === 1308 && noJs.cardCopy === 0 && noJs.search === 0 && noJs.backTop === 0 && noJs.marker === 0, JSON.stringify({ cards: noJs.cards, prompts: noJs.prompts, static: noJs.staticCopyButtons, cardCopy: noJs.cardCopy, search: noJs.search, backTop: noJs.backTop, marker: noJs.marker }));
check('B28', '无 JS：CSS-only Tab 结构在（11 标签 ＋ 默认选中 ＋ :checked 规则在页内）', noJs.tabLabels === 11 && noJs.checkedRadio >= 1 && noJs.cssOnlyTabRule >= 1, 'labels=' + noJs.tabLabels + ' checked=' + noJs.checkedRadio + ' rule=' + noJs.cssOnlyTabRule);

// 无 JS 下的**原生点击**（浏览器行为，非脚本）：点第二个分组标签 → radio 必须切换。
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tabRect.x, y: tabRect.y, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tabRect.x, y: tabRect.y, button: 'left', clickCount: 1 });
await sleep(400);
const outer2 = await send('DOM.getOuterHTML', { nodeId: doc.result.root.nodeId });
const noJsDom2 = outer2.result.outerHTML || '';
const checkedIds = [...noJsDom2.matchAll(/type="radio"[^>]*id="([^"]+)"[^>]*checked/g)].map((m) => m[1]);
const checkedAfterNoJs = [...noJsDom2.matchAll(/<input[^>]*type="radio"[^>]*>/g)]
  .map((m) => m[0])
  .filter((tag) => /\bchecked\b/.test(tag))
  .map((tag) => (/id="([^"]+)"/.exec(tag) ?? ['', '(none)'])[1]);
log('noJsTabSwitch = ' + JSON.stringify({ before: checkedBeforeNoJs, after: checkedAfterNoJs, labels: noJs.tabLabels }));
check('B29', '无 JS：原生点击分组标签可切换（CSS-only Tab 可用）', noJs.tabLabels === 11 && checkedAfterNoJs.length === 1 && checkedAfterNoJs[0] !== checkedBeforeNoJs, checkedBeforeNoJs + ' → ' + checkedAfterNoJs.join(','));

/* ── 9. 收尾 ─────────────────────────────────────────────────────────────── */

writeFileSync(join(BROWSER_DIR, 'probe-main.json'), JSON.stringify({ counts, clickResult, search, bt0, bt1, bt2, idem, fields, noJs }, null, 2) + LF, 'utf8');
ws.close();
child.kill();
await sleep(300);
rmSync(profileDir, { recursive: true, force: true });

const passed = results.filter((r) => r.ok).length;
writeFileSync(join(BROWSER_DIR, 'summary.txt'), transcript.join(LF) + LF + 'RESULT: ' + passed + '/' + results.length + ' fails=' + (results.length - passed) + LF, 'utf8');
log('RESULT: ' + passed + '/' + results.length + ' fails=' + (results.length - passed));
process.exit(passed === results.length ? 0 : 1);
