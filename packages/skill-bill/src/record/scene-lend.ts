/** 场景件：记借出（`kind=lend`）。
 *
 * 服务哪条唤醒词：记借出（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'lend' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记借出」那一行）：
 *   类型徽章（借出·#借贷 流转）、流程三段式、候选单选、借出对象字段（借给谁）、期限字段、复制指令块、动作区。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'lend',
  wakeWord: '记借出',
  key: 'bill.record.add',
  kind: 'lend',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
