// 票 #1294 · 共用件 skill-cli 的行为门（不是一次性检查：这一份钉的是六家共用的唯一实现）。
//
// 为什么要这一份：六家 bridge 现在只剩薄壳，取数的机械动作——定位已装技能包、异步 spawn、
// 超时看门狗、stdout 上限、信封校验、错误码映射——全在 plugin-manager/src/skill-cli/。
// 这些行为原先由六家的 smoke／config-surface 测试各自覆盖；收成一份实现后，判据也收成一份，
// 免得六家再各抄一遍，且变异（去掉超时杀进程／把错误码写错／漏 await）能在这里 RED。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MAX_STDOUT_BYTES, SPAWN_TIMEOUT_MS } from '../dist/skill-cli/contract.js';
import { resolveNodeBin, runSkillCli } from '../dist/skill-cli/node-bin.js';
import { createSkillCliBridge } from '../dist/skill-cli/bridge-factory.js';

/** 各家 index.ts 里那枚错误类的替身：工厂只负责 new，instanceof 判定留在调用方。 */
class FakeBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FakeBridgeError';
    this.code = code;
  }
}

const makeError = (code, message) => new FakeBridgeError(code, message);

/** 假的已装技能包：<root>/node_modules/skill-fake/{package.json,dist/cli.js}。
 *  moduleUrl 指 <root>/bridge.mjs，故 createRequire 以 root 为起点解析，与真实布局同构。 */
function installFakeSkill(cliSource, { packageRelativeCli = 'dist/cli.js', keepCliFile = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'skill-cli-'));
  const skillDir = join(root, 'node_modules', 'skill-fake');
  mkdirSync(join(skillDir, 'dist'), { recursive: true });
  writeFileSync(join(skillDir, 'package.json'), JSON.stringify({ name: 'skill-fake', version: '1.2.3', type: 'module' }));
  if (keepCliFile) writeFileSync(join(skillDir, packageRelativeCli), cliSource);
  const moduleUrl = pathToFileURL(join(root, 'bridge.mjs')).href;
  const bridgeOf = (extra = {}) =>
    createSkillCliBridge({
      skillPackage: 'skill-fake',
      repoRelativeCli: 'packages/skill-fake/dist/cli.js',
      packageRelativeCli,
      moduleUrl,
      hostCallMethod: 'fake.read',
      makeError,
      ...extra,
    });
  return { root, bridgeOf, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** 正常出口：把收到的 key 与参数原样回执成 data。 */
const HAPPY_CLI = [
  "const [key, flag, raw] = process.argv.slice(2);",
  "process.stdout.write(JSON.stringify({ key, data: { key, flag, params: raw === undefined ? null : JSON.parse(raw) } }));",
].join('\n');

describe('#1294 skill-cli 共用件：契约常量与二进制解析', () => {
  it('超时／回执上限只有一处定义，桥默认取同一份超时', () => {
    assert.equal(SPAWN_TIMEOUT_MS, 20_000);
    assert.equal(MAX_STDOUT_BYTES, 8 * 1024 * 1024);
    const fake = installFakeSkill(HAPPY_CLI);
    try {
      const bridge = fake.bridgeOf();
      assert.equal(bridge.spawnTimeoutMs, SPAWN_TIMEOUT_MS, '生产默认＝契约常量');
      assert.equal(bridge.hostCallMethod, 'fake.read');
      assert.equal(fake.bridgeOf({ spawnTimeoutMs: 250 }).spawnTimeoutMs, 250, '测试可注入短时限');
    } finally {
      fake.cleanup();
    }
  });

  it('resolveNodeBin：node 直用；Electron 宿主加 ELECTRON_RUN_AS_NODE', () => {
    assert.deepEqual(resolveNodeBin('C:/nodejs/node.exe'), { bin: 'C:/nodejs/node.exe', extraEnv: {} });
    assert.deepEqual(resolveNodeBin('/usr/bin/node'), { bin: '/usr/bin/node', extraEnv: {} });
    const electron = resolveNodeBin('D:/DSH Desktop.exe');
    assert.equal(electron.bin, 'D:/DSH Desktop.exe');
    assert.deepEqual(electron.extraEnv, { ELECTRON_RUN_AS_NODE: '1' });
  });
});

describe('#1294 skill-cli 共用件：取数主路（异步＋信封）', () => {
  it('readViaCli 回执 data；key 与 --params 原样交给出口', async () => {
    const fake = installFakeSkill(HAPPY_CLI);
    try {
      const bridge = fake.bridgeOf();
      const data = await bridge.readViaCli('fake.read.something', { nested: { n: 1 } });
      assert.deepEqual(data, { key: 'fake.read.something', flag: '--params', params: { nested: { n: 1 } } });
    } finally {
      fake.cleanup();
    }
  });

  it('两次取数可并行（异步 spawn：不把宿主线程按序列钉住）', async () => {
    const fake = installFakeSkill(HAPPY_CLI);
    try {
      const bridge = fake.bridgeOf();
      const [a, b] = await Promise.all([bridge.readViaCli('fake.a'), bridge.readViaCli('fake.b')]);
      assert.equal(a.key, 'fake.a');
      assert.equal(b.key, 'fake.b');
    } finally {
      fake.cleanup();
    }
  });

  it('specialReads 魔键短路：不定位出口、不起子进程', async () => {
    // 连 node_modules 都不造：若真去 spawn，会先报 missing-cli。
    const root = mkdtempSync(join(tmpdir(), 'skill-cli-'));
    try {
      const bridge = createSkillCliBridge({
        skillPackage: 'skill-absent',
        repoRelativeCli: 'packages/skill-absent/dist/cli.js',
        packageRelativeCli: 'dist/cli.js',
        moduleUrl: pathToFileURL(join(root, 'bridge.mjs')).href,
        hostCallMethod: 'fake.read',
        makeError,
        specialReads: new Map([['fake.version', () => ({ plugin: '9.9.9', skill: '8.8.8' })]]),
      });
      assert.deepEqual(await bridge.readViaCli('fake.version'), { plugin: '9.9.9', skill: '8.8.8' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('handleHostCall 与 readViaCli 同一条路（host 端点不多造第二条）', async () => {
    const fake = installFakeSkill(HAPPY_CLI);
    try {
      const bridge = fake.bridgeOf();
      const viaHost = await bridge.handleHostCall('fake.same');
      const viaPanel = await bridge.readViaCli('fake.same');
      assert.deepEqual(viaHost, viaPanel);
    } finally {
      fake.cleanup();
    }
  });

  it('requestViaHost 只经 host.call：方法名与 {key, params} 载荷原样传', async () => {
    const fake = installFakeSkill(HAPPY_CLI);
    try {
      const seen = [];
      const host = {
        async call(method, args) {
          seen.push({ method, args });
          return { ok: true };
        },
      };
      const got = await fake.bridgeOf().requestViaHost(host, 'fake.key', { a: 1 });
      assert.deepEqual(got, { ok: true });
      assert.deepEqual(seen, [{ method: 'fake.read', args: { key: 'fake.key', params: { a: 1 } } }]);
    } finally {
      fake.cleanup();
    }
  });
});

describe('#1294 skill-cli 共用件：每一档失败都映射成对的错误码（不返空）', () => {
  const cases = [
    ['缺出口 → missing-cli', null, { keepCliFile: false }, 'missing-cli', /技能出口缺失/],
    ['stdout 非 JSON → bad-json', "process.stdout.write('这不是 JSON');", {}, 'bad-json', /出口非 JSON/],
    ['key 不符 → key-mismatch', "process.stdout.write(JSON.stringify({ key: 'wrong', data: 1 }));", {}, 'key-mismatch', /key 不符/],
    ['data 缺失 → fetch-failed（缺失阻断）', "process.stdout.write(JSON.stringify({ key: 'fake.x', data: null }));", {}, 'fetch-failed', /缺失阻断取数/],
    ['非 0 退出 → fetch-failed（带 stderr 末行）', "process.stderr.write('库坏了'); process.exit(3);", {}, 'fetch-failed', /出口非 0（3）：库坏了/],
  ];
  for (const [name, cliSource, opts, code, message] of cases) {
    it(name, async () => {
      const fake = installFakeSkill(cliSource, opts);
      try {
        await assert.rejects(
          () => fake.bridgeOf().readViaCli('fake.x'),
          (error) => {
            assert.ok(error instanceof FakeBridgeError, '错误类由调用方注入');
            assert.equal(error.code, code);
            assert.match(error.message, message);
            return true;
          },
        );
      } finally {
        fake.cleanup();
      }
    });
  }

  it('超时未退 → 杀子进程并报 fetch-failed（不无限挂起）', async () => {
    const fake = installFakeSkill('setTimeout(() => {}, 60_000);');
    try {
      const started = Date.now();
      await assert.rejects(() => fake.bridgeOf({ spawnTimeoutMs: 250 }).readViaCli('fake.slow'), (error) => {
        assert.equal(error.code, 'fetch-failed');
        assert.match(error.message, /未退，已杀掉/);
        return true;
      });
      assert.ok(Date.now() - started < 10_000, '看门狗须在注入时限后杀掉子进程');
    } finally {
      fake.cleanup();
    }
  });

  it('回执超 8 MiB → 杀子进程并报 fetch-failed（不静默截断成 bad-json）', async () => {
    const fake = installFakeSkill("process.stdout.write('x'.repeat(9 * 1024 * 1024));");
    try {
      await assert.rejects(() => fake.bridgeOf().readViaCli('fake.huge'), (error) => {
        assert.equal(error.code, 'fetch-failed');
        assert.match(error.message, /超过 8 MiB 上限，已杀掉/);
        return true;
      });
    } finally {
      fake.cleanup();
    }
  });

  it('assertCliPresent 缺失即抛 missing-cli（同步口，不返空路径）', () => {
    const fake = installFakeSkill(HAPPY_CLI, { keepCliFile: false });
    try {
      const bridge = fake.bridgeOf();
      assert.throws(() => bridge.assertCliPresent(), (error) => error instanceof FakeBridgeError && error.code === 'missing-cli');
    } finally {
      fake.cleanup();
    }
  });

  it('spawn 起不来 → fetch-failed（runSkillCli 的失败面单独钉）', async () => {
    await assert.rejects(
      () => runSkillCli('Z:/definitely-missing-node.exe', ['x'], process.env, 500),
      (failure) => failure.kind === 'spawn-failed' && /ENOENT/.test(failure.message),
    );
  });
});
