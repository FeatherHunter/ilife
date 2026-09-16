#!/usr/bin/env node
/**
 * #659 · 作息侧「挡板对拍取证」（一次性）
 *
 * 一趟跑完即退场，**不进常驻测试**：老实现（仓外 Python）与新实现（仓内 TS）喂同一份输入，
 * 比三个边界上的痕迹——命令行回执、本地库行、远端平台收到的调用——用来**产出**不变量清单的读数。
 *
 * 跑法：`node tooling/run-locked.mjs --ticket 659 -- node packages/skill-schedule/scripts/t659-parity-probe.mjs`
 * 产出：`docs/skills/skill-schedule/t659-对拍读数.json`（机器件）＋ stdout 人读表。
 *
 * 安全门：老实现那一侧的 lark-cli 查找链被喂成挡板（PATH＋APPDATA），跑前逐条 `assertStubIsTheOne()`
 * 让老进程自己报出它解析到的路径；不是挡板就抛，绝不碰真飞书。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, argOf, assertStubIsTheOne, envelope, makeSeam } from '../../../tooling/contract-seam.mjs';

const OUT_DIR = join(ROOT, 'docs', 'skills', 'skill-schedule');
const D = '2026-09-20';
const TRIPLE = { date: D, time_start: '09:00', time_end: '10:00', title: '晨会' };
// 远端已有那条：带归属标记（照老代码的锚），模拟「我建的、但本地丢了 id」。
const SEED_EVENT = {
  event_id: 'fs_seed_1', summary: '晨会', description: '作息管家自动同步',
  start: D + 'T09:00:00+08:00', end: D + 'T10:00:00+08:00',
};
// 孤儿布景：一条「我建的」（带标记）、一条「别人建的」（不带标记），本地都没有对应。
const ORPHAN_MINE = { event_id: 'fs_orphan_mine', summary: '我建的孤儿', description: '作息管家自动同步', start: D + 'T14:00:00+08:00', end: D + 'T15:00:00+08:00' };
const ORPHAN_OTHER = { event_id: 'fs_orphan_other', summary: '别人建的', description: '手建的，不归它管', start: D + 'T16:00:00+08:00', end: D + 'T17:00:00+08:00' };
const NEW_ENSURE = { op: 'ensure', ...TRIPLE, notes: '周会' };
const OLD_ENSURE = ['ensure-plan-event', D, '--time-start', '09:00', '--time-end', '10:00', '--title', '晨会', '--notes', '周会'];
const OLD_RESYNC = ['feishu-resync', D];
const NEW_SYNC = { op: 'sync', date: D };

/** 三条痕迹：出口退出码、回执行、本地库行、远端收到的调用（紧凑记法）。 */
function trace(seam, run) {
  seam.stub.clearCalls();
  const r = run();
  let env = null; let parseErr = null;
  try { env = envelope(r); } catch (e) { parseErr = e.message.slice(0, 300); }
  const calls = seam.calls().map((c) => c.argv);
  const creates = calls.filter((a) => a[1] === '+create' || (a[0] === 'task' && a[1] === '+create'))
    .map((a) => ({ summary: argOf(a, '--summary'), description: argOf(a, '--description'), start: argOf(a, '--start'), due: argOf(a, '--due') }));
  const head = calls.map((a) => a.slice(0, 2).join(' '));
  return {
    exit: r.status, timedOut: r.status === null && !r.stdout, receipt: env, parseErr,
    stdoutHead: String(r.stdout || '').trim().split('\n')[0].slice(0, 160),
    stderrHead: String(r.stderr || '').trim().split('\n').slice(0, 2).join(' / ').slice(0, 300),
    local: (seam.kind === 'schedule' ? (run.side === 'old' ? seam.localOld() : seam.localNew()) : []),
    remoteAfter: seam.stub.state().events.map((e) => e.event_id),
    callsTotal: calls.length,
    callsHead: head.slice(0, 24),
    callsRepeat: calls.length ? { of: head[head.length - 1], times: head.filter((x) => x === head[head.length - 1]).length } : null,
    creates,
  };
}

const SCENARIOS = [
  { id: 'S-A', title: '首跑 · 远端空（合成写的基线）', state: {}, seed: 'none', old: OLD_ENSURE, new: NEW_ENSURE },
  { id: 'S-B', title: '重复调用 · 同三元组（幂等）', state: {}, seed: 'created', old: OLD_ENSURE, new: NEW_ENSURE },
  { id: 'S-C', title: '本地有、远端无 id（缺哪边建哪边）', state: {}, seed: 'localOnly', old: OLD_ENSURE, new: NEW_ENSURE },
  { id: 'S-D', title: '远端整平台不可用（ensure 路径：降级还是挂住）', state: { mode: 'unavailable' }, seed: 'none', old: OLD_ENSURE, new: NEW_ENSURE, timeoutMs: 25000 },
  { id: 'S-E', title: '本地无 id ＋ 远端已有同四元组（ensure 路径：远端判重）', state: { events: [SEED_EVENT] }, seed: 'localOnly', old: OLD_ENSURE, new: NEW_ENSURE },
  { id: 'S-F', title: '本地无 id ＋ 远端已有同四元组（重同步路径：远端判重接没接）', state: { events: [SEED_EVENT] }, seed: 'localOnly', old: OLD_RESYNC, new: NEW_SYNC },
  { id: 'S-G', title: '远端可探、创建失败（真降级档）', state: { createFails: true }, seed: 'none', old: OLD_ENSURE, new: NEW_ENSURE },
  { id: 'S-H', title: '重同步 · 远端整平台不可用（阻断档）', state: { mode: 'unavailable' }, seed: 'none', old: OLD_RESYNC, new: NEW_SYNC, timeoutMs: 25000 },
  {
    id: 'S-I', title: '远端孤儿：带标记的该清、不带标记的不许动（归属判据）',
    state: { events: [ORPHAN_MINE, ORPHAN_OTHER] }, seed: 'created',
    old: OLD_RESYNC, new: NEW_SYNC,
  },
];

/** 布景：把本地那条先种下（`created`＝远端已成；`localOnly`＝远端没成）。 */
function seed(side, s, kind) {
  s.stub.setState({ mode: 'normal', events: [], tasks: [], createFails: kind === 'localOnly' });
  const r = side === 'old' ? s.runOld(OLD_ENSURE, { timeoutMs: 20000 }) : s.runNew('schedule.plan.write', NEW_ENSURE);
  s.stub.setState({ mode: 'normal', events: [], tasks: [], createFails: false });
  return { exit: r.status, timedOut: r.status === null };
}

function runSide(side) {
  const out = [];
  for (const sc of SCENARIOS) {
    const s = makeSeam('schedule', { prefix: 't659-' + side + '-' });
    if (side === 'old') s.runOld(['init']);
    const gate = assertStubIsTheOne(s);
    const seeded = sc.seed === 'none' ? null : seed(side, s, sc.seed);
    s.stub.setState(sc.state);
    const run = () => (side === 'old' ? s.runOld(sc.old, { timeoutMs: sc.timeoutMs }) : s.runNew('schedule.plan.write', sc.new, { timeoutMs: sc.timeoutMs }));
    run.side = side;
    const t = trace(s, run);
    out.push({ id: sc.id, side, title: sc.title, gate, dir: s.dir, seeded, state: sc.state, ...t });
  }
  return out;
}

const report = { ticket: 659, side: 'schedule', at: new Date().toISOString(), old: runSide('old'), new: runSide('new') };
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 't659-对拍读数.json'), JSON.stringify(report, null, 2), 'utf8');

for (const sc of SCENARIOS) {
  const o = report.old.find((x) => x.id === sc.id);
  const n = report.new.find((x) => x.id === sc.id);
  console.log('\n=== ' + sc.id + ' ' + sc.title + ' ===');
  for (const [label, t] of [['老', o], ['新', n]]) {
    console.log('  ' + label + ' exit=' + (t.timedOut ? '超时未返回' : t.exit)
      + ' 本地行=' + JSON.stringify(t.local.map((r) => [r.id, r.feishu_event_id]))
      + ' 远端建=' + JSON.stringify(t.creates.map((c) => c.description))
      + ' 远端调用数=' + t.callsTotal + (t.callsRepeat && t.callsRepeat.times > 2 ? '（' + t.callsRepeat.of + ' ×' + t.callsRepeat.times + '）' : ''));    console.log('    ' + label + ' 远端剩=' + JSON.stringify(t.remoteAfter) + (t.creates.length ? ' 建=' + JSON.stringify(t.creates.map((c) => c.summary)) : ''));
    console.log('    ' + label + ' 回执=' + JSON.stringify(t.receipt && (t.receipt.data ?? t.receipt)) + (t.parseErr ? ' ⚠' + t.parseErr.split('\n')[0] : ''));
  }
}
console.log('\nREADINGS -> ' + join(OUT_DIR, 't659-对拍读数.json'));
