#!/usr/bin/env node
/** #785 探针 —— 查询与浏览·范围与跨天「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 785 -- node docs/skills/skill-schedule/t785-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=query`）里
 *      本族那 8 行，逐行判「有产物」或「在有意不出名单里」——缺一行即红；并断言**不相交**：
 *      本域 28 行 ＝ 本族 8 行 ＋ 归 #784／#786 的 20 行，一个不漏、一个不重。
 *   ② **必现块在页上**：按清单里该场景所属老侧家族的 `blocks_old`（`families[].blocks_old`），
 *      逐块断言页上可见（判据只看标记：`<style>` 里也有类名，整串查等于白查）；另量几条**反面判据**：
 *      区间页的可见文本里不许出现 `l1.工作` 这类原始键（本票要修的就是它）。
 *   ③ **代码层窄判据**：本票页内件与两张新页型里不出现裸字号的字号／间距／色值字面量（色值只许取
 *      公共层 token，长度只许取族级样式件常量）；另断言**没有新 key**（`cli/keys.ts`／`registry.ts`
 *      与基线逐字同）且 `triggers/routes.generated.ts` **等于生成器输出**（`gen-cli.mjs --check` 绿
 *      ＋ 文件里确有「周视图」那一条）——三件生成物只许由 `pnpm gen` 带来变化。
 *   ④ **双端**：三档横向溢出 0（走图级出页门）＋ 分隔符门 0 命中（走 calorie 那件判据工具）。
 *   另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *   清单（墙与收口票共用一份），以及票面点名的 frontmatter 触发词判据。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t785/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t785-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty] [--no-baseline]
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
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't785'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
/** 截图**与产物同目录**（票面原话）：不另立子目录，收口票按清单逐件收得走。 */
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
/** **变异自证专用**：`--allow-dirty` 跳过「本包 src 必须干净」那一条（票面要求「改坏一处必须变红」——
 *  变异就在 `src/query/` 里，与安静窗口那条不能同时成立）。默认**不开**，开了会在结论里点名。 */
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21）与它铺出来的窗口：记录 2026-07-23 ~ 09-21、计划 09-15 ~ 09-24。 */
const ANCHOR = '2026-09-21';
const SEED_LAST = '2026-09-21';
/** 区间那一趟的显式窗口（21 天，都在种子里）。 */
const R_FROM = '2026-09-01';
const R_TO = '2026-09-21';
/** 周视图锚点：2026-09-15（周二）所在周＝09-14 周一 至 09-20 周日，七天都有记录。 */
const WEEK_ANCHOR = '2026-09-15';
const WEEK_FROM = '2026-09-14';
const WEEK_TO = '2026-09-20';
/** 多日计划那一趟的三天（种子里每天都有 7~8 条计划）。 */
const MULTI = ['2026-09-15', '2026-09-16', '2026-09-17'];

/** 本票**出页**的行 → 这一行说的是哪一份产物（同一枚 key 的几次运行，按查法各落一份）。 */
const RANGE_21 = '区间汇总（21 天）.html';
const RANGE_WEEK = '区间汇总（本周）.html';
const OVERVIEW_1 = '24h 概览（1 天）.html';
const OVERVIEW_N = '查多日计划（3 天）.html';
const WEEK_PAGE = '周视图.html';
const PRODUCT_OF = {
  summary_range_default: RANGE_21,
  range_default: RANGE_21,
  range_this_week: RANGE_WEEK,
  query_plans_today: OVERVIEW_1,
  query_plans_multi: OVERVIEW_N,
  week_view: WEEK_PAGE,
};

/** 本票**有意不出**的行：行 → 理由（理由要能被人直接读，不许写「见上」）。 */
const EXCLUDED = {
  summary_range_full: '老侧这条只出**纯文本**汇总（`summary`／`report` 那一支，不产 HTML）；它要的读数落在同一枚 key 的区间汇总页上（探针当场断言页上有分类聚合与 7 维趋势）',
  range_text: '老侧这条只出**纯文本**降级（`range` 的文本档，不产 HTML）；同上，同一张区间汇总页把它的诉求答全',
};

/** 归兄弟票的行数（#784 的 11 行 ＋ #786 的 9 行）：本票的「有意不出」里不写它们，
 *  这里只做「本域 28 行一个不漏」的算术断言。 */
const SIBLING_ROWS = 20;

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（记号 ＋ 该块必现的几处标记）。
 *  `absent` 是本票的反面判据（页上**不许**出现的东西，例如原始键）。 */
const CONTRACT = {
  [RANGE_21]: [
    { block: '分类聚合', needs: ['分类聚合', 'ilife-block-dist-row', 'ilife-block-dist-row-name'] },
    { block: '7 维趋势', needs: ['7 维趋势', 'ilife-block-chart-block', 'data-chart-kind="line"'] },
    { block: '睡眠统计', needs: ['夜间睡眠', '午睡', '合计'] },
    { block: '每日明细（一行一天）', needs: ['ilife-block-list-rows-row'] },
    { block: '健康分（读数卡）', needs: ['健康分', 'ilife-block-kpi-card-value'] },
  ],
  [RANGE_WEEK]: [
    { block: '分类聚合', needs: ['分类聚合', 'ilife-block-dist-row'] },
    { block: '7 维趋势', needs: ['7 维趋势', 'ilife-block-chart-block'] },
    { block: '睡眠统计', needs: ['夜间睡眠', '午睡'] },
  ],
  [OVERVIEW_1]: [
    { block: '同小时合并（口径给的合并串在页上）', needs: ['ilife-block-list-rows-row'] },
    { block: '多日聚合（不含 notes／completion／飞书状态）', needs: ['这一页是 24h 聚合视图', '不含备注与完成状态', '也不含飞书同步状态'] },
    { block: '一天 24 格（空桶也占格）', needs: ['未规划'] },
  ],
  [OVERVIEW_N]: [
    { block: '同小时合并（口径给的合并串在页上）', needs: ['ilife-block-list-rows-row'] },
    { block: '多日聚合（不含 notes／completion／飞书状态）', needs: ['这一页是 24h 聚合视图', '也不含飞书同步状态'] },
    { block: '一天一行 ＋ 逐日 24 格', needs: ['多日概览', 'ilife-block-data-table', '未规划'] },
  ],
  [WEEK_PAGE]: [
    { block: '7×24 全分类热力图', needs: ['7×24 全分类热力图', 'heat-row', 'heat-cell'] },
    { block: '分类总览', needs: ['ilife-block-dist-row', 'heat-legend'] },
    { block: '每日汇总', needs: ['ilife-block-list-rows-row'] },
    { block: '健康分', needs: ['健康分', 'ilife-block-kpi-card-value'] },
    { block: '复制 prompt 位', needs: ['复制给 AI'] },
  ],
};

/** 三件生成物的基线（本票开工那一刻的 sha256 前 16 位，**归一化**：去 BOM ＋ CRLF→LF）。
 *  `keys.ts`／`registry.ts` **一个字都不该变**（本票不新造 key）；`routes.generated.ts` 会变——
 *  它的判据是「＝生成器输出」（下面跑 `gen-cli.mjs --check`），不是与基线比。 */
const GENERATED_FROZEN = ['src/cli/keys.ts', 'src/cli/registry.ts'];
const GENERATED_BASELINE = {
  'src/cli/keys.ts': '691b89fd588edac3',
  'src/cli/registry.ts': '77a852766cf2f12a',
};
/** 本票收口那一刻 `routes.generated.ts` 的 sha（由生成器写出；解冻锚，防手改后重签混过去）。 */
const ROUTES_SHA = '6cc1fedf8fb4e14f';

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。
 *  默认照它比：两枚都对得上＝「这份读数就是收口那一刻那棵 src 树／那批 dist 编出来的」。
 *  ⚠️ 别的席若在本包之外重编过（`pnpm build` 会重写本包 dist），dist 那枚会变——那是**同源产物**、
 *  不是漂移：那种时候显式加 `--no-baseline` 再跑，并在读数里写清为什么。 */
const FROZEN_FINGERPRINT = {
  src: '7e7b3912888ce0fb',
  dist: 'a4f98dbc707d474c',
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
      if (live && String(o.ticket) === '785') live = false;
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

/** 先把「同小时合并」那一条种进本趟的家目录副本（种子里没有同小时撞格）：**种在 24h 概览要渲染的
 *  那一天**（09-15 的 07 点，与种子里的「晨间冥想」同小时）；走真写命令（`schedule.plan.write
 *  op=ensure`），不是改库——同一条链上验过。 */
{
  const r = runCli('schedule.plan.write', { op: 'ensure', date: '2026-09-15', time_start: '07:40', time_end: '08:00', title: '同日第二件', feishu: 'skip' });
  if (r.status !== 0) red('种子（同小时那一条）没写成：exit=' + r.status + ' ' + r.stderr.trim().split('\n')[0]);
  else ok('种子：2026-09-15 07 点补了第二条事件（同小时合并要在页上看得见）');
}

/** 真出口逐条跑：不带 `--html`＝走缺省落盘那一支，落点只认回执里的 `delivery.path`。 */
const RUNS = [
  { file: RANGE_21, key: 'schedule.record.range', params: { start: R_FROM, end: R_TO }, note: '区间汇总：21 天（种子里 09-01 ~ 09-21，每天 17 块）' },
  { file: OVERVIEW_1, key: 'schedule.plan.today', params: { view: 'aggregate', date: '2026-09-15' }, note: '24h 概览：一天 24 格（09-15）' },
  { file: OVERVIEW_N, key: 'schedule.plan.today', params: { view: 'aggregate', dates: MULTI }, note: '查多日计划：三天一天一行 ＋ 逐日 24 格' },
  { file: WEEK_PAGE, key: 'schedule.record.range', params: { view: 'week', date: WEEK_ANCHOR }, note: '周视图：锚点那周的周一至周日（09-14 至 09-20）' },
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
    wake: run.file === WEEK_PAGE ? '周视图' : (run.file === RANGE_21 ? '#5 汇总作息（＃9 查作息范围同页）' : '#15 24h 概览'),
    family: run.file === WEEK_PAGE ? 'f08' : (run.file === RANGE_21 ? 'f02' : 'f11'),
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
    key: run.key,
    params: run.params,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/** 第四份区间产物：**相对范围**那一趟（`range=本周`）——它是「本周范围」那一行的真身。
 *  周窗口跟着墙上时钟走：落在种子窗口之外（区间为空）时按「缺失阻断」退出 4，本探针据实记一行
 *  并把它那一行改判到 21 天那份产物上（都是同一张区间汇总页），不拿时钟当假绿。 */
let weekRangeNote = '';
{
  const r = runCli('schedule.record.range', { range: '本周' });
  if (r.status === 0 && r.envelope?.delivery?.path !== undefined) {
    const html = readFileSync(r.envelope.delivery.path, 'utf8');
    copyFileSync(r.envelope.delivery.path, join(PROD, RANGE_WEEK));
    rows.push({
      seq: '05', file: RANGE_WEEK, wake: '#9 查作息范围', family: 'f02',
      bytes: Buffer.byteLength(html, 'utf8'), sha256_12: sha12(html),
      note: '相对范围那一趟：`--params {"range":"本周"}`（今天 ' + todayStr + '）',
      key: 'schedule.record.range', params: { range: '本周' },
    });
    weekRangeNote = '跑了，今天 ' + todayStr;
    ok(RANGE_WEEK + '：相对范围 `range=本周` 真跑通（今天 ' + todayStr + '）');
  } else if (r.status === 4) {
    weekRangeNote = 'SKIP：本周（今天 ' + todayStr + '）落在种子窗口之外，按缺失阻断退出 4；「range_this_week」那一行改判到 21 天那份产物上';
    ok('SKIP ' + weekRangeNote);
  } else {
    red('相对范围那一趟异常退出：exit=' + r.status + ' ' + r.stderr.trim().split('\n')[0]);
  }
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

/** 本族唤醒词（清单 `wake_word` 列逐字）：行的归属按清单自身那一列判，不按票面口径另立一份。 */
const OUR_WAKES = new Set(['#5 汇总作息', '#9 查作息范围', '#15 24h 概览', '#16 查多日计划', '周视图']);

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
  if (id === 'range_this_week' && file === RANGE_WEEK && !existsSync(join(PROD, RANGE_WEEK))) file = RANGE_21;
  if (file !== undefined) {
    const present = existsSync(join(PROD, file));
    if (!present) red('场景 ' + id + ' 判了出页，产物却不在盘上：' + file);
    scenLines.push('     ' + (present ? '有产物' : '缺产物') + '  ' + id + '  → ' + file
      + (id === 'range_this_week' && !existsSync(join(PROD, RANGE_WEEK)) ? '（' + weekRangeNote + '）' : ''));
    continue;
  }
  const reason = EXCLUDED[id];
  if (reason === undefined) { red('场景 ' + id + ' 既没有产物、也不在「有意不出」名单里（补一处交代）'); continue; }
  excludedHits += 1;
  scenLines.push('    有意不出  ' + id + '  → ' + reason);
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
  ok('① 不相交：本域 ' + queryRows.length + ' 行＝本族 ' + ourRows.length + ' 行 ＋ 归 #784／#786 的 ' + rest + ' 行（一个不漏、一个不重）');
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

/** 反面判据一（本票要修的病）：区间两页的**可见文本**里不许出现 `l1.` 这种原始键。 */
for (const file of [RANGE_21, RANGE_WEEK]) {
  const path = join(PROD, file);
  if (!existsSync(path)) continue;
  const text = textOf(readFileSync(path, 'utf8'));
  if (text.includes('l1.')) red('② ' + file + '：可见文本里还有原始键（l1.xxx）——人话分组没做到位');
  else ok('② ' + file + '：可见文本里没有 `l1.` 原始键（分类聚合用人话的一级分类名）');
}

/** 反面判据二（本票要修的病）：聚合两页不再是一排空卡（薄模板 `.item` 结构一个都不该有）。 */
for (const file of [OVERVIEW_1, OVERVIEW_N]) {
  const path = join(PROD, file);
  if (!existsSync(path)) continue;
  const body = markupOf(readFileSync(path, 'utf8'));
  const items = count(body, /class="item"/g);
  if (items > 0) red('② ' + file + '：页上仍有薄模板的空卡 ' + items + ' 个（聚合载荷没真画出来）');
  else ok('② ' + file + '：零薄模板空卡（聚合载荷真画出来了）');
}

/** 锚点读数：区间页的分布行数、周视图的格数、多日页的天数与 24 格段数。 */
{
  const range = join(PROD, RANGE_21);
  if (existsSync(range)) {
    const body = markupOf(readFileSync(range, 'utf8'));
    const dist = count(body, /class="ilife-block-dist-row"/g);
    const daily = count(body, /class="ilife-block-list-rows-row"/g);
    if (dist !== 8) red('② 区间汇总：分类聚合应 8 行（八个一级分类），实得 ' + dist);
    else if (daily !== 21) red('② 区间汇总：每日明细应 21 行（21 天），实得 ' + daily);
    else ok('② 区间汇总读数：分类聚合 ' + dist + ' 行／每日明细 ' + daily + ' 行');
  }
  const week = join(PROD, WEEK_PAGE);
  if (existsSync(week)) {
    const body = markupOf(readFileSync(week, 'utf8'));
    const cells = count(body, /class="heat-cell"/g);
    if (cells !== 7 * 24) red('② 周视图：矩阵应 7 × 24 ＝ 168 格，实得 ' + cells);
    else ok('② 周视图读数：矩阵 ' + cells + ' 格（7 行 × 24 格）');
  }
  const multi = join(PROD, OVERVIEW_N);
  if (existsSync(multi)) {
    const body = markupOf(readFileSync(multi, 'utf8'));
    const listRows = count(body, /class="ilife-block-list-rows-row"/g);
    if (listRows !== MULTI.length * 24) red('② 查多日计划：逐日 24 格 × ' + MULTI.length + ' 天，实得 ' + listRows + ' 行');
    else ok('② 查多日计划读数：' + MULTI.length + ' 段 × 24 格 ＝ ' + listRows + ' 行');
  }
}

/** ②‑3：同小时合并那一格（口径给的合并串）真在页上——读 24h 概览那一天的口径，再在产物上找这两条。 */
{
  const path = join(PROD, OVERVIEW_1);
  const r = runCli('schedule.plan.today', { view: 'aggregate', date: '2026-09-15' });
  const hours = r.envelope?.data?.items?.[0]?.hours ?? [];
  const merged = hours.filter((h) => typeof h.text === 'string' && h.text.includes('+'));
  if (merged.length === 0) {
    red('② 同小时合并：2026-09-15 的口径里没有并起来的格（种子没生效？）');
  } else if (!existsSync(path)) {
    red('② 同小时合并：24h 概览那一份产物不在盘上，无从核对');
  } else {
    const text = textOf(readFileSync(path, 'utf8'));
    const miss = [];
    for (const h of merged) for (const piece of h.text.split('+').map((x) => x.trim())) if (!text.includes(piece)) miss.push(piece);
    if (miss.length > 0) red('② 同小时合并：并起来的 ' + miss.join('／') + ' 没在页上');
    else ok('② 同小时合并：' + merged.map((h) => h.label + '＝' + h.text).join('；') + '（并起来的每一条都在页上）');
  }
}

/** 票面点名的 frontmatter 判据：SKILL.md 的 `description` 触发词列表里须有「周视图」。 */
{
  const skill = readFileSync(join(REPO, PKG, 'SKILL.md'), 'utf8');
  const fm = skill.slice(0, skill.indexOf('\n---', 4));
  if (!fm.includes('周视图')) red('① frontmatter 触发词列表里没有「周视图」（新唤醒词唤不起技能）');
  else ok('① frontmatter：SKILL.md 的触发词列表含「周视图」');
  const hits = spawnSync(process.execPath, ['-e',
    "import('" + pathToFileURL(join(REPO, PKG, 'dist', 'index.js')).href + "').then((m)=>{const h=m.buildHelpLookup().find((x)=>x.phrase==='周视图');console.log(JSON.stringify(h??null))})",
  ], { encoding: 'utf8' });
  const hit = JSON.parse(String(hits.stdout).trim());
  if (hit === null) red('① 速查表里查不到「周视图」');
  else if (hit.key !== 'schedule.record.range') red('① 速查表里「周视图」的 key 不对：' + hit.key);
  else ok('① 速查表：周视图 → ' + hit.cli);
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
/** 本票碰过的页内件与两张新页型（query 全目录 ＋ shared 的三处）。 */
const FILES = [
  ...readdirSync(join(SRC, 'query')).filter((x) => x.endsWith('.ts')).map((f) => 'query/' + f),
  'shared/rangePage.ts', 'shared/overviewPage.ts', 'shared/dayPage.ts',
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
else ok('③ 代码层窄判据：本票页内件与两张新页型零裸色值／零单位字面量');

/** 生成物三件：两件**不许变**（本票不新造 key）＋ 路由那件**只许由生成器写**。 */
const drift = GENERATED_FROZEN.filter((g) => {
  const text = norm(readFileSync(join(REPO, PKG, g), 'utf8'));
  return GENERATED_BASELINE[g] !== createHash('sha256').update(text).digest('hex').slice(0, 16);
});
if (drift.length > 0) red('③ 生成物被手改了（它们是 pnpm gen 的产出）：' + drift.join(' '));
else ok('③ 生成物未手改：keys.ts／registry.ts 与基线逐字同（本票不新造 key）');
{
  const routesText = norm(readFileSync(join(REPO, PKG, 'src/triggers/routes.generated.ts'), 'utf8'));
  const want = "{ phrase: '周视图', key: 'schedule.record.range', preset: {\"view\":\"week\"}, order: 48 }";
  const actual = createHash('sha256').update(routesText).digest('hex').slice(0, 16);
  if (!routesText.includes(want)) red('③ routes.generated.ts 里没有「周视图」那一条（生成器没带上声明）：' + want);
  else if (actual !== ROUTES_SHA) red('③ routes.generated.ts 的 sha 与生成器输出不符：' + actual + ' ≠ ' + ROUTES_SHA);
  else ok('③ routes.generated.ts：周视图那一条在，sha=' + ROUTES_SHA + '（由声明经生成器写出）');
  const chk = spawnSync(process.execPath, [join(REPO, PKG, 'scripts', 'gen-cli.mjs'), '--check'], { encoding: 'utf8', cwd: REPO });
  const chkOut = String(chk.stdout).trim();
  if (chk.status !== 0 || !chkOut.includes('GEN-CHECK PASS')) {
    red('③ 生成物门未过（生成物 ≠ 生成器输出）：exit=' + chk.status + ' ' + (chkOut.split('\n').pop() ?? '') + String(chk.stderr).slice(0, 200));
  } else ok('③ 生成物门：' + (chkOut.split('\n').find((l) => l.startsWith('GEN-CHECK PASS')) ?? 'GEN-CHECK PASS'));
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

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't785-清单.json'), JSON.stringify({
  ticket: '#785',
  key: 'schedule.record.range ＋ schedule.plan.today（view=aggregate 与 view=week 两档）',
  page: '区间汇总／24h 概览（多日）／周视图',
  rows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't785-清单.json')).replace(/\\/g, '/') + '（rows=' + rows.length + '）');

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
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t785-探针.mjs');
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
  const PORT = 9761 + (process.pid % 110);
  const profile = mkdtempSync(join(tmpdir(), 't785-shot-'));
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
  for (const [name, W, H, COLS] of [['t785-小墙-手机.html', 390, 900, 3], ['t785-小墙-桌面.html', 1280, 900, 1]]) {
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
      + '<h1>' + esc(name.replace(/^t785-小墙-|\.html$/g, '')) + '墙 · ' + pages.length + ' 格 × ' + W + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
