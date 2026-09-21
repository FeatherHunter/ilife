import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { mkMemoDb, seedNote, seedReminder, countNotes } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, noLarkPathEnv } from './helpers/config-base.mjs';
import { MEMO_KEY_SHAPES } from '../dist/render/index.js';
import { routeWakeword } from '../dist/triggers/wakewords.js';;

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* next */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

function runWithDb(dbDir, args) {
  const cfg = mkMemoConfig({ db: { dir: dbDir } }, 'memo850-cfg-');
  const base = noLarkPathEnv(cfg);
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: base });
}
function outEnv(r) { return JSON.parse(r.stdout); }
function setCreatedAt(dir, id, createdAt) {
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try { db.prepare('UPDATE notes SET created_at = ? WHERE id = ?').run(createdAt, id); }
  finally { db.close(); }
}
// 活库实测：`D:/2Study/StudyNotes/.db/memo.db` 的 reminders.note_id 是 nullable（无 NOT NULL），
// 而仓内测试 DDL（`tooling/contract-seam.mjs` mirror 老 `init.sql`）写的是 NOT NULL（stale）。
// 本票不断共享件：独立提醒这一格用活库同形（nullable）的临时库跑，其余格仍走标准 `mkMemoDb`。
// 后续由编排者定共享 DDL 跟活库还是跟 init.sql。
function mkNullableMemoDb(prefix = 'memo850-null-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const db = new DatabaseSync(join(dir, 'memo.db'));
  try {
    db.exec(`
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT DEFAULT '备忘',
    sub_category TEXT,
    media_path TEXT,
    reminder_id INTEGER,
    feishu_task_guid TEXT,
    due TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER,
    remind_at TEXT,
    repeat_type TEXT DEFAULT 'none',
    repeat_rule TEXT,
    status TEXT DEFAULT 'active',
    notified_at TEXT,
    content TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE NO ACTION
);`);
  } finally { db.close(); }
  return dir;
}

let DB = '';
before(() => {
  DB = mkMemoDb('memo850-');
  const a = seedNote(DB, { content: '七月初二备忘', category: '备忘' });
  const b = seedNote(DB, { content: '七月初五心愿', category: '心愿' });
  const c = seedNote(DB, { content: '七月初十打卡', category: '打卡' });
  setCreatedAt(DB, a, '2026-07-02 10:00:00');
  setCreatedAt(DB, b, '2026-07-05 10:00:00');
  setCreatedAt(DB, c, '2026-07-10 10:00:00');
});

describe('#850 命令面四问（唯一出口端到端）', () => {
  it('Q④ 首次使用：memo.init 只渲染出初始化报告页', () => {
    const diag = { items: [{ name: '数据目录', status: 'ok', desc: '正常', action: '' }], todos: [{ title: '补装', steps: ['装 A', '配 B'] }], verify: ['重跑首次使用'] };
    const r = runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: diag })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, true);
    assert.ok(env.delivery && env.delivery.path, '须带 delivery.path');
    assert.ok(existsSync(env.delivery.path), '报告页须真落盘');
    const html = readFileSync(env.delivery.path, 'utf8');
    assert.ok(html.includes('初始化报告') || html.includes('环境检查'), '报告页须含报告内容');
    assert.equal(basename(dirname(env.delivery.path)), 'memo_html');
  });
  it('Q④ 库不存在时也能跑（开库前分派，不建库）', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'memo850-empty-'));
    const diag = { items: [{ name: '库', status: 'err', desc: '不在', action: '建库' }], todos: [], verify: [] };
    const r = runWithDb(emptyDir, ['memo.init', '--params', JSON.stringify({ data: diag })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.ok(existsSync(env.delivery.path));
    assert.equal(existsSync(join(emptyDir, 'memo.db')), false, '只渲染，不建库');
  });
  it('Q④ 坏输入：缺 data／非法 status 即 exit 2', () => {
    assert.equal(runWithDb(DB, ['memo.init', '--params', JSON.stringify({})]).status, 2);
    const bad = { items: [{ name: 'x', status: 'bad', desc: '', action: '' }], todos: [], verify: [] };
    assert.equal(runWithDb(DB, ['memo.init', '--params', JSON.stringify({ data: bad })]).status, 2);
  });
  it('Q⑤ 按时间区间：含起止当天＋倒序＋分类叠加', () => {
    const r = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ start: '2026-07-01', end: '2026-07-07' })]);
    assert.equal(r.status, 0, r.stderr);
    const d = outEnv(r).data;
    assert.equal(d.total, 2);
    assert.ok(d.items[0].created_at >= d.items[1].created_at, '按创建时间倒序');
    const c = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ start: '2026-07-01', end: '2026-07-07', category: '心愿' })]);
    assert.equal(outEnv(c).data.total, 1);
    assert.equal(outEnv(c).data.items[0].category, '心愿');
  });
  it('Q⑤ 缺一边报缺槽位／倒置报错／timeRange 退役', () => {
    const missEnd = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ start: '2026-07-01' })]);
    assert.equal(missEnd.status, 2);
    assert.match(missEnd.stderr, /缺槽位 end/);
    const missStart = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ end: '2026-07-07' })]);
    assert.equal(missStart.status, 2);
    assert.match(missStart.stderr, /缺槽位 start/);
    const rev = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ start: '2026-07-07', end: '2026-07-01' })]);
    assert.equal(rev.status, 2);
    assert.match(rev.stderr, /开始日期不能晚于结束日期/);
    const retired = runWithDb(DB, ['memo.search', '--params', JSON.stringify({ timeRange: '2026-09' })]);
    assert.equal(retired.status, 2);
    assert.match(retired.stderr, /timeRange 已退役/);
  });
  it('Q⑥ 给旧笔记加提醒：不建新笔记', () => {
    const before = countNotes(DB);
    const id = outEnv(runWithDb(DB, ['memo.search', '--params', JSON.stringify({ q: '七月初二' })])).data.items[0].id;
    const r = runWithDb(DB, ['memo.reminder', '--params', JSON.stringify({ note_id: id, remind_at: '2026-10-01 09:00', content: '该跑步了' })]);
    assert.equal(r.status, 0, r.stderr);
    const env = outEnv(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.note_id, id);
    assert.equal(countNotes(DB), before, '只加提醒行，不建新笔记');
  });
  it('Q⑥ 独立提醒（不给 note_id，与老行为一致）', () => {
    const ndb = mkNullableMemoDb();
    seedNote(ndb, { content: '占位', category: '备忘' });
    const before = countNotes(ndb);
    const r = runWithDb(ndb, ['memo.reminder', '--params', JSON.stringify({ remind_at: '2026-10-02 09:00', content: '独立喝水' })]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(outEnv(r).data.note_id, null);
    assert.equal(countNotes(ndb), before, '独立提醒也不建笔记');
  });
  it('Q⑥ 记提醒两步合一仍在 memo.create（不动）', () => {
    const r = runWithDb(DB, ['memo.create', '--params', JSON.stringify({ title: '喝水', body: '多喝水', category: '备忘', remindAt: '2026-10-03 09:00' })]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(outEnv(r).data.message, /已记一条/);
  });
  it('Q⑥ 不存在笔记／一次性缺时间／重复规则校验', () => {
    assert.equal(runWithDb(DB, ['memo.reminder', '--params', JSON.stringify({ note_id: 999999, remind_at: '2026-10-01 09:00', content: 'x' })]).status, 4);
    const noAt = runWithDb(DB, ['memo.reminder', '--params', JSON.stringify({ content: '没时间' })]);
    assert.equal(noAt.status, 2);
    assert.match(noAt.stderr, /一次性提醒必须给提醒时间/);
    const noRule = runWithDb(DB, ['memo.reminder', '--params', JSON.stringify({ remind_at: '2026-10-01 09:00', content: 'x', repeat_type: '每天' })]);
    assert.equal(noRule.status, 2);
    const badAt = runWithDb(DB, ['memo.reminder', '--params', JSON.stringify({ remind_at: '明天', content: 'x' })]);
    assert.equal(badAt.status, 2);
  });
  it('Q⑦ 单条无关联直删（用户说删即 confirm）', () => {
    const id = seedNote(DB, { content: '待删无关联', category: '备忘' });
    const r = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id })]).status, 4, '删后读回须无此笔记');
  });
  it('Q⑦ 有关联先出清单（含提醒数），再带级联标记删', () => {
    const id = seedNote(DB, { content: '待删有关联', category: '备忘' });
    seedReminder(DB, { noteId: id, at: '2026-10-05 09:00', content: '别忘' });
    const first = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(first.status, 2, '有关联无 withReminders 须先出清单（exit 2），不删');
    const d = outEnv(first).data;
    assert.equal(d.related, 1);
    assert.equal(d.reminders.length, 1);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id })]).status, 0, '出清单时笔记须保留');
    const second = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ id, confirm: true, withReminders: true })]);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id })]).status, 4);
  });
  it('Q⑦ 批量一律先出清单（只回数据清单，不另出整页）', () => {
    const a = seedNote(DB, { content: '批量删A', category: '备忘' });
    const b = seedNote(DB, { content: '批量删B', category: '备忘' });
    const first = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ ids: [a, b] })]);
    assert.equal(first.status, 2);
    assert.equal(outEnv(first).data.total, 2);
    assert.equal(outEnv(first).delivery, undefined, '批量清单只回数据，不另出整页');
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id: a })]).status, 0, '清单阶段须保留');
    const second = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ ids: [a, b], confirm: true })]);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id: a })]).status, 4);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id: b })]).status, 4);
  });
  it('Q⑦ 废弃提醒只废提醒、笔记保留', () => {
    const id = seedNote(DB, { content: '废弃用笔记', category: '备忘' });
    const rid = seedReminder(DB, { noteId: id, at: '2026-10-06 09:00', content: '待废' });
    const r = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ mode: 'abandon', id: rid })]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id })]).status, 0, '废弃后笔记须保留');
  });
  it('Q⑦ 删三族走真删（危险缺陷清零），改三族仍走更新', () => {
    assert.deepEqual(routeWakeword('删心愿', { id: 1 }).key, 'memo.remove');
    assert.deepEqual(routeWakeword('删打卡', { id: 1 }).key, 'memo.remove');
    assert.deepEqual(routeWakeword('删情绪日记', { id: 1 }).key, 'memo.remove');
    const wid = seedNote(DB, { content: '删心愿真删', category: '心愿' });
    const r = runWithDb(DB, ['memo.remove', '--params', JSON.stringify({ id: wid, confirm: true })]);
    // 心愿带远端合成写：本地删成、远端没成时 exit 4 但本地已删（回执分字段如实写）。
    assert.ok([0, 4].includes(r.status), r.stderr);
    assert.equal(runWithDb(DB, ['memo.detail', '--params', JSON.stringify({ id: wid })]).status, 4, '真删后读回须无此笔记（不是改分类）');
  });
  it('唤醒词各有唯一命令＋时间参数只认 start／end＋命令面只多两条', () => {
    assert.equal(routeWakeword('首次使用').key, 'memo.init');
    assert.equal(routeWakeword('按时间搜备忘', { start: '2026-07-01', end: '2026-07-07' }).key, 'memo.search');
    assert.equal(routeWakeword('设提醒', { remind_at: '2026-10-01 09:00' }).key, 'memo.reminder');
    assert.equal(routeWakeword('删备忘', { id: 1 }).key, 'memo.remove');
    assert.ok(Object.keys(MEMO_KEY_SHAPES).includes('memo.init'));
    assert.ok(Object.keys(MEMO_KEY_SHAPES).includes('memo.reminder'));
    assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 14, '命令面净增两条（12→14）');
  });
  it('读列表／写回执各归各（一个命令一种形状）', () => {
    assert.equal(MEMO_KEY_SHAPES['memo.search'], 'list');
    assert.equal(MEMO_KEY_SHAPES['memo.reminder'], 'receipt');
    assert.equal(MEMO_KEY_SHAPES['memo.init'], 'receipt');
    assert.equal(MEMO_KEY_SHAPES['memo.remind'], 'list');
  });
});
