/** 场景件：记偿还（`kind=repay`）。
 *
 * 服务哪条唤醒词：记偿还（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'repay' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记偿还」那一行）：
 *   类型徽章（偿还·消借入标）、流程三段式、候选单选（借入记录）、打标说明条、复制指令块、动作区、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'repay',
  wakeWord: '记偿还',
  key: 'bill.record.add',
  kind: 'repay',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
