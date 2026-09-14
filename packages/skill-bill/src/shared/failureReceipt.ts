/** 失败回执（顶层回执那一件的口径，**唯一定义地**）：异常／缺项时替换正文的那一段。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/shared/blockedSlots.ts`—缺项阻断条里的那句「写库已阻断」由本件出（同一次渲染只用一段回执）；
 *   ② `src/record/receipt.ts`／`src/record/collect.ts` 的备用位——写库失败整页替换的那一支（本票还没有落点，见下）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 本件只管口径，不重造控件：本体是 `base-paint/blocks` 的 `renderFeedbackBlock`（含 `renderErrorReceipt`／`renderToast`）。
 *  锁住的那条口径：**消息句必填**（不许出一段没有事由的红块），`retryPrompt` 缺省写「补齐后重跑同一条命令」——
 *  本仓页面不写内联脚本，那段话是提示不是按钮动作。
 *
 * 本票没接线的一处（记成遗留，不装作做过）：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节末列
 *  把「JSON／状态异常、缺 id、参数不合法」也划给这个块。今天这些情形仍走 stderr ＋ 非 0 退出码
 *  （`test/record-write.test.mjs`「id 有值但不是记录编号 → 仍走口径失败」那条钉着这条行为），
 *  整页替换是后票的事；本票只把这一件冻好、并给它一个真落点（缺项阻断条）。
 */
import { renderFeedbackBlock } from 'base-paint/blocks';
import type { ErrorReceiptInput, ToastInput } from 'base-paint/blocks';

/** 失败回执的入参。 */
interface FailureInput {
  /** 区块小标题（缺省不写这一行）。 */
  readonly title?: string;
  /** 事由那一句（必填，非空）。 */
  readonly message: string;
  /** 出错后怎么重来（缺省「补齐后重跑同一条命令」）。 */
  readonly retryPrompt?: string;
  /** 可复制的数据文本（给了才出「复制数据」按钮）。 */
  readonly dataText?: string;
  /** 可复制的日志文本（给了才出「复制日志」按钮）。 */
  readonly logText?: string;
  /** 同时给一条提示条（与错误回执同容器；两样至少给一样）。 */
  readonly toast?: ToastInput;
}

/** 失败回执：一段错误回执（可选加一条提示条），整块交回调用方拼进页面。 */
export function failureReceipt(input: FailureInput): string {
  if (typeof input.message !== 'string' || input.message.trim() === '') {
    throw new Error('failureReceipt: message 不能为空（不许出一段没有事由的红块）');
  }
  const error: ErrorReceiptInput = {
    message: input.message,
    retryPrompt: input.retryPrompt === undefined || input.retryPrompt === '' ? '补齐后重跑同一条命令' : input.retryPrompt,
    ...(input.dataText === undefined ? {} : { dataText: input.dataText }),
    ...(input.logText === undefined ? {} : { logText: input.logText }),
  };
  return renderFeedbackBlock({
    ...(input.title === undefined ? {} : { title: input.title }),
    error,
    ...(input.toast === undefined ? {} : { toast: input.toast }),
  });
}
