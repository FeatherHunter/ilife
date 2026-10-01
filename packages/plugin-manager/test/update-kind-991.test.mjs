// 票 #991 自证回路：宿主种类不许经 readerOverrides 回传＋自家读数照吃新 kind（全用替身与临时盘，不碰真机）。
//
// 咬三件事：
//   ① 建电话处不再向更新包传 `environmentKind`（传了会把它的自动探测挡死，官方桌面升级
//      配方冻成 cli-process——0.2.0 README 明令禁传）；
//   ② 本地探测与更新包同源（`detectEnvironmentKind(ctx, profileName)`，范围名参与判定）；
//   ③ 自家读数照吃 `'desktop-manager'`：kind 原样进快照事实，不崩、不误判，能装即 eligible。
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTargetEnvironment } from '../dist/update-env.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOST = readFileSync(join(HERE, '..', 'src', 'update-host.ts'), 'utf8');
const SHIM = readFileSync(join(HERE, '..', 'src', 'dsh-plugin-update.d.ts'), 'utf8');

/** 临时范围：一家"已装且与运行同版"的假包（registry 精确写法，非源码安装）。 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 't991-'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'dsh-profile-t991', version: '1.0.0', dependencies: { 'dsh-t991-fake': '0.3.21' } }),
  );
  const pkg = join(root, 'node_modules', 'dsh-t991-fake');
  mkdirSync(join(pkg, 'dist'), { recursive: true });
  writeFileSync(
    join(pkg, 'package.json'),
    JSON.stringify({
      name: 'dsh-t991-fake',
      version: '0.3.21',
      main: './dist/index.js',
      exports: { './client': './dist/client.js' },
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }),
  );
  writeFileSync(join(pkg, 'dist', 'index.js'), 'export default 1;\n');
  writeFileSync(join(pkg, 'dist', 'client.js'), 'export default 1;\n');
  writeFileSync(join(pkg, 'cordis.patch.yml'), 'patch: true\n');
  return root;
}

describe('#991 kind 不回传（源码断言）', () => {
  it('readerOverrides 里没有 environmentKind（传了即红）', () => {
    const start = HOST.indexOf('readerOverrides: {');
    assert.notEqual(start, -1, '建电话处应有 readerOverrides');
    const end = HOST.indexOf('readInstalled: () =>', start);
    // 注释里提及不算：去注释后再断言（警示注记本身必须留着）。
    const block = HOST.slice(start, end).replace(/\/\/[^\n]*/g, '');
    assert.doesNotMatch(block, /environmentKind/, 'readerOverrides 块内不许出现 environmentKind 属性');
  });

  it('本地探测带范围名（与更新包自判同源）', () => {
    assert.match(HOST, /detectEnvironmentKind\(ctx, profileName\)/, '建表即用带范围名的探测');
    assert.match(
      SHIM,
      /detectEnvironmentKind\(ctx: unknown, profileName\?: string \| null\): EnvironmentKind;/,
      '类型声明带范围名入参',
    );
  });
});

describe('#991 自家读数照吃 desktop-manager', () => {
  it('kind 原样进事实：能装即 eligible，不误判', async () => {
    const profileDir = fixture();
    const view = await readTargetEnvironment('dsh-t991-fake', {
      profileDir,
      profileName: 'desktop',
      runningVersion: '0.3.21',
      environmentKind: 'desktop-manager',
      pluginId: 'dsh-life-pack-t991',
    });
    assert.equal(view.environmentKind, 'desktop-manager', 'kind 必须原样进快照事实');
    assert.equal(view.installedVersion, '0.3.21');
    assert.equal(view.blockedReason, null);
    assert.equal(view.eligible, true, '装齐且同版即能装，不因 kind 是新值误判');
  });
});
