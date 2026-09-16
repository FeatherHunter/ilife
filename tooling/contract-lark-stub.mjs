#!/usr/bin/env node
/**
 * #659 · 远端平台挡板（合成写判据的第二个注入点）
 *
 * 本件是**替身 lark-cli**：由 `tooling/contract-seam.mjs` 的 `makeLarkStub()` 拷进临时目录，
 * 与它的 `.cmd`／无扩展名 shim 一起冒充 `lark-cli` 命令，让老实现（Python）与新实现（TS）
 * 都能在「远端平台」这一侧被完全隔离地跑起来。
 *
 * 它做三件事：
 *  1. **留痕**：每次调用把 `argv` 追加进同目录 `calls.jsonl` —— 这就是「远端平台收到了什么调用」那条读数。
 *  2. **应答**：按同目录 `state.json` 里的远端现状（events／tasks／mode／scopes／seq）回 lark-cli 形状的 JSON。
 *  3. **可改坏**：state 里把 `mode` 切 `unavailable`、把 `createFails` 打开，就能摆出「远端不可用」等边界。
 *
 * 只认 lark-cli 那几条真子命令，认不出的**大声失败**（不静默返回空，避免把「读不到」伪装成「远端没有」）。
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(DIR, 'state.json');
const LOG_FILE = join(DIR, 'calls.jsonl');
const argv = process.argv.slice(2);

function trace() {
  try { appendFileSync(LOG_FILE, JSON.stringify({ argv }) + '\n', 'utf8'); } catch { /* 留痕失败不拦调用 */ }
}
function readState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
  catch { return { mode: 'normal', events: [], tasks: [], scopes: ['task', 'calendar'], seq: 0, createFails: false }; }
}
function writeState(s) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8'); }
function say(obj, code = 0) { process.stdout.write(JSON.stringify(obj) + '\n'); process.exit(code); }
function die(msg, code = 2) { process.stderr.write('stub-lark: ' + msg + '\n'); process.exit(code); }
function flag(name) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; }
function day(v) { return String(v || '').slice(0, 10); }
function inRange(v, start, end) {
  const d = day(v);
  return d !== '' && d >= day(start) && d <= day(end);
}

trace();
const state = readState();

if (state.mode === 'unavailable' && argv[0] !== '--version') {
  die('挡板 unavailable 模式：远端平台不可用', 3);
}

// ── 门与身份 ─────────────────────────────────────────────────────────────────
// 真 lark-cli 打的就是这一行文本（非 JSON）：老实现拿正则抠版本号，新实现取首行，同一形状两边都吃。
if (argv[0] === '--version') { process.stdout.write('lark-cli version 1.0.59-stub\n'); process.exit(0); }
if (argv[0] === 'auth' && argv[1] === 'status') {
  say({ identities: { user: { status: 'ready', available: true, openId: 'ou_stub_user' } } });
}
if (argv[0] === 'auth' && argv[1] === 'check') {
  const ok = (state.scopes || []).includes(flag('--scope'));
  if (ok) say({ ok: true, data: { granted: flag('--scope') } });
  die('缺 scope：' + flag('--scope'), 1);
}

// ── 日历域（作息管家）────────────────────────────────────────────────────────
if (argv[0] === 'calendar' && argv[1] === '+agenda') {
  const items = (state.events || [])
    .filter((e) => inRange(e.start, flag('--start') || '0000-01-01', flag('--end') || '9999-12-31'))
    .map((e) => ({
      event_id: e.event_id, summary: e.summary, description: e.description || '',
      start_time: { datetime: e.start }, end_time: { datetime: e.end },
    }));
  say({ ok: true, data: items });
}
if (argv[0] === 'calendar' && argv[1] === '+search-event') {
  const hit = (state.events || [])
    .filter((e) => e.indexed !== false)
    .filter((e) => inRange(e.start, flag('--start') || '0000-01-01', flag('--end') || '9999-12-31'))
    .slice(0, state.searchCap === undefined ? 20 : state.searchCap)
    .map((e) => ({
      event_id: e.event_id, summary: e.summary,
      start: { date_time: e.start }, end: { date_time: e.end },
    }));
  say({ ok: true, data: { items: hit } });
}
if (argv[0] === 'calendar' && argv[1] === '+create') {
  if (state.createFails) die('挡板 createFails：远端创建失败', 4);
  const s = readState();
  const id = 'fs_evt_' + (++s.seq);
  const ev = {
    event_id: id,
    summary: flag('--summary') || '',
    description: flag('--description') || '',
    start: flag('--start') || '',
    end: flag('--end') || '',
  };
  s.events = (s.events || []).concat([ev]);
  writeState(s);
  // `createNoId`：远端建成了但**没给出标识**（老实现「取不到远端标识仍写空」那一档的布景）。
  if (state.createNoId) say({ ok: true, data: { summary: ev.summary, description: ev.description } });
  say({ ok: true, data: { event_id: id, summary: ev.summary, description: ev.description, start_time: { datetime: ev.start }, end_time: { datetime: ev.end } } });
}
if (argv[0] === 'calendar' && argv[1] === '+update') {
  const s = readState();
  const id = flag('--event-id');
  const ev = (s.events || []).find((e) => e.event_id === id);
  if (!ev) die('无此 event：' + id, 4);
  for (const [f, k] of [['--start', 'start'], ['--end', 'end'], ['--summary', 'summary'], ['--description', 'description']]) {
    if (flag(f) !== undefined) ev[k] = flag(f);
  }
  writeState(s);
  say({ ok: true, data: { event_id: id, summary: ev.summary, description: ev.description, start_time: { datetime: ev.start }, end_time: { datetime: ev.end } } });
}
if (argv[0] === 'calendar' && argv[1] === 'events' && argv[2] === 'delete') {
  const s = readState();
  const id = flag('--event-id');
  s.events = (s.events || []).filter((e) => e.event_id !== id);
  writeState(s);
  say({ ok: true, data: {} });
}

// ── 任务域（备忘录）─────────────────────────────────────────────────────────
if (argv[0] === 'task' && argv[1] === '+search') {
  const q = flag('--query') || '';
  const due = String(flag('--due') || '').split(',')[0];
  const items = (state.tasks || [])
    .filter((t) => (q === '' || t.summary === q))
    .filter((t) => (due === '' || String(t.due || '').startsWith(due)))
    .map((t) => ({ guid: t.guid, summary: t.summary, due_at: t.due ? t.due + ' 08:00:00' : '' }));
  say({ ok: true, data: { items } });
}
if (argv[0] === 'task' && argv[1] === '+create') {
  if (state.createFails) die('挡板 createFails：远端创建失败', 4);
  const s = readState();
  const guid = 'tk_' + (++s.seq);
  const t = {
    guid,
    summary: flag('--summary') || '',
    description: flag('--description') || '',
    due: flag('--due') || '',
    completed_at: '',
  };
  s.tasks = (s.tasks || []).concat([t]);
  writeState(s);
  say({ ok: true, data: { task: { guid, summary: t.summary, description: t.description } } });
}
if (argv[0] === 'task' && argv[1] === '+get-related-tasks') {
  // 真 lark-cli 的 related-tasks 列表带 description（老实现的反向对账就靠它反查「原备忘 #N」）。
  const items = (state.tasks || []).map((t) => ({
    guid: t.guid, summary: t.summary, description: t.description || '',
    completed_at: t.completed_at || '', status: t.completed_at ? 'done' : 'todo',
  }));
  say({ ok: true, data: { items } });
}
if (argv[0] === 'task' && argv[1] === 'tasks' && argv[2] === 'get') {
  const t = (state.tasks || []).find((x) => x.guid === flag('--task-guid'));
  if (!t) die('无此 task：' + flag('--task-guid'), 4);
  const task = {
    guid: t.guid, summary: t.summary, description: t.description, completed_at: t.completed_at || '',
  };
  if (t.due) task.due = { is_all_day: true, timestamp: String(Date.parse(t.due + 'T00:00:00Z')) };
  say({ ok: true, data: { task } });
}
if (argv[0] === 'task' && argv[1] === '+update') {
  const s = readState();
  const t = (s.tasks || []).find((x) => x.guid === flag('--task-id'));
  if (!t) die('无此 task：' + flag('--task-id'), 4);
  if (flag('--summary') !== undefined) t.summary = flag('--summary');
  if (flag('--due') !== undefined) t.due = flag('--due');
  if (flag('--data') !== undefined) {
    let payload = {};
    try { payload = JSON.parse(flag('--data')); } catch { payload = {}; }
    if ('due' in payload) t.due = payload.due ? String(payload.due) : '';
    if ('summary' in payload) t.summary = String(payload.summary);
  }
  writeState(s);
  say({ ok: true, data: { task: { guid: t.guid, summary: t.summary } } });
}
if (argv[0] === 'task' && argv[1] === '+complete') {
  const s = readState();
  const t = (s.tasks || []).find((x) => x.guid === flag('--task-id'));
  if (!t) die('无此 task：' + flag('--task-id'), 4);
  t.completed_at = new Date().toISOString();
  writeState(s);
  say({ ok: true, data: { task: { guid: t.guid, completed_at: t.completed_at } } });
}
if (argv[0] === 'task' && argv[1] === 'tasklists' && argv[2] === 'list') {
  say({ ok: true, data: { items: [{ name: 'stub 清单', guid: 'tl_stub' }] } });
}

die('挡板没这条子命令：' + argv.join(' '), 2);
