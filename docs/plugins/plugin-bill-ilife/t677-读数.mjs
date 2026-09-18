// #677 读数：设置页那几项值「保存后重启宿主仍然在」的三连读数。
//
// 三连 = 改前 / 改后 / 换一个新进程再读。
// 「新进程」就是宿主重启后要面对的局面：配置文件是唯一真相，值不在内存里、只在盘上。
//
// 走的是**已编译的插件宿主侧**（`packages/plugin-bill-ilife/dist/bridge.js`），
// 也就是面板按按钮时真正跑的那条路：RPC 端点的处理函数 → 技能 CLI 的三个配置 key。
// 不另写一套读写，也不 import 技能实现。
//
// 用法：
//   node docs/plugins/plugin-bill-ilife/t677-读数.mjs              # 真机口径（默认落点 ~/.ilife/）
//   node docs/plugins/plugin-bill-ilife/t677-读数.mjs --self-test  # 临时目录自证（CI/复跑用）
//
// 真机口径跑完会把改过的那一项**还原**，不留痕。
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const BRIDGE = join(REPO, 'packages', 'plugin-bill-ilife', 'dist', 'bridge.js');

/** 改哪一项：库文件名（最常用的一项，改了立刻看得见）。 */
const KEY = 'db.name';
const MARKER = 't677-reading.db';

const selfTest = process.argv.includes('--self-test');
const tmpDir = selfTest ? mkdtempSync(join(tmpdir(), 't677-read-')) : null;

try {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  if (tmpDir !== null) env.ILIFE_CONFIG_DIR = tmpDir;

  console.log('MODE=' + (selfTest ? 'self-test（临时目录 ' + tmpDir + '）' : '真机（默认落点）'));
  console.log('BRIDGE=' + BRIDGE);

  const before = inProcess(env, 'read');
  console.log('BEFORE: path=' + before.path + ' ' + KEY + '=' + JSON.stringify(before.values?.db?.name) + ' created=' + before.created);

  inProcess(env, 'write', MARKER);
  console.log('AFTER-SAVE: 写入 ' + KEY + '=' + JSON.stringify(MARKER));

  const onDisk = readFileSync(before.path, 'utf8');
  console.log('ON-DISK-HAS-MARKER: ' + String(onDisk.includes(MARKER)));

  // 读数三：开一个全新进程再读（宿主重启后的局面）。
  const fresh = spawnSync(
    process.execPath,
    ['--input-type=module', '-e',
      `const m = await import(${JSON.stringify('file:///' + BRIDGE.replace(/\\/g, '/'))});`
      + `const s = m.readConfigSurface();`
      + `console.log('FRESH ' + JSON.stringify({ path: s.path, name: s.values?.db?.name, created: s.created }));`],
    { encoding: 'utf8', env },
  );
  const freshLine = String(fresh.stdout ?? '').trim().split('\n').filter((l) => l.startsWith('FRESH ')).pop();
  if (fresh.status !== 0 || freshLine === undefined) {
    console.log('AFTER-RESTART: 新进程读取失败 exit=' + fresh.status);
    console.log('AFTER-RESTART-STDERR: ' + String(fresh.stderr ?? '').trim().split('\n').slice(-3).join(' | '));
    console.log('RESULT: FAIL');
    process.exitCode = 1;
  } else {
    const got = JSON.parse(freshLine.slice('FRESH '.length));
    console.log('AFTER-RESTART: 新进程读到 ' + KEY + '=' + JSON.stringify(got.name) + '（created=' + got.created + '）');

    // 还原（真机口径不留痕；self-test 用完整个临时目录删掉）。
    inProcess(env, 'write', selfTest ? 'biscuit_accountant.db' : String(before.values?.db?.name ?? ''));
    const restored = inProcess(env, 'read');
    console.log('RESTORED: ' + KEY + '=' + JSON.stringify(restored.values?.db?.name));

    const ok = got.name === MARKER && existsSync(before.path) && onDisk.includes(MARKER);
    console.log('RESULT: ' + (ok ? 'PASS' : 'FAIL') + '（改前有值 / 改后落盘 / 新进程仍在）');
    process.exitCode = ok ? 0 : 1;
  }
} finally {
  if (tmpDir !== null) rmSync(tmpDir, { recursive: true, force: true });
}

/** 在子进程里跑一次宿主侧实现（隔离到「一个新进程」，与读数三同语义）。 */
function inProcess(env, action, value) {
  const script =
    `const m = await import(${JSON.stringify('file:///' + BRIDGE.replace(/\\/g, '/'))});`
    + (action === 'read'
      ? `console.log('OUT ' + JSON.stringify(m.readConfigSurface()));`
      : `const s = m.readConfigSurface();`
        + `s.values.db = { ...s.values.db, name: ${JSON.stringify(value)} };`
        + `m.writeConfigValues(s.values);`
        + `console.log('OUT ' + JSON.stringify({ path: s.path }));`);
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env });
  const line = String(r.stdout ?? '').trim().split('\n').filter((l) => l.startsWith('OUT ')).pop();
  if (r.status !== 0 || line === undefined) {
    console.log('STEP-FAILED (' + action + '): exit=' + r.status);
    console.log('STDERR: ' + String(r.stderr ?? '').trim().split('\n').slice(-3).join(' | '));
    process.exit(1);
  }
  return JSON.parse(line.slice('OUT '.length));
}
