/** #608 · 训记回写链：fetch／backfill（范围口径＋三列幂等键＋exercise_log 写入路径）。
 *
 * 一律挡板：**不许打真实训记接口**（真机联调另开票）。传输／拉取／开库／时钟／睡眠
 * 全从注入缝进（`runXunjiCommand(argv, deps)`／`backfillRange(end, days, deps)`）；
 * `dist/xunji/cli.js` 只测拒收路径（缺参／坏天数，无网路）。
 *
 * 票面验收（各有独立用例）：
 * ① 三列幂等——同一条拉两次不增行（且两列不够：同 localid＋set_index、动作不同即两行）；
 * ② UPDATE 覆盖 7 列但 `note`／`date` 被保留；
 * ③ 写库失败非 0 退出，且与「没拉到」文案可区分；
 * ④ 范围只能「结束日＋往前 N 天」，默认 1 天（照签名，不照文档「默认 2」）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configTestBase } from './helpers/config-test.mjs';

// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
configTestBase();

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const CLI = join(PKG, 'dist', 'xunji', 'cli.js');

const tmp = (name) => {
  const dir = join(mkdtempSync(join(tmpdir(), 't608-')), name);
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

/** 记账挡板传输：按剧本回放，每次调用记一条。 */
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

/** 一条样本训练：index0（12 次）＋ index1（范围取大 16）＋ index2（未完成，跳过）。 */
const train = (over = {}) => ({
  localid: 1783908000, title: '胸', datestr: '2026-07-13', difficulty: 'normal',
  movements: [{ name: '哑铃弯举', sets: [
    { index: 0, done: true, weight: '10', unit: 'kg', reps: '12' },
    { index: 1, done: true, weight: '10', unit: 'kg', reps: '12-16' },
    { index: 2, done: false, weight: '10', unit: 'kg', reps: '8' },
  ] }],
  ...over,
});

const okResp = (trains) => ({ success: true, res: { trains } });
const okDay = (trains) => async () => ({ ok: true, response: okResp(trains), attempts: 1 });
const failDay = (error_type = 'server', message = '训记服务端错（500）') => async () => ({
  ok: false, failure: { error_type, message, retry_after: null, raw_body: null, code: 500 }, attempts: 3,
});

const countRows = (dbFile) => {
  const { openDb } = modMain;
  const db = openDb(dbFile);
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM exercise_log').get().n;
  } finally {
    db.close();
  }
};

const readRow = (dbFile, localid, type, index) => {
  const db = modMain.openDb(dbFile);
  try {
    return db.prepare(
      'SELECT * FROM exercise_log WHERE xunji_localid = ? AND exercise_type = ? AND set_index = ?',
    ).get(String(localid), type, index);
  } finally {
    db.close();
  }
};

let mod = null;
let modMain = null;
let runMod = null;
let rowsMod = null;
let backfillMod = null;
let fetchMod = null;

before(async () => {
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
  mod = await import('../dist/xunji/index.js');
  modMain = await import('../dist/index.js');
  runMod = await import('../dist/xunji/run.js');
  rowsMod = await import('../dist/xunji/rows.js');
  backfillMod = await import('../dist/xunji/backfill.js');
  fetchMod = await import('../dist/xunji/fetch.js');
});

describe('#608 回写链', () => {
  it('能力门仍恰五件（本票不扩门；回写链经 runXunjiCommand／CLI 对外）', () => {
    assert.deepEqual(
      Object.keys(mod).sort(),
      ['XUNJI_CATALOG', 'XUNJI_SUBCOMMANDS', 'readMovementCatalog', 'runXunjiCommand', 'verifyMovements'],
    );
  });

  it('声明翻位：fetch／backfill 已实现且无归属票，#610 三条落完后 declared 为空', () => {
    const byName = Object.fromEntries(mod.XUNJI_SUBCOMMANDS.map((s) => [s.name, s]));
    for (const n of ['fetch', 'backfill']) {
      assert.equal(byName[n].state, 'implemented', n);
      assert.equal(byName[n].ownerTicket, null, n);
    }
    const declared = Object.fromEntries(
      mod.XUNJI_SUBCOMMANDS.filter((s) => s.state === 'declared').map((s) => [s.name, s.ownerTicket]),
    );
    assert.deepEqual(declared, {});
  });

  it('行映射：只收 done 组；范围次数取最大；lbs 换算；热量＝容量×0.08；分类推断', () => {
    const rows = rowsMod.xunjiResponseToRows(okResp([train()]));
    assert.equal(rows.length, 2, JSON.stringify(rows));
    assert.deepEqual(
      rows[0],
      {
        date: '2026-07-13', exerciseType: '哑铃弯举', reps: 12, setIndex: 0, loadKg: 10,
        caloriesBurned: 9.6, category: '力量', difficulty: 'normal',
        xunjiLocalid: '1783908000', xunjiTitle: '胸',
      },
    );
    assert.equal(rows[1].reps, 16);
    assert.equal(rows[1].caloriesBurned, 12.8);
    const lbs = rowsMod.xunjiResponseToRows(okResp([train({
      movements: [{ name: '杠铃深蹲', sets: [{ index: 0, done: true, weight: '100', unit: 'lbs', reps: '5' }] }],
    })]));
    assert.equal(lbs.length, 1);
    assert.equal(lbs[0].loadKg, 45.4);
    assert.equal(lbs[0].caloriesBurned, 18.2);
  });

  it('① 三列幂等：同一条拉两次不增行（第二次全走更新）', async () => {
    const dir = tmp('idempotent');
    const dbFile = join(dir, 'calorie_data.db');
    modMain.openDb(dbFile).close();
    const deps = { fetchDay: okDay([train()]), dbFile };
    const first = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], deps);
    assert.equal(first.code, 0, JSON.stringify(first.data));
    assert.equal(first.data.total_inserted, 2);
    assert.equal(first.data.total_updated, 0);
    assert.equal(countRows(dbFile), 2);
    const second = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], deps);
    assert.equal(second.code, 0, JSON.stringify(second.data));
    assert.equal(second.data.total_inserted, 0);
    assert.equal(second.data.total_updated, 2);
    assert.equal(countRows(dbFile), 2);
  });

  it('① 两列不够：同 localid＋set_index、动作不同即两行（钉三列，文档两列说错了）', async () => {
    const dir = tmp('threecol');
    const dbFile = join(dir, 'calorie_data.db');
    modMain.openDb(dbFile).close();
    const other = train({ movements: [{ name: '俯卧撑', sets: [{ index: 0, done: true, weight: '0', unit: 'kg', reps: '20' }] }] });
    const deps = { fetchDay: okDay([train(), other]), dbFile };
    const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], deps);
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(countRows(dbFile), 3);
  });

  it('② UPDATE 覆盖 7 列但 note／date 被保留', async () => {
    const dir = tmp('preserve');
    const dbFile = join(dir, 'calorie_data.db');
    const seed = modMain.openDb(dbFile);
    seed.prepare(
      'INSERT INTO exercise_log (date, exercise_type, calories_burned, note, reps, load_kg, xunji_localid, xunji_title, set_index, category, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('2026-07-12', '哑铃弯举', 5, '手填', 8, 5, '1783908000', '旧标题', 0, '力量', 'easy');
    seed.close();
    const deps = { fetchDay: okDay([train()]), dbFile };
    const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], deps);
    assert.equal(run.code, 0, JSON.stringify(run.data));
    const row = readRow(dbFile, 1783908000, '哑铃弯举', 0);
    assert.equal(row.date, '2026-07-12', 'date 必须保留');
    assert.equal(row.note, '手填', 'note 必须保留');
    assert.equal(row.reps, 12, 'reps 必须被覆盖');
    assert.equal(row.load_kg, 10, 'load_kg 必须被覆盖');
    assert.equal(row.calories_burned, 9.6, 'calories 必须被覆盖');
    assert.equal(row.difficulty, 'normal', 'difficulty 必须被覆盖');
    assert.equal(row.xunji_title, '胸', 'xunji_title 必须被覆盖');
  });

  it('③ 写库失败非 0，且与「没拉到」文案可区分', async () => {
    const writeFail = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], {
      fetchDay: okDay([train()]),
      openDb: () => { throw new Error('disk gone'); },
      dbFile: join(tmp('writefail'), 'c.db'),
    });
    assert.equal(writeFail.code, 3, JSON.stringify(writeFail.data));
    assert.match(String(writeFail.data.results[0].err), /拉到了没写进/);
    assert.equal(writeFail.data.results[0].fetch_ok, true);
    const fetchFail = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], {
      fetchDay: failDay(),
      dbFile: join(tmp('fetchfail'), 'c.db'),
    });
    assert.equal(fetchFail.code, 3, JSON.stringify(fetchFail.data));
    assert.match(String(fetchFail.data.results[0].err), /没拉到/);
    assert.equal(fetchFail.data.results[0].fetch_ok, false);
  });

  it('④ 范围只能「结束日＋往前 N 天」；默认 1 天', async () => {
    assert.deepEqual(backfillMod.rangeDates('2026-07-13', 2), ['2026-07-13', '2026-07-12']);
    assert.equal(backfillMod.BACKFILL_DEFAULT_DAYS, 1);
    const seen = [];
    const dir = tmp('range');
    const dbFile = join(dir, 'calorie_data.db');
    modMain.openDb(dbFile).close();
    const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13', '--days', '2'], {
      fetchDay: async (d) => { seen.push(d); return { ok: true, response: okResp([]), attempts: 1 }; },
      dbFile,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.deepEqual(seen, ['2026-07-13', '2026-07-12']);
    assert.deepEqual(run.data.results.map((r) => r.skipped_empty), [true, true]);
    const one = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], {
      fetchDay: async (d) => { seen.push(d); return { ok: true, response: okResp([]), attempts: 1 }; },
      dbFile,
    });
    assert.equal(one.data.days, 1);
    assert.equal(one.data.results.length, 1);
  });

  it('坏天数拒收（0／小数／非数字一律 exit 1，不静默吞成 1 天）', async () => {
    for (const days of ['0', '1.5', 'abc']) {
      const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13', '--days', days], {
        fetchDay: okDay([]), dbFile: join(tmp('baddays'), 'c.db'),
      });
      assert.equal(run.code, 1, days + ' 退 ' + run.code);
      assert.match(run.message, /天数/);
    }
  });

  it('空 trains：skipped_empty、exit 0、不增行', async () => {
    const dir = tmp('empty');
    const dbFile = join(dir, 'calorie_data.db');
    modMain.openDb(dbFile).close();
    const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], {
      fetchDay: okDay([]), dbFile,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(run.data.results[0].skipped_empty, true);
    assert.equal(countRows(dbFile), 0);
  });

  it('fetch 只读不改库：拉到训练也不落库，读数带条数与可读列', async () => {
    const dir = tmp('fetchreadonly');
    const dbFile = join(dir, 'calorie_data.db');
    modMain.openDb(dbFile).close();
    const stub = stubTransport([{ status: 200, body: okResp([train()]) }]);
    const run = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13'], {
      transport: stub.transport, key: 'REDACTED', fetchRateLimitPath: null,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(run.data.trains_count, 1);
    assert.equal(run.data.trains[0].localid, 1783908000);
    assert.equal(run.data.trains[0].movements[0].sets.length, 3);
    assert.equal(countRows(dbFile), 0);
    const raw = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13', '--raw'], {
      transport: stub.transport, key: 'REDACTED', fetchRateLimitPath: null,
    });
    assert.equal(raw.code, 0);
    assert.ok(raw.data.res.trains.length === 1, JSON.stringify(raw.data).slice(0, 120));
  });

  it('fetch 包体三键：datestr 原样＋include_full_data 按 --full 走', async () => {
    const stub = stubTransport([{ status: 200, body: okResp([]) }]);
    await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13', '--full'], {
      transport: stub.transport, key: 'REDACTED', fetchRateLimitPath: null,
    });
    assert.deepEqual(stub.calls[0].body, {
      schema_version: 'train_open_api_v2', datestr: '2026-07-13', include_full_data: true,
    });
    const stub2 = stubTransport([{ status: 200, body: okResp([]) }]);
    await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13'], {
      transport: stub2.transport, key: 'REDACTED', fetchRateLimitPath: null,
    });
    assert.equal(stub2.calls[0].body.include_full_data, false);
  });

  it('fetch 无 KEY 不调网退 2；服务端 401 不重试退 3', async () => {
    const stub = stubTransport([{ status: 200, body: okResp([]) }]);
    const missing = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13'], {
      transport: stub.transport, readKey: () => null, fetchRateLimitPath: null,
    });
    assert.equal(missing.code, 2, JSON.stringify(missing.data));
    assert.equal(stub.count(), 0);
    const denied = stubTransport([{ status: 401, body: { error: 'invalid apikey' } }]);
    const run = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13'], {
      transport: denied.transport, key: 'REDACTED', fetchRateLimitPath: null,
    });
    assert.equal(run.code, 3, JSON.stringify(run.data));
    assert.equal(denied.count(), 1, 'auth 不重试');
  });

  it('fetch 500 重试后成功：attempts 回写；耗尽退 3', async () => {
    const flaky = stubTransport([
      { status: 500, body: { error: 'boom' } },
      { status: 200, body: okResp([train()]) },
    ]);
    const run = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13', '--raw'], {
      transport: flaky.transport, key: 'REDACTED', fetchRateLimitPath: null, sleep: async () => {},
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(run.data.attempts, 2);
    const dead = stubTransport([{ status: 500, body: { error: 'boom' } }]);
    const gone = await runMod.runXunjiCommand(['fetch', '--date', '2026-07-13'], {
      transport: dead.transport, key: 'REDACTED', fetchRateLimitPath: null, sleep: async () => {},
    });
    assert.equal(gone.code, 3, JSON.stringify(gone.data));
    assert.equal(dead.count(), 3, '首调＋2 次重试');
  });

  it('fetch 限频：full 档 30 秒内二次调用先等（时钟／睡眠／状态全注入）', async () => {
    const state = join(tmp('ratelimit'), 'rate.json');
    const slept = [];
    const mk = () => fetchMod.fetchTrains('2026-07-13', {
      includeFullData: true, key: 'REDACTED',
      transport: stubTransport([{ status: 200, body: okResp([]) }]).transport,
      sleep: async (ms) => { slept.push(ms); },
      now: () => 1000000, respectRateLimit: true, rateLimitPath: state,
    });
    const first = await mk();
    assert.equal(first.ok, true);
    assert.deepEqual(slept, [], '无历史不等待');
    const second = await mk();
    assert.equal(second.ok, true);
    assert.equal(slept.length, 1);
    assert.ok(Math.abs(slept[0] - 30000) < 1, '等满 30 秒窗：' + slept[0]);
  });

  it('回写体重：weight_log 最新一条进读数，读不出即 null 不阻塞', async () => {
    const dir = tmp('weight');
    const dbFile = join(dir, 'calorie_data.db');
    const seed = modMain.openDb(dbFile);
    seed.prepare('INSERT INTO weight_log (date, weight_kg) VALUES (?, ?)').run('2026-07-12', 70.5);
    seed.close();
    const run = await runMod.runXunjiCommand(['backfill', '--date', '2026-07-13'], {
      fetchDay: okDay([train()]), dbFile,
    });
    assert.equal(run.code, 0, JSON.stringify(run.data));
    assert.equal(run.data.results[0].body_weight_kg, 70.5);
  });

  it('addRecord 补上 xunji 两列：给了即落库，不给即 null（列语义不变）', async () => {
    const store = await import('../dist/exercise/exerciseStore.js');
    const dir = tmp('addrecord');
    const db = modMain.openDb(join(dir, 'calorie_data.db'));
    try {
      const a = store.addRecord(db, {
        date: '2026-07-13', exerciseType: '慢跑', caloriesBurned: 100, xunjiLocalid: 'L1', xunjiTitle: 'T1',
      });
      assert.equal(a.record.xunji_localid, 'L1');
      assert.equal(a.record.xunji_title, 'T1');
      const row = db.prepare('SELECT xunji_localid, xunji_title FROM exercise_log WHERE id = ?').get(a.id);
      assert.deepEqual([row.xunji_localid, row.xunji_title], ['L1', 'T1']);
      const b = store.addRecord(db, { date: '2026-07-13', exerciseType: '慢跑', caloriesBurned: 100 });
      assert.equal(b.record.xunji_localid, null);
      assert.equal(b.record.xunji_title, null);
    } finally {
      db.close();
    }
  });

  it('运动域标签表补上 xunji 两列中文（纯中文，无回退）', async () => {
    await import('../dist/exercise/fieldLabels.js');
    const { fieldLabel } = await import('../dist/shared/fieldLabel.js');
    assert.equal(fieldLabel('exercise', 'xunji_localid'), '训记单号');
    assert.equal(fieldLabel('exercise', 'xunji_title'), '训记标题');
  });

  it('CLI 拒收路径无网路：fetch 缺参／backfill 坏天数一律 exit 1', () => {
    const noDate = cli(['fetch']);
    assert.equal(noDate.code, 1);
    assert.match(noDate.stderr, /缺参数：--date/);
    const badDays = cli(['backfill', '--days', '0']);
    assert.equal(badDays.code, 1);
    assert.match(badDays.stderr, /天数/);
    const stray = cli(['fetch', '--date', '2026-07-13', '--nope']);
    assert.equal(stray.code, 1);
    assert.match(stray.stderr, /未知参数/);
  });
});
