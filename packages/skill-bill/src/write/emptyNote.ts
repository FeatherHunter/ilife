/** 空态（写入域每张页的空手那一格，**唯一定义地**）：候选为空、无记录可改、三要素没给时给一句**下一步**。
 *
 * 谁在用（按实际写，别写名义调用点）：
 *   ① `src/write/collect.ts`——过程型采集页：账户候选一个都没有时出一格（`collect.ts:211`，本件真调用点）；
 *   ② **本票没有第二个调用点**：回执页的明细段恒有行，`src/write/receipt.ts` 不引本件（件头原来写它
 *      「那一处还没有空手面」，那是名义调用点，按实际改掉）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位；撤销／恢复的候选为空也走同一件）。
 *  本票实测：本包 `src/` 下真引用本件的只有 `collect.ts` 一处。
 *
 * 本件只做一件事：把 base 的 `renderEmptyBlock` 包一层，锁住**「必须给下一步」**这条口径——
 *  只有 `text`（现在是什么都没有）没有 `next`（接下来怎么办）的空态，是让人干瞪眼的那种，本仓不出。
 *  这一条是硬约定：`next` 为空即抛错，不静默降级成一句安慰话。
 */
import { renderEmptyBlock } from 'base-paint/blocks';

/** 空态入参：`next`＝下一步（必填，非空）。 */
interface EmptyNoteInput {
  /** 空态小标题（如「没有可选的历史账户」）。 */
  readonly title?: string;
  /** 现在是什么都没有。 */
  readonly text: string;
  /** 接下来怎么办（必填：一句能照着做的下一步）。 */
  readonly next: string;
  /** 可选的补救动作 HTML（受信透传，由调用方用 base 件拼好）。 */
  readonly actionHtml?: string;
}

/** 空态区块：一句「什么都没有」＋ 一句「接下来怎么办」。 */
export function emptyNote(input: EmptyNoteInput): string {
  if (typeof input.next !== 'string' || input.next.trim() === '') {
    throw new Error('emptyNote: next 不能为空（空态必须给一句下一步）');
  }
  return renderEmptyBlock({
    ...(input.title === undefined ? {} : { title: input.title }),
    text: input.text,
    hint: input.next,
    ...(input.actionHtml === undefined ? {} : { actionHtml: input.actionHtml }),
  });
}
