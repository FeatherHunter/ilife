/** T351 v4 · 真数据页留档：把生产库只读拷进沙箱，用本轮的装配件渲一份真数据整页（order184）。
 *
 *  - 只读：生产库 `D:\2Study\StudyNotes\.db\calorie_data.db` 只被 → `VACUUM INTO`（只读连接），本脚本不写它。
 *  - 落盘口径（协议 §2.5 第 1 条）：**先在临时目录 `_stage/` 里算出产物 → 跑完全部断言 →
 *    全过才搬到 `--out` 指的目录**。失败的运行**不动**已有的好产物（上一版先 `rmSync(OUT)` 再跑，
 *    失败一次就把上一份好页删了——那正是这条禁令要防的）。默认只演练、不落盘。
 *  - 产物：`<out>/order184-realdata-result.html` ＋ 读数 `<out>/realdata-readout.json`。
 *  - 证明点（本轮四列口径）：①「组数×次数／重量」是真值（不是「—」）——逐行抄带「组×」的格；
 *    ②动作格＝加粗名＋块级副行小字，副行以「主要／孤立」收尾；③正文不出现 `main`／`iso` 裸词；
 *    ④日级标题含「 · 节奏 」且休息日标题不带。
 *  - `--out` **必填**：本脚本住的 `final-v3/realdata` 是上一轮交付的对照基准，原地重跑会覆盖它。
 *  - T351-a2 接任者修的三处（git 里那份从未按自带用法跑通过）：① 暂存区守卫的根由「脚本自己住的目录」
 *    改成本次产物根（原样与它自己给的 `--out` 用法对不上，一跑就抛错）；② 行过滤写成
 *    `/组×/.test(cells[2])`，而 `cells[2]` 是对象 ⇒ 恒不命中（真值行断言恒红、⑥ 的「逐行齐」恒真，
 *    属自证式假绿），改成 `cells[2].text`；③ 副行内的裸词口径与产品侧同步（细化词里的 `iso` 中文化去重）。
 * 用法（持锁）：node tooling/run-locked.mjs --ticket 351 --run-id t351-a2-<短名> -- \
 *   node .scratch/t351-fix/final-v3/run-realdata-v3.mjs --out .scratch/t351-fix/final-v4/realdata
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const outArg = argv.indexOf('--out');
if (outArg < 0 || argv[outArg + 1] === undefined) {
  console.error('必须显式给 --out <产物目录>：final-v3/realdata 是上一轮交付的对照基准，原地重跑会覆盖它。'
    + '例：--out .scratch/t351-fix/final-v4/realdata');
  process.exit(2);
}
const OUT = resolve(argv[outArg + 1]);
/** 临时根：产物先在算出、断言全过后才搬进 OUT（§2.5 第 1 条）。 */
const STAGE = join(OUT, '_stage');
const PROD = 'D:\\2Study\\StudyNotes\\.db\\calorie_data.db';
const CLI = resolve(here, '../../../packages/skill-calorie/dist/cli/cmd_read.js');
const PAGE = 'order184-realdata-result.html';

/** §2.1.3 路径守卫：递归删除前先断言目标在自己声明的草稿根之下，且不落禁区目录。 */
const FORBIDDEN = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git'];
function assertSafeToRemove(target, root) {
  const abs = resolve(target);
  const rootAbs = resolve(root);
  if (abs === rootAbs) throw new Error('拒绝删除草稿根自身: ' + abs);
  if (!abs.startsWith(rootAbs + '\\') && !abs.startsWith(rootAbs + '/')) {
    throw new Error('拒绝删除草稿根之外的路径: ' + abs);
  }
  for (const seg of abs.slice(rootAbs.length).split(/[\\/]/)) {
    if (FORBIDDEN.includes(seg)) throw new Error('拒绝删除禁区目录下的路径: ' + abs);
  }
}

// 只清暂存区；`realdata/` 里已有的好产物在这次运行断言通过之前一律不动。
// 守卫根＝**产物根 OUT**（`_stage` 就在它下面）。上一版把根写成脚本自己住的目录，与它自己给的
// 用法（`--out .scratch/t351-fix/final-v4/realdata`）对不上，一跑就抛错（T351-a2 实测）。
assertSafeToRemove(STAGE, OUT);
rmSync(STAGE, { recursive: true, force: true });
const DBS = join(STAGE, 'dbs', 'read-shared');
mkdirSync(DBS, { recursive: true });

if (!existsSync(PROD)) {
  console.log('REALDATA: SKIP 生产库不在 ' + PROD);
  process.exit(0);
}
const dest = join(DBS, 'calorie_data.db');
let copyMode;
try {
  const src = new DatabaseSync(PROD, { readOnly: true });
  src.exec("VACUUM INTO '" + dest.replace(/'/g, "''") + "'");
  src.close();
  copyMode = 'VACUUM INTO（只读连接）';
} catch (e) {
  copyFileSync(PROD, dest);
  for (const suffix of ['-wal', '-shm']) if (existsSync(PROD + suffix)) copyFileSync(PROD + suffix, dest + suffix);
  copyMode = '文件复制（' + String(e.message).slice(0, 60) + '）';
}
console.log('REALDATA 拷贝方式＝' + copyMode + ' 生产库字节=' + statSync(PROD).size);

const cfg = new DatabaseSync(dest, { readOnly: true });
const cfgRow = cfg.prepare('SELECT title, version, description, total_weeks, start_date FROM workout_plan_config WHERE id = 1').get() ?? {};
const counts = cfg.prepare('SELECT COUNT(*) AS n, SUM(CASE WHEN is_rest_day = 1 THEN 1 ELSE 0 END) AS rest FROM workout_plans').get() ?? {};
cfg.close();

/* ── ① 先在暂存区算出产物 ─────────────────────────────────────── */
const staged = join(STAGE, PAGE);
const r = spawnSync(process.execPath, [CLI, 'calorie.view.plan', '--params', '{}', '--html', staged], {
  env: { ...process.env, SKILLS_DB_PATH: DBS }, encoding: 'utf8',
});
if (r.status !== 0 || !existsSync(staged)) {
  console.log('REALDATA: FAIL exit=' + r.status + ' stderr=' + String(r.stderr).slice(0, 300));
  console.log('REALDATA: 本次不落盘（暂存区保留在 ' + STAGE + '，realdata/ 里的既有产物未动）');
  process.exit(1);
}
const html = readFileSync(staged, 'utf8');

/* ── ② 全部断言在内存里跑完 ───────────────────────────────────── */
const bodyOf = (h) => h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
const body = bodyOf(html);
const strip = (s) => s.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
const titles = [...html.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => strip(m[1]));
const dayTitles = titles.filter((t) => /^周[一二三四五六日]/.test(t));
/** 首格（动作格）拆两件：加粗名＋块级副行小字（共用位 `renderCaliberLine`）。 */
function cellsOf(rawCell) {
  const sub = (/<p class="ilife-block-caliber">([\s\S]*?)<\/p>/.exec(rawCell) ?? [, ''])[1];
  const name = (/<strong>([^<]*)<\/strong>/.exec(rawCell) ?? [, ''])[1];
  const text = strip(rawCell.replace(/<p class="ilife-block-caliber">[\s\S]*?<\/p>/g, ''));
  return { text, sub, name };
}
const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  .map((m) => [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => cellsOf(c[1])))
  .filter((cells) => cells.length >= 4 && /组×/.test(cells[2].text));
const moveCells = rows.map((cells) => cells[0]);
const subLines = moveCells.map((c) => c.sub).filter((t) => t !== '');
const restTitles = titles.filter((t) => t.includes('休息日'));
const BARE_TYPE_RE = /(?<![\w-])(main|iso)(?![\w-])/;
const bareType = BARE_TYPE_RE.test(body) ? (BARE_TYPE_RE.exec(body) ?? [, ''])[1] : null;
const exactId = (h, id) => (h.split('id="' + id + '"').length - 1) - (h.split('data-action-id="' + id + '"').length - 1);
const MENU = ['纯文本', 'JSON', 'CSV', 'fmt-menu', 'copy-menu-item', 'data-fmt-open', '复制数据 ▾'];
const c3bad = MENU.filter((t) => body.includes(t))
  .concat(['op=', '# 成功'].filter((t) => body.includes(t)))
  .concat(/【calorie · calorie\./.test(body) ? ['【calorie · calorie.*】'] : []);
const heads = [...((/<thead>[\s\S]*?<\/thead>/.exec(html) ?? [''])[0]).matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1].trim());
const FOUR = ['动作', '部位', '组数×次数', '重量'];
const readout = {
  ok: true, copyMode, prodBytes: statSync(PROD).size, page: join(OUT, PAGE), pageBytes: statSync(staged).size,
  config: cfgRow, plansRows: counts, sessionTitles: titles, restSessionTitles: restTitles,
  dayTitles, tempoDayTitles: dayTitles.filter((t) => t.includes(' · 节奏 ')),
  restTitlesWithTempo: dayTitles.filter((t) => t.includes('休息日') && t.includes('节奏')),
  restDuplicate: html.includes('休息日（休息日）'),
  c1doctype: html.toLowerCase().includes('<!doctype html'),
  c2data: exactId(html, 'ilife-copy-data'), c2log: exactId(html, 'ilife-copy-log'),
  c5logIds: html.split('data-action-id="ilife-copy-log"').length - 1,
  c5logDisabled: html.split('data-action-id="ilife-copy-log" disabled').length - 1,
  c3bad, c4heads: heads,
  realSetsRows: rows.length, sampleRows: rows.slice(0, 10),
  boldMissing: moveCells.filter((c) => c.name === '').length,
  subLines, subZhCount: subLines.filter((t) => /(^| · )(主要|孤立)$/.test(t)).length,
  bareType,
  prodShape: { 主: subLines.filter((t) => t === '背 主 · 孤立').length, 补充: subLines.filter((t) => t === '背 补充 · 孤立').length },
  subWithBareType: subLines.filter((t) => BARE_TYPE_RE.test(t)).length,
  metrics: envOf(r) ?? null,
};
function envOf(res) {
  try { return JSON.parse(String(res.stdout || '').trim()).data.metrics; } catch { return null; }
}

const asserts = [
  ['①有 <!doctype html>', readout.c1doctype === true],
  ['②真 id 各恰好一次', readout.c2data === 1 && readout.c2log === 1],
  ['③正文无禁词', c3bad.length === 0],
  ['④四列表头逐字按序', JSON.stringify(heads) === JSON.stringify(FOUR)],
  ['⑤`data-action-id="ilife-copy-log"` 恰好一颗且无禁用', readout.c5logIds === 1 && readout.c5logDisabled === 0],
  ['休息日标题不重复', readout.restDuplicate === false],
  ['动作表有真值行（组数×次数／重量不是「—」）', rows.length > 0],
  ['⑥动作格＝加粗名＋块级副行小字，副行以「主要／孤立」收尾（逐行齐）',
    readout.boldMissing === 0 && subLines.length === rows.length && readout.subZhCount === rows.length],
  ['⑦正文不出现 `main`／`iso` 裸词（细化词里混着的裸词须中文化去重；副行逐条同样不许有）',
    readout.bareType === null && readout.subWithBareType === 0],
  ['⑧日级标题含「 · 节奏 」，且休息日标题不带节奏',
    readout.tempoDayTitles.length > 0 && readout.restTitlesWithTempo.length === 0],
];
for (const [name, ok] of asserts) console.log((ok ? 'PASS ' : 'FAIL ') + 'REALDATA 断言 ' + name);

/* ── ③ 全过才落盘 ─────────────────────────────────────────────── */
const bad = asserts.filter(([, ok]) => !ok);
if (bad.length > 0) {
  console.log('REALDATA: 断言红 ' + bad.length + ' 条 → 本次不落盘（realdata/ 里的既有产物未动）');
  process.exit(1);
}
copyFileSync(staged, join(OUT, PAGE));
writeFileSync(join(OUT, 'realdata-readout.json'), JSON.stringify(readout, null, 2), 'utf8');
assertSafeToRemove(STAGE, OUT);
rmSync(STAGE, { recursive: true, force: true });

console.log('REALDATA_PAGE=' + readout.page + ' bytes=' + readout.pageBytes);
console.log('REALDATA_CONFIG=' + JSON.stringify(cfgRow) + ' 计划行=' + JSON.stringify(counts));
console.log('REALDATA_REST_DUP=' + readout.restDuplicate + ' 休息标题=' + JSON.stringify([...new Set(restTitles)]));
console.log('REALDATA_SETS_ROWS=' + rows.length + ' 样例=' + JSON.stringify(rows.slice(0, 4)));
console.log('REALDATA_SUB=' + JSON.stringify([...new Set(subLines)].slice(0, 6)) + ' 逐行齐=' + (subLines.length === rows.length)
  + ' 生产形状数=' + JSON.stringify(readout.prodShape) + ' 副行含裸词=' + readout.subWithBareType);
console.log('REALDATA_TEMPO_TITLES=' + JSON.stringify(readout.tempoDayTitles.slice(0, 3)) + ' 休息日带节奏=' + readout.restTitlesWithTempo.length);
console.log('REALDATA_CHECKS ①doctype=' + readout.c1doctype + ' ②data=' + readout.c2data + '/log=' + readout.c2log
  + ' ③禁词=' + (c3bad.length ? c3bad.join('｜') : '无') + ' ④表头=' + heads.join('/')
  + ' ⑤日志钮=' + readout.c5logIds + '（禁用 ' + readout.c5logDisabled + '）'
  + ' ⑦裸词=' + (readout.bareType ?? '无'));
console.log('REALDATA_RESULT: ' + asserts.filter(([, ok]) => ok).length + '/' + asserts.length);
console.log('REALDATA_METRICS=' + JSON.stringify(readout.metrics));
