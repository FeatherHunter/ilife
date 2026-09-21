#!/usr/bin/env node
/** #783 探针 —— 写入与同步域「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 783 -- node docs/skills/skill-schedule/t783-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读 `domain=write` 那 14 行，
 *      逐行判「有产物」或「在有意不出名单里（带理由）」——缺一行即红（不断言「有几张页」，断言「每一行都有下文」）；
 *   ② **必现块在页上**：按清单里该场景所属老侧家族的 `blocks_old`（`families[].blocks_old`），逐块断言页上可见；
 *   ③ **代码层窄判据**：本票页内件里不出现裸字号的字号／间距／色值字面量（色值只许取公共层 token，
 *      长度只许取族级样式件常量）；
 *   ④ **双端**：三档横向溢出 0（走图级出页门）＋ 分隔符门 0 命中（走 calorie 那件判据工具）。
 *   另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张）、清单（墙与收口票共用一份）。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t783/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t783-探针.mjs [--out <产物目录>] [--no-shots]
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = 'packages/skill-schedule';
const CLI = join(REPO, PKG, 'dist', 'cli', 'cmd_read.js');
const SEED = join(REPO, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't783'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
/** 截图**与产物同目录**（票面原话）：不另立子目录，收口票按清单逐件收得走。 */
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
/** **变异自证专用**：`--allow-dirty` 跳过「本包 src 必须干净」那一条。
 *  为什么要这个口子：票面要求「改坏一处必须变红」——变异就在 `src/write/` 里，而安静窗口那一条
 *  恰恰要求 src 干净，两者不能同时成立。默认**不开**（验收命令跑的是默认），开了会在结论里点名。 */
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');
/** 夹具日：种子库里没有这一天（干净的一天，页上的读数不会被种子数据搅混）。 */
const DAY = '2026-09-22';

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/* ─────────────────────────── 场景表：一行一处交代 ─────────────────────────── */

/** 本域出页的 4 行（清单里 `domain=write` 且判得出页的行）。 */
const WRITE_PRODUCTS = [
  { id: 'record_add_single', file: '记作息结果（单条）.html', wake: '#0 记作息', kind: '记作息结果' },
  { id: 'record_add_json', file: '记作息结果（JSON 一条）.html', wake: '#0 记作息', kind: '记作息结果' },
  { id: 'record_add_l1_only', file: '记作息结果（只记一级）.html', wake: '#0 记作息', kind: '记作息结果' },
  { id: 'batch_add', file: '批量导入回执.html', wake: '#0 记作息', kind: '批量导入回执' },
];

/** 本域**有意不出**的行：行 → 理由（理由要能被人直接读，不许写「见上」）。 */
const EXCLUDED = {
  record_add_illegal_category: '阻断态：分类不在白名单时 exit 2，不产页——票面明令「不许给阻断态造静态页」，按阻断登记',
  record_add_missing_field: '阻断态：必填字段缺失时 exit 2，不产页——同上一行',
  prep_default: '语取链：地图 Out of scope（外置消息库为准），老侧本身也只回分页 JSON',
  prep_with_range: '语取链：同 prep_default',
  prep_pagination: '语取链：同 prep_default',
  prep_no_messages: '语取链：同 prep_default（空列表也只是一句 JSON）',
  sync_full: '语取链：地图 Out of scope；本条链路上真正的产物是「每条一条记作息结果」，本票已交那一家族',
  sync_partial_day: '语取链：同 sync_full',
  sync_incremental: '语取链：同 sync_full（游标续跑）',
  sync_no_cursor: '语取链：同 sync_full（首次全量）',
};

/** 承接跨域：清单里归 `analyze` 的行（唤醒词路由落在 `schedule.record.write` 的两个 op 上，
 *  写面在本域，故本票一并交付；已在票面与 #789 写明边界裁定）。 */
const TAKEN_OVER = [
  { id: 'amend_basic', file: '修正作息回执.html', family: 'f09｜修正作息回执' },
  { id: 'amend_json_inline', file: '修正作息回执.html', family: 'f09｜修正作息回执' },
  { id: 'amend_24h_warn', file: '修正作息回执.html', family: 'f09｜修正作息回执' },
  { id: 'add_summary_basic', file: '写作息摘要回执.html', family: '（老侧无产物：本票按「每个唤醒词落一份真页」补）' },
  { id: 'add_summary_idempotent', file: '写作息摘要回执.html', family: '（同上）' },
];

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（记号 ＋ 该块必现的两处标记）。
 *  `expect:'absent'` 是「这一块本场景不该有」（警示条位只在 l1_only 上出）。 */
const CONTRACT = {
  '记作息结果（单条）.html': [
    { block: '全天时间轴', needs: ['全天作息时间轴', 'ilife-block-chart-block'] },
    { block: '过去几小时推断高亮', needs: ['过去几小时推断回溯', 'sch-wr-past'] },
    { block: '状态总览', needs: ['当前状态总览', 'ilife-block-kpi-card-grid'] },
    { block: '警示条位（l1_only）', needs: ['ilife-block-feedback-block'], expect: 'absent' },
  ],
  '记作息结果（JSON 一条）.html': [
    { block: '全天时间轴', needs: ['全天作息时间轴', 'ilife-block-chart-block'] },
    { block: '过去几小时推断高亮', needs: ['过去几小时推断回溯', 'sch-wr-past'] },
    { block: '状态总览', needs: ['当前状态总览', 'ilife-block-kpi-card-grid'] },
    { block: '警示条位（l1_only）', needs: ['ilife-block-feedback-block'], expect: 'absent' },
  ],
  '记作息结果（只记一级）.html': [
    { block: '全天时间轴', needs: ['全天作息时间轴', 'ilife-block-chart-block'] },
    { block: '过去几小时推断高亮', needs: ['过去几小时推断回溯', 'sch-wr-past'] },
    { block: '状态总览', needs: ['当前状态总览', 'ilife-block-kpi-card-grid'] },
    { block: '警示条位（l1_only）', needs: ['ilife-block-feedback-block', '只记到一级分类'] },
  ],
  '批量导入回执.html': [
    { block: '收到／写入／没通过三个读数', needs: ['这一趟的结果', 'ilife-block-kpi-card-grid'] },
    { block: '逐条结果表', needs: ['逐条结果', 'ilife-block-data-table'] },
    { block: '结论条', needs: ['ilife-block-conclusion'] },
  ],
  '批量导入回执（部分成）.html': [
    { block: '收到／写入／没通过三个读数', needs: ['这一趟的结果', 'ilife-block-kpi-card-grid'] },
    { block: '逐条结果表', needs: ['逐条结果', 'ilife-block-data-table'] },
    { block: '没通过那几条的警示条', needs: ['有几条没写进去', 'ilife-block-feedback-block'] },
  ],
  '修正作息回执.html': [
    { block: '蓝调 diff', needs: ['sch-wr-diff', '这次改了什么'] },
    { block: '多字段前后对照', needs: ['ilife-block-change-row'], atLeast: 2 },
    { block: '改完之后的完整一条', needs: ['改完之后的完整一条', 'ilife-block-disclosure'], optional: true },
  ],
  '写作息摘要回执.html': [
    { block: '写库回执读卡', needs: ['这次写了什么', 'ilife-block-kpi-card-grid'] },
    { block: '当日支的现状', needs: ['当天这支记录合计', 'ilife-block-fact-strip'] },
    { block: '结论条', needs: ['ilife-block-conclusion'] },
  ],
};

/* ─────────────────────────── 前置：安静窗口 ＋ 编译指纹 ─────────────────────────── */

function checkQuietWindow() {
  const g = spawnSync('git', ['-C', REPO, 'status', '--short', '--', PKG + '/src'], { encoding: 'utf8' });
  if (g.status !== 0) die2('取不到 git 状态：' + String(g.stderr).trim());
  const dirty = String(g.stdout).trim();
  if (dirty !== '' && !ALLOW_DIRTY) {
    die2('窗口不安静：本包 src 有未提交改动（可能是别人正在写，也可能是本票还没提交），读数作废：\n' + dirty);
  }
  if (dirty !== '' && ALLOW_DIRTY) ok('变异自证模式：本包 src 有未提交改动，安静窗口那一条**按请求跳过**（默认跑法不跳）');
  const owner = join(REPO, '.scratch', 'locks', 'owner.json');
  if (existsSync(owner)) {
    let live = false;
    let info = '';
    try {
      info = readFileSync(owner, 'utf8').trim();
      const o = JSON.parse(info);
      const pid = Number(o.pid);
      if (Number.isFinite(pid) && pid > 0) { try { process.kill(pid, 0); live = true; } catch { live = false; } }
      if (live && String(o.ticket) === '783') live = false;
    } catch { live = false; }
    if (live) die2('窗口不安静：锁目录里有别人在持锁（' + info + '），读数作废');
  }
}

function compileFingerprint() {
  const logPath = join(OUT, '探针-t540.log');
  mkdirSync(OUT, { recursive: true });
  const r = spawnSync(process.execPath, [join(REPO, 'docs', 'agents', 't540-指纹绑定.mjs'),
    '--scope', PKG, '--log', logPath], { encoding: 'utf8', cwd: REPO });
  const out = String(r.stdout);
  const fp = out.split('\n').find((l) => l.startsWith('FINGERPRINT:'));
  if (r.status !== 0 || !fp) {
    die2('编译指纹取不到或窗口内 src 漂移（协议 §2.6，读数作废）：exit=' + String(r.status)
      + '\n' + out.trim() + '\n' + String(r.stderr).trim());
  }
  return fp.trim();
}

/* ─────────────────────────── 夹具 ＋ 真出口跑产物 ─────────────────────────── */

if (!existsSync(CLI)) die2('缺 dist 出口（先 tsc -b packages/skill-schedule --force）：' + CLI);
if (!existsSync(SEED)) die2('缺种子库：' + SEED);

checkQuietWindow();
const fingerprint = compileFingerprint();
ok('安静窗口：本包 src 无未提交改动、锁目录无别人持锁');
ok('编译指纹：' + fingerprint);

rmSync(HOME, { recursive: true, force: true });
rmSync(PROD, { recursive: true, force: true });
rmSync(WALL, { recursive: true, force: true });
mkdirSync(join(HOME, '.ilife', 'data'), { recursive: true });
const DB = join(HOME, '.ilife', 'data', 'schedule_data.db');
copyFileSync(SEED, DB);
mkdirSync(PROD, { recursive: true });

const env = { ...process.env, USERPROFILE: HOME, HOME };
const imp = (p) => import(pathToFileURL(p).href);
const { openScheduleDb, closeScheduleDb, addRecord } = await imp(join(REPO, PKG, 'dist', 'fetch', 'db.js'));

/** 「HH:MM」→ 当天分钟数（夹具算时长用）。 */
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** 夹具：先铺一天的底料（走库层，不产页），后头的产物页才有「过去几小时」可回溯。 */
let seededIds = [];
{
  const handle = openScheduleDb(DB);
  try {
    const seedRows = [
      { time_start: '07:00', time_end: '08:00', activity: '晨跑', category: '健康.运动', source_contents: '07:02 语音「出门跑步」', analysis_reasoning: '活动关键词命中运动' },
      { time_start: '09:00', time_end: '12:00', activity: '写后台接口', category: '工作.开发', source_contents: '09:05 语音「开始写接口」', analysis_reasoning: '活动关键词命中开发' },
      { time_start: '12:00', time_end: '12:40', activity: '午餐', category: '维持.用餐', source_contents: '12:03 语音「去吃饭」', analysis_reasoning: null },
      { time_start: '13:00', time_end: '13:30', activity: '午睡', category: '调整.午睡', source_contents: null, analysis_reasoning: '按原话归到午睡' },
    ];
    seededIds = seedRows.map((row) => addRecord(handle, {
      date: DAY,
      time_start: row.time_start,
      time_end: row.time_end,
      duration_minutes: toMin(row.time_end) - toMin(row.time_start),
      activity: row.activity,
      category: row.category,
      source_contents: row.source_contents,
      analysis_reasoning: row.analysis_reasoning,
    }).id);
  } finally {
    closeScheduleDb(handle);
  }
}
ok('夹具：' + DAY + ' 铺了 ' + seededIds.length + ' 条底料（记录编号 ' + seededIds.join(' ') + '）');

/** 真出口逐条跑：不带 `--html`＝走缺省落盘那一支，落点只认回执里的 `delivery.path`。 */
const RUNS = [
  {
    file: '记作息结果（单条）.html',
    params: { op: 'add', date: DAY, time_start: '14:00', time_end: '15:00', activity: '写 AI 调优代码', category: '工作.AI调优', source_contents: '14:02 语音「开始调 AI」', analysis_reasoning: '按原话落库，未推断' },
    note: '单条：14:00 至 15:00',
  },
  {
    file: '记作息结果（JSON 一条）.html',
    params: { op: 'add', date: DAY, time_start: '15:30', time_end: '16:00', activity: '读技术书', category: '学习.读书', source_contents: '15:31 语音「看会儿书」', analysis_reasoning: '活动关键词命中读书' },
    note: 'JSON 一条：15:30 至 16:00',
  },
  {
    file: '记作息结果（只记一级）.html',
    params: { op: 'add', date: DAY, time_start: '16:30', time_end: '17:00', activity: '创作类作息', category: '创作' },
    note: '只记一级：警示条位',
  },
  {
    file: '批量导入回执.html',
    params: {
      op: 'add',
      records: [
        { date: DAY, time_start: '17:00', time_end: '17:30', activity: '散步', category: '调整.散步' },
        { date: DAY, time_start: '17:30', time_end: '18:00', activity: '收拾', category: '日常.收拾' },
        { date: DAY, time_start: '18:00', time_end: '18:30', activity: '晚餐', category: '维持.用餐' },
      ],
    },
    note: '批量 3 条全成',
    exit: 0,
  },
  {
    file: '批量导入回执（部分成）.html',
    params: {
      op: 'add',
      records: [
        { date: DAY, time_start: '19:00', time_end: '19:30', activity: '散步', category: '调整.散步' },
        { date: DAY, time_start: '19:30', time_end: '20:00', activity: '写法', category: '不存在的类别' },
        { date: DAY, time_start: '20:00', time_end: '20:30', activity: '洗碗', category: '日常.杂事' },
      ],
    },
    note: '批量 3 条里 1 条不过校验（这一支按票面口径：合成写没达成 → 退出码非 0）',
    exit: 1,
  },
  {
    file: '修正作息回执.html',
    params: { op: 'amend', id: null, category: '工作.会议', activity: '写后台接口（改过）' },
    note: '修正：改分类与活动两格',
  },
  {
    file: '写作息摘要回执.html',
    params: { op: 'summary', date: DAY, category: '工作', total_minutes: 300 },
    note: '写摘要：老侧这条无产物，本票补一份真页',
  },
];

function runCli(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

let failed = 0;
const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  const params = { ...run.params };
  if (params.id === null) params.id = seededIds[1];
  const r = runCli('schedule.record.write', params);
  const wantExit = run.exit === undefined ? 0 : run.exit;
  if (r.status !== wantExit) {
    red(run.file + '：真出口 exit=' + r.status + '（期望 ' + wantExit + '）' + (r.stderr.trim() === '' ? '' : ' stderr=' + r.stderr.trim().split('\n')[0]));
    failed += 1;
    continue;
  }
  const dl = r.envelope === null ? undefined : r.envelope.delivery;
  if (dl === undefined || typeof dl.path !== 'string') { red(run.file + '：回执缺 delivery.path（缺省调用没落盘）'); failed += 1; continue; }
  if (!isAbsolute(dl.path)) { red(run.file + '：delivery.path 不是绝对路径：' + dl.path); failed += 1; continue; }
  if (!existsSync(dl.path)) { red(run.file + '：回执路径不在盘上：' + dl.path); failed += 1; continue; }
  const onDisk = statSync(dl.path).size;
  if (onDisk !== dl.bytes) { red(run.file + '：盘上字节 ' + onDisk + ' ≠ delivery.bytes ' + dl.bytes); failed += 1; continue; }
  const html = readFileSync(dl.path, 'utf8');
  if (!html.startsWith('<!doctype html>')) { red(run.file + '：落盘的不是整页'); failed += 1; continue; }
  const target = join(PROD, run.file);
  copyFileSync(dl.path, target);
  rows.push({
    seq: String(i + 1).padStart(2, '0'),
    file: run.file,
    wake: '#0 记作息',
    family: run.note,
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const writeRows = manifest.scenarios.filter((s) => s.domain === 'write');
if (writeRows.length === 0) red('清单里读不到 domain=write 的行（权威源形状变了，先修读数）');
const productOf = new Map(WRITE_PRODUCTS.map((p) => [p.id, p.file]));
const scenLines = [];
for (const row of writeRows) {
  const id = row.scenario_id;
  const file = productOf.get(id);
  if (file !== undefined) {
    const present = existsSync(join(PROD, file));
    if (!present) red('场景 ' + id + ' 判了出页，产物却不在盘上：' + file);
    scenLines.push('     ' + (present ? '有产物' : '缺产物') + '  ' + id + '  → ' + file);
    continue;
  }
  const reason = EXCLUDED[id];
  if (reason === undefined) { red('场景 ' + id + ' 既没有产物、也不在「有意不出」名单里（补一处交代）'); continue; }
  scenLines.push('    有意不出  ' + id + '  → ' + reason);
}
ok('① 逐场景行有交代：写入与同步 ' + writeRows.length + ' 行逐行有下文（出页 ' + WRITE_PRODUCTS.length + ' ＋ 有意不出 ' + Object.keys(EXCLUDED).length + '）');
for (const l of scenLines) lines.push(l);
for (const t of TAKEN_OVER) {
  const present = existsSync(join(PROD, t.file));
  if (!present) red('承接行 ' + t.id + ' 的产物不在盘上：' + t.file);
}
ok('① 承接跨域 5 行（' + [...new Set(TAKEN_OVER.map((t) => t.id))].length + ' 个场景）→ 修正作息回执 ＋ 写作息摘要回执（路由在写域，写面在本域）');

/* ─────────────────────────── ② 必现块在页上 ─────────────────────────── */

const markupOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
const count = (body, re) => (body.match(re) ?? []).length;

for (const [file, blocks] of Object.entries(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) { red('② ' + file + ' 不在盘上，块断言无从谈起'); continue; }
  const body = markupOf(readFileSync(path, 'utf8'));
  const missing = [];
  for (const b of blocks) {
    const present = b.needs.every((n) => body.includes(n));
    if (b.expect === 'absent') {
      if (present) missing.push(b.block + '（本场景本该缺席，却出了）');
      continue;
    }
    if (!present) {
      if (b.optional === true) continue;
      missing.push(b.block + '（缺 ' + b.needs.filter((n) => !body.includes(n)).join(' ') + '）');
      continue;
    }
    if (b.atLeast !== undefined) {
      const got = count(body, /ilife-block-change-row"/g);
      if (got < b.atLeast) missing.push(b.block + '（要 ≥' + b.atLeast + ' 行，实得 ' + got + '）');
    }
  }
  if (missing.length > 0) red('② ' + file + ' 必现块：' + missing.join('，'));
  else ok('② ' + file + ' 必现块齐（' + blocks.filter((b) => b.optional !== true).length + ' 块）');
}

/* ─────────────────────────── ③ 代码层窄判据 ─────────────────────────── */

const SRC = join(REPO, PKG, 'src', 'write');
/** 判据只量**代码里的字符串**：注释里写「实测 880px 掉到 874px」这类读数不算样式字面量；
 *  TS 里 `gap: { from: string }` 这种类型注解也不是样式（首轮把这两处都误判过）。 */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const stringLiterals = (code) => [...code.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1] ?? m[2] ?? '').join('\n');
const cssish = /(font-size|line-height|padding|margin|gap|border-radius|color|background)\s*:|@media/;
const hex = /#[0-9a-fA-F]{4,8}\b/;
const pieceViolations = [];
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.ts'))) {
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, f), 'utf8')));
  if (hex.test(literals)) pieceViolations.push(f + '：出现十六进制色值（色值只许取公共层 token）');
  if (f === 'writeParts.ts') {
    if (/\d+px/.test(literals)) pieceViolations.push(f + '：样式里出现 px 字面量（长度只许取族级常量）');
  } else if (cssish.test(literals)) {
    pieceViolations.push(f + '：页装配件里出现样式字面量（样式只许住族级样式件）');
  }
}
if (pieceViolations.length > 0) for (const v of pieceViolations) red('③ ' + v);
else ok('③ 代码层窄判据：本域页内件里零裸色值／零 px 字面量，样式只住写域的族级样式件');

/* ─────────────────────────── ④ 双端：出页门 ＋ 分隔符门 ─────────────────────────── */

const files = readdirSync(PROD).filter((f) => f.endsWith('.html')).sort();
const door = spawnSync(process.execPath, [join(REPO, 'docs', 'skills', 'skill-schedule', 'map-779-出页门.mjs'), PROD],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const doorOut = String(door.stdout).trim().split('\n');
for (const l of doorOut) lines.push('     [出页门] ' + l.trim());
if (door.status !== 0) red('④ 出页门未过（整页／零外部引用／三档溢出）：exit=' + door.status);
else ok('④ 出页门：' + (doorOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

const sep = spawnSync(process.execPath, [join(REPO, 'packages', 'skill-calorie', 'scripts', 'audit-separators.mjs'), '--dir', PROD, '--quiet'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const sepOut = String(sep.stdout).trim().split('\n');
for (const l of sepOut) lines.push('     [分隔符门] ' + l.trim());
if (sep.status !== 0) red('④ 分隔符门有命中（exit=' + sep.status + '）');
else ok('④ 分隔符门：' + (sepOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't783-清单.json'), JSON.stringify({ rows }, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't783-清单.json')).replace(/\\/g, '/') + '（rows=' + rows.length + '）');

if (!NO_SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + shot + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(files);
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + wall.mobile + ' 格、桌面墙 ' + wall.desktop + ' 格，链接自检 ' + wall.links + ' 条缺失 0');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + files.length
  + ' scenes=' + writeRows.length + ' red=' + reds.length + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
process.exit(reds.length === 0 ? 0 : 1);

/* ─────────────────────────── 截图与墙（本件自持，零第三方依赖） ─────────────────────────── */

async function shoot(pages) {
  const BROWSER = [process.env.DSH_BROWSER,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter((p) => typeof p === 'string' && p && existsSync(p))[0];
  if (!BROWSER) return null;
  const PORT = 9821 + (process.pid % 120);
  const profile = mkdtempSync(join(tmpdir(), 't783-shot-'));
  const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let dev = null;
  for (let i = 0; i < 120 && dev === null; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) dev = (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
    if (dev === null) await sleep(250);
  }
  if (dev === null) { chrome.kill(); return null; }
  const ws = new WebSocket(dev);
  const pending = new Map();
  let seq = 1;
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  });
  await new Promise((res) => ws.addEventListener('open', () => res()));
  const send = (method, params, sessionId) => new Promise((res, rej) => {
    const id = seq++; pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify(sessionId === undefined ? { id, method, params } : { id, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  const evaluate = async (e) => (await s('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.value;
  await s('Page.enable'); await s('Runtime.enable');
  let made = 0;
  for (const f of pages) {
    for (const w of [390, 1280]) {
      await s('Emulation.setDeviceMetricsOverride', { width: w, height: 1000, deviceScaleFactor: 1, mobile: w < 768 });
      await s('Page.navigate', { url: pathToFileURL(join(PROD, f)).href });
      for (let i = 0; i < 60; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(300);
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(SHOTS, basename(f, '.html') + '__截图__' + w + '.png'), Buffer.from(shot.data, 'base64'));
      made += 1;
    }
  }
  ws.close(); chrome.kill();
  for (let i = 0; i < 10; i += 1) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(200); } }
  return made;
}

/** 本域小墙（形制照 `docs/agents/视觉验收墙.md` §6.2）：手机 390 三列／桌面 1280 一列。
 *
 *  **住 `墙/` 子目录、引用写成 `../成品/<件>`**：产物目录要留给「产物」——墙页自身是定宽夹具
 *  （手机墙 390 宽、桌面墙 1280 宽），混进产物目录会让 `measure-responsive --dir <产物目录>`
 *  把两张墙也当成产物去量三档，读数当场变红（本探针首轮就这么红过一次）。相对路径照旧落得到，
 *  双击即看这条不受影响。
 *  自检 `dropped`（清单点名、盘上没有）与 `dead`（页上引用、盘上没有）两条一起判。 */
function buildWalls(pages) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reds2 = [];
  const dropped = rows.filter((r) => !existsSync(join(PROD, r.file)));
  for (const d of dropped) reds2.push('清单点名 ' + d.file + '，盘上没有');
  mkdirSync(WALL, { recursive: true });
  const made = { mobile: 0, desktop: 0, links: 0 };
  for (const [name, W, H, COLS] of [['t783-小墙-手机.html', 390, 820, 3], ['t783-小墙-桌面.html', 1280, 820, 1]]) {
    const cells = pages.map((f, i) => {
      const row = rows.find((r) => r.file === f);
      const ref = '../成品/' + f;
      return '  <figure><figcaption><a href="' + esc(ref) + '" target="_blank" rel="noopener">'
        + esc(String(i + 1).padStart(2, '0') + ' ' + (row === undefined ? f : row.wake)) + '</a>'
        + '<span>' + esc(row === undefined ? '' : row.note) + '</span></figcaption>'
        + '<iframe src="' + esc(ref) + '" width="' + W + '" height="' + H + '" title="' + esc(f) + '"></iframe></figure>';
    }).join('\n');
    const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f5f7;color:#1d1d1f}'
      + '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}'
      + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}'
      + '.grid{display:grid;grid-template-columns:repeat(' + COLS + ',' + W + 'px);gap:18px;align-items:start;justify-content:start}'
      + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}'
      + 'figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}'
      + 'figcaption a{color:#007aff;text-decoration:none}figcaption span{color:#868b93;font-weight:400;font-size:11.5px}'
      + 'iframe{display:block;border:0;background:#fff}</style></head><body><div class="wrap">'
      + '<h1>' + esc(name.replace(/^t783-小墙-|\.html$/g, '')) + '墙 · ' + pages.length + ' 格 × ' + W + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（可交互）。点标题在新标签打开整页。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    const refs = [...page.matchAll(/(?:src|href)="([^"#]+\.html)"/g)].map((m) => m[1]);
    const dead = refs.filter((r) => !existsSync(resolve(WALL, decodeURIComponent(r))));
    for (const d of dead) reds2.push('墙页引用 ' + d + '，盘上没有');
    made.links += refs.length;
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, links: made.links, reds: reds2 };
}
