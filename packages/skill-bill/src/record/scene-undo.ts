/** 场景件：撤销（`op=undo`）。
 *
 * 服务哪条唤醒词：撤销（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { op: 'undo' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：批量与修正族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「撤销」那一行）：
 *   类型徽章（软删打标 G7）、候选单选（列出可撤销记录）、打标说明（不物理删）、复制指令块、动作区、空态、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'undo',
  wakeWord: '撤销',
  key: 'bill.record.update',
  kind: '',
  op: 'undo',
  family: '批量与修正族',
  collect: collectBody,
  receipt: receiptBody,
};
