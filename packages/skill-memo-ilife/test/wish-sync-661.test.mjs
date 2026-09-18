/**
 * #661 · 备忘侧：排期日期（`due`）＋ 心愿飞书层五操作 ＋ 反向对账 —— 合成写接缝常驻用例
 *（#665 DB 对齐版：本地库是直连的 `memo.db`，行是老 `notes` 表形状；`title/body` 双参数收敛到
 * `content` 单列——正文优先、标题补位；D-24 回摆：对账步 2 走老 `complete-wish` 原子转换）。
 *
 * 判据与接缝见 `docs/agents/合成写判据.md`：**一个接缝**（技能统一出口，spawn 包内 `dist/cli/cmd_read.js`）
 * ＋ **两个注入点**（临时库目录＝配置项 `db.dir`／可替换的远端挡板＝配置项 `lark.cliPath`，两者都经
 * `ILIFE_CONFIG_DIR` 指向的临时配置目录里的 `memo.yaml` 注入；挡板本体 → `tooling/contract-lark-stub.mjs`）。
 * 不立内部模块接缝：所有断言只读三个边界——
 * **出口回执**、**本地库行**、**远端挡板收到的调用**。
 *
 * #695：`SKILLS_DB_PATH`／`LARK_CLI_PATH` 两个环境变量已按用户裁决删除（配置文件是唯一真相），
 * 本件照旧只打同一个出口，只是把两个注入点换成了写 `memo.yaml`。
 *
 * 读数与老实现不变量（`docs/skills/skill-memo-ilife/t659-不变量清单.md` 的 M-01～M-13）逐条对上；
 * 有意偏离（D-21～D-27，D-24 回摆待签）另立读数，两行机器读数见
 * `docs/skills/skill-memo-ilife/t658-C-向导与页面-证据.md`。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argOf, envelope, fourReadings, makeSeam } from '../../../tooling/contract-seam.mjs';
import { configEnv, mkMemoConfig } from './helpers/config-base.mjs';

const WISH = '买跑鞋';
const BODY = '跑马拉松用';
const DUE = '2026-09-25';
const CREATE = { title: WISH, body: BODY, category: '心愿', due: DUE };
const STAT_KEYS = [
  'backfilled', 'scannedDone', 'synced', 'scannedPending', 'dueAdded', 'dueOverridden', 'dueRemoved',
  'skippedNoMark', 'skippedAlreadyDone', 'skippedNoLocalNote', 'errors',
];

function seam(prefix, state) { return makeSeam('memo', { prefix, state }); }

/** 两个注入点都改走**配置文件**（#695：`SKILLS_DB_PATH`／`LARK_CLI_PATH` 的读取已按用户裁决删除）：
 *  临时库写 `db.dir`、远端挡板写 `lark.cliPath`；测试隔离的唯一口子是 `ILIFE_CONFIG_DIR`。 */
function envOfSeam(s) {
  return configEnv(mkMemoConfig({ db: { dir: s.dbPath }, lark: { cliPath: s.stub.file } }, 't661-cfg-'));
}

/** 跑一次出口，把三条痕迹一次取齐：回执、本地行、远端收到的调用。 */
function run(s, key, params) {
  s.stub.clearCalls();
  const r = s.runNew(key, params, { extraEnv: envOfSeam(s) });
  let env = null; let why = null;
  try { env = envelope(r); } catch (e) { why = e.message; }
  return { r, env, why, exit: r.status, argv: s.calls().map((c) => c.argv), rows: s.localNew() };
}
// 本地行是老 `notes` 表形状：正文只认 `content` 一列。
const rowOf = (rows, content) => rows.find((n) => n.content === content);
const opCalls = (argv, op) => argv.filter((a) => a[1] === op);
/** 远端真删那条：走**原生 resource** `task tasks delete`（短路里没有 `+delete`，见挡板与 taskWrite.ts 的注释）。 */
const deleteCalls = (argv) => argv.filter((a) => a[0] === 'task' && a[1] === 'tasks' && a[2] === 'delete');

/* ─────────────── 一、记一条心愿 ＝ 一条命令做两侧 ─────────────── */

test('#661 T1 记一条心愿：本地落 ＋ 远端建（带排期日期／归属标记／指派），标识回写本地', () => {
  const s = seam('t661-a-');
  const x = run(s, 'memo.create', CREATE);
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(x.env.data.local, 'created');
  assert.equal(x.env.data.remote, 'created');

  const row = rowOf(x.rows, BODY);
  assert.equal(row.category, '心愿');
  assert.equal(row.due, DUE, 'M-02：排期日期落本地');
  assert.equal(row.feishu_task_guid, x.env.data.remoteId, 'M-06：远端标识回写本地');

  const create = opCalls(x.argv, '+create')[0];
  assert.ok(create, '远端必须收到一次 task +create');
  assert.equal(argOf(create, '--summary'), BODY, '题文双参数收敛到 content 单列（正文优先）');
  assert.equal(argOf(create, '--due'), DUE);
  assert.equal(argOf(create, '--assignee'), 'ou_stub_user');
  assert.equal(argOf(create, '--description'), '原备忘 #' + row.id, 'M-05：归属标记逐字（数字 id，老口径）');
  assert.equal(s.remote().tasks.length, 1);
});

test('#661 T2 四条读数模板 · 心愿 memo.create（本地侧／远端侧／远端标识三格分开读）', () => {
  const s = seam('t661-b-');
  const verdicts = fourReadings({
    seam: s,
    whatObject: '飞书任务',
    act: (x) => x.runNew('memo.create', CREATE, { extraEnv: envOfSeam(x) }),
    remoteOff: (x) => x.stub.setState({ mode: 'unavailable' }),
    receipt: (env) => ({
      本地侧: env && env.data ? env.data.local : undefined,
      远端侧: env && env.data ? env.data.remote : undefined,
      远端标识: env && env.data ? env.data.remoteId : undefined,
    }),
    marker: (argv) => { const d = argOf(argv, '--description'); return d && /^原备忘 #\d+$/.test(d) ? d : null; },
    reportedOff: (off) => !!(off.env && off.env.data && off.env.data.remote === 'unavailable'),
  });
  console.log('#661 四条读数：' + verdicts.map((v) => v.id + '=' + v.verdict + '(' + JSON.stringify(v.reading) + ')').join(' | '));
  assert.equal(verdicts.length, 4, '四条读数一条都不能少');
  for (const v of verdicts) assert.equal(v.verdict, 'pass', v.name + ' 未达标：' + JSON.stringify(v.reading));
});

/* ─────────────── 二、两侧各自判重 ─────────────── */

test('#661 T3 M-04 建前查重（远端侧自然键）：远端已有同文同排期 → 复用标识、不重复建', () => {
  const s = seam('t661-c-', { tasks: [{ guid: 'tk_seed', summary: BODY, description: '原备忘 #seed', due: DUE, completed_at: '' }] });
  const x = run(s, 'memo.create', CREATE);
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(opCalls(x.argv, '+create').length, 0, '远端已有一条就不该再建');
  assert.equal(x.env.data.remote, 'existing');
  assert.equal(x.env.data.remoteId, 'tk_seed');
  assert.equal(rowOf(x.rows, BODY).feishu_task_guid, 'tk_seed');
  assert.equal(s.remote().tasks.length, 1);
});

test('#661 T9 偏离 D-22：无排期日期的心愿也查重（老实现只在有 due 时查）', () => {
  const s = seam('t661-i-');
  const input = { title: '学琴', body: '学琴', category: '心愿' };
  assert.equal(run(s, 'memo.create', input).exit, 0);
  const again = run(s, 'memo.create', input);
  assert.equal(again.exit, 0, String(again.r.stderr));
  assert.equal(again.env.data.local, 'existing');
  assert.equal(again.env.data.remote, 'existing');
  assert.equal(opCalls(again.argv, '+create').length, 0);
  assert.equal(s.localNew().length, 1);
  assert.equal(s.remote().tasks.length, 1);
});

test('#661 T10 偏离 D-21：长正文的查重键与写入键同为 200 字截断', () => {
  const s = seam('t661-j-');
  const long = 'x'.repeat(260);
  const input = { title: long, body: long, category: '心愿', due: DUE };
  assert.equal(run(s, 'memo.create', input).exit, 0);
  const again = run(s, 'memo.create', input);
  assert.equal(opCalls(again.argv, '+create').length, 0, '长正文心愿也要查得中（老实现比不中，必重复建）');
  assert.equal(s.remote().tasks.length, 1);
  assert.equal(s.remote().tasks[0].summary.length, 200);
});

/* ─────────────── 三、心愿飞书层五操作 ＋ 完成原子转换 ─────────────── */

test('#661 T4 五操作：建／改题／改期／清期（清期走接口的显式空值通道）＋完成转打卡', () => {
  const s = seam('t661-d-');
  assert.equal(run(s, 'memo.create', CREATE).exit, 0);
  const id = rowOf(s.localNew(), BODY).id;

  const retitled = run(s, 'memo.update', { id, title: '买越野跑鞋' });
  assert.equal(retitled.exit, 0, String(retitled.r.stderr));
  assert.equal(argOf(opCalls(retitled.argv, '+update')[0], '--summary'), '买越野跑鞋');
  assert.equal(retitled.env.data.remote, 'synced');

  const moved = run(s, 'memo.update', { id, due: '2026-10-01' });
  assert.equal(moved.exit, 0, String(moved.r.stderr));
  assert.equal(argOf(opCalls(moved.argv, '+update')[0], '--due'), '2026-10-01');
  assert.equal(rowOf(s.localNew(), '买越野跑鞋').due, '2026-10-01');

  const cleared = run(s, 'memo.update', { id, due: null });
  assert.equal(cleared.exit, 0, String(cleared.r.stderr));
  const patch = opCalls(cleared.argv, '+update')[0];
  assert.ok(patch, '清期也要打到远端');
  assert.equal(argOf(patch, '--data'), '{"due": null}', '清空只能走 --data 的显式空值通道');
  assert.equal(argOf(patch, '--due'), undefined, '不得拿常规 --due 参数表达清空');
  assert.equal(rowOf(s.localNew(), '买越野跑鞋').due, null);
  assert.equal(String(s.remote().tasks[0].due), '', '远端 due 同步清空');

  // 完成是原子转换（老 `complete-wish`）：删心愿 ＋ 生成打卡 ＋ 远端标完成。
  const completed = run(s, 'memo.update', { id, done: true, content: '首跑5公里' });
  assert.equal(completed.exit, 0, String(completed.r.stderr));
  assert.equal(opCalls(completed.argv, '+complete').length, 1);
  assert.equal(rowOf(s.localNew(), '买越野跑鞋'), undefined, '心愿已删');
  const checkin = rowOf(s.localNew(), '首跑5公里');
  assert.equal(checkin.category, '打卡');
});

test('#661 T5 批量排期：一批 id ＋ 一个日期；非心愿逐条记账、不静默吞', () => {
  const s = seam('t661-e-');
  assert.equal(run(s, 'memo.create', CREATE).exit, 0);
  assert.equal(run(s, 'memo.create', { title: '买菜', body: '买菜', category: '备忘' }).exit, 0);
  const wish = rowOf(s.localNew(), BODY);
  const plain = rowOf(s.localNew(), '买菜');

  const x = run(s, 'memo.update', { ids: [wish.id, plain.id], due: '2026-10-05' });
  assert.equal(x.env.data.updated, 1);
  assert.equal(x.env.data.feishuSynced, 1);
  assert.equal(x.env.data.skipped, 1, '非心愿那条要记账');
  assert.equal(x.env.data.remote, 'partial');
  assert.equal(x.exit, 4, '有一条没做成就不能报成');
  assert.equal(argOf(opCalls(x.argv, '+update')[0], '--due'), '2026-10-05');
  assert.equal(rowOf(x.rows, BODY).due, '2026-10-05');
  assert.equal(rowOf(x.rows, '买菜').due, null, '排期日期只对心愿生效');
});

test('#661 T6 删心愿 · C 口径：默认照老标完成；显式 purge 才真删（D-23）', () => {
  // 默认：本地删掉，飞书那条留成「已完成」终态（与老实现一致）。
  const s = seam('t661-f-');
  assert.equal(run(s, 'memo.create', CREATE).exit, 0);
  const id = rowOf(s.localNew(), BODY).id;
  const x = run(s, 'memo.remove', { id, confirm: true });
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(opCalls(x.argv, '+complete').length, 1, '默认＝远端标完成（老口径）');
  assert.equal(deleteCalls(x.argv).length, 0, '默认不碰远端任务本体');
  assert.equal(s.remote().tasks.length, 1, '默认：远端任务留着（已完成终态）');
  assert.ok(s.remote().tasks[0].completed_at.length > 0, '留着的那条状态是「已完成」');
  assert.equal(s.localNew().length, 0, '本地照样删掉');

  // 显式 purge：真删（原生 resource `task tasks delete --task-guid <guid>`，不是短路 `+delete`）。
  const s2 = seam('t661-f2-');
  assert.equal(run(s2, 'memo.create', CREATE).exit, 0);
  const row2 = rowOf(s2.localNew(), BODY);
  const y = run(s2, 'memo.remove', { id: row2.id, confirm: true, purge: true });
  assert.equal(y.exit, 0, String(y.r.stderr));
  const del = deleteCalls(y.argv)[0];
  assert.ok(del, 'purge 要打远端真删');
  assert.equal(argOf(del, '--task-guid'), row2.feishu_task_guid, '--task-guid 传的是远端标识');
  assert.equal(opCalls(y.argv, '+complete').length, 0, 'purge 那支不再标完成');
  assert.equal(s2.remote().tasks.length, 0, '远端任务被清掉');
  assert.equal(s2.localNew().length, 0);

  // 远端早被手工删过（挡板里已无这条）→ purge 仍删得掉本地，不留删不掉的账。
  const s3 = seam('t661-f3-');
  assert.equal(run(s3, 'memo.create', CREATE).exit, 0);
  s3.stub.setState({ tasks: [] });
  const z = run(s3, 'memo.remove', { id: rowOf(s3.localNew(), BODY).id, confirm: true, purge: true });
  assert.equal(z.exit, 0, String(z.r.stderr));
  assert.equal(s3.localNew().length, 0);
});

/* ─────────────── 四、反向对账三步 ＋ 11 项统计 ─────────────── */

test('#661 T7 M-09 反向对账三步：本地补建／远端完成→本地原子转换／远端改期→本地（含 11 项统计）', () => {
  const s = seam('t661-g-');
  // 布景：远端不可用时记一条 → 本地有、远端无（步 1 的对象）。
  s.stub.setState({ mode: 'unavailable' });
  const made = run(s, 'memo.create', CREATE);
  assert.equal(made.exit, 4, '远端不可用：本地照落，但这一趟没达成');
  assert.equal(made.env.data.remote, 'unavailable');
  assert.equal(made.env.data.local, 'created');
  const id = rowOf(made.rows, BODY).id;
  assert.equal(rowOf(made.rows, BODY).feishu_task_guid, null);

  // 步 1：本地缺标识 → 补建远端任务并回写标识。
  s.stub.setState({ mode: 'normal' });
  let x = run(s, 'memo.sync', {});
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(x.env.data.backfilled, 1);
  const guid = rowOf(s.localNew(), BODY).feishu_task_guid;
  assert.ok(guid, '补建后标识必须回写本地');
  assert.equal(s.remote().tasks.length, 1);

  // 步 2：远端完成 → 本地原子转换（D-24 回摆待签：删心愿 ＋ 生成打卡，老 `complete-wish` 原文）。
  s.stub.setState({ tasks: s.remote().tasks.map((t) => ({ ...t, completed_at: '2026-09-18T03:00:00.000Z' })) });
  x = run(s, 'memo.sync', {});
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(x.env.data.scannedDone, 1);
  assert.equal(x.env.data.synced, 1);
  assert.equal(s.localNew().find((n) => n.content === BODY && n.category === '心愿'), undefined, 'D-24 回摆：心愿已删，不再是标完成');
  const checkin = s.localNew().find((n) => n.category === '打卡');
  assert.equal(checkin.content, BODY, 'D-24 回摆：打卡已生成（拷贝心愿原文）');

  // 步 3：远端改排期 → 本地跟着改（对账时远端优先）。另起一条心愿，避免步 2 已删无对象。
  const s2 = seam('t661-g3-');
  assert.equal(run(s2, 'memo.create', CREATE).exit, 0);
  const id2 = rowOf(s2.localNew(), BODY).id;
  const guid2 = rowOf(s2.localNew(), BODY).feishu_task_guid;
  s2.stub.setState({ tasks: [{ guid: guid2, summary: BODY, description: '原备忘 #' + id2, due: '2026-11-11', completed_at: '' }] });
  x = run(s2, 'memo.sync', {});
  assert.equal(x.exit, 0, String(x.r.stderr));
  assert.equal(x.env.data.scannedPending, 1);
  assert.equal(x.env.data.dueOverridden, 1);
  assert.equal(rowOf(s2.localNew(), BODY).due, '2026-11-11');

  for (const k of STAT_KEYS) assert.ok(k in x.env.data, '回执缺统计项：' + k);
  assert.equal(Object.keys(x.env.data).filter((k) => STAT_KEYS.includes(k)).length, 11);
});

test('#661 T8 远端不可用时对账如实报没成：本地不动、回执标明、退出码非零', () => {
  const s = seam('t661-k-');
  assert.equal(run(s, 'memo.create', CREATE).exit, 0);
  const before = s.localNew();
  s.stub.setState({ mode: 'unavailable' });
  const x = run(s, 'memo.sync', {});
  assert.equal(x.exit, 4);
  assert.equal(x.env.data.remote, 'unavailable');
  assert.equal(x.env.data.ok, false);
  assert.deepEqual(s.localNew(), before, '远端不可用时对账不改本地');
  for (const k of STAT_KEYS) assert.ok(k in x.env.data, '没跑成也要给全 11 项统计：' + k);
});

/* ─────────────── 五、排期日期：只对心愿生效 ＋ 检索过滤 ─────────────── */

test('#661 T11 排期日期只对心愿生效；检索能按排期日期过滤', () => {
  const s = seam('t661-h-');
  const plain = run(s, 'memo.create', { title: '买菜', body: '买菜', category: '备忘', due: DUE });
  assert.equal(plain.exit, 0, String(plain.r.stderr));
  assert.equal(rowOf(plain.rows, '买菜').due, null, '非心愿：静默置空，不报错');
  assert.equal(plain.argv.length, 0, '非心愿不碰远端');

  assert.equal(run(s, 'memo.create', CREATE).exit, 0);
  assert.equal(run(s, 'memo.create', { title: '学琴', body: '学琴', category: '心愿' }).exit, 0);
  assert.equal(run(s, 'memo.wish', {}).env.data.total, 2);

  const scheduled = run(s, 'memo.search', { hasDue: true });
  assert.equal(scheduled.env.data.total, 1);
  const exact = run(s, 'memo.search', { due: DUE });
  assert.equal(exact.env.data.total, 1);
  assert.equal(exact.env.data.items[0].content, BODY);
  assert.equal(run(s, 'memo.search', { dueBefore: '2026-09-30' }).env.data.total, 1);
  assert.equal(run(s, 'memo.search', { dueAfter: '2026-09-30' }).env.data.total, 0);
  assert.equal(run(s, 'memo.search', { due: '2026-01-01' }).env.data.total, 0);
});
