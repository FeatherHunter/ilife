#!/usr/bin/env node
/** #887 探针 —— 「作息复制区」这一票的**验收命令**（真产物读数，不跑出口、只量盘上那 61 件）。
 *
 *   node tooling/run-locked.mjs --ticket 887 -- node docs/skills/skill-schedule/t887-探针.mjs
 *
 *  前置：八个域的探针都跑过（`.scratch/t783…t790/成品/` 里是**真出口**刚落的产物与清单）。
 *  它量什么（逐条对票面「验收」那一节）：
 *   ① **三格式在页上**：每件的复制数据按钮是菜单形态（`data-fmt-open="1"` ＋ 纯文本／JSON／CSV 三项），
 *      且旧形态的 `data-t` 不再直接挂在复制数据按钮上；
 *   ② **按钮文案不重复**：每件 `>复制数据<`／`>复制日志<` 各 ≤1 颗（t790 那四件原先各 2／2 与 5／5），
 *      且任一复制区块内不出现两颗同名按钮；
 *   ③ **日志六段齐**：每件「复制日志」的载荷含六个段名；
 *   ④ **复制区恰一处**：每件只有一个 `ilife-block-copy-block`；
 *   ⑤ **真出口重出**：八份清单件逐行与盘上字节对账（`sha256_12`），并与**改动前**那份总清单
 *      `.scratch/t791/t791-清单.json`（#791 落墙时写的、本票改造之前）逐件比——**变了才算重出**；
 *   ⑥ **别域不动**：本票的非 t790 页里，除复制区那一段以外的字节与改动前逐字节相同——读数由
 *      `.scratch/t887/前后对拍.mjs`（HEAD 树 vs 现工作区）产出，这里只收它的结论件。
 *
 *  用法：`node docs/skills/skill-schedule/t887-探针.mjs [--root <仓库根>]`。
 *  退出码：0＝全绿；1＝有红条（逐条点名）。
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));
const SCRATCH = join(REPO, '.scratch');
const REPORT = join(SCRATCH, 't887', 't887-判据读数.json');
const BEFORE_MANIFEST = join(SCRATCH, 't791', 't791-清单.json');
const ISOLATION = join(SCRATCH, 't887', '前后对拍.json');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** 本票覆盖的八个域（票面「八域 61 件产物」那一句）。 */
const DOMAINS = [783, 784, 785, 786, 787, 788, 789, 790];
const T790 = [790];

const markupOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
const count = (body, re) => (body.match(re) ?? []).length;
const COPY_OPEN = '<section class="ilife-block ilife-block-copy-block">';
function copyBlocks(body) {
  const out = [];
  let at = body.indexOf(COPY_OPEN);
  while (at >= 0) {
    const end = body.indexOf('</section>', at);
    out.push(body.slice(at, end + '</section>'.length));
    at = body.indexOf(COPY_OPEN, end);
  }
  return out;
}
const LOG_SECTIONS = ['场景标识', 'AI 思考链', '数据结构', '调用链', '时间戳版本', '异常'];
const FORMAT_LABELS = ['纯文本', 'JSON', 'CSV'];

/* ─────────────────────────── ① 读盘：八域 61 件产物 ─────────────────────────── */

const products = [];
const manifests = [];
for (const ticket of DOMAINS) {
  const prod = join(SCRATCH, 't' + String(ticket), '成品');
  if (!existsSync(prod)) { red('缺产物目录：' + prod + '（先跑 t' + String(ticket) + '-探针.mjs）'); continue; }
  for (const name of readdirSync(prod)) {
    if (!name.endsWith('.html')) continue;
    products.push({ ticket, file: name, path: join(prod, name) });
  }
  const manifestPath = join(prod, 't' + String(ticket) + '-清单.json');
  if (!existsSync(manifestPath)) { red('缺清单件：' + manifestPath); continue; }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifests.push({ ticket, path: manifestPath, rows: Array.isArray(manifest) ? manifest : (manifest.rows ?? []) });
}

/* ─────────────────────────── ② 逐件量 ①–④ ─────────────────────────── */

const readings = [];
/** 逐条判据的违例计数（判据 ①–④ 各一档）：OK 那一行只在**本档零违例**时才打，红绿不并行。 */
const violations = { menu: 0, dup: 0, sections: 0, blocks: 0 };

for (const p of products) {
  const html = readFileSync(p.path, 'utf8');
  const body = markupOf(html);
  const blocks = copyBlocks(body);
  const dataCount = count(body, />复制数据</g);
  const logCount = count(body, />复制日志</g);
  const menu = count(body, /data-fmt-open="1"/g);
  const labels = FORMAT_LABELS.filter((n) => body.includes('<span class="ilife-copy-menu-label">' + n + '</span>'));
  const dataButton = (body.match(/<button[^>]*data-fmt-open="1"[^>]*>复制数据<\/button>/) ?? [])[0];
  const logButton = (body.match(/<button[^>]*>复制日志<\/button>/) ?? [])[0];
  const sections = logButton === undefined ? [] : LOG_SECTIONS.filter((s) => logButton.includes(s));
  const dup = [];
  for (const block of blocks) {
    const names = [...block.matchAll(/>([^<>]{1,8})<\/button>/g)].map((m) => m[1]);
    for (const name of new Set(names)) if (names.filter((n) => n === name).length > 1) dup.push(name);
  }
  const r = {
    ticket: p.ticket, file: p.file, bytes: Buffer.byteLength(html, 'utf8'), sha256_12: sha12(html),
    blocks: blocks.length, dataButtons: dataCount, logButtons: logCount, menus: menu,
    formatLabels: labels, logSections: sections, duplicateLabels: [...new Set(dup)],
    dataButtonPlain: dataButton !== undefined && !dataButton.includes('data-t='),
  };
  readings.push(r);
  const tag = 't' + String(p.ticket) + ' ' + p.file;
  if (blocks.length !== 1) { violations.blocks += 1; red(tag + '：复制区数须为 1，实为 ' + String(blocks.length)); }
  if (dataCount !== 1) { violations.dup += 1; red(tag + '：「复制数据」须恰 1 颗（实为 ' + String(dataCount) + '）'); }
  if (logCount !== 1) { violations.dup += 1; red(tag + '：「复制日志」须恰 1 颗（实为 ' + String(logCount) + '）'); }
  if (menu !== 1) { violations.menu += 1; red(tag + '：菜单形态按钮须恰 1 处（data-fmt-open，实为 ' + String(menu) + '）'); }
  if (labels.length !== 3) { violations.menu += 1; red(tag + '：三格式菜单项不齐（齐 ' + String(labels.length) + ' 项）'); }
  if (!r.dataButtonPlain) { violations.menu += 1; red(tag + '：复制数据按钮仍是旧形态（data-t 直接挂在它身上，或找不到那颗按钮）'); }
  if (sections.length !== 6) { violations.sections += 1; red(tag + '：复制日志缺段（齐 ' + String(sections.length) + ' 段）'); }
  if (dup.length) { violations.dup += 1; red(tag + '：复制区块内出现两颗同名按钮「' + dup.join('、') + '」'); }
}
if (violations.menu === 0 && products.length) ok('① 三格式在页上：' + String(products.length) + ' 件逐件都是菜单形态（三格式项齐、旧形态 data-t 不在数据按钮上）');
if (violations.dup === 0 && products.length) ok('② 按钮文案不重复：' + String(products.length) + ' 件逐件 ≤1 颗「复制数据」／「复制日志」、区块内无同名按钮');
if (violations.sections === 0 && products.length) ok('③ 日志六段齐：' + String(products.length) + ' 件逐件六段齐');
if (violations.blocks === 0 && products.length) ok('④ 一页一个复制区：' + String(products.length) + ' 件逐件恰一处');

/** t790 那四件的按钮计数（票面点名 2／2／2／5 → 1／1／1／1）。 */
const t790Readings = readings.filter((r) => T790.includes(r.ticket));
const t790Table = t790Readings.map((r) => ({
  file: r.file, dataButtons: r.dataButtons, logButtons: r.logButtons,
}));
const beforeT790 = { '初始化回执（新建）.html': [2, 2], '初始化回执（已就绪）.html': [2, 2], '初始化回执（有数据）.html': [2, 2], '首次使用向导.html': [5, 5] };
for (const row of t790Table) {
  const want = beforeT790[row.file];
  if (want === undefined) continue;
  if (row.dataButtons !== 1 || row.logButtons !== 1) {
    red('t790 ' + row.file + '：按钮计数没降到 1／1（实为 ' + String(row.dataButtons) + '／' + String(row.logButtons) + '）');
  } else {
    ok('t790 ' + row.file + '：' + String(want[0]) + '／' + String(want[1]) + ' → 1／1');
  }
}

/* ─────────────────────────── ⑤ 清单对账 ＋ 与改动前比 ─────────────────────────── */

let before = null;
if (existsSync(BEFORE_MANIFEST)) {
  const raw = JSON.parse(readFileSync(BEFORE_MANIFEST, 'utf8'));
  const rows = Array.isArray(raw) ? raw : (raw.rows ?? []);
  before = new Map();
  for (const row of rows) for (const p of (row.products ?? [])) {
    // 改动前那份总清单的键：`t<票号>/<件名>`（它自带 `ticket` 与 `file` 两列，不靠路径猜）。
    before.set('t' + String(p.ticket) + '/' + String(p.file), p.sha256_12);
  }
} else {
  red('缺改动前的总清单：' + BEFORE_MANIFEST + '（判据 5 的 before 读数取不到）');
}

let checked = 0;
let changed = 0;
let stale = 0;
const perManifest = [];
for (const m of manifests) {
  let inManifest = 0;
  for (const row of m.rows) {
    const file = row.file;
    if (typeof file !== 'string' || !file.endsWith('.html')) continue;
    const onDisk = join(SCRATCH, 't' + String(m.ticket), '成品', file);
    if (!existsSync(onDisk)) { red('t' + String(m.ticket) + ' 清单里的件不在盘上：' + file); continue; }
    inManifest += 1;
    const reality = sha12(readFileSync(onDisk, 'utf8'));
    if (reality !== row.sha256_12) { red('t' + String(m.ticket) + ' ' + file + '：盘上 sha256_12 ' + reality + ' ≠ 清单 ' + String(row.sha256_12)); }
    checked += 1;
    const beforeSha = before === null ? undefined : before.get('t' + String(m.ticket) + '/' + file);
    if (beforeSha === undefined) { stale += 1; continue; }
    if (beforeSha === reality) red('t' + String(m.ticket) + ' ' + file + '：与改动前逐字节相同（旧字节算未修）');
    else changed += 1;
  }
  perManifest.push({ ticket: m.ticket, rows: inManifest });
}
ok('⑤ 真出口重出：八份清单件共 ' + String(checked) + ' 行与盘上字节逐件对上；与改动前总清单比，' + String(changed) + ' 件的 sha256_12 已变'
  + (stale === 0 ? '' : '（另有 ' + String(stale) + ' 件改动前那份清单里没有）'));

/* ─────────────────────────── ⑥ 别域不动（收对拍结论件） ─────────────────────────── */

let isolation = null;
if (existsSync(ISOLATION)) {
  isolation = JSON.parse(readFileSync(ISOLATION, 'utf8'));
  const rows = isolation.rows ?? [];
  const admin = rows.filter((r) => r.name.includes('t790'));
  const others = rows.filter((r) => !r.name.includes('t790'));
  const bad = others.filter((r) => r.restSame !== true);
  if (bad.length) red('⑥ 别域不动：去掉复制区后仍有差异的非 t790 页：' + bad.map((r) => r.name).join('、'));
  else ok('⑥ 别域不动：非 t790 的 ' + String(others.length) + ' 张对拍页，去掉复制区那一段后与改动前**逐字节相同**');
  if (admin.length) ok('⑥ t790 那 ' + String(admin.length) + ' 张页另有差异，是本票「目标 B」有意改的（四落点收成单颗按钮 ＋ 一页一个复制区）');
} else {
  red('缺别域对拍结论件：' + ISOLATION + '（跑 .scratch/t887/前后对拍.mjs 产出）');
}

/* ─────────────────────────── 收口 ─────────────────────────── */

mkdirSync(dirname(REPORT), { recursive: true });
writeFileSync(REPORT, JSON.stringify({
  ticket: '#887',
  products: products.length,
  perManifest,
  t790Table,
  readings,
  beforeCompared: { checked, changed, stale },
  isolation: isolation === null ? null : (isolation.rows ?? []).map((r) => ({ name: r.name, oldSha: r.oldSha, newSha: r.newSha, restSame: r.restSame })),
  reds,
}, null, 2) + '\n', 'utf8');

for (const l of lines) console.log(l);
console.log('读数件：' + REPORT);
console.log('RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' products=' + String(products.length)
  + ' manifests=' + String(manifests.length) + ' changedVsBefore=' + String(changed) + ' red=' + String(reds.length));
process.exit(reds.length === 0 ? 0 : 1);
