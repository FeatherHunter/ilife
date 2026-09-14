/** 场景件：恢复（`op=restore`）。
 *
 * 服务哪条唤醒词：恢复（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { op: 'restore' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：批量与修正族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「恢复」那一行）：
 *   类型徽章（恢复·置 NULL）、候选单选（列出已打标记录）、置空说明、复制指令块、动作区、空态、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'restore',
  wakeWord: '恢复',
  key: 'bill.record.update',
  kind: '',
  op: 'restore',
  family: '批量与修正族',
  collect: collectBody,
  receipt: receiptBody,
};
