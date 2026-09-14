/** 场景件：改记录（`bill.record.update` 的缺省那一支，`op` 空＝改字段）。
 *
 * 服务哪条唤醒词：改记录（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里不带 `op` preset 的那一条）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：批量与修正族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「改记录」那一行）：
 *   类型徽章（改记录）、原记录只读回显、diff 表（字段／原值／新值）、候选单选（缺 id 时）、复制指令块、动作区、错误回执。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'update',
  wakeWord: '改记录',
  key: 'bill.record.update',
  kind: '',
  op: '',
  family: '批量与修正族',
  collect: collectBody,
  receipt: receiptBody,
};
