/** 类型徽章（写入域每张页都有的第二件，**唯一定义地**）：报「这一页是哪条唤醒词、哪一型、哪条命令、什么状态」。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/collect.ts`——过程型采集页：`typeBadge` 报「待补槽位 · 未写库」（红档）；
 *   ② `src/record/receipt.ts`——结果型回执整页：同一件，报「写库成功」（绿档）。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面两个调用点，再无第三处。
 *
 * 一型的那句方向口径（「记支出要负数」／「记收入要正数」）**不在这里另写一份**：取值走
 *  `./summaryRow.ts` 的 `directionOf`（符号即方向只有那一处定义），本件只负责把唤醒词／方向／状态拼成徽章。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 2 行 ＋ 第二节「类型徽章」列。
 */
import { renderStatusBadge } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { directionOf } from './summaryRow.js';

/** 一型一句话：代表唤醒词（施工图第二节「类型徽章」列逐条抄来）。方向那句由 `directionOf` 补，不抄在这里。 */
const KIND_WAKE_WORDS: Record<string, string> = {
  expense: '记支出',
  income: '记收入',
  photo: '拍账单',
  batch: '批量录入',
  refund: '记退款',
  reimburse: '记报销',
  'reimburse-done': '报销到账',
  lend: '记借出',
  borrow: '记借入',
  collect: '记收回',
  repay: '记偿还',
  installment: '记分期',
};

/** 无 preset 的那一条（记一笔）：方向按金额符号判，不由唤醒词定。 */
const PLAIN_TYPE = { wakeWord: '记一笔', note: '按金额符号判支出／收入' };

/** 类型徽章的入参。 */
export interface TypeBadgeInput {
  /** `params.kind`（空串＝没有 preset 的「记一笔」）。 */
  readonly kind: string;
  /** 命令名（对外全名，如 `bill.record.add`）。 */
  readonly key: string;
  /** 四档之一：`ok`＝已写库、`warn`＝待补、`danger`＝已阻断、`empty`＝无数据。 */
  readonly status: StatusKind;
  /** 这一页现在是什么状态（如「待补槽位 · 未写库」／「写库成功」）。 */
  readonly state: string;
}

/** 类型徽章：报「这一页是哪条唤醒词、哪一型、哪条命令、什么状态」。
 *  一型的方向口径（支出负数／收入正数）取自 `./summaryRow.ts` 的 `directionOf`，本件不另写一份。 */
export function typeBadge(input: TypeBadgeInput): string {
  const kind = typeof input.kind === 'string' ? input.kind : '';
  const d = directionOf(kind);
  const wakeWord = kind === '' ? PLAIN_TYPE.wakeWord : (KIND_WAKE_WORDS[kind] ?? kind);
  const note = d === undefined
    ? (kind === '' ? PLAIN_TYPE.note : '本仓尚未定额的型')
    : d.word + '（金额取' + (d.sign < 0 ? '负' : '正') + '数）';
  return renderStatusBadge({
    status: input.status,
    text: wakeWord + ' · ' + note + ' · ' + input.key + ' · ' + input.state,
  });
}
