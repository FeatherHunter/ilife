#!/usr/bin/env node
/** #979 · 产物面核验：逐家跑**真出口**落一份 HELP，在产物里查「关于」页的两条联系地址。
 *
 * 判据（每条都打出机器读数）：
 *  ① 产物里**有** `https://github.com/FeatherHunter/ilife`（GitHub）与 `…/ilife/issues`（Issues）；
 *  ② 产物里**没有**旧地址 `https://github.com/FeatherHunter/SKILLS`；
 *  ③ 产物可打开（`<!DOCTYPE html>` 头在场、非空）。
 * 用法：node docs/agents/t979-联系地址-核验.mjs [--keep]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = process.cwd();
const NEW = 'https://github.com/FeatherHunter/ilife';
const OLD = 'https://github.com/FeatherHunter/SKILLS';

/** 六家：CLI 入口 ＋ HELP 那条 key（跑缺省交付，落一份 HELP 文件）。 */
const SKILLS = [
  ['skill-schedule', 'schedule.help.lookup'],
  ['skill-calorie', 'calorie.help.center'],
  ['skill-bill', 'bill.help.lookup'],
  ['skill-memo-ilife', 'memo.help.lookup'],
  ['skill-home', 'home.help.lookup'],
  ['skill-chef', 'chef.help.lookup'],
];

const reds = [];
for (const [pkg, key] of SKILLS) {
  const bin = resolve(REPO, 'packages', pkg, 'dist', 'cli', 'cmd_read.js');
  if (!existsSync(bin)) { reds.push(pkg + '：没编译（缺 ' + bin + '）'); continue; }
  const home = mkdtempSync(join(tmpdir(), 't979-' + pkg + '-'));
  let html = '';
  try {
    const r = spawnSync(process.execPath, [bin, key], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, USERPROFILE: home, HOME: home, HOMEDRIVE: home.slice(0, 2), HOMEPATH: home.slice(2) },
    });
    if (r.status !== 0) { reds.push(pkg + '：真出口非 0（' + r.status + '）' + String(r.stderr).slice(0, 200)); continue; }
    let env;
    try { env = JSON.parse(r.stdout); } catch { reds.push(pkg + '：stdout 不是 JSON'); continue; }
    const path = env?.delivery?.path || env?.env?.delivery?.path || '';
    if (!path || !existsSync(path)) { reds.push(pkg + '：回执没给可打开的 delivery.path（' + path + '）'); continue; }
    html = readFileSync(path, 'utf8');
    const size = statSync(path).size;
    const hasNew = html.includes(NEW) && html.includes(NEW + '/issues');
    const hasOld = html.includes(OLD);
    if (!/^<!DOCTYPE html>/i.test(html.slice(0, 40).replace(/^\uFEFF/, ''))) reds.push(pkg + '：产物不像 HTML 文档');
    if (!hasNew) reds.push(pkg + '：产物里没有新地址（GitHub／Issues 两条都要在）');
    if (hasOld) reds.push(pkg + '：产物里仍有旧地址 ' + OLD);
    console.log((hasNew && !hasOld ? 'PASS ' : 'FAIL ') + pkg.padEnd(17)
      + ' 产物 ' + size + ' 字节｜新地址在场=' + hasNew + '｜旧地址在场=' + hasOld);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
console.log('RESULT: ' + (reds.length === 0 ? 'PASS 6/6' : 'FAIL ' + reds.length + ' 条红'));
for (const red of reds) console.log('  ✗ ' + red);
process.exit(reds.length === 0 ? 0 : 1);
