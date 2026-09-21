#!/usr/bin/env node
/** 【种子】#844 · 作息管家的隔离种子库（锚点日期 ＋ 覆盖五域的可复现数据）。
 *
 * 为什么有它：真库是空的（`~/.ilife/data/` 里没有任何作息产物），任何页都只能看到空态，
 * 「展示的信息要生动形象」这条无从证明。本脚本造一份**只给验收用**的种子库：三表齐
 * （记录／计划／摘要），形状按五域场景铺（连续多日、跨分类时长分布、计划事件与完成态、摘要行）。
 *
 * **不碰真库**：只写 `SEED_ROOT`，一次都不写真实 `~/.ilife/**`；跑前跑后各对真家目录的树做一次快照
 * （逐件 size ＋ mtime ＋ sha256），自己断言逐件不变。判据件是仓库里已有的一份
 * （`test/helpers/real-home-snapshot.mjs`，与 `tooling/check-real-home-untouched.mjs` 同一套算法）。
 *
 * 隔离怎么来的：写库走**显式路径**（`openScheduleDb(DB_PATH)`），而库落点正是**隔离家目录的默认数据目录**
 * （`<隔离家目录>/.ilife/data/schedule_data.db`）。下游票把家目录指过来（win32 `USERPROFILE`／POSIX `HOME`
 * 都设），真 CLI 走**一条没改过的生产路径**（配置缺省 `db.dir` 正是这个目录）就吃这份种子——
 * 不需要测试专用开关，也不需要手写配置文件。
 *
 * 锚点：`A` ＝ `--anchor` 给的日期，缺省＝今天（`todayStr()`，与 CLI 的「今天」同一处算法）。
 * 数据一律是 `A` 的**固定偏移**（不是随机）：库一旦灌好，日期就钉死在库里；换个日子重灌＝整块平移到新锚点
 * （兄弟件 `skill-home` 的 `seed-scenes.mjs` 同一口径）。审计时间戳（created_at／updated_at／generated_at）
 * 也按锚点钉死 ⇒ 同锚点重灌**内容逐字节可复现**（本脚本自己再建一份比内容摘要）。
 *
 * 落点（写死，不接受路径参数——防手滑写生产库）：
 *   库     `.scratch/t844/home/.ilife/data/schedule_data.db`
 *   暂存   `.scratch/t844/stage/`（两段式：先在暂存里建库、跑完全部断言，**全绿才落库**）
 *   复现   `.scratch/t844/repro/`（同锚点再建一份，比内容摘要；跑完即删）
 *   读数   `.scratch/t844/seed-meta.json`（锚点／窗口／条数／内容摘要／库 sha256）
 *
 * 用法（仓根，一律经排队）：
 *   node tooling/run-locked.mjs --ticket 844 -- node packages/skill-schedule/scripts/seed.mjs --check
 *     --check    ＝ 灌库 ＋ 全部核验 ＋ 真家目录断言（票面验收命令；与无参同一趟，名字点明跑的是验收）
 *     --anchor   ＝ 钉住锚点日期（缺省今天）——跨天复现同一份数据用
 *     --reset    ＝ 先删掉种子目录里自己造的东西，再跑同一趟
 *     --selftest ＝ 真家目录探针自证：一次性沙盒里造一棵假家目录，三种情形（零写⇒绿／新增件⇒红／改内容⇒红）
 *
 * 纪律：本件**只读库结构、不改库结构**——写一律经编译产物的 API（schema 定义只在 `src/fetch/db.ts`），
 * 本件只做「按固定规格调用它」；读走只读聚合 SQL（读不定义结构）。种子的覆盖面若被某域票认为不够，
 * 由该域票在票面写清要补什么，不自行改本件。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  diffSnapshots, realConfigDir, snapshotTree,
} from '../../../test/helpers/real-home-snapshot.mjs';
import { requireIsolatedHome, useHome } from '../../../test/helpers/home-test-base.mjs';

// ---------- 落点（写死） ----------
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SEED_ROOT = join(ROOT, '.scratch', 't844');
const HOME_DIR = join(SEED_ROOT, 'home');            // 隔离家目录
const DATA_DIR = join(HOME_DIR, '.ilife', 'data');   // 隔离家目录的默认数据目录（＝配置缺省落点）
const DB_PATH = join(DATA_DIR, 'schedule_data.db');
const STAGE_DB = join(SEED_ROOT, 'stage', 'schedule_data.db');
const REPRO_DB = join(SEED_ROOT, 'repro', 'schedule_data.db');
const META_PATH = join(SEED_ROOT, 'seed-meta.json');
const SEED_VERSION = 'schedule-seed-v1';

/** 本件读数所依赖的编译件（协议 §2.6：窗口内这些件一动，本次读数即作废）。 */
const FP_FILES = [
  'packages/skill-schedule/src/fetch/db.ts', 'packages/skill-schedule/src/fetch/index.ts',
  'packages/skill-schedule/src/policy/index.ts', 'packages/skill-schedule/src/policy/category.ts',
  'packages/skill-schedule/src/policy/routing.ts', 'packages/skill-schedule/src/policy/plan.ts',
  'packages/skill-schedule/src/policy/record.ts',
  'packages/skill-schedule/dist/fetch/db.js', 'packages/skill-schedule/dist/fetch/index.js',
  'packages/skill-schedule/dist/policy/index.js', 'packages/skill-schedule/dist/policy/category.js',
  'packages/skill-schedule/dist/policy/routing.js', 'packages/skill-schedule/dist/policy/plan.js',
  'packages/skill-schedule/dist/policy/record.js',
];

// ---------- 规格（数据形状的唯一来源） ----------
const DAYS_BACK = 60;                // 记录窗口：A-60 … A（61 天，跨月够「上月 as 整月」）
const PLAN_BACK = 6, PLAN_FWD = 3;   // 计划窗口：A-6 … A+3（10 天）
const SUMMARY_BACK = 13;             // 摘要窗口：A-13 … A（14 天）
const OFF_DAY = -3;                  // 低产日（工作 0 分钟、调整拉满）：异常检测与月度对比的红行来源

/** 一天的 17 个时段。三种日型**共用这组边界** ⇒ 每天条数与总时长恒定，读数不随锚点漂。 */
const SLOTS = [
  ['00:00', '06:30'], ['06:30', '07:00'], ['07:00', '07:30'], ['07:30', '08:15'],
  ['08:15', '12:00'], ['12:00', '12:40'], ['12:40', '13:00'], ['13:00', '13:25'],
  ['13:25', '17:30'], ['17:30', '18:15'], ['18:15', '19:00'], ['19:00', '19:40'],
  ['19:40', '20:30'], ['20:30', '21:15'], ['21:15', '22:15'], ['22:15', '23:00'],
  ['23:00', '23:59'],
];

/** 日型：`[活动, 分类]` 逐槽对应 `SLOTS`（工作日铺满 8 个一级分类；周末与低产日故意换掉几块）。 */
const DAY_WORKDAY = [
  ['睡眠', '维持.睡眠'], ['洗漱', '维持.洗漱'], ['早餐', '维持.用餐'], ['通勤', '维持.通勤'],
  ['开发后台接口', '工作.开发'], ['午餐', '维持.用餐'], ['收拾工位', '日常.收拾'], ['午睡', '调整.午睡'],
  ['开发后台接口', '工作.开发'], ['通勤', '维持.通勤'], ['做饭', '维持.做饭'], ['晚餐', '维持.用餐'],
  ['晚间散步', '调整.散步'], ['与家人聊天', '投入.家人'], ['读书', '学习.读书'], ['写作', '创作.文字'],
  ['睡眠', '维持.睡眠'],
];
const DAY_WEEKEND = [
  ['睡眠', '维持.睡眠'], ['洗漱', '维持.洗漱'], ['早餐', '维持.用餐'], ['晨跑', '健康.运动'],
  ['剪辑视频', '创作.视频'], ['午餐', '维持.用餐'], ['收拾客厅', '日常.收拾'], ['午睡', '调整.午睡'],
  ['陪家人外出', '投入.家人'], ['采购', '维持.采购'], ['做饭', '维持.做饭'], ['晚餐', '维持.用餐'],
  ['八段锦', '健康.八段锦'], ['和朋友通话', '投入.朋友'], ['读书', '学习.读书'], ['追剧', '调整.追剧'],
  ['睡眠', '维持.睡眠'],
];
const DAY_OFF = [
  ['睡眠', '维持.睡眠'], ['洗漱', '维持.洗漱'], ['早餐', '维持.用餐'], ['慢走', '调整.散步'],
  ['休息', '调整.休息'], ['午餐', '维持.用餐'], ['收拾', '日常.收拾'], ['午睡', '调整.午睡'],
  ['休息', '调整.休息'], ['午睡', '调整.午睡'], ['做饭', '维持.做饭'], ['晚餐', '维持.用餐'],
  ['冥想', '健康.冥想'], ['发呆', '调整.发呆'], ['读书', '学习.读书'], ['写复盘', '创作.文字'],
  ['睡眠', '维持.睡眠'],
];

/** 计划模板：`[起, 止, 标题, 分类, 备注]`，7 条/天，铺在 7 个整点上（聚合视图「已规划」7 格）。 */
const PLAN_SLOTS = [
  ['07:30', '08:00', '晨间冥想', '健康.冥想', '十分钟呼吸练习'],
  ['09:00', '11:30', '深度开发', '工作.开发', '先把接口写完'],
  ['12:30', '13:00', '午间散步', '调整.散步', null],
  ['14:00', '16:00', '需求评审会', '工作.会议', '带上会议纪要'],
  ['16:30', '18:00', '写周报', '工作.文案', null],
  ['20:00', '21:00', '读书一小时', '学习.读书', '接着读《深度工作》'],
  ['21:30', '22:30', '剪辑视频', '创作.视频', null],
];
/** 附加计划：跨天标题重名两条 ＋ 已软删一条（标题搜／三元组查重／已软删三族的口粮）。 */
const EXTRA_PLANS = [
  [-3, '23:00', '23:30', '当日复盘', '日常.决策', false],
  [-2, '23:00', '23:30', '当日复盘', '日常.决策', false],
  [-1, '23:00', '23:30', '旧版复盘', '日常.决策', true],
];

const pad = (n) => String(n).padStart(2, '0');
const abort = (code, msg) => { console.log('RESULT: ABORT exit=' + code + ' :: ' + msg); process.exit(code); };
/** 锚点的固定偏移日（本地日期，与 `todayStr()` 同一种算法）。 */
function dayOf(anchor, offset) {
  const [y, m, d] = anchor.split('-').map(Number);
  const t = new Date(y, m - 1, d + offset);
  return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
}
const windowDays = (anchor, from, to) => {
  const out = [];
  for (let i = from; i <= to; i++) out.push(dayOf(anchor, i));
  return out;
};
/** 日型选择：周六周日走周末型，低产日（A-3）单独覆盖一层。 */
function templateOf(date, anchor) {
  if (date === dayOf(anchor, OFF_DAY)) return DAY_OFF;
  const [y, m, d] = date.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6 ? DAY_WEEKEND : DAY_WORKDAY;
}
/** 完成态：过去的日子铺满 6 态，今天与未来留「未复盘」（null）——复盘四档都要有口粮。 */
function completionOf(offset, api, i) {
  if (offset > 0) return null;
  if (offset === 0) return i === 0 ? '已完成' : null;
  if (i === 6) return null;                                        // 每天留一条没复盘的
  return api.VALID_COMPLETIONS[(offset + i + 60) % api.VALID_COMPLETIONS.length];
}
function assertUnderSeed(target, what) {
  const root = resolve(SEED_ROOT);
  const abs = resolve(target);
  if (abs !== root && !abs.startsWith(root + sep)) abort(2, '守卫失败：' + what + ' 落在种子目录之外：' + abs);
  if (!abs.split(sep).includes('.scratch')) abort(2, '守卫失败：' + what + ' 不在 .scratch 下：' + abs);
  return abs;
}
function rmDbFiles(dbPath) {
  assertUnderSeed(dbPath, '库文件');
  for (const suffix of ['', '-wal', '-shm']) if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true });
  mkdirSync(dirname(dbPath), { recursive: true });
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
function fingerprint() {
  const lines = FP_FILES.map((rel) => {
    const abs = join(ROOT, rel);
    return rel + ':' + (existsSync(abs) ? sha256(readFileSync(abs)) : 'missing');
  });
  return sha256(lines.join('\n')).slice(0, 16);
}

// ---------- 灌库 ----------
function buildSeed(api, dbPath, anchor) {
  rmDbFiles(dbPath);
  const handle = api.openScheduleDb(dbPath);
  const db = handle.db;
  const recordDays = windowDays(anchor, -DAYS_BACK, 0);
  const planDays = windowDays(anchor, -PLAN_BACK, PLAN_FWD);
  const summaryDays = windowDays(anchor, -SUMMARY_BACK, 0);
  const level1 = [...api.LEVEL1_WHITELIST].sort();
  try {
    for (const date of recordDays) {
      templateOf(date, anchor).forEach(([activity, category], i) => {
        const [timeStart, timeEnd] = SLOTS[i];
        api.addRecord(handle, {
          date, time_start: timeStart, time_end: timeEnd,
          duration_minutes: api.toMinutes(timeEnd) - api.toMinutes(timeStart),
          activity, category: api.normalizeCategory(category),
          // 详情页 9 字段全画：锚点日的三条来源字段铺满；其余日留空（老侧本来也只有少数带来源）。
          source_contents: date === anchor ? activity + '（' + timeStart + '~' + timeEnd + ' 语音原文）' : null,
          source_timestamps: date === anchor ? date + 'T' + timeStart + ':00+08:00' : null,
          analysis_reasoning: date === anchor ? '按活动关键词归到 ' + category : null,
        });
      });
    }
    // 修正过的一条（edit_count ≥ 1 ＋ updated_at 晚于 created_at）：供「修正」与蓝调 diff 族。
    const amended = db.prepare("SELECT id FROM schedule_records WHERE date = ? AND time_start = '08:15' ORDER BY id LIMIT 1")
      .get(dayOf(anchor, -1));
    if (!amended) abort(1, '规格自洽失败：A-1 的 08:15 那条找不到（修正样例无从落）');
    api.amendRecord(handle, Number(amended.id), {
      analysis_reasoning: '修正：这条原来归错了，按当刻实际做的事重记',
    });

    const planIds = [];
    planDays.forEach((date, dayIdx) => {
      PLAN_SLOTS.forEach(([timeStart, timeEnd, title, category, notes], i) => {
        const { event } = api.ensurePlanEvent(handle, { date, time_start: timeStart, time_end: timeEnd, title, category, notes });
        planIds.push(event.id);
        const completion = completionOf(dayIdx - PLAN_BACK, api, i);
        const patch = {};
        if (completion) patch.completion = completion;
        if (completion === '已完成(超时)') patch.completion_note = '评审会比计划多开 20 分钟';
        if (completion === '未完成') patch.completion_note = '临时插了别的事，顺延到明天';
        if (completion === '未完成(不可抗力)') patch.completion_note = '家里临时有事';
        if (Object.keys(patch).length) api.updatePlanEvent(handle, event.id, patch);
      });
    });
    for (const [offset, timeStart, timeEnd, title, category, deactivate] of EXTRA_PLANS) {
      const { event } = api.ensurePlanEvent(handle, {
        date: dayOf(anchor, offset), time_start: timeStart, time_end: timeEnd, title, category,
        notes: deactivate ? '这条已被删掉（软删：is_active=0）' : null,
      });
      planIds.push(event.id);
      if (deactivate) api.deactivatePlanEvent(handle, event.id);
    }
    // 飞书已同步两条（锚点日的晨间冥想、A-5 的深度开发）：同步态与未同步态同时存在。
    [planIds[PLAN_SLOTS.length * PLAN_BACK], planIds[PLAN_SLOTS.length + 1]]
      .forEach((id, n) => api.setFeishuEventId(handle, id, 'fs_seed_844_' + (n + 1)));

    // 摘要行：按**当刻库里的记录**算每个一级分类的分钟数（当天没有的分类记 0——条数与锚点无关）。
    const minutes = new Map();
    for (const r of db.prepare('SELECT date, category, duration_minutes FROM schedule_records').all()) {
      const key = r.date + '\t' + api.l1Of(r.category);
      minutes.set(key, (minutes.get(key) || 0) + (r.duration_minutes || 0));
    }
    for (const date of summaryDays) {
      for (const l1 of level1) api.addSummary(handle, date, l1, minutes.get(date + '\t' + l1) || 0);
    }

    // 审计时间戳按锚点钉死（同锚点重灌 ⇒ 内容逐字节可复现；表与列仍由 src/fetch/db.ts 定义）。
    db.exec("UPDATE schedule_records SET created_at = date || 'T' || time_start || ':00', updated_at = date || 'T' || time_end || ':00'");
    db.exec("UPDATE schedule_plans SET created_at = date || 'T06:00:00', updated_at = date || 'T06:30:00'");
    db.exec("UPDATE schedule_plans SET last_synced_at = date || 'T06:35:00' WHERE feishu_event_id IS NOT NULL");
    db.exec("UPDATE schedule_plans SET updated_at = date || 'T23:35:00' WHERE is_active = 0");
    db.exec("UPDATE daily_summary SET generated_at = date || 'T23:30:00'");
    return { recordDays, planDays, summaryDays, level1 };
  } finally {
    api.closeScheduleDb(handle);
  }
}

/** 内容摘要：三表逐行按自然键排序后序列化取 sha256（同锚点两次构建必须一致）。 */
function contentDigest(api, dbPath) {
  const handle = api.openScheduleDb(dbPath);
  try {
    const db = handle.db;
    const parts = [
      ['records', 'SELECT date, time_start, time_end, duration_minutes, activity, category, source_contents, source_timestamps, analysis_reasoning, created_at, updated_at, edit_count FROM schedule_records ORDER BY date, time_start, id'],
      ['plans', 'SELECT date, time_start, time_end, title, notes, category, feishu_event_id, last_synced_at, is_active, completion, completion_note, created_at, updated_at FROM schedule_plans ORDER BY date, time_start, id'],
      ['summary', 'SELECT date, category, total_minutes, generated_at FROM daily_summary ORDER BY date, category'],
    ].map(([name, sql]) => {
      const rows = db.prepare(sql).all();
      return name + '=' + rows.length + '\n' + rows.map((r) => JSON.stringify(r)).join('\n');
    });
    return sha256(parts.join('\n---\n'));
  } finally {
    api.closeScheduleDb(handle);
  }
}

// ---------- 核验（全部由库里的行派生，不看灌库时的内存态） ----------
function verify(api, dbPath, spec, anchor) {
  const handle = api.openScheduleDb(dbPath);
  const db = handle.db;
  const out = [];
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);
  const check = (name, ok, detail) => { out.push({ name, ok, detail }); console.log((ok ? 'OK  ' : 'RED ') + name + ' :: ' + detail); };
  try {
    const alpha = dayOf(anchor, -DAYS_BACK);
    const st = one('SELECT COUNT(*) n, COUNT(DISTINCT date) d, MIN(date) lo, MAX(date) hi FROM schedule_records');
    check('记录窗口', st.d === spec.recordDays.length && st.lo === alpha && st.hi === anchor,
      'want 天数=' + spec.recordDays.length + ' ' + alpha + '~' + anchor + '，got 天数=' + st.d + ' ' + st.lo + '~' + st.hi);

    const badDay = all('SELECT date, COUNT(*) n FROM schedule_records GROUP BY date HAVING n <> ?', SLOTS.length);
    check('每日条数', badDay.length === 0, 'want 每日 ' + SLOTS.length + ' 条，got 异样日=' + (badDay.length ? JSON.stringify(badDay.slice(0, 3)) : '无'));

    const rows = all('SELECT date, time_start, time_end FROM schedule_records ORDER BY date, time_start, id');
    const gaps = [];
    let prev = null;
    for (const r of rows) {
      if (!prev || prev.date !== r.date) {
        if (r.time_start !== '00:00') gaps.push(r.date + ' 首条 ' + r.time_start);
      } else if (prev.time_end !== r.time_start) {
        gaps.push(r.date + ' ' + prev.time_end + '→' + r.time_start);
      }
      prev = r;
    }
    if (prev && prev.time_end !== '23:59') gaps.push(prev.date + ' 末条 ' + prev.time_end);
    check('24h 首尾相接', gaps.length === 0, 'want 每天 00:00~23:59 无洞无叠，got 断点=' + (gaps.length ? JSON.stringify(gaps.slice(0, 3)) : '无'));

    const cover = new Set(all('SELECT DISTINCT category FROM schedule_records').map((r) => api.l1Of(r.category)));
    const anchorCover = new Set(all('SELECT category FROM schedule_records WHERE date = ?', anchor).map((r) => api.l1Of(r.category)));
    check('一级分类覆盖', cover.size === spec.level1.length && spec.level1.every((l) => cover.has(l)),
      'want ' + spec.level1.length + '/' + spec.level1.length + '，got ' + cover.size + '/' + spec.level1.length + '（锚点日 ' + anchorCover.size + ' 个）');
    check('锚点日够活', anchorCover.size >= 6, 'want 锚点日 ≥6 个一级分类，got ' + anchorCover.size);

    const src = one('SELECT COUNT(*) n FROM schedule_records WHERE date = ? AND source_contents IS NOT NULL AND source_timestamps IS NOT NULL', anchor);
    const reason = one('SELECT COUNT(*) n FROM schedule_records WHERE date = ? AND analysis_reasoning IS NOT NULL', anchor);
    const edited = one('SELECT COUNT(*) n FROM schedule_records WHERE edit_count > 0 AND updated_at > created_at');
    check('详情 9 字段', src.n === SLOTS.length && reason.n === SLOTS.length,
      'want 锚点日 ' + SLOTS.length + ' 条三字段齐，got 来源=' + src.n + ' 归因=' + reason.n);
    check('修正样例', edited.n >= 1, 'want edit_count>0 且 updated_at>created_at 至少 1 条，got ' + edited.n);

    const wantPlans = PLAN_SLOTS.length * spec.planDays.length + EXTRA_PLANS.length;
    const plans = one('SELECT COUNT(*) n FROM schedule_plans');
    const planDays = one('SELECT COUNT(DISTINCT date) d FROM schedule_plans WHERE is_active = 1');
    check('计划条数与天数', plans.n === wantPlans && planDays.d === spec.planDays.length,
      'want ' + wantPlans + ' 条／' + spec.planDays.length + ' 天，got ' + plans.n + ' 条／' + planDays.d + ' 天');
    const completions = new Set(all('SELECT DISTINCT completion FROM schedule_plans WHERE is_active = 1').map((r) => r.completion));
    const missing = api.VALID_COMPLETIONS.filter((c) => !completions.has(c));
    check('完成态齐', missing.length === 0 && completions.has(null),
      'want 6 态齐 ＋ 未复盘(null)，got 缺=' + (missing.length ? missing.join('/') : '无') + '，null=' + completions.has(null));
    const inactive = one('SELECT COUNT(*) n FROM schedule_plans WHERE is_active = 0');
    const synced = one('SELECT COUNT(*) n FROM schedule_plans WHERE feishu_event_id IS NOT NULL AND last_synced_at IS NOT NULL');
    check('软删与飞书态', inactive.n >= 1 && synced.n >= 2,
      'want 软删 ≥1 条、已同步 ≥2 条，got 软删=' + inactive.n + ' 已同步=' + synced.n);
    const futureOpen = one('SELECT COUNT(*) n FROM schedule_plans WHERE date > ? AND is_active = 1 AND completion IS NOT NULL', anchor);
    check('未来未复盘', futureOpen.n === 0, 'want 未来条目 completion 全为 null，got 已标记 ' + futureOpen.n + ' 条');
    const plannedHours = one('SELECT COUNT(DISTINCT substr(time_start, 1, 2)) h FROM schedule_plans WHERE date = ? AND is_active = 1', anchor);
    check('锚点日计划格', plannedHours.h >= 6, 'want 锚点日已规划 ≥6 格，got ' + plannedHours.h);

    const sum = one('SELECT COUNT(*) n, COUNT(DISTINCT date) d FROM daily_summary');
    const thin = all('SELECT date, COUNT(*) n FROM daily_summary GROUP BY date HAVING n <> ?', spec.level1.length);
    check('摘要行', sum.n === spec.summaryDays.length * spec.level1.length && sum.d === spec.summaryDays.length && thin.length === 0,
      'want ' + spec.summaryDays.length * spec.level1.length + ' 行／每天 ' + spec.level1.length + ' 行，got ' + sum.n + ' 行／' + sum.d + ' 天'
      + (thin.length ? ' 异样=' + JSON.stringify(thin.slice(0, 3)) : ''));
    const mismatch = all('SELECT s.date, SUM(s.total_minutes) sm, (SELECT SUM(r.duration_minutes) FROM schedule_records r WHERE r.date = s.date) rm FROM daily_summary s GROUP BY s.date HAVING sm <> rm');
    check('摘要与记录对得上', mismatch.length === 0,
      'want 每天摘要合计＝当天记录合计，got 对不上的天=' + (mismatch.length ? JSON.stringify(mismatch.slice(0, 3)) : '无'));
  } finally {
    api.closeScheduleDb(handle);
  }
  return { checks: out };
}

// ---------- 真家目录探针自证（一次性沙盒；不碰真家目录） ----------
function selftest() {
  const sandbox = mkdtempSync(join(tmpdir(), 't844-selftest-'));
  const root = join(sandbox, '.ilife');
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'keep.txt'), 'A', 'utf8');
  writeFileSync(join(root, 'data', 'db.bin'), 'D', 'utf8');
  const probes = {
    零写: 'process.exit(0);\n',
    新增件: "import { writeFileSync } from 'node:fs';writeFileSync(process.env.T844_PROBE_TARGET,'x');\n",
    改内容: "import { writeFileSync } from 'node:fs';writeFileSync(process.env.T844_PROBE_TARGET,'B');\n",
  };
  const cases = [
    { name: '零写', file: 'keep.txt', expectRed: false },
    { name: '新增件', file: 'probe-new.txt', expectRed: true },
    { name: '改内容', file: 'keep.txt', expectRed: true },
  ];
  let failed = 0;
  cases.forEach((c, i) => {
    const probe = join(sandbox, 'probe-' + i + '.mjs');
    writeFileSync(probe, probes[c.name], 'utf8');
    const before = snapshotTree(root);
    const r = spawnSync(process.execPath, [probe], { encoding: 'utf8', env: { ...process.env, T844_PROBE_TARGET: join(root, c.file) } });
    const diff = diffSnapshots(before, snapshotTree(root));
    const red = !diff.same;
    if (red !== c.expectRed || r.status !== 0) failed += 1;
    console.log('SELFTEST ' + (red === c.expectRed ? 'PASS' : 'FAIL') + ' 情形=' + c.name + ' 期望变红=' + c.expectRed + ' 实测变红=' + red
      + ' 差异 新增/删除/改动=' + diff.added.length + '/' + diff.removed.length + '/' + diff.changed.length);
  });
  rmSync(sandbox, { recursive: true, force: true });
  console.log('RESULT: ' + (failed === 0 ? 'PASS' : 'FAIL') + ' 探针自证 ' + (cases.length - failed) + '/' + cases.length + '（零写⇒绿／新增件⇒红／改内容⇒红）');
  return failed === 0 ? 0 : 1;
}

// ---------- 主流程 ----------
function dbCount(api, dbPath, table) {
  const handle = api.openScheduleDb(dbPath);
  try { return Number(handle.db.prepare('SELECT COUNT(*) n FROM ' + table).get().n); } finally { api.closeScheduleDb(handle); }
}
function coverCount(api, dbPath) {
  const handle = api.openScheduleDb(dbPath);
  try {
    return new Set(handle.db.prepare('SELECT DISTINCT category FROM schedule_records').all().map((r) => api.l1Of(r.category))).size;
  } finally { api.closeScheduleDb(handle); }
}

async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    const doc = readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//);
    console.log(doc ? doc[1].replace(/^\s*\*?/gm, '').trim() : 'seed.mjs');
    return 0;
  }
  if (argv.includes('--selftest')) return selftest();
  assertUnderSeed(SEED_ROOT, '种子根');
  if (argv.includes('--reset') && existsSync(SEED_ROOT)) rmSync(assertUnderSeed(SEED_ROOT, '重置目标'), { recursive: true, force: true });
  mkdirSync(SEED_ROOT, { recursive: true });
  // 隔离家目录：先接管当刻进程的家目录，再断言它不是真实家目录（缺了即抛，零写）。
  useHome(HOME_DIR);
  requireIsolatedHome(HOME_DIR);
  const api = {
    ...await import(new URL('../dist/fetch/index.js', import.meta.url).href),
    ...await import(new URL('../dist/policy/index.js', import.meta.url).href),
  };
  const anchor = argv.includes('--anchor') ? api.normalizeDate(argv[argv.indexOf('--anchor') + 1], '--anchor') : api.todayStr();
  const real = realConfigDir();
  console.log('ANCHOR date=' + anchor + ' 记录窗=' + dayOf(anchor, -DAYS_BACK) + '~' + anchor
    + ' 计划窗=' + dayOf(anchor, -PLAN_BACK) + '~' + dayOf(anchor, PLAN_FWD) + ' 模式=' + (argv.includes('--check') ? '--check' : '默认'));
  console.log('HOME 隔离=' + HOME_DIR + ' 真实=' + real.dir + '（判据源=' + real.source + '）');

  const realBefore = snapshotTree(real.dir);
  const fpBefore = fingerprint();
  const built = buildSeed(api, STAGE_DB, anchor);
  const stageDigest = contentDigest(api, STAGE_DB);
  const { checks } = verify(api, STAGE_DB, built, anchor);

  // 可复现：同锚点再建一份，内容摘要必须逐字相同。
  buildSeed(api, REPRO_DB, anchor);
  const reproDigest = contentDigest(api, REPRO_DB);
  checks.push({ name: '同锚点可复现', ok: stageDigest === reproDigest, detail: 'stage=' + stageDigest.slice(0, 16) + ' repro=' + reproDigest.slice(0, 16) });
  console.log((stageDigest === reproDigest ? 'OK  ' : 'RED ') + '同锚点可复现 :: ' + checks[checks.length - 1].detail);
  rmDbFiles(REPRO_DB);
  rmSync(assertUnderSeed(dirname(REPRO_DB), '复现暂存'), { recursive: true, force: true });

  // dist 指纹绑定（协议 §2.6）：窗口内这些编译件一动，本次读数作废。
  const fpAfter = fingerprint();
  checks.push({ name: 'dist 指纹未漂移', ok: fpBefore === fpAfter, detail: 'before=' + fpBefore + ' after=' + fpAfter });
  console.log((fpBefore === fpAfter ? 'OK  ' : 'RED ') + 'dist 指纹未漂移 :: ' + checks[checks.length - 1].detail);

  // 真家目录：跑前跑后逐件比对（size ＋ mtime ＋ sha256），有差异即点名。
  const diff = diffSnapshots(realBefore, snapshotTree(real.dir));
  checks.push({
    name: '真实 ~/.ilife 未动', ok: diff.same,
    detail: '新增=' + diff.added.length + ' 删除=' + diff.removed.length + ' 改动=' + diff.changed.length
      + (diff.same ? '' : ' ' + JSON.stringify([...diff.added, ...diff.removed, ...diff.changed].slice(0, 3))),
  });
  console.log((diff.same ? 'OK  ' : 'RED ') + '真实 ~/.ilife 未动 :: ' + checks[checks.length - 1].detail);

  const counts = {
    records: dbCount(api, STAGE_DB, 'schedule_records'),
    plans: dbCount(api, STAGE_DB, 'schedule_plans'),
    summary: dbCount(api, STAGE_DB, 'daily_summary'),
    cover: coverCount(api, STAGE_DB),
  };
  const reading = `记录 ${counts.records}／计划 ${counts.plans}／摘要 ${counts.summary}／一级分类覆盖 ${counts.cover}/${built.level1.length}`;
  const red = checks.filter((c) => !c.ok);
  if (red.length > 0) {
    rmDbFiles(STAGE_DB);
    console.log('RESULT: ' + reading);
    console.log('FAIL ' + red.length + '/' + checks.length + ' 条核验变红（暂存库已删，落点里仍是上一份）：' + red.map((c) => c.name).join('、'));
    return 1;
  }

  // 全绿才落库（协议 §2.5 第 1 条：断言是前置条件，不是事后报表）。
  mkdirSync(DATA_DIR, { recursive: true });
  rmDbFiles(DB_PATH);
  renameSync(STAGE_DB, DB_PATH);
  rmSync(assertUnderSeed(dirname(STAGE_DB), '暂存目录'), { recursive: true, force: true });
  const dbSha = sha256(readFileSync(DB_PATH));
  writeFileSync(META_PATH, JSON.stringify({
    version: SEED_VERSION, anchor, generatedAt: new Date().toISOString(), dbPath: DB_PATH,
    records: counts.records, plans: counts.plans, summary: counts.summary, level1: built.level1.length,
    contentSha: stageDigest, dbSha256: dbSha,
    windows: {
      records: [built.recordDays[0], built.recordDays[built.recordDays.length - 1]],
      plans: [built.planDays[0], built.planDays[built.planDays.length - 1]],
      summary: [built.summaryDays[0], built.summaryDays[built.summaryDays.length - 1]],
    },
  }, null, 2) + '\n', 'utf8');
  console.log('SEED 已落库=' + DB_PATH + ' dbSha256=' + dbSha.slice(0, 16) + ' contentSha=' + stageDigest.slice(0, 16));
  console.log('META ' + META_PATH);
  console.log('用法 下游票把家目录指过来即可：win32 $env:USERPROFILE=\'' + HOME_DIR + '\'；POSIX export HOME=\'' + HOME_DIR + '\'');
  console.log('RESULT: ' + reading);
  console.log('PASS ' + checks.length + '/' + checks.length + ' 条核验通过');
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  console.log('RESULT: ABORT exit=2 :: 未捕获异常 :: ' + (err?.stack ?? err));
  process.exitCode = 2;
}
