/**
 * #788 · 日程与计划·复盘与飞书：复盘（单日逐条）／复盘四档一体页（今日·本周·本月·区间）
 * ／飞书探测（三档）／日程管家同步回执出页。
 *
 * 本票 9 行（`场景清单.json` 的 `domain=plan` 里判）：#14 复盘 4 行（`review_today_normal`／
 * `review_today_all_done`／`review_no_events`／`review_with_memo_sync`，末一行有意不出）、
 * #20 日程管家同步 1 行（`feishu_resync_basic`）、复盘四档 4 行（`replay_day`／`replay_week`／
 * `replay_month`／`replay_range`）。逐行的产物在探针 `docs/skills/skill-schedule/t788-探针.mjs` 里；
 * 本件锁的是**页契约**：
 *
 *   V1 复盘（裸词）：单日逐条那张页 —— 逐条复盘段 ＋ 六态分布 ＋ 讨论区 ＋ 把标记交回 AI 那一句
 *   V2 已全部标记那一档：全标成完成后，同一张页的口径换成「全都标过了」
 *   V3 该日无活跃事件：空态页（不是故障）＋ 讨论区给「先排这一天的计划」
 *   V4 复盘今日：计划 vs 实际对照（实际时长＝记录与计划时段的**交集**）＋ 缺计划引导（这一天没计划时）
 *   V5 复盘本周：7 维趋势 ＋ 24h×N 天热力图 ＋ 健康分（均值与逐日）
 *   V6 复盘本月：月度聚合 ＋ 环比对比（上月同期）＋ 目标达成
 *   V7 区间按跨度路由：1 天→今日档、7 天→本周档、40 天→通用四段档，档与档的块互斥
 *   V8 飞书探测只读三档：没装／不完全／全通，exit 都 0，页上明说「这一趟只探」
 *   V9 日程管家同步：挡板上真建对象，页上报这一趟的账（远端新建 N 笔）＋ 下一步留出口
 *   V10 页上可见文本不出现命令键、库列名、参数名，也不出现分隔符门那几种并列符号
  *   V11（#895）飞书探测三页可见文本零内部命令名，版本格只留数字
  *   V12（#895）七条抛出文案中文含义可核且零内部命令名
 *
 * 现场数据**自己种**（#763 家目录隔离，不碰真库、也不依赖 #844 的种子库）：一天 17 条首尾相接的记录
 * ＋ 三条计划（一条已完成、两条未复盘）；周档另往前铺满 6 天；月档另铺上月同期的记录（环比要它）。
 * 飞书那两条不碰真飞书：隔离家目录里放一只挡板（`.cmd` ＋ 一个 mjs，只认几个子命令、不联网）。
 *
 * 「改坏必红」：把 `handlers.ts` 的 `review`／`sync` 两臂换回 `''` → V1／V4–V9 全红；把
 * `routeBySpan` 的三条边界改成「一律通用」→ V7 红；把 `crossDomainOf` 的交集改成整块时长 → V4 红；
 * 把 `probe.ts` 的 `dryRun` 分支摘掉 → V8 红（飞书探测会真跑同步、挡板日志里出现建对象）。
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeEnvOf } from '../../../test/helpers/home-test-base.mjs';
import { openScheduleDb, closeScheduleDb } from '../dist/fetch/db.js';
import { runLark, authOpenId, larkReady, shortLarkVersion, maskLarkCli } from '../dist/fetch/feishu.js';
import { probePage } from '../dist/plan/feishuDocs.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const P = (o) => JSON.stringify(o);

/** 锚点那一天（与 #844 种子的口径无关，本件自己铺）：这一天 17 条记录 ＋ 3 条计划。 */
const DAY = '2026-09-15';
const PREV_WEEK_DAY = '2026-09-08';
const LAST_MONTH_DAY = '2026-08-15';
/** 未来一天（同步那一支要「不是过去日期」才建远端；按跑当天的次日算，与真实日期无关）。 */
const tomorrow = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
})();

let HOME = '';
let SHIM_LOG = '';
let SHIM_MODE = 'full';

function run(args, env = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: homeEnvOf(HOME, { T788_SHIM_LOG: SHIM_LOG, T788_SHIM_MODE: SHIM_MODE, ...env }),
  });
}

/** 一条写命令的真出口跑法：回执 ＋ 缺省落盘那一份真页（整页两份断言都在这里）。 */
function page(params, opts = {}) {
  const r = run(['schedule.plan.write', '--params', P(params)], opts.env ?? {});
  assert.equal(r.status, opts.exit ?? 0, '须 exit ' + String(opts.exit ?? 0) + '：' + String(r.stderr).slice(0, 300));
  const env = JSON.parse(String(r.stdout));
  const out = env.delivery?.path;
  assert.ok(typeof out === 'string' && out !== '', '缺省调用须回 delivery.path');
  assert.equal(statSync(out).size, env.delivery.bytes, '盘上字节须等于回执 bytes');
  const html = readFileSync(out, 'utf8');
  assert.match(html, /^<!doctype html>/i, '须是整页（doctype 起）');
  assert.ok(html.trimEnd().endsWith('</html>'), '须是整页（</html> 收）');
  return { env, html, out };
}

const markupOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const textOf = (html) => markupOf(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const has = (html, s) => textOf(html).includes(s);

/** 一天 17 条：00:00 至 23:59 首尾相接（记录那张表按整块记，复盘的实际时长才有的可算）。 */
const DAY_RECORDS = [
  ['00:00', '06:30', '睡眠', '维持.睡眠'],
  ['06:30', '07:00', '洗漱', '维持.洗漱'],
  ['07:00', '07:30', '早饭', '维持.用餐'],
  ['07:30', '08:00', '晨间冥想', '健康.冥想'],
  ['08:00', '09:00', '通勤', '维持.通勤'],
  ['09:00', '11:30', '写代码', '工作.开发'],
  ['11:30', '12:30', '午饭', '维持.用餐'],
  ['12:30', '13:00', '午间散步', '调整.散步'],
  ['13:00', '14:00', '午睡', '调整.午睡'],
  ['14:00', '16:00', '需求评审会', '工作.会议'],
  ['16:00', '16:30', '休息', '调整.休息'],
  ['16:30', '18:00', '写周报', '工作.文案'],
  ['18:00', '19:00', '晚饭', '维持.用餐'],
  ['19:00', '20:00', '读书', '学习.读书'],
  ['20:00', '21:00', '散步', '调整.散步'],
  ['21:00', '22:30', '剪辑视频', '创作.视频'],
  ['22:30', '23:59', '睡前放松', '调整.休息'],
];

function seedDay(date) {
  for (const [s, e, activity, category] of DAY_RECORDS) {
    const r = run(['schedule.record.write', '--params', P({ op: 'add', date, time_start: s, time_end: e, activity, category })]);
    assert.equal(r.status, 0, '记录种子失败：' + String(r.stderr).slice(0, 200));
  }
}

const SHIM_JS = `import { appendFileSync } from 'node:fs';
const mode = process.env.T788_SHIM_MODE || 'full';
const log = process.env.T788_SHIM_LOG || '';
const argv = process.argv.slice(2);
if (log) appendFileSync(log, mode + '\\t' + argv.join(' ') + '\\n');
const say = (o) => process.stdout.write(JSON.stringify(o));
const arg = (name) => { const i = argv.indexOf(name); return i < 0 ? '' : (argv[i + 1] ?? ''); };
if (argv[0] === '--version') { process.stdout.write('lark-cli version 9.9.9\\n'); process.exit(0); }
if (mode === 'hang') { const t0 = Date.now(); while (Date.now() - t0 < 2000) {} }
if (argv[0] === 'auth') {
  if (mode === 'no-auth') process.exit(1);
  if (mode === 'bad-json') { process.stdout.write('not-json{{{'); process.exit(0); }
  if (mode === 'no-openid') { say({}); process.exit(0); }
  say({ identities: { user: { openId: 'ou-test' } } }); process.exit(0);
}
if (argv[0] === 'calendar') {
  if (mode === 'no-calendar') process.exit(1);
  const sub = argv[1];
  if (sub === '+agenda') { say({ data: [] }); process.exit(0); }
  if (sub === '+search-event') { say({ data: { items: [] } }); process.exit(0); }
  if (sub === '+create' || sub === '+update') { say({ data: { event_id: 'shim-' + String(Date.now()), summary: arg('--summary'), description: arg('--description') } }); process.exit(0); }
  if (sub === 'events' && argv[2] === 'delete') { say({ data: {} }); process.exit(0); }
}
process.exit(1);
`;

function installShim() {
  const log = join(HOME, 'shim.log');
  mkdirSync(join(HOME, 'AppData', 'Roaming', 'npm'), { recursive: true });
  const shimDir = join(HOME, 'shim');
  mkdirSync(shimDir, { recursive: true });
  writeFileSync(join(shimDir, 'shim.mjs'), SHIM_JS, 'utf8');
  writeFileSync(join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd'),
    '@echo off\r\n"' + process.execPath + '" "' + join(shimDir, 'shim.mjs') + '" %*\r\n', 'utf8');
  writeFileSync(log, '', 'utf8');
  SHIM_LOG = log;
}

before(() => {
  HOME = mkdtempSync(join(tmpdir(), 'sched788-'));
  installShim();
  for (const d of [DAY, PREV_WEEK_DAY, LAST_MONTH_DAY]) seedDay(d);
  // 往前 6 天各一条（周档的 7 维趋势要两天以上才有折线；也只有那样热力图才有 7 行）。
  for (let i = 1; i <= 6; i += 1) {
    const d = new Date(DAY + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    const r = run(['schedule.record.write', '--params', P({
      op: 'add', date: d.toISOString().slice(0, 10), time_start: '09:00', time_end: '11:30', activity: '写代码', category: '工作.开发',
    })]);
    assert.equal(r.status, 0, '周档历史记录种子失败：' + String(r.stderr).slice(0, 200));
  }
  // 三条计划：一条已完成、两条未复盘（六态分布与「完成率的分母是标过的那些」都要看它）。
  // 完成状态不在 `ensure` 的入参里（那条命令只补排布），故先把三条排上、再用 `update` 标第一条。
  const plans = [
    ['07:30', '08:00', '晨间冥想', '健康.冥想'],
    ['09:00', '11:30', '深度开发', '工作.开发'],
    ['21:00', '22:30', '剪辑视频', '创作.视频'],
  ];
  for (const [s, e, title, category] of plans) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: DAY, time_start: s, time_end: e, title, category, feishu: 'skip' })]);
    assert.equal(r.status, 0, '计划种子失败：' + String(r.stderr).slice(0, 200));
  }
  {
    const items = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: DAY })]).stdout)).data.items;
    const first = items.find((x) => x.title === '晨间冥想');
    const r = run(['schedule.plan.write', '--params', P({ op: 'update', id: first.id, completion: '已完成', feishu: 'skip' })]);
    assert.equal(r.status, 0, '标记第一条计划失败：' + String(r.stderr).slice(0, 200));
  }
});

after(() => { rmSync(HOME, { recursive: true, force: true }); });

/* ─────────────────────────── V1–V3 · 复盘（裸词，单日逐条） ─────────────────────────── */

test('V1 复盘（裸词）：单日逐条那张页（逐条复盘 ＋ 六态分布 ＋ 讨论区）', () => {
  const { html } = page({ op: 'review', date: DAY });
  for (const s of ['逐条复盘', '完成状态', '原因', '每条计划的完成状态与原因逐条列出', '讨论区', '把标记交给 AI 落库', '把 2026-09-15 这天的计划逐条写回库里', '复制这句话']) {
    assert.ok(html.includes(s) || has(html, s), '页上缺这一处：' + s);
  }
  assert.ok(has(html, '排了 3 条计划'), '结论条须报这一天的计划条数');
  assert.ok(has(html, '已标 1 条'), '结论条须报已标记条数（种子里只有一条标过）');
  assert.ok(has(html, '已完成'), '六态分布里须有已完成那一行');
  assert.ok(has(html, '未复盘'), '六态分布里须有未复盘那一行');
});

test('V2 已全部标记那一档：同一条命令、全标完之后口径换成「全都标过了」', () => {
  const items = JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: PREV_WEEK_DAY })]).stdout)).data.items;
  assert.equal(items.length, 0, '这一天本来没有计划');
  for (const [s, e, title, category] of [['09:00', '11:30', '深度开发', '工作.开发'], ['13:00', '14:00', '午睡', '调整.午睡']]) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: PREV_WEEK_DAY, time_start: s, time_end: e, title, category, feishu: 'skip' })]);
    assert.equal(r.status, 0, '计划种子失败：' + String(r.stderr).slice(0, 200));
  }
  for (const it of JSON.parse(String(run(['schedule.plan.today', '--params', P({ date: PREV_WEEK_DAY })]).stdout)).data.items) {
    const r = run(['schedule.plan.write', '--params', P({ op: 'update', id: it.id, completion: '已完成', completion_note: '按时做完了', feishu: 'skip' })]);
    assert.equal(r.status, 0, '标记失败：' + String(r.stderr).slice(0, 200));
  }
  const { html } = page({ op: 'review', date: PREV_WEEK_DAY });
  assert.ok(has(html, '这一天的计划全都标过了'), '全标完之后口径须换成「全都标过了」');
  assert.ok(has(html, '收尾看结论'), '讨论区四步须照旧在');
});

test('V3 该日无活跃事件：空态页（不是故障）＋ 讨论区给「先排这一天的计划」', () => {
  const { html } = page({ op: 'review', date: '2026-01-01' });
  assert.ok(has(html, '这一天没有活跃的计划'), '空态那句须在页上');
  assert.ok(has(html, '这一天没有可讨论的对象') || has(html, '先排这一天的计划就说这一句'), '空态下讨论区要说清下一步');
  assert.ok(!has(html, '环比对比'), '空态页不该出现月档的块');
});

/* ─────────────────────────── V4–V7 · 复盘四档一体页 ─────────────────────────── */

test('V4 复盘今日：计划 vs 实际对照（实际时长＝交集）＋ 缺计划引导', () => {
  const { html } = page({ op: 'review', granularity: 'day', date: DAY });
  for (const s of ['计划 vs 实际对照', '计划时长', '实际时长', '跨域对比', '健康分', '复盘到明天的衔接']) {
    assert.ok(has(html, s), '日档缺这一块：' + s);
  }
  // 07:30 至 08:00 的计划落在 07:30 至 08:00 的冥想记录里 ⇒ 实际 30 分钟、差值 0。
  assert.ok(has(html, '30m'), '对照表须报出实际时长');
  assert.ok(!has(html, '环比对比'), '日档不该出月档的块');
  assert.ok(!has(html, '24h × N 天热力图'), '日档不该出周档的块');
  // 没有计划的那一天：出补齐引导，不降级成一句空话。
  const empty = page({ op: 'review', granularity: 'day', date: '2026-01-02' });
  assert.ok(has(empty.html, '缺计划补齐引导'), '没计划的日子须出补齐引导');
  assert.ok(has(empty.html, '先排计划就说这一句'), '补齐引导里须给一句可复制的话');
});

test('V5 复盘本周：7 维趋势 ＋ 24h×N 天热力图 ＋ 健康分', () => {
  const { html } = page({ op: 'review', granularity: 'week', date: DAY });
  for (const s of ['7 维趋势', '24h × N 天热力图', '健康分', '与上一段比']) {
    assert.ok(has(html, s), '周档缺这一块：' + s);
  }
  assert.ok(markupOf(html).includes('heat-cell'), '热力图须真出格子');
  assert.ok(!has(html, '计划 vs 实际对照'), '周档不该出日档的对照表');
  assert.ok(!has(html, '环比对比'), '周档不该出月档的块');
});

test('V6 复盘本月：月度聚合 ＋ 环比对比（上月同期）＋ 目标达成', () => {
  const { html } = page({ op: 'review', granularity: 'month', date: DAY });
  for (const s of ['分类聚合', '环比对比', '上月同期', '目标达成', '计划完成率', '维持占比', '健康分']) {
    assert.ok(has(html, s), '月档缺这一块：' + s);
  }
  assert.ok(has(html, '2026-08-01 至 2026-08-30'), '环比窗口须点名上月同期那一段（同日起止往前挪一个月）');
  assert.ok(!has(html, '24h × N 天热力图'), '月档不该出周档的块');
});

test('V7 区间按跨度路由：1 天→今日档、7 天→本周档、40 天→通用四段档（块互斥）', () => {
  const one = page({ op: 'review', granularity: 'range', start: DAY, end: DAY });
  assert.ok(has(one.html, '这一段的跨度是 1 天，按今日档画'), '1 天须路由到今日档');
  assert.ok(has(one.html, '计划 vs 实际对照'), '今日档须有对照表');

  const seven = page({ op: 'review', granularity: 'range', start: '2026-09-09', end: DAY });
  assert.ok(has(seven.html, '这一段的跨度是 7 天，按本周档画'), '7 天须路由到本周档');
  assert.ok(has(seven.html, '7 维趋势'), '本周档须有趋势');

  const long = page({ op: 'review', granularity: 'range', start: '2026-08-07', end: DAY });
  assert.ok(has(long.html, '实际作息') && has(long.html, '计划执行') && has(long.html, '跨域对比'), '通用档须出四段叙事');
  assert.ok(!has(long.html, '环比对比') && !has(long.html, '目标达成'), '通用档不该出月档的块');
  assert.ok(existsSync(long.out), '通用档也须真落盘');
});

/* ─────────────────────────── V8–V9 · 飞书两条 ─────────────────────────── */

test('V8 飞书探测：三档各出一张页，exit 都 0，且一趟都不写远端', () => {
  const before = readFileSync(SHIM_LOG, 'utf8');
  const full = page({ op: 'sync', dryRun: true, date: DAY });
  for (const s of ['三道门逐道看', '全通', '这一趟写了几笔', '只读，不写任何对象']) {
    assert.ok(has(full.html, s), '全通档缺这一处：' + s);
  }
  const delta = readFileSync(SHIM_LOG, 'utf8').slice(before.length);
  assert.ok(delta.trim().split('\n').length >= 3, '全通档须真探过挡板三道门');
  for (const verb of ['+create', '+update', 'events delete']) {
    assert.ok(!delta.includes(verb), '飞书探测动了写动作：' + verb);
  }
  SHIM_MODE = 'no-auth';
  const partial = page({ op: 'sync', dryRun: true, date: DAY });
  assert.ok(has(partial.html, '不完全'), '没登录那一档须报「不完全」');
  assert.ok(has(partial.html, '把飞书命令行的授权补上'), '没登录那一档须给授权指引');
  SHIM_MODE = 'full';
  // 「没装」那一档：把挡板挪开（它正落在隔离家目录的候选路径上）＋ 清空查找路径，
  // 于是「家目录候选」与「where 那一档」都探不到——真机上装没装 lark-cli 都不影响这一档的读数。
  const shimPath = join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  renameSync(shimPath, shimPath + '.off');
  let missing;
  try {
    missing = page({ op: 'sync', dryRun: true, date: DAY }, { env: { PATH: '' } });
  } finally {
    renameSync(shimPath + '.off', shimPath);
  }
  assert.ok(has(missing.html, '没装'), '路径清空后须报「没装」');
  assert.ok(has(missing.html, '本技能不代装也不代登'), '没装那一档须说明装与不装由人定');
});

test('V9 日程管家同步：挡板上真建对象，页上报这一趟的账', () => {
  const made = run(['schedule.plan.write', '--params', P({ op: 'ensure', date: tomorrow, time_start: '09:00', time_end: '10:00', title: '明天的深度开发', category: '工作.开发', feishu: 'skip' })]);
  assert.equal(made.status, 0, '未来一天的计划种子失败：' + String(made.stderr).slice(0, 200));
  const before = readFileSync(SHIM_LOG, 'utf8');
  const { html, env } = page({ op: 'sync', date: tomorrow });
  const delta = readFileSync(SHIM_LOG, 'utf8').slice(before.length);
  assert.ok(delta.includes('+create'), '同步这一趟须真调过建对象（挡板日志为证）');
  for (const s of ['这一趟的账', '回填标识', '远端新建', '远端清理', '本地这一天的排布', '只想先看一眼而不动远端']) {
    assert.ok(has(html, s), '同步页缺这一处：' + s);
  }
  assert.ok(has(html, '已同步飞书'), '同步过的那一条须在页上标出来');
  assert.ok((env.data.counts ?? {}).created >= 1, '回执里远端新建的笔数须 ≥1，实得 ' + String(env.data.counts?.created));
});

/* ─────────────────────────── V10 · 反面判据 ─────────────────────────── */

test('V10 页上可见文本：零并列分隔符、零内部标识', () => {
  const pages = [
    page({ op: 'review', date: DAY }).html,
    page({ op: 'review', granularity: 'day', date: DAY }).html,
    page({ op: 'review', granularity: 'week', date: DAY }).html,
    page({ op: 'review', granularity: 'month', date: DAY }).html,
    page({ op: 'sync', dryRun: true, date: DAY }).html,
    page({ op: 'sync', date: tomorrow }).html,
  ];
  for (const html of pages) {
    const text = textOf(html);
    for (const ch of ['·', '；', '～', '~', '、', '｜']) {
      assert.ok(!text.includes(ch), '可见文本里出现了并列分隔符：' + ch);
    }
    for (const w of ['schedule.', 'time_start', 'time_end', 'completion_note', 'is_active', 'feishu_event_id', 'op=', 'dryRun']) {
      assert.ok(!text.includes(w), '可见文本里出现了内部标识：' + w);
    }
    assert.ok(!/\bt\d{3,}\b/.test(text) && !/#[0-9]{2,}\b/.test(text), '可见文本里出现了票号');
  }
});

/* ─────────────────── V11 · #895 零内部命令名（可红判据） ─────────────────── */

test('V11 飞书探测三页可见文本：零内部命令名，版本格只留数字', () => {
  const forbid = ['lark-cli', 'auth', 'status', 'version', 'openId', 'scope'];
  // 命令原文（子命令与参数面）：页上同样一处不许有。
  const cmdBits = ['--version', '+agenda', 'auth login', '--calendar-id', 'events delete'];
  const hitsOf = (html) => {
    const t = textOf(html).toLowerCase();
    return forbid.filter((w) => t.includes(w.toLowerCase()));
  };
  SHIM_MODE = 'full';
  const full = page({ op: 'sync', dryRun: true, date: DAY }).html;
  SHIM_MODE = 'no-auth';
  const partial = page({ op: 'sync', dryRun: true, date: DAY }).html;
  SHIM_MODE = 'full';
  const shimPath = join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  renameSync(shimPath, shimPath + '.off');
  let missing;
  try {
    missing = page({ op: 'sync', dryRun: true, date: DAY }, { env: { PATH: '' } }).html;
  } finally {
    renameSync(shimPath + '.off', shimPath);
  }
  for (const [name, html] of [['全通', full], ['不完全', partial], ['没装', missing]]) {
    assert.deepEqual(hitsOf(html), [], name + '档可见文本含内部命令名');
    const t = textOf(html);
    for (const b of cmdBits) assert.ok(!t.includes(b), name + '档可见文本含命令原文：' + b);
  }
  // 版本格只留数字：挡板吐 `lark-cli version 9.9.9`，页上须是 `9.9.9`（`version` 字样清零由上式覆盖）。
  assert.ok(has(full, '9.9.9'), '全通档版本格须印出数字版本号');
  // `unknown` 挡住：直调 probePage，version=`unknown` 须印「读不到」且仍零禁词。
  const dir = mkdtempSync(join(tmpdir(), 'sched895-'));
  try {
    const handle = openScheduleDb(join(dir, 'schedule_data.db'));
    try {
      const html = probePage(handle, DAY, {
        tier: 'full', cliPath: 'C:/x/lark-cli.cmd', version: 'unknown',
        openId: 'ou-x', authenticated: true, calendar: true, why: '飞书命令行在场，授权与日历两道门都过了，可以同步',
      });
      assert.ok(textOf(html).includes('读不到'), '版本读不到须印「读不到」');
      assert.deepEqual(hitsOf(html), [], 'unknown 档可见文本含内部命令名');
    } finally {
      closeScheduleDb(handle);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ─────────────────── V12 · #895 七条抛出中文含义可核 ─────────────────── */

test('V12 七条抛出文案：四门中文含义各在，且零内部命令名', () => {
  const keep = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, PATH: process.env.PATH, MODE: process.env.T788_SHIM_MODE };
  process.env.HOME = HOME;
  process.env.USERPROFILE = HOME;
  // 挡板子进程读 `process.env.T788_SHIM_MODE`（`page()` 经 `run()` 显式传，直调则读当刻进程）：两边一起设。
  const setMode = (m) => { SHIM_MODE = m; process.env.T788_SHIM_MODE = m; };
  const cli = join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
  const msgs = [];
  const grab = (fn) => {
    try { fn(); } catch (e) { msgs.push(String((e instanceof Error ? e.message : String(e)))); return msgs[msgs.length - 1]; }
    assert.fail('应当抛出而没有抛');
  };
  try {
    // ① 不可用（ENOENT）② 超时（挡板 hang＋50ms）③ 没登录①（status 非 0）
    grab(() => runLark(join(HOME, 'no-such-dir', 'lark-cli-xyz'), ['--version'], 5000));
    setMode('hang');
    grab(() => runLark(cli, ['--version'], 50));
    setMode('no-auth');
    grab(() => authOpenId(cli));
    // ④ 返回读不懂 ⑤ 查不到登录身份 ⑥ 没装 ⑦ 日历拉不动
    setMode('bad-json');
    grab(() => authOpenId(cli));
    setMode('no-openid');
    grab(() => authOpenId(cli));
    const shimPath = join(HOME, 'AppData', 'Roaming', 'npm', 'lark-cli.cmd');
    renameSync(shimPath, shimPath + '.off');
    process.env.PATH = '';
    try {
      grab(() => larkReady());
    } finally {
      process.env.PATH = keep.PATH;
      renameSync(shimPath + '.off', shimPath);
    }
    setMode('no-calendar');
    grab(() => larkReady());
    assert.equal(msgs.length, 7, '七条须逐条抛：' + JSON.stringify(msgs));
    assert.deepEqual(msgs, [
      '飞书命令行不可用：没找到可执行文件',
      '飞书命令行超时：等太久没回应，稍后重试',
      '还没登录：登录查询没通过',
      '登录信息读不懂：重登一次再探',
      '还没登录：查不到登录身份',
      '没找到飞书命令行：缺失阻断同步',
      '日历拉不动：多半是缺日历授权，补一次授权再探',
    ], '七条全文须逐字对上（两条没登录以后缀区分）：' + JSON.stringify(msgs));
    // 显示口径直断（`fetch` 门唯二定义地）：版本号只留数字、`unknown` 读不到；scoop 那档目录名含工具名也遮掉。
    assert.equal(shortLarkVersion('lark-cli version 9.9.9'), '9.9.9');
    assert.equal(shortLarkVersion('lark-cli version 1.0.59-stub'), '1.0.59');
    assert.equal(shortLarkVersion('unknown'), '读不到');
    assert.equal(maskLarkCli('C:/P/Programs/lark-cli'), 'C:/P/Programs/飞书命令行');
    assert.ok(!/lark-cli/i.test(maskLarkCli('D:/a/lark-cli.cmd')));
    for (const m of msgs) {
      assert.ok(!/lark-cli|auth status|openId|auth login|scope/i.test(m), '抛出文案含内部命令名：' + m);
      assert.ok(!/--version|\+agenda|calendar/i.test(m), '抛出文案含命令原文：' + m);
    }
  } finally {
    process.env.HOME = keep.HOME;
    process.env.USERPROFILE = keep.USERPROFILE;
    process.env.PATH = keep.PATH;
    if (keep.MODE === undefined) delete process.env.T788_SHIM_MODE;
    else process.env.T788_SHIM_MODE = keep.MODE;
    SHIM_MODE = 'full';
  }
});
