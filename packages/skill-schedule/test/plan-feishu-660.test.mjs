/**
 * #660 · 作息侧飞书层完整移植 ＋ 写 op 统一成合成写：本条接缝上的读数。
 *
 * 判据与接缝见 `docs/agents/合成写判据.md`；不变量编号（S-xx）见 `docs/skills/skill-schedule/t659-不变量清单.md`。
 * 接缝只有一个＝技能的统一出口（`dist/cli/cmd_read.js`）；两个注入点＝临时数据目录（`SKILLS_DB_PATH`）
 * 与可替换的远端平台挡板（`LARK_CLI_PATH` → `tooling/contract-lark-stub.mjs`）。**绝不碰真飞书**。
 *
 * 四段读数（每条都点名，不合并成一句「通过了」）：
 *   一 · 四条读数模板（幂等／回执分字段／降级／归属锚）——判据第三节
 *   二 · 飞书层到深度（三阶段合并拉取 · 分片规避上限 · 远端判重 · 孤儿与同槽清理 · 反向对账）
 *   三 · 合成写各 op（覆盖式 upsert · 改时段删旧建新 · 删计划的远端真删 · 自检）
 *   四 · 降级与退出码（D-13 不挂死；本地成了但远端没成 ⇒ 非 0）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeSeam, envelope, fourReadings, argOf } from '../../../tooling/contract-seam.mjs';

const D = '2026-09-21';
const ENSURE = { op: 'ensure', date: D, time_start: '09:00', time_end: '10:00', title: '晨会', notes: '周会' };
const MARK = '作息管家自动同步';

/** 远端一条事件的布景（默认带归属锚——「我管的」判据就是描述里含这个前缀）。 */
const remote = (id, summary, from, to, extra = {}) => ({
  event_id: id,
  summary,
  description: extra.description ?? MARK,
  start: D + 'T' + from + ':00+08:00',
  end: D + 'T' + to + ':00+08:00',
  ...extra,
});

/** 本地一条事件（只做本地那一趟用它种）。 */
const localSeed = (seam, title, from, to, notes) => {
  const p = { op: 'ensure', date: D, time_start: from, time_end: to, title, feishu: 'skip' };
  if (notes) p.notes = notes;
  const r = seam.runNew('schedule.plan.write', p);
  assert.equal(r.status, 0, '本地种子失败：' + String(r.stderr).slice(0, 200));
  return r;
};

/* ─────────── 一 · 四条读数模板（判据第三节） ─────────── */

test('#660 R1 四条读数 · 作息 plan.write op=ensure 全绿', () => {
  const s = makeSeam('schedule', { prefix: 't660-' });
  const verdicts = fourReadings({
    seam: s,
    whatObject: '飞书日历事件',
    act: (seam) => seam.runNew('schedule.plan.write', ENSURE),
    remoteOff: (seam) => seam.stub.setState({ mode: 'unavailable' }),
    receipt: (env) => ({
      本地侧: env && env.data ? env.data.local : undefined,
      远端侧: env && env.data ? env.data.remote : undefined,
      远端标识: env && env.data ? env.data.remoteId : undefined,
    }),
    marker: (argv) => { const d = argOf(argv, '--description'); return d && d.includes(MARK) ? d : null; },
    reportedOff: (off) => !!(off.env && off.env.data && off.env.data.remote === 'unavailable'),
  });
  console.log('#660 R1 四条读数：' + verdicts.map((v) => v.id + '=' + v.verdict + JSON.stringify(v.reading)).join(' | '));
  assert.equal(verdicts.length, 4, '四条一条都不能少');
  for (const v of verdicts) assert.equal(v.verdict, 'pass', v.name + '：' + JSON.stringify(v.reading));
});

/* ─────────── 二 · 飞书层到深度 ─────────── */

test('#660 R2 三阶段合并拉取 · 议程×1 ＋ 6 小时分片×4 ＋ 逐条补描述（S-10）', () => {
  const s = makeSeam('schedule', {
    prefix: 't660-',
    state: {
      // 三条都摆成「+agenda 还索引不到」：只有分片检索读得到。单次上限压到 1 条。
      events: [
        remote('fs_a', '晨会', '02:00', '03:00', { agendaIndexed: false }),
        remote('fs_b', '午休', '08:00', '09:00', { agendaIndexed: false }),
        remote('fs_c', '晚间', '14:00', '15:00', { agendaIndexed: false }),
      ],
      searchCap: 1,
    },
  });
  localSeed(s, '晨会', '02:00', '03:00');
  localSeed(s, '午休', '08:00', '09:00');
  localSeed(s, '晚间', '14:00', '15:00');
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const calls = s.calls().map((c) => c.argv);
  const agenda = calls.filter((a) => a[1] === '+agenda' && a.includes('--start'));
  const search = calls.filter((a) => a[1] === '+search-event');
  const detail = calls.filter((a) => a[1] === 'events' && a[2] === 'get');
  const creates = calls.filter((a) => a[1] === '+create');
  console.log('#660 R2 读数：议程=' + agenda.length + ' 分片=' + search.length + ' 补描述=' + detail.length
    + ' 重复建=' + creates.length + ' 本地标识=' + JSON.stringify(s.localNew().map((x) => x.feishu_event_id)));
  assert.equal(agenda.length, 1, '阶段 1 甲路：整日议程恰好一次');
  assert.equal(search.length, 4, '阶段 1 乙路：按 6 小时切成 4 片');
  assert.deepEqual(
    search.map((a) => argOf(a, '--start').slice(11, 16) + '~' + argOf(a, '--end').slice(11, 16)),
    ['00:00~06:00', '06:00~12:00', '12:00~18:00', '18:00~00:00'],
    '分片窗口就是 6 小时一刀',
  );
  assert.equal(detail.length, 3, '阶段 3：三条（只有分片读到）逐条补描述');
  assert.equal(creates.length, 0, '单次上限吃不到的那两条也被读到了 ⇒ 不重复建（即「不漏读」）');
  assert.deepEqual(s.localNew().map((x) => x.feishu_event_id), ['fs_a', 'fs_b', 'fs_c'], '三条标识都回填本地');
});

test('#660 R3 归属锚写对且能从远端反查回本地（S-06／S-05）', () => {
  const s = makeSeam('schedule', { prefix: 't660-' });
  const r = s.runNew('schedule.plan.write', ENSURE);
  assert.equal(r.status, 0);
  const create = s.calls().map((c) => c.argv).find((a) => a[1] === '+create');
  assert.equal(argOf(create, '--description'), MARK + ' · 周会', '描述＝归属锚 ＋ 备注（老口径逐字）');
  const d = envelope(r).data;
  assert.match(String(d.remoteId), /^fs_evt_/, '远端标识回了本地');
  const hit = s.remote().events.find((e) => e.event_id === d.remoteId);
  assert.equal(hit.description, MARK + ' · 周会');
  assert.equal(s.localNew()[0].feishu_event_id, d.remoteId, '反查：远端那条 ↔ 本地这条，对得上');
});

test('#660 R4 孤儿清理：带锚的该清、不带锚的一律不动（S-12）', () => {
  const s = makeSeam('schedule', {
    prefix: 't660-',
    state: {
      events: [
        remote('fs_orphan_mine', '没人管了', '11:00', '12:00'),
        remote('fs_orphan_other', '用户手建', '13:00', '14:00', { description: '我自己加的' }),
      ],
    },
  });
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const left = s.remote().events.map((e) => e.event_id);
  console.log('#660 R4 读数：远端剩=' + JSON.stringify(left));
  assert.deepEqual(left, ['fs_orphan_other'], '带锚的孤儿清掉、不带锚的原样留着');
  assert.equal(envelope(r).data.counts.deleted, 1);
});

test('#660 R5 同槽兜底清理：改时段后同槽只留一条（S-12 同槽一侧）', () => {
  const s = makeSeam('schedule', {
    prefix: 't660-',
    state: {
      events: [
        remote('fs_old', '晨会', '09:00', '10:00'),
        remote('fs_keep', '晨会', '11:00', '12:00'),
        remote('fs_dup', '晨会', '11:00', '12:00'),
      ],
    },
  });
  localSeed(s, '晨会', '09:00', '10:00');
  // 先认下 09:00 那条（fs_old）：合成写的 ensure 按四元组认出远端已有 → 回填标识，且不碰别的槽位。
  const link = s.runNew('schedule.plan.write', ENSURE);
  assert.equal(link.status, 0, String(link.stderr).slice(0, 200));
  assert.equal(s.localNew()[0].feishu_event_id, 'fs_old', '认下的是旧槽那条');
  const id = s.localNew()[0].id;
  const moved = s.runNew('schedule.plan.write', { op: 'update', id, time_start: '11:00', time_end: '12:00' });
  assert.equal(moved.status, 0, String(moved.stderr).slice(0, 200));
  const left = s.remote().events.map((e) => e.event_id).sort();
  console.log('#660 R5 读数：改时段后远端剩=' + JSON.stringify(left) + ' 回执=' + JSON.stringify(moved.stdout.slice(0, 240)));
  assert.deepEqual(left, ['fs_keep'], '同槽只留认下的那条：旧槽那条删了、同槽多余那条兜底清了');
  assert.equal(s.localNew()[0].feishu_event_id, 'fs_keep');
});

test('#660 R6 反向对账：唯一命中才回填，撞键候选不猜（S-11）', () => {
  const s = makeSeam('schedule', {
    prefix: 't660-',
    state: {
      events: [
        remote('fs_one', '晨会', '09:00', '10:00'),
        remote('fs_two', '撞键', '15:00', '16:00'),
        remote('fs_three', '撞键', '15:00', '16:00'),
      ],
    },
  });
  localSeed(s, '晨会', '09:00', '10:00');
  localSeed(s, '撞键', '15:00', '16:00');
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const rows = s.localNew();
  const byTitle = Object.fromEntries(rows.map((x) => [x.title, x.feishu_event_id]));
  console.log('#660 R6 读数：唯一命中=' + JSON.stringify(byTitle) + ' 回执说明=' + JSON.stringify(envelope(r).data.notes));
  assert.equal(byTitle['晨会'], 'fs_one', '唯一命中 → 回填');
  assert.ok(envelope(r).data.notes.some((e) => e.includes('撞键候选')), '多候选 → 记账跳过，不猜');
});

/* ─────────── 三 · 合成写各 op ─────────── */

test('#660 R7 覆盖式写入 op=upsert：逐条对齐 ＋ 该日孤儿清掉（S-13 覆盖一侧）', () => {
  const s = makeSeam('schedule', { prefix: 't660-', state: { events: [remote('fs_stale', '旧日程', '03:00', '04:00')] } });
  const r = s.runNew('schedule.plan.write', {
    op: 'upsert', date: D,
    events: [{ time_start: '00:00', time_end: '12:00', title: '上午' }, { time_start: '12:00', time_end: '23:59', title: '下午' }],
  });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const summaries = s.remote().events.map((e) => e.summary).sort();
  console.log('#660 R7 读数：远端=' + JSON.stringify(summaries) + ' 回执计数=' + JSON.stringify(envelope(r).data.counts));
  assert.deepEqual(summaries, ['上午', '下午'], '本地两条 → 远端两条；旧的带锚孤儿清掉');
  assert.equal(envelope(r).data.counts.deleted, 1);
  assert.ok(s.localNew().every((x) => x.feishu_event_id), '两条都回填了远端标识');
});

test('#660 R8 删计划：远端那条真删（闭合 deleteFeishuEvent 零调用）', () => {
  const s = makeSeam('schedule', { prefix: 't660-' });
  assert.equal(s.runNew('schedule.plan.write', ENSURE).status, 0);
  const id = s.localNew()[0].id;
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'deactivate', id });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const dels = s.calls().map((c) => c.argv).filter((a) => a[1] === 'events' && a[2] === 'delete');
  console.log('#660 R8 读数：远端删除调用=' + dels.length + ' 远端剩=' + JSON.stringify(s.remote().events));
  assert.equal(dels.length, 1, '删远端对象这一支被接上了（老家零调用）');
  assert.equal(s.remote().events.length, 0, '远端真删干净');
  assert.equal(s.localNew()[0].is_active, 0, '本地是软删');
  assert.equal(envelope(r).data.remote, 'deleted_feishu');
});

test('#660 R9 飞书自检 op=check：默认不跑；显式跑则留痕点名、能删干净（D-03 日历半场）', () => {
  const s = makeSeam('schedule', { prefix: 't660-' });
  assert.equal(s.runNew('schedule.plan.write', ENSURE).status, 0);
  const sentinels = s.calls().map((c) => c.argv)
    .filter((a) => String(argOf(a, '--summary') || '').includes('[作息管家测试]'));
  assert.equal(sentinels.length, 0, '普通写路径一次都不跑自检（默认不跑）');

  s.stub.clearCalls();
  const ok = s.runNew('schedule.plan.write', { op: 'check' });
  assert.equal(ok.status, 0, String(ok.stderr).slice(0, 200));
  const okData = envelope(ok).data;
  assert.equal(okData.left, null, '没留下东西');
  assert.equal(okData.cleanup, null);
  assert.equal(s.remote().events.filter((e) => e.summary.includes('[作息管家测试]')).length, 0, '自检对象删干净');

  s.stub.clearCalls();
  s.stub.setState({ deleteFails: true });
  const bad = s.runNew('schedule.plan.write', { op: 'check' });
  const badData = envelope(bad).data;
  console.log('#660 R9 读数：删不掉时 exit=' + bad.status + ' leftId=' + badData.leftId + ' cleanup=' + badData.cleanup);
  assert.equal(bad.status, 4, '删不掉 ⇒ 退出码非 0（不拿一句备注糊过去）');
  assert.ok(badData.leftId, '点名留下了什么');
  assert.ok(String(badData.cleanup).includes(badData.leftId), '点名怎么清');
});

test('#660 R10 只读档（preview）一次远端都不碰', () => {
  const s = makeSeam('schedule', { prefix: 't660-' });
  const r = s.runNew('schedule.plan.write', { op: 'preview', date: D, events: [{ time_start: '00:00', time_end: '23:59', title: '全天' }] });
  assert.equal(r.status, 0);
  assert.equal(s.calls().length, 0, '预览不探远端（连四门都不查）');
  assert.equal(envelope(r).data.remote, 'none');
});

/* ─────────── 四 · 降级与退出码 ─────────── */

test('#660 R11 D-13 远端整平台不可用：不挂死，本地照写、回执标 unavailable、退出码非 0', () => {
  const s = makeSeam('schedule', { prefix: 't660-', state: { mode: 'unavailable' } });
  const t0 = Date.now();
  const r = s.runNew('schedule.plan.write', ENSURE, { timeoutMs: 60000 });
  const ms = Date.now() - t0;
  console.log('#660 R11 读数：远端不可用一跑 ' + ms + 'ms（老实现同布景 25s 超时未返回、同窗口重复查 472 次）');
  assert.ok(ms < 20000, '不挂死：远快于老侧的 25s 超时');
  assert.equal(r.status, 4, '本地成了但远端没成 ⇒ 非 0（A6②）');
  const d = envelope(r).data;
  assert.equal(d.local, 'created', '本地那一侧照写（A6① 降级）');
  assert.equal(d.remote, 'unavailable');
  assert.equal(d.achieved, false);
  assert.equal(s.localNew().length, 1);
});

test('#660 R12 op=sync 远端不可用即阻断（S-09，全仓唯一阻断入口）', () => {
  const s = makeSeam('schedule', { prefix: 't660-', state: { mode: 'unavailable' } });
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 4);
  const d = envelope(r).data;
  assert.equal(d.remote, 'unavailable');
  assert.equal(d.local, 'unchanged', '阻断档不动本地');
  assert.equal(s.localNew().length, 0);
});

test('#660 R13 远端一抖（分片检索失败）也不挂死：照跑完、如实报错（D-13 的反面）', () => {
  const s = makeSeam('schedule', { prefix: 't660-', state: { searchFails: true } });
  const t0 = Date.now();
  const r = s.runNew('schedule.plan.write', ENSURE, { timeoutMs: 15000 });
  const ms = Date.now() - t0;
  console.log('#660 R13 读数：分片全失败一跑 ' + ms + 'ms 退出码=' + r.status);
  assert.ok(r.status !== null, '不许被超时杀掉（老实现原地转圈，25s 都回不来）');
  assert.ok(ms < 12000, '分片失败只记账、游标照推 ⇒ 不挂死');
  assert.equal(r.status, 4, '远端读不全 ⇒ 这一趟不算达成（如实非 0）');
  assert.ok(envelope(r).data.errors.some((e) => e.includes('分片检索失败')), '失败原因逐条记账');
  assert.equal(s.localNew().length, 1, '本地那一侧照写（A6① 降级）');
});
