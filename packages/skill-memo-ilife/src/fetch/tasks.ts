// 取数层·飞书任务域（读）——#661：把 lark-cli 的 task 查询子命令收敛成归一化的远端任务。
// 老家对照：`_list_all_tasks`（feishu_sync.py:455，一次全量）、`_search_feishu_task_by_due_and_summary`
// （:245-266，建前查重）、`_get_task_detail`（:472-480，单条才带 due）。
// 与老实现的一处有意偏离：老 list 失败静默返回 `[]`（feishu_sync.py:466-467），会让「远端读不到」装成
// 「远端没有」；新实现一律上抛，由调用方收进错误列表（见 `docs/skills/skill-memo-ilife/t658-A-心愿排期移植-证据.md`）。
import { runLark } from './feishu.js';
import { MemoFetchError } from '../shared/errors.js';
import { taskTitle } from './taskWrite.js';

export interface RemoteTask {
  readonly guid: string;
  readonly summary: string;
  readonly description: string;
  readonly status: 'todo' | 'done';
}

/** 调一条 lark-cli 并取出回执里的 `data`；失败／非 JSON／缺 data 一律上抛（不返空冒充「远端没有」）。 */
function dataOf(cli: string, args: string[], what: string): Record<string, unknown> {
  const r = runLark(cli, args);
  if (!r.ok) throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 失败（exit=' + String(r.exit) + '）：' + String(r.stderr).slice(0, 200));
  let j: unknown = null;
  try { j = JSON.parse(r.stdout); }
  catch { throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 非 JSON：' + String(r.stdout).slice(0, 200)); }
  const d = (j as { data?: unknown }).data;
  if (typeof d !== 'object' || d === null) throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 回执缺 data');
  return d as Record<string, unknown>;
}

/** 归一化一条远端任务：list 给 `status`、单条给 `completed_at`，两种形状都认（老实现按 `status == done` 分流）。 */
function taskOf(raw: unknown): RemoteTask | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const t = raw as Record<string, unknown>;
  const guid = typeof t.guid === 'string' ? t.guid : '';
  if (!guid) return null;
  const completed = typeof t.completed_at === 'string' && t.completed_at.length > 0;
  return {
    guid,
    summary: typeof t.summary === 'string' ? t.summary : '',
    description: typeof t.description === 'string' ? t.description : '',
    status: completed || t.status === 'done' ? 'done' : 'todo',
  };
}

function itemsOf(cli: string, args: string[], what: string): RemoteTask[] {
  const items = dataOf(cli, args, what).items;
  if (!Array.isArray(items)) throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 回执缺 items 数组');
  return items.map((x) => taskOf(x)).filter((x): x is RemoteTask => x !== null);
}

/** 一次全量拉（老 `task +get-related-tasks`，无分片：list 不带 due，故全量交给调用方按 status 分流）。 */
export function listRelatedTasks(cli: string): RemoteTask[] {
  return itemsOf(cli, ['task', '+get-related-tasks'], 'task +get-related-tasks');
}

/** 建前查重（远端侧自然键）＝ 标题全等 ＋ 排期日期同日。
 *  查重键与写入键必须是同一个（都过 `taskTitle` 的 200 字截断）——老实现拿未截断的全文去搜、
 *  拿截断 200 的标题去写（feishu_sync.py:313 vs :327），长正文必然比不中（偏离 D-15）。
 *  老实现还把这整段锁在 `if due_iso:` 里（:312），无 due 的心愿完全不查重（偏离 D-16）。 */
export function searchTasks(cli: string, query: { summary: string; due?: string | null }): RemoteTask[] {
  const args = ['task', '+search', '--query', taskTitle(query.summary)];
  if (query.due) args.push('--due', query.due + ',' + query.due);
  args.push('--format', 'json');
  return itemsOf(cli, args, 'task +search');
}

/** 单条取详情拿 due（list 不带 due，故逐条补）。飞书 due 是 UTC 毫秒，换算成北京日期。 */
export function taskDueDate(cli: string, guid: string): string | null {
  const task = dataOf(cli, ['task', 'tasks', 'get', '--task-guid', guid], 'task tasks get').task;
  if (typeof task !== 'object' || task === null) return null;
  const due = (task as { due?: unknown }).due;
  if (typeof due !== 'object' || due === null) return null;
  const ts = (due as { timestamp?: unknown }).timestamp;
  const ms = typeof ts === 'string' ? Number(ts) : typeof ts === 'number' ? ts : NaN;
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
