/** 类型徽章（写入域每张页都有的第二件，**唯一定义地**）：报「这一页是哪条唤醒词、什么口径、什么状态、下一步做什么」。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/` 的 16 件场景件——过程型采集页：第三枚形状报「还没写库」（红档）；
 *   ② 同一批场景件的回执页——第三枚形状报「这一笔已保存」（绿档）。
 *  本票实测：本包 `src/` 下真引用本件的就是上面这批调用点，再无第三处。
 *
 * **不再拼分隔符串**（本轮的根因二）：改前是一行字符串
 *  `记支出 · 支出（金额取负数） · bill.record.add · 待补槽位 · 未写库（已阻断）`——
 *  一句话里塞了方向口径／命令身份／槽位状态／写库状态四件不同的东西。现在拆成**若干枚独立形状**，
 *  每枚承载一件事：
 *    ① 唤醒词标签（`renderChips` 一枚胶囊）；
 *    ② 这一页的口径（同一枚胶囊里的第二段；型认得出就说方向，认不出就说「分类按三级挂靠」）；
 *    ③ 页面状态徽章（`renderStatusBadge`，四档之一）；
 *    ④ 下一步动作（`renderCaliberLine` 一行）；
 *  命令身份（`bill.record.add`／`bill.record.update`）**从用户可见处去掉**（照上级裁定第 1 条）：
 *  它只活在复制给助手的载荷里，页面正文与徽章一个字都不印。
 *  用户说法取自 `./userWording.js`（**唯一映射地**）：本件不另写第二份对照表。
 *
 * 一型的那句方向口径（「记支出要负数」／「记收入要正数」）**不在这里另写一份**：取值走
 *  `./summaryRow.ts` 的 `directionOf`（符号即方向只有那一处定义），本件只把它摆进第二枚形状。
 *
 * 对外四件（铁律五「不多于五个」）：`typeBadge`／`TypeBadgeInput`／`wakeWordOf`／`nextStepOf`（后两者转出给场景件与页标题用，
 *  定义仍在 `./userWording.js` 那一处）。
 *
 * 口径出处：`docs/skills/skill-bill/t407-页面块清单-16词.md` 第一节第 2 行 ＋ 第二节「类型徽章」列
 *  ＋ `docs/skills/skill-bill/t407-文字审查.md` 第三节第 1 条（该改的判法与最小改法）。
 */
import { renderStatusBadge } from 'base-paint';
import type { StatusKind } from 'base-paint';
import { renderCaliberLine, renderChips } from 'base-paint/blocks';
import { directionOf } from './summaryRow.js';
import { statusNoteOf, wakeWordOf } from './userWording.js';

export { wakeWordOf } from './userWording.js';
export { nextStepOf } from './userWording.js';

/** 类型徽章的入参。 */
export interface TypeBadgeInput {
  /** `params.kind`（空串＝没有 preset 的「记一笔」）。 */
  readonly kind: string;
  /** 四档之一：`ok`＝已写库、`warn`＝待补、`danger`＝已阻断、`empty`＝无数据。 */
  readonly status: StatusKind;
  /** 这一页现在是什么状态（内部状态串；用户说法走 `./userWording.js` 的 `statusNoteOf`）。 */
  readonly state: string;
  /** 「下一步动作」那枚形状那句话（取值走 `./userWording.js` 的 `nextStepOf`）。 */
  readonly next: string;
}

/** 第二枚形状那句话：型认得出就说方向，认不出就说分类挂靠（不再印「本仓尚未定额的型」这种内部话）。
 *  第 3 轮返工：型认得出时不再把方向词抄一遍（唤醒词那枚已经写了「记支出」），只留「金额取负数」这一半。 */
function caliberOf(kind: string): string {
  const d = directionOf(kind);
  if (d !== undefined) return '金额取' + (d.sign < 0 ? '负' : '正') + '数';
  if (kind.trim() === '') return '方向按金额符号判';
  return '分类按三级挂靠';
}

/** 类型徽章：唤醒词标签 ＋ 这一页的口径 ＋ 页面状态徽章 ＋ 下一步动作。四枚形状各自独立，不拼分隔符串。
 *  R3 分行：下一步动作那句按整句拆行（句号断开），一句一行口径；单句页仍只出一行，形状不变。
 *  第 3 轮返工（上级裁定第 3 条）：头两枚原先挤在**一枚**胶囊里、中间用全角空格串
 *  （`记支出　支出 金额取负数`——一件事排了三件，且「记支出／支出」两段重字），
 *  现在拆成两枚：`记支出` 一枚、`金额取负数` 一枚；口径那句不再重复唤醒词里已有的方向词。 */
export function typeBadge(input: TypeBadgeInput): string {
  const kind = typeof input.kind === 'string' ? input.kind : '';
  const state = statusNoteOf(input.state);
  const caliber = caliberOf(kind);
  const parts = [
    renderChips({
      items: caliber === '' ? [{ text: wakeWordOf(kind) }] : [{ text: wakeWordOf(kind) }, { text: caliber }],
    }),
    renderStatusBadge(state === '' ? { status: input.status } : { status: input.status, text: state }),
  ];
  const next = input.next.trim();
  if (next !== '') {
    const lines = next.split('。').map((s) => s.trim()).filter((s) => s !== '');
    for (const line of lines) parts.push(renderCaliberLine(line + '。'));
  }
  return parts.join('');
}
