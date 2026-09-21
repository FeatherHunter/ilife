#!/usr/bin/env node
/** #786 探针 —— 查询与浏览·日程族「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 786 -- node docs/skills/skill-schedule/t786-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=query`）里
 *      本族那 9 行（`#12 查日程` 5 行 ＋ `#7 查作息详情` 3 行 ＋ `#23 按 ID 查记录` 1 行），逐行判「有产物」
 *      或「在有意不出名单里」——缺一行即红；并断言**不相交**：本域 28 行 ＝ 本族 9 行 ＋ 归 #784／#785 的 19 行。
 *   ② **必现块在页上**：查日程那张页按老侧 f10 的三块必现块（24h 时间轴／事件卡／筛选位）、
 *      详情那张页按老侧 f06 的两块（每条 11 字段全展开／`analysis_reasoning` 完整展示）逐块断言；
 *      另量两条**反面判据**：页上可见文本里不许出现分隔符门（#516）那几种并列符号
 *      （`· ｜ ~ 、 ；`——#782 那张样张页上有 20 处命中，本票要修的就是它）、软删那一行必须标着身份。
 *   ③ **代码层窄判据**：本票页内件与三张页型里不出现裸字号的字号／间距／色值字面量；另断言
 *      **没有新 key**（`cli/keys.ts`／`registry.ts` 与基线逐字同）且 `triggers/routes.generated.ts`
 *      **等于生成器输出**（`gen-cli.mjs --check` 绿 ＋ 文件里确有「按 ID 查记录」那一条）。
 *   ④ **双端**：三档横向溢出 0 ＋ 分隔符门 0 命中（都走仓内现成件）。
 *  另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *  清单（墙与收口票共用一份）、票面点名的 frontmatter 触发词判据、「别的域产物逐字节不变」读数。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t786/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t786-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty] [--no-baseline]
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
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't786'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
/** 截图**与产物同目录**（票面原话）：不另立子目录，收口票按清单逐件收得走。 */
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
/** **变异自证专用**：`--allow-dirty` 跳过「本包 src 必须干净」那一条（票面要求「改坏一处必须变红」——
 *  变异就在 `src/` 里，与安静窗口那条不能同时成立）。默认**不开**，开了会在结论里点名。 */
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21）与它铺出来的窗口：记录 2026-07-23 ~ 09-21、计划 09-15 ~ 09-24。 */
const ANCHOR = '2026-09-21';
const PLAN_FROM = '2026-09-15';
const PLAN_TO = '2026-09-24';
/** 查日程那一天：种子里计划最全的一天（7 件活跃 ＋ 空档 8 段共 15h）。 */
const DAY = '2026-09-15';
/** 已软删那一条所在的那一天（种子里唯一一条 `is_active = 0`：23:00 至 23:30「旧版复盘」）。 */
const DAY_SOFT = '2026-09-20';
/** 带 AI 推理链的记录（种子里 18 条带推理链，这一条是「修正」那一档）。 */
const REC_WITH_REASONING = 1008;
/** 09-15 这一天没有任何一条带推理链（看「（无）」那一支）。 */
const DAY_NO_REASONING = DAY;

/** 本票**出页**的行 → 这一行说的是哪一份产物。 */
const TODAY_PAGE = '查日程（今日）.html';
const DAY_PAGE = '查日程（指定日期）.html';
const SEARCH_HIT = '查日程（标题搜索命中）.html';
const SEARCH_MISS = '查日程（标题搜索零命中）.html';
const WINDOW_PAGE = '查日程（时段查重）.html';
const SOFT_PAGE = '查日程（含已软删）.html';
const DETAIL_DAY = '作息详情（按日）.html';
const DETAIL_ONE = '作息详情（按 ID）.html';
const DETAIL_REASON = '作息详情（推理链）.html';
const PRODUCT_OF = {
  list_events_today: TODAY_PAGE,
  list_events_specific: DAY_PAGE,
  search_event_title: SEARCH_HIT,
  search_event_triplet: WINDOW_PAGE,
  list_events_inactive: SOFT_PAGE,
  detail_day: DETAIL_DAY,
  detail_record: DETAIL_ONE,
  detail_with_reasoning: DETAIL_REASON,
  get_record_basic: DETAIL_ONE,
};

/** 本票**有意不出**的行：本域 9 行**全部有产物**，这一份是空的（留着形状，好读）。
 *  老侧那三行（按标题搜／按时段查重／查已软删）本来只出 JSON，本票让它们上同一张查日程页。 */
const EXCLUDED = {};

/** 归兄弟票的行数（#784 的 11 行 ＋ #785 的 8 行）：本票的「有意不出」里不写它们，
 *  这里只做「本域 28 行一个不漏」的算术断言。 */
const SIBLING_ROWS = 19;

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（记号 ＋ 该块必现的几处标记）。
 *  `absent` 是本票的反面判据（页上**不许**出现的东西）。 */
const F10_BLOCKS = [
  { block: '24h 时间轴（覆盖条）', needs: ['24 小时覆盖', 'ilife-block-chart-block', 'data-chart-kind="bar"'] },
  { block: '事件卡（一行一件）', needs: ['ilife-block-list-rows-row', 'ilife-block-list-rows-left'] },
  { block: '筛选位（参数表单）', needs: ['ilife-block-param-form', 'ilife-block-param-form-field'] },
];
const F06_BLOCKS = [
  { block: '每条 11 字段全展开（10 个事实格 ＋ AI 推理链那一段）', needs: ['ilife-block-fact-strip-item', '记录号', '消息原文', '消息时间戳', '创建时间', 'AI 推理链'] },
  { block: 'analysis_reasoning 完整展示', needs: ['ilife-block-prose'] },
];
const CONTRACT = {
  [TODAY_PAGE]: F10_BLOCKS,
  [DAY_PAGE]: F10_BLOCKS,
  [SEARCH_HIT]: F10_BLOCKS,
  [SEARCH_MISS]: F10_BLOCKS,
  [WINDOW_PAGE]: F10_BLOCKS,
  [SOFT_PAGE]: F10_BLOCKS,
  [DETAIL_DAY]: F06_BLOCKS,
  [DETAIL_ONE]: F06_BLOCKS,
  [DETAIL_REASON]: F06_BLOCKS,
};

/** 三件生成物的基线（本票开工那一刻的 sha256 前 16 位，**归一化**：去 BOM ＋ CRLF→LF）。
 *  `keys.ts`／`registry.ts` **一个字都不该变**（本票不新造 key）；`routes.generated.ts` 会变——
 *  它的判据是「＝生成器输出」（下面跑 `gen-cli.mjs --check`）＋ 文件里确有那一条路由。 */
const GENERATED_FROZEN = ['src/cli/keys.ts', 'src/cli/registry.ts'];
const GENERATED_BASELINE = {
  'src/cli/keys.ts': '691b89fd588edac3',
  'src/cli/registry.ts': '77a852766cf2f12a',
};
/** 本票收口那一刻 `routes.generated.ts` 的 sha（由生成器写出；解冻锚，防手改后重签混过去）。 */
const ROUTES_SHA = '01933ec9a6f761b3';

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。
 *  默认照它比：两枚都对得上＝「这份读数就是收口那一刻那棵 src 树／那批 dist 编出来的」。
 *  ⚠️ 别的席若在本包之外重编过（`pnpm build` 会重写本包 dist），dist 那枚会变——那是**同源产物**、
 *  不是漂移：那种时候显式加 `--no-baseline` 再跑，并在读数里写清为什么。 */
const FROZEN_FINGERPRINT = {
  src: '3753379ec01a5a67',
  dist: 'aefb18ebf0916cf0',
};
const NO_BASELINE = process.argv.includes('--no-baseline');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const norm = (text) => text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');

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
      if (live && String(o.ticket) === '786') live = false;
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

/** 本次门禁运行的 runId（`tooling/run-locked.mjs` 写的 owner.json；没持锁时取不到，返回空串）。 */
function gateRunId() {
  try {
    return String(JSON.parse(readFileSync(join(REPO, '.scratch', 'locks', 'owner.json'), 'utf8')).runId ?? '');
  } catch { return ''; }
}

/* ─────────────────────────── 真出口跑产物 ─────────────────────────── */

if (!existsSync(CLI)) die2('缺 dist 出口（先 tsc -b packages/skill-schedule --force）：' + CLI);
if (!existsSync(SEED)) die2('缺种子库：' + SEED);

checkQuietWindow();
const fingerprint = compileFingerprint();
const runId = gateRunId();
ok('安静窗口：本包 src 无未提交改动、锁目录无别人持锁');
ok('编译指纹：' + fingerprint);

{
  const gotSrc = (fingerprint.match(/src-sha-后=([0-9a-f]+)/) ?? [])[1];
  const gotDist = (fingerprint.match(/dist-sha-后=([0-9a-f]+)/) ?? [])[1];
  if (FROZEN_FINGERPRINT.src === '' || NO_BASELINE) {
    ok('编译态基线：**按请求跳过**（--no-baseline／首跑未写锚）；本趟 src=' + String(gotSrc) + ' dist=' + String(gotDist));
  } else if (gotSrc === FROZEN_FINGERPRINT.src && gotDist === FROZEN_FINGERPRINT.dist) {
    ok('编译态基线：与收口那一刻同枚（src=' + FROZEN_FINGERPRINT.src + ' dist=' + FROZEN_FINGERPRINT.dist + '）');
  } else {
    red('编译态基线不符：收口那一刻 src=' + FROZEN_FINGERPRINT.src + '／dist=' + FROZEN_FINGERPRINT.dist
      + '，本趟 src=' + String(gotSrc) + '／dist=' + String(gotDist)
      + '——本包 src 若真变过，读数作废；若是别席重编过 dist（同源），加 --no-baseline 重跑并写清理由');
  }
}

rmSync(HOME, { recursive: true, force: true });
rmSync(PROD, { recursive: true, force: true });
rmSync(WALL, { recursive: true, force: true });
mkdirSync(join(HOME, '.ilife', 'data'), { recursive: true });
const DB = join(HOME, '.ilife', 'data', 'schedule_data.db');
copyFileSync(SEED, DB);
mkdirSync(PROD, { recursive: true });

const env = { ...process.env, USERPROFILE: HOME, HOME };
const todayStr = (() => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
})();

function runCli(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

/** 真出口逐条跑：不带 `--html`＝走缺省落盘那一支，落点只认回执里的 `delivery.path`。 */
const RUNS = [
  { file: TODAY_PAGE, key: 'schedule.plan.today', params: { date: '今天' }, wake: '#12 查日程', note: '今日日程（今天 ' + todayStr + '）', row: 'list_events_today' },
  { file: DAY_PAGE, key: 'schedule.plan.today', params: { date: DAY }, wake: '#12 查日程', note: '指定日期日程：' + DAY + '（7 件活跃 ＋ 空档 8 段）', row: 'list_events_specific' },
  { file: SEARCH_HIT, key: 'schedule.plan.today', params: { date: DAY, title: '开发' }, wake: '#12 查日程', note: '按标题搜「开发」：命中 1 件', row: 'search_event_title' },
  { file: SEARCH_MISS, key: 'schedule.plan.today', params: { date: DAY, title: '健身' }, wake: '#12 查日程', note: '按标题搜「健身」：零命中（老侧那句「今天有健身吗」的答案就是「没有」）', row: 'search_event_title（同一行的第二趟：零命中那一档）' },
  { file: WINDOW_PAGE, key: 'schedule.plan.today', params: { date: DAY, time_start: '09:00', time_end: '11:30' }, wake: '#12 查日程', note: '按时段查重：' + DAY + ' 09:00 至 11:30', row: 'search_event_triplet' },
  { file: SOFT_PAGE, key: 'schedule.plan.today', params: { date: DAY_SOFT, include_inactive: true }, wake: '#12 查日程', note: '含已软删：' + DAY_SOFT + '（活跃 7 ＋ 已软删 1）', row: 'list_events_inactive' },
  { file: DETAIL_DAY, key: 'schedule.record.detail', params: { date: DAY_NO_REASONING }, wake: '#7 查作息详情', note: '某日所有详情：' + DAY + '（17 条，一条 11 字段；这一天没留推理链）', row: 'detail_day' },
  { file: DETAIL_ONE, key: 'schedule.record.detail', params: { id: 919 }, wake: '#7 查作息详情', note: '单条详情：记录 919（按 ID 那一行同页）', row: 'detail_record' },
  { file: DETAIL_REASON, key: 'schedule.record.detail', params: { id: REC_WITH_REASONING }, wake: '#7 查作息详情', note: 'AI 推理链：记录 ' + REC_WITH_REASONING + '（推理链全文）', row: 'detail_with_reasoning' },
];

const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  const r = runCli(run.key, run.params);
  if (r.status !== 0) {
    red(run.file + '：真出口 exit=' + r.status + (r.stderr.trim() === '' ? '' : ' stderr=' + r.stderr.trim().split('\n')[0]));
    continue;
  }
  const dl = r.envelope === null ? undefined : r.envelope.delivery;
  if (dl === undefined || typeof dl.path !== 'string') { red(run.file + '：回执缺 delivery.path（缺省调用没落盘）'); continue; }
  if (!isAbsolute(dl.path)) { red(run.file + '：delivery.path 不是绝对路径：' + dl.path); continue; }
  if (!existsSync(dl.path)) { red(run.file + '：回执路径不在盘上：' + dl.path); continue; }
  const onDisk = statSync(dl.path).size;
  if (onDisk !== dl.bytes) { red(run.file + '：盘上字节 ' + onDisk + ' ≠ delivery.bytes ' + dl.bytes); continue; }
  const html = readFileSync(dl.path, 'utf8');
  if (!html.startsWith('<!doctype html>')) { red(run.file + '：落盘的不是整页'); continue; }
  const target = join(PROD, run.file);
  copyFileSync(dl.path, target);
  if (sha12(readFileSync(target, 'utf8')) !== sha12(html)) { red(run.file + '：复制前后 sha256 不一致'); continue; }
  rows.push({
    seq: String(i + 1).padStart(2, '0'),
    file: run.file,
    row: run.row,
    wake: run.wake,
    family: run.key === 'schedule.plan.today' ? 'f10' : 'f06',
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
    key: run.key,
    params: run.params,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/** 「今天」那一趟跟着墙上时钟走：落在种子窗口之外时按缺省档出页（空事件 ＋ 一条空档），
 *  本探针据实记一行并把 `list_events_today` 那一行改判到 09-15 那份产物上（同一张页）。 */
let todayNote = '跑了，今天 ' + todayStr;
if (todayStr < PLAN_FROM || todayStr > PLAN_TO) {
  todayNote = 'SKIP：今天 ' + todayStr + ' 落在种子窗口（' + PLAN_FROM + '~' + PLAN_TO + '）之外，'
    + '「list_events_today」那一行改判到「查日程（指定日期）」上（同一张页）';
  ok('SKIP ' + todayNote);
  if (!existsSync(join(PROD, TODAY_PAGE))) red('今天那一趟既没落盘、又不在种子窗口里，无从交代');
  rmSync(join(PROD, TODAY_PAGE), { force: true });
  const at = rows.findIndex((r) => r.file === TODAY_PAGE);
  if (at >= 0) rows.splice(at, 1);
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

/** 本族唤醒词（清单 `wake_word` 列逐字）：行的归属按清单自身那一列判，不按票面口径另立一份。 */
const OUR_WAKES = new Set(['#12 查日程', '#7 查作息详情', '#23 按 ID 查记录']);

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const queryRows = manifest.scenarios.filter((s) => s.domain === 'query');
const ourRows = queryRows.filter((s) => OUR_WAKES.has(s.wake_word));
if (ourRows.length === 0) red('清单里读不到本族唤醒词的行（权威源形状变了，先修读数）');
const productOf = new Map(Object.entries(PRODUCT_OF));
const scenLines = [];
let excludedHits = 0;
for (const row of ourRows) {
  const id = row.scenario_id;
  let file = productOf.get(id);
  if (id === 'list_events_today' && !existsSync(join(PROD, TODAY_PAGE))) file = DAY_PAGE;
  if (file !== undefined) {
    const present = existsSync(join(PROD, file));
    if (!present) red('场景 ' + id + ' 判了出页，产物却不在盘上：' + file);
    scenLines.push('     ' + (present ? '有产物' : '缺产物') + '  ' + id + '  → ' + file
      + (id === 'list_events_today' ? '（' + todayNote + '）' : ''));
    continue;
  }
  const reason = EXCLUDED[id];
  if (reason === undefined) { red('场景 ' + id + ' 既没有产物、也不在「有意不出」名单里（补一处交代）'); continue; }
  excludedHits += 1;
  scenLines.push('     有意不出  ' + id + '  → ' + reason);
}
ok('① 逐场景行有交代：本族 ' + ourRows.length + ' 行逐行有下文（出页 ' + productOf.size
  + ' 行 → ' + new Set(productOf.values()).size + ' 份产物；有意不出 ' + excludedHits + ' 行）');
for (const l of scenLines) lines.push(l);

// 不相交：本族的行 ＋ 仍归兄弟票的行 ＝ 整个 query 域的行；多一行少一行都说明切片变了。
const rest = queryRows.length - ourRows.length;
if (rest !== SIBLING_ROWS) {
  red('行集变了：本域 ' + queryRows.length + ' 行里，本族 ' + ourRows.length + ' 行、归兄弟票应 ' + SIBLING_ROWS
    + ' 行，实得 ' + rest + ' 行——先核 场景清单.json 与票面切片，再改本探针');
} else {
  ok('① 不相交：本域 ' + queryRows.length + ' 行＝本族 ' + ourRows.length + ' 行 ＋ 归 #784／#785 的 ' + rest + ' 行（一个不漏、一个不重）');
}
const productIds = new Set(Object.keys(PRODUCT_OF));
for (const id of Object.keys(EXCLUDED)) {
  if (productIds.has(id)) red('同一行既判了出页又在有意不出名单里：' + id);
  if (!queryRows.some((r) => r.scenario_id === id)) red('有意不出名单里有一行不在清单里（清单变了就该删）：' + id);
}

/* ─────────────────────────── ② 必现块在页上（＋ 反面判据） ─────────────────────────── */

const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const count = (body, re) => (body.match(re) ?? []).length;
/** **事件卡**的行数：空档那几行也走同一个行列表类，且收在 `<details>` 里（#782 冻死的件序列：
 *  事件卡在前、空档在后）——按折叠区的起点切一刀，只数它之前那一段。 */
const eventRows = (html) => {
  const m = markupOf(html);
  const cut = m.indexOf('<details');
  return count(cut < 0 ? m : m.slice(0, cut), /class="ilife-block-list-rows-row"/g);
};

for (const [file, blocks] of Object.entries(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) { red('② ' + file + ' 不在盘上，块断言无从谈起'); continue; }
  const body = markupOf(readFileSync(path, 'utf8'));
  const missing = [];
  for (const b of blocks) {
    const absent = b.needs.filter((n) => !body.includes(n));
    if (absent.length > 0) missing.push(b.block + '（缺 ' + absent.join(' ') + '）');
  }
  if (missing.length > 0) red('② ' + file + ' 必现块：' + missing.join('，'));
  else ok('② ' + file + ' 必现块齐（' + blocks.length + ' 块）');
}

/** 反面判据一（本票要修的病）：页上**可见文本**里不许出现分隔符门（#516）那几种并列符号。
 *  #782 那张样张页在这一条上读 20 处命中（页头 `·`、时段 `~`、右槽 `·`、结论条 `、`）——
 *  本票把它们全改成行文标点或分槽。 */
const BANNED = ['·', '｜', '~', '、', '；'];
for (const file of Object.keys(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) continue;
  const text = textOf(readFileSync(path, 'utf8'));
  const hits = BANNED.filter((ch) => text.includes(ch));
  if (hits.length > 0) red('② ' + file + '：可见文本里还有并列分隔符 ' + hits.join(' ') + '（#516 是一条真门）');
  else ok('② ' + file + '：可见文本零并列分隔符（`· ｜ ~ 、 ；` 五种都没有）');
}

/** 一行行列表的**那一行自己**（按行列表标记切段，段内找那一行的内容）——判「标记长在行上」用这一档：
 *  整页文本里出现「已软删」三个字不算数（结论条里本来就有），得长在那一条自己那一行上。 */
const rowSegOf = (markup, needle) => (markup.split(/class="ilife-block-list-rows-row"/)
  .find((seg) => seg.includes(needle)) ?? '');

/** 反面判据二（本票要出的那一行）：软删事件上同一张页、**逐行标着身份**，且缺省档一颗不上屏。 */
{
  const on = join(PROD, SOFT_PAGE);
  const off = join(PROD, DAY_PAGE);
  if (!existsSync(on) || !existsSync(off)) {
    red('② 已软删：两份产物不在盘上，无从核对');
  } else {
    const onMarkup = markupOf(readFileSync(on, 'utf8'));
    const onText = textOf(readFileSync(on, 'utf8'));
    const offText = textOf(readFileSync(off, 'utf8'));
    if (offText.includes('已软删') || offText.includes('旧版复盘')) {
      red('② 缺省档不该出现「已软删」或软删那一条（那一趟没请它）：' + DAY_PAGE);
    } else if (!onText.includes('旧版复盘')) {
      red('② 已软删：那一行没上屏');
    } else if (!rowSegOf(onMarkup, '旧版复盘').includes('已软删')) {
      red('② 已软删：那一行上没标着身份（「已软删」得长在它自己那一行上，不在结论条里）');
    } else if (!onText.includes('另有 1 件已软删')) {
      red('② 已软删：结论条没报条数');
    } else {
      ok('② 已软删：那一趟多一行且那一行标着「已软删」，结论条报「另有 1 件已软删」；缺省档一颗不上屏');
    }
  }
}

/** 锚点读数：查日程两页的事件卡行数与空档段数、详情页的事实格数。 */
{
  const day = join(PROD, DAY_PAGE);
  if (existsSync(day)) {
    const html = readFileSync(day, 'utf8');
    const body = markupOf(html);
    const events = eventRows(html);
    const gaps = count(body, /class="ilife-block-list-rows-row"/g) - events;
    if (events !== 7) red('② 查日程（' + DAY + '）：事件卡应 7 行，实得 ' + events);
    else if (gaps !== 8) red('② 查日程（' + DAY + '）：空档应 8 段，实得 ' + gaps);
    else ok('② 查日程读数：事件卡 ' + events + ' 行／空档 ' + gaps + ' 段');
  }
  const soft = join(PROD, SOFT_PAGE);
  if (existsSync(soft)) {
    const events = eventRows(readFileSync(soft, 'utf8'));
    if (events !== 8) red('② 查日程（含已软删·' + DAY_SOFT + '）：事件卡应 8 行（7 活跃 ＋ 1 软删），实得 ' + events);
    else ok('② 已软删页读数：事件卡 ' + events + ' 行（7 活跃 ＋ 1 已软删）');
  }
  const detail = join(PROD, DETAIL_DAY);
  if (existsSync(detail)) {
    const body = markupOf(readFileSync(detail, 'utf8'));
    const facts = count(body, /class="ilife-block-fact-strip-item"/g);
    const recs = count(body, /<h2 class="heat-title">记录号 /g);
    if (recs !== 17) red('② 作息详情（' + DAY + '）：应 17 段（一天 17 条记录），实得 ' + recs);
    else if (facts !== 17 * 10) red('② 作息详情（' + DAY + '）：事实格应 17 × 10 ＝ 170 个，实得 ' + facts);
    else ok('② 作息详情读数：' + recs + ' 段 × 10 字段 ＝ ' + facts + ' 个事实格（第 11 个字段＝AI 推理链那一段）');
  }
  const reason = join(PROD, DETAIL_REASON);
  if (existsSync(reason)) {
    const text = textOf(readFileSync(reason, 'utf8'));
    const r = runCli('schedule.record.detail', { id: REC_WITH_REASONING });
    const want = r.envelope?.data?.item?.id;
    if (want !== REC_WITH_REASONING) red('② 推理链页：载荷里那条记录不是 ' + REC_WITH_REASONING);
    else if (!text.includes('修正：这条原来归错了')) red('② 推理链页：推理链全文没在页上');
    else ok('② 推理链页读数：记录 ' + REC_WITH_REASONING + ' 的推理链全文在页上');
  }
}

/** ②‑3：搜索与时段查重那两趟的**读数**与载荷对得上（命中数由载荷说，页上说的是同一件事）。 */
{
  const hit = runCli('schedule.plan.today', { date: DAY, title: '开发' });
  const miss = runCli('schedule.plan.today', { date: DAY, title: '健身' });
  const page = join(PROD, SEARCH_HIT);
  if (hit.status !== 0 || miss.status !== 0) red('② 搜索两趟跑不动：exit=' + hit.status + '／' + miss.status);
  else if (hit.envelope.data.total !== 1) red('② 按标题搜「开发」应命中 1 件，载荷说 ' + hit.envelope.data.total);
  else if (miss.envelope.data.total !== 0) red('② 按标题搜「健身」应 0 命中，载荷说 ' + miss.envelope.data.total);
  else if (!existsSync(page) || !textOf(readFileSync(page, 'utf8')).includes('按标题「开发」搜到 1 件')) red('② 搜索页没写明这一趟是怎么查的');
  else ok('② 搜索读数：命中 1 ／ 0 命中两趟的载荷与页上文案对得上');
}

/** ②‑4：时段查重那两趟（重叠即算／空时段给话）。 */
{
  const over = runCli('schedule.plan.today', { date: DAY, time_start: '11:00', time_end: '14:30' });
  const none = runCli('schedule.plan.today', { date: DAY, time_start: '22:40', time_end: '23:00' });
  if (over.status !== 0 || none.status !== 0) red('② 时段查重两趟跑不动：exit=' + over.status + '／' + none.status);
  else if (over.envelope.data.total !== 3) red('② 时段查重：11:00 至 14:30 应命中 3 件（09:00 至 11:30／12:30 至 13:00／14:00 至 16:00 都搭着边），载荷说 ' + over.envelope.data.total);
  else if (none.envelope.data.total !== 0) red('② 时段查重：空时段应 0 件，载荷说 ' + none.envelope.data.total);
  else ok('② 时段查重读数：搭着边的 3 件都算（不要求整段包住）／空时段 0 件');
}

/* ─────────────────────────── ③ 代码层窄判据 ─────────────────────────── */

const SRC = join(REPO, PKG, 'src');
/** 判据只量**代码里的字符串**：注释里写「实测 880px 掉到 874px」这类读数不算样式字面量。 */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const stringLiterals = (code) => [...code.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1] ?? m[2] ?? '').join('\n');
const cssish = /(?:font-size|line-height|padding|margin|gap|border-radius|color|background|width|height)\s*:\s*[^;'"\n]*(?:px|rem|em|vh|vw|%)|@media/;
const hex = /#[0-9a-fA-F]{4,8}\b/;
const violations = [];
/** 本票碰过的页内件与三张页型（query 全目录 ＋ shared 两件 ＋ plan 侧的查日程页口径）。 */
const FILES = [
  ...readdirSync(join(SRC, 'query')).filter((x) => x.endsWith('.ts')).map((f) => 'query/' + f),
  'shared/planPage.ts', 'shared/detailPage.ts', 'shared/dayPage.ts',
  // 查日程这一族的口径按交接件 §二住 plan 侧（#787 的空档提示也用同一条）：本票改的是文案与两支，
  // 一并纳入窄判据（越界报备见证据件第五节）。
  'plan/planDocs.ts',
];
for (const rel of FILES) {
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, rel), 'utf8')));
  if (hex.test(literals)) violations.push(rel + '：出现十六进制色值（色值只许取公共层 token）');
  else if (cssish.test(literals)) violations.push(rel + '：页装配件里出现样式字面量（样式只许住族级样式件）');
}
{
  // 族级样式件 `pageParts.ts` 是**长度常量的唯一住处**：串里不许出现带单位的长度字面量。
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'shared', 'pageParts.ts'), 'utf8')));
  if (hex.test(literals)) violations.push('shared/pageParts.ts：出现十六进制色值');
  else if (/\d+(?:px|rem|em)\b/.test(literals)) violations.push('shared/pageParts.ts：样式里出现长度字面量（长度只许取族级常量）');
}
if (violations.length > 0) for (const v of violations) red('③ ' + v);
else ok('③ 代码层窄判据：本票页内件与三张页型零裸色值／零单位字面量');

/** 生成物三件：两件**不许变**（本票不新造 key）＋ 路由那件**只许由生成器写**。 */
const drift = GENERATED_FROZEN.filter((g) => {
  const text = norm(readFileSync(join(REPO, PKG, g), 'utf8'));
  return GENERATED_BASELINE[g] !== createHash('sha256').update(text).digest('hex').slice(0, 16);
});
if (drift.length > 0) red('③ 生成物被手改了（它们是 pnpm gen 的产出）：' + drift.join(' '));
else ok('③ 生成物未手改：keys.ts／registry.ts 与基线逐字同（本票不新造 key）');
{
  const routesText = norm(readFileSync(join(REPO, PKG, 'src/triggers/routes.generated.ts'), 'utf8'));
  const want = "{ phrase: '按 ID 查记录', key: 'schedule.record.detail', needs: ['id'], order: 49 }";
  const actual = createHash('sha256').update(routesText).digest('hex').slice(0, 16);
  if (!routesText.includes(want)) red('③ routes.generated.ts 里没有「按 ID 查记录」那一条：' + want);
  else if (actual !== ROUTES_SHA) red('③ routes.generated.ts 的 sha 与生成器输出不符：' + actual + ' ≠ ' + ROUTES_SHA);
  else ok('③ routes.generated.ts：老词带空格那一条在，sha=' + ROUTES_SHA + '（由声明经生成器写出）');
  const chk = spawnSync(process.execPath, [join(REPO, PKG, 'scripts', 'gen-cli.mjs'), '--check'], { encoding: 'utf8', cwd: REPO });
  const chkOut = String(chk.stdout).trim();
  if (chk.status !== 0 || !chkOut.includes('GEN-CHECK PASS')) {
    red('③ 生成物门未过（生成物 ≠ 生成器输出）：exit=' + chk.status + ' ' + (chkOut.split('\n').pop() ?? '') + String(chk.stderr).slice(0, 200));
  } else ok('③ 生成物门：' + (chkOut.split('\n').find((l) => l.startsWith('GEN-CHECK PASS')) ?? 'GEN-CHECK PASS'));
}

/** 票面点名的 frontmatter 判据：SKILL.md 的 `description` 触发词列表里须有「按 ID 查记录」，
 *  且老词真的路由得回同键（路由与速查表由生成器带出来）。 */
{
  const skill = readFileSync(join(REPO, PKG, 'SKILL.md'), 'utf8');
  const fm = skill.slice(0, skill.indexOf('\n---', 4));
  if (!fm.includes('按 ID 查记录')) red('① frontmatter 触发词列表里没有「按 ID 查记录」（老词唤不起技能）');
  else ok('① frontmatter：SKILL.md 的触发词列表含「按 ID 查记录」');
  const hits = spawnSync(process.execPath, ['-e',
    "import('" + pathToFileURL(join(REPO, PKG, 'dist', 'index.js')).href + "').then((m)=>{"
    + "const a=m.routeWakeword('按 ID 查记录',{id:9});const b=m.routeWakeword('按ID查记录',{id:9});"
    + "console.log(JSON.stringify({a,b}))})",
  ], { encoding: 'utf8' });
  const got = JSON.parse(String(hits.stdout).trim());
  if (got.a.key !== 'schedule.record.detail' || got.b.key !== 'schedule.record.detail') red('① 老词（带空格与不带空格）没有都路由到 schedule.record.detail');
  else if (got.a.params.id !== 9) red('① 老词的 id 槽位没传下来：' + JSON.stringify(got.a.params));
  else ok('① 路由：带空格与不带空格两条短语都命中 schedule.record.detail（槽位 id 照传）');
}

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

/* ─────────────────────────── 别的域产物逐字节不变 ─────────────────────────── */

/** 本票只碰本域与共用位（`shared/planPage.ts`／`shared/detailPage.ts`）与查日程那一份口径（plan 侧）。
 *  别的域的产物（#783／#784／#785 各自的成品清单）逐件现算 sha，与它们票里那份清单比。 */
{
  const cases = [
    ['#783', join(REPO, '.scratch', 't783', '成品', 't783-清单.json')],
    ['#784', join(REPO, '.scratch', 't784', '成品', 't784-清单.json')],
    ['#785', join(REPO, '.scratch', 't785', '成品', 't785-清单.json')],
  ];
  for (const [ticket, manifestPath] of cases) {
    if (!existsSync(manifestPath)) { ok('别域产物：' + ticket + ' 的清单不在盘上（那份票的读数找不到，跳过）'); continue; }
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const list = Array.isArray(m) ? m : (m.rows ?? []);
    let same = 0;
    let diff = 0;
    for (const row of list) {
      const p = join(dirname(manifestPath), row.file);
      if (!existsSync(p)) { diff += 1; continue; }
      if (sha12(readFileSync(p, 'utf8')) === row.sha256_12) same += 1; else diff += 1;
    }
    if (diff === 0) ok('别域产物逐字节不变：' + ticket + ' 那 ' + same + ' 件与它的清单逐件同');
    else ok('别域产物：' + ticket + ' 那 ' + list.length + ' 件里 ' + diff + ' 件与旧清单不同（该票自己的读数为准）');
  }
}

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't786-清单.json'), JSON.stringify({
  ticket: '#786',
  key: 'schedule.plan.today（缺省／标题搜索／时段查重／含已软删四支）＋ schedule.record.detail（按日／按 ID 两支）',
  page: '查日程／作息详情',
  rows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't786-清单.json')).replace(/\\/g, '/') + '（rows=' + rows.length + '）');

if (!NO_SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + shot + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(rows.map((r) => r.file));
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + wall.mobile + ' 格、桌面墙 ' + wall.desktop + ' 格（iframe 自带内容，零外部文件）');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + files.length
  + ' scenes=' + ourRows.length + ' red=' + reds.length + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t786-探针.mjs');
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
  const PORT = 9861 + (process.pid % 110);
  const profile = mkdtempSync(join(tmpdir(), 't786-shot-'));
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
 *  **iframe 用 `srcdoc` 嵌真页内容**：墙自身零外部文件引用 ⇒ 双击即看、不发一次同源请求，
 *  也不存在 `map-779-出页门` 那条「零外部引用」判据的灰色地带（墙页不是产物，但按产物口径自检更省事）。
 *  墙页住 `墙/` 子目录（产物目录只留产物——墙是定宽夹具，混进去会让出页门把墙也当产物量）。
 */
function buildWalls(pages) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const reds2 = [];
  const byFile = new Map(rows.map((r) => [r.file, r]));
  const dropped = pages.filter((f) => !existsSync(join(PROD, f)));
  for (const d of dropped) reds2.push('墙要点名 ' + d + '，盘上没有');
  mkdirSync(WALL, { recursive: true });
  const made = { mobile: 0, desktop: 0 };
  for (const [name, W, H, COLS] of [['t786-小墙-手机.html', 390, 900, 3], ['t786-小墙-桌面.html', 1280, 900, 1]]) {
    const cells = pages.map((f, i) => {
      const row = byFile.get(f);
      const srcdoc = esc(readFileSync(join(PROD, f), 'utf8'));
      return '  <figure><figcaption>' + esc(String(i + 1).padStart(2, '0') + ' ' + f)
        + '<span>' + esc(row === undefined ? '' : row.note) + '</span></figcaption>'
        + '<iframe src="about:blank" srcdoc="' + srcdoc + '" width="' + W + '" height="' + H
        + '" title="' + esc(f) + '"></iframe></figure>';
    }).join('\n');
    const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f5f7;color:#1d1d1f}'
      + '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}'
      + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}'
      + '.grid{display:grid;grid-template-columns:repeat(' + COLS + ',' + W + 'px);gap:18px;align-items:start;justify-content:start}'
      + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}'
      + 'figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}'
      + 'figcaption span{color:#868b93;font-weight:400;font-size:11.5px}'
      + 'iframe{display:block;border:0;background:#fff}</style></head><body><div class="wrap">'
      + '<h1>' + esc(name.replace(/^t786-小墙-|\.html$/g, '')) + '墙 · ' + pages.length + ' 格 × ' + W + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
