/** 场景件：**记一笔**（无 `preset` 的通用词，同时是认不得的 `kind` 的兜底）——本件只是差异声明，
 *  块位序列住 `./template-expense.ts`。兜底判定在 `./scene.ts` 的 `sceneFor` 第四条，本件不猜、不抛。
 *
 * 本件的差异（老侧无此页：老侧注册表到记分期为止）：
 *   ① **方向按金额符号判**：没有 preset，支出负数、收入正数都由金额本身说；分类候选两侧都给
 *      （`../shared/photoEscape.ts` 的侧别判定收到空串）；
 *   ② 采集页多一条「方向按金额符号判，不改符号」口径行，字段卡说明复述方向；
 *   ③ 回执页落值那三格不缀缺省说法（值已落库），后两格用本场景自己的简写。
 */
import { runWithLanguage } from 'base-entries';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, missingSubtitle, plainPrompt } from './template-expense.js';
import { m } from '../entries/index.js';

const WORD: string = wakeWordOfKind('plain');
const KEY = 'bill.record.add';

function buildScene(): Scene {
  return {
    id: 'plain',
    key: KEY,
    kind: '',
    op: '',
    family: m('skill-bill.write-scene-plain.c001'),
    ...bindExpensePages({
      word: WORD,
      kind: '',
      replaces: { amount: m('skill-bill.write-scene-plain.c002'), category: m('skill-bill.write-scene-plain.c003') },
      progress: true,
      section1WhenBlockedOnly: false,
      section1: m('skill-bill.write-scene-plain.c004'),
      calibers: () => [m('skill-bill.write-scene-plain.c005')],
      factsGrid: false,
      foldNote: m('skill-bill.write-scene-plain.c006'),
      prefill: 'caliber',
      emptyAccount: {
        text: m('skill-bill.write-scene-plain.c007'),
        next: m('skill-bill.write-scene-plain.c008'),
      },
      section2: m('skill-bill.write-scene-plain.c009'),
      description: m('skill-bill.write-scene-plain.c010'),
      marksShape: 'short',
      prompt: (_input, blocked) => plainPrompt(WORD, blocked),
      promptTitle: m('skill-bill.write-scene-plain.c011'),
      section3: m('skill-bill.write-scene-plain.c012'),
      subtitle: missingSubtitle,
      logDetail: () => m('skill-bill.write-scene-plain.c013'),
      receiptState: m('skill-bill.write-scene-plain.c014'),
      receiptNext: () => nextStepOf({ page: 'receipt', exit: true }),
      receiptCaliber: '',
      dropDefaultHints: true,
      cards: 'scene',
      receiptCaption: m('skill-bill.write-scene-plain.c015'),
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function scenePlain(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
