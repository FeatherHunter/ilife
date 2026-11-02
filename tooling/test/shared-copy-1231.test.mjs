/**
 * tooling/gen-shared-copy.mjs 的靶向测试（#1231 跨包重复串的单一来源）。
 *
 * 跑法：node --test tooling/test/shared-copy-1231.test.mjs
 *
 * 它守四件事：① 盘上 21 份产物 ≡ 来源表派生出的样子（漂移一定红，且红在漂开的那一份上）；
 * ② 每份表的生成段里，归它管的 key 恰一条、值与来源表逐字节相同、段位紧贴表尾；
 * ③ 七份通道名副本取自同一格（六家契约件与总管导航表不再各写一份）；
 * ④ 拼接器的坏输入直接抛（CRLF／缺表尾／标记只剩一半／表尾后有内容），且重跑幂等。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LANGS, MARK_BEGIN, MARK_END, TABLE_END,
  entryLine, loadSharedCopy, plan, sharedEntries, spliceTable,
} from '../gen-shared-copy.mjs';

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const table = loadSharedCopy();
const pkgs = [...table.plugins, { dir: table.manager.dir }];
const entriesFile = (dir, lang) => 'packages/' + dir + '/src/entries/' + lang + '.ts';
const genFile = (dir) => 'packages/' + dir + '/src/shared-copy.generated.ts';

describe('#1231 共享串：盘上产物', () => {
  it('21 份产物都与来源表派生的样子逐字节一致（漂移即红）', () => {
    const files = plan(table, repoRoot);
    assert.equal(files.length, LANGS.length * pkgs.length + pkgs.length, '产物份数应为 14 词条表 + 7 generated.ts');
    for (const f of files) {
      assert.equal(f.current, f.next, f.file + ' 与来源表对不上——跑 node tooling/gen-shared-copy.mjs 重生成，别手改生成段');
    }
  });

  it('--check 子进程 exit 0 且打印 PASS（生成器自己那条门）', () => {
    const r = spawnSync(process.execPath, [path.join(repoRoot, 'tooling', 'gen-shared-copy.mjs'), '--check'], { cwd: repoRoot, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS/);
  });

  it('每份表的生成段：紧贴表尾、值与来源表逐字节相同、归它管的 key 恰一条', () => {
    for (const pkg of pkgs) for (const lang of LANGS) {
      const rel = entriesFile(pkg.dir, lang);
      const text = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
      const pairs = sharedEntries(table, pkg)[lang];
      const lines = text.split(LF);
      const b = lines.indexOf(MARK_BEGIN);
      const e = lines.indexOf(MARK_END);
      assert.ok(b >= 0 && e > b, rel + ' 缺生成段（起点 ' + b + '／终点 ' + e + '）');
      assert.deepEqual(lines.slice(b + 1, e), pairs.map(([k, v]) => entryLine(k, v)), rel + ' 生成段的值与来源表不一致');
      assert.equal(lines[e + 1], TABLE_END, rel + ' 生成段没有紧贴表尾');
      for (const [k] of pairs) {
        const hits = text.split("  '" + k + "':").length - 1;
        assert.equal(hits, 1, rel + ' 里 ' + k + ' 应恰好一条（手写副本没摘净？）');
      }
    }
  });
});

describe('#1231 共享串：漂移一定被看见', () => {
  const copy = (root, rel) => {
    const dest = path.join(root, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, rel), dest);
  };
  const stage = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilife-shared-copy-'));
    for (const pkg of pkgs) {
      for (const lang of LANGS) copy(dir, entriesFile(pkg.dir, lang));
      copy(dir, genFile(pkg.dir));
    }
    return dir;
  };
  const drifted = (root, t = table) => plan(t, root).filter((f) => f.current !== f.next).map((f) => f.file).sort();

  it('只改来源表一个值、盘上不动：分寸不差地红在七份 zh 词条表上', () => {
    const dir = stage();
    try {
      const mutated = JSON.parse(JSON.stringify(table));
      mutated.shared.advancedGroupTitle.zh = '进阶';
      const expect = pkgs.map((pkg) => entriesFile(pkg.dir, 'zh')).sort();
      assert.deepEqual(drifted(dir, mutated), expect);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it('只手工改盘上一行生成词条：红在那一份文件上', () => {
    const dir = stage();
    try {
      const rel = entriesFile(table.plugins[0].dir, 'zh');
      const full = path.join(dir, rel);
      const key = table.plugins[0].entriesKeys.slot;
      const text = fs.readFileSync(full, 'utf8');
      fs.writeFileSync(full, text.replace("  '" + key + "':", "  '" + key + "': \"手改\", //"));
      assert.deepEqual(drifted(dir), [rel].sort());
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('#1231 共享串：七份通道名副本同源', () => {
  it('六家契约件的 RPC_CHANNEL 与总管导航表的 PLUGIN_CHANNELS 都逐字等于来源表那一格', () => {
    assert.equal(new Set(table.plugins.map((q) => q.channel)).size, table.plugins.length, '来源表里通道名不许重复');
    for (const q of table.plugins) {
      assert.match(q.channel, /^\/[A-Za-z0-9._~-]+$/, q.dir + ' 的通道名不是单段路由名：' + q.channel);
      const ts = fs.readFileSync(path.join(repoRoot, genFile(q.dir)), 'utf8');
      const line = 'export const RPC_CHANNEL = ' + "'" + q.channel + "'" + ' as const;';
      assert.equal(ts.split(line).length - 1, 1, genFile(q.dir) + ' 里找不到唯一一行 ' + line);
    }
    const mgr = fs.readFileSync(path.join(repoRoot, genFile(table.manager.dir)), 'utf8');
    assert.match(mgr, /export const PLUGIN_CHANNELS = \{/);
    for (const q of table.plugins) {
      const row = '  ' + q.skill + ": '" + q.channel + "',";
      assert.equal(mgr.split(row).length - 1, 1, genFile(table.manager.dir) + ' 里找不到唯一一行 ' + row);
    }
  });

  it('手写副本已退场：六家契约件只剩再导出，总管导航表不再写通道字面量', () => {
    for (const q of table.plugins) {
      const contract = fs.readFileSync(path.join(repoRoot, 'packages', q.dir, 'src', 'contract.ts'), 'utf8');
      assert.match(contract, /export \{ RPC_CHANNEL \} from '\.\/shared-copy\.generated\.js';/, q.dir + '/src/contract.ts 没有改成再导出');
    }
    const nav = fs.readFileSync(path.join(repoRoot, 'packages', table.manager.dir, 'src', 'nav.ts'), 'utf8');
    assert.match(nav, /import \{ PLUGIN_CHANNELS \} from '\.\/shared-copy\.generated\.js';/);
    for (const q of table.plugins) {
      assert.ok(!nav.includes("'" + q.channel + "'"), 'packages/' + table.manager.dir + '/src/nav.ts 里还留着写死的通道名 ' + q.channel);
    }
  });
});

describe('#1231 共享串：拼接器的坏输入直接抛', () => {
  const good = ['export const zh = {', "  'a.b.c001': \"旧\",", TABLE_END, ''].join(LF);

  it('正常拼接：旧手写行摘掉、生成段贴表尾、重跑幂等', () => {
    const one = spliceTable(good, [['a.b.c001', '新']], 'fixture');
    assert.equal(one.removed.length, 1);
    assert.equal(one.removed[0].key, 'a.b.c001');
    const lines = one.next.split(LF);
    assert.equal(lines[lines.indexOf(MARK_END) + 1], TABLE_END);
    assert.equal(one.next.split("  'a.b.c001':").length - 1, 1);
    assert.equal(spliceTable(one.next, [['a.b.c001', '新']], 'fixture').next, one.next);
  });

  it('CRLF 直接拒绝（生成器不替谁改行尾）', () => {
    assert.throws(() => spliceTable(good.replaceAll(LF, CRLF), [['a.b.c001', '新']], 'fixture'), /CRLF/);
  });

  it('缺表尾／标记只剩一半／表尾后有内容：一律抛', () => {
    const noEnd = ['export const zh = {', "  'a.b.c001': \"旧\",", ''].join(LF);
    assert.throws(() => spliceTable(noEnd, [['a.b.c001', '新']], 'fixture'), /表尾/);
    const half = [good, MARK_BEGIN, ''].join(LF);
    assert.throws(() => spliceTable(half, [['a.b.c001', '新']], 'fixture'), /只剩一半/);
    const tail = ['export const zh = {', TABLE_END, '// 表外注释', ''].join(LF);
    assert.throws(() => spliceTable(tail, [['a.b.c001', '新']], 'fixture'), /表尾之后/);
  });
});