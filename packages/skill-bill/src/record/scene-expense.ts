/** 场景件：记支出（`kind=expense`）。
 *
 * 服务哪条唤醒词：记支出（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'expense' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：基础收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记支出」那一行）：
 *   类型徽章（支出·金额取负数）、字段卡（三级分类＋心法）、结论摘要行、复制指令块、动作区、空态、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'expense',
  key: 'bill.record.add',
  kind: 'expense',
  op: '',
  family: '基础收支族',
  collect: collectBody,
  receipt: receiptBody,
};
