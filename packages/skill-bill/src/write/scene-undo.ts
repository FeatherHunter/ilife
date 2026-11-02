/** 场景件：撤销（`op=undo`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页的候选只列**没撤销过的**那些，选中之后只出只读回显（不出 diff 表）；
 *  摘要行之后那一行口径说清「撤销只打标、不删数据、要回来就说恢复」（采集页与回执页各出一处，同一句只写一份）；
 *  回执页出「撤销标记」那张对照表，退出口给的是「恢复这一笔」。
 */
import { runWithLanguage } from 'base-entries';
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages, blockedStateOf, missingRowText } from './template-update.js';
import { m } from '../entries/index.js';

/** 撤销这件事那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。
 *  按语言取词（#1197）：模块加载期不取词，构建场景时才取。 */
function softDeleteNote(): string {
  return m('skill-bill.write-scene-undo.c001');
}
const WAKE: string = projectWakeWord({ key: 'bill.record.update', op: 'undo' });
const KEY = 'bill.record.update';

function buildScene(): Scene {
  return {
    id: 'undo',
    key: KEY,
    kind: '',
    op: 'undo',
    family: m('skill-bill.write-scene-undo.c002'),
    ...bindUpdatePages({
      wake: WAKE,
      key: KEY,
      collectState: blockedStateOf,
      confirmTitle: m('skill-bill.write-scene-undo.c003'),
      caliber: softDeleteNote(),
      middle: {
        pick: { mode: 'undo', hint: m('skill-bill.write-scene-undo.c004') },
        markedCaption: () => m('skill-bill.write-scene-undo.c005'),
        marked: {
          kind: 'note',
          title: m('skill-bill.write-scene-undo.c006'),
          text: (page) => m('skill-bill.write-scene-undo.c007', { p0: String(page.id), p1: String(page.deletedAt) }),
          next: m('skill-bill.write-scene-undo.c008'),
        },
        noRowTitle: m('skill-bill.write-scene-undo.c009'),
        noRowText: missingRowText,
        plainCaption: (page) => m('skill-bill.write-scene-undo.c010', { p0: String(page.rowId) }),
        plain: { kind: 'none' },
      },
      prompt: (page) => {
        if (page.id === null) return m('skill-bill.write-scene-undo.c011');
        if (page.deleted) return m('skill-bill.write-scene-undo.c012', {
          p0: String(page.id),
          p1: String(commandLine(KEY, { op: 'restore', id: page.id })),
        });
        return m('skill-bill.write-scene-undo.c013', { p0: String(commandLine(KEY, page.params)) });
      },
      receiptResult: 'undo',
      receiptExit: 'restore',
      receiptBrand: m('skill-bill.write-scene-undo.c014', { p0: String(WAKE) }),
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneUndo(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
