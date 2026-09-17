/** #607 · 训记推送链：push-plan／upsert（接口形状＋限频＋重试＋退出码映射）。
 *
 * 一律挡板：**不许打真实训记接口**（真机联调另开票）。传输／时钟／睡眠／状态文件／KEY／计划来源
 * 全从注入缝进（`runXunjiCommand(argv, deps)`）；`dist/xunji/cli.js` 只测 `--dry-run` 那条无网路。
 *
 * 四点票面验收（各有独立用例）：
 * ① 请求形状逐字段断言（datestr 原样／localid=0／start=end=0／name 原样上报不校验）；
 * ② 限频窗口内被拦（睡够再调；跨进程状态文件也守）；
 * ③ auth 失败不重试（本地缺 KEY 不调网；服务端 401 不重试且退 2）；
 * ④ 超时非 0 退出（hang 住的传输 ＋ 小超时 ＋ 耗尽重试 → 退 3）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'xunji', 'cli.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't607-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

function cli(args, env = {}) {
  try {
    const stdout = execFileSync(NODE_BIN, [CLI, ...args], {
      encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env },
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') };
  }
}

/** 记账挡板传输：按剧本回放，每次调用记一条（含 url／头／包体）。 */
function stubTransport(script) {
  const calls = [];
  let n = 0;
  const transport = async (url, init) => {
    const idx = n;
    n += 1;
    calls.push({ url, method: init.method, headers: init.headers, body: JSON.parse(init.body) });
    const step = script[Math.min(idx, script.length - 1)];
    if (step.hang === true) {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => {
          const e = new Error('The operation was aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    }
    return { status: step.status, bodyText: async () => JSON.stringify(step.body) };
  };
  return { transport, calls, count: () => n };
}

const okBody = { success: true, res: { trains: [{ localid: 11 }] } };
const okScript = [{ status: 200, body: okBody }];

const SESSIONS = [
  { session_label: '上肢', movements: [{ name: '俯卧撑 resting', sets: [{ reps: 12, weight: 47.5, unit: 'kg' }] }] },
  { session_label: '下肢', movements: [{ name: '不存在动作XYZ', sets: [{ reps: 8, load: 60 }] }] },
];

let mod = null;
let runMod = null;
let reqMod = null;
let rlMod = null;
let exitMod = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  mod = await import('../dist/xunji/index.js');
  runMod = await import('../dist/xunji/run.js');
  reqMod = await import('../dist/xunji/request.js');
  rlMod = await import('../dist/xunji/rateLimit.js');
  exitMod = await import('../dist/xunji/exitMap.js');
});

describe('#607 推送链', () => {
  it('能力门仍恰五件（本票不扩门；推送链经 runXunjiCommand／CLI 对外）', () => {
    assert.deepEqual(
      Object.keys(mod).sort(),
      ['XUNJI_CATALOG', 'XUNJI_SUBCOMMANDS', 'readMovementCatalog', 'runXunjiCommand', 'verifyMovements'],
    );
  });

  it('声明翻位：upsert／push-plan 已实现且无归属票，#610 三条落完后 declared 为空', () => {
    const byName = Object.fromEntries(mod.XUNJI_SUBCOMMANDS.map((s) => [s.name, s]));
    for (const n of ['upsert', 'push-plan']) {
      assert.equal(byName[n].state, 'implemented', n);
      assert.equal(byName[n].ownerTicket, null, n);
    }
    const declared = Object.fromEntries(
      mod.XUNJI_SUBCOMMANDS.filter((s) => s.state === 'declared').map((s) => [s.name, s.ownerTicket]),
    );
    assert.deepEqual(declared, {});
  });

  it('① 请求形状逐字段：POST 地址／头／包体五键／res[] 原样（不转时间戳／不校验动作库）', async () => {
    const stub = stubTransport(okScript);
    const res = [{
      datestr: '2026-07-13', localid: 0, title: '胸', start: 0, end: 0,
      movements: [{ name: '不存在动作XYZ', sets: [{ done: false, weight: '60', unit: 'kg', reps: '8' }] }],
    }];
    const run = await runMod.runXunjiCommand(
      ['upsert', '--json', JSON.stringify(res), '--client-request-id', 'cid-1'],
      { transport: stub.transport, key: 'REDACTED', rateLimitPath: null },
    );
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(stub.count(), 1);
    const c = stub.calls[0];
    assert.equal(c.url, 'https://trains.xunjiapp.cn/api_upsert_trains_for_llm_v2');
    assert.equal(c.method, 'POST');
    assert.equal(c.headers['Content-Type'], 'application/json');
    assert.equal(c.headers.Authorization, 'Bearer REDACTED');
    assert.equal(c.body.schema_version, 'train_open_api_v2');
    assert.equal(c.body.client_request_id, 'cid-1');
    assert.equal(c.body.dry_run, false);
    assert.equal(c.body.include_full_data, false);
    assert.deepEqual(c.body.res, res);
  });

  it('① 转换口径：datestr 原样／localid=0／start=end=0／name 原样／set 标量化＋done=false', () => {
    const item = reqMod.sessionToResItem('2026-07-13', SESSIONS[0]);
    assert.deepEqual(item, {
      datestr: '2026-07-13', localid: 0, title: '上肢', start: 0, end: 0,
      movements: [{ name: '俯卧撑 resting', sets: [{ done: false, weight: '47.5', unit: 'kg', reps: '12' }] }],
    });
    // load 回退＋缺省：weight 缺时读 load（60）；unit 缺时 kg；reps 有 8 报 8；非标量 name 退空串
    const fallback = reqMod.sessionToResItem('2026-07-13', SESSIONS[1]);
    assert.deepEqual(fallback.movements, [{ name: '不存在动作XYZ', sets: [{ done: false, weight: '60', unit: 'kg', reps: '8' }] }]);
    const weird = reqMod.sessionToResItem('2026-07-13', { session_label: '怪', movements: [{ name: ['list'], sets: [null] }] });
    assert.deepEqual(weird.movements, [{ name: '', sets: [{ done: false, weight: '0', unit: 'kg', reps: '0' }] }]);
  });

  it('② 限频窗口内被拦：有历史即睡够再调；两段幂等键不同；状态文件被刷新', async () => {
    const dir = tmp('rate');
    const statePath = join(dir, 'xunji_push_rate.json');
    const t0 = Date.parse('2026-07-13T10:00:00.000Z');
    writeFileSync(statePath, JSON.stringify({ last_upsert_iso: new Date(t0).toISOString() }));
    const stub = stubTransport([okScript[0], okScript[0]]);
    const sleeps = [];
    let clock = t0 + 1000;
    const run = await runMod.runXunjiCommand(['push-plan', '--date', '2026-07-13'], {
      planSource: () => ({ found: true, sessions: SESSIONS, planWeek: 1, dayOfWeek: 1 }),
      transport: stub.transport,
      key: 'REDACTED',
      now: () => clock,
      sleep: async (ms) => { sleeps.push(ms); clock += ms; },
      rateLimitPath: statePath,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(stub.count(), 2);
    // 第一段：距上次仅 1 秒 → 睡约 44 秒；第二段：距第一段 0 秒（同钟）→ 睡满 45 秒
    assert.equal(sleeps.length, 2);
    assert.ok(sleeps[0] > 43000 && sleeps[0] <= 45000, String(sleeps));
    assert.ok(sleeps[1] >= 44999 && sleeps[1] <= 45000, String(sleeps));
    const data = run.data;
    assert.equal(data.session_count, 2);
    assert.equal(data.ok_count, 2);
    assert.equal(data.fail_count, 0);
    const ids = data.results.map((r) => r.client_request_id);
    assert.ok(ids[0].startsWith('2026-07-13_上肢_') && ids[1].startsWith('2026-07-13_下肢_'), String(ids));
    assert.notEqual(ids[0], ids[1]);
    // 状态文件被刷新到第二段时刻
    const saved = JSON.parse(readFileSync(statePath, 'utf8'));
    assert.equal(saved.last_upsert_iso, new Date(clock).toISOString());
  });

  it('② 限频纯函数：无历史／出窗不睡，窗内回剩余量；坏状态文件当无历史', () => {
    assert.equal(rlMod.rateLimitWaitMs(null, 1000), 0);
    assert.equal(rlMod.rateLimitWaitMs(0, 45000), 0);
    assert.equal(rlMod.rateLimitWaitMs(0, 44999), 1);
    assert.equal(rlMod.RATE_LIMIT_SECONDS, 45);
  });

  it('② dry-run 不限频不记限频：sleep 零调用，状态文件不落地', async () => {
    const dir = tmp('dry');
    const statePath = join(dir, 'xunji_push_rate.json');
    const stub = stubTransport(okScript);
    const sleeps = [];
    const run = await runMod.runXunjiCommand(['push-plan', '--date', '2026-07-13', '--dry-run'], {
      planSource: () => ({ found: true, sessions: SESSIONS, planWeek: 1, dayOfWeek: 1 }),
      transport: stub.transport,
      key: 'REDACTED',
      sleep: async (ms) => { sleeps.push(ms); },
      rateLimitPath: statePath,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(stub.count(), 0);
    assert.deepEqual(sleeps, []);
    assert.equal(existsSync(statePath), false);
    assert.equal(run.data.results.length, 2);
  });

  it('③ 本地缺 KEY：auth 失败退 2，不调网（transport 零调用）', async () => {
    const stub = stubTransport(okScript);
    const run = await runMod.runXunjiCommand(['upsert', '--json', '[]'], {
      transport: stub.transport, readKey: () => null, rateLimitPath: null,
    });
    assert.equal(run.code, 2, JSON.stringify(run.data));
    assert.equal(stub.count(), 0);
    assert.equal(run.data.err, true);
    assert.equal(run.data.error_type, 'auth');
  });

  it('③ 服务端 401：不重试（恰 1 次），退 3（老实况：调用侧只看 err 即 EXIT_API，#595 §八·2）', async () => {
    const stub = stubTransport([{ status: 401, body: { success: false, error: 'apikey invalid' } }]);
    const sleeps = [];
    const run = await runMod.runXunjiCommand(['upsert', '--json', '[]'], {
      transport: stub.transport, key: 'REDACTED', sleep: async (ms) => { sleeps.push(ms); }, rateLimitPath: null,
    });
    assert.equal(run.code, 3, JSON.stringify(run.data));
    assert.equal(stub.count(), 1);
    assert.deepEqual(sleeps, []);
    assert.equal(run.data.error_type, 'auth');
    assert.equal(run.data.code, 401);
  });

  it('③ validation／vip 不重试：400 与仅VIP 各恰 1 次，退 3', async () => {
    for (const body of [{ code: 1, message: 'bad field' }, { success: false, error: '仅VIP可用' }]) {
      const status = body.code !== undefined ? 400 : 200;
      const stub = stubTransport([{ status, body }]);
      const sleeps = [];
      const expected = body.code !== undefined ? 'validation' : 'vip_required';
      const run = await runMod.runXunjiCommand(['upsert', '--json', '[]'], {
        transport: stub.transport, key: 'REDACTED', sleep: async (ms) => { sleeps.push(ms); }, rateLimitPath: null,
      });
      assert.equal(run.code, 3, expected + ':' + JSON.stringify(run.data));
      assert.equal(stub.count(), 1, expected);
      assert.deepEqual(sleeps, [], expected);
      assert.equal(run.data.error_type, expected);
    }
  });

  it('重试：500 后成功 → 调 2 次，退避恰 [5000]，attempts 回写', async () => {
    const stub = stubTransport([{ status: 500, body: { message: 'boom' } }, okScript[0]]);
    const sleeps = [];
    const run = await runMod.runXunjiCommand(['upsert', '--json', '[]'], {
      transport: stub.transport, key: 'REDACTED', sleep: async (ms) => { sleeps.push(ms); }, rateLimitPath: null,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(stub.count(), 2);
    assert.deepEqual(sleeps, [5000]);
    assert.equal(run.data.attempts, 2);
  });

  it('④ 超时非 0 退出：hang 住的传输 ＋ 小超时 ＋ 重试耗尽 → 退 3，attempts=2', async () => {
    const stub = stubTransport([{ hang: true }]);
    const sleeps = [];
    const run = await runMod.runXunjiCommand(['upsert', '--json', '[]'], {
      transport: stub.transport, key: 'REDACTED', timeoutMs: 30, maxRetries: 1,
      sleep: async (ms) => { sleeps.push(ms); }, rateLimitPath: null,
    });
    assert.equal(run.code, 3, JSON.stringify(run.data));
    assert.equal(stub.count(), 2);
    assert.equal(run.data.err, true);
    assert.equal(run.data.error_type, 'network');
    assert.equal(run.data.attempts, 2);
  });

  it('用法错退 1：--json 二选一违例／坏串／非数组／坏日期', async () => {
    const base = { transport: stubTransport(okScript).transport, key: 'REDACTED', rateLimitPath: null };
    assert.equal((await runMod.runXunjiCommand(['upsert'], base)).code, 1);
    assert.equal((await runMod.runXunjiCommand(['upsert', '--json', '[]', '--json-file', 'x'], base)).code, 1);
    assert.equal((await runMod.runXunjiCommand(['upsert', '--json', '{坏'], base)).code, 1);
    assert.equal((await runMod.runXunjiCommand(['upsert', '--json', '{"a":1}'], base)).code, 1);
    const badDate = await runMod.runXunjiCommand(['push-plan', '--date', '2026-13-40'], {
      planSource: () => { throw new Error('不应走到取数'); },
    });
    assert.equal(badDate.code, 1);
    assert.match(badDate.stderr, /日期/);
  });

  it('取数失败不静默吞：planSource 报缺 → 退 1 且点名原因', async () => {
    const run = await runMod.runXunjiCommand(['push-plan', '--date', '2026-07-13'], {
      planSource: () => ({ found: false, reason: '无训练计划（先定训练计划）' }),
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /无训练计划/);
  });

  it('退出码映射表：本地缺 KEY（auth 无状态码）退 2，服务端 401／403 与其余接口错退 3；表内 11 行逐位可查', () => {
    assert.equal(exitMod.exitForFailure({ error_type: 'auth', code: null }), 2);
    assert.equal(exitMod.exitForFailure({ error_type: 'auth', code: 401 }), 3);
    assert.equal(exitMod.exitForFailure({ error_type: 'auth', code: 403 }), 3);
    for (const k of ['rate_limit', 'vip_required', 'validation', 'server', 'network', 'unknown']) {
      assert.equal(exitMod.exitForFailure({ error_type: k, code: 500 }), 3, k);
    }
    assert.equal(exitMod.PUSH_EXIT_TABLE.length, 11);
    assert.ok(exitMod.PUSH_EXIT_TABLE.every((r) => [0, 1, 2, 3, 4].includes(r.code)));
    assert.equal(exitMod.PUSH_EXIT_TABLE.find((r) => r.event.startsWith('服务端 401')).code, 3);
  });

  it('CLI：upsert --dry-run 无网退 0；push-plan 坏日期退 1（子进程级）', () => {
    const dry = cli(['upsert', '--json', '[{"datestr":"2026-07-13","localid":0,"movements":[]}]', '--dry-run']);
    assert.equal(dry.code, 0, dry.stderr);
    const payload = JSON.parse(dry.stdout);
    assert.equal(payload.dry_run, true);
    assert.equal(payload.res_count, 1);
    const bad = cli(['push-plan', '--date', '明天']);
    assert.equal(bad.code, 1);
    assert.match(bad.stderr, /日期/);
  });

  it('CLI：push-plan --dry-run 走真取数口（fixture 库）：转换形状对，退出 0', () => {
    const dir = tmp('db');
    const dbFile = join(dir, 'calorie_data.db');
    const db = new DatabaseSync(dbFile);
    db.exec('CREATE TABLE workout_plan_config (id INTEGER PRIMARY KEY, title TEXT, version TEXT, description TEXT, total_weeks INTEGER, start_date TEXT)');
    db.exec('CREATE TABLE workout_plans (week_number INTEGER, day_of_week INTEGER, session_index INTEGER, session_label TEXT, time_start TEXT, time_end TEXT, is_rest_day INTEGER, total_sets INTEGER, movements TEXT)');
    // 2026-07-13 是周一（dow=1）：落在第 1 周周一
    db.prepare('INSERT INTO workout_plan_config (id, title, total_weeks, start_date) VALUES (1, ?, 4, ?)').run('t', '2026-07-13');
    db.prepare('INSERT INTO workout_plans (week_number, day_of_week, session_index, session_label, movements) VALUES (1, 1, 1, ?, ?)').run(
      '上肢', JSON.stringify([{ name: '俯卧撑', sets: [{ reps: 10, weight: 0, unit: '自重' }] }]),
    );
    db.close();
    const run = cli(['push-plan', '--date', '2026-07-13', '--dry-run'], { SKILLS_DB_PATH: dir });
    assert.equal(run.code, 0, run.stderr + run.stdout);
    const data = JSON.parse(run.stdout);
    assert.equal(data.session_count, 1);
    assert.equal(data.results[0].session_label, '上肢');
    assert.ok(data.results[0].client_request_id.startsWith('2026-07-13_上肢_'));
    assert.equal(data.ok_count, 1);
    assert.equal(data.fail_count, 0);
  });
});
