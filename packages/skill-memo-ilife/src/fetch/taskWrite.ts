// 取数层·飞书任务域（写）——#661：建／改（题／期）／标完成／删，argv 形状照老实现逐字。
// 老家对照：`add_wish_sync`（feishu_sync.py:325-338）、`update_wish_sync`（:354-358）、`update_due_sync`
// （:389-393）、`clear_due_sync`（:428-435，显式空值通道）、`complete_wish_sync`（:368）。
// `deleteTask` 是 D-06 补的能力：老实现自认「task 域无 +delete shortcut」（feishu_sync.py:834），
// 删心愿只标完成，飞书任务永远留着；老**自检**里 calendar 域有真删除（:900）、task 域没有。
import { runLark } from './feishu.js';
import { MemoFetchError } from './errors.js';

/** 飞书标题上限口径（老 `content[:200]`，feishu_sync.py:327）——查重键与写入键必须是同一个，故只此一处。 */
export const TASK_TITLE_MAX = 200;

export function taskTitle(title: string): string {
  return title.slice(0, TASK_TITLE_MAX);
}

function mustRun(cli: string, args: string[], what: string): Record<string, unknown> {
  const r = runLark(cli, args);
  if (!r.ok) throw new MemoFetchError('LARK_TASK_FAILED', what + ' 失败（exit=' + String(r.exit) + '）：' + String(r.stderr).slice(0, 200));
  let j: unknown = null;
  try { j = JSON.parse(r.stdout); }
  catch { throw new MemoFetchError('LARK_BAD_RESPONSE', what + ' 非 JSON：' + String(r.stdout).slice(0, 200)); }
  const d = (j as { data?: unknown }).data;
  return typeof d === 'object' && d !== null ? (d as Record<string, unknown>) : {};
}

export interface CreateTaskInput {
  readonly summary: string;
  readonly description: string;
  readonly assignee: string;
  readonly due?: string | null;
  readonly tasklistId?: string | null;
}

/** 建任务。返回远端标识；**取不到标识即抛**（老实现会拿 None 继续，下一轮必重复建，D-11 同族）。 */
export function createTask(cli: string, input: CreateTaskInput): string {
  const args = [
    'task', '+create',
    '--summary', taskTitle(input.summary),
    '--description', input.description,
    '--assignee', input.assignee,
  ];
  if (input.due) args.push('--due', input.due);
  if (input.tasklistId) args.push('--tasklist-id', input.tasklistId);
  const data = mustRun(cli, args, 'task +create');
  const task = (data.task ?? data) as { guid?: unknown };
  const guid = typeof task.guid === 'string' ? task.guid : '';
  if (!guid) throw new MemoFetchError('LARK_TASK_FAILED', 'task +create 没回标识（写回本地的前提没达成）');
  return guid;
}

/** 改题／改期：两条 flag 通道（老 `update_wish_sync` 与 `update_due_sync` 各一条）。 */
export function updateTask(cli: string, taskId: string, patch: { summary?: string; due?: string }): void {
  const args = ['task', '+update', '--task-id', taskId];
  if (patch.summary !== undefined) args.push('--summary', taskTitle(patch.summary));
  if (patch.due !== undefined) args.push('--due', patch.due);
  mustRun(cli, args, 'task +update');
}

/** 清期：`due=null` 是服务端合法值，但 lark-cli 不暴露清空 flag ⇒ 只能走 `--data` 显式空值通道。 */
export function clearTaskDue(cli: string, taskId: string): void {
  mustRun(cli, ['task', '+update', '--task-id', taskId, '--data', '{"due": null}'], 'task +update --data');
}

export function completeTask(cli: string, taskId: string): void {
  mustRun(cli, ['task', '+complete', '--task-id', taskId], 'task +complete');
}

/** D-06：删心愿要能连带删掉飞书任务（老实现只有标完成）。 */
export function deleteTask(cli: string, taskId: string): void {
  mustRun(cli, ['task', '+delete', '--task-id', taskId], 'task +delete');
}
