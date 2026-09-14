/** 场景件：记一笔（`bill.record.add` 的通用词，名下没有预设 `kind`）。
 *
 * 服务哪条唤醒词：记一笔（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 **不带 preset** 的那一条，
 * 也是认不得的 `kind` 的兜底落点）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：基础收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「记一笔」那一行）：
 *   类型徽章（按金额符号判支出／收入）、字段卡（三级分类＋心法）、结论摘要行、复制指令块、动作区、空态、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'plain',
  wakeWord: '记一笔',
  key: 'bill.record.add',
  kind: '',
  op: '',
  family: '基础收支族',
  collect: collectBody,
  receipt: receiptBody,
};
