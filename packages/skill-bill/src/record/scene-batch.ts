/** 场景件：批量录入（`kind=batch`）。
 *
 * 服务哪条唤醒词：批量录入（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'batch' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：批量与修正族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「批量录入」那一行）：
 *   类型徽章（批量·现单笔化）、逐行可编辑表、合计行、缺项阻断条、账本缺省提示、复制指令块、动作区。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'batch',
  wakeWord: '批量录入',
  key: 'bill.record.add',
  kind: 'batch',
  op: '',
  family: '批量与修正族',
  collect: collectBody,
  receipt: receiptBody,
};
