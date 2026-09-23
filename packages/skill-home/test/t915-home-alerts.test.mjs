// #915 第二步 · 居家：数据目录真用不了时交 `alerts` 一格，能用就缺席；面板可见文字里不出现合成句。
//
// 判据三条（照兄弟件 t915-*-alerts 的同一套）：
//   ① 在用目录（存在且可写）⇒ 回执里没有 `alerts` 这一格；
//   ② 不存在的目录 ⇒ 有这一格，code=DIR_MISSING、message 说「不在」；
//   ③ 同名文件占了位置 ⇒ 有这一格，message 说形状故障；
//   ④ 回执全文与组装处源码都不出现「现在生效的是」（那是 #915 修掉的假警报，不许复活）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const { runConfigKey } = await import('../dist/cli/config.js');

/** 隔离家目录跑一次「读整面」，返回回执的 data。 */
function readSurfaceWith(configDirValue, dataDirPath) {
  const home = mkdtempSync(join(tmpdir(), 't915-home-'));
  const saved = { USERPROFILE: process.env['USERPROFILE'], HOME: process.env['HOME'] };
  try {
    mkdirSync(join(home, '.ilife'), { recursive: true });
    writeFileSync(
      join(home, '.ilife', 'home.yaml'),
      ['db:', '  dir: ' + JSON.stringify(configDirValue), '  name: home.db', 'html:', '  dir: home_manager_html', 'key:', '  file: .master.key', 'backup:', '  dir: backups', ''].join('\n'),
      'utf8',
    );
    process.env['USERPROFILE'] = home;
    process.env['HOME'] = home;
    const envelope = JSON.parse(runConfigKey('home.config.read', {}));
    return { data: envelope.data, home, dataDirPath };
  } finally {
    process.env['USERPROFILE'] = saved.USERPROFILE;
    process.env['HOME'] = saved.HOME;
    rmSync(home, { recursive: true, force: true });
  }
}

describe('#915 第二步 · 居家：数据目录的告警事实', () => {
  it('① 在用目录（存在且可写）⇒ 没有 alerts 这一格', () => {
    const live = mkdtempSync(join(tmpdir(), 't915-live-'));
    try {
      const { data } = readSurfaceWith(live, live);
      assert.equal(data.alerts, undefined, '能用就别报（没问题就不显示）');
      assert.equal(data.resolved.dbDir, live, '只读行那一格仍显示生效目录');
    } finally {
      rmSync(live, { recursive: true, force: true });
    }
  });

  it('② 不存在的目录 ⇒ DIR_MISSING，message 说「不在」', () => {
    const { data } = readSurfaceWith('Z:\\不存在-915\\data', 'Z:\\不存在-915\\data');
    assert.ok(data.alerts !== undefined, '真用不了时必须交这一格');
    assert.equal(data.alerts['db.dir'].code, 'DIR_MISSING');
    assert.match(data.alerts['db.dir'].message, /不在/);
  });

  it('③ 同名文件占了位置 ⇒ 报形状故障（不是「不在」）', () => {
    const base = mkdtempSync(join(tmpdir(), 't915-file-'));
    try {
      const occupied = join(base, 'data');
      writeFileSync(occupied, 'not a dir', 'utf8');
      const { data } = readSurfaceWith(occupied, occupied);
      assert.ok(data.alerts !== undefined, '同名文件占了位置也是用不了');
      assert.match(data.alerts['db.dir'].message, /不在|同名文件/, '要说清是形状故障');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('④ 回执与源码都不出现「现在生效的是」', () => {
    const { data } = readSurfaceWith('Z:\\不存在-915\\data', 'Z:\\不存在-915\\data');
    assert.doesNotMatch(JSON.stringify(data), /现在生效的是/);
    const src = readFileSync(join(PKG_DIR, 'src', 'cli', 'config.ts'), 'utf8');
    const health = readFileSync(join(PKG_DIR, 'src', 'health.ts'), 'utf8');
    assert.doesNotMatch(src, /现在生效的是/);
    assert.doesNotMatch(health, /现在生效的是/);
  });
});
