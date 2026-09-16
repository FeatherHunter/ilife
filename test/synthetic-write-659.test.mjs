/**
 * #659 · 合成写判据：接缝自证 ＋ 四条读数模板 ＋ 偏离清单读数（清单驱动）
 *
 * 本件是**常驻用例**，判据与接缝见 `docs/agents/合成写判据.md`：
 *   - 一个接缝：技能的统一出口（命令行边界，spawn 包内 `dist/cli/cmd_read.js`）。
 *   - 两个注入点：临时数据目录（`SKILLS_DB_PATH`）＋ 可替换的远端平台挡板（`LARK_CLI_PATH` → `tooling/contract-lark-stub.mjs`）。
 *   - 一次对拍（老实现 ↔ 新实现）**不进本件**：那是 `packages/skill-schedule` 与 `packages/skill-memo-ilife` 的
 *     `scripts/t659-parity-probe.mjs` 一次性取证，读数落在各自技能文档目录的 `t659-对拍读数.json`。本件只跑新实现，绝不碰真飞书。
 *
 * 本件的写法是**清单驱动**的：每条读数按「已达标」或「已登记缺口（点名属主票）」两态断言。
 * 于是两头都有机器读数——把已达标的改坏会红；把缺口悄悄修好而不动登记，同样会红（逼着收口）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, argOf, assertStubIsTheOne, envelope, fourReadings, makeSeam } from '../tooling/contract-seam.mjs';

const D = '2026-09-20';
const ENSURE = { op: 'ensure', date: D, time_start: '09:00', time_end: '10:00', title: '晨会', notes: '周会' };
const PKG = join(ROOT, 'packages', 'skill-schedule');

/* ─────────────── 一、接缝自证（这两条绿了，后面的读数才算数） ─────────────── */

test('#659 T1 接缝自证 · 远端挡板：老实现的查找链被喂成挡板，且前置门不是空门', () => {
  const s = makeSeam('schedule', { prefix: 't659t-' });
  const got = assertStubIsTheOne(s);
  assert.ok(got.length > 0);
  assert.ok(got.toLowerCase().includes('lark-cli'), '解析到的不是 lark-cli：' + got);
  // 空门反证：把挡板从两条查找链上都撤掉（PATH 无落点、当前目录无 shim、%APPDATA%\npm 无门面）
  // → 老实现自己找不到 lark-cli，前置门必须拦（它不是空门，是因为有挡板才放行）。
  const blind = makeSeam('schedule', { prefix: 't659t-blind-' });
  rmSync(join(blind.stub.dir, 'lark-cli.cmd'), { force: true });
  rmSync(join(blind.stub.dir, 'lark-cli'), { force: true });
  rmSync(join(blind.dir, 'appdata', 'npm', 'lark-cli.cmd'), { force: true });
  blind.oldEnv.PATH = join(blind.dir, 'nowhere');
  blind.oldEnv.APPDATA = join(blind.dir, 'nowhere');
  assert.throws(() => assertStubIsTheOne(blind), /前置门未过/);
});

test('#659 T2 接缝自证 · 临时数据目录：SKILLS_DB_PATH 未设即拒，且两代互不串库', () => {
  const a = makeSeam('schedule', { prefix: 't659t-a-' });
  const b = makeSeam('schedule', { prefix: 't659t-b-' });
  assert.notEqual(a.dbPath, b.dbPath);
  const noDb = makeSeam('schedule', { prefix: 't659t-nodb-', withDb: false });
  const r = noDb.runNew('schedule.plan.write', ENSURE);
  assert.equal(r.status, 1, '未设 SKILLS_DB_PATH 必须预检失败（无默认值）');
  assert.match(String(r.stderr), /SKILLS_DB_PATH/);
  assert.equal(existsSync(join(noDb.dbPath, 'schedule_data.db')), false, '预检失败时不该落库');
});

test('#659 T3 接缝自证 · 三条痕迹（回执／本地库行／远端收到的调用）当场可读', () => {
  const s = makeSeam('schedule', { prefix: 't659t-' });
  const r = s.runNew('schedule.plan.write', ENSURE);
  assert.equal(r.status, 0, String(r.stderr).slice(0, 300));
  const env = envelope(r);
  assert.equal(env.key, 'schedule.plan.write');
  assert.equal(env.shape, 'receipt');
  assert.deepEqual(s.localNew().map((x) => [x.date, x.time_start, x.time_end]), [[D, '09:00', '10:00']]);
  assert.equal(s.calls().length, 0, '本实现这条路径还没接远端：调用留痕应为空（缺口读数之一，见 T4）');
});

/* ─────────────── 二、四条读数模板（每条能力逐条读） ─────────────── */

/** 登记表：本能力四条读数当刻该是什么态。改坏→红；缺口被修好而没动登记→也红（这就是收口动作）。 */
const REGISTERED = {
  idempotent: { state: 'pass' },
  receipt: { state: 'gap', owner: '#660', why: '回执只有一个 message 字符串，本地侧／远端侧／远端标识三格读不到' },
  degrade: { state: 'gap', owner: '#660', why: '这条路径不碰远端，回执也就无从标明远端侧没成' },
  ownership: { state: 'gap', owner: '#660', why: '远端对象上还没有归属标记（这条路径根本没建远端对象）' },
};

test('#659 T4 四条读数模板 · 作息 plan.write op=ensure', () => {
  const s = makeSeam('schedule', { prefix: 't659t-' });
  const verdicts = fourReadings({
    seam: s,
    whatObject: '飞书日历事件',
    act: (seam) => seam.runNew('schedule.plan.write', ENSURE),
    remoteOff: (seam) => seam.stub.setState({ mode: 'unavailable' }),
    receipt: (env) => ({
      本地侧: env && env.data ? (env.data.local ?? env.data.ok) : undefined,
      远端侧: env && env.data ? env.data.remote : undefined,
      远端标识: env && env.data ? env.data.remoteId : undefined,
    }),
    // 归属标记＝远端「建对象」那次调用里的 description（老实现写的是「作息管家自动同步」前缀）。
    marker: (argv) => { const d = argOf(argv, '--description'); return d && d.includes('作息管家自动同步') ? d : null; },
    reportedOff: (off) => !!(off.env && off.env.data && off.env.data.remote === 'unavailable'),
  });
  const got = Object.fromEntries(verdicts.map((v) => [v.id, v.verdict]));
  const summary = verdicts.map((v) => v.id + '=' + v.verdict + '(' + JSON.stringify(v.reading) + ')').join(' | ');
  console.log('#659 四条读数：' + summary);
  for (const v of verdicts) {
    const reg = REGISTERED[v.id];
    assert.ok(reg, '读数未登记：' + v.id);
    assert.equal(v.verdict, reg.state === 'pass' ? 'pass' : 'fail',
      `#659 读数「${v.name}」当刻=${v.verdict}，登记表说=${reg.state}` + (reg.owner ? `（属主 ${reg.owner}：${reg.why}）` : ''));
  }
  assert.equal(verdicts.length, 4, '四条读数一条都不能少');
  assert.equal(Object.values(got).filter((x) => x === 'pass').length, 1, '当刻达标 1 条、缺口 3 条（照登记表）');
});

/* ─────────────── 三、偏离清单的机器读数（不搬的四类：缺席面） ─────────────── */

test('#659 T5 偏离 D-01／D-02／D-04／D-07／D-08／D-09／D-10 · 不搬的那些在盘上确实缺席', () => {
  // D-01 坏入口 upsert-plan：不是合法写 op（老入口必抛 OperationalError 被吞，不搬）。
  const s = makeSeam('schedule', { prefix: 't659t-' });
  const bad = s.runNew('schedule.plan.write', { op: 'upsert-plan', date: D, events: [] });
  assert.notEqual(bad.status, 0, 'upsert-plan 不该是合法 op（搬回来必红）');
  assert.equal(String(bad.stdout).trim(), '');
  // D-02 旧小时格表与一次性迁移脚本：包内零残留。
  const files = [];
  const walk = (dir) => { for (const f of readdirSync(dir, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name === 'dist') continue; const p = join(dir, f.name); if (f.isDirectory()) walk(p); else files.push(p); } };
  walk(PKG);
  const text = files.filter((f) => /\.(ts|mjs|json|md)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  assert.equal(/hour_\d+_planned/.test(text), false, '旧小时格列名不该出现在包内（照抄回来必红）');
  assert.equal(/migrate_plan_to_events/.test(text), false, '已跑过的一次性迁移脚本不搬');
  assert.equal(/_diff_and_sync_impl|diffAndSync/.test(text), false, '旧 diff 死代码残块不搬');
  // 旧表名只许作为「退休改名」的目标出现，不许被当活表读写。
  const legacy = text.split('\n').filter((l) => l.includes('schedule_plans_legacy'));
  assert.ok(legacy.length > 0, '退休改名那一步应当在（否则旧表根本没被退掉）');
  for (const l of legacy) assert.match(l, /ALTER TABLE .* RENAME TO|^\s*(\/\/|\*)/, '旧表名只许出现在退休改名的说明里：' + l);
  assert.equal(/schedule_plans_legacy[\s\S]{0,400}?(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text), false, '旧表不该被读或写');
  // D-04 死接口 get_plan 单日聚合：零调用点，不搬。
  assert.equal(/\bgetPlan\b/.test(text.replace(/getPlanEventsRange|getPlanEvent/g, '')), false, '旧 get_plan 单日聚合是零调用点死接口，不搬');
  // D-07 恒真判据（`is_feishu_available()` 永不假 → 那个短路分支是死代码）：不搬这个形态。
  assert.equal(/is_feishu_available|isFeishuAvailable/.test(text), false, '恒真判据不搬（否决权在 `larkReady()` 的四门，失败即 throw）');
  // D-08 两份同名顶层定义、D-09 同一口径两份副本：老名字不该随移植回来。
  assert.equal(/cmd_help|_iso_to_hhmm/.test(text), false, '老那两处重名／重复副本不该照抄回来');
});

test('#659 T6 偏离 D-12 · 远端判重接没接（改坏＝现状：查询结果被丢弃仍重复建）', () => {
  const s = makeSeam('schedule', {
    prefix: 't659t-',
    state: { events: [{ event_id: 'fs_seed', summary: '晨会', description: '作息管家自动同步', start: D + 'T09:00:00+08:00', end: D + 'T10:00:00+08:00' }] },
  });
  // 布景：本地有这条、但没有远端标识（远端查不到就用不了）→ 唯一出路是查远端。
  s.stub.setState({ createFails: true, mode: 'normal' });
  assert.equal(s.runNew('schedule.plan.write', ENSURE).status, 0);
  s.stub.setState({ createFails: false, mode: 'normal' });
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const calls = s.calls().map((c) => c.argv);
  const searched = calls.some((a) => a[1] === '+search-event');
  const creates = calls.filter((a) => a[1] === '+create');
  console.log('#659 D-12 读数：查了远端=' + searched + ' 仍建=' + creates.length + ' 本地标识=' + JSON.stringify(s.localNew().map((x) => x.feishu_event_id)));
  assert.equal(searched, true, '这条路必须先查远端（老实现这一步在）');
  assert.equal(creates.length, 1, '现状：查询结果被丢弃 → 远端已有同四元组仍重复建。修好（接上判重）即转 0 条 → 本行必须随 #660 一起改登记');
});

test('#659 T7 偏离 D-11 · 取不到远端标识仍写空（改坏＝现状）', () => {
  const s = makeSeam('schedule', { prefix: 't659t-', state: { createNoId: true } });
  // 布景：本地先有这条、但远端没成（远端标识为空）→ 重同步时必然要走「建远端对象」那一支。
  s.stub.setState({ createFails: true, mode: 'normal' });
  assert.equal(s.runNew('schedule.plan.write', ENSURE).status, 0);
  s.stub.setState({ createFails: false, createNoId: true, mode: 'normal' });
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  const rows = s.localNew();
  console.log('#659 D-11 读数：远端建了=' + s.calls().filter((c) => c.argv[1] === '+create').length
    + ' 本地标识=' + JSON.stringify(rows.map((x) => x.feishu_event_id)) + ' 退出码=' + r.status);
  assert.equal(s.calls().filter((c) => c.argv[1] === '+create').length, 1, '这一跑确实建了远端对象');
  assert.equal(rows[0].feishu_event_id, null, '现状：拿不到远端标识仍写空。修好（显式报错或降级标记）即转非空／非 0 退出 → 随 #660 改登记');
});
