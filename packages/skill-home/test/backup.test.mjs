// #707 第 1 条：居家「备份导出／导入恢复」的真出口判据（走真 CLI，不看内部函数）。
// 本票之前的实况：HELP 有整组场景，代码只回一句回执，落盘零字节（cmd_read.ts:696-697,723-731）。
// 这里每条都对着「真产出文件 / 真从备份恢复」判真假，改坏一处必红。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const archive = await import(pathToFileURL(join(here, '..', 'dist', 'fetch', 'archive.js')).href);

let DB = '';
let CID = 0;
const backDir = () => join(DB, 'backups');
const zips = () => (existsSync(backDir()) ? readdirSync(backDir()).filter((f) => /^home_backup_.*\.zip$/.test(f)).sort() : []);

function nodeBin() {
  for (const c of [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean)) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();
function run(args, envExtra) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB, ...(envExtra || {}) } });
}
const P = JSON.stringify;
const msg = (r) => JSON.parse(r.stdout).data.message;
const items = () => JSON.parse(run(['home.stats.overview']).stdout).data.metrics.items;
function add(name, location = '客厅/柜子') {
  const r = run(['home.item.add', '--params', P({ name, category_id: CID, location })]);
  assert.equal(r.status, 0, '种物品应成功：' + r.stderr);
}
function backup(extra = {}) {
  const r = run(['home.care.write', '--params', P({ kind: 'backup', ...extra })]);
  assert.equal(r.status, 0, '备份应成功：' + r.stderr);
  return r;
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'home-backup-'));
  const probe = run(['home.stats.overview']);
  assert.equal(probe.status, 0);
  CID = JSON.parse(run(['home.tag.query', '--params', P({ kind: 'categories' })]).stdout).data.items
    .find((c) => String(c.name).startsWith('分类:')).count;
});

describe('#707 居家备份导出／导入恢复', () => {
  it('备份真产出 zip 文件，且是标准的「home.db + manifest.json」两件', () => {
    add('牛奶', '客厅/冰箱');
    add('卫衣', '卧室/衣柜');
    add('电池', '书房/抽屉');
    assert.equal(items(), 3);

    const r = backup();
    assert.match(msg(r), /已备份：3 件/);
    assert.equal(zips().length, 1, '备份目录里应恰有一个 zip');

    const path = join(backDir(), zips()[0]);
    const size = statSync(path).size;
    assert.ok(size > 0, '备份不得是 0 字节壳（本票要修的就是这个）');
    // 真文件：ZIP 本地头魔数 PK\x03\x04
    const head = readFileSync(path).subarray(0, 4);
    assert.equal(head.toString('latin1'), 'PK\u0003\u0004', '产物必须是真 ZIP');
    // 条目：库 + 清单，且库能解出来是 SQLite
    const entries = archive.zipRead(readFileSync(path));
    assert.deepEqual(entries.map((e) => e.name).sort(), ['home.db', 'manifest.json']);
    const db = entries.find((e) => e.name === 'home.db').data;
    assert.equal(db.subarray(0, 15).toString('latin1'), 'SQLite format 3');
    assert.equal(JSON.parse(entries.find((e) => e.name === 'manifest.json').data.toString('utf8')).items, 3);
  });

  it('导出的 JSON 真落盘，且能解析回 3 件', () => {
    const r = run(['home.care.write', '--params', P({ kind: 'export', format: 'json' })]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(msg(r), /已导出：JSON 3 行/);
    const file = readdirSync(backDir()).find((f) => f.startsWith('home_export_') && f.endsWith('.json'));
    const data = JSON.parse(readFileSync(join(backDir(), file), 'utf8'));
    assert.equal(data.items.length, 3);
    assert.equal(data.schema_version, 1);
  });

  it('导出 CSV 真落盘（列与老家同序）', () => {
    const r = run(['home.care.write', '--params', P({ kind: 'export', format: 'csv' })]);
    assert.equal(r.status, 0, r.stderr);
    const file = readdirSync(backDir()).find((f) => f.startsWith('home_export_') && f.endsWith('.csv'));
    const lines = readFileSync(join(backDir(), file), 'utf8').trim().split('\n');
    assert.equal(lines[0], 'id,name,category,owner,purchase_price,remark,location,quantity,location_status,purchase_date,expiration_date');
    assert.equal(lines.length, 4, '表头 + 3 行');
  });

  it('backup-list 真读盘报历史（不再是一句「备份： home.db」）', () => {
    const r = run(['home.care.query', '--params', P({ kind: 'backup-list' })]);
    assert.equal(r.status, 0, r.stderr);
    const list = JSON.parse(r.stdout).data;
    assert.equal(list.total, 1);
    assert.match(String(list.items[0].name), /^home_backup_\d{8}_\d{6}_\d{3}\.zip（/);
  });

  it('从备份恢复：覆盖面比备份点大的现状被整库还原（5 件 → 3 件）', () => {
    const zip = zips()[0];
    const before = zips().length;

    add('雨伞', '玄关/柜');
    add('台灯', '玄关/柜');
    assert.equal(items(), 5, '备份点之后应多出 2 件');

    const r = run(['home.care.write', '--params', P({ kind: 'import', file: zip, confirm: true })]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(msg(r), /已从备份恢复/);
    assert.equal(items(), 3, '恢复后应回到备份点的 3 件');
    const names = JSON.parse(run(['home.item.search', '--params', P({})]).stdout).data.items.map((i) => i.name);
    assert.ok(!names.includes('雨伞') && !names.includes('台灯'), '备份点之后的件必须消失：' + names.join('、'));
    assert.equal(zips().length, before + 1, '恢复前必须先自备份（数据安全优先于便捷）');
  });

  it('预告支只报数不落盘；无 confirm 的恢复 exit 2 且库一点不变', () => {
    const zip = zips()[0];
    const zipsBefore = zips().length;
    const itemsBefore = items();

    const pv = run(['home.care.write', '--params', P({ kind: 'import-preview', file: zip })]);
    assert.equal(pv.status, 0, pv.stderr);
    assert.match(msg(pv), /预告通过：这份备份含 3 件/);
    assert.equal(zips().length, zipsBefore, '预告不得落盘');
    assert.equal(items(), itemsBefore, '预告不得改库');

    const no = run(['home.care.write', '--params', P({ kind: 'import', file: zip })]);
    assert.equal(no.status, 2, '整库覆盖须显式 confirm');
    assert.match(no.stderr, /confirm:true/);
    assert.equal(items(), itemsBefore, '被拒的恢复不得改库');
    assert.equal(zips().length, zipsBefore, '被拒的恢复不得落盘');
  });

  it('keep_n 裁剪：连备 7 次只留最新 5 份', () => {
    for (let i = 0; i < 7; i++) {
      const r = run(['home.care.write', '--params', P({ kind: 'backup', keep_n: 5 })]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(JSON.parse(r.stdout).data.message.includes('保留 5 份'), true);
    }
    assert.equal(zips().length, 5, '应裁到 5 份，实得 ' + zips().length);
  });

  it('坏输入一律 exit 2，不静默成功', () => {
    const bad = run(['home.care.write', '--params', P({ kind: 'import-preview', file: 'notes.txt' })]);
    assert.equal(bad.status, 2);
    assert.match(bad.stderr, /文件名不合规/);

    const missing = run(['home.care.write', '--params', P({ kind: 'import-preview', file: 'home_backup_20200101_000000_000.zip' })]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /不存在/);

    assert.equal(run(['home.care.write', '--params', P({ kind: 'import', confirm: true })]).status, 2, '缺 file 应 exit 2');
    assert.equal(run(['home.care.write', '--params', P({ kind: 'backup', keep_n: 0 })]).status, 2);
    assert.equal(run(['home.care.write', '--params', P({ kind: 'export', format: 'xml' })]).status, 2);
  });

  it('库目录缺失时备份大声失败，不假报成功', () => {
    const other = mkdtempSync(join(tmpdir(), 'home-nodb-'));
    const r = run(['home.care.write', '--params', P({ kind: 'backup' })], { SKILLS_DB_PATH: other });
    // 新目录无 home.db：备份必须非 0（HOME_DB_MISSING → exit 4），不许产出空壳备份
    assert.notEqual(r.status, 0, '无库不得假报备份成功');
    assert.equal(existsSync(join(other, 'backups')), false, '失败的备份不得留下 backups 目录');
  });
});
