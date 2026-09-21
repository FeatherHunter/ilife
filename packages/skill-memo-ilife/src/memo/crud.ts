// 口径层·增删改查字段政策（#665）：建须题/文其一、改删须 id、真删须 confirm；废弃走 reminder abandon。
// id 是老库自增整数：对外接受数字或数字串，统一归一为 number（老 `note_id <= 0` 即错口径）。
import { MemoPolicyError } from '../shared/errors.js';
import { needId } from '../shared/validators.js';

export function crudCreate(input: { title?: unknown; body?: unknown }): { title: string; body: string } {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!title && !body) throw new MemoPolicyError('POLICY_BAD_INPUT', '新建须给标题或正文其一');
  return { title, body };
}

/** 命令面保持题／文双参数：落库时收敛到 `content` 单列（正文优先、标题补位），`summary` 列不动
 *  （那是短摘要位，老 `add_note` 建时也不写）。调用面见 `wish/ensure.ts` 与 `cli/cmd_read.ts`。 */
export function contentOf(title: string, body: string): string {
  return body !== '' ? body : title;
}

// 附件路径那条口径已按 #712 搬进 `media.ts`：取值口（附件目录）与包含判定同住一件，
// 不再是这里的一段字符串前缀比对。

/** #830 · **HELP 的字段名 → 本命令面认的名**（一处定义；口径出处 `t837-命令面口径.md` §实施约束：
 *  「字段名以 HELP 为准，不自造第二个说法」）。三条写命令是五域共用的，故这张表住字段政策这一层。
 *
 *  等价关系都有权威出处：`content` 是老 `add`／`update` 的正式参数名（`memo_cli.py` 的
 *  `p_add.add_argument("content")`／`p_update.add_argument("--content")`），本命令面把题／文两个入口
 *  收敛到 `content` 单列（正文优先），故 `content` ≡ `body`；`sub_category`／`reminder_id` 同理。
 *  映射只**补缺**：实现名给了就以它为准（老面照旧能跑），HELP 名给了即当同一个槽位。 */
const HELP_FIELD_ALIASES: readonly (readonly [string, string])[] = [
  ['content', 'body'],
  ['sub_category', 'sub'],
  ['reminder_id', 'reminderId'],
];

export function withHelpFieldNames(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...params };
  for (const [helpName, commandName] of HELP_FIELD_ALIASES) {
    if (out[commandName] === undefined && out[helpName] !== undefined) out[commandName] = out[helpName];
  }
  return out;
}

export function crudUpdate(input: { id?: unknown }): { id: number } {
  return { id: needId(input.id, '更新') };
}

export function crudRemove(input: { id?: unknown; confirm?: unknown }): { id: number } {
  const id = needId(input.id, '删除');
  if (input.confirm !== true) throw new MemoPolicyError('POLICY_BAD_INPUT', '真删须 confirm:true（废弃提醒走 abandon）');
  return { id };
}
