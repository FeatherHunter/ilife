#!/usr/bin/env node
/**
 * 票 #696 真机三连读数：改前／改后／**新进程再读**（＝宿主重启后要面对的局面）。
 *
 * 走的就是面板按按钮时那条路：插件宿主侧 `dist/bridge.js` → 技能 CLI 的三个配置 key → 盘上 YAML。
 * 「新进程再读」用 `spawnSync(node, ['-e', …])` 起一个**全新 node 进程**再 import 同一个 bridge 读一次——
 * 配置文件的「保存即生效」靠下一次调用现读，值不在内存里、只在盘上，这条读数就是对它的检验。
 *
 * 两种口径：
 *   · 默认＝**真机**（`~/.ilife/<件名>.yaml`，`ILIFE_CONFIG_DIR` 未设）；跑完把改过的那一项**还原**，不留痕；
 *   · `--self-test`＝临时目录（自己设 `ILIFE_CONFIG_DIR`），不碰家目录。
 *
 * 用法：
 *   node docs/plugins/plugin-chef/t696-读数.mjs                # 四家全跑（真机口径）
 *   node docs/plugins/plugin-chef/t696-读数.mjs --panels plugin-chef
 *   node docs/plugins/plugin-chef/t696-读数.mjs --self-test
 * 末行打 `RESULT: PASS|FAIL n/m`；有任何一家不 PASS 即 exit 1。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PANELS = [
  { pkg: 'plugin-chef', stem: 'chef', key: 'db.name' },
  { pkg: 'plugin-home-ilife', stem: 'home', key: 'db.name' },
  { pkg: 'plugin-memo-ilife', stem: 'memo', key: 'db.name' },
  { pkg: 'plugin-schedule-ilife', stem: 'schedule', key: 'db.name' },
];
const only = argOf('--panels', '');
const SELECTED = only === '' ? PANELS : PANELS.filter((p) => only.split(',').map((s) => s.trim()).includes(p.pkg));
const SELF_TEST = argv.includes('--self-test');

let temp = null;
if (SELF_TEST) {
  temp = mkdtempSync(join(tmpdir(), 'ilife-t696-读数-'));
  process.env.ILIFE_CONFIG_DIR = temp;
}

/** 「新进程再读」：全新 node 进程 import 同一个 bridge，读回这一项。 */
function readInFreshProcess(pkg, key) {
  const bridge = join(REPO, 'packages', pkg, 'dist', 'bridge.js');
  const code = [
    `import(${JSON.stringify('file:///' + bridge.replace(/\\/g, '/'))}).then((m) => {`,
    `  const s = m.readConfigSurface();`,
    `  const parts = ${JSON.stringify(key)}.split('.');`,
    `  let cur = s.values; for (const p of parts) cur = cur == null ? undefined : cur[p];`,
    `  process.stdout.write(JSON.stringify({ value: cur, path: s.path }) + '\\n');`,
    `});`,
  ].join('\n');
  const r = spawnSync(process.execPath, ['-e', code], { encoding: 'utf8', env: process.env });
  if (r.status !== 0) throw new Error('新进程读失败（exit ' + String(r.status) + '）：' + String(r.stderr || '').trim());
  return JSON.parse(String(r.stdout).trim());
}

async function runOne(panel) {
  const bridge = await import('file:///' + join(REPO, 'packages', panel.pkg, 'dist', 'bridge.js').replace(/\\/g, '/'));
  const before = bridge.readConfigSurface();
  const original = (() => {
    let cur = before.values;
    for (const p of panel.key.split('.')) cur = cur == null ? undefined : cur[p];
    return cur;
  })();
  const probe = 't696-' + panel.stem + '-probe.db';
  const next = {};
  const parts = panel.key.split('.');
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i++) { cursor[parts[i]] = {}; cursor = cursor[parts[i]]; }
  cursor[parts[parts.length - 1]] = probe;

  bridge.writeConfigValues(next);
  const onDisk = readFileSync(before.path, 'utf8');
  const afterRestart = readInFreshProcess(panel.pkg, panel.key);

  // 还原：把原值写回去，跑完不留痕。
  const restore = {};
  let rc = restore;
  for (let i = 0; i < parts.length - 1; i++) { rc[parts[i]] = {}; rc = rc[parts[i]]; }
  rc[parts[parts.length - 1]] = original === undefined ? '' : original;
  bridge.writeConfigValues(restore);
  const restored = bridge.readConfigSurface();
  const restoredValue = (() => {
    let cur = restored.values;
    for (const p of panel.key.split('.')) cur = cur == null ? undefined : cur[p];
    return cur;
  })();

  const ok = onDisk.includes(probe) && afterRestart.value === probe && restoredValue === original;
  console.log(
    (ok ? 'PASS ' : 'FAIL ') + panel.pkg
    + ' 改前=' + JSON.stringify(original) + ' 改后落盘=' + String(onDisk.includes(probe))
    + ' 新进程再读=' + JSON.stringify(afterRestart.value) + ' 还原=' + JSON.stringify(restoredValue)
    + ' 文件=' + before.path,
  );
  return { ok, path: before.path };
}

const results = [];
for (const panel of SELECTED) {
  if (!existsSync(join(REPO, 'packages', panel.pkg, 'dist', 'bridge.js'))) {
    console.log('SKIP ' + panel.pkg + '（dist/bridge.js 不在，先编译该包）');
    results.push({ ok: false });
    continue;
  }
  try {
    results.push(await runOne(panel));
  } catch (e) {
    console.log('FAIL ' + panel.pkg + ' ' + (e instanceof Error ? e.message : String(e)));
    results.push({ ok: false });
  }
}
const pass = results.filter((r) => r.ok).length;
console.log('MODE=' + (SELF_TEST ? '自检（临时配置目录 ' + temp + '）' : '真机（默认落点 ~/.ilife）'));
console.log('RESULT: ' + (pass === results.length ? 'PASS' : 'FAIL') + ' ' + pass + '/' + results.length);
if (temp) rmSync(temp, { recursive: true, force: true });
process.exit(pass === results.length ? 0 : 1);
