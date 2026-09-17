/** #610 · 训记密钥与编排：key／overlay-plan／run-sync。
 *
 * 一律挡板：**不许打真实训记接口**（真机联调另开票），**不许用真 KEY**
 * （全串永不进仓：测试只用 `FAKE-610-*` 假串，且断言全串不出读数）。
 * 传输／KEY／计划来源／四步／PowerShell／状态文件全从注入缝进；
 * `dist/xunji/cli.js` 只测无网路的拒收路径。
 *
 * 四点票面验收（各有独立用例）：
 * ① 无 KEY 退 2（key status／overlay-plan／run-sync 推送步三处）；
 * ② `status` 不回显全串（只回前 4＋末 2 预览；短串只回星号）；
 * ③ `run-sync` 某步失败即非 0 且点名（推送／回写／记心愿三处＋全过＋干跑）；
 * ④ 同 title 两条 overlay 不丢 localid（修 `overlay.py:80` 推导式缺陷）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'xunji', 'cli.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't610-')), name);
  mkdirSync(dir, { recursive: true });
  return dir;
};

/** 去掉两个 KEY 名的环境表（CLI 子进程用；真 KEY 永不进测试进程）。 */
function scrubbedEnv() {
  const env = { ...process.env };
  delete env.XUNJI_TRAINS_KEY;
  delete env.XUNJI_API_KEY;
  return env;
}

function cli(args) {
  try {
    const stdout = execFileSync(NODE_BIN, [CLI, ...args], { encoding: 'utf8', stdio: 'pipe', env: scrubbedEnv() });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') };
  }
}

/** 记账传输挡板（只计数；本票不断言包体形状，那是 #607 的地盘）。 */
function countingTransport() {
  let n = 0;
  const transport = async () => {
    n += 1;
    return { status: 200, bodyText: async () => JSON.stringify({ success: true, res: { trains: [] } }) };
  };
  return { transport, count: () => n };
}

const FAKE_KEY = 'FAKE-610-STATUS-ABCDEF12';
const FAKE_PREVIEW = 'FAKE...12';

const SESS_THORAX = { session_label: '胸', movements: [{ name: '杠铃卧推', sets: [{ reps: 8, weight: 60, unit: 'kg' }] }] };

let runMod = null;
let keyMod = null;
let overlayMod = null;
let syncMod = null;
let indexMod = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  indexMod = await import('../dist/xunji/index.js');
  assert.deepEqual(
    Object.keys(indexMod).sort(),
    ['XUNJI_CATALOG', 'XUNJI_SUBCOMMANDS', 'readMovementCatalog', 'runXunjiCommand', 'verifyMovements'],
  );
  runMod = await import('../dist/xunji/run.js');
  keyMod = await import('../dist/xunji/key.js');
  overlayMod = await import('../dist/xunji/overlay-plan.js');
  syncMod = await import('../dist/xunji/run-sync.js');
});

describe('#610 密钥与编排', () => {
  it('声明翻位：三条已实现且无归属票；key 退 0／1／2，overlay／run-sync 退 0／1／2／3', () => {
    const byName = Object.fromEntries(indexMod.XUNJI_SUBCOMMANDS.map((s) => [s.name, s]));
    for (const n of ['key', 'overlay-plan', 'run-sync']) {
      assert.equal(byName[n].state, 'implemented', n);
      assert.equal(byName[n].ownerTicket, null, n);
    }
    assert.deepEqual(byName.key.exits, [0, 1, 2]);
    assert.deepEqual(byName['overlay-plan'].exits, [0, 1, 2, 3]);
    assert.deepEqual(byName['run-sync'].exits, [0, 1, 2, 3]);
    assert.deepEqual(indexMod.XUNJI_SUBCOMMANDS.filter((s) => s.state === 'declared'), []);
  });

  it('① 无 KEY 退 2：key status（配了退 0）', async () => {
    const savedPrimary = process.env.XUNJI_TRAINS_KEY;
    const savedLegacy = process.env.XUNJI_API_KEY;
    try {
      delete process.env.XUNJI_TRAINS_KEY;
      delete process.env.XUNJI_API_KEY;
      const missing = await runMod.runXunjiCommand(['key', 'status']);
      assert.equal(missing.code, 2, JSON.stringify(missing.data));
      assert.match(missing.message, /未配置训记 KEY/);
      process.env.XUNJI_TRAINS_KEY = FAKE_KEY;
      const present = await runMod.runXunjiCommand(['key', 'status']);
      assert.equal(present.code, 0, JSON.stringify(present.data));
      assert.match(present.message, /KEY 已配置/);
    } finally {
      if (savedPrimary === undefined) delete process.env.XUNJI_TRAINS_KEY;
      else process.env.XUNJI_TRAINS_KEY = savedPrimary;
      if (savedLegacy === undefined) delete process.env.XUNJI_API_KEY;
      else process.env.XUNJI_API_KEY = savedLegacy;
    }
  });

  it('① 无 KEY 退 2：overlay-plan（没调网，传输 0 次）', async () => {
    const t = countingTransport();
    const run = await runMod.runXunjiCommand(['overlay-plan', '--date', '2026-07-13'], {
      overlay: { fetchOpts: { readKey: () => null, transport: t.transport, rateLimitPath: null } },
    });
    assert.equal(run.code, 2, JSON.stringify(run.data));
    assert.match(run.message, /KEY/);
    assert.equal(t.count(), 0, '缺 KEY 不许调网');
  });

  it('① 无 KEY 退 2：run-sync 点名“推送＋日期”', async () => {
    const t = countingTransport();
    const stateFile = join(tmp('state'), 'sync.json');
    const run = await runMod.runXunjiCommand(['run-sync', '--days', '1'], {
      sync: {
        todayISO: '2026-07-13',
        statePath: stateFile,
        planSource: () => ({ found: true, sessions: [SESS_THORAX], planWeek: 1, dayOfWeek: 1 }),
        pushDeps: { upsertOpts: { readKey: () => null, transport: t.transport } },
      },
    });
    assert.equal(run.code, 2, JSON.stringify(run.data));
    assert.match(run.message, /推送/);
    assert.match(run.message, /2026-07-13/);
    assert.equal(t.count(), 0, '缺 KEY 不许调网');
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    assert.equal(state.status, 'failed');
    assert.equal(state.failed_step, '推送 2026-07-13');
  });

  it('② status 不回显全串：只回前 4＋末 2；短串只回星号', async () => {
    const savedPrimary = process.env.XUNJI_TRAINS_KEY;
    const savedLegacy = process.env.XUNJI_API_KEY;
    try {
      delete process.env.XUNJI_API_KEY;
      process.env.XUNJI_TRAINS_KEY = FAKE_KEY;
      const run = await runMod.runXunjiCommand(['key', 'status']);
      assert.equal(run.code, 0);
      assert.equal(run.data.active_key_preview, FAKE_PREVIEW);
      assert.ok(!JSON.stringify(run.data).includes(FAKE_KEY), '读数里出现全串');
      assert.ok(!String(run.message).includes(FAKE_KEY), '人话里出现全串');
      assert.equal(keyMod.previewKey(FAKE_KEY), FAKE_PREVIEW);
      assert.equal(keyMod.previewKey('ABC'), '***', '短串公式会漏全串，只许回星号');
      assert.equal(keyMod.previewKey(''), null);
    } finally {
      if (savedPrimary === undefined) delete process.env.XUNJI_TRAINS_KEY;
      else process.env.XUNJI_TRAINS_KEY = savedPrimary;
      if (savedLegacy === undefined) delete process.env.XUNJI_API_KEY;
      else process.env.XUNJI_API_KEY = savedLegacy;
    }
  });

  it('key set／clear 走挡板 PowerShell：写 HKCU 名＋值走 base64（原文不进命令）', async () => {
    const commands = [];
    const fakeEnv = {};
    const store = { env: fakeEnv, execPs: async (c) => { commands.push(c); } };
    const setRun = await runMod.runXunjiCommand(['key', 'set', 'K-610-SET-SECRET-XYZ'], { keyStore: store });
    assert.equal(setRun.code, 0, JSON.stringify(setRun.data));
    assert.equal(fakeEnv.XUNJI_TRAINS_KEY, 'K-610-SET-SECRET-XYZ', 'set 完当进程同步');
    assert.equal(commands.length, 1);
    assert.ok(commands[0].includes('XUNJI_TRAINS_KEY'), commands[0]);
    assert.ok(commands[0].includes(Buffer.from('K-610-SET-SECRET-XYZ', 'utf8').toString('base64')), '值必须走 base64');
    assert.ok(!commands[0].includes('K-610-SET-SECRET-XYZ'), '原文不许进 PowerShell 命令');
    const clearRun = await runMod.runXunjiCommand(['key', 'clear'], { keyStore: store });
    assert.equal(clearRun.code, 0);
    assert.equal(clearRun.data.had, true);
    assert.ok(!('XUNJI_TRAINS_KEY' in fakeEnv), 'clear 删当进程');
    const clearAgain = await runMod.runXunjiCommand(['key', 'clear'], { keyStore: store });
    assert.equal(clearAgain.code, 0, '本来没设即幂等成功');
    assert.equal(clearAgain.data.had, false);
  });

  it('key 用法错退 1：set 缺值／空值／子动作非法；写失败退 1', async () => {
    const store = { env: {}, execPs: async () => {} };
    assert.equal((await runMod.runXunjiCommand(['key', 'set'], { keyStore: store })).code, 1);
    assert.equal((await runMod.runXunjiCommand(['key', 'set', '   '], { keyStore: store })).code, 1);
    assert.equal((await runMod.runXunjiCommand(['key', 'explode'], { keyStore: store })).code, 1);
    const failing = { env: {}, execPs: async () => { throw new Error('ps 炸了'); } };
    const setFail = await runMod.runXunjiCommand(['key', 'set', 'K-610-X'], { keyStore: failing });
    assert.equal(setFail.code, 1);
    assert.match(setFail.message, /写入系统环境失败/);
    const legacyStore = { env: {}, execPs: async () => {} };
    const legacySet = await runMod.runXunjiCommand(['key', 'set', 'K-610-L', '--legacy'], { keyStore: legacyStore });
    assert.equal(legacySet.code, 0);
    assert.equal(legacyStore.env.XUNJI_API_KEY, 'K-610-L', '--legacy 写兼容名');
  });

  it('③ run-sync 推送失败即非 0 且点名：后步不跑（回写 0 次）', async () => {
    let backfillCalls = 0;
    const stateFile = join(tmp('state'), 'sync.json');
    const run = await runMod.runXunjiCommand(['run-sync', '--days', '2'], {
      sync: {
        todayISO: '2026-07-13',
        statePath: stateFile,
        pushDay: async () => ({ ok: false, code: 3, error: 'push 炸了' }),
        backfill: async () => { backfillCalls += 1; return { ok: true }; },
      },
    });
    assert.equal(run.code, 3, JSON.stringify(run.data));
    assert.match(run.message, /run-sync 失败在推送 2026-07-13/);
    assert.match(run.stderr, /推送 2026-07-13/);
    assert.equal(backfillCalls, 0, '推送失败后回写不许跑');
    assert.equal(run.data.failed_step, '推送 2026-07-13');
    assert.equal(run.data.failed_code, 3);
  });

  it('③ run-sync 回写／记心愿失败也点名；全过退 0（补计划／记心愿记跳过）', async () => {
    const stateFile = join(tmp('state'), 'sync.json');
    const bfFail = await runMod.runXunjiCommand(['run-sync', '--days', '1'], {
      sync: {
        todayISO: '2026-07-13', statePath: stateFile,
        pushDay: async () => ({ ok: true }),
        backfill: async () => ({ ok: false, code: 3, error: 'backfill 炸了' }),
      },
    });
    assert.equal(bfFail.code, 3);
    assert.match(bfFail.message, /run-sync 失败在回写/);
    const wishFail = await runMod.runXunjiCommand(['run-sync', '--days', '1'], {
      sync: {
        todayISO: '2026-07-13', statePath: stateFile,
        wish: async () => ({ ok: false, code: 1, error: 'wish 炸了' }),
        pushDay: async () => ({ ok: true }),
        backfill: async () => ({ ok: true }),
      },
    });
    assert.equal(wishFail.code, 1);
    assert.match(wishFail.message, /run-sync 失败在记心愿/);
    const allOk = await runMod.runXunjiCommand(['run-sync', '--days', '1'], {
      sync: {
        todayISO: '2026-07-13', statePath: stateFile,
        pushDay: async () => ({ ok: true }),
        backfill: async () => ({ ok: true }),
      },
    });
    assert.equal(allOk.code, 0, JSON.stringify(allOk.data));
    assert.match(allOk.message, /跳过/, '缺省补计划／记心愿必须明示跳过');
    const state = JSON.parse(readFileSync(stateFile, 'utf8'));
    assert.equal(state.status, 'completed');
    assert.deepEqual(state.results.map((e) => e.phase), ['plan', 'wish', 'push', 'backfill']);
    assert.ok(state.results[0].skipped && state.results[1].skipped, '前两步记 skipped');
  });

  it('③ run-sync 干跑只建状态文件：退 0，四步一步不跑', async () => {
    let calls = 0;
    const count = async () => { calls += 1; return { ok: true }; };
    const stateFile = join(tmp('state'), 'sync.json');
    const run = await runMod.runXunjiCommand(['run-sync', '--days', '3', '--dry-run'], {
      sync: { todayISO: '2026-07-13', statePath: stateFile, plan: count, wish: count, pushDay: count, backfill: count },
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(calls, 0, '干跑不许跑任何一步');
    assert.equal(run.data.status, 'completed');
  });

  it('④ 同 title 两条不丢 localid：两次 session 各拿各的号', async () => {
    const seen = [];
    const fetchDay = async () => ({
      ok: true,
      response: { res: { trains: [{ title: '胸', localid: 11 }, { title: '胸', localid: 22 }] } },
      attempts: 1,
    });
    const planSource = () => ({ found: true, sessions: [SESS_THORAX, SESS_THORAX], planWeek: 1, dayOfWeek: 1 });
    const upsert = async (resList, cid) => {
      seen.push({ resList, cid });
      return { ok: true, response: { success: true }, attempts: 1 };
    };
    const result = await overlayMod.overlayDayPlan('2026-07-13', { fetchDay, planSource, upsert });
    assert.equal(result.fail_count, 0, JSON.stringify(result));
    assert.equal(seen.length, 1, '单次 upsert');
    assert.deepEqual(seen[0].resList.map((r) => r.localid), [11, 22], '两个 localid 都发出');
    assert.deepEqual(result.matched.map((m) => m.localid), [11, 22]);
    assert.deepEqual(result.missing_in_xunji, []);
  });

  it('④ 同 title 剩一条没人要：extra 点名，耗尽的不在内', async () => {
    const fetchDay = async () => ({
      ok: true,
      response: { res: { trains: [{ title: '胸', localid: 11 }, { title: '胸', localid: 22 }] } },
      attempts: 1,
    });
    const planSource = () => ({ found: true, sessions: [SESS_THORAX], planWeek: 1, dayOfWeek: 1 });
    const upsert = async () => ({ ok: true, response: { success: true }, attempts: 1 });
    const result = await overlayMod.overlayDayPlan('2026-07-13', { fetchDay, planSource, upsert });
    assert.equal(result.fail_count, 0);
    assert.deepEqual(result.matched.map((m) => m.localid), [11]);
    assert.deepEqual(result.extra_in_xunji, ['胸'], '剩下的 localid 仍可见');
  });

  it('④ 缺 title：fail 报 err 不调接口（退 1）；skip 只推有的（退 0）', async () => {
    const fetchDay = async () => ({
      ok: true, response: { res: { trains: [{ title: '胸', localid: 11 }] } }, attempts: 1,
    });
    const planSource = () => ({
      found: true,
      sessions: [SESS_THORAX, { session_label: '背', movements: [] }],
      planWeek: 1, dayOfWeek: 1,
    });
    let upsertCalls = 0;
    let sentList = null;
    const upsert = async (resList, cid) => {
      upsertCalls += 1;
      sentList = resList;
      return { ok: true, response: { success: true }, attempts: 1 };
    };
    const failed = await runMod.runXunjiCommand(['overlay-plan', '--date', '2026-07-13'], {
      overlay: { fetchDay, planSource, upsert },
    });
    assert.equal(failed.code, 1, JSON.stringify(failed.data));
    assert.match(failed.message, /卡路里有但训记没：背/);
    assert.match(failed.message, /missing=fail/);
    assert.equal(upsertCalls, 0, 'fail 不许调接口');
    const skipped = await runMod.runXunjiCommand(['overlay-plan', '--date', '2026-07-13', '--missing', 'skip'], {
      overlay: { fetchDay, planSource, upsert },
    });
    assert.equal(skipped.code, 0, JSON.stringify(skipped.data));
    assert.equal(upsertCalls, 1);
    assert.deepEqual(sentList.map((r) => r.localid), [11]);
    assert.deepEqual(skipped.data.missing_in_xunji, ['背']);
  });

  it('CLI 拒收路径无网路：key 非法子动作／overlay 缺参／run-sync 坏天数一律退 1', () => {
    const badAction = cli(['key', 'explode']);
    assert.equal(badAction.code, 1);
    assert.match(badAction.stderr, /status\|set\|clear/);
    const noDate = cli(['overlay-plan']);
    assert.equal(noDate.code, 1);
    assert.match(noDate.stderr, /缺参数：--date/);
    const badDays = cli(['run-sync', '--days', '0']);
    assert.equal(badDays.code, 1);
    assert.match(badDays.stderr, /天数须为/);
    const noKey = cli(['key', 'status']);
    assert.equal(noKey.code, 2, 'CLI 无 KEY 同样退 2');
  });
});
