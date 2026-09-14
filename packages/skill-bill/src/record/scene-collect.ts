/** 场景件：记收回（`kind=collect`）。
 *
 * 服务哪条唤醒词：记收回（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'collect' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记收回」那一行）：
 *   类型徽章（收回·消借出标）、流程三段式、候选单选（借出记录）、打标说明条、复制指令块、动作区、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'collect',
  wakeWord: '记收回',
  key: 'bill.record.add',
  kind: 'collect',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
