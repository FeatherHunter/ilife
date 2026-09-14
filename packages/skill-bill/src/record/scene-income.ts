/** 场景件：记收入（`kind=income`）。
 *
 * 服务哪条唤醒词：记收入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'income' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：基础收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记收入」那一行）：
 *   类型徽章（收入·金额取正数）、字段卡（三级分类＋心法）、结论摘要行、复制指令块、动作区、空态、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'income',
  wakeWord: '记收入',
  key: 'bill.record.add',
  kind: 'income',
  op: '',
  family: '基础收支族',
  collect: collectBody,
  receipt: receiptBody,
};
