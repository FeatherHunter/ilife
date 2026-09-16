#!/usr/bin/env node
/** #618 复核席 · **独立探针**（自设；与实施席 `t618-真出口断言.mjs` 不共用任何抽取／解析代码）。
 *
 * 为什么另起一份：实施席的探针只跑**写死的 8 条窗口词**，且可见文本走仓内测试件
 * `test/visible-text-probe.mjs`。本件做三件它做不到的事：
 *   ① **页数超集**：不写死词表，从 `src/**\/routes.ts`（路由的**源件**，不是生成物）逐行枚举**全部**
 *      `key: 'calorie.view.diet'` 的唤醒词（10 条窗口／总览词 ＋ 5 条餐别词），逐条走真 CLI；
 *   ② **独立抽取**：自带一套可见文本抽取（剔注释／head／style／script／template，再削标签、解实体），
 *      与仓内 `visible-text-probe.mjs` 的实现不同源——「绿」不是同一个抽取器的自证；
 *   ③ **静态契约两查**：数据层声明域（`analysis/trend.ts` 的 `'up' | 'down' | 'flat'`）是否**逐档**都有
 *      中文判语；页面侧中文表在同族导入闭包里是否**只此一份**；另查证据件点名的「遗留出口」
 *      （`src/render/html.ts`）在当刻构建的导入闭包里**到底通不通得到**。
 *
 * 用法（先 `node node_modules/typescript/bin/tsc -b packages/skill-calorie --force`）：
 *   node docs/skills/skill-calorie/t618r-独立探针.mjs run <outDir>          # 15 页逐条真出口
 *   node docs/skills/skill-calorie/t618r-独立探针.mjs compare <old> <new>   # 新旧产物逐字节对照
 * 退出码：run 全绿 0／任一页红 1；compare 全部差异都落在「趋势」卡值位 0，卡外另有差异 1。
 * 库与产物只落系统 tmp 与给定目录，不写仓内件（outDir 由调用方给，规格上住 `.scratch/`）。
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PKG = join(ROOT, 'packages', 'skill-calorie');
const CLI = join(PKG, 'dist', 'cli', 'cmd_read.js');
const ROUTES_DIR = join(PKG, 'src');
const TREND_SRC = join(PKG, 'src', 'analysis', 'trend.ts');
const DIETDOC_SRC = join(PKG, 'src', 'render', 'dietDocs.ts');
const HTML_SRC = join(PKG, 'src', 'render', 'html.ts');
const CLI_ENTRY = join(PKG, 'src', 'cli', 'cmd_read.ts');

/** 本席自己的锚点与自定窗（**有意错开**实施席探针的 2026-09-07 与它的种子）。 */
const TODAY = '2026-10-15';
const CUSTOM_START = '2026-10-01';
const CUSTOM_END = '2026-10-15';
/** 票面验收命令点名的 8 条窗口词（只作「路由表里有没有」的对照，不当页数上限）。 */
const TICKET_WORDS = ['看昨日饮食', '看本周饮食', '看上周饮食', '看本月饮食', '看上月饮食',
  '看最近 7 天饮食', '看最近 30 天饮食', '看某段时间饮食'];
const ZH_VERDICTS = ['上升', '下降', '持平'];
const BARE_RE = /\b(?:up|down|flat)\b/gi;

const rel = (p) => relative(ROOT, p).split('\\').join('/');
const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ── ① 路由枚举（源件逐行；不写死词表，任一 routes.ts 里命中 key 的行都收） ── */

function walkRouteFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkRouteFiles(p, out);
    else if (e.isFile() && e.name.endsWith('routes.ts')) out.push(p);
  }
  return out.sort();
}

function dietRoutes() {
  const rows = [];
  for (const f of walkRouteFiles(ROUTES_DIR)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.includes("key: 'calorie.view.diet'")) continue;
      const w = /wakeWord: '([^']*)'/.exec(line);
      const c = /cli: '((?:[^'\\]|\\.)*)'/.exec(line);
      if (w === null || c === null) { rows.push({ file: rel(f), word: null, cli: null }); continue; }
      rows.push({ file: rel(f), word: w[1], cli: c[1].replace(/\\'/g, "'") });
    }
  }
  return rows;
}

function paramsOf(cli) {
  const m = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'(.*)')?$/.exec(cli);
  if (m === null) throw new Error('cli 不能解析：' + cli);
  if (m[2] === undefined) return { key: m[1], params: {} };
  const filled = m[2].split('<开始日期>').join(CUSTOM_START).split('<结束日期>').join(CUSTOM_END);
  return { key: m[1], params: JSON.parse(filled) };
}

/* ── ② 独立可见文本抽取（自带实现，不走仓内探针件） ── */

function decode(s) {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function myVisible(html) {
  return decode(html
    .replace(/<!--[\s\S]*?-->/g, '\n')
    .replace(/<head\b[\s\S]*?<\/head>/gi, '\n')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '\n')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '\n')
    .replace(/<[^>]*>/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')).split('\n').map((s) => s.trim()).filter((s) => s !== '').join('\n');
}

/** 「趋势」读数卡的值位：从标签 div 起向后找第一个值槽，取到下一个 `<` 为止。 */
function trendCardSpan(html) {
  const li = html.indexOf('<div class="ilife-block-kpi-card-label">趋势</div>');
  if (li < 0) return null;
  const tag = 'ilife-block-kpi-card-value">';
  const vs = html.indexOf(tag, li);
  if (vs < 0) return null;
  const start = vs + tag.length;
  const end = html.indexOf('<', start);
  if (end < 0) return null;
  return { raw: html.slice(start, end), start, end };
}

const cardNorm = (html) => {
  const s = trendCardSpan(html);
  return s === null ? html : html.slice(0, s.start) + '《值》' + html.slice(s.end);
};

/** 复制载荷槽（`data-t="…"`）里承载技术原文与**生成时刻**，两次运行本就不同源——对照前归一。 */
const payloadNorm = (html) => html.replace(/data-t="[^"]*"/g, 'data-t="《载荷》"');
const norm = (html) => cardNorm(payloadNorm(html));

/* ── ③ 导入闭包（静态两查用）：相对导入逐层展开到 .ts ── */

function closureOf(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length > 0) {
    const f = stack.pop();
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/from\s+'([^']+)'|import\s*\(\s*'([^']+)'\s*\)/g)) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith('.')) continue;
      const base = spec.endsWith('.js') ? spec.slice(0, -3) + '.ts' : spec;
      const p = join(dirname(f), base);
      if (existsSync(p)) stack.push(p);
      else if (existsSync(join(p, 'index.ts'))) stack.push(join(p, 'index.ts'));
    }
  }
  return seen;
}

/** 一份「中文判语表」：对象字面量里同时有 up／down／flat 三键、值含汉字。 */
function zhTrendTables(files) {
  const hits = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\{\s*[^{}\n]*up:\s*'([^']*)'[^{}]*down:\s*'([^']*)'[^{}]*flat:\s*'([^']*)'[^{}]*\}/g)) {
      if (/[\u4e00-\u9fa5]/.test(m[1] + m[2] + m[3])) {
        const line = src.slice(0, m.index).split('\n').length;
        hits.push({ file: rel(f), line, map: { up: m[1], down: m[2], flat: m[3] } });
      }
    }
  }
  return hits;
}

/* ── ④ 种子库（自定锚点；每日四餐各一条，让餐别 5 条词也有数据） ── */

function seedDb(dir) {
  const { openDb } = globalThis.__t618rOpen;
  const db = openDb(join(dir, 'calorie_data.db'));
  db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 60, 2000)').run();
  const ins = db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  /** 窗首末日刻意错开：7d／上周／上月首 < 末 ⇒ 上升；30d／本月／本周首 > 末 ⇒ 下降；今日／昨日／自定窗 ⇒ 持平。 */
  const over = {
    '2026-09-01': 900, '2026-09-16': 1500, '2026-09-30': 1500, '2026-10-05': 1100,
    '2026-10-09': 1000, '2026-10-11': 1600, '2026-10-12': 1300, '2026-10-15': 1200,
  };
  for (let t = Date.UTC(2026, 8, 1); t <= Date.UTC(2026, 9, 15); t += 86400000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const total = over[date] ?? 1200;
    const split = [['08:00:00', Math.round(total * 0.25)], ['12:30:00', Math.round(total * 0.34)],
      ['15:30:00', Math.round(total * 0.20)]];
    let used = 0;
    for (const [time, cal] of split) { ins.run(date, time, '复核样例', 200, cal, 10, 60, 5, ''); used += cal; }
    ins.run(date, '19:00:00', '复核样例', 200, total - used, 10, 60, 5, '');
  }
  db.close();
}

/* ── ⑤ run 模式 ── */

function runMode(outDir) {
  const rows = dietRoutes();
  const pages = rows.filter((r) => r.word !== null);
  console.log('READING #618r 路由源件命中 calorie.view.diet：行=' + rows.length + ' 可跑=' + pages.length
    + ' 文件=' + [...new Set(rows.map((r) => r.file))].join('、'));
  const words = pages.map((r) => r.word);
  const missing = TICKET_WORDS.filter((w) => !words.includes(w));
  const problems = [];
  if (missing.length > 0) problems.push('路由表里找不到票面点名的窗口词：' + missing.join('、'));

  mkdirSync(outDir, { recursive: true });
  const dir = mkdtempSync(join(tmpdir(), 't618r-'));
  seedDb(dir);

  let green = 0;
  const verdicts = new Set();
  let noCard = 0;
  for (const r of pages) {
    const { key, params } = paramsOf(r.cli);
    const out = join(outDir, r.word.replace(/[^\w\u4e00-\u9fa5]+/g, '-') + '.html');
    const res = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params), '--html', out],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: TODAY } });
    const reds = [];
    if (res.status !== 0) reds.push('exit=' + res.status + ' stderr=' + String(res.stderr).slice(-160));
    else {
      const html = readFileSync(out, 'utf8');
      if (!html.startsWith('<!doctype html>')) reds.push('产物不是完整文档');
      const text = myVisible(html);
      const bare = [...text.matchAll(BARE_RE)].map((m) => m[0]);
      if (bare.length > 0) reds.push('可见文本有裸英文判语：' + [...new Set(bare)].join('、'));
      const span = trendCardSpan(html);
      /* 页族三分支：窗口/今日词＝带趋势卡的列表页；`entry` 词＝总览页；`meal` 词＝餐别页。
         只有第一种该有「趋势」卡——拿参数位判，不写死词表。 */
      const expectCard = params.entry === undefined && params.meal === undefined;
      if (expectCard && span === null) reds.push('列表页找不到「趋势」卡的值槽');
      if (!expectCard && span !== null) reds.push('非列表页（entry／meal 支）竟然也有「趋势」卡');
      if (span !== null) {
        if (!ZH_VERDICTS.includes(span.raw)) reds.push('「趋势」卡的值不是中文判语：' + JSON.stringify(span.raw));
        else verdicts.add(span.raw);
        if (!expectCard) noCard += 0;
      } else noCard += 1;
      console.log('READING #618r word=' + r.word + ' 路由=' + r.file + ' 窗口=' + JSON.stringify(params)
        + ' exit=0 趋势卡=' + JSON.stringify(span === null ? null : span.raw) + ' 裸英文=' + bare.length
        + ' 可见文本段=' + text.split('\n').length + ' sha=' + sha16(html));
    }
    if (reds.length > 0) { problems.push(r.word + '：' + reds.join('｜')); console.log('RED #618r ' + r.word + '：' + reds.join('｜')); }
    else green += 1;
  }

  /* 静态契约①：数据层声明域逐档都有中文判语。 */
  const unionLine = /trend:\s*((?:'[a-z]+'\s*\|\s*)+'[a-z]+')/.exec(readFileSync(TREND_SRC, 'utf8'));
  if (unionLine === null) problems.push('读不到数据层声明域（analysis/trend.ts 的 trend 联合）');
  const union = unionLine === null ? [] : [...unionLine[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  const mapSrc = readFileSync(DIETDOC_SRC, 'utf8');
  const zhTable = zhTrendTables([DIETDOC_SRC])[0];
  const mapped = zhTable === undefined ? {} : zhTable.map;
  const unmapped = union.filter((u) => !(u in mapped));
  console.log('READING #618r 静态契约① 数据层声明域=[' + union.join(',') + '] 页面侧映射键=[' + Object.keys(mapped).join(',')
    + '] 定义处=' + (zhTable === undefined ? '未找到' : zhTable.file + ':' + zhTable.line) + ' 缺档=' + (unmapped.join('、') || '无'));
  if (unmapped.length > 0) problems.push('声明域里有档没中文判语：' + unmapped.join('、'));

  /* 静态契约②：同族（dietDocs 的导入闭包）里中文判语表只许一份。 */
  const family = [...closureOf(DIETDOC_SRC)].filter((f) => f.endsWith('.ts'));
  const tables = zhTrendTables(family);
  console.log('READING #618r 静态契约② 同族文件=' + family.length + ' 命中中文判语表=' + tables.length
    + '（' + tables.map((t) => t.file + ':' + t.line).join('、') + '）');
  if (tables.length !== 1) problems.push('同族里中文判语表不是一份：' + tables.map((t) => t.file).join('、'));

  /* 静态契约③：证据件点名的「遗留出口」（`renderDietHtml` 那张同枚举的「趋势」卡）在当刻构建里通不通得到。
     看的是**运行时代码**（先剥注释）里的**调用点**，不是再导出、也不是注释里的提及。 */
  const reach = closureOf(CLI_ENTRY);
  const deComment = (f) => readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const callers = [...reach].filter((f) => f !== HTML_SRC && /render(?:Diet|Goal|Exercise)Html\s*\(/.test(deComment(f))).map(rel);
  const tested = readdirSync(join(PKG, 'test')).filter((f) => f.endsWith('.mjs'))
    .filter((f) => /render(?:Diet|Goal|Exercise)Html\s*\(/.test(deComment(join(PKG, 'test', f))));
  console.log('READING #618r 静态契约③ 遗留出口 ' + rel(HTML_SRC) + ' 在 cmd_read 导入闭包内=' + (reach.has(HTML_SRC) ? '是' : '否')
    + '（同件还有 renderPlanHtml／renderErrorHtml 等在用的函数）；三个 render*Html 的运行期调用点='
    + (callers.length === 0 ? '闭包内无' : callers.join('、'))
    + '；测试件直调=' + (tested.length === 0 ? '无' : tested.join('、')) + '（闭包件数=' + reach.size + '）');

  console.log('READING #618r 三档判语命中＝' + [...verdicts].sort().join('／') + '（共 ' + verdicts.size + ' 档）；无卡页=' + noCard);
  if (verdicts.size !== 3) problems.push('三档没有全命中（实际 ' + verdicts.size + ' 档）——探针可能空转');
  console.log('RESULT #618r 真出口页 ' + green + '/' + pages.length + ' 绿（独立抽取：可见文本裸英文 0 且趋势卡中文）');
  if (problems.length > 0) { console.log('FAIL #618r 问题 ' + problems.length + ' 条'); process.exit(1); }
  console.log('PASS #618r');
  process.exit(0);
}

/* ── ⑥ compare 模式：新旧产物逐字节对照 ── */

function diffRuns(a, b) {
  const runs = [];
  const n = Math.max(a.length, b.length);
  let i = 0;
  while (i < n) {
    if (a[i] === b[i]) { i++; continue; }
    const start = i;
    while (i < n && a[i] !== b[i] && i - start < 4000) i++;
    runs.push({ at: start, a: a.slice(start, Math.min(i, start + 120)), b: b.slice(start, Math.min(i, start + 120)) });
  }
  return runs;
}

function compareMode(oldDir, newDir) {
  const files = readdirSync(newDir).filter((f) => f.endsWith('.html')).sort();
  let same = 0; let cardOnly = 0; let payloadOnly = 0; const escaped = []; const missing = [];
  for (const f of files) {
    const pNew = join(newDir, f); const pOld = join(oldDir, f);
    if (!existsSync(pOld)) { missing.push(f); continue; }
    const b = readFileSync(pNew, 'utf8'); const a = readFileSync(pOld, 'utf8');
    const sa = trendCardSpan(a); const sb = trendCardSpan(b);
    const na = norm(a); const nb = norm(b);
    const cardText = '趋势卡值 旧=' + JSON.stringify(sa === null ? null : sa.raw) + ' 新=' + JSON.stringify(sb === null ? null : sb.raw);
    if (na === nb) {
      if (sa !== null && sb !== null) {
        cardOnly += 1;
        console.log('READING #618r compare file=' + f + ' 差异只落趋势卡值位（' + cardText + '；页面其余部分归一后逐字节相同）');
      } else if (a === b) {
        same += 1; console.log('READING #618r compare file=' + f + ' 逐字节相同（本页无趋势卡）');
      } else {
        payloadOnly += 1;
        console.log('READING #618r compare file=' + f + ' 无趋势卡，差异只在复制载荷（每次运行的生成时刻，非本票内容）');
      }
    } else {
      const runs = diffRuns(na, nb);
      escaped.push(f);
      console.log('RED #618r compare file=' + f + ' 卡外另有差异 差异段=' + runs.length
        + ' 首段@p' + (runs[0] === undefined ? '-' : runs[0].at)
        + ' 旧=' + JSON.stringify(runs[0] === undefined ? '' : runs[0].a)
        + ' 新=' + JSON.stringify(runs[0] === undefined ? '' : runs[0].b));
    }
  }
  console.log('RESULT #618r 新旧对照 页数=' + files.length + ' 卡值差异=' + cardOnly + '（列表页） 只载荷差异=' + payloadOnly
    + '（无卡页，生成时刻所致） 逐字节相同=' + same + ' 卡外也有差异=' + escaped.length
    + (escaped.length === 0 ? '' : '（' + escaped.join('、') + '）')
    + ' 缺对页=' + (missing.length === 0 ? '无' : missing.join('、')));
  if (escaped.length > 0 || missing.length > 0) { console.log('FAIL #618r'); process.exit(1); }
  console.log('PASS #618r 全部差异都落在「趋势」卡的值位（页面其余部分 ＋ 复制载荷归一后逐字节相同）');
  process.exit(0);
}

/* ── 入口 ── */

const [mode, ...rest] = process.argv.slice(2);
const { openDb } = await import(pathToFileURL(join(PKG, 'dist', 'index.js')).href);
globalThis.__t618rOpen = { openDb };
if (mode === 'run') runMode(rest[0] ?? join(ROOT, '.scratch', 't618r', 'out'));
else if (mode === 'compare') compareMode(rest[0], rest[1]);
else { console.log('用法：run <outDir> ｜ compare <oldDir> <newDir>'); process.exit(2); }
