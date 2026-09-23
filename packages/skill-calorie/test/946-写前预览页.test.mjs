/** #946 · 写前预览页（`calorie.view.plan-write-preview`）验收用例 —— 一件内三条读数（`#944` 故障 1／3／8）。
 *
 * 票面判据（逐条对应，每条都要能真红）：
 *   ① **几何**：真起 headless Chrome（CDP 起法照 `scripts/measure-responsive.mjs`）量**改前表卡**与**页头三级**
 *      的宽，绿＝两者都是 880px（容差 2px）。改前现场：表卡 1240、页头 880（归档页实测，本票票面「故障 1」表）。
 *   ② **载荷**：真跑交付出口（spawn `dist/cli/cmd_read.js`，口径照 `566-result-title.test.mjs`），读页上
 *      确认那颗按钮的 `data-t`：含**会改数据库的命令名**与**本次改后值**、不含空位记号 `____`；且（`t366` 口径）
 *      复制区文本**去空白后逐字等于**手写的命令串。同一个 op 的第二枚（修改指令）＝报障人那句话 ＋ 同一条命令名。
 *   ③ **可执行**：把那串**原样执行**（分词口径照 `t366-复制执行闭环.test.mjs`）→ exit 0；库内字段等于串里的值。
 *
 * 期望值来源（只认票面与手写，不拿新实现输出当期望）：命令串 `WANT_CONFIRM` 逐字手写在下面；本次取值
 * `下肢＋核心` 与参数三元组取 `src/workout/routes.ts:192` 那条唤醒词「改某天训练」的示例形态；
 * 修改指令那句取自 `#944` 故障 8「要做成的样子」第 2 条原话。
 *
 * 夹具：临时家目录（`configTestBase` ＋ `homeEnvOf(calorieConfigDir(dir))`）＋ 钉钟（`freezeClock`），
 * 库由**真交付出口**种出来（`calorie.workout.plan-set`），真库一个字节不动。
 * 跑法：先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie`（本机没有 `node_modules/.bin`，别用 npx），
 *   再 `node --test packages/skill-calorie/test/946-写前预览页.test.mjs`；两条都经
 *   `node tooling/run-locked.mjs --ticket 946 -- <命令>`。
 */
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { calorieConfigDir, configTestBase, freezeClock } from './helpers/config-test.mjs';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';

/** Chrome 那格环境（**必须在隔离基座接管家目录之前**取好）。
 *
 *  为什么单给 Chrome 一格：`configTestBase()`／`calorieConfigDir()` 把 USERPROFILE／HOME 指到临时家目录，
 *  那是**技能侧子进程**的隔离手段；Chrome 是渲染工具，拿着临时家目录起不来 —— 本机实测（一次性探针
 *  `.scratch/t946/chrome-probe2.mjs`）：40s 内 DevTools 端口一直不起（Chrome 自己的 stderr 报
 *  `update_service_dialer_win.cc:75 Failed to open named pipe server process … 拒绝访问 (0x5)`）；
 *  把家目录还给真实那一份、摘掉 `NODE_OPTIONS`（钉钟预载件只给 node 子进程）后，同样一条命令 517ms 起好
 *  （`.scratch/t946/chrome-probe3.mjs`）。 */
const CHROME_ENV = (() => {
  const real = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  if (real.USERPROFILE !== undefined) env.USERPROFILE = real.USERPROFILE;
  if (real.HOME !== undefined) env.HOME = real.HOME;
  return env;
})();
// #676 · 测试隔离基座：家目录（配置目录／库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const DB_FILE = 'calorie_data.db';
/** 钉钟那一天（`freezeClock` 的入参；本页的读数不跟机器钟走，钉住只为产物可复跑）。 */
const SEED_DAY = '2026-09-07';
const PAGE_KEY = 'calorie.view.plan-write-preview';
/** 本次会改数据库的命令（写前预览 `op=update-day` 的确认命令，`routes.ts:56` 的 `确认改某天训练`）。 */
const WRITE_COMMAND = 'calorie.workout.plan-update-day';
/** 本次改后值（`routes.ts:192` 的同一条示例取值）。 */
const NEW_LABEL = '下肢＋核心';
/** 页的入参（`op` ＋ 那一条命令自己的参数，键序即页面进来的那一份）。 */
const PREVIEW_PARAMS = { op: 'update-day', week: 1, dayOfWeek: 3, newLabel: NEW_LABEL };
/** ① 的期望命令串：**逐字手写**（键序＝参数进来的顺序，去掉过程页自己的 `op`）。 */
const WANT_CONFIRM = "calorie-cmd-read calorie.workout.plan-update-day"
  + " --params '{\"week\":1,\"dayOfWeek\":3,\"newLabel\":\"下肢＋核心\"}'";
/** ② 的修改指令句头（`#944` 故障 8 报障人原话逐字）＋ 同一条命令名。 */
const MODIFY_LEAD = '我现在需要把什么修改为什么，确定录入，可以进行修改了';
const WANT_MODIFY = MODIFY_LEAD + ' ' + WRITE_COMMAND;
/** ① 的绿值：页头三级与正文列同宽；容差照票面 2px。 */
const WANT_W = 880;
const TOL = 2;
/** 本页那条同权单列规则（产物里逐字一份；变异自证按它做字串级删除）。 */
const COLUMN_RULE = '@media (min-width:1001px){.ilife-page-ui .ilife-block-page-shell-body>*{grid-column:2}}';
/** 几何三档（照 `#944` 故障 1 表里量过的档位）。 */
const WIDTHS = [1440, 1280, 1024];
/** 种子计划：一周两天有安排（周1 上肢、周3 腿），够 `op=update-day` 定位到「第 1 周 周三」。
 *  器材清单按 `planStore.ts` 的 `EQUIPMENT_KEYWORDS` 给足（「深蹲」归在杠铃那一档，缺它 `plan-set` 会 exit 2）。 */
const SEED_PLAN = {
  config: { title: '减脂4周', start_date: '2026-09-07', user_level: '中手', available_equipment: ['瑜伽垫', '杠铃'] },
  weeks: [{
    week_number: 1,
    days: [
      { day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑', part: '胸' }] }] },
      { day_of_week: 3, sessions: [{ session_label: '腿', movements: [{ name: '深蹲', part: '腿' }] }] },
    ],
  }],
};

/* ── 机械件 ── */

/** 一个临时家目录（真库零写入的机械化保证：不是 tmp 就当场红）。 */
function mkEnv(tag) {
  const dir = mkdtempSync(join(tmpdir(), tag));
  assert.ok(dir.startsWith(tmpdir()), '临时家目录必须在 tmp 下：' + dir);
  return dir;
}

/** 子进程那格环境：家目录接管 ＋ 钉钟。 */
function envOf(dir) {
  return { ...process.env, ...homeEnvOf(calorieConfigDir(dir)), ...freezeClock(SEED_DAY) };
}

/** 跑一条真出口命令；给了 `htmlPath` 就同时显式落盘。 */
function runCli(dir, key, params, htmlPath) {
  const argv = [CLI, key, '--params', JSON.stringify(params)];
  if (htmlPath !== undefined) argv.push('--html', htmlPath);
  const r = spawnSync(process.execPath, argv, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: envOf(dir) });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '').slice(-300), env };
}

/** 种子库模板（真交付出口种）；每个用例拿它的一份副本，故用例之间不互相污染。 */
let tplDir = null;
function templateDir() {
  if (tplDir !== null) return tplDir;
  const dir = mkEnv('t946-tpl-');
  const seeded = runCli(dir, 'calorie.workout.plan-set', { plan: SEED_PLAN });
  assert.equal(seeded.status, 0, '种子计划应经真出口写入成功：' + seeded.stderr);
  assert.ok(seeded.env !== null && seeded.env.key === 'calorie.workout.plan-set', '种子那一步要解析出 envelope');
  tplDir = dir;
  return dir;
}

/** 一个用例独占的库副本目录。 */
function freshRun(name) {
  const dir = join(templateDir(), name);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(templateDir(), DB_FILE), join(dir, DB_FILE));
  return dir;
}

/** 反义转义（`data-t` 属性里的实体）。 */
function unesc(s) {
  return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** 去掉全部空白（票面 ② 的比较口径）。 */
const nows = (s) => String(s).replace(/\s+/g, '');

/** 某颗复制按钮的载荷原文（`data-t` 那段，含 HTML 实体）。 */
function buttonPayloadRaw(html, actionId) {
  const m = html.match(new RegExp('<button[^>]*data-action-id="' + actionId + '"[^>]*data-t="([^"]*)"'));
  assert.ok(m !== null, '页面应有 `data-action-id="' + actionId + '"` 且带 `data-t` 的按钮');
  return m[1];
}

/** 某颗复制按钮的载荷（点了复制的就是它）。 */
function buttonPayload(html, actionId) {
  return unesc(buttonPayloadRaw(html, actionId));
}

/** 某颗复制按钮的可见文案。 */
function buttonLabel(html, actionId) {
  const m = html.match(new RegExp('<button[^>]*data-action-id="' + actionId + '"[^>]*>([^<]*)</button>'));
  assert.ok(m !== null, '页面应有 `data-action-id="' + actionId + '"` 的按钮');
  return m[1];
}

/** 页面上全部 `data-action-id`（去重、按出现序）——`#944` 故障 8 的读数面。 */
function actionIdsOf(html) {
  return [...new Set([...html.matchAll(/data-action-id="([^"]*)"/g)].map((m) => m[1]))];
}

/** 命令串里的 `--params` 那一段（原样执行与库内对账都用它）。 */
function paramsOf(cmd) {
  const i = cmd.indexOf('--params ');
  assert.ok(i > 0, '命令串里应有 `--params` 段：' + cmd);
  return JSON.parse(cmd.slice(i + '--params '.length).trim().replace(/^'/, '').replace(/'$/, ''));
}

/** 命令串分词（引号内的空格不切；照 `t366-复制执行闭环.test.mjs` 同口径）。 */
function tokenize(cmd) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cmd)) {
    if (q !== null) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur !== '') out.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur !== '') out.push(cur);
  return out;
}

/* ── 判据件（两个 checker 各抽出来：变异自证直接拿它们跑，不另抄一份） ── */

/** ② 载荷判据：确认指令＝逐字那条命令串；修改指令＝那句话＋同一条命令名；两枚都不许带空位记号。 */
function assertPayload(html, where) {
  const confirm = buttonPayload(html, 'ilife-help-copy-prompt');
  const modify = buttonPayload(html, 'ilife-help-copy-params');
  assert.equal(nows(confirm), nows(WANT_CONFIRM),
    where + ' 确认指令载荷（去空白）应逐字等于手写命令串；实测=' + JSON.stringify(confirm));
  assert.equal(confirm, WANT_CONFIRM, where + ' 确认指令载荷连空白也应逐字相同（命令串是单行）');
  assert.ok(confirm.includes(WRITE_COMMAND), where + ' 确认载荷应含会改数据库的命令名 ' + WRITE_COMMAND);
  assert.ok(confirm.includes(NEW_LABEL), where + ' 确认载荷应含本次改后值「' + NEW_LABEL + '」');
  assert.ok(!confirm.includes('____'), where + ' 确认载荷不得含空位记号 `____`');
  assert.equal(nows(modify), nows(WANT_MODIFY),
    where + ' 修改指令载荷应＝「' + MODIFY_LEAD + '」＋同一条命令名；实测=' + JSON.stringify(modify));
  assert.ok(!modify.includes('____'), where + ' 修改载荷不得含空位记号 `____`');
  assert.ok(!html.includes('新值:____'), where + ' 页面不得再出入口唤醒词模板那一段（`#944` 故障 3）');
  assert.equal(buttonLabel(html, 'ilife-help-copy-prompt'), '复制确认指令', where + ' 确认那枚的文案');
  assert.equal(buttonLabel(html, 'ilife-help-copy-params'), '复制修改指令', where + ' 修改那枚的文案');
  return { confirm, modify };
}

/** ① 几何判据：改前表卡与页头三级（眉标／标题／副题）逐档都 ≈880（容差 2px）。 */
function assertGeometry(rows, where) {
  assert.ok(rows.length > 0, where + ' 一档都没量到（几何读数缺失＝实证缺失）');
  for (const r of rows) {
    const seen = { '改前表卡': r.card, '眉标': r.eyebrow, '标题': r.title, '副题': r.subtitle };
    for (const [name, got] of Object.entries(seen)) {
      assert.ok(typeof got === 'number', where + ' @' + r.width + ' 档量不到「' + name + '」的宽');
      assert.ok(Math.abs(got - WANT_W) <= TOL,
        where + ' @' + r.width + ' 档「' + name + '」宽 ' + got + 'px ≠ ' + WANT_W + 'px（容差 ' + TOL + '）');
    }
  }
  return rows;
}

/* ── 真浏览器（headless Chrome ＋ CDP）：起法与探针照 `scripts/measure-responsive.mjs` ── */

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** 本机浏览器（找不到即当场红：几何是版面事实，静态文本查不到）。 */
function findBrowser() {
  const hit = [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter((p) => typeof p === 'string' && p !== '' && existsSync(p))[0];
  assert.ok(hit !== undefined,
    '未找到 Chrome／Edge：本票的几何判据要在真浏览器里量（实证缺失，不许静默跳过）。用 DSH_BROWSER=<路径> 指定。');
  return hit;
}

/** 页内读数：改前那张表卡 ＋ 页头三级的渲染宽（`getBoundingClientRect`，两位小数）。
 *  `docWidth` 一并带回来：它是**布局视口**的宽（`--hide-scrollbars` 下与视口同值），
 *  与 `innerWidth` 对不上就说明竖直滚动条吃掉了宽度，那是量法问题不是版面问题。 */
const PROBE = `(function () {
  function w(el) { return el === null ? null : Math.round(el.getBoundingClientRect().width * 100) / 100; }
  var card = null, caption = '';
  var cards = document.querySelectorAll('.ilife-block-data-table');
  for (var i = 0; i < cards.length; i += 1) {
    var cap = cards[i].querySelector('.ilife-block-data-table-caption');
    var text = cap === null ? '' : String(cap.textContent || '');
    if (text.indexOf('改前') === 0) { card = w(cards[i]); caption = text; }
  }
  return { innerWidth: window.innerWidth, docWidth: document.documentElement.clientWidth,
    card: card, cardCaption: caption,
    eyebrow: w(document.querySelector('.ilife-block-page-shell-eyebrow')),
    title: w(document.querySelector('.ilife-block-page-shell-title')),
    subtitle: w(document.querySelector('.ilife-block-page-shell-subtitle')) };
}())`;

function connectCdp(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const ready = new Promise((res, reject) => {
    ws.addEventListener('open', () => res());
    ws.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')));
  });
  return {
    ready,
    send(method, params, sessionId) {
      const id = nextId;
      nextId += 1;
      return new Promise((res, reject) => {
        pending.set(id, { resolve: res, reject });
        ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
      });
    },
    close() { ws.close(); },
  };
}

/** 起 headless Chrome，逐档量 `htmlPath` 的几何；返回 `[{width, card, eyebrow, title, subtitle, innerWidth}]`。 */
async function geometryOf(htmlPath, widths) {
  const browser = findBrowser();
  const port = 9700 + (process.pid % 200);
  const profile = mkdtempSync(join(tmpdir(), 't946-profile-'));
  const chrome = spawn(browser, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-breakpad',
    '--disable-dev-shm-usage', '--hide-scrollbars', '--allow-file-access-from-files',
    '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--window-size=1440,900', 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'], env: CHROME_ENV });
  /** Chrome 自己的输出（起不来时它是唯一线索；只看尾巴，别把整份读进断言）。 */
  let chromeOut = '';
  chrome.stdout.on('data', (d) => { chromeOut += String(d); });
  chrome.stderr.on('data', (d) => { chromeOut += String(d); });
  try {
    let devUrl = null;
    for (let waited = 0; waited < 30000 && devUrl === null; waited += 250) {
      try {
        const r = await fetch('http://127.0.0.1:' + port + '/json/version');
        if (r.ok) devUrl = (await r.json()).webSocketDebuggerUrl;
      } catch { /* 端口未就绪 */ }
      if (devUrl === null) await sleep(250);
    }
    assert.ok(devUrl !== null, 'CDP 未建立：headless Chrome 的 DevTools 端口没起来（' + port + '）；'
      + 'Chrome 输出尾巴＝' + chromeOut.slice(-400));
    const cdp = connectCdp(devUrl);
    await cdp.ready;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const evaluate = async (expression) => {
      const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      // 提示串要先自己防住 `undefined`：断言的消息参数是**恒求值**的，`JSON.stringify(undefined).slice` 会抛。
      const detail = r.exceptionDetails === undefined ? '' : String(JSON.stringify(r.exceptionDetails));
      assert.ok(!r.exceptionDetails, '页内求值抛错：' + detail.slice(0, 200));
      return r.result === undefined ? undefined : r.result.value;
    };
    await s('Page.enable');
    await s('Runtime.enable');
    const rows = [];
    for (const width of widths) {
      await s('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await s('Page.navigate', { url: pathToFileURL(htmlPath).href });
      for (let i = 0; i < 80; i += 1) {
        if (await evaluate('document.readyState === "complete"') === true) break;
        await sleep(50);
      }
      await sleep(120);
      rows.push({ width, ...(await evaluate(PROBE)) });
    }
    cdp.close();
    return rows;
  } finally {
    chrome.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* 关不掉的临时 profile 不掩盖结论 */ }
  }
}

/* ── 出页（三条读数共用同一套出页口径） ── */

/** 一个用例：跑一次写前预览页 → 页文本 ＋ 交付读数。 */
function renderPreview(name) {
  const dir = freshRun(name);
  const htmlPath = join(dir, 'preview.html');
  const r = runCli(dir, PAGE_KEY, PREVIEW_PARAMS, htmlPath);
  assert.equal(r.status, 0, '写前预览页应 exit 0：' + r.stderr);
  assert.ok(r.env !== null, '断成功就必须把 stdout 解析成 envelope（`#702` 页面断言门）');
  assert.equal(r.env.key, PAGE_KEY, 'envelope 的 key');
  const out = r.env.data.output;
  assert.ok(typeof out === 'string' && existsSync(out), 'data.output 应是真落盘的文件路径，实测 ' + JSON.stringify(out));
  const html = readFileSync(out, 'utf8');
  console.log('T946-READINGS ' + name + ' exit=0 bytes=' + Buffer.byteLength(html, 'utf8')
    + ' output=' + out + ' actionIds=' + actionIdsOf(html).join(','));
  return { dir, htmlPath: out, html, env: r.env };
}

/* ── ① 几何：改前表卡与页头三级都是 880 ── */

test('#946 ① 几何：真浏览器量「改前表卡」与「页头三级」，三档都 880px（容差 2px）', async () => {
  const page = renderPreview('geometry');
  const rows = assertGeometry(await geometryOf(page.htmlPath, WIDTHS), '本页');
  for (const r of rows) {
    console.log('T946-GEOMETRY @' + r.width + ' innerWidth=' + r.innerWidth + ' docWidth=' + r.docWidth
      + ' 改前表卡=' + r.card + ' 眉标=' + r.eyebrow + ' 标题=' + r.title + ' 副题=' + r.subtitle
      + '（caption=' + r.cardCaption + '）');
  }
  assert.equal(rows.length, WIDTHS.length, '三档都要真量到');
});

test('#946 ① 判据不恒真：把单列规则从产物里删掉，同一条几何判据必红（字串级变异）', async () => {
  const page = renderPreview('geometry-mut');
  const rows = assertGeometry(await geometryOf(page.htmlPath, [1440]), '本页');
  assert.ok(page.html.includes(COLUMN_RULE), '产物里找不到那条单列规则（改不了变异）：' + COLUMN_RULE);
  const mutPath = join(page.dir, 'no-column.html');
  writeFileSync(mutPath, page.html.split(COLUMN_RULE).join(''), 'utf8');
  const mutated = await geometryOf(mutPath, [1440]);
  console.log('T946-MUT-GEOMETRY @1440 改前表卡=' + mutated[0].card + ' 标题=' + mutated[0].title);
  assert.ok(mutated[0].card > WANT_W + 100,
    '删掉单列规则后「改前」表卡应回到满铺宽（现场读数 1240），实测 ' + mutated[0].card);
  assert.throws(() => assertGeometry(mutated, '变异01'), /容差/,
    '删掉单列规则后判据①没红 —— 几何判据是恒真的，白过');
  assertGeometry(rows, '还原（原产物）'); // 还原必绿
});

/* ── ② 载荷：确认指令＝可执行命令串；修改指令＝那句话＋同一条命令名 ── */

test('#946 ② 载荷：确认那颗按钮的 data-t＝含命令名与改后值的命令串、不含 `____`', () => {
  const page = renderPreview('payload');
  const { confirm, modify } = assertPayload(page.html, '本页');
  console.log('T946-PAYLOAD confirm=' + JSON.stringify(confirm));
  console.log('T946-PAYLOAD modify=' + JSON.stringify(modify));
  assert.ok(page.html.indexOf('ilife-help-copy-prompt') < page.html.indexOf('ilife-copy-data'),
    '两枚载荷仍在「复制数据／复制日志」之前（位置照旧）');
});

test('#946 ② 判据不恒真：把载荷换回入口唤醒词的 prompt_template（含 `新值:____`）必红', () => {
  const page = renderPreview('payload-mut');
  assertPayload(page.html, '本页');
  const old = buttonPayloadRaw(page.html, 'ilife-help-copy-prompt');
  // 变异＝把确认那枚的载荷换回改前的形态：入口唤醒词「改训练计划」的 prompt_template 片段（含空位记号）。
  const legacy = '请你加载技能 卡路里,执行唤醒词「改训练计划」。\\n要改的字段(标题/总周数/开始日期/描述,可改多个):____\\n新值:____';
  const mutated = page.html.replace(old, legacy);
  assert.notEqual(mutated, page.html, '变异没落上（产物里找不到那枚载荷）');
  assert.throws(() => assertPayload(mutated, '变异02'), /空位记号|逐字等于/,
    '载荷换回入口模板后判据②没红 —— 载荷判据是恒真的，白过');
  assertPayload(page.html, '还原（原产物）'); // 还原必绿
});

test('#946 ② 页面不再出「复制指令」那一段（故障 3 的三枚 actionId 变成四枚）', () => {
  const page = renderPreview('payload-ids');
  const ids = actionIdsOf(page.html);
  assert.ok(ids.includes('ilife-help-copy-prompt'), '确认那枚的 actionId 应是冻结表里的 `ilife-help-copy-prompt`');
  assert.ok(ids.includes('ilife-help-copy-params'), '修改那枚的 actionId 应是冻结表里的 `ilife-help-copy-params`');
  assert.deepEqual(ids.filter((x) => x.startsWith('ilife-help-copy-')), ['ilife-help-copy-prompt', 'ilife-help-copy-params'],
    '页面只该有两枚载荷按钮（不再有第三枚「复制指令」）');
  assert.ok(!page.html.includes('class="ilife-block-pre-block-code"'),
    '页底不再出 prompt 预览块（`#944` 故障 3：那一块把入口模板还给用户）');
  console.log('T946-IDS ' + ids.join(','));
});

/* ── ③ 可执行：把确认那条串原样执行 → exit 0 ＋ 库内字段等于串里的值 ── */

test('#946 ③ 可执行：把确认那串原样执行 → exit 0，库内值＝串里的值', () => {
  const page = renderPreview('executable');
  const { confirm } = assertPayload(page.html, '本页');
  const toks = tokenize(confirm);
  assert.equal(toks[0], 'calorie-cmd-read', '命令串首个 token 应是出口名：' + confirm);
  assert.ok(toks.length >= 4 && toks[2] === '--params', '命令串应带 `--params` 段：' + confirm);
  const w = spawnSync(process.execPath, [CLI, ...toks.slice(1)], { encoding: 'utf8', env: envOf(page.dir) });
  assert.equal(w.status, 0, '原样执行该串必须 exit 0：' + String(w.stderr || '').slice(-300));
  const env = JSON.parse(String(w.stdout || '').trim());
  assert.equal(env.key, WRITE_COMMAND, '串里的命令名就是这条会改数据库的命令');
  assert.equal(env.data.ok, true, '回执应是成功态');
  const db = openDb(join(page.dir, DB_FILE));
  const row = db.prepare('SELECT session_label AS label FROM workout_plans'
    + ' WHERE week_number = 1 AND day_of_week = 3 ORDER BY session_index').get();
  const others = db.prepare('SELECT COUNT(*) AS n FROM workout_plans WHERE week_number = 1 AND day_of_week != 3').get();
  db.close();
  assert.equal(row.label, paramsOf(confirm).newLabel, '库内字段应等于串里的值（不是页面别处的值）');
  assert.equal(row.label, NEW_LABEL, '库内值＝本次改后值');
  assert.equal(others.n, 1, '其余那天一行不动（改的只是串里点名的那一天）');
  console.log('T946-EXEC exit=0 命令=' + WRITE_COMMAND + ' 库内 session_label=' + row.label + ' 未动行=' + others.n);
});
