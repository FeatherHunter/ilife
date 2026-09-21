#!/usr/bin/env node
/** #834 · **渲染面探针**：把「静态面 ≠ 载荷渲染面」这条缺口（`docs/base/base-render/t867-读数链契约.md` §八
 * 自己登记的已知缺口）量出来 —— 静态读数读的是「剥掉 `<script>` 之后的可见文本」，
 * 而备忘录的产物页把内容放在页内 `payload` 里、由页内脚本渲染 ⇒ **用户看见的那一页没被量过**。
 *
 * 本件把页丢进无头浏览器跑完脚本，再对**渲染后的 DOM** 复用 `t867-dom-probe.mjs` 那套口径
 * （同一个 `visibleText`／文本节点归一／候选函数），所以两面的读数是**同一把尺**，差就是「渲染才出现的量」。
 *
 * 另单列一类：**页内导航链接与章节标题同串**（`<nav class="ilife-block-toc">` 的 `<a href="#sec-x">` 与
 * `<h2 id="sec-x">`）—— 静态口径会把它算进 `dupFacts`，但它是导航结构的两端、不是「同事实一页两处」，
 * 且判分引擎的 `toc` 腿反以此为正面项（#832 缺目录时 D5 由 25 掉到 16）。本件把它单列报出，供人核档改判。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t834-渲染面探针.mjs --dir <页群目录> [--json <落点>] [--quiet]
 * 退出码：0＝渲染面无命中；1＝有命中（逐页点名）；2＝用法错或浏览器不可用。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { probePage } from './t867-dom-probe.mjs';

const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const QUIET = process.argv.includes('--quiet');

/** 无头浏览器：优先环境变量，其次三处常见落点（与 `vision_html_screenshot` 用的是同一台机器）。 */
function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? '', 'Google/Chrome/Application/chrome.exe'),
    join(process.env.LOCALAPPDATA ?? '', 'Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter((p) => p && existsSync(p));
  return cands[0] ?? null;
}

const CHROME = findChrome();
if (CHROME === null) { console.error('找不到无头浏览器：设 CHROME_PATH，或装 Chrome／Chromium'); process.exit(2); }

/** 跑完页内脚本后的 DOM（`--virtual-time-budget` 给脚本跑完的虚拟时间）。 */
export function renderedDom(chrome, file) {
  const r = spawnSync(chrome, [
    '--headless', '--disable-gpu', '--no-sandbox', '--disable-extensions',
    '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(file).href,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
  if (r.status !== 0 || !String(r.stdout ?? '').trim()) {
    throw new Error('无头浏览器没出 DOM（exit=' + r.status + '）：' + String(r.stderr ?? '').slice(0, 300));
  }
  return String(r.stdout);
}

/** 去掉**页上看不见**的整块（行内 `display:none` 或 `hidden` 属性），只留屏幕上真出现的文本。
 *  为什么必做：复制载荷那一大段 `<pre id="receipt" style="display:none">① 场景: …</pre>` 是**载荷位**
 *  （`t869-机审读数.md` §3.1：载荷位不进判据），而它塞满了半角标点 —— 不剔出来，读数全是噪声。 */
export function stripHidden(html) {
  const tags = [...html.matchAll(/<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)];
  const drops = [];
  const stack = [];
  for (const m of tags) {
    const closing = m[0].startsWith('</');
    const selfClose = /\/>$/.test(m[0]);
    const name = m[1].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].name === name) {
          const top = stack.pop();
          if (top.hidden) drops.push([top.at, m.index + m[0].length]);
          break;
        }
      }
      continue;
    }
    if (selfClose || /^(br|img|input|meta|link|hr)$/.test(name)) continue;
    const attrs = m[2] ?? '';
    const hidden = /display\s*:\s*none/i.test(attrs) || /(^|\s)hidden(\s|=|$)/i.test(attrs);
    stack.push({ name, at: m.index, hidden });
  }
  // 没闭合的隐藏块：截到文末
  for (const top of stack) if (top.hidden) drops.push([top.at, html.length]);
  drops.sort((a, b) => b[0] - a[0]);
  let out = html;
  for (const [a, b] of drops) out = out.slice(0, a) + out.slice(b);
  return out;
}

/** 页内导航「链接 ↔ 标题」同串的对：返回被导航解释掉的串（这些不算 H3）。 */
export function tocPairs(html) {
  const nav = html.match(/<nav[^>]*class="[^"]*ilife-block-toc[^"]*"[\s\S]*?<\/nav>/i);
  if (nav === null) return { ids: new Set(), texts: new Set() };
  const ids = new Set([...nav[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]));
  const texts = new Set([...nav[0].matchAll(/<a[^>]*>([^<]*)<\/a>/g)].map((m) => m[1].trim()).filter((t) => t !== ''));
  return { ids, texts };
}

function main() {
  const dirArg = argOf('--dir', '');
  if (dirArg === '') { console.error('用法：node t834-渲染面探针.mjs --dir <页群目录> [--json <落点>] [--quiet]'); process.exit(2); }
  const dir = resolve(dirArg);
  if (!existsSync(dir)) { console.error('页群目录不存在：' + dir); process.exit(2); }
  const files = readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  if (files.length === 0) { console.error('页群目录里没有 .html：' + dir); process.exit(2); }

  const rows = [];
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8');
    const rendered = renderedDom(CHROME, join(dir, f));
    const visible = stripHidden(rendered);
    const stat = probePage(raw, f);
    const live = probePage(visible, f);
    const toc = tocPairs(visible);
    // 渲染才出现的量 = 渲染面命中 − 被页内导航解释掉的（静态／渲染两面都不算 H3）
    const explained = live.candidates.dupFacts.kinds.filter((k) => toc.texts.has(k.text)).reduce((a, k) => a + k.count - 1, 0);
    rows.push({
      file: f, key: f.replace(/\.html$/, ''),
      staticHits: { english: stat.candidates.english.hits, dupFacts: stat.candidates.dupFacts.hits },
      renderedHits: { english: live.candidates.english.hits, dupFacts: live.candidates.dupFacts.hits },
      tocExplained: explained,
      renderedH3: live.candidates.dupFacts.hits - explained,
      englishNodes: live.candidates.english.nodes,
      dupKinds: live.candidates.dupFacts.kinds,
      tocTexts: [...toc.texts],
    });
  }

  const sum = (k, ik) => rows.reduce((a, r) => a + r[k][ik], 0);
  if (!QUIET) {
    console.log('渲染面探针 · 目录=' + dir + '（' + rows.length + ' 页；无头浏览器 ' + CHROME + '）');
    for (const r of rows) {
      console.log('FILE ' + r.file + '  静态 english=' + r.staticHits.english + ' dup=' + r.staticHits.dupFacts
        + ' → 渲染后 english=' + r.renderedHits.english + ' dup=' + r.renderedHits.dupFacts
        + '（其中页内导航解释掉 ' + r.tocExplained + ' ⇒ H3 候选 ' + r.renderedH3 + '）');
      for (const h of r.englishNodes) console.log('    en   #' + h.n + '  ' + JSON.stringify(h.text.slice(0, 90)) + '  词=' + JSON.stringify(h.words) + ' 标点=' + JSON.stringify(h.punc));
      for (const k of r.dupKinds) console.log('    dup  #' + k.nodes.join(' #') + ' ×' + k.count + '  ' + JSON.stringify(k.text) + (r.tocTexts.includes(k.text) ? '（页内导航同串）' : ''));
    }
    console.log('');
    console.log('合计：静态 english ' + sum('staticHits', 'english') + ' 处／dup ' + sum('staticHits', 'dupFacts') + ' 处'
      + '；渲染后 english ' + sum('renderedHits', 'english') + ' 处／dup ' + sum('renderedHits', 'dupFacts') + ' 处'
      + '（页内导航解释掉 ' + rows.reduce((a, r) => a + r.tocExplained, 0) + '）');
  }

  const bad = rows.filter((r) => r.renderedHits.english > 0 || r.renderedH3 > 0);
  const out = argOf('--json', '');
  if (out !== '') {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), JSON.stringify({
      at: new Date().toISOString(), dir, chrome: CHROME, pages: rows,
      summary: {
        pages: rows.length,
        staticEnglish: sum('staticHits', 'english'), staticDup: sum('staticHits', 'dupFacts'),
        renderedEnglish: sum('renderedHits', 'english'), renderedDup: sum('renderedHits', 'dupFacts'),
        tocExplained: rows.reduce((a, r) => a + r.tocExplained, 0),
      },
    }, null, 2) + '\n', 'utf8');
    console.log('RENDER-PROBE-WROTE ' + resolve(out));
  }
  console.log('RESULT: ' + (rows.length - bad.length) + '/' + rows.length + ' PASS'
    + (bad.length === 0 ? '：渲染面无英文裸词、无同事实重复' : '：' + bad.map((r) => r.file).join('、')));
  process.exit(bad.length === 0 ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
