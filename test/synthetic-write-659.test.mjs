/**
 * #659 · 合成写判据：接缝自证 ＋ 四条读数模板 ＋ 偏离清单读数（清单驱动）
 *
 * 本件是**常驻用例**，判据与接缝见 `docs/agents/合成写判据.md`：
 *   - 一个接缝：技能的统一出口（命令行边界，spawn 包内 `dist/cli/cmd_read.js`）。
 *   - 两个注入点（#695 起都走**配置文件**）：临时数据目录写配置项 `db.dir` ＋ 可替换的远端平台挡板
 *     写配置项 `lark.cliPath`（挡板本体仍是 `tooling/contract-lark-stub.mjs`）；两者都住临时**家目录**
 *     下的 `.ilife/schedule.yaml`——测试隔离的唯一口子就是那条家目录，回落到真实家目录即响亮失败。
 *   - 一次对拍（老实现 ↔ 新实现）**不进本件**：那是 `packages/skill-schedule` 与 `packages/skill-memo-ilife` 的
 *     `scripts/t659-parity-probe.mjs` 一次性取证，读数落在各自技能文档目录的 `t659-对拍读数.json`。本件只跑新实现，绝不碰真飞书。
 *
 * 本件的写法是**清单驱动**的：每条读数按「已达标」或「已登记缺口（点名属主票）」两态断言。
 * 于是两头都有机器读数——把已达标的改坏会红；把缺口悄悄修好而不动登记，同样会红（逼着收口）。
 *
 * #660 收口（2026-09-17）：作息侧挂账的四处缺口已落地——T4 登记表四条全转 `pass`，
 * T3 的「调用留痕应为空」改成「必须碰远端且标识回写」，T6（D-12 远端判重）与 T7（D-11 不写空标识）
 * 改成已修态。改坏任一处即红，这就是本件的收口动作。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, argOf, assertStubIsTheOne, envelope, fourReadings } from '../tooling/contract-seam.mjs';
// #695：接缝件（`tooling/contract-seam.mjs`）的两个注入点仍是**改造前**的环境变量口径
// （`SKILLS_DB_PATH`／`LARK_CLI_PATH`），而技能侧已改读配置文件且删掉环境变量读取；
// 把接缝件那两个点挪到配置文件上的接头件住 `packages/skill-schedule/test/helpers/config-seam.mjs`——
// 它把 `db.dir` 指到接缝自己的临时目录、`lark.cliPath` 指到接缝造的远端挡板，并把**家目录**指到一条
// 独占临时家目录（测试隔离的唯一口子）。接缝件本身本票不动，故这里换用那个接头件。
import { makeScheduleSeam } from '../packages/skill-schedule/test/helpers/config-seam.mjs';
import { realHomeDir } from './helpers/real-home-snapshot.mjs';

const D = '2026-09-20';
const ENSURE = { op: 'ensure', date: D, time_start: '09:00', time_end: '10:00', title: '晨会', notes: '周会' };
const PKG = join(ROOT, 'packages', 'skill-schedule');
const DIRS = pathToFileURL(join(ROOT, 'packages', 'base-link-core', 'dist', 'config', 'dirs.js')).href;

/**
 * 隔离门探针（#763）：起一个**只算落点、不碰盘**的子进程，报它抛没抛。
 *
 * 为什么只调 `resolveConfigDir()` 而不是拿技能命令做「缺隔离」实验：`resolveConfigDir()` 与
 * `mkdirSync` 之间隔着 `ensureConfigDirs`，算落点这一步零写——守卫哪天 fail-open，这条用例也
 * 不可能写出真实数据（T2 的另一半用真接缝，读的仍是它自己那条临时库）。
 *
 * 「缺隔离」怎么造：**把家目录指到真实家目录**——那正是「家目录没被注入」时子进程看到的那一份
 * （账号的事实，见 `test/helpers/real-home-snapshot.mjs` 的 `realHomeDir()`），也正是守卫的判据。
 * 别想着「把两格删掉」：`node --test` 会把 `process.env.USERPROFILE` 当刻的取值**原样注回**它起的
 * 每个子进程（实测：删掉也照样塞回来），只有「指到真实家目录」这一条路。
 *
 * @param {object} [extra] 额外环境（反向对照用：给一个临时家目录就应当放行）
 * @returns {string} `'OK:<落点>'` 或 `'THREW:<错误码>'`
 */
function probeGuard(extra = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const env = { ...process.env, ...extra, NODE_TEST_CONTEXT: 'child-v8' };
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env });
  return String(r.stdout).trim();
}

/* ─────────────── 一、接缝自证（这两条绿了，后面的读数才算数） ─────────────── */

test('#659 T1 接缝自证 · 远端挡板：老实现的查找链被喂成挡板，且前置门不是空门', () => {
  const s = makeScheduleSeam({ prefix: 't659t-' });
  const got = assertStubIsTheOne(s);
  assert.ok(got.length > 0);
  assert.ok(got.toLowerCase().includes('lark-cli'), '解析到的不是 lark-cli：' + got);
  // 空门反证：把挡板从两条查找链上都撤掉（PATH 无落点、当前目录无 shim、%APPDATA%\npm 无门面）
  // → 老实现自己找不到 lark-cli，前置门必须拦（它不是空门，是因为有挡板才放行）。
  const blind = makeScheduleSeam({ prefix: 't659t-blind-' });
  rmSync(join(blind.stub.dir, 'lark-cli.cmd'), { force: true });
  rmSync(join(blind.stub.dir, 'lark-cli'), { force: true });
  rmSync(join(blind.dir, 'appdata', 'npm', 'lark-cli.cmd'), { force: true });
  blind.oldEnv.PATH = join(blind.dir, 'nowhere');
  blind.oldEnv.APPDATA = join(blind.dir, 'nowhere');
  assert.throws(() => assertStubIsTheOne(blind), /前置门未过/);
});

test('#659 T2 接缝自证 · 隔离：两代互不串库，缺隔离即响亮失败（探针只算落点，零写盘）', () => {
  // 两条接缝各有自己的库落点（接头件逐条把配置项 `db.dir` 指到该接缝的临时目录），互不串库。
  const a = makeScheduleSeam({ prefix: 't659t-a-' });
  const b = makeScheduleSeam({ prefix: 't659t-b-' });
  assert.notEqual(a.dbPath, b.dbPath);
  // 反向对照：家目录注入到临时目录 ⇒ 照常算出落点（证明门只关「回落到真实家目录」这一件事）。
  const tempHome = join(a.dir, 'probe-home');
  assert.equal(probeGuard({ USERPROFILE: tempHome, HOME: tempHome }), 'OK:' + join(tempHome, '.ilife'),
    '注入了家目录就必须放行，且落点＝注入的那一份');
  assert.equal(existsSync(join(tempHome, '.ilife')), false, '探针只算落点，一次盘都不碰');
  // 缺隔离（家目录回落到真实那一份）⇒ 配置件直接抛 `CONFIG_TEST_ISOLATION_MISSING`，绝不静默落到真实家目录。
  const accountHome = realHomeDir().dir;
  assert.equal(probeGuard({ USERPROFILE: accountHome, HOME: accountHome }), 'THREW:CONFIG_TEST_ISOLATION_MISSING',
    '回落到真实家目录必须抛 CONFIG_TEST_ISOLATION_MISSING');
  // 同一件事在**真出口**上的读数：那条接缝的预检必须失败（无默认值可用），且失败时不落库。
  const noCfg = makeScheduleSeam({ prefix: 't659t-nocfg-', withDb: false });
  const r = noCfg.runNew('schedule.plan.write', ENSURE, { extraEnv: { USERPROFILE: accountHome, HOME: accountHome } });
  assert.equal(r.status, 1, '测试进程缺隔离必须预检失败（无默认值可用）：' + String(r.stderr).slice(0, 200));
  assert.match(String(r.stderr), /测试缺隔离/, '报文要点明「测试缺隔离」：' + String(r.stderr).slice(0, 200));
  assert.equal(existsSync(join(noCfg.dbPath, 'schedule_data.db')), false, '预检失败时不该落库');
});

test('#659 T3 接缝自证 · 三条痕迹（回执／本地库行／远端收到的调用）当场可读', () => {
  const s = makeScheduleSeam({ prefix: 't659t-' });
  const r = s.runNew('schedule.plan.write', ENSURE);
  assert.equal(r.status, 0, String(r.stderr).slice(0, 300));
  const env = envelope(r);
  assert.equal(env.key, 'schedule.plan.write');
  assert.equal(env.shape, 'receipt');
  assert.deepEqual(s.localNew().map((x) => [x.date, x.time_start, x.time_end]), [[D, '09:00', '10:00']]);
  // #660 收口：这条路径已接上远端（原缺口读数「调用留痕应为空」随该票作废）——
  // 现在这一跑要能在远端建对象、并把标识回写本地库里，三条痕迹才都算「当场可读」。
  const calls = s.calls().map((c) => c.argv);
  assert.ok(calls.length > 0, '合成写必须碰远端（一条命令把两侧对齐）');
  assert.equal(calls.filter((a) => a[1] === '+create').length, 1, '首跑在远端建且只建一个');
  assert.match(String(s.localNew()[0].feishu_event_id), /^fs_evt_/, '远端标识已回写本地');
});

/* ─────────────── 二、四条读数模板（每条能力逐条读） ─────────────── */

/** 登记表：本能力四条读数当刻该是什么态。改坏→红；缺口被修好而没动登记→也红（这就是收口动作）。
 *  #660 收口：四条全部达标（本地 ＋ 远端一次成；三格齐；远端不可用即降级且标 `unavailable`；远端对象带归属锚）。 */
const REGISTERED = {
  idempotent: { state: 'pass' },
  receipt: { state: 'pass' },
  degrade: { state: 'pass' },
  ownership: { state: 'pass' },
};

test('#659 T4 四条读数模板 · 作息 plan.write op=ensure', () => {
  const s = makeScheduleSeam({ prefix: 't659t-' });
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
  assert.equal(Object.values(got).filter((x) => x === 'pass').length, 4, '当刻四条全达标（#660 收口）');
});

/* ─────────────── 三、偏离清单的机器读数（不搬的四类：缺席面） ─────────────── */

test('#659 T5 偏离 D-01／D-02／D-04／D-07／D-08／D-09／D-10 · 不搬的那些在盘上确实缺席', () => {
  // D-01 坏入口 upsert-plan：不是合法写 op（老入口必抛 OperationalError 被吞，不搬）。
  const s = makeScheduleSeam({ prefix: 't659t-' });
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

test('#659 T6 偏离 D-12 · 远端判重接上了（改坏＝原地重复建）', () => {
  const s = makeScheduleSeam({
    prefix: 't659t-',
    state: { events: [{ event_id: 'fs_seed', summary: '晨会', description: '作息管家自动同步', start: D + 'T09:00:00+08:00', end: D + 'T10:00:00+08:00' }] },
  });
  // 布景：本地先有这条但**没有远端标识**（种子这一跑显式只做本地），而远端已有同四元组那条。
  // 于是唯一出路是查远端：查到 → 回填标识、不重复建；查不到 → 建第二条（那就是 D-12 的老毛病）。
  assert.equal(s.runNew('schedule.plan.write', { ...ENSURE, feishu: 'skip' }).status, 0);
  s.stub.setState({ createFails: false, mode: 'normal' });
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  assert.equal(r.status, 0, String(r.stderr).slice(0, 200));
  const calls = s.calls().map((c) => c.argv);
  const searched = calls.some((a) => a[1] === '+search-event');
  const creates = calls.filter((a) => a[1] === '+create');
  console.log('#659 D-12 读数：查了远端=' + searched + ' 仍建=' + creates.length + ' 本地标识=' + JSON.stringify(s.localNew().map((x) => x.feishu_event_id)));
  assert.equal(searched, true, '这条路必须先查远端（老实现这一步在）');
  // #660 收口：查询结果不再被丢弃——远端已有同四元组即「认出来 ＋ 回填标识」，不重复建。
  assert.equal(creates.length, 0, '远端已有同四元组 → 不重复建（D-12 已修；改坏＝回到 1 条即红）');
  assert.equal(s.localNew()[0].feishu_event_id, 'fs_seed', '反向对账把远端标识回填本地（阶段 0）');
});

test('#659 T7 偏离 D-11 · 取不到远端标识不再写空（显式降级标记 ＋ 非 0 退出）', () => {
  const s = makeScheduleSeam({ prefix: 't659t-', state: { createNoId: true } });
  // 本地那条先用「只做本地」档种下：合成写现在默认要碰远端，种子这一跑显式声明不过去。
  assert.equal(s.runNew('schedule.plan.write', { ...ENSURE, feishu: 'skip' }).status, 0);
  s.stub.setState({ createFails: false, createNoId: true, mode: 'normal' });
  s.stub.clearCalls();
  const r = s.runNew('schedule.plan.write', { op: 'sync', date: D });
  const rows = s.localNew();
  console.log('#659 D-11 读数：远端建了=' + s.calls().filter((c) => c.argv[1] === '+create').length
    + ' 本地标识=' + JSON.stringify(rows.map((x) => x.feishu_event_id)) + ' 退出码=' + r.status);
  assert.equal(s.calls().filter((c) => c.argv[1] === '+create').length, 1, '这一跑确实建了远端对象');
  // #660 收口：拿不到标识就**不写**（老实现写空，下一轮还会重复建），且回执如实标远端没成。
  assert.equal(rows[0].feishu_event_id, null, '拿不到远端标识就不写回本地（不写空冒充成功）');
  assert.equal(envelope(r).data.remote, 'unavailable', '回执如实标远端没成（不谎报成功）');
  assert.equal(r.status, 4, '没达成 ⇒ 退出码非 0');
});
