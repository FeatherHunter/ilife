/** #313 B 段 · 路由生成器：声明层（编译后）→ `src/triggers/routes.generated.ts`。
 *
 * 读**编译后**的声明模块（各能力 `dist/<能力>/routes.js`），按 `list` 分组、
 * 按 `order` 升序排出三个列表与 `ALL_ROUTES`。跑法：
 *   - 单独跑：`node packages/skill-calorie/scripts/gen-routes.mjs`（本件自足，不依赖 `gen-cli.mjs`）；
 *   - 由 `scripts/gen-cli.mjs` 引：`pnpm gen` 写盘、`pnpm gen:check` 比对；声明源同时进内容印记
 *     （`routeDeclarationSources()`），否则「改了声明没 build」会被直接放行（假绿）。
 *
 * 两条纪律：
 *   ① 顺序事实只住声明的 `order` 字段——本件不含任何顺序知识，将来把记录换文件搬动也不打乱顺序；
 *   ② 守卫全在生成期抛（绝不产出半成品）：`(list, order)` 重复／同一 list 内 `order` 有空洞／
 *      `kind` 与字段不配套／同一 list 内同 `wakeWord` **跨件**重复／生成物与声明逐条不自洽。
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SRC_DIR = join(PKG_DIR, 'src');
const DIST_DIR = join(PKG_DIR, 'dist');
const REPO_ROOT = join(PKG_DIR, '..', '..');
const OUT = join(SRC_DIR, 'triggers', 'routes.generated.ts');

const LISTS = ['wake', 'new', 'repair'];
/** 三个列表的产物名与类型（`new`／`repair` 全是 exec，故标 `ExecWakeRoute[]`）。 */
const CONST_NAME = { wake: 'WAKE_ROUTES', new: 'NEW_KEY_ROUTES', repair: 'COVERAGE_REPAIR_ROUTES' };
const CONST_TYPE = { wake: 'readonly WakeRoute[]', new: 'readonly ExecWakeRoute[]', repair: 'readonly ExecWakeRoute[]' };
const EXEC_ONLY = new Set(['new', 'repair']);
const BUCKETS = new Set(['out-of-scope', 'legacy-chain']);
/** 记录字段的落笔顺序＝改造前手写记录的键序（对照物的 RECORD_SHAPES 面按此比对）。 */
const RECORD_FIELDS = {
  exec: ['wakeWord', 'scene', 'kind', 'key', 'cli'],
  'non-exec': ['wakeWord', 'scene', 'kind', 'bucket', 'reason'],
};

const rel = (p) => relative(REPO_ROOT, p).replace(/\\/g, '/');
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
/** 单引号字面量（与仓内既有生成器同款：先转义反斜杠，再转义单引号）。 */
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

/** 声明源清单：各能力 `src/<能力>/routes.ts`（#708 起这是**唯一**一处路由声明面——
 * 未搬迁清单的 `src/cli/legacy/routes/*.ts` 随容器退役，ADR-0002）。
 * 生成与内容印记共用这一份清单，不许各算一套。 */
export function routeDeclarationSources() {
  const out = [];
  for (const d of readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const p = join(SRC_DIR, d.name, 'routes.ts');
    if (existsSync(p)) out.push(p);
  }
  return out;
}

/** 源 → 它编译后的模块路径（一对一推导，与 `gen-cli.mjs` 的 `distOf` 同口径）。 */
function distOf(src) {
  return join(DIST_DIR, relative(SRC_DIR, src).replace(/\\/g, '/').replace(/\.ts$/, '.js'));
}

/** 读编译后的声明件：每件必须**恰好导出一个**声明数组。
 * #325 起导出给 `gen-cli.mjs` 的配对门复用：现场比对“源的事实 ↔ 编译的事实”必须读同一份加载逻辑，
 * 不许在检查侧另写一份（一个概念一个定义地）。 */
export async function loadDecls() {
  const decls = [];
  for (const src of routeDeclarationSources()) {
    const distPath = distOf(src);
    if (!existsSync(distPath)) {
      throw new Error('缺 ' + rel(distPath) + '（源：' + rel(src) + '）：生成器读编译后的声明模块，请先 `pnpm build`');
    }
    const mod = await import(pathToFileURL(distPath).href);
    const arrays = Object.entries(mod).filter(([, v]) => Array.isArray(v));
    if (arrays.length !== 1) {
      throw new Error(
        rel(src) + ' 必须恰好导出一个声明数组，实得 ' + arrays.length + ' 个（' +
          arrays.map(([k]) => k).join('／') + '）',
      );
    }
    const [exportName, list] = arrays[0];
    for (const r of list) decls.push({ ...r, __src: rel(src), __export: exportName });
  }
  if (!decls.length) throw new Error('一份路由声明都没读到：' + routeDeclarationSources().map(rel).join('／'));
  return decls;
}

/** 守卫 ＋ 分组：返回 `list → 按 order 升序的记录`。任何一条不成立即抛。 */
function groupDecls(decls) {
  const byList = new Map(LISTS.map((l) => [l, []]));
  const pairOwner = new Map();
  const wordFiles = new Map();
  for (const d of decls) {
    const where = d.__src + ' · ' + d.__export + ' · ' + JSON.stringify(d.wakeWord) + '（order=' + d.order + '）';
    if (!LISTS.includes(d.list)) throw new Error('list 只许 ' + LISTS.join('｜') + '，实得 ' + JSON.stringify(d.list) + '：' + where);
    if (!Number.isInteger(d.order) || d.order < 0) throw new Error('order 必须是 0 基整数：' + where);
    if (typeof d.wakeWord !== 'string' || d.wakeWord === '') throw new Error('wakeWord 必须是非空字符串：' + where);
    if (typeof d.scene !== 'string' || !/^(0[1-9]|10)$/.test(d.scene)) throw new Error('scene 必须是 01..10：' + where);
    if (d.kind === 'exec') {
      if (typeof d.key !== 'string' || d.key === '') throw new Error('kind:\'exec\' 缺 key：' + where);
      if (typeof d.cli !== 'string' || d.cli === '') throw new Error('kind:\'exec\' 缺 cli：' + where);
    } else if (d.kind === 'non-exec') {
      if (typeof d.bucket !== 'string' || !BUCKETS.has(d.bucket)) {
        throw new Error('kind:\'non-exec\' 的 bucket 只许 ' + [...BUCKETS].join('｜') + '：' + where);
      }
      if (typeof d.reason !== 'string' || d.reason === '') throw new Error('kind:\'non-exec\' 缺 reason：' + where);
    } else {
      throw new Error('kind 只许 exec｜non-exec，实得 ' + JSON.stringify(d.kind) + '：' + where);
    }
    const pair = d.list + '@' + d.order;
    if (pairOwner.has(pair)) {
      throw new Error('同一个 (list, order) 被声明两次：' + pair + ' ← ' + pairOwner.get(pair) + ' ／ ' + d.__src);
    }
    pairOwner.set(pair, d.__src);
    // **重复词组必须整组同迁**（同一 `wakeWord` 的多条记录留在同一件里）：同一件内的重复是冻结 SoT 的
    // 既成事实——如 `记身材照` 在 `list=wake` 内合法出现 3 次（order 250/251/252，同住
    // `src/photo/routes.ts`）——下面的守卫只拦「同一词组被拆到两件」；把一个词组搬散，
    // 判据不变、按整组搬即可（否则它会在这里假红）。
    const wordKey = d.list + '\u0000' + d.wakeWord;
    const files = wordFiles.get(wordKey) ?? new Set();
    if (files.size && !files.has(d.__src)) {
      throw new Error(
        '同一 list 内同 wakeWord 跨件重复（' + d.list + ' · ' + JSON.stringify(d.wakeWord) + '）：' +
          [...files].join('／') + ' ／ ' + d.__src +
          '——一条记录只许住一件声明（同一件内的重复是冻结 SoT 的既成事实，不判红）。',
      );
    }
    files.add(d.__src);
    wordFiles.set(wordKey, files);
    byList.get(d.list).push(d);
  }
  for (const list of LISTS) {
    const rows = byList.get(list);
    if (!rows.length) throw new Error('list=' + list + ' 一条声明都没有（漏条会留空洞，生成器不补）');
    if (EXEC_ONLY.has(list) && rows.some((r) => r.kind !== 'exec')) {
      throw new Error('list=' + list + ' 只许 exec 记录（产物标注为 ExecWakeRoute[]）');
    }
    rows.sort((a, b) => a.order - b.order);
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].order !== i) {
        throw new Error(
          'list=' + list + ' 的 order 不连续：第 ' + i + ' 位实得 ' + rows[i].order + '（' +
            rows[i].__src + ' · ' + JSON.stringify(rows[i].wakeWord) + '）——必须是 0..' + (rows.length - 1) + ' 连续无洞。',
        );
      }
    }
  }
  return byList;
}

/** 声明 → 运行时记录（只剩记录自己的字段，`list`／`order`／来源不进产物）。 */
function payloadOf(d) {
  const fields = RECORD_FIELDS[d.kind];
  const out = {};
  for (const f of fields) out[f] = d[f];
  return out;
}

function recordLine(d) {
  const payload = payloadOf(d);
  return '  { ' + Object.entries(payload).map(([k, v]) => k + ': ' + q(v)).join(', ') + ' },';
}

const DOC = {
  wake: (n) => n + ' 条 SoT 唤醒词路由（exec ／ non-exec 两种记录；顺序与 SoT 逐位对齐）',
  new: (n) => n + ' 条新拟入口（D-4：键内无同形入口的补入口，唤醒词新拟、不写入冻结表）',
  repair: (n) => n + ' 条覆盖修复入口（FX-81-5：键失去唯一可跑入口时补的单命令入口）',
};

/** 生成物与声明逐条自洽：条数、每列表的唤醒词序列、每条记录的字段集都对得上。 */
function assertSelfConsistent(decls, byList, text) {
  const lines = text.split('\n');
  const recordLines = lines.filter((l) => l.startsWith('  { wakeWord: '));
  if (recordLines.length !== decls.length) {
    throw new Error('自洽失败：产物记录行 ' + recordLines.length + ' ≠ 声明 ' + decls.length + ' 条');
  }
  const parseWord = (l) => {
    const m = /^ {2}\{ wakeWord: '((?:[^'\\]|\\.)*)'/.exec(l);
    if (!m) throw new Error('自洽失败：记录行认不出 wakeWord：' + l.slice(0, 80));
    return m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  };
  const want = LISTS.flatMap((list) => byList.get(list).map((d) => d.wakeWord)).join('\u0000');
  const got = recordLines.map(parseWord).join('\u0000');
  if (want !== got) throw new Error('自洽失败：产物的唤醒词序列与声明不一致（逐条顺序或内容对不上）');
  for (const list of LISTS) {
    const rows = byList.get(list);
    if (rows.length !== new Set(rows.map((r) => r.order)).size) throw new Error('自洽失败：list=' + list + ' 的 order 有重复');
    for (const r of rows) {
      const keys = Object.keys(payloadOf(r)).join(',');
      if (keys !== RECORD_FIELDS[r.kind].join(',')) throw new Error('自洽失败：记录字段对不上：' + keys);
    }
  }
}

/** 出声：整份 `routes.generated.ts` 的文本（纯函数，同一个声明层永远得同一份字节）。 */
export async function renderRoutesGenerated() {
  const decls = await loadDecls();
  const byList = groupDecls(decls);
  const out = [];
  out.push('/** ' + '本文件由 `scripts/gen-routes.mjs` 生成，勿手改（`pnpm gen` 重生成，`pnpm gen:check` 验真）。');
  out.push(' *');
  out.push(' * 权威是声明层：各能力 `src/<能力>/routes.ts`（一能力一件，一条命令一个定义地）。');
  out.push(' * 本件只做「按 `list` 分组、按 `order` 升序」的');
  out.push(' * 排序与拼接，不含任何顺序知识——顺序事实只住声明的 `order` 字段，换文件搬动不会打乱顺序。');
  out.push(
    ' * 本次生成：' + LISTS.map((l) => CONST_NAME[l] + ' ' + byList.get(l).length + ' 条').join(' ＋ ') +
      '，合计 ' + decls.length + ' 条（与声明逐条自洽：`pnpm gen:check` 验真）。',
  );
  out.push(' */');
  out.push("import type { ExecWakeRoute, WakeRoute } from './routeSpec.js';");
  for (const list of LISTS) {
    const rows = byList.get(list);
    out.push('');
    out.push('/** ' + DOC[list](rows.length) + ' */');
    out.push('export const ' + CONST_NAME[list] + ': ' + CONST_TYPE[list] + ' = [');
    for (const d of rows) out.push(recordLine(d));
    out.push('];');
  }
  out.push('');
  out.push(
    '/** 全量路由（' + byList.get('wake').length + ' 条 SoT ＋ ' + byList.get('new').length + ' 条新拟 ＋ ' +
      byList.get('repair').length + ' 条覆盖修复） */',
  );
  out.push('export const ALL_ROUTES: readonly WakeRoute[] = [...WAKE_ROUTES, ...NEW_KEY_ROUTES, ...COVERAGE_REPAIR_ROUTES];');
  const text = out.join('\n') + '\n';
  assertSelfConsistent(decls, byList, text);
  return text;
}

async function main() {
  const text = await renderRoutesGenerated();
  writeFileSync(OUT, text);
  console.log(
    'gen-routes 完成：' + rel(OUT) + ' 行数=' + text.split('\n').length + ' sha256=' + sha256(text) +
      '（声明件 ' + routeDeclarationSources().length + ' 个）',
  );
}

const RUN_AS_SCRIPT = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (RUN_AS_SCRIPT) await main();
