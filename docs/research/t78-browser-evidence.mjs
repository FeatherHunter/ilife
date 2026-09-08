/** #78 图表 helpers JS —— 真实浏览器实证（headless Chrome/Edge，`file://`，无服务／无宿主注入／无 CDN）。
 *
 *  跑法（仓根）：`node .scratch/t78/browser-evidence.mjs`
 *  退出码：0 = 全部断言通过；1 = 有断言失败；2 = 找不到浏览器（实证未完成）。
 *
 *  被验对象：`packages/base-render/dist/charts.js` 的 `buildChartsHelpersJs(input?)`
 *  —— 应自注入 `<style id="ilife-charts">`，且同页注入两次仍只有一份（幂等）。
 *
 *  证据链：
 *   1. 找浏览器（`DSH_BROWSER_CANDIDATES` → 常见安装路径），找不到**显式失败**，绝不静默跳过；
 *   2. 用 helpers 产出文本 ＋ `charts.*` 8 类产出 HTML 生成自包含 `file://` 页面（browser/）；
 *   3. headless `--dump-dom` 回读 DOM ＋ `--enable-logging=stderr --v=1` 抓控制台，逐条断言；
 *   4. 负样本自证鉴别力：helpers 文本删掉幂等判据 → 页面 B 必须出现 2 个 style（断言变红）；
 *      再用错误通道阳性对照页证明「页面零 console 输出」这条断言不是恒真。
 *
 *  只读仓内源码；只在 `.scratch/t78/browser/` 下写文件；不动 packages/**。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { REPO_ROOT, writeFixturePages } from './browser/generate-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, 'browser');
const PROFILE_DIR = resolve(OUT_DIR, '_profile');
const MAX_BUFFER = 256 * 1024 * 1024;

const transcript = [];
function log(line = '') {
  transcript.push(line);
  console.log(line);
}

/* ── 0. 被验产物指纹（证据自证：这份证据验的是哪个 dist 字节） ──────────── */

const ARTIFACTS = [
  'packages/base-render/dist/charts.js',
  'packages/base-render/dist/spec/index.js',
];

function artifactFingerprint() {
  return ARTIFACTS.map((rel) => {
    const abs = resolve(REPO_ROOT, rel);
    const buf = readFileSync(abs);
    return {
      file: rel,
      size: buf.length,
      sha256: createHash('sha256').update(buf).digest('hex'),
      mtime: statSync(abs).mtime.toISOString(),
    };
  });
}

/* ── 1. 找浏览器 ───────────────────────────────────────────────────────── */

const DEFAULT_CANDIDATES = [
  { name: 'chrome (Program Files)', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
  { name: 'chrome (Program Files x86)', path: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' },
  { name: 'chrome (LocalAppData)', path: join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe') },
  { name: 'msedge (Program Files)', path: 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' },
  { name: 'msedge (Program Files x86)', path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' },
  { name: 'msedge (LocalAppData)', path: join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe') },
  { name: 'chromium (Program Files)', path: 'C:\\Program Files\\Chromium\\Application\\chrome.exe' },
  { name: 'chromium (Program Files x86)', path: 'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe' },
  { name: 'chromium (LocalAppData)', path: join(process.env.LOCALAPPDATA || '', 'Chromium\\Application\\chrome.exe') },
];

/** 裸名字（如 `chrome`）走 PATH 查找。 */
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

function findBrowser() {
  const tried = [];
  const envRaw = process.env.DSH_BROWSER_CANDIDATES;
  if (envRaw !== undefined && envRaw.trim() !== '') {
    for (const raw of envRaw.split(';').map((s) => s.trim()).filter(Boolean)) {
      const resolved = existsSync(raw) ? raw : whichOnPath(raw);
      tried.push({ name: 'DSH_BROWSER_CANDIDATES: ' + raw, path: raw, resolved: resolved || '(not found)' });
      if (resolved !== null) return { exe: resolved, source: 'DSH_BROWSER_CANDIDATES', tried };
    }
  }
  for (const c of DEFAULT_CANDIDATES) {
    if (c.path === '') continue;
    tried.push(c);
    if (existsSync(c.path)) return { exe: c.path, source: c.name, tried };
  }
  return { exe: null, source: null, tried };
}

/** 版本：先试 `--version`（GUI 子系统 exe 可能拿不到 stdout）→ 退化为安装目录里的版本号子目录。 */
function detectVersion(exe) {
  const attempts = [];
  const r = spawnSync(exe, ['--version'], { encoding: 'utf8', timeout: 20000, maxBuffer: MAX_BUFFER });
  const text = ((r.stdout || '') + '\n' + (r.stderr || '')).trim();
  /* Windows 上 chrome.exe 是 GUI 子系统程序：`--version` 的 stdout 拿不到版本号，
   * 拿到的往往是本地代码页（GBK）提示文案；压成 ASCII 以免污染证据文本。 */
  const asciiText = text.replace(/[^\x20-\x7E]+/g, (m) => '<non-ascii:' + m.length + 'chars>');
  attempts.push({ how: '--version', status: r.status, text: asciiText.slice(0, 200) });
  const m = /\d+\.\d+\.\d+\.\d+/.exec(text);
  if (m) return { version: m[0], attempts };
  const parent = dirname(exe);
  try {
    const dirs = readdirSync(parent, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+\.\d+\.\d+\.\d+$/.test(d.name))
      .map((d) => d.name)
      .sort((a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 4; i += 1) if (pa[i] !== pb[i]) return pb[i] - pa[i];
        return 0;
      });
    attempts.push({ how: 'version-dir', parent, dirs });
    if (dirs.length > 0) return { version: dirs[0] + ' (from install-dir name)', attempts };
  } catch (err) {
    attempts.push({ how: 'version-dir', error: String(err && err.message) });
  }
  return { version: 'unknown', attempts };
}

/* ── 2. 跑 headless 浏览器 ─────────────────────────────────────────────── */

function baseFlags(profile) {
  return [
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--hide-scrollbars',
    '--window-size=1280,900',
    '--allow-file-access-from-files',
    '--enable-logging=stderr',
    '--v=1',
    '--virtual-time-budget=1500',
    '--user-data-dir=' + profile,
  ];
}

function runOnce(exe, url, headlessFlag) {
  rmSync(PROFILE_DIR, { recursive: true, force: true });
  mkdirSync(PROFILE_DIR, { recursive: true });
  const args = [headlessFlag, ...baseFlags(PROFILE_DIR), '--dump-dom', url];
  const r = spawnSync(exe, args, { encoding: 'utf8', timeout: 180000, maxBuffer: MAX_BUFFER });
  return {
    argv: [exe, ...args],
    status: r.status,
    signal: r.signal,
    error: r.error ? String(r.error.message) : null,
    dom: r.stdout || '',
    log: r.stderr || '',
  };
}

function runPage(exe, url) {
  const first = runOnce(exe, url, '--headless=new');
  if (first.dom.trim() !== '') {
    return { ...first, headlessFlag: '--headless=new', fallback: null };
  }
  const retry = runOnce(exe, url, '--headless');
  if (retry.dom.trim() !== '') {
    return { ...retry, headlessFlag: '--headless', fallback: '--headless=new produced empty DOM' };
  }
  return { ...first, headlessFlag: '--headless=new', fallback: 'both --headless=new and --headless produced empty DOM' };
}

/* ── 3. DOM / 日志解析 ─────────────────────────────────────────────────── */

function countStyleTag(dom, styleId) {
  return [...dom.matchAll(new RegExp('<style\\b[^>]*\\bid="' + styleId + '"[^>]*>', 'g'))].length;
}

function styleContent(dom, styleId) {
  const m = new RegExp('<style\\b[^>]*\\bid="' + styleId + '"[^>]*>([\\s\\S]*?)</style>').exec(dom);
  return m ? m[1] : null;
}

function countTags(dom, tag) {
  return [...dom.matchAll(new RegExp('<' + tag + '\\b', 'g'))].length;
}

function svgWithViewBox(dom) {
  return [...dom.matchAll(/<svg\b[^>]*>/g)].filter((m) => /\bviewBox="/.test(m[0])).length;
}

function chartKindValues(dom) {
  return [...new Set([...dom.matchAll(/data-chart-kind="([^"]*)"/g)].map((m) => m[1]))].sort();
}

function chartKindOccurrences(dom) {
  return [...dom.matchAll(/data-chart-kind="([^"]*)"/g)].length;
}

/** Chrome stderr 日志里 `CONSOLE:` 是页面 console 通道；格式形如
 *  `[pid:tid:date:INFO:CONSOLE:27] "text", source: file:///...(27)`。 */
function consoleLineLines(log) {
  return log
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /CONSOLE[:\(]/.test(l));
}

/** 页面来源的 console 行 / 未捕获异常 / SEVERE（按 `source:` 是否指向本页过滤）。 */
function classifyLog(log, pageUrl) {
  const lines = log.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const isConsole = (l) => /CONSOLE[:\(]/.test(l);
  const pageConsole = lines.filter((l) => isConsole(l) && l.includes(pageUrl));
  const uncaught = lines.filter((l) => /\bUncaught\b/.test(l) && l.includes(pageUrl));
  const severe = lines.filter((l) => /\bSEVERE\b/.test(l) && l.includes(pageUrl));
  const internal = lines.filter((l) => !isConsole(l) && /\b(ERROR|FATAL)\b/.test(l));
  return { pageConsole, uncaught, severe, internal, allConsole: lines.filter(isConsole) };
}

/* ── 4. 断言与报告 ─────────────────────────────────────────────────────── */

const results = [];
function check(id, label, ok, actual) {
  results.push({ id, label, ok, actual: String(actual) });
  log('[ASSERT] ' + id.padEnd(4) + ' ' + label.padEnd(56) + (ok ? 'PASS' : 'FAIL') + '  actual=' + actual);
  return ok;
}

/** 抹掉 Chrome 日志前缀里的 pid/tid/时间戳，让证据文本逐次可复跑（逐字节稳定）。 */
function normalizeLogLine(line) {
  return line.replace(/^\[\d+:\d+:\d{4}\/\d+\.\d+:(?:INFO|ERROR|WARNING|VERBOSE\d*):/, '[');
}

/** 页面 console 通道快照：只落「分类后」的少量行，避免 600KB/页 的 --v=1 原始日志进仓。 */
function consoleSnapshot(cls) {
  const norm = (arr) => arr.map(normalizeLogLine);
  return [
    '# page-scoped console lines: ' + cls.pageConsole.length,
    ...norm(cls.pageConsole).map((l) => 'console: ' + l),
    '# page-scoped Uncaught lines: ' + cls.uncaught.length,
    ...norm(cls.uncaught).map((l) => 'uncaught: ' + l),
    '# page-scoped SEVERE lines: ' + cls.severe.length,
    ...norm(cls.severe).map((l) => 'severe: ' + l),
    '# all CONSOLE-tagged lines in stderr (any source): ' + cls.allConsole.length,
    '# browser-internal ERROR/FATAL lines (not page-scoped): ' + cls.internal.length,
    ...norm(cls.internal).slice(0, 10).map((l) => 'internal: ' + l.slice(0, 200)),
    '',
  ].join('\n');
}

function report(fixtures, browser, version, fingerprintBefore) {
  log('='.repeat(96));
  log('#78 图表 helpers JS —— 真实浏览器实证（headless，file://，无服务/无宿主注入/无 CDN）');
  log('='.repeat(96));
  log('repo root      : ' + REPO_ROOT);
  log('browser exe    : ' + browser.exe);
  log('browser source : ' + browser.source);
  log('browser version: ' + version.version);
  log('style id       : ' + fixtures.styleId);
  log('helpers JS len : ' + fixtures.helpersJs.length);
  log('expected kinds : ' + fixtures.chartKinds.join(','));
  log('artifacts      :');
  for (const f of fingerprintBefore) {
    log('  ' + f.file + '  size=' + f.size + '  sha256=' + f.sha256 + '  mtime=' + f.mtime);
  }
  log('-'.repeat(96));

  const runs = {};
  for (const p of fixtures.pages) {
    const url = pathToFileURL(resolve(OUT_DIR, p.fileName)).href;
    const r = runPage(browser.exe, url);
    runs[p.id] = { page: p, url, ...r };
    writeFileSync(resolve(OUT_DIR, p.id + '.dom.html'), r.dom, 'utf8');
    const cls = classifyLog(r.log, url);
    writeFileSync(resolve(OUT_DIR, p.id + '.console.txt'), consoleSnapshot(cls), 'utf8');
    if (process.env.T78_KEEP_RAW_LOGS === '1') {
      writeFileSync(resolve(OUT_DIR, p.id + '.stderr.log'), r.log, 'utf8');
    }
    log('[RUN] ' + p.id.padEnd(11) + ' status=' + r.status + ' domLen=' + r.dom.length +
      ' headless=' + r.headlessFlag + ' consoleLines=' + consoleLineLines(r.log).length +
      (r.fallback ? ' fallback=' + r.fallback : ''));
  }
  log('-'.repeat(96));

  /* 页面 A：helpers 单次注入 */
  const a = runs['page-a'];
  const aStyles = countStyleTag(a.dom, fixtures.styleId);
  check('A1', 'page-a: <style id="ilife-charts"> count == 1', aStyles === 1, aStyles);
  const aCss = styleContent(a.dom, fixtures.styleId);
  check('A2', 'page-a: injected style content non-empty', aCss !== null && aCss.trim().length > 0,
    aCss === null ? 'style-not-found' : 'len=' + aCss.length);
  check('A3', 'page-a: injected style contains .ilife-chart rule',
    aCss !== null && aCss.includes('.ilife-chart{'), aCss === null ? 'style-not-found' : 'hasRule=' + aCss.includes('.ilife-chart{'));
  const aScripts = countTags(a.dom, 'script');
  check('A4', 'page-a: <script> count == injected helpers (1)', aScripts === 1, aScripts);
  const aCls = classifyLog(a.log, a.url);
  check('A5', 'page-a: page console output + Uncaught == 0',
    aCls.pageConsole.length + aCls.uncaught.length + aCls.severe.length === 0,
    'console=' + aCls.pageConsole.length + ' uncaught=' + aCls.uncaught.length + ' severe=' + aCls.severe.length);

  /* 页面 B：双次注入 → 幂等 */
  const b = runs['page-b'];
  const bStyles = countStyleTag(b.dom, fixtures.styleId);
  check('B1', 'page-b: <style id="ilife-charts"> count == 1 (idempotent)', bStyles === 1, bStyles);
  const bScripts = countTags(b.dom, 'script');
  check('B2', 'page-b: <script> count == injected helpers (2)', bScripts === 2, bScripts);
  const bCls = classifyLog(b.log, b.url);
  check('B3', 'page-b: page console output + Uncaught == 0',
    bCls.pageConsole.length + bCls.uncaught.length + bCls.severe.length === 0,
    'console=' + bCls.pageConsole.length + ' uncaught=' + bCls.uncaught.length + ' severe=' + bCls.severe.length);

  /* 页面 C：helpers ＋ 8 类图表 */
  const c = runs['page-c'];
  const cKinds = chartKindValues(c.dom);
  check('C1', 'page-c: distinct data-chart-kind values == 8', cKinds.length === 8,
    cKinds.length + ' [' + cKinds.join(',') + ']');
  check('C2', 'page-c: data-chart-kind set == CHART_KINDS',
    cKinds.join(',') === [...fixtures.chartKinds].sort().join(','), cKinds.join(','));
  check('C3', 'page-c: data-chart-kind occurrences == 8', chartKindOccurrences(c.dom) === 8, chartKindOccurrences(c.dom));
  const cCanvas = countTags(c.dom, 'canvas');
  check('C4', 'page-c: <canvas> count == 0', cCanvas === 0, cCanvas);
  const cScripts = countTags(c.dom, 'script');
  check('C5', 'page-c: <script> count == injected helpers (1)', cScripts === 1, cScripts);
  const cViewBox = svgWithViewBox(c.dom);
  check('C6', 'page-c: svg[viewBox] count >= 8', cViewBox >= 8, cViewBox);
  const cStyles = countStyleTag(c.dom, fixtures.styleId);
  check('C7', 'page-c: <style id="ilife-charts"> count == 1', cStyles === 1, cStyles);
  const cCls = classifyLog(c.log, c.url);
  check('C8', 'page-c: page console output + Uncaught == 0',
    cCls.pageConsole.length + cCls.uncaught.length + cCls.severe.length === 0,
    'console=' + cCls.pageConsole.length + ' uncaught=' + cCls.uncaught.length + ' severe=' + cCls.severe.length);

  /* 负样本自证鉴别力：同一份断言在删掉判据的页面上必须变红 */
  const n = runs['page-b-neg'];
  const nStyles = countStyleTag(n.dom, fixtures.styleId);
  const standardAssertion = (count) => count === 1; // 就是 A1/B1/C7 用的口径
  check('N1', 'negative sample: guard removed -> style count == 2', nStyles === 2, nStyles);
  check('N2', 'negative sample: standard assertion (count == 1) turns RED', standardAssertion(nStyles) === false,
    'standardAssertion(' + nStyles + ')=' + standardAssertion(nStyles));
  const nScripts = countTags(n.dom, 'script');
  check('N3', 'negative sample: <script> count == 2 (both ran)', nScripts === 2, nScripts);

  /* 错误通道阳性对照：证明「零 console 输出」断言不是恒真 */
  const d = runs['page-d-err'];
  const dCls = classifyLog(d.log, d.url);
  check('D1', 'error-channel control: detector sees deliberate console.error',
    dCls.pageConsole.some((l) => /PROBE-CONSOLE-ERROR/.test(l)),
    dCls.pageConsole.filter((l) => /PROBE-CONSOLE-ERROR/.test(l)).length);
  check('D2', 'error-channel control: detector sees Uncaught throw',
    dCls.uncaught.length > 0, dCls.uncaught.length);

  log('-'.repeat(96));
  const norm = (arr) => arr.map(normalizeLogLine);
  log('[LOG] page-a     console/uncaught/severe: ' + JSON.stringify({ console: norm(aCls.pageConsole), uncaught: norm(aCls.uncaught), severe: norm(aCls.severe) }));
  log('[LOG] page-b     console/uncaught/severe: ' + JSON.stringify({ console: norm(bCls.pageConsole), uncaught: norm(bCls.uncaught), severe: norm(bCls.severe) }));
  log('[LOG] page-c     console/uncaught/severe: ' + JSON.stringify({ console: norm(cCls.pageConsole), uncaught: norm(cCls.uncaught), severe: norm(cCls.severe) }));
  log('[LOG] page-b-neg console/uncaught/severe: ' + JSON.stringify({ pageConsole: norm(classifyLog(n.log, n.url).pageConsole), uncaught: norm(classifyLog(n.log, n.url).uncaught), severe: norm(classifyLog(n.log, n.url).severe) }));
  log('[LOG] page-d-err console lines: ' + JSON.stringify(norm(dCls.pageConsole)));
  const internal = [...aCls.internal, ...bCls.internal, ...cCls.internal].map(normalizeLogLine);
  log('[LOG] browser-internal ERROR/FATAL lines (NOT page-scoped, excluded from assertions): ' + internal.length);
  for (const l of internal.slice(0, 5)) log('[LOG]   ' + l.slice(0, 150));
  log('-'.repeat(96));

  /* 证据完整性：本次运行期间被验产物的**内容**必须没变（否则这份证据不自洽）。
   * 只比 size+sha256：mtime 变化但字节相同（tsc 重写同内容）不影响证据有效性。 */
  const fingerprintAfter = artifactFingerprint();
  const contentKey = (fp) => fp.map((f) => f.file + ':' + f.size + ':' + f.sha256).join('|');
  const stable = contentKey(fingerprintBefore) === contentKey(fingerprintAfter);
  check('S1', 'artifacts under test unchanged during this run', stable,
    stable ? 'stable (content hash unchanged)' : 'CHANGED -> ' + JSON.stringify(fingerprintAfter));

  const failed = results.filter((r) => !r.ok);
  log('TOTAL ' + results.length + ' assertions: ' + (results.length - failed.length) + ' PASS, ' + failed.length + ' FAIL');
  for (const f of failed) log('FAILED: ' + f.id + ' ' + f.label + ' actual=' + f.actual);
  log('VERDICT: ' + (failed.length === 0 ? 'GREEN (all assertions passed)' : 'RED (failures present)'));
  return { failed, runs };
}

/* ── 5. 入口 ───────────────────────────────────────────────────────────── */

const browser = findBrowser();
if (browser.exe === null) {
  log('='.repeat(96));
  log('实证未完成：找不到可用浏览器');
  log('='.repeat(96));
  log('DSH_BROWSER_CANDIDATES = ' + JSON.stringify(process.env.DSH_BROWSER_CANDIDATES ?? null));
  log('试过的路径/名字：');
  for (const t of browser.tried) log('  - ' + t.name + '  ' + t.path);
  log('VERDICT: NOT-RUN (browser unavailable; not skipped, not counted as pass)');
  writeFileSync(resolve(OUT_DIR, 'evidence-run.txt'), transcript.join('\n') + '\n', 'utf8');
  process.exit(2);
}

const { version, attempts } = detectVersion(browser.exe);
log('[BROWSER] exe     = ' + browser.exe);
log('[BROWSER] source  = ' + browser.source);
log('[BROWSER] version = ' + version);
for (const a of attempts) log('[BROWSER] detect  = ' + JSON.stringify(a));

const fingerprintBefore = artifactFingerprint();
for (const f of fingerprintBefore) {
  log('[ARTIFACT] ' + f.file + '  size=' + f.size + '  sha256=' + f.sha256 + '  mtime=' + f.mtime);
}

mkdirSync(OUT_DIR, { recursive: true });
const fixtures = await writeFixturePages(OUT_DIR);
log('[FIXTURE] wrote: ' + fixtures.written.map((f) => f.split(/[\\/]/).pop()).join(', '));

const { failed, runs } = report(fixtures, browser, { version }, fingerprintBefore);
rmSync(PROFILE_DIR, { recursive: true, force: true });

writeFileSync(resolve(OUT_DIR, 'evidence-run.txt'), transcript.join('\n') + '\n', 'utf8');
writeFileSync(resolve(OUT_DIR, 'evidence-summary.json'), JSON.stringify({
  browser: { exe: browser.exe, source: browser.source, version: version.version, versionAttempts: attempts },
  artifacts: fingerprintBefore,
  styleId: fixtures.styleId,
  helpersJsLength: fixtures.helpersJs.length,
  chartKinds: fixtures.chartKinds,
  pages: Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, {
    file: v.page.fileName, url: v.url, note: v.page.note, injectedHelpers: v.page.injectedHelpers,
    status: v.status, headlessFlag: v.headlessFlag, domLen: v.dom.length,
  }])),
  assertions: results,
  pass: results.filter((r) => r.ok).length,
  fail: failed.length,
  verdict: failed.length === 0 ? 'GREEN' : 'RED',
}, null, 2) + '\n', 'utf8');

process.exit(failed.length === 0 ? 0 : 1);
