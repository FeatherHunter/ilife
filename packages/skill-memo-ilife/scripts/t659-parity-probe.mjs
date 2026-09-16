#!/usr/bin/env node
/**
 * #659 · 备忘侧「挡板对拍取证」（一次性）
 *
 * 与 `packages/skill-schedule/scripts/t659-parity-probe.mjs` 同一形态、同一接缝件：老实现（仓外 Python）
 * 与新实现（仓内 TS）喂同一份输入，比三个边界上的痕迹——命令行回执、本地库行、远端平台收到的调用。
 *
 * 跑法：`node tooling/run-locked.mjs --ticket 659 -- node packages/skill-memo-ilife/scripts/t659-parity-probe.mjs`
 * 产出：`docs/skills/skill-memo-ilife/t659-对拍读数.json`（机器件）＋ stdout 人读表。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, argOf, assertStubIsTheOne, envelope, initOldMemoDb, makeSeam } from '../../../tooling/contract-seam.mjs';

const OUT_DIR = join(ROOT, 'docs', 'skills', 'skill-memo-ilife');
const WISH = '买跑鞋';
const DUE = '2026-09-25';

const OLD_ADD = ['add', WISH, '--category', '心愿', '--due', DUE];
const NEW_ADD = { title: WISH, body: WISH, category: '心愿' };

function trace(seam, run) {
  seam.stub.clearCalls();
  const r = run();
  let env = null; let parseErr = null;
  try { env = envelope(r); } catch (e) { parseErr = e.message.slice(0, 300); }
  const calls = seam.calls().map((c) => c.argv);
  const taskCalls = calls.filter((a) => a[0] === 'task');
  return {
    exit: r.status,
    receipt: env,
    parseErr,
    stdoutHead: String(r.stdout || '').trim().split('\n')[0].slice(0, 220),
    stderrHead: String(r.stderr || '').trim().split('\n').slice(0, 2).join(' / ').slice(0, 240),
    local: run.side === 'old' ? seam.localOld() : seam.localNew(),
    callsTotal: calls.length,
    callsHead: calls.map((a) => a.slice(0, 2).join(' ')).slice(0, 20),
    taskCalls: taskCalls.map((a) => ({
      op: a.slice(0, 2).join(' '),
      summary: argOf(a, '--summary'), description: argOf(a, '--description'), due: argOf(a, '--due'),
      taskId: argOf(a, '--task-id') || argOf(a, '--task-guid'),
    })),
  };
}

const SCENARIOS = [
  { id: 'M-A', title: '记一条心愿（含到期日）· 远端空', state: {}, seed: 'none', old: OLD_ADD, newKey: 'memo.create', newArgs: NEW_ADD },
  { id: 'M-B', title: '再记一条同题同到期日（本地／远端各自判重）', state: {}, seed: 'added', old: OLD_ADD, newKey: 'memo.create', newArgs: NEW_ADD },
  { id: 'M-C', title: '远端不可用（本地照落与否）', state: { mode: 'unavailable' }, seed: 'none', old: OLD_ADD, newKey: 'memo.create', newArgs: NEW_ADD },
  { id: 'M-D', title: '远端可探、创建失败', state: { createFails: true }, seed: 'none', old: OLD_ADD, newKey: 'memo.create', newArgs: NEW_ADD },
  { id: 'M-E', title: '删一条心愿（远端任务怎么办）', state: {}, seed: 'added', old: ['delete', '1', '-y'], newKey: 'memo.remove', newArgs: (s) => ({ id: s.firstLocalId, confirm: true }) },
  { id: 'M-F', title: '反向对账：飞书那边完成了 → 本地', state: {}, seed: 'done', old: ['sync-from-feishu'], newKey: 'memo.sync', newArgs: {} },
  { id: 'M-G', title: '改期（set-due → 远端 due 跟改）', state: {}, seed: 'added', old: ['set-due', '1', '--due', '2026-10-01'], newKey: 'memo.sync', newArgs: {} },
];

/** 布景：先记一条（`added`＝远端通了）。新侧 id 从本地文件里现取（形制与老侧不同）。 */
function seed(side, s, kind) {
  s.stub.setState({ mode: 'normal', events: [], tasks: [], createFails: false });
  const r = side === 'old' ? s.runOld(OLD_ADD) : s.runNew('memo.create', NEW_ADD);
  if (kind === 'done') {
    // 远端那条改成「已完成」，描述里带老实现的归属标记（反向对账靠它反查）。
    s.stub.setState({ tasks: s.stub.state().tasks.map((t) => ({ ...t, completed_at: '2026-09-18T03:00:00.000Z' })) });
  }
  const local = side === 'old' ? s.localOld() : s.localNew();
  return { exit: r.status, firstLocalId: local.length ? String(local[0].id) : null, remoteTasks: s.stub.state().tasks.map((t) => t.guid) };
}

function runSide(side) {
  const out = [];
  for (const sc of SCENARIOS) {
    const s = makeSeam('memo', { prefix: 't659m-' + side + '-' });
    const gate = assertStubIsTheOne(s);
    if (side === 'old') initOldMemoDb(s.dbPath);
    const seeded = sc.seed === 'none' ? null : seed(side, s, sc.seed);
    s.stub.setState(sc.state);
    const run = () => (side === 'old'
      ? s.runOld(sc.old)
      : s.runNew(sc.newKey, typeof sc.newArgs === 'function' ? sc.newArgs(seeded) : sc.newArgs));
    run.side = side;
    const t = trace(s, run);
    out.push({ id: sc.id, side, title: sc.title, gate, dir: s.dir, seeded, state: sc.state, ...t });
  }
  return out;
}

const report = { ticket: 659, side: 'memo', at: new Date().toISOString(), old: runSide('old'), new: runSide('new') };
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 't659-对拍读数.json'), JSON.stringify(report, null, 2), 'utf8');

for (const sc of SCENARIOS) {
  const o = report.old.find((x) => x.id === sc.id);
  const n = report.new.find((x) => x.id === sc.id);
  console.log('\n=== ' + sc.id + ' ' + sc.title + ' ===');
  for (const [label, t] of [['老', o], ['新', n]]) {
    if (t.missing) { console.log('  ' + label + ' —— ' + t.note); continue; }
    console.log('  ' + label + ' exit=' + t.exit + ' 本地=' + JSON.stringify(t.local.map((r) => [r.id, r.category, r.due || r.remindAt || null, r.feishu_task_guid || null]))
      + ' 远端任务调用=' + JSON.stringify(t.taskCalls.map((c) => c.op + ':' + (c.description || c.summary || c.taskId || ''))) + ' 调用数=' + t.callsTotal);
    console.log('    ' + label + ' 回执=' + (t.stdoutHead || '（stdout 空）') + (t.parseErr ? ' ⚠' + t.parseErr.split('\n')[0] : ''));
  }
}
console.log('\nREADINGS -> ' + join(OUT_DIR, 't659-对拍读数.json'));
