#!/usr/bin/env node
/**
 * #676 · 落地训练／训记外调的**统一 fixture**（替代退役的 `CALORIE_LAND_*_STUB`／`CALORIE_XUNJI_STUB`）。
 *
 * 为什么需要它：落地训练会往外调三处——「补计划」（作息技能）、「记心愿」（备忘技能）、
 * 以及训记模块自己的命令行入口（推送＋回写）。测试里这三处绝不能真调（会写用户的真作息／真备忘库、
 * 会打真训记接口），原先是六个环境变量短路；配置文件成为唯一真相后，短路口换成**配置里的三个出口**：
 * `land.scheduleCli`／`land.memoCli`／`xunji.cli` 都指向本件。
 * #757 起跨技能两出口删键（出口按包布局推断）：那两处改走**文件缝**
 * （`land-inferred-stub.mjs` 把本件暂放到推断位置），`xunji.cli` 页外键照旧走配置指到本件。
 *
 * 两种身份（按 `argv[0]` 判）：
 *   ① **跨技能出口**（argv[0] 是对方的能力键，如 `schedule.plan.write`）——stdout 打一行
 *      `{"data": <回执>}`（`landRunner.invokeOther` 只认这一位），按 code 退出；
 *   ② **训记入口**（argv[0] 是训记子命令，如 `push-plan`）——stdout 打**回执本身**
 *      （真入口 `xunji/cli.ts` 打的就是 `run.data` 的 JSON），按 code 退出。
 *
 * 用法（测试侧）：
 *   ① 训记入口走配置：`calorieConfigDir(dir, { xunji: { cli: F } })`；跨技能两处走文件缝
 *      （`land-inferred-stub.mjs` 的 `before/after`，本件被暂放到推断位置，无需写配置）；
 *   ② 子进程环境里给 `T676_LAND_FIXTURE`：JSON `{ "<argv[0]>": { code, data } }`，
 *      缺省＝全部成功（`code: 0`，`data` 取下面 `DEFAULT_DATA`）。
 *   `T676_LAND_FIXTURE_LOG` 给了路径就往那里**追加**一行 `{"key":…,"params":…}`（断言「调了什么」用）。
 *
 * 本件不是测试件（不匹配 `test/*.test.mjs`），与同目录 `pin-clock.mjs` 同列。
 */
import { appendFileSync } from 'node:fs';

const key = process.argv[2] ?? '';
let params = {};
const at = process.argv.indexOf('--params');
if (at >= 0 && typeof process.argv[at + 1] === 'string') {
  try { params = JSON.parse(process.argv[at + 1]); } catch { params = { raw: process.argv[at + 1] }; }
}
/** 训记子命令的其余实参也要留痕（如 `--date`／`--days`）。 */
const rest = process.argv.slice(3);

/** 缺省回执（与 `t612`／`t613`／`t614` 原来的挡板数据同形）。 */
const DEFAULT_DATA = {
  'schedule.plan.write': {
    ok: true, message: '批量补计划', op: 'ensure', local: 'created',
    remote: 'found_feishu', remoteId: 'fs_1', achieved: true, errors: [], notes: [],
  },
  'memo.create': { ok: true, message: '已记一条：1', local: 'created', remote: 'synced', remoteId: 'task_1' },
  'push-plan': {
    date: '2026-09-07', session_count: 1, ok_count: 1, fail_count: 0, verify_note: 'fixture',
    results: [{ session_label: '上肢', client_request_id: '2026-09-07_上肢_ab12cd34', ok: true, verified: false, resp: { dry_run: false } }],
  },
  backfill: {
    end_date: '2026-09-07', days: 1, total_inserted: 2, total_updated: 0,
    results: [{
      date: '2026-09-07', fetch_ok: true, trains_count: 2, inserted: 2, updated: 0,
      skipped_empty: false, body_weight_kg: 70.5, errors: [], err: null, failure: null,
    }],
  },
};

const table = (() => {
  const raw = process.env.T676_LAND_FIXTURE;
  if (raw === undefined || raw === '') return {};
  try { return JSON.parse(raw); } catch { return {}; }
})();

const log = process.env.T676_LAND_FIXTURE_LOG;
if (log !== undefined && log !== '') {
  appendFileSync(log, JSON.stringify({ key, params, rest }) + '\n', 'utf8');
}

/** 训记子命令（身份②）：argv 首位不是点式能力键就是训记那两条。 */
const isXunjiEntry = !key.includes('.');

const hit = table[key];
/** 按日期指定失败（替代退役的 `CALORIE_LAND_BATCH_FAIL_DATE`：逐天链里某天要红时用）。 */
const failDate = process.env.T676_LAND_FIXTURE_FAIL_DATE;
const dateArg = (() => {
  const i = process.argv.indexOf('--date');
  return i >= 0 ? process.argv[i + 1] : undefined;
})();
const forced = failDate !== undefined && failDate !== '' && failDate === dateArg;
const code = forced ? 4 : (typeof hit?.code === 'number' ? hit.code : 0);
const data = forced
  ? (DEFAULT_DATA[key] && key === 'push-plan'
    ? { ...DEFAULT_DATA['push-plan'], ok_count: 0, fail_count: 1, results: [{ session_label: '上肢', ok: false, verified: false, resp: { err: true, error_type: 'server', code: 500, attempts: 3 } }] }
    : { ok: false, message: 'fixture 指定失败：' + String(dateArg) })
  : (hit?.data !== undefined ? hit.data : (DEFAULT_DATA[key] ?? { ok: true, message: 'fixture 默认回执' }));
process.stdout.write((isXunjiEntry ? JSON.stringify(data, null, 2) : JSON.stringify({ data })) + '\n');
process.exit(code);
