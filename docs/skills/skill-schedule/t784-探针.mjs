#!/usr/bin/env node
/** #784 探针 —— 查询与浏览·单日族「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 784 -- node docs/skills/skill-schedule/t784-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=query`）里
 *      本族唤醒词的那几行，逐行判「有产物」或「在有意不出名单里」——缺一行即红；并断言**不相交**：
 *      本域的行 ＝ 本族这几行 ＋ 归 #785／#786 的那几行，一个不漏、一个不重。
 *   ② **必现块在页上**：按清单里该场景所属老侧家族的 `blocks_old`（`families[].blocks_old`），
 *      逐块断言页上可见（判据只看标记：`<style>` 里也有类名，整串查等于白查）；锚点日那张页另量
 *      几条**读数**（块数／健康分是数／时间轴逐条数／作息库现状五条）。
 *   ③ **代码层窄判据**：本票页内件里不出现裸字号的字号／间距／色值字面量（色值只许取公共层 token，
 *      长度只许取族级样式件 `pageParts.ts` 的常量）；另断言三件生成物（`cli/keys.ts`／`registry.ts`／
 *      `triggers/routes.generated.ts`）与本票基线 sha256 逐字相同——它们是 `pnpm gen` 的产出。
 *   ④ **双端**：三档横向溢出 0（走图级出页门）＋ 分隔符门 0 命中（走 calorie 那件判据工具）。
 *   另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *   清单（墙与收口票共用一份）。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t784/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t784-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty]
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
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't784'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
/** 截图**与产物同目录**（票面原话）：不另立子目录，收口票按清单逐件收得走。 */
const SHOTS = PROD;
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
/** **变异自证专用**：`--allow-dirty` 跳过「本包 src 必须干净」那一条（票面要求「改坏一处必须变红」——
 *  变异就在 `src/query/` 里，与安静窗口那条不能同时成立）。默认**不开**，开了会在结论里点名。 */
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21）：一天 17 条记录，本趟读到的是这份种子的**副本**。 */
const ANCHOR = '2026-09-21';
/** 有料的一天（种子库里有记录、且不是锚点）：读「指定日期」那一支。 */
const DATED = '2026-09-12';
/** 库里、种子窗口（A-60~A）之外、**没有记录**的一天：干净的空日。 */
const EMPTY = '2026-09-24';
/** 老侧那个经典空日（`summary_no_records` 的 prompt 就是它）。 */
const EMPTY_OLD = '2026-01-01';

/** 本票**出页**的行 → 这一行说的是哪一份产物（十个行共用同一张页的几次运行，按查法各落一份）。 */
const FULL_PAGE = '今天总结（满 24h）.html';
const EMPTY_PAGE = '今天总结（无记录）.html';
const DATED_PAGE = '今天总结（指定日期）.html';
const PAST_PAGE = '今天总结（昨日）.html';
const TODAY_PAGE = '今天总结（今日）.html';
const OLD_EMPTY_PAGE = '今天总结（老侧空日示例）.html';
const PRODUCT_OF = {
  summary_full_24h: FULL_PAGE,
  summary_specific_date: DATED_PAGE,
  summary_no_records: OLD_EMPTY_PAGE,
  record_list_today: TODAY_PAGE,
  record_list_yesterday: PAST_PAGE,
  record_list_specific: DATED_PAGE,
  record_list_empty: EMPTY_PAGE,
  timeline_today: TODAY_PAGE,
  timeline_specific: DATED_PAGE,
  status_default: FULL_PAGE,
};

/** 本票**有意不出**的行：行 → 理由（理由要能被人直接读，不许写「见上」）。 */
const EXCLUDED = {
  summary_partial: '老侧这条只出简短摘要文本、没有产物；它要的「这一天还没过完」落在同一张页的结论条里（探针当场断言）',
  summary_range_full: '范围族（f02）归 #785：唤醒词 #5 落在 schedule.record.range 上，写面与产物都在那张票',
  range_default: '范围族（f02）归 #785：同上（#9 查作息范围 → schedule.record.range）',
  range_this_week: '范围族（f02）归 #785：同上',
  range_text: '范围族（f02）归 #785：同上（老侧这条只出纯文本）',
  week_view: '周视图（f08）归 #785：唤醒词「周视图」落在 #785 的写面与产物上',
  query_plans_today: '多日 24h 概览（f11）归 #785：唤醒词 #15 在 #785 的写面内',
  query_plans_multi: '多日 24h 概览（f11）归 #785：同上',
  detail_day: '单条详情（f06）归 #786：唤醒词「查作息详情」与「按 ID 查记录」都在 #786 的目标清单里',
  detail_record: '单条详情（f06）归 #786：同上（老侧 `--record-id` 那一支）',
  detail_with_reasoning: '单条详情（f06）归 #786：同上（AI 推理链那一块是 f06 的第二个必现块）',
  get_record_basic: '单条详情（f06）归 #786：同上（按 ID 查单条）',
  list_events_today: '查日程（f10）归 #786：唤醒词 #12 在 #786 的目标清单里',
  list_events_specific: '查日程（f10）归 #786：同上',
  search_event_title: '查日程（f10）归 #786：同上（老侧这条只回搜索 JSON）',
  search_event_triplet: '查日程（f10）归 #786：同上（老侧 CLI 只吃 --title，三元组不可达）',
  list_events_inactive: '查日程（f10）归 #786：同上（老侧这条只回列表 JSON）',
};

/** 归兄弟票的行数（#785 的 8 行 ＋ #786 的 5 行 ＋ 本票有意不出的 4 行＝17）：本票的
 *  「有意不出」里逐行写了它们，这里只做「本域 28 行一个不漏」的算术断言。 */
const SIBLING_ROWS = 17;

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（记号 ＋ 该块必现的几处标记）。 */
const CONTRACT = {
  [FULL_PAGE]: [
    { block: '4 卡摘要', needs: ['ilife-block-fact-strip', '记录块数', '覆盖时长', '健康分', '睡眠＋午睡'] },
    { block: '分类进度', needs: ['分类进度（一级分类分布）', 'ilife-block-disclosure', 'ilife-block-dist-row'] },
    { block: '24h 时间轴', needs: ['24 小时时间轴', 'ilife-block-list-rows', 'ilife-block-chart-block'] },
    { block: '睡眠统计', needs: ['夜间睡眠', '午睡', '合计'] },
    { block: '作息库现状（老侧 status 五条上屏）', needs: ['作息库现状', '总记录数', '已记录天数', '日期范围', '最后记录日期'] },
  ],
  [EMPTY_PAGE]: [
    { block: '4 卡摘要', needs: ['ilife-block-fact-strip', '记录块数', '覆盖时长', '健康分'] },
    { block: '空态（这一天还没有记录）', needs: ['这一天还没有记录'] },
    { block: '作息库现状', needs: ['作息库现状', '总记录数'] },
  ],
  [DATED_PAGE]: [
    { block: '4 卡摘要', needs: ['ilife-block-fact-strip', '记录块数'] },
    { block: '24h 时间轴', needs: ['24 小时时间轴', 'ilife-block-list-rows'] },
  ],
  [PAST_PAGE]: [
    { block: '4 卡摘要', needs: ['ilife-block-fact-strip', '记录块数'] },
    { block: '24h 时间轴', needs: ['ilife-block-list-rows'] },
  ],
};

/** 三件生成物的基线（本票开工那一刻的 sha256 前 16 位，**归一化**：去 BOM ＋ CRLF→LF）。 */
const GENERATED = ['src/cli/keys.ts', 'src/cli/registry.ts', 'src/triggers/routes.generated.ts'];
const GENERATED_BASELINE = {
  'src/cli/keys.ts': '691b89fd588edac3',
  'src/cli/registry.ts': '77a852766cf2f12a',
  'src/triggers/routes.generated.ts': '784062f712af8df8',
};

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。
 *  默认照它比：两枚都对得上＝「这份读数就是收口那一刻那棵 src 树／那批 dist 编出来的」。
 *  ⚠️ 别的席若在本包之外重编过（`pnpm build` 会重写本包 dist），dist 那枚会变——那是**同源产物**、
 *  不是漂移：那种时候显式加 `--no-baseline` 再跑，并在读数里写清为什么。 */
const FROZEN_FINGERPRINT = {
  src: '5f5ed35549bbe1f0',
  dist: '42024e47b554d74f',
};
const NO_BASELINE = process.argv.includes('--no-baseline');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);

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
      if (live && String(o.ticket) === '784') live = false;
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

/** 与收口那一刻的指纹对账（默认比；`--no-baseline` 跳过并在读数里点名）。 */
{
  const gotSrc = (fingerprint.match(/src-sha-后=([0-9a-f]+)/) ?? [])[1];
  const gotDist = (fingerprint.match(/dist-sha-后=([0-9a-f]+)/) ?? [])[1];
  if (NO_BASELINE) {
    ok('编译态基线：**按请求跳过**（--no-baseline）；本趟 src=' + String(gotSrc) + ' dist=' + String(gotDist));
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

/** 真出口逐条跑：不带 `--html`＝走缺省落盘那一支，落点只认回执里的 `delivery.path`。
 *  **十个出页行说的是同一枚 key 的同一张页**，差别只在查的是哪一天；产物按「查法」各落一份。 */
const RUNS = [
  { file: FULL_PAGE, params: { date: ANCHOR }, note: '锚点日：种子铺满这一天（17 条记录）' },
  { file: DATED_PAGE, params: { date: DATED }, note: '指定日期那一支（同一枚 key、同一张页）' },
  { file: PAST_PAGE, params: { date: '2026-09-20' }, note: '低产日（种子里的低产日型）' },
  { file: EMPTY_PAGE, params: { date: EMPTY }, note: '库里没有记录的一天（空数据不塌）' },
  { file: OLD_EMPTY_PAGE, params: { date: EMPTY_OLD }, note: '老侧 `summary_no_records` 的 prompt 就是这一天' },
  { file: TODAY_PAGE, params: {}, note: '今天那一支（缺省日期，不带 date）' },
];

function runCli(key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  const r = runCli('schedule.record.today', run.params);
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
    wake: '今天总结',
    family: 'f01',
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}
if (rows.length === RUNS.length) {
  ok('真出口：' + rows.length + ' 次运行全部落盘（同一枚 key `schedule.record.today`，今天／指定日期／昨日／两个空日都跑过）');
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

/** 本族唤醒词（清单 `wake_word` 列逐字）：行的归属按清单自身那一列判，不按票面口径另立一份。 */
const OUR_WAKES = new Set(['#4 今天总结', '#6 查作息', '#8 查作息时间轴', '#11 查作息状态']);

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const queryRows = manifest.scenarios.filter((s) => s.domain === 'query');
const ourRows = queryRows.filter((s) => OUR_WAKES.has(s.wake_word));
if (ourRows.length === 0) red('清单里读不到本族唤醒词的行（权威源形状变了，先修读数）');
const productOf = new Map(Object.entries(PRODUCT_OF));
const scenLines = [];
let excludedHits = 0;
for (const row of ourRows) {
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
  ok('① 不相交：本域 ' + queryRows.length + ' 行＝本族 ' + ourRows.length + ' 行 ＋ 归 #785／#786 的 ' + rest + ' 行（一个不漏、一个不重）');
}
const productIds = new Set(Object.keys(PRODUCT_OF));
for (const id of Object.keys(EXCLUDED)) {
  if (productIds.has(id)) red('同一行既判了出页又在有意不出名单里：' + id);
  if (!queryRows.some((r) => r.scenario_id === id)) red('有意不出名单里有一行不在清单里（清单变了就该删）：' + id);
}

/* ─────────────────────────── ② 必现块在页上 ─────────────────────────── */

const markupOf = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
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

/** 锚点日那张页另量几条**读数**（必现块「在不在」之外，「对不对」也量一次）。 */
{
  const path = join(PROD, FULL_PAGE);
  if (existsSync(path)) {
    const body = markupOf(readFileSync(path, 'utf8'));
    const facts = new Map([...body.matchAll(/<span class="ilife-block-fact-strip-label">([^<]*)<\/span><span class="ilife-block-fact-strip-value[^"]*">([^<]*)<\/span>/g)]
      .map((m) => [m[1], m[2]]));
    const nBlocks = Number((facts.get('记录块数') ?? '').replace(/[^0-9]/g, ''));
    const nRows = count(body, /ilife-block-list-rows-row"/g);
    if (!Number.isFinite(nBlocks) || nBlocks <= 0) red('② 锚点日 4 卡摘要：记录块数读不出来：' + String(facts.get('记录块数')));
    else if (!/^\d+$/.test(facts.get('健康分') ?? '')) red('② 锚点日 4 卡摘要：健康分不是数：' + String(facts.get('健康分')));
    else if (nRows !== nBlocks) red('② 锚点日 24h 时间轴：逐条应 ' + nBlocks + ' 条（＝记录块数），实得 ' + nRows);
    else ok('② 锚点日读数：' + nBlocks + ' 块记录／健康分 ' + facts.get('健康分') + '／时间轴 ' + nRows + ' 条／作息库现状五条读数');
  }
}

/** 「这一天还没过完」那句话（老侧 `summary_partial` 这一行在页上的落点）：今天那一份产物上断言。
 *  判据＝页上那句话该在时真在：`已过分钟 > 覆盖 且 已过分钟 < 1440`。今天＝锚点日那一天时，
 *  覆盖 1380（种子到 23:00），只有跑在 23:00 之后到 24:00 之前才该出——那种窗口里跳过这条断言。 */
{
  const path = join(PROD, TODAY_PAGE);
  if (!existsSync(path)) {
    red('① summary_partial：今天那一份产物不在盘上');
  } else {
    const day = new Date();
    const body = markupOf(readFileSync(path, 'utf8'));
    const elapsed = day.getHours() * 60 + day.getMinutes();
    const todayIsAnchor = todayStr === ANCHOR;
    const shouldShow = elapsed < 1440 && elapsed > (todayIsAnchor ? 23 * 60 : 0);
    if (!shouldShow) {
      ok('① summary_partial：这一趟跑在「覆盖 ≥ 已过」的窗口里（已过 ' + elapsed + ' 分钟，今天 ' + todayStr
        + '），判据本身不成立，跳过这一条');
    } else if (!body.includes('这一天还没过完')) {
      red('① summary_partial：今天这一支在页上没出「这一天还没过完」那句话（已过 ' + elapsed + ' 分钟，本该出）');
    } else {
      ok('① summary_partial：今天这一支页上出了「这一天还没过完」那句话（已过 ' + elapsed + ' 分钟；老侧这条只出文本，本票落在结论条里）');
    }
  }
}

/* ─────────────────────────── ③ 代码层窄判据 ─────────────────────────── */

const SRC = join(REPO, PKG, 'src');
/** 判据只量**代码里的字符串**：注释里写「实测 880px 掉到 874px」这类读数不算样式字面量。 */
const stripComments = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const stringLiterals = (code) => [...code.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
  .map((m) => m[1] ?? m[2] ?? '').join('\n');
/** CSS 声明＝「属性名: 值」，值里带单位；`@media` 也算样式字面量。 */
const cssish = /(?:font-size|line-height|padding|margin|gap|border-radius|color|background|width|height)\s*:\s*[^;'"\n]*(?:px|rem|em|vh|vw|%)|@media/;
const hex = /#[0-9a-fA-F]{4,8}\b/;
const violations = [];
for (const f of readdirSync(join(SRC, 'query')).filter((x) => x.endsWith('.ts'))) {
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'query', f), 'utf8')));
  if (hex.test(literals)) violations.push('query/' + f + '：出现十六进制色值（色值只许取公共层 token）');
  else if (cssish.test(literals)) violations.push('query/' + f + '：页装配件里出现样式字面量（样式只许住族级样式件）');
}
{
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'shared', 'dayPage.ts'), 'utf8')));
  if (hex.test(literals)) violations.push('shared/dayPage.ts：出现十六进制色值');
  else if (cssish.test(literals)) violations.push('shared/dayPage.ts：页装配件里出现样式字面量（样式只许住族级样式件）');
}
{
  // 族级样式件 `pageParts.ts` 是**长度常量的唯一住处**：串里不许出现带单位的长度字面量。
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'shared', 'pageParts.ts'), 'utf8')));
  if (hex.test(literals)) violations.push('shared/pageParts.ts：出现十六进制色值');
  else if (/\d+(?:px|rem|em)\b/.test(literals)) violations.push('shared/pageParts.ts：样式里出现长度字面量（长度只许取族级常量）');
}
const genNow = {};
for (const g of GENERATED) {
  const text = readFileSync(join(REPO, PKG, g), 'utf8').replace(/^\ufeff/, '').replace(/\r\n/g, '\n');
  genNow[g] = createHash('sha256').update(text).digest('hex').slice(0, 16);
}
if (violations.length > 0) for (const v of violations) red('③ ' + v);
else ok('③ 代码层窄判据：本票页内件零裸色值／零单位字面量（query/*.ts 与 shared/dayPage.ts 全过）');
const drift = GENERATED.filter((g) => GENERATED_BASELINE[g] !== genNow[g]);
if (drift.length > 0) red('③ 生成物被手改了（它们是 pnpm gen 的产出）：' + drift.join(' '));
else ok('③ 生成物未手改：keys.ts／registry.ts／routes.generated.ts 与基线逐字同');

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

/** 清单**不进 `今天总结（今日）`**（它只是同一张页的另一次运行）：同一份产物在清单里出现两遍，
 *  收口票按行收格时会当成两份。出页门照旧把整目录量过（那份也在目录里）。 */
const manifestRows = rows.filter((r) => r.file !== TODAY_PAGE);
writeFileSync(join(PROD, 't784-清单.json'), JSON.stringify({
  ticket: '#784',
  key: 'schedule.record.today',
  page: '今天总结',
  rows: manifestRows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't784-清单.json')).replace(/\\/g, '/') + '（rows=' + manifestRows.length + '）');

if (!NO_SHOTS) {
  mkdirSync(SHOTS, { recursive: true });
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + shot + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(manifestRows.map((r) => r.file));
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + wall.mobile + ' 格、桌面墙 ' + wall.desktop + ' 格（iframe 自带内容，零外部文件）');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + files.length
  + ' scenes=' + ourRows.length + ' red=' + reds.length + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t784-探针.mjs');
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
  const PORT = 9721 + (process.pid % 120);
  const profile = mkdtempSync(join(tmpdir(), 't784-shot-'));
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
  for (const [name, W, H, COLS] of [['t784-小墙-手机.html', 390, 900, 3], ['t784-小墙-桌面.html', 1280, 900, 1]]) {
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
      + '<h1>' + esc(name.replace(/^t784-小墙-|\.html$/g, '')) + '墙 · ' + pages.length + ' 格 × ' + W + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
