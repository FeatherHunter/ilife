/** 场景件：恢复（`op=restore`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页的候选**只列已经撤销过的**那些（`recordPicker` 的 `mode='restore'`），选中之后出只读回显
 *  ＋ 一行「它现在带着撤销标记」的口径；摘要行之后那一行口径说清「恢复＝清掉标记、这一笔回到查询与统计」；
 *  回执页出「恢复结果」那张表（标记现值），退出口给的是「撤销这一笔」。
 */
import { runWithLanguage } from 'base-entries';
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages, blockedStateOf, missingRowText } from './template-update.js';
import { m } from '../entries/index.js';

/** 恢复这件事那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。
 *  按语言取词（#1197）：模块加载期不取词，构建场景时才取。 */
function restoreNote(): string {
  return m('skill-bill.write-scene-restore.c001');
}
const WAKE: string = projectWakeWord({ key: 'bill.record.update', op: 'restore' });
const KEY = 'bill.record.update';

function buildScene(): Scene {
  return {
    id: 'restore',
    key: KEY,
    kind: '',
    op: 'restore',
    family: m('skill-bill.write-scene-restore.c002'),
    ...bindUpdatePages({
      wake: WAKE,
      key: KEY,
      collectState: blockedStateOf,
      confirmTitle: m('skill-bill.write-scene-restore.c003'),
      caliber: restoreNote(),
      middle: {
        pick: { mode: 'restore', hint: m('skill-bill.write-scene-restore.c004') },
        markedCaption: (page) => m('skill-bill.write-scene-restore.c005', { p0: String(page.rowId) }),
        marked: {
          kind: 'caliber',
          text: (page) => m('skill-bill.write-scene-restore.c006', { p0: String(page.deletedAt) }),
        },
        noRowTitle: m('skill-bill.write-scene-restore.c007'),
        noRowText: missingRowText,
        plainCaption: () => m('skill-bill.write-scene-restore.c008'),
        plain: {
          kind: 'note', title: m('skill-bill.write-scene-restore.c009'),
          text: (page) => m('skill-bill.write-scene-restore.c010', { p0: String(page.id) }),
          next: m('skill-bill.write-scene-restore.c011'),
        },
      },
      prompt: (page) => {
        if (page.id === null) return m('skill-bill.write-scene-restore.c012');
        if (!page.deleted) return m('skill-bill.write-scene-restore.c013', {
          p0: String(page.id),
          p1: String(commandLine(KEY, { op: 'undo', id: page.id })),
        });
        return m('skill-bill.write-scene-restore.c014', { p0: String(commandLine(KEY, page.params)) });
      },
      receiptResult: 'restore',
      receiptExit: 'undo',
      receiptBrand: m('skill-bill.write-scene-restore.c015', { p0: String(WAKE) }),
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneRestore(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
