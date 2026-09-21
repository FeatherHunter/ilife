#!/usr/bin/env node
/** #867 · facts.json 装配器（读数链的唯一出口）。
 *
 *  做的事：把**页群目录 ＋ 人核档**装配成判分引擎吃的那一份 `facts.json`，并把四件读数收齐：
 *    ① 六列 DOM 事实 ← `t867-dom-probe.mjs`（同目录姊妹件，本件 import 它，不重写口径）；
 *    ② `dupFacts`／`english`／`d1`／`d2`（`d4cut` 可选）← 人核档，**逐列带出处**；
 *    ③ `sep.json`／`resp.json`／`fmt.json` 三件 ← 三件既有 reader（**一行语义不动**）。
 *  三件缺件时本件**按下面写死的命令形态现产**；已有则只校不产（`--no-readers` 可禁掉现产）。
 *
 *  四件读数的形状**只写一处**：`docs/base/base-render/t867-读数链契约.md`。本件的契约自检逐条对着它写，
 *  自检红即点名到「文件＋字段＋页＋处」。
 *
 *  用法（仓根）：
 *    node docs/skills/skill-memo-ilife/t867-facts.mjs --dir <页群目录> --human <人核档> --json <facts.json 落点>
 *        [--readings <读数目录>] [--no-readers] [--widths 390,768,1440]
 *
 *  默认：**读数目录＝`--json` 落点的所在目录**（四件同住一处，判分引擎按这个约定读）。
 *  退出码：0＝四件齐且页对齐（摘要行给「四件读数齐 ＋ 页键 N」）；1＝有缺件／缺列／页对不上／契约自检红
 *  （逐条点名）；2＝用法错或 reader 基础设施失败（缺浏览器、参数错）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pageKeyOf, probeDir } from './t867-dom-probe.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
/** 冻结：三档视口（判分引擎的触摸档只看 390／768，D5 字号看 390）。 */
export const DEFAULT_WIDTHS = Object.freeze([390, 768, 1440]);
/** 人核档的必填四列 ＋ 一个可选列（判分引擎的人核位 `d4cut`，缺省 0）。 */
export const HUMAN_COLUMNS = Object.freeze(['english', 'dupFacts', 'd1', 'd2']);
export const HUMAN_OPTIONAL = Object.freeze(['d4cut']);
/** 两列是「机器候选 ＋ 人核判分」：判＝采纳候选／改判（改判必须写理由）。 */
const CANDIDATE_COLUMNS = Object.freeze(['english', 'dupFacts']);
/** `sep.json` 的 tags 闭集（R1–R7 的语义见契约件 §一）。 */
const TAGS = Object.freeze(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']);

/** 三件既有 reader 的命令形态（缺件时照这个现产；`{pages}`／`{out}` ／`{widths}` 由本件填）。 */
const READERS = Object.freeze([
  {
    out: 'sep.json',
    argv: (pages, out) => ['packages/skill-calorie/scripts/audit-separators.mjs', '--dir', pages, '--json', out, '--quiet'],
    how: 'node packages/skill-calorie/scripts/audit-separators.mjs --dir <页群目录> --json <读数目录>/sep.json --quiet',
  },
  {
    out: 'resp.json',
    argv: (pages, out, widths) => ['packages/skill-calorie/scripts/measure-responsive.mjs',
      '--dir', pages, '--widths', widths.join(','), '--json', out, '--label', 't867'],
    how: 'node packages/skill-calorie/scripts/measure-responsive.mjs --dir <页群目录> --widths <档> --json <读数目录>/resp.json --label t867',
  },
  {
    out: 'fmt.json',
    argv: (pages, out, widths) => ['docs/skills/skill-calorie/t516-判据-版式.mjs',
      '--dir', pages, '--widths', widths.join(','), '--json', out],
    how: 'node docs/skills/skill-calorie/t516-判据-版式.mjs --dir <页群目录> --widths <档> --json <读数目录>/fmt.json',
  },
]);

export class Abort extends Error {}

/* ── 参数 ──────────────────────────────────────────────────────────────── */
function argOf(argv, name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}

export function parseArgs(argv) {
  for (const flag of ['--dir', '--human', '--json', '--readings', '--widths']) {
    if (argv.filter((a) => a === flag).length > 1) throw new Abort('同一个开关写了两次：' + flag + '（首见并不优先，直接算用法错）');
  }
  const dir = argOf(argv, '--dir', '');
  const human = argOf(argv, '--human', '');
  const json = argOf(argv, '--json', '');
  const readings = argOf(argv, '--readings', json === '' ? '' : dirname(resolve(json)));
  const widths = argOf(argv, '--widths', DEFAULT_WIDTHS.join(',')).split(',').filter((s) => s !== '').map(Number);
  if (dir === '' || human === '' || json === '') {
    throw new Abort('用法: node docs/skills/skill-memo-ilife/t867-facts.mjs --dir <页群目录> --human <人核档> --json <落点>'
      + ' [--readings <读数目录>] [--no-readers] [--widths 390,768,1440]');
  }
  if (widths.length === 0 || widths.some((w) => !Number.isFinite(w))) throw new Abort('--widths 解析不出宽度：' + argOf(argv, '--widths', ''));
  for (const w of DEFAULT_WIDTHS) {
    if (!widths.includes(w)) throw new Abort('--widths 少了判据档 ' + w + '（四件读数按三档 390／768／1440 出；少了档下游判分引擎吃不了）');
  }
  return {
    dir: resolve(dir), human: resolve(human), json: resolve(json),
    readings: readings === '' ? dirname(resolve(json)) : resolve(readings),
    widths, runReaders: !argv.includes('--no-readers'),
  };
}

/* ── 人核档解析（格式见契约件 §五）──────────────────────────────────────── */
/** 一条 `- 列 = 数值 ｜ 判=… ｜ 出处=… ｜ 理由=…`。 */
const COLUMN_LINE = /^-\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*(.*)$/;

/** 解析人核档。重复（同一页两次、同一页同一列两次）与不认识的列名都记进 `bugs`／`warnings`，不抛异常——
 *  它们是**输入数据**的问题（exit 1 并点名），不是用法错（exit 2）。 */
export function parseHuman(text, bugs = []) {
  const pages = {};
  const warnings = [];
  let page = null;
  for (const raw of text.split(/\r?\n/)) {
    const head = raw.match(/^###\s+(.+?)\s*$/);
    if (head) {
      page = head[1];
      if (pages[page] !== undefined) bugs.push('人核档里同一页出现两次（`### ' + page + '`）');
      else pages[page] = {};
      continue;
    }
    const line = raw.match(COLUMN_LINE);
    if (!line) continue;
    if (page === null) { warnings.push('人核档里有一行列在 `### 页` 之前（已忽略）：' + raw.trim()); continue; }
    const [, name, value, rest] = line;
    if (!HUMAN_COLUMNS.includes(name) && !HUMAN_OPTIONAL.includes(name)) {
      warnings.push('人核档里出现不在契约里的列名（已忽略，请查用词）：' + name + '（页 ' + page + '）');
      continue;
    }
    if (pages[page][name] !== undefined) { bugs.push('人核档里同一页同一列写了两次：' + name + '（页 ' + page + '）'); continue; }
    const fields = {};
    for (const part of rest.split('｜')) {
      const kv = part.match(/^\s*([^=]+?)\s*=\s*(.*?)\s*$/);
      if (kv) fields[kv[1].trim()] = kv[2];
    }
    pages[page][name] = { value: Number(value), fields };
  }
  return { pages, warnings };
}

const citedNodes = (text) => [...String(text).matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
const citedLines = (text) => [...String(text).matchAll(/L(\d+)/g)].map((m) => Number(m[1]));

/** 四列逐列判：缺列／数值／出处（两种写法分流）／机器候选对账（改名＝改契约）。 */
function judgeColumns(key, cols, cand, totalLines, bugs) {
  for (const name of HUMAN_COLUMNS) {
    const c = cols[name];
    if (c === undefined) { bugs.push('缺列 ' + name + '（页 ' + key + '）'); continue; }
    if (!Number.isFinite(c.value) || c.value < 0) { bugs.push('列 ' + name + ' 取值不是非负数（页 ' + key + '）'); continue; }
    const where = (c.fields['出处'] ?? '').trim();
    const why = (c.fields['理由'] ?? '').trim();
    if (where === '' || where === '—') { bugs.push('列 ' + name + ' 没有出处（页 ' + key + '）'); continue; }
    const staticMode = where.startsWith('静态');
    if (!staticMode && !where.startsWith('渲染后')) {
      bugs.push('列 ' + name + ' 的出处要以「静态」或「渲染后」开头（页 ' + key + '，现写「' + where.slice(0, 20) + '…」）');
      continue;
    }
    for (const n of citedLines(where)) {
      if (n > totalLines) bugs.push('列 ' + name + ' 的出处引 L' + n + '，超过该页源文件行数 ' + totalLines + '（页 ' + key + '）');
    }
    if (CANDIDATE_COLUMNS.includes(name)) {
      const verdict = (c.fields['判'] ?? '').trim();
      if (verdict !== '采纳候选' && verdict !== '改判') {
        bugs.push('列 ' + name + ' 的「判」只能是「采纳候选」或「改判」（页 ' + key + '，现写「' + verdict + '」）');
        continue;
      }
      if (verdict === '采纳候选' && c.value !== cand[name]) {
        bugs.push('列 ' + name + ' 判「采纳候选」但取值 ' + c.value + ' ≠ 机器候选 ' + cand[name] + '（页 ' + key + '）；不同就写「改判」并给理由');
      }
      if (verdict === '改判' && c.value === cand[name]) {
        bugs.push('列 ' + name + ' 判「改判」但取值与机器候选同为 ' + cand[name] + '（页 ' + key + '）；取值相同就写「采纳候选」');
      }
      if (verdict === '改判' && why === '') bugs.push('列 ' + name + ' 判「改判」但没写理由（页 ' + key + '）');
      if (!staticMode && verdict !== '改判') {
        bugs.push('列 ' + name + ' 的出处写「渲染后」，但「判」不是「改判」（页 ' + key + '）；渲染后口径只在静态候选覆盖不了时用');
      }
      if (staticMode && c.value > 0) {
        const nodes = citedNodes(where);
        if (nodes.length === 0) bugs.push('列 ' + name + ' 取值 ' + c.value + ' 但静态出处没点处（要写 `#节点号`；页 ' + key + '）');
        const allowed = new Set(cand.nodes[name] ?? []);
        for (const n of nodes) {
          if (!allowed.has(n)) bugs.push('列 ' + name + ' 的出处引 #' + n + '，但它不在机器候选里（页 ' + key + '；候选节点号 ' + [...allowed].join('/') + '）');
        }
      }
    } else if (c.value > 0 && why === '') {
      bugs.push('列 ' + name + ' 扣了 ' + c.value + ' 分但没写理由（页 ' + key + '）；扣分逐条带理由（基准 §4.2）');
    }
  }
  // 可选列：写了就照 d1／d2 的规矩判。
  for (const name of HUMAN_OPTIONAL) {
    const c = cols[name];
    if (c === undefined) continue;
    if (!Number.isFinite(c.value) || c.value < 0) bugs.push('列 ' + name + ' 取值不是非负数（页 ' + key + '）');
    else if (c.value > 0 && (c.fields['理由'] ?? '').trim() === '') bugs.push('列 ' + name + ' 扣了 ' + c.value + ' 分但没写理由（页 ' + key + '）');
  }
}

/* ── 四件读数：缺则产、在则校 ──────────────────────────────────────────── */
function producedByReader(spec, args, log) {
  const outAbs = join(args.readings, spec.out);
  const argv = spec.argv(args.dir, outAbs, args.widths);
  const script = resolve(ROOT, argv[0]);
  log('READER-PRODUCE ' + spec.out + ' :: ' + spec.how);
  const got = spawnSync(process.execPath, [script, ...argv.slice(1)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tail = String(got.stdout ?? '').trim().split(/\r?\n/).slice(-3).join(' ／ ');
  log('READER-EXIT ' + spec.out + ' exit=' + got.status + (tail === '' ? '' : ' :: ' + tail));
  if (got.error) throw new Abort(spec.out + ' 起不来：' + got.error.message);
  if (got.status === 2) throw new Abort(spec.out + ' 的基础设施失败（exit 2，缺浏览器或参数错）⇒ 四件读数收不齐');
  if (!existsSync(outAbs)) throw new Abort(spec.out + ' 没落盘（reader exit=' + got.status + '）');
}

/** 契约自检：逐件对 `docs/base/base-render/t867-读数链契约.md` 的字段表核，红即点名。 */
export function checkReadings(readingsDir, pageFiles, widths, bugs) {
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  const readJson = (file) => {
    try {
      return JSON.parse(readFileSync(join(readingsDir, file), 'utf8'));
    } catch (err) {
      bugs.push(file + ' 读不出来（' + err.message + '）');
      return null;
    }
  };

  // ① sep.json（R1–R7 的 tags 语义在闭集里；计数器与逐处明细必须对得上）
  const sep = readJson('sep.json');
  if (sep) {
    if (!Array.isArray(sep.rows)) bugs.push('sep.json 缺 `rows` 数组（契约 §一）');
    else for (const row of sep.rows) {
      const where = 'sep.json ' + row.name;
      if (typeof row.name !== 'string') { bugs.push('sep.json 有行没有 `name`'); continue; }
      for (const zone of ['line', 'node']) {
        const z = row[zone];
        if (!z || !Array.isArray(z.hits)) { bugs.push(where + ' 缺 `' + zone + '.hits`（契约 §一）'); continue; }
        let k = 0;
        for (const hit of z.hits) {
          k += 1;
          if (!Array.isArray(hit.tags) || hit.tags.length === 0) { bugs.push(where + ' 的 ' + zone + '.hits[' + k + '].tags 不是非空数组'); continue; }
          for (const t of hit.tags) {
            if (!TAGS.includes(t)) bugs.push(where + ' 的 ' + zone + '.hits[' + k + '].tags 取到不在闭集里的值「' + t + '」（契约 §一：R1–R7）');
          }
        }
        for (const t of TAGS) {
          const n = z.hits.filter((h) => Array.isArray(h.tags) && h.tags.includes(t)).length;
          if (z[t] !== n) bugs.push(where + ' 的 ' + zone + '.' + t + '=' + z[t] + ' 与逐处明细对不上（应为 ' + n + '）');
        }
      }
    }
  }

  // ② resp.json（三档溢出格）
  const resp = readJson('resp.json');
  if (resp) {
    if (!Array.isArray(resp.rows)) bugs.push('resp.json 缺 `rows` 数组（契约 §二）');
    else for (const row of resp.rows) {
      const where = 'resp.json ' + row.name;
      for (const w of widths) {
        const cell = row.widths ? row.widths[String(w)] : undefined;
        if (!cell) { bugs.push(where + ' 缺 ' + w + ' 档（契约 §二：三档 390／768／1440）'); continue; }
        if (!num(cell.overflow)) bugs.push(where + ' 的 ' + w + ' 档缺数值 `overflow`');
        else if (num(cell.docScrollWidth) && num(cell.innerWidth) && cell.overflow !== cell.docScrollWidth - cell.innerWidth) {
          bugs.push(where + ' 的 ' + w + ' 档 `overflow` 与 `docScrollWidth − innerWidth` 对不上');
        }
        if (typeof cell.why !== 'string') bugs.push(where + ' 的 ' + w + ' 档缺 `why`');
        else if (cell.ok !== (cell.why === '')) bugs.push(where + ' 的 ' + w + ' 档 `ok` 与 `why` 对不上');
      }
    }
  }

  // ③ fmt.json（三档触摸处数 ＋ 最小字号）
  const fmt = readJson('fmt.json');
  if (fmt) {
    if (!Array.isArray(fmt.rows)) bugs.push('fmt.json 缺 `rows` 数组（契约 §三）');
    else for (const row of fmt.rows) {
      const where = 'fmt.json ' + row.name;
      for (const w of widths) {
        const cell = row.widths ? row.widths[String(w)] : undefined;
        if (!cell) { bugs.push(where + ' 缺 ' + w + ' 档（契约 §三：三档触摸处数）'); continue; }
        if (!num(cell.touchSmall)) bugs.push(where + ' 的 ' + w + ' 档缺数值 `touchSmall`');
        else if (Array.isArray(cell.touchSmallList) && cell.touchSmall < cell.touchSmallList.length) {
          bugs.push(where + ' 的 ' + w + ' 档 `touchSmall` 小于 `touchSmallList` 长度（读数自相矛盾）');
        }
        if (cell.minFontPxNoSvg !== null && !num(cell.minFontPxNoSvg)) bugs.push(where + ' 的 ' + w + ' 档缺 `minFontPxNoSvg`');
      }
    }
  }

  // ④ 三件的页覆盖必须＝页群里的产物（少一件、多一件都点名）
  const want = new Set(pageFiles);
  for (const [file, data] of [['sep.json', sep], ['resp.json', resp], ['fmt.json', fmt]]) {
    if (!data || !Array.isArray(data.rows)) continue;
    const got = new Set(data.rows.map((r) => r.name));
    for (const f of want) if (!got.has(f)) bugs.push(file + ' 里没有这一页的读数：' + f);
    for (const n of got) if (!want.has(n)) bugs.push(file + ' 里多出一页（页群里没有它）：' + n);
  }
}

/** 红的一跑：逐条点名 ＋ **不许留旧读数**（落点上若已有上一跑写的 facts.json，就地作废并点名——
 *  否则「四件照旧齐」的现场会让下游批处理静默拿旧读数出分）。 */
function failRun(args, bugs, log) {
  for (const b of bugs.slice(0, 12)) log('FAIL: ' + b);
  if (bugs.length > 12) log('FAIL: …另有 ' + (bugs.length - 12) + ' 条，见契约件 §六 的清单');
  if (existsSync(args.json)) {
    rmSync(args.json, { force: true });
    log('STALE-DROPPED ' + args.json + '（上一跑留下的 facts.json 与本跑不一致，已作废；下游只认 exit 0 的那一跑）');
  }
  return { ok: false, bugs, facts: null };
}

/* ── 主装配 ────────────────────────────────────────────────────────────── */
export function assemble(args, log = () => {}) {
  const bugs = [];
  if (!existsSync(args.dir) || !statSync(args.dir).isDirectory()) throw new Abort('页群目录不存在：' + args.dir);
  if (!existsSync(args.human)) throw new Abort('人核档不存在：' + args.human);
  const pageFiles = readdirSync(args.dir).filter((f) => f.toLowerCase().endsWith('.html')).sort();
  if (pageFiles.length === 0) throw new Abort('页群目录里没有 .html：' + args.dir);

  // 页键先算：撞车早报（不白跑两趟浏览器），并按契约 §六#8 点名是哪两个文件撞的。
  const byKey = {};
  for (const f of pageFiles) {
    const key = pageKeyOf(f);
    if (byKey[key] !== undefined) bugs.push('页键撞车（文件名主体重复）：' + key + '（' + byKey[key] + ' 与 ' + f + ' 撞同一个键）');
    else byKey[key] = f;
  }
  if (bugs.length > 0) return failRun(args, bugs, log);

  mkdirSync(args.readings, { recursive: true });
  mkdirSync(dirname(args.json), { recursive: true });

  const readers = {};
  for (const spec of READERS) {
    const outAbs = join(args.readings, spec.out);
    if (existsSync(outAbs)) { readers[spec.out] = 'reused'; log('READER-REUSE ' + spec.out); continue; }
    if (!args.runReaders) { readers[spec.out] = 'missing'; bugs.push('缺件 ' + spec.out + '（`--no-readers` 禁了现产）⇒ 现产命令：' + spec.how); continue; }
    producedByReader(spec, args, log);
    readers[spec.out] = 'produced';
  }
  checkReadings(args.readings, pageFiles, args.widths, bugs);

  const dom = probeDir(args.dir);
  const human = parseHuman(readFileSync(args.human, 'utf8'), bugs);
  for (const w of human.warnings) log('WARN ' + w);

  for (const key of Object.keys(byKey)) {
    if (human.pages[key] === undefined) bugs.push('人核档里没有这一页：' + key + '（页群目录里是 ' + byKey[key] + '）');
  }
  for (const key of Object.keys(human.pages)) {
    if (byKey[key] === undefined) bugs.push('缺产物 ' + key + '（人核档页单里有，页群目录里没有对应的 .html）');
  }

  const pages = {};
  for (const [key, file] of Object.entries(byKey)) {
    const domRow = dom.pages[key];
    const cols = human.pages[key];
    if (cols === undefined || domRow === undefined) continue;
    const cand = {
      english: domRow.candidates.english.hits,
      dupFacts: domRow.candidates.dupFacts.hits,
      nodes: {
        english: domRow.candidates.english.nodes.map((h) => h.n),
        dupFacts: [...new Set(domRow.candidates.dupFacts.kinds.flatMap((k) => k.nodes))],
      },
    };
    judgeColumns(key, cols, cand, domRow.totalLines, bugs);
    const pick = (name, dflt) => (cols[name] === undefined ? dflt : cols[name].value);
    pages[key] = {
      note: '真产物：' + file,
      file,
      bytes: domRow.bytes,
      totalLines: domRow.totalLines,
      visibleTextNodes: domRow.visibleTextNodes,
      tables: domRow.tables,
      imgTags: domRow.imgTags,
      tdDataLabel: domRow.tdDataLabel,
      tocEl: domRow.tocEl,
      aspectRatio: domRow.aspectRatio,
      scrollMargin: domRow.scrollMargin,
      dupFacts: pick('dupFacts', 0),
      english: pick('english', 0),
      d1: pick('d1', 0),
      d2: pick('d2', 0),
      d4cut: pick('d4cut', 0),
      judge: Object.fromEntries(HUMAN_COLUMNS.concat(HUMAN_OPTIONAL).filter((n) => cols[n] !== undefined).map((n) => [n, {
        value: cols[n].value, ...cols[n].fields, candidate: CANDIDATE_COLUMNS.includes(n) ? cand[n] : null,
      }])),
      candidates: {
        english: { hits: cand.english, nodes: domRow.candidates.english.nodes },
        dupFacts: { hits: cand.dupFacts, kinds: domRow.candidates.dupFacts.kinds },
      },
    };
  }

  const facts = {
    at: new Date().toISOString(),
    ticket: '#867 · 读数链（装配器 docs/skills/skill-memo-ilife/t867-facts.mjs；形状契约 docs/base/base-render/t867-读数链契约.md）',
    dir: args.readings,
    pagesDir: args.dir,
    human: args.human,
    widths: args.widths,
    readers,
    method: {
      domColumns: '六列取 t867-dom-probe.mjs 的冻结正则表（tables=<table\\b／imgTags=<img\\b／tdDataLabel=td[^>]*\\bdata-label=／tocEl=class="[^"]*\\bilife-block-toc\\b／aspectRatio=aspect-ratio／scrollMargin=scroll-margin-top），口径见契约 §四。',
      candidateColumns: 'english／dupFacts 由探针给**机器候选**（静态上界），人核判分写「采纳候选」或「改判＋理由」；改判要写清为什么（例如折叠态按基准 §4.7 记 0 处）。',
      humanColumns: 'd1／d2 是人核扣分位（基准 §4.2：逐条带理由），本链只收人核档写下的值；d4cut 是可选人核位（缺省 0）。',
    },
    pages,
  };

  if (bugs.length > 0) {
    for (const b of bugs.slice(0, 12)) log('FAIL: ' + b);
    if (bugs.length > 12) log('FAIL: …另有 ' + (bugs.length - 12) + ' 条，见契约件 §六 的清单');
    // 本跑红就不许留旧读数：落点上若已有上一跑写的 facts.json，就地作废并点名——
    // 否则「四件照旧齐」的现场会让下游（批处理的收口/引擎）静默拿旧读数出分。
    if (existsSync(args.json)) {
      rmSync(args.json, { force: true });
      log('STALE-DROPPED ' + args.json + '（上一跑留下的 facts.json 与本跑不一致，已作废；下游只认 exit 0 的那一跑）');
    }
    return { ok: false, bugs, facts };
  }
  writeFileSync(args.json, JSON.stringify(facts, null, 1), 'utf8');
  return { ok: true, bugs, facts };
}

/* ── 命令行 ────────────────────────────────────────────────────────────── */
const isMain = process.argv[1] && resolve(process.argv[1]).endsWith('t867-facts.mjs');
if (isMain) {
  const log = (m) => console.log(m);
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    log('RESULT: ABORT exit=2 :: ' + err.message);
    log('FAIL');
    process.exit(2);
  }
  let res;
  try {
    res = assemble(args, log);
  } catch (err) {
    log('RESULT: ABORT exit=' + (err instanceof Abort ? 2 : 1) + ' :: ' + err.message);
    log('FAIL');
    process.exit(err instanceof Abort ? 2 : 1);
  }
  if (!res.ok) {
    log('RESULT: ABORT exit=1 :: 读数链不齐，逐条见上面 FAIL 行（共 ' + res.bugs.length + ' 条）');
    log('FAIL');
    process.exit(1);
  }
  const keys = Object.keys(res.facts.pages);
  log('SUMMARY 页群=' + args.dir + ' 读数=' + args.readings + ' 人核档=' + args.human);
  log('SUMMARY 三件 reader：sep.json=' + res.facts.readers['sep.json'] + ' resp.json=' + res.facts.readers['resp.json'] + ' fmt.json=' + res.facts.readers['fmt.json']);
  for (const k of keys) {
    const p = res.facts.pages[k];
    log('PAGE ' + k + '  文件=' + p.file + '  DOM六列: tables=' + p.tables + ' imgTags=' + p.imgTags + ' tdDataLabel=' + p.tdDataLabel
      + ' tocEl=' + p.tocEl + ' aspectRatio=' + p.aspectRatio + ' scrollMargin=' + p.scrollMargin
      + '  人核四列: dupFacts=' + p.dupFacts + ' english=' + p.english + ' d1=' + p.d1 + ' d2=' + p.d2);
  }
  log('RESULT: 四件读数齐（sep.json＋resp.json＋fmt.json＋facts.json） 页键 ' + keys.length + '（页群产物 ' + keys.length + ' 件）');
  log('FACTS-WROTE ' + args.json);
  log('PASS');
  process.exit(0);
}
