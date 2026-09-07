#!/usr/bin/env node
// memo 唯一出口 cmd_read（M5 #35）：argv+JSON(stdout)+exit；非 0 走 stderr；超时 terminate+TOAST 降级标记。
// 退出码对齐 skilllink 冻结：0 ok；1 预检；2 用法/参数；3 key；4 取数/超时；5 envelope/渲染/落盘。
// stdout 纯净：成功只打 envelope JSON 一行。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openMemoDb, listNotes, getNote, searchNotes, addNote, updateNote, removeNote, larkReady, MemoFetchError } from '../fetch/index.js';
import { normalizeTop, normalizeSub, normalizeRemindAt, crudCreate, crudUpdate, crudRemove } from '../policy/index.js';
import { memoShapeFor, buildMemoEnvelope, renderEnvelopeHtml, assertHtmlSize, MemoRenderError } from '../render/index.js';
import { MemoPolicyError } from '../fetch/errors.js';
import type { MemoDb, MemoNote } from '../fetch/db.js';

const DEFAULT_TIMEOUT_MS = 30000;

function fail(code: number, msg: string): never { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function toast(msg: string): void { console.error('TOAST: ' + msg); }

function preflight() {
  const v = process.versions.node.split('.').map(Number);
  if (!(v[0] > 22 || (v[0] === 22 && v[1] >= 13))) fail(1, 'node 低于 22.13：' + process.versions.node);
  const p = process.env.SKILLS_DB_PATH;
  if (!p) fail(1, 'SKILLS_DB_PATH 未设置（无默认值，必设）');
  return p;
}

function needStr(params: Record<string, unknown>, name: string): string {
  const v = params[name];
  if (typeof v !== 'string' || v.length === 0) fail(2, '缺参数 ' + name);
  return v;
}

// 十键分发：读走 fetch 读，写走 fetch 写+policy 校验，sync 走 lark 四门；未知键 upstream 已拦，此处再拦一道。
function dispatch(key: string, params: Record<string, unknown>, db: MemoDb): unknown {
  switch (key) {
    case 'memo.search': {
      const items = params.q !== undefined
        ? searchNotes(db, String(params.q), { category: params.category as string | undefined, sub: params.sub as string | undefined })
        : listNotes(db).filter((n) => (params.category === undefined || n.category === params.category));
      return { items, total: items.length };
    }
    case 'memo.detail': return { item: getNote(db, needStr(params, 'id')) };
    case 'memo.create': {
      const c = crudCreate(params);
      const top = normalizeTop(params.category);
      const sub = normalizeSub(params.sub);
      const remindAt = params.remindAt !== undefined ? normalizeRemindAt(params.remindAt) : null;
      const n = addNote(db, { title: c.title, body: c.body, category: top, sub, remindAt });
      return { ok: true, message: '已记一条：' + n.id };
    }
    case 'memo.update': {
      const id = crudUpdate(params).id;
      const patch: Partial<MemoNote> = {};
      if (params.title !== undefined || params.body !== undefined) {
        const c = crudCreate({ title: params.title || getNote(db, id).title, body: params.body || '' });
        patch.title = c.title; if (params.body !== undefined) patch.body = c.body;
      }
      if (params.category !== undefined) patch.category = normalizeTop(params.category);
      if (params.sub !== undefined) patch.sub = normalizeSub(params.sub);
      if (params.remindAt !== undefined) patch.remindAt = normalizeRemindAt(params.remindAt);
      if (params.done !== undefined) patch.done = params.done === true;
      const n = updateNote(db, id, patch);
      return { ok: true, message: '已更新：' + n.id };
    }
    case 'memo.remove': {
      if (params.mode === 'abandon') {
        const id = needStr(params, 'id');
        updateNote(db, id, { remindAt: null });
        return { ok: true, message: '已废弃提醒（笔记保留）：' + id };
      }
      const r = crudRemove(params);
      removeNote(db, r.id, true);
      return { ok: true, message: '已删除：' + r.id };
    }
    case 'memo.remind': {
      const items = listNotes(db).filter((n) => n.remindAt);
      const done = params.done === true;
      const out = items.filter((n) => (n.done === true) === done);
      return { items: out, total: out.length };
    }
    case 'memo.wish': {
      const items = listNotes(db).filter((n) => n.category === '心愿');
      return { items, total: items.length };
    }
    case 'memo.sync': {
      const gate = larkReady();
      return { ok: true, message: '飞书就绪：' + gate.openId + '（同步执行归 M7 端到端）' };
    }
    case 'memo.batch': return { ok: true, message: '批量改分类向导须交互确认（M5 只登记意图）' };
    case 'memo.stats': {
      const all = listNotes(db);
      const metrics: Record<string, number> = { count: all.length };
      for (const n of all) metrics['cat.' + n.category] = (metrics['cat.' + n.category] || 0) + 1;
      return { metrics };
    }
    default: fail(3, '未知 memo key：' + key); return null;
  }
}

function parseArgs(a: string[]): { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } {
  const o: { key: string | undefined; params: string | undefined; html: string | undefined; timeout: number } = { key: a[0], params: undefined, html: undefined, timeout: DEFAULT_TIMEOUT_MS };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else if (a[i] === '--timeout' && i + 1 < a.length) {
      o.timeout = Number(a[++i]);
      if (!Number.isFinite(o.timeout) || o.timeout <= 0) fail(2, '--timeout 须为正数毫秒');
    }
    else fail(2, '未知参数：' + a[i]);
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.key) fail(2, '用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]');
  const dbPath = preflight();
  let params = {};
  if (o.params !== undefined) {
    try { params = JSON.parse(o.params); } catch (e) { fail(2, '--params 须为 JSON'); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  let shape = null;
  try { shape = memoShapeFor(o.key); } catch (e) { fail(3, (e as Error).message); }
  void shape;
  const timer = setTimeout(() => { toast('cmd_read 超时 terminate（' + o.timeout + 'ms），已终止取数'); process.exit(4); }, o.timeout);
  timer.unref();
  let env = null;
  try {
    const db = openMemoDb(join(dbPath, 'memo'));
    const data = dispatch(o.key, params, db);
    env = buildMemoEnvelope(o.key, data);
    if (o.html) {
      const html = renderEnvelopeHtml(env);
      assertHtmlSize(html);
      try { writeFileSync(o.html, html, 'utf8'); }
      catch (e) { fail(5, 'HTML 写盘失败：' + o.html); }
    }
  } catch (e) {
    if (e instanceof MemoFetchError) fail(4, '取数失败：' + e.message);
    if (e instanceof MemoPolicyError) fail(2, '口径失败：' + e.message);
    if (e instanceof MemoRenderError) fail(5, '渲染失败：' + e.message);
    fail(4, '未知失败：' + ((e as Error).message || String(e)));
  } finally { clearTimeout(timer); }
  process.stdout.write(JSON.stringify(env) + '\n');
}

await main();
