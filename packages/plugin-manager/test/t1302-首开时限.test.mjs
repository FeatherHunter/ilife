// 票 #1302 · 首开时限（管理器这一半）：宿主不回时，单次读失败落在 5–8s 带内，
// 「超时 → 重试 → 终态」总墙钟 ≤15s，终态仍是带「宿主未回」的人话。
//
// 两段快测试用虚拟钟与假 sleep 锁预算的算术（不真等）；两段真墙钟测试量实际耗时。
// 先构建再跑：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const { fetchConfigSurface } = await import('../dist/config-panel-value.js');
const contract = await import('../dist/config-panel-contract.js');
const { CONFIG_READ_BUDGET_MS, CONFIG_READ_RETRY_MS, READ_TIMEOUT_MS, WRITE_TIMEOUT_MS } = contract;

/** 宿主不回的传输口：永远 pending，只能被超时打断。 */
const never = () => new Promise(() => {});

/** 失败信封（宿主给的回执，不是超时）：让重试继续，用来单测预算算术。 */
const refused = () => ({ ok: false, error: { code: 'transport-error', message: '宿主未回' } });

describe('#1302 首开时限 · 常量带', () => {
  it('首次读超时落在 5–8s 带内（原 20s）', () => {
    assert.ok(READ_TIMEOUT_MS >= 5_000 && READ_TIMEOUT_MS <= 8_000, '首次读超时应落在 5–8s：' + READ_TIMEOUT_MS);
  });

  it('保存／重置的写路时限不动：仍是 20s，不跟读路一起收', () => {
    assert.equal(WRITE_TIMEOUT_MS, 20_000, '写路不该被 #1302 的读路收口带上：' + WRITE_TIMEOUT_MS);
    assert.ok(WRITE_TIMEOUT_MS > READ_TIMEOUT_MS, '写路时限必须比读路宽（慢 spawn 10.3s 实测）');
  });

  it('整轮预算 ≤15s，且不封顶的旧账确实会越过它', () => {
    assert.ok(CONFIG_READ_BUDGET_MS <= 15_000, '整轮读预算应 ≤15s：' + CONFIG_READ_BUDGET_MS);
    const unbounded = READ_TIMEOUT_MS * (CONFIG_READ_RETRY_MS.length + 1) + CONFIG_READ_RETRY_MS.reduce((sum, ms) => sum + ms, 0);
    assert.ok(unbounded > CONFIG_READ_BUDGET_MS, '退避表全跑满应比预算长（否则预算白设）：' + unbounded + 'ms');
  });
});

describe('#1302 首开时限 · 预算算术（虚拟钟，不真等）', () => {
  it('每次慢读都吃满 6s：只跑得动一次退避，第二次重试被预算挡掉', async () => {
    let clock = 0;
    let calls = 0;
    const sleeps = [];
    const call = async () => {
      calls += 1;
      clock += 6_000;
      return refused();
    };
    const seen = await fetchConfigSurface(call, '/ilife-schedule', {
      delays: CONFIG_READ_RETRY_MS,
      sleep: async (ms) => { sleeps.push(ms); clock += ms; },
      now: () => clock,
    });
    assert.equal(seen.ok, false);
    assert.equal(calls, 2, '预算内只跑得动两通电话（6s＋1s＋6s＝13s）');
    assert.deepEqual(sleeps, [1000], '只来得及睡第一档退避');
  });

  it('预算给得极小：第一通之后直接收口，不再重试', async () => {
    let clock = 0;
    let calls = 0;
    const seen = await fetchConfigSurface(async () => { calls += 1; clock += 6_000; return refused(); }, '/ilife-schedule', {
      delays: CONFIG_READ_RETRY_MS,
      budgetMs: 1_000,
      sleep: async (ms) => { clock += ms; },
      now: () => clock,
    });
    assert.equal(seen.ok, false);
    assert.equal(calls, 1);
  });

  it('快失败（不吃超时）时预算不挡路：照旧把两档退避跑完再成功', async () => {
    let clock = 0;
    let calls = 0;
    const sleeps = [];
    const seen = await fetchConfigSurface(async () => {
      calls += 1;
      return calls === 2 ? { ok: true, value: { path: '/c/memo.yaml', dataDir: '/c/data', created: false, values: {}, resolved: {} } } : refused();
    }, '/ilife-memo', {
      delays: [1000, 3000],
      sleep: async (ms) => { sleeps.push(ms); clock += ms; },
      now: () => clock,
    });
    assert.equal(seen.ok, true);
    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [1000]);
  });
});

describe('#1302 首开时限 · 真墙钟（宿主不回）', () => {
  it('首次读失败 ≤8s，文案带「宿主未回」与重试指引', async () => {
    const t0 = Date.now();
    const seen = await fetchConfigSurface(never, '/ilife-schedule');
    const ms = Date.now() - t0;
    assert.equal(seen.ok, false);
    assert.ok(ms <= 8_000, '首次读失败耗时 ' + ms + 'ms 超过 8s');
    assert.ok(ms >= 5_000, '首次读失败耗时 ' + ms + 'ms 低于 5s 带（时限被谁改小了？）');
    assert.match(seen.message, /宿主未回/);
    assert.match(seen.message, /重试/);
  });

  it('「超时 → 重试 → 终态」总墙钟 ≤15s，且恰好两通电话（第三通被预算挡掉）', async () => {
    let calls = 0;
    const counted = () => { calls += 1; return never(); };
    const t0 = Date.now();
    const seen = await fetchConfigSurface(counted, '/ilife-schedule', { delays: CONFIG_READ_RETRY_MS });
    const ms = Date.now() - t0;
    assert.equal(seen.ok, false);
    assert.ok(ms <= 15_000, '整轮终态耗时 ' + ms + 'ms 超过 15s');
    assert.equal(calls, 2, '预算只放得下两通慢读（6s＋1s＋6s）');
    assert.match(seen.message, /宿主未回/);
  });
});
