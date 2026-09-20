// 票 #744 · 本机「根」清单（Windows 盘符那一行）的宿主半自证回路。
//
// 咬四件事，都不咬写法：
//   ① 解析是纯函数：真机输出的形状解析得出来，认不出的行丢掉、绝不抛；
//   ② 平台闸：非 Windows 直接回空（那边的根就是 `/`，图上没有这一行可画）；
//   ③ 失败即空：命令超时／报错／输出是废话，一律空清单——**永不抛**，界面据此只是不画那一行；
//   ④ 缓存：短时间连问两次只跑一次命令（开图会反复问，盘符却几乎不变）。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clearRootsCache, listRoots, parseDriveRows, rootsReply } from '../dist/index.js';
import { MANAGER_ACTIONS } from '../dist/update-contract.js';

/** 真机那一行的输出（`[IO.DriveInfo]::GetDrives() | % { $_.Name + "|" + $_.DriveType }`）。 */
const REAL_OUTPUT = ['C:\\|Fixed', 'D:\\|Fixed', 'E:\\|Fixed', ''].join('\r\n');

/** 一个可注入的取数环境：记下跑过几次命令，平台与时间自定。 */
function deps(overrides = {}) {
  const calls = [];
  return {
    calls,
    platform: 'win32',
    now: () => 0,
    async run(command) {
      calls.push(command);
      return REAL_OUTPUT;
    },
    ...overrides,
  };
}

describe('#744 本机根清单（宿主半）', () => {
  it('解析真机输出：每行 `<盘符>|<类型>` → 根，类型映射进闭集', () => {
    assert.deepEqual(parseDriveRows(REAL_OUTPUT), [
      { path: 'C:\\', kind: 'fixed' },
      { path: 'D:\\', kind: 'fixed' },
      { path: 'E:\\', kind: 'fixed' },
    ]);
    const mixed = parseDriveRows(['C:\\|Fixed', 'Z:\\|Network', 'F:\\|Removable', 'G:\\|CDRom', 'H:\\|Ram', 'I:\\|Whatever'].join('\n'));
    assert.deepEqual(mixed.map((r) => r.kind), ['fixed', 'network', 'removable', 'optical', 'other', 'other']);
  });

  it('解析认不出的行：跳过、不抛；同一个盘只留第一次', () => {
    assert.deepEqual(parseDriveRows(''), []);
    assert.deepEqual(parseDriveRows('驱动器: C:\\ D:\\\n'), [], '本地化的 fsutil 那种整行不是本函数认的形状');
    assert.deepEqual(parseDriveRows('C:\\|Fixed\nC:\\|Fixed\n'), [{ path: 'C:\\', kind: 'fixed' }]);
    assert.deepEqual(parseDriveRows('  d:|fixed \n'), [{ path: 'D:\\', kind: 'fixed' }], '小写与空白照收，盘符归一成大写');
  });

  it('非 Windows：不问系统，直接空清单', async () => {
    for (const platform of ['darwin', 'linux', 'freebsd']) {
      const env = deps({ platform });
      assert.deepEqual(await listRoots(env), [], platform + ' 上不该有盘符那一行');
      assert.deepEqual(env.calls, [], platform + ' 上不该跑命令');
    }
  });

  it('失败即空：命令超时／报错／输出是废话都不能抛', async () => {
    clearRootsCache();
    const boom = deps({ run: async () => { throw new Error('ETIMEDOUT'); } });
    assert.deepEqual(await listRoots(boom), []);
    clearRootsCache();
    const garbage = deps({ run: async () => 'powershell: 不是命令\n' });
    assert.deepEqual(await listRoots(garbage), []);
  });

  it('缓存：连着问两次只跑一次命令', async () => {
    clearRootsCache();
    let clock = 0;
    const env = deps({ now: () => clock });
    assert.equal((await listRoots(env)).length, 3);
    clock = 1_000;
    assert.equal((await listRoots(env)).length, 3);
    assert.equal(env.calls.length, 1, '一分钟内不该再问一次');
    clock = 10 * 60_000;
    assert.equal((await listRoots(env)).length, 3);
    assert.equal(env.calls.length, 2, '过了缓存期要重问');
    clearRootsCache();
  });

  it('回包恒成功（列不出来是空清单，不是错误码）', async () => {
    clearRootsCache();
    const reply = await rootsReply(deps());
    assert.equal(reply.ok, true);
    assert.deepEqual(reply.value.roots.map((r) => r.path), ['C:\\', 'D:\\', 'E:\\']);
    clearRootsCache();
  });

  it('电话名在总管那张表上（面板照这个名字问）', () => {
    assert.equal(MANAGER_ACTIONS.roots, 'ilife-manager.roots');
  });
});
