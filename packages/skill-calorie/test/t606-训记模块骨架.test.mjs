/** #606 · 训记模块骨架：目录与对外面定形（8 子命令）＋动作库归位＋verify 真跑。
 *
 * 四条票面点名的用例：`src/xunji/` 目录存在、8 条对外名齐、动作库 1092 条可读、缺文件不抛错；
 * 另加对抗用例：声明必须完整（每条有点名的归属票）、声明要有牙（缺参报用法错）、
 * 未实现的五条必须明确拒绝且点名归属票、库读不出退非 0（不照抄老实现退 0）、能力门对外恰五件。
 *
 * #607 随动：`upsert`／`push-plan` 已实现（state 翻位），“未实现的七条”收成五条，
 * 分派改异步（推送链调网，调用方一律 await）。
 * #608 随动：`fetch`／`backfill` 已实现，“未实现的五条”收成三条（只剩 #610 的三条）。
 * #610 随动：`key` 已实现，“未实现的三条”收成两条（只剩 overlay-plan／run-sync）。
 * #610 二轮：`overlay-plan` 已实现，只剩 run-sync 一条。
 * #610 三轮：`run-sync` 已实现，八条全实现（declared 为空）。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SRC = join(PKG, 'src');
const CLI = join(PKG, 'dist', 'xunji', 'cli.js');

/** 老 8 条子命令（逐字，顺序照老 CLI 的装配顺序）。 */
const EIGHT = ['verify', 'fetch', 'upsert', 'push-plan', 'overlay-plan', 'backfill', 'key', 'run-sync'];
/** 未实现零条（#610 三条全落：key／overlay-plan／run-sync 均已实现）。 */
const OWNERS = {};
/** 已实现的全部八条（verify #606；upsert／push-plan #607；fetch／backfill #608；key／overlay-plan／run-sync #610）。 */
const IMPLEMENTED = ['verify', 'upsert', 'push-plan', 'fetch', 'backfill', 'key', 'overlay-plan', 'run-sync'];

const tmp = (name) => join(mkdtempSync(join(tmpdir(), 't606-')), name);

function xunji(...args) {
  try {
    return { code: 0, stdout: execFileSync(NODE_BIN, [CLI, ...args], { encoding: 'utf8', stdio: 'pipe' }), stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout ?? ''), stderr: String(e.stderr ?? '') };
  }
}

let mod = null;

before(async () => {
  mod = await import('../dist/xunji/index.js');
  assert.ok(existsSync(CLI), '缺编译产物：' + CLI + '（先跑 tsc -b packages/skill-calorie）');
});

describe('#606 训记模块骨架', () => {
  it('目录存在：src/xunji/ 五件源码 ＋ 模块自己的数据件；旧住处两件都不在了', () => {
    for (const f of ['index.ts', 'subcommands.ts', 'catalog.ts', 'run.ts', 'cli.ts']) {
      assert.ok(existsSync(join(SRC, 'xunji', f)), '缺 src/xunji/' + f);
    }
    assert.ok(existsSync(join(SRC, 'xunji', 'data', '训记官方动作.json')), '动作库不在模块里');
    assert.equal(existsSync(join(SRC, 'fetch', 'xunji-catalog.ts')), false, '旧件 fetch/xunji-catalog.ts 未删');
    assert.equal(existsSync(join(PKG, 'data', '训记官方动作.json')), false, '旧库位 packages/skill-calorie/data/ 未删');
    assert.equal(existsSync(join(SRC, 'xunji', 'commands.ts')), false, 'commands.ts 是卡路里命令声明的名字，本模块另起一件');
  });

  it('能力门对外恰五件（铁律五）', async () => {
    assert.deepEqual(
      Object.keys(mod).sort(),
      ['XUNJI_CATALOG', 'XUNJI_SUBCOMMANDS', 'readMovementCatalog', 'runXunjiCommand', 'verifyMovements'],
    );
  });

  it('8 条对外名齐：逐字对上、不重名、每条声明形状完整', () => {
    const list = mod.XUNJI_SUBCOMMANDS;
    assert.deepEqual(list.map((s) => s.name), EIGHT);
    assert.equal(new Set(list.map((s) => s.name)).size, 8);
    for (const s of list) {
      for (const f of ['name', 'does', 'usage', 'example', 'state']) {
        assert.equal(typeof s[f], 'string', s.name + ' 缺 ' + f);
        assert.ok(s[f].length > 0, s.name + ' 的 ' + f + ' 是空的');
      }
      assert.ok(Array.isArray(s.args) && s.args.length > 0, s.name + ' 没声明参数');
      assert.ok(Array.isArray(s.exits) && s.exits.length > 0, s.name + ' 没声明退出码');
      assert.ok(s.exits.every((c) => [0, 1, 2, 3, 4].includes(c)), s.name + ' 的退出码超出 0–4');
      assert.ok(s.usage.includes(s.name) || s.usage.startsWith('xunji ' + s.name), s.name + ' 的用法行没点自己的名');
    }
  });

  it('实现状态与归属票对得上：verify（#606）／upsert／push-plan（#607）／fetch／backfill（#608）已实现，其余三条逐条点名归属票', () => {
    const byName = Object.fromEntries(mod.XUNJI_SUBCOMMANDS.map((s) => [s.name, s]));
    for (const n of IMPLEMENTED) {
      assert.equal(byName[n].state, 'implemented', n);
      assert.equal(byName[n].ownerTicket, null, n);
    }
    const declared = mod.XUNJI_SUBCOMMANDS.filter((s) => s.state === 'declared').map((s) => s.name);
    assert.deepEqual(declared, EIGHT.filter((n) => !IMPLEMENTED.includes(n)));
    for (const [name, ticket] of Object.entries(OWNERS)) {
      assert.equal(byName[name].ownerTicket, ticket, name + ' 的归属票不对');
    }
  });

  it('动作库 1092 条可读（票面点名的快照读数；换快照时本行随票改）', () => {
    const read = mod.readMovementCatalog();
    assert.equal(read.loaded, true, String(read.reason));
    assert.equal(read.names.length, 1092, '件数=' + read.names.length);
    assert.equal(new Set(read.names).size, read.names.length);
    assert.ok(read.names.includes('杠铃深蹲'));
  });

  it('缺文件不抛错：读成「库缺失」，带路径的人话原因，空表', () => {
    const read = mod.readMovementCatalog(join(tmpdir(), 't606-no-such-catalog.json'));
    assert.equal(read.loaded, false);
    assert.deepEqual(read.names, []);
    assert.match(String(read.reason), /读不到/);
  });

  it('老形状兼容：只有 actions 键（缺 source／fetched_at／count）也读得通；坏形状不抛错', () => {
    const oldShape = tmp('old.json');
    writeFileSync(oldShape, JSON.stringify({ actions: ['杠铃深蹲', '平板卧推'] }));
    const read = mod.readMovementCatalog(oldShape);
    assert.equal(read.loaded, true, String(read.reason));
    assert.deepEqual(read.names, ['杠铃深蹲', '平板卧推']);
    const bad = tmp('bad.json');
    writeFileSync(bad, '{ 这不是 JSON');
    assert.equal(mod.readMovementCatalog(bad).loaded, false);
    writeFileSync(bad, JSON.stringify({ actions: '不是数组' }));
    assert.match(String(mod.readMovementCatalog(bad).reason), /形状不对/);
  });

  it('verify 真跑：命中退 0、不在库退 4 且给候选、库读不出退 1（不照抄老实现退 0）', () => {
    const hit = xunji('verify', '杠铃深蹲');
    assert.equal(hit.code, 0, hit.stderr);
    const hitJson = JSON.parse(hit.stdout);
    assert.equal(hitJson.catalog_loaded, true);
    assert.equal(hitJson.results[0].valid, true);
    assert.equal(hitJson.total, 1);

    const miss = xunji('verify', '深蹲');
    assert.equal(miss.code, 4, miss.stderr);
    const missJson = JSON.parse(miss.stdout);
    assert.equal(missJson.results[0].valid, false);
    assert.equal(missJson.invalid_count, 1);
    // 候选一族（老口径：含 2 字以上子串的库内动作名，最多 5 个）；suggestion＝其中第一个
    assert.ok(missJson.results[0].suggestions.length > 0, JSON.stringify(missJson.results[0]));
    assert.ok(missJson.results[0].suggestions.every((s) => s.includes('深蹲')));
    assert.equal(missJson.results[0].suggestion, missJson.results[0].suggestions[0]);

    const noCat = xunji('verify', '杠铃深蹲', '--catalog', join(tmpdir(), 't606-no-such-catalog.json'));
    assert.equal(noCat.code, 1, '库缺失必须退非 0：' + noCat.stdout);
    const noCatJson = JSON.parse(noCat.stdout);
    assert.equal(noCatJson.catalog_loaded, false);
    assert.equal(noCatJson.results[0].valid, null);
    assert.match(String(noCatJson.catalog_error), /读不到/);
  });

  it('verify 的显式覆盖：机器路径那份拿进来就按它算（默认仍是包内预置）', () => {
    const machineish = tmp('训记官方动作.json');
    writeFileSync(machineish, JSON.stringify({ actions: ['爬楼机'] }));
    const covered = xunji('verify', '爬楼机', '--catalog', machineish);
    assert.equal(covered.code, 0, covered.stderr);
    assert.equal(JSON.parse(covered.stdout).results[0].valid, true);
    // 不传就是包内预置：爬楼机不在官方库里
    const byDefault = xunji('verify', '爬楼机');
    assert.equal(byDefault.code, 4);
    assert.ok(mod.XUNJI_CATALOG.machine.endsWith(join('.minimax', '训记官方动作.json')), mod.XUNJI_CATALOG.machine);
    assert.ok(mod.XUNJI_CATALOG.preset.endsWith(join('src', 'xunji', 'data', '训记官方动作.json')), mod.XUNJI_CATALOG.preset);
  });

  it('声明要有牙：缺必填参数报用法错（不是「未实现」），未知参数／未知子命令也拦下', () => {
    const noDate = xunji('fetch');
    assert.equal(noDate.code, 1);
    assert.match(noDate.stderr, /缺参数：--date/);
    assert.match(noDate.stderr, /用法：xunji fetch/);

    const stray = xunji('verify', '--nope');
    assert.equal(stray.code, 1);
    assert.match(stray.stderr, /未知参数：--nope/);

    const unknown = xunji('没这条');
    assert.equal(unknown.code, 1);
    assert.match(unknown.stderr, /未知子命令：没这条/);

    const verifyNoName = xunji('verify');
    assert.equal(verifyNoName.code, 1);
    assert.match(verifyNoName.stderr, /缺参数：<动作名>/);
  });

  it('八条全实现：declared 为空，不再有“未实现”的明确拒绝', () => {
    const declared = mod.XUNJI_SUBCOMMANDS.filter((s) => s.state === 'declared').map((s) => s.name);
    assert.deepEqual(declared, []);
  });

  it('分派函数与命令行入口同一口径（runXunjiCommand 是门里那件；#607 起异步，调用方 await）', async () => {
    assert.equal((await mod.runXunjiCommand(['verify', '杠铃深蹲'])).code, 0);
    assert.equal((await mod.runXunjiCommand(['verify', '深蹲'])).code, 4);
    assert.equal((await mod.runXunjiCommand(['run-sync', '--days', '0'])).code, 1);
    assert.equal((await mod.runXunjiCommand([])).code, 1);
  });

  it('零深引：别的能力只用能力门，不深引模块内部件', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (p !== join(SRC, 'xunji')) walk(p);
          continue;
        }
        if (!e.name.endsWith('.ts')) continue;
        const text = readFileSync(p, 'utf8');
        if (/xunji\/(catalog|subcommands|run|cli)\.js/.test(text)) offenders.push(p.slice(SRC.length + 1));
      }
    };
    walk(SRC);
    assert.deepEqual(offenders, [], '这些件深引了训记模块内部件');
  });
});
