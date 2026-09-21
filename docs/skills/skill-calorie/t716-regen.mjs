/**
 * #716 搬家（第四批：照片族四件 `wizardPort`／`wizardPortDocs`／`helpShell`／`templates`）的一次性重出器
 * —— 判据的产物来源。
 *
 * 判据：**搬迁前后逐页逐字节相同**（票面主判据）。做法照
 * `docs/skills/skill-calorie/t704-搬家-证据.md` 与 `t715-搬家-证据.md` 的先例：
 * 逐页 `sha256 ＋ bytes` 双比，脚本对每一条逐条比，不抽样。
 *
 * 覆盖口径按「搬迁面能影响到的页」定，不按页数好看定：
 *   - `wizardPort.ts` + `wizardPortDocs.ts` 产出 `calorie.view.photo-log-wizard`（身材照向导）与
 *     `calorie.view.gif-planner`（GIF 规划器）两键（声明在 `src/photo/commands.ts:40-41`）；
 *   - `helpShell.ts` 被 `photo/helpFile.ts` 用，出 `calorie.help.center` **缺省那一支**（V4 HELP 文件）；
 *   - `templates.ts` 被 `photo/helpCenter.ts` 用（看板页入口那一节），影响 `calorie.help.center --mode …`
 *     的三态速查台；
 *   - 所以：向导两条全分支 + HELP 三支全出；
 *   - 另出**两条对照页**（`calorie.photo.list`／`calorie.photo.detail`，产出者都**不在搬迁面**）：
 *     它们必须也逐字节不变——它们变了就说明抖动来自重出器或种子库本身，不是来自搬家。
 *
 * 只写 `.scratch/t716/`（本票独占草稿目录）。零源码改动、零 git 动作、真库零触碰
 * （库与配置都住本票草稿目录，家目录指过去（家目录注入））。
 *
 * 用法：
 *   node .scratch/t716/seed.mjs                                  # 先建种子库
 *   node .scratch/t716/regen.mjs                                 # 存基线
 *   node .scratch/t716/regen.mjs --tag MOVE --compare .scratch/t716/基线.json   # 比对
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const DB_DIR = join(HERE, 'db');
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const OUT_DIR = join(ROOT, argOf('--out', '.scratch/t716/产物'));
const BASE_JSON = join(ROOT, argOf('--baseline', '.scratch/t716/基线.json'));
const TMP = join(HERE, 'tmp-out');

/* ── 条款：向导两键全分支 ＋ HELP 三支 ＋ 两条对照页 ─────────────────────────── */
const cases = [
  // ① 身材照向导 `calorie.view.photo-log-wizard`（纯配置、不读库；`buildPhotoLogWizardView`）
  ['身材照向导(空态)', 'calorie.view.photo-log-wizard', {}],
  ['身材照向导(只给路径)', 'calorie.view.photo-log-wizard', { srcPaths: ['C:/photos/a.jpg'] }],
  ['身材照向导(路径+标签)', 'calorie.view.photo-log-wizard', { srcPaths: ['C:/photos/a.jpg', 'C:/photos/b.jpg'], tag: '正面' }],
  ['身材照向导(路径+标签+备注)', 'calorie.view.photo-log-wizard', { srcPaths: ['C:/photos/a.jpg', 'C:/photos/b.jpg', 'C:/photos/c.jpg'], tag: '正面自然光', note: '晨起空腹，同一面墙' }],
  ['身材照向导(路径含引号与反斜杠)', 'calorie.view.photo-log-wizard', { srcPaths: ['D:\\照片\\"晨"起\\1.jpg'], tag: '侧面', note: '路径含引号' }],
  ['身材照向导(满 20 张)', 'calorie.view.photo-log-wizard', { srcPaths: Array.from({ length: 20 }, (_, i) => `C:/photos/p${i + 1}.jpg`), tag: '腹部' }],
  // ② GIF 规划器 `calorie.view.gif-planner`（读库；`buildGifPlannerView`）
  ['GIF规划器(缺省 365 天窗)', 'calorie.view.gif-planner', {}],
  ['GIF规划器(按标签 正面)', 'calorie.view.gif-planner', { tag: '正面' }],
  ['GIF规划器(标签无候选=空态)', 'calorie.view.gif-planner', { tag: '不存在的标签' }],
  ['GIF规划器(框选 photoIds)', 'calorie.view.gif-planner', { tag: '正面', photoIds: [1, 3] }],
  ['GIF规划器(框选含缺失 id)', 'calorie.view.gif-planner', { tag: '正面', photoIds: [1, 999] }],
  ['GIF规划器(裁剪 crops)', 'calorie.view.gif-planner', { tag: '正面', photoIds: [1, 3], crops: { 1: [10, 20, 110, 220] } }],
  ['GIF规划器(全参数)', 'calorie.view.gif-planner', { tag: '正面', duration: 800, loop: 3, width: 600, height: 900, watermark: '2026 减脂', transition: 'fade', output: 'C:/out/body.gif' }],
  ['GIF规划器(日期窗 start/end)', 'calorie.view.gif-planner', { start: '2026-09-01', end: '2026-09-30' }],
  ['GIF规划器(days=1)', 'calorie.view.gif-planner', { days: 1 }],
  ['GIF规划器(全库无标签)', 'calorie.view.gif-planner', { duration: 50, loop: 5, width: 100, height: 100, transition: 'dissolve' }],
  // ③ HELP（`helpShell` 那条的用法 ＋ `templates` 影响的速查台三态）
  ['卡路里HELP文件(缺省)', 'calorie.help.center', {}],
  // 速查台三态里 inline 出的是**片段**（样式串＋正文），text 出的是**纯文本索引**——两者不是完整文档，
  // 完整性四条断言照字面不适用（按设计如此），故标 `fragment` 只比字节、不查 doctype。
  ['速查台(inline)', 'calorie.help.center', { mode: 'inline' }, { fragment: true }],
  ['速查台(file)', 'calorie.help.center', { mode: 'file' }],
  ['速查台(text)', 'calorie.help.center', { mode: 'text' }, { fragment: true }],
  // 对照页（产出者不在搬迁面；它们红了就说明抖动来自重出器或种子库）
  ['对照-看身材照', 'calorie.photo.list', { tag: '正面' }],
  ['对照-查身材照详情', 'calorie.photo.detail', { id: 1 }],
];

const num = (i) => String(i + 1).padStart(2, '0');
const fileWord = (w) => w.replace(/\s+/g, '').replace(/[\\/:*?"<>|]/g, '_');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

function renderAll(label) {
  const dir = join(TMP, label);
  mkdirSync(dir, { recursive: true });
  const rows = [];
  let bytesTotal = 0;
  cases.forEach(([wake, key, params, opts], i) => {
    const stem = `${num(i)}-${fileWord(wake)}`;
    const pagePath = join(dir, `${stem}.html`);
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(join(HERE, 'freeze.mjs')).href, BIN, key, '--params', JSON.stringify(params), '--html', pagePath], {
      encoding: 'utf8', env: { ...process.env, USERPROFILE: DB_DIR, HOME: DB_DIR}, timeout: 120000,
    });
    const tail = (s, n) => String(s || '').trimEnd().split(/\r?\n/).slice(-n).join('\n');
    if (r.status !== 0) {
      console.log(`FAIL ${label} ${stem} exit=${r.status}\n  stdout=${tail(r.stdout, 3)}\n  stderr=${tail(r.stderr, 3)}`);
      process.exitCode = 1;
      return;
    }
    const html = readFileSync(pagePath, 'utf8');
    const trimmed = html.replace(/^\uFEFF/, '');
    const bytes = Buffer.byteLength(html, 'utf8');
    const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
    const fragment = opts?.fragment === true;
    const probe = fragment
      ? { nonEmpty: bytes > 0, noSlotResidue: !/\{\{[^}]*\}\}/.test(trimmed) }
      : {
        doctype: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)),
        charset: /<meta[^>]+charset=["']?utf-8["']?/i.test(trimmed),
        closed: /<\/html>\s*$/.test(trimmed),
        noSlotResidue: !/\{\{[^}]*\}\}/.test(trimmed),
      };
    if (!Object.values(probe).every(Boolean)) {
      console.log(`FAIL ${label} ${stem} 文档完整性断言不过：${JSON.stringify(probe)}`);
      process.exitCode = 1;
    }
    bytesTotal += bytes;
    rows.push({ n: num(i), wake, key, params, exit: r.status, file: `${stem}.html`, bytes, sha256, sha256_12: sha256.slice(0, 12), probe });
  });
  return { dir, rows, bytesTotal };
}

/* 种子库必须先在位：缺了会让 GIF 规划器与两条对照页全走空态，判据覆盖不到有数据的分支而不报错。 */
try {
  readFileSync(join(DB_DIR, '.ilife', 'calorie.yaml'), 'utf8');
} catch {
  console.log(`FAIL 种子库缺配置（${join(DB_DIR, '.ilife', 'calorie.yaml')}）：先跑 node .scratch/t716/seed.mjs`);
  process.exit(1);
}

const passA = renderAll('A');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }
const passB = renderAll('B');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }

/* A/B 自证：同一份源码连出两遍必须逐字节相同，否则判据本身不稳（时钟冻结就是为这一条）。 */
const drift = passA.rows.filter((r, i) => r.sha256 !== passB.rows[i].sha256)
  .map((r, i) => `${r.n}(${r.sha256_12}->${passB.rows[i].sha256_12})`);
console.log(`STABLE-A-vs-B ${drift.length === 0 ? `pages=${passA.rows.length}/${passA.rows.length} DIFF=none` : `DIFF=${drift.join(',')}`}`);

const rows = passA.rows;

/* ── 与给定基线逐页比（sha256 ＋ bytes 双比，不抽样） ───────────────────────── */
const CMP = argOf('--compare', '');
if (CMP) {
  const prev = JSON.parse(readFileSync(join(ROOT, CMP), 'utf8'));
  const prevByN = new Map(prev.rows.map((r) => [r.n, r]));
  const diff = [];
  for (const r of rows) {
    const p = prevByN.get(r.n);
    if (!p) { diff.push(`${r.n}(基线缺这条)`); continue; }
    if (p.sha256 !== r.sha256 || p.bytes !== r.bytes) diff.push(`${r.n}(${p.sha256_12}->${r.sha256_12}, ${p.bytes}B->${r.bytes}B)`);
  }
  for (const p of prev.rows) if (!rows.some((r) => r.n === p.n)) diff.push(`${p.n}(本次缺这条)`);
  console.log(`${argOf('--tag', 'CMP')} byte-identical pages=${diff.length === 0 ? `${rows.length}/${rows.length}` : `${rows.length - diff.length}/${rows.length}`} DIFF=${diff.length === 0 ? 'none' : diff.join(',')}`);
  console.log(`  total_before=${prev.bytesTotal} total_after=${passA.bytesTotal}`);
  if (diff.length !== 0) process.exitCode = 1;
}

rows.forEach((r) => writeFileSync(join(OUT_DIR, r.file), readFileSync(join(passA.dir, r.file))));
/* 只比对不落基线：否则变异轮的产物会把参照本身覆盖掉（t704 那轮吃到过这个坑）。 */
if (CMP) {
  console.log(`BASELINE 未改写（本次是比对轮）：${BASE_JSON}`);
} else {
  const baseline = { savedAt: new Date().toISOString(), head: argOf('--head', ''), pages: rows.length, bytesTotal: passA.bytesTotal, rows };
  writeFileSync(BASE_JSON, JSON.stringify(baseline, null, 2));
  console.log(`BASELINE: ${BASE_JSON}`);
}
console.log(`RESULT: ${rows.length}/${rows.length} 页落盘 bytes_total=${passA.bytesTotal} → ${OUT_DIR}`);
if (drift.length) process.exitCode = 1;
