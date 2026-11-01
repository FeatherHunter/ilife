/** 场景件：**记报销**（`kind=reimburse`）——本件只是差异声明，块位序列住 `./template-expense.ts`。
 *
 * 本件的差异（老侧 `expense_form.html` 的记报销型那一支）：
 *   ① **支出型**：金额取负数，分类落支出侧（侧别判定住 `../shared/photoEscape.ts`）；
 *   ② **靠 `#待报销` 标记流转**：落库时在备注里带上它，后续「报销到账」按这个标签找这一笔；
 *      打标提示条与来源提示条各占独立一块（老侧两提示共一个容器互相覆盖，是施工图第四节第 9 条点名的缺陷）；
 *   ③ 采集页不出进度、第 1 段标题只在有缺项时出、预填标注走一整块（不打标记的「记一笔」走一行口径）；
 *   ④ 回执页多一条打标回执条与一条口径行，读数行后两格用共用件那句。
 */
import { runWithLanguage } from 'base-entries';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindExpensePages, sharedPrompt } from './template-expense.js';
import { m } from '../entries/index.js';

const WORD: string = wakeWordOfKind('reimburse');
const KEY = 'bill.record.add';
const TAG = '#待报销';

function buildScene(): Scene {
  return {
    id: 'reimburse',
    key: KEY,
    kind: 'reimburse',
    op: '',
    family: m('skill-bill.write-scene-reimburse.c001'),
    ...bindExpensePages({
      word: WORD,
      kind: 'reimburse',
      replaces: {
        amount: m('skill-bill.write-scene-reimburse.c002'),
        category: m('skill-bill.write-scene-reimburse.c003'),
      },
      progress: false,
      section1WhenBlockedOnly: true,
      section1: m('skill-bill.write-scene-reimburse.c004'),
      calibers: () => [],
      factsGrid: true,
      foldNote: m('skill-bill.write-scene-reimburse.c005', { p0: String(TAG) }),
      markNote: {
        msg: m('skill-bill.write-scene-reimburse.c006', { p0: String(TAG) }),
        detail: m('skill-bill.write-scene-reimburse.c007', { p0: String(TAG) }),
        icon: 'info',
      },
      prefill: 'note',
      emptyAccount: {
        text: m('skill-bill.write-scene-reimburse.c008'),
        next: m('skill-bill.write-scene-reimburse.c009'),
      },
      section2: '',
      description: m('skill-bill.write-scene-reimburse.c010', { p0: String(TAG) }),
      marksShape: 'full',
      prompt: (_input, blocked) => sharedPrompt(KEY, blocked),
      promptTitle: m('skill-bill.write-scene-reimburse.c011'),
      section3: '',
      subtitle: (_input, blocked) => m('skill-bill.write-scene-reimburse.c012', { p0: String(WORD), p1: String(blocked.length) }),
      logDetail: () => m('skill-bill.write-scene-reimburse.c013'),
      receiptState: m('skill-bill.write-scene-reimburse.c014'),
      receiptNext: () => m('skill-bill.write-scene-reimburse.c015'),
      receiptNotice: {
        msg: m('skill-bill.write-scene-reimburse.c016', { p0: String(TAG) }),
        detail: m('skill-bill.write-scene-reimburse.c017'),
        icon: 'ok',
      },
      receiptCaliber: m('skill-bill.write-scene-reimburse.c018', { p0: String(TAG) }),
      dropDefaultHints: false,
      cards: 'generic-reimburse',
      receiptCaption: m('skill-bill.write-scene-reimburse.c019'),
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneReimburse(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
