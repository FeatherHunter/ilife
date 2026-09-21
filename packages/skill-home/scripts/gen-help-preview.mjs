#!/usr/bin/env node
// #800 · 一次性：隔离家目录下落一份居家 HELP HTML（只读 HELP 键，不开库不写真实家目录），
// 拷到 .scratch 供交付。用法（仓根）：node packages/skill-home/scripts/gen-help-preview.mjs
import { spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(pkgDir, 'dist', 'cli', 'cmd_read.js');
const home = mkdtempSync(join(tmpdir(), 'home-help-'));
const r = spawnSync(process.execPath, [bin, 'home.help.lookup'], {
  encoding: 'utf8',
  env: { ...process.env, USERPROFILE: home, HOME: home },
});
if (r.status !== 0) {
  console.error(r.stderr);
  throw new Error('HELP 生成失败 exit=' + r.status);
}
const env = JSON.parse(r.stdout);
const src = env.delivery.path;
const dst = join('D:/ilife/.scratch', '居家管家_HELP_预览.html');
copyFileSync(src, dst);
const st = statSync(dst);
console.log('HELP 已落盘：' + dst + '（' + st.size + ' 字节，回执 ' + env.delivery.bytes + ' 字节）');
