#!/usr/bin/env node
/**
 * #694 公共层配置件：三种情形的读数（#694 验收三句话）。
 *
 *   读数1 改配置 → 下次读得到（真起子进程读盘，不是同进程重读）
 *   读数2 删文件 → 回到默认
 *   读数3 改坏一行 → 报错带行号且不崩
 *
 * 只在系统临时目录里落文件（`ILIFE_CONFIG_DIR` 指向它），不碰仓库、不碰真实家目录。
 * 跑法：`node docs/base/base-link-core/t694-读数.mjs`（需先 `tsc -b packages/base-link-core`）。
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const DIST = pathToFileURL(join(ROOT, 'packages', 'base-link-core', 'dist', 'index.js')).href;
const { ConfigError, configPaths, loadConfig, saveConfig } = await import(DIST);

const DEFAULTS = {
  db: { dir: '~/.ilife/data', name: 'calorie_data.db' },
  html: { dir: 'calorie_html' },
};

const dir = mkdtempSync(join(tmpdir(), 'ilife-t694-'));
process.env.ILIFE_CONFIG_DIR = dir;
const configFile = configPaths('calorie').configFile;

/** 子进程读一次盘（证明「下次读得到」不是同进程的缓存）。 */
function readInChild() {
  const code = 'const m = await import(' + JSON.stringify(DIST) + ');'
    + ' console.log(JSON.stringify(m.loadConfig("calorie", ' + JSON.stringify(DEFAULTS) + ').values));';
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' }));
}

const lines = [];
let pass = 0;
const record = (name, ok, detail) => {
  if (ok) pass += 1;
  lines.push(name + '：' + (ok ? 'PASS' : 'FAIL') + ' ' + detail);
};

try {
  // 读数1：文件不存在先落一份默认 → 改两项 → 子进程读回
  const first = loadConfig('calorie', DEFAULTS);
  saveConfig('calorie', DEFAULTS, { db: { name: 'calorie_prod.db' }, html: { dir: 'calorie_html_2' } });
  const next = readInChild();
  record('读数1 改配置→下次读得到',
    first.created === true && next.db.name === 'calorie_prod.db' && next.html.dir === 'calorie_html_2',
    '（首读 created=' + String(first.created) + '；子进程读回 db.name=' + next.db.name + '，html.dir=' + next.html.dir + '）');

  // 读数2：删掉文件 → 回默认，且再落一份
  unlinkSync(configFile);
  const afterDelete = readInChild();
  record('读数2 删文件→回到默认',
    afterDelete.db.name === DEFAULTS.db.name && JSON.stringify(afterDelete) === JSON.stringify(DEFAULTS),
    '（删后子进程读回 db.name=' + afterDelete.db.name + '，与默认值逐项相同=' + String(JSON.stringify(afterDelete) === JSON.stringify(DEFAULTS)) + '）');

  // 读数3：改坏一行 → 报错带行号且不崩（修回去后同一进程照常）
  writeFileSync(configFile, 'db:\n  name: a.db\nhtml:\n\tdir: 制表符缩进\n', 'utf8');
  let caught = null;
  try { loadConfig('calorie', DEFAULTS); } catch (err) { caught = err; }
  const hasLine = caught instanceof ConfigError && caught.line === 4 && /第 4 行/.test(caught.message);
  writeFileSync(configFile, 'db:\n  name: b.db\n', 'utf8');
  const recovered = loadConfig('calorie', DEFAULTS);
  record('读数3 改坏一行→报错带行号且不崩',
    hasLine && recovered.values.db.name === 'b.db',
    '（code=' + (caught === null ? '未抛错' : caught.code) + '，line=' + String(caught === null ? '无' : caught.line)
    + '；报文＝' + (caught === null ? '无' : caught.message) + '；修回后同进程仍读到 db.name=' + recovered.values.db.name + '）');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

for (const line of lines) console.log(line);
console.log('RESULT: ' + pass + '/' + lines.length + ' PASS（临时配置目录已清掉：' + dir + '）');
if (pass !== lines.length) process.exit(1);
