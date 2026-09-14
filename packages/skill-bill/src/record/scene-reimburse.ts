/** 场景件：记报销（`kind=reimburse`）。
 *
 * 服务哪条唤醒词：记报销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'reimburse' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记报销」那一行）：
 *   类型徽章（报销·打 #待报销）、字段卡（三级分类＋心法）、打标提示条、结论摘要行、复制指令块、动作区、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'reimburse',
  wakeWord: '记报销',
  key: 'bill.record.add',
  kind: 'reimburse',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
