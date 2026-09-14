/** 场景件：拍账单（`kind=photo`）。
 *
 * 服务哪条唤醒词：拍账单（`src/policy/wakewords.ts` 的 `WAKE_TABLE` 里 `preset: { kind: 'photo' }`）。
 * 现在出哪张页：通用采集页（`./collectBody.ts`）＋ 通用回执页（`./receiptBody.ts`）——本票只搬不改行为。
 * 待哪一族窗口来填：特殊收支族。
 * 那一族要给的块（`docs/skills/skill-bill/t407-页面块清单-16词.md` 第二节「拍账单」那一行）：
 *   类型徽章（图片识别确认）、文字三要素填空（金额／分类／时间）、已收图片数说明、缺项阻断条、复制指令块、动作区。
 */
import { collectBody } from './collectBody.js';
import { receiptBody } from './receiptBody.js';
import type { Scene } from './scene.js';

export const SCENE: Scene = {
  id: 'photo',
  wakeWord: '拍账单',
  key: 'bill.record.add',
  kind: 'photo',
  op: '',
  family: '特殊收支族',
  collect: collectBody,
  receipt: receiptBody,
};
