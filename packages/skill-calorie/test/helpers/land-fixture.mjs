#!/usr/bin/env node
/**
 * #676 · 落地训练测试的**跨技能出口 fixture**（替代退役的 `CALORIE_LAND_*_STUB` 环境变量）。
 *
 * 为什么需要它：落地训练会把「补计划」（作息）与「记心愿」（备忘）调到**别的技能**去。测试里那两处
 * 绝不能真调（会写用户的真作息／真备忘库），原先是四个环境变量短路；配置文件成为唯一真相后，
 * 短路口换成**配置里的两个跨技能出口**：`land.scheduleCli`／`land.memoCli` 指向本件。
 *
 * 用法（测试侧）：
 *   ① `calorieConfigDir(dir, { land: { scheduleCli: LAND_FIXTURE, memoCli: LAND_FIXTURE } })`；
 *   ② 子进程环境里给 `T676_LAND_FIXTURE`：JSON `{ "<对方 key>": { code, data } }`，
 *      缺省＝全部成功（`code: 0`，`data` 取下面 `DEFAULT_DATA`）。
 *
 * 出口形状与真出口同形（`invokeOther` 只认 stdout 的 `{data: …}` 与退出码）：打一行
 * `{"data": <回执>}`，按 `code` 退出。`T676_LAND_FIXTURE_LOG` 给了路径就往那里**追加**一行
 * `{"key":…,"params":…}`（测试断言「调了什么、调了几次」用）。
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

/** 缺省回执（与 `t612`／`t613` 原来的挡板数据同形：作息 `achieved:true`、备忘 `remote:'synced'`）。 */
const DEFAULT_DATA = {
  'schedule.plan.write': {
    ok: true, message: '批量补计划', op: 'ensure', local: 'created',
    remote: 'found_feishu', remoteId: 'fs_1', achieved: true, errors: [], notes: [],
  },
  'memo.create': { ok: true, message: '已记一条：1', local: 'created', remote: 'synced', remoteId: 'task_1' },
};

const table = (() => {
  const raw = process.env.T676_LAND_FIXTURE;
  if (raw === undefined || raw === '') return {};
  try { return JSON.parse(raw); } catch { return {}; }
})();

const log = process.env.T676_LAND_FIXTURE_LOG;
if (log !== undefined && log !== '') {
  appendFileSync(log, JSON.stringify({ key, params }) + '\n', 'utf8');
}

const hit = table[key];
const code = typeof hit?.code === 'number' ? hit.code : 0;
const data = hit?.data !== undefined ? hit.data : (DEFAULT_DATA[key] ?? { ok: true, message: 'fixture 默认回执' });
process.stdout.write(JSON.stringify({ data }) + '\n');
process.exit(code);
