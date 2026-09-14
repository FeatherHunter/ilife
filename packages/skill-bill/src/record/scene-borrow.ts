/** 场景件：记借入（`kind=borrow`）。
 *
 * 服务哪条唤醒词：记借入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'borrow' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记借入」那一行）：
 *   类型徽章（借入·#借贷 流转）、流程三段式、候选单选、借入对象字段（向谁借）、期限字段、复制指令块、动作区。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'borrow',
  wakeWord: '记借入',
  key: 'bill.record.add',
  kind: 'borrow',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
