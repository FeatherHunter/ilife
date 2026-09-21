#!/usr/bin/env node
/** #789 探针 —— 分析与洞察「出页」的**票面验收命令**（真出口读数）。
 *
 *   node tooling/run-locked.mjs --ticket 789 -- node docs/skills/skill-schedule/t789-探针.mjs
 *
 *  它跑什么（逐条对票面「怎么算绿」）：
 *   ① **逐场景行有交代**：从清单 `docs/skills/skill-schedule/场景清单.json` 读本域（`domain=analyze`）
 *      那 12 行，逐行判「有产物」或「在有意不出名单里」——缺一行即红；并断言**不相交**：
 *      本域 12 行 ＝ 本票 7 行（出页 7 ＋ 有意不出 2 ＋ 归 #783 的 amend 3）里本票认领的那一部分。
 *   ② **必现块在页上**：按清单里各家族 `blocks_old` 的逐块落点断言——对比（f03：4 卡对照 ＋
 *      7 维差异 ＋ AI 钩子位）、类别深挖（f04：24h × N 天热力图 ＋ 分类总览）、异常检测
 *      （f05：7 维雷达 ＋ 红黄框异常），另量两条**反面判据**：页上可见文本里不许出现分隔符门
 *      （#516）那几种并列符号、不许出现内部标识（命令键／库列名／参数名／票号）。
 *   ③ **代码层窄判据**：本票页内件与页文件里不出现裸字号／间距／色值字面量（只许取公共层 token
 *      或族级样式件常量）；另断言**没有新 key**（`cli/keys.ts`／`registry.ts` 与基线逐字同）且
 *      `triggers/routes.generated.ts` 与基线同枚、`gen-cli.mjs --check` 绿。
 *   ④ **双端**：三档横向溢出 0（`map-779-出页门.mjs`）＋ 分隔符门 0 命中。
 *  另交：产物 × 双端两张整页截图、本域小墙（手机／桌面各一张，iframe 自带内容、零外部文件）、
 *  清单（墙与收口票共用一份）、「别的域产物逐字节不变」读数。
 *
 *  产物走**真出口**：`dist/cli/cmd_read.js` 逐条真跑（缺省落盘，落点认 `delivery.path`），
 *  再把那份页复制到 `.scratch/t789/成品/` 的可读名上——复制前后核 sha256，读数只认真出口那次落盘。
 *
 *  安静窗口（协议 §2.6）：本包 `src` 有未提交改动即作废（本票的改动要先提交），并打编译指纹那一行；
 *  本探针的结论只对那一行有效。用法：
 *   node docs/skills/skill-schedule/t789-探针.mjs [--out <产物目录>] [--no-shots] [--allow-dirty] [--no-baseline]
 */
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PKG = 'packages/skill-schedule';
const CLI = join(REPO, PKG, 'dist', 'cli', 'cmd_read.js');
const SEED = join(REPO, '.scratch', 't844', 'home', '.ilife', 'data', 'schedule_data.db');
const OUT = resolve(process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : join(REPO, '.scratch', 't789'));
const PROD = join(OUT, '成品');
const WALL = join(OUT, '墙');
const HOME = join(OUT, 'home');
const NO_SHOTS = process.argv.includes('--no-shots');
const ALLOW_DIRTY = process.argv.includes('--allow-dirty');

/** 种子锚点（#844 定死的 2026-09-21；记录 07-23 ~ 09-21，每天 17 条）。 */
const ANCHOR = '2026-09-21';

/** 本票**出页**的行 → 这一行说的是哪一份产物（两行同一次调用时指向同一份，行数按清单算）。 */
const P_COMPARE_MONTHS = '对比两个月.html';
const P_COMPARE_WEEK = '对比（上周和这周）.html';
const P_COMPARE_MIX = '对比（工作日对周末）.html';
const P_CATEGORY_RANGE = '类别深挖（区间）.html';
const P_CATEGORY_DAY = '类别深挖（单日）.html';
const P_ANOMALY_7 = '异常检测（7 天）.html';
const P_ANOMALY_30 = '异常检测（30 天）.html';

const PRODUCT_OF = {
  compare_months: P_COMPARE_MONTHS,
  compare_range: P_COMPARE_WEEK,
  compare_week_vs_week: P_COMPARE_WEEK,
  category_range: P_CATEGORY_RANGE,
  category_day: P_CATEGORY_DAY,
  anomaly_default: P_ANOMALY_7,
  anomaly_window_30: P_ANOMALY_30,
};

/** 本票**有意不出**的那两行（老侧本身就不产页：写库只改摘要表）＋ 指针（页由 #783 的写摘要回执出）。 */
const EXCLUDED = {
  add_summary_basic: '有意不出：老侧本身不产页（写库只改 daily_summary 表，清单 family_null_reason 原文「写库无产物」）＋ 页由 #783 的写摘要回执承接',
  add_summary_idempotent: '有意不出：同上（upsert 覆盖，老侧口径「upsert 覆盖无产物」）＋ 页由 #783 的写摘要回执承接',
};

/** 归兄弟票（#783）的三行：修正作息（f09）随路由住写域，本票不重复做。 */
const SIBLING_IDS = ['amend_basic', 'amend_json_inline', 'amend_24h_warn'];

/** 每张产物的页契约：清单里那一族 `blocks_old` 的逐块落点（块名 ＋ 该块必现的几处标记）。 */
const CONTRACT = {
  [P_COMPARE_MONTHS]: [
    { block: '4 卡对照（f03）', needs: ['四卡对照', '区间 A', '区间 B', '总时长差', '日均差'] },
    { block: '7 维差异（f03）', needs: ['7 维差异', '🌱 维持', '💪 健康', '💼 工作', '📖 学习', '😌 调整', '📋 日常', '🤝 投入'] },
    { block: 'AI 钩子位（f03）', needs: ['AI 思考钩子', '复制给 AI'] },
  ],
  [P_COMPARE_WEEK]: [
    { block: '4 卡对照（f03）', needs: ['四卡对照', '上周', '这周'] },
    { block: '7 维差异（f03）', needs: ['7 维差异', '柱长按这一维里两段的较大者比'] },
    { block: 'AI 钩子位（f03）', needs: ['AI 思考钩子', '两段的日均整体接近'] },
  ],
  [P_COMPARE_MIX]: [
    { block: '4 卡对照（f03）', needs: ['四卡对照', '工作日', '周末'] },
    { block: '7 维差异（f03）', needs: ['7 维差异', '💼 工作 -6h16m，-100%'] },
    { block: 'AI 钩子位（f03）', needs: ['AI 思考钩子', '「工作」这一维的日均差了'] },
  ],
  [P_CATEGORY_RANGE]: [
    { block: '24h×N 天热力图（f04）', needs: ['24h × 7 天热力图', 'heat-cell', '周一 09-14', '周日 09-20'] },
    { block: '分类总览（f04）', needs: ['分类总览', '八段锦', '运动', '冥想', '占 '] },
    { block: '记录明细（f04 这一页的老侧物件）', needs: ['记录明细', '晨跑', '八段锦'] },
  ],
  [P_CATEGORY_DAY]: [
    { block: '24h×N 天热力图（f04）', needs: ['24h × 1 天热力图', 'heat-cell', '周日 09-20'] },
    { block: '分类总览（f04）', needs: ['分类总览', '八段锦', '运动'] },
  ],
  [P_ANOMALY_7]: [
    { block: '红/黄框异常（f05）', needs: ['异常详情', '红框', '黄框', '红框＝偏离过两成'] },
    { block: '7 维雷达（f05）', needs: ['7 维雷达', 'sch-an-radar-face-current', 'sch-an-radar-face-baseline', '🌱 维持', '🤝 投入'] },
    { block: '日均口径（本票自定，页上写明）', needs: ['这一段日均', '基线日均'] },
  ],
  [P_ANOMALY_30]: [
    { block: '红/黄框异常（f05）· 空态', needs: ['异常详情', '窗口与基线取的是同一段日子'] },
    { block: '7 维雷达（f05）', needs: ['7 维雷达', 'sch-an-radar-face-current'] },
  ],
};

/** 三件生成物的基线（本票开工那一刻的 sha256 前 16 位，**归一化**：去 BOM ＋ CRLF→LF）。
 *  本票不新造 key ⇒ `keys.ts`／`registry.ts` 一个字都不该变；`routes.generated.ts` 的判据是
 *  「＝基线同枚 ＋ 生成器 --check 绿」。 */
const GENERATED_FROZEN = ['src/cli/keys.ts', 'src/cli/registry.ts'];
const GENERATED_BASELINE = {
  'src/cli/keys.ts': '691b89fd588edac3',
  'src/cli/registry.ts': '77a852766cf2f12a',
};
const ROUTES_SHA = '01933ec9a6f761b3';

/** **本票收口那一刻**的编译态指纹（`FINGERPRINT:` 行里那两枚 sha，逐字抄自干净窗口那次跑）。 */
const FROZEN_FINGERPRINT = { src: '', dist: '' };
const NO_BASELINE = process.argv.includes('--no-baseline');

const reds = [];
const lines = [];
const ok = (m) => lines.push('OK   ' + m);
const red = (m) => { reds.push(m); lines.push('RED  ' + m); };
const die2 = (m) => { console.error('ERR2 ' + m); process.exit(2); };
/** 探针自己抛错也要把已经攒下的读数打出来：否则一次崩掉看不到是哪一件出的问题。 */
process.on('uncaughtException', (e) => {
  const head = e !== null && typeof e === 'object' && 'stack' in e ? String(e.stack).split('\n')[0] : String(e);
  red('探针自身抛错（这一类是探针的毛病，不是产物的）：' + head);
  for (const l of lines) console.log(l);
  console.log('RESULT: FAIL red=' + String(reds.length) + ' | ABORT');
  process.exit(1);
});
const sha12 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const norm = (text) => text.replace(/^\ufeff/, '').replace(/\r\n/g, '\n');
/** 页上可见文本：剥掉样式／脚本／注释与全部标签（与分隔符门同口径，属性因此天然不进可见文本）。 */
const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

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
      if (live && String(o.ticket) === '789') live = false;
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
    ok('编译态基线：**按请求跳过**（首跑未写锚／--no-baseline）；本趟 src=' + String(gotSrc) + ' dist=' + String(gotDist));
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
copyFileSync(SEED, join(HOME, '.ilife', 'data', 'schedule_data.db'));
mkdirSync(PROD, { recursive: true });

const envBase = { ...process.env, USERPROFILE: HOME, HOME };

function runCli(key, params, env = envBase) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
  let envelope = null;
  try { envelope = JSON.parse(String(r.stdout)); } catch { envelope = null; }
  return { status: r.status, stderr: String(r.stderr), envelope };
}

/** 六条真调用（其中两条区间对比各占一行清单行、工作日对周末那一份不占清单行：同一枚唤醒词的另一种跨度）。
 *  ⚠️ 类别那两条用 `健康` 而不是唤醒词原句里的 `健身`：`policy` 的 `normalizeCategory` 只认一级分类，
 *  裸的二级词（`健身` 是 `健康` 的二级）会在**进本域之前**被拒（exit 2）。改 policy 不在本票写面内，
 *  这一条边界写进票面「遗留出口」，不在这条命令上悄悄放宽。 */
const RUNS = [
  {
    file: P_COMPARE_MONTHS, wake: '#25 对比两个月', family: 'f03', exit: 0,
    params: { kind: 'months', monthA: '2026-08', monthB: '2026-09' },
    note: '对比两个月：整月对整月（种子 08 月 31 天全、09 月记到 21 日，故四卡里把「有记录的天数」也印出来）',
    row: 'compare_months',
  },
  {
    file: P_COMPARE_WEEK, wake: '#25 对比两个月', family: 'f03', exit: 0,
    params: { kind: 'ranges', startA: '2026-09-07', endA: '2026-09-13', startB: '2026-09-14', endB: '2026-09-20', labelA: '上周', labelB: '这周' },
    note: '任意范围对比：上周对本周（逐维都持平，AI 钩子位走「整体接近」那一句）',
    row: 'compare_range ＋ compare_week_vs_week',
  },
  {
    file: P_COMPARE_MIX, wake: '#25 对比两个月', family: 'f03', exit: 0,
    params: { kind: 'ranges', startA: '2026-09-14', endA: '2026-09-18', startB: '2026-09-19', endB: '2026-09-20', labelA: '工作日', labelB: '周末' },
    note: '任意范围对比的另一档（同上，不占清单行）：工作日对周末，七个维度里四个动了（工作降到底、投入翻了七倍）',
    row: '（不占清单行）',
  },
  {
    file: P_CATEGORY_RANGE, wake: 'T4 类别深挖', family: 'f04', exit: 0,
    params: { kind: 'category', category: '健康', start: '2026-09-14', end: '2026-09-20' },
    note: '类别深挖·区间：这一周二里三天有这一类记录（热力图 7 行全在，没有记录的天也占行）',
    row: 'category_range',
  },
  {
    file: P_CATEGORY_DAY, wake: 'T4 类别深挖', family: 'f04', exit: 0,
    params: { kind: 'category', category: '健康.运动', start: '2026-09-20', end: '2026-09-20' },
    note: '类别深挖·单日：二级词进（页面按一级归一并写明），一天也是这张页（一行热力图）',
    row: 'category_day',
  },
  {
    file: P_ANOMALY_7, wake: 'T5 异常检测', family: 'f05', exit: 0,
    params: { kind: 'anomaly', windowDays: 7, end: ANCHOR },
    note: '异常检测·7 天：红框一条（调整涨六成六）＋ 黄框两条（工作降一成四、健康涨一成四），雷达两个面',
    row: 'anomaly_default',
  },
  {
    file: P_ANOMALY_30, wake: 'T5 异常检测', family: 'f05', exit: 0,
    params: { kind: 'anomaly', windowDays: 30, end: ANCHOR },
    note: '异常检测·30 天：窗口与基线取同一段日子 ⇒ 零异常，页上把那件事说明白（不是空壳）',
    row: 'anomaly_window_30',
  },
];

const rows = [];
for (let i = 0; i < RUNS.length; i += 1) {
  const run = RUNS[i];
  const r = runCli('schedule.record.compare', run.params, run.env ?? envBase);
  if (r.status !== run.exit) {
    red(run.file + '：真出口 exit=' + r.status + '（应 ' + run.exit + '）'
      + (r.stderr.trim() === '' ? '' : ' stderr=' + r.stderr.trim().split('\n')[0]));
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
    family: run.family,
    bytes: Buffer.byteLength(html, 'utf8'),
    sha256_12: sha12(html),
    note: run.note,
    key: 'schedule.record.compare',
    params: run.params,
  });
  ok(run.file + ' ← ' + relative(REPO, dl.path).replace(/\\/g, '/') + '（' + dl.bytes + ' B，回执给绝对路径）');
}

/* ─────────────────────────── 载荷不动（机器读的那一份） ─────────────────────────── */

{
  const months = runCli('schedule.record.compare', { kind: 'months', monthA: '2026-08', monthB: '2026-09' });
  const line = months.envelope === null ? '' : String(months.envelope.data.summary).split('\n')[0];
  if (!line.startsWith('2026-08 vs 2026-09：块数 527→357，时长 ')) {
    red('载荷那一句（analysis 形状的 summary）变了：' + line);
  } else {
    ok('载荷不动：这一枚 key 的 summary 仍是那一句「' + line.slice(0, 46) + '…」');
  }
}

/* ─────────────────────────── ① 逐场景行有交代 ─────────────────────────── */

const manifest = JSON.parse(readFileSync(join(REPO, 'docs', 'skills', 'skill-schedule', '场景清单.json'), 'utf8'));
const analyzeRows = manifest.scenarios.filter((s) => s.domain === 'analyze');
const productOf = new Map(Object.entries(PRODUCT_OF));
const scenLines = [];
let excludedHits = 0;
for (const row of analyzeRows) {
  const id = row.scenario_id;
  const file = productOf.get(id);
  if (file !== undefined) {
    const present = existsSync(join(PROD, file));
    if (!present) red('场景 ' + id + ' 判了出页，产物却不在盘上：' + file);
    scenLines.push('     ' + (present ? '有产物' : '缺产物') + '  ' + id + ' → ' + file);
    continue;
  }
  if (SIBLING_IDS.includes(id)) {
    scenLines.push('     归 #783  ' + id + ' → 修正作息那一族随路由住写域（`schedule.record.write` 的 op=amend），蓝调 diff 回执由 #783 出');
    continue;
  }
  const reason = EXCLUDED[id];
  if (reason === undefined) { red('场景 ' + id + ' 既没有产物、也不在「有意不出」名单里（补一处交代）'); continue; }
  excludedHits += 1;
  scenLines.push('     ' + reason.split('：')[0] + '  ' + id + ' → ' + reason);
}
ok('① 逐场景行有交代：本域 ' + String(analyzeRows.length) + ' 行逐行有下文（出页 ' + String(productOf.size)
  + ' 行 → ' + String(new Set(productOf.values()).size) + ' 份产物 ＋ 有意不出 ' + String(excludedHits)
  + ' 行 ＋ 归 #783 的 ' + String(SIBLING_IDS.length) + ' 行）');
for (const l of scenLines) lines.push(l);

{
  const mine = analyzeRows.filter((r) => productOf.has(r.scenario_id)).length;
  const rest = analyzeRows.length - mine;
  if (rest !== SIBLING_IDS.length + Object.keys(EXCLUDED).length) {
    red('行集变了：本域 ' + String(analyzeRows.length) + ' 行里，本票出页 ' + String(mine) + ' 行，其余应 '
      + String(SIBLING_IDS.length + Object.keys(EXCLUDED).length) + ' 行，实得 ' + String(rest) + '——先核清单与票面切片，再改本探针');
  } else {
    ok('① 不相交：本域 ' + String(analyzeRows.length) + ' 行＝本票出页 ' + String(mine) + ' 行 ＋ 有意不出 '
      + String(Object.keys(EXCLUDED).length) + ' 行 ＋ 归 #783 的 ' + String(SIBLING_IDS.length) + ' 行（一个不漏、一个不重）');
  }
  const siblingRows = analyzeRows.filter((r) => SIBLING_IDS.includes(r.scenario_id));
  const wakes = [...new Set(siblingRows.map((r) => r.wake_word))];
  if (wakes.length !== 1 || !wakes[0].includes('修正作息')) {
    red('归 #783 的那三行变了（唤醒词应是「修正作息」）：' + wakes.join('，'));
  } else {
    ok('① 边界：#26 修正作息那三行的页随路由住写域，由 #783 出（本票只在票面写清边界，不重复做）');
  }
  const productIds = new Set(Object.keys(PRODUCT_OF));
  for (const id of Object.keys(EXCLUDED)) {
    if (productIds.has(id)) red('同一行既判了出页又在有意不出名单里：' + id);
    if (!analyzeRows.some((r) => r.scenario_id === id)) red('有意不出名单里有一行不在清单里（清单变了就该删）：' + id);
  }
}

/* ─────────────────────────── ② 必现块在页上（＋ 反面判据） ─────────────────────────── */

for (const [file, blocks] of Object.entries(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) { red('② ' + file + ' 不在盘上，块断言无从谈起'); continue; }
  const html = readFileSync(path, 'utf8');
  const body = markupOf(html);
  const text = textOf(html);
  const missing = [];
  for (const b of blocks) {
    const gone = (b.needs ?? []).filter((n) => !(n.includes('-') ? body.includes(n) : text.includes(n)));
    if (gone.length > 0) missing.push(b.block + '（缺 ' + gone.join(' ') + '）');
    const extra = (b.absent ?? []).filter((n) => text.includes(n));
    if (extra.length > 0) missing.push(b.block + '（不该有 ' + extra.join(' ') + '）');
  }
  if (missing.length > 0) red('② ' + file + ' 必现块：' + missing.join('，'));
  else ok('② ' + file + ' 必现块齐（' + String(blocks.length) + ' 块）');
}

/** 反面判据一（#516 分隔符门那几种并列符号）：页上可见文本里一颗都不许有。 */
const BANNED_CHARS = ['·', '；', '～', '~', '、', '｜'];
/** 反面判据二（内部标识）：命令键、库列名、参数名、票号一颗都不许上屏。 */
const BANNED_WORDS = ['schedule.', 'time_start', 'time_end', 'duration_minutes', 'windowDays', 'kind=', 'monthA'];
const ID_RE = [/\bt\d{3,}\b/, /#[0-9]{2,}\b/];
for (const file of Object.keys(CONTRACT)) {
  const path = join(PROD, file);
  if (!existsSync(path)) continue;
  const text = textOf(readFileSync(path, 'utf8'));
  const chars = BANNED_CHARS.filter((ch) => text.includes(ch));
  const words = BANNED_WORDS.filter((w) => text.includes(w));
  const ids = ID_RE.filter((re) => re.test(text)).map((re) => String(re));
  if (chars.length > 0) red('② ' + file + '：可见文本里还有并列分隔符 ' + chars.join(' ') + '（#516 是一条真门）');
  else if (words.length > 0) red('② ' + file + '：可见文本里出现内部标识 ' + words.join(' '));
  else if (ids.length > 0) red('② ' + file + '：可见文本里出现票号');
  else ok('② ' + file + '：可见文本零并列分隔符、零内部标识');
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
/** 本票碰过的页装配件与口径件（**不含**族级样式件 `analyzeParts.ts`——它是长度常量的唯一住处，另量）。 */
const FILES = [
  'analyze/analyzeDocs.ts', 'analyze/handlers.ts',
];
for (const rel of FILES) {
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, rel), 'utf8')));
  if (hex.test(literals)) violations.push(rel + '：出现十六进制色值（色值只许取公共层 token）');
  else if (cssish.test(literals)) violations.push(rel + '：页装配件里出现样式字面量（样式只许住族级样式件）');
}
{
  // 族级样式件 `analyzeParts.ts` 是**长度常量的唯一住处**：串里不许出现带单位的长度字面量。
  const literals = stringLiterals(stripComments(readFileSync(join(SRC, 'analyze', 'analyzeParts.ts'), 'utf8')));
  if (hex.test(literals)) violations.push('analyze/analyzeParts.ts：出现十六进制色值');
  else if (/\d+(?:px|rem|em)\b/.test(literals)) violations.push('analyze/analyzeParts.ts：样式里出现长度字面量（长度只许取族级常量）');
}
if (violations.length > 0) for (const v of violations) red('③ ' + v);
else ok('③ 代码层窄判据：本票页内件与两件页文件零裸色值／零单位字面量');

/** 生成物三件：两件**不许变**（本票不新造 key）＋ 路由那件**只许由生成器写**。 */
const drift = GENERATED_FROZEN.filter((g) => {
  const text = norm(readFileSync(join(REPO, PKG, g), 'utf8'));
  return GENERATED_BASELINE[g] !== createHash('sha256').update(text).digest('hex').slice(0, 16);
});
if (drift.length > 0) red('③ 生成物被手改了（它们是 pnpm gen 的产出）：' + drift.join(' '));
else ok('③ 生成物未手改：keys.ts／registry.ts 与基线逐字同（本票不新造 key）');
{
  const routesText = norm(readFileSync(join(REPO, PKG, 'src/triggers/routes.generated.ts'), 'utf8'));
  const actual = createHash('sha256').update(routesText).digest('hex').slice(0, 16);
  if (actual !== ROUTES_SHA) red('③ routes.generated.ts 的 sha 与基线不符：' + actual + ' ≠ ' + ROUTES_SHA);
  else ok('③ routes.generated.ts：与基线同枚（sha=' + ROUTES_SHA + '，本票不动路由）');
  const chk = spawnSync(process.execPath, [join(REPO, PKG, 'scripts', 'gen-cli.mjs'), '--check'], { encoding: 'utf8', cwd: REPO });
  const chkOut = String(chk.stdout).trim();
  if (chk.status !== 0 || !chkOut.includes('GEN-CHECK PASS')) {
    red('③ 生成物门未过（生成物 ≠ 生成器输出）：exit=' + String(chk.status) + ' ' + (chkOut.split('\n').pop() ?? ''));
  } else ok('③ 生成物门：' + (chkOut.split('\n').find((l) => l.startsWith('GEN-CHECK PASS')) ?? 'GEN-CHECK PASS'));
}

/* ─────────────────────────── ④ 双端：出页门 ＋ 分隔符门 ─────────────────────────── */

const files = readdirSync(PROD).filter((f) => f.endsWith('.html')).sort();
const door = spawnSync(process.execPath, [join(REPO, 'docs', 'skills', 'skill-schedule', 'map-779-出页门.mjs'), PROD],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const doorOut = String(door.stdout).trim().split('\n');
for (const l of doorOut) lines.push('     [出页门] ' + l.trim());
if (door.status !== 0) red('④ 出页门未过（整页／零外部引用／三档溢出）：exit=' + String(door.status));
else ok('④ 出页门：' + (doorOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

const sep = spawnSync(process.execPath, [join(REPO, 'packages', 'skill-calorie', 'scripts', 'audit-separators.mjs'), '--dir', PROD, '--quiet'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const sepOut = String(sep.stdout).trim().split('\n');
for (const l of sepOut) lines.push('     [分隔符门] ' + l.trim());
if (sep.status !== 0) red('④ 分隔符门有命中（exit=' + String(sep.status) + '）');
else ok('④ 分隔符门：' + (sepOut.find((l) => l.startsWith('RESULT:')) ?? '').trim());

/* ─────────────────────────── 别的域产物逐字节不变 ─────────────────────────── */

{
  const cases = [
    ['#783', join(REPO, '.scratch', 't783', '成品', 't783-清单.json')],
    ['#784', join(REPO, '.scratch', 't784', '成品', 't784-清单.json')],
    ['#785', join(REPO, '.scratch', 't785', '成品', 't785-清单.json')],
    ['#786', join(REPO, '.scratch', 't786', '成品', 't786-清单.json')],
    ['#787', join(REPO, '.scratch', 't787', '成品', 't787-清单.json')],
    ['#788', join(REPO, '.scratch', 't788', '成品', 't788-清单.json')],
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
    if (diff === 0) ok('别域产物逐字节不变：' + ticket + ' 那 ' + String(same) + ' 件与它的清单逐件同');
    else ok('别域产物：' + ticket + ' 那 ' + String(list.length) + ' 件里 ' + String(diff) + ' 件与旧清单不同（该票自己的读数为准）');
  }
}

/* ─────────────────────────── 清单 ＋ 截图 ＋ 小墙 ─────────────────────────── */

writeFileSync(join(PROD, 't789-清单.json'), JSON.stringify({
  ticket: '#789',
  key: 'schedule.record.compare（months／ranges／category／anomaly 四支）',
  page: '作息对比（四卡对照 ＋ 7 维差异 ＋ AI 钩子位）／类别深挖（24h × N 天热力图 ＋ 分类总览 ＋ 记录明细）／异常检测（红黄框 ＋ 7 维雷达）',
  rows,
}, null, 2) + '\n', 'utf8');
ok('清单：' + relative(REPO, join(PROD, 't789-清单.json')).replace(/\\/g, '/') + '（rows=' + String(rows.length) + '）');

if (!NO_SHOTS) {
  const shot = await shoot(files);
  if (shot === null) red('截图：CDP 未就绪（本机 Chrome／Edge 找不到？DSH_BROWSER 可指）');
  else ok('截图：' + String(shot) + ' 张（产物 × 双端 390／1280 全页）');
  const wall = buildWalls(rows.map((r) => r.file));
  if (wall.reds.length > 0) for (const w of wall.reds) red('小墙：' + w);
  else ok('小墙：手机墙 ' + String(wall.mobile) + ' 格、桌面墙 ' + String(wall.desktop) + ' 格（iframe 自带内容，零外部文件）');
}

/* ─────────────────────────── 结论 ─────────────────────────── */

const summary = 'RESULT: ' + (reds.length === 0 ? 'PASS' : 'FAIL') + ' pages=' + String(files.length)
  + ' scenes=' + String(analyzeRows.length) + ' red=' + String(reds.length) + ' | ' + fingerprint.replace(/^FINGERPRINT:\s*/, '');
for (const l of lines) console.log(l);
if (reds.length > 0) { console.log('--- 红条 ---'); for (const r of reds) console.log('RED  ' + r); }
console.log(summary);
if (runId !== '') console.log('GATE-RUN runId=' + runId + ' cmd=node docs/skills/skill-schedule/t789-探针.mjs');
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
  const PORT = 9923 + (process.pid % 90);
  const profile = mkdtempSync(join(tmpdir(), 't789-shot-'));
  const chrome = spawn(BROWSER, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--hide-scrollbars', '--allow-file-access-from-files', '--remote-debugging-port=' + String(PORT),
    '--user-data-dir=' + profile, '--window-size=1440,1200', 'about:blank'], { stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let dev = null;
  for (let i = 0; i < 120 && dev === null; i += 1) {
    try { const r = await fetch('http://127.0.0.1:' + String(PORT) + '/json/version'); if (r.ok) dev = (await r.json()).webSocketDebuggerUrl; } catch { /* 未就绪 */ }
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
      await s('Page.navigate', { url: new URL('file:///' + join(PROD, f).replace(/\\/g, '/')).href });
      for (let i = 0; i < 60; i += 1) { if (await evaluate('document.readyState === "complete"') === true) break; await sleep(50); }
      await sleep(300);
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      writeFileSync(join(PROD, basename(f, '.html') + '__截图__' + String(w) + '.png'), Buffer.from(shot.data, 'base64'));
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
  for (const [name, W, H, COLS] of [['t789-小墙-手机.html', 390, 900, 3], ['t789-小墙-桌面.html', 1280, 900, 1]]) {
    const cells = pages.map((f, i) => {
      const row = byFile.get(f);
      const srcdoc = esc(readFileSync(join(PROD, f), 'utf8'));
      return '  <figure><figcaption>' + esc(String(i + 1).padStart(2, '0') + ' ' + f)
        + '<span>' + esc(row === undefined ? '' : row.note) + '</span></figcaption>'
        + '<iframe src="about:blank" srcdoc="' + srcdoc + '" width="' + String(W) + '" height="' + String(H)
        + '" title="' + esc(f) + '"></iframe></figure>';
    }).join('\n');
    const page = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(name) + '</title>'
      + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f5f5f7;color:#1d1d1f}'
      + '.wrap{padding:24px 20px 60px}h1{font-size:22px;font-weight:600;margin-bottom:6px}'
      + '.sub{color:#6e6e73;font-size:13.5px;margin-bottom:20px;line-height:1.7}'
      + '.grid{display:grid;grid-template-columns:repeat(' + String(COLS) + ',' + String(W) + 'px);gap:18px;align-items:start;justify-content:start}'
      + 'figure{background:#fff;border:1px solid #d2d2d7;border-radius:12px;overflow:hidden}'
      + 'figcaption{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 10px;font-size:12.5px;font-weight:600;border-bottom:1px solid #e8e8ed}'
      + 'figcaption span{color:#868b93;font-weight:400;font-size:11.5px}'
      + 'iframe{display:block;border:0;background:#fff}</style></head><body><div class="wrap">'
      + '<h1>' + esc(name.replace(/^t789-小墙-|\.html$/g, '')) + '墙 · ' + String(pages.length) + ' 格 × ' + String(W) + ' 宽</h1>'
      + '<div class="sub">每格是一份产物的<b>真实渲染</b>（整页内嵌，无外部文件引用）。这一页给人看，不是交付产物。</div>'
      + '<div class="grid">\n' + cells + '\n</div></div></body></html>\n';
    writeFileSync(join(WALL, name), page, 'utf8');
    if (COLS === 3) made.mobile = pages.length; else made.desktop = pages.length;
  }
  return { mobile: made.mobile, desktop: made.desktop, reds: reds2 };
}
