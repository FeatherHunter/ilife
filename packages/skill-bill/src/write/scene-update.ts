/** 场景件：改记录（`bill.record.update` 的缺省那一支，`op` 空＝改字段）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页分**三形态**（缺编号先挑一条／那一条已撤销过／带编号出确认面），选定之后中段出
 *  **原记录只读回显 ＋ 改前改后对照**（改哪几个字段取自槽位表，`id`／`op` 两格不算）；采集页不出摘要行后那一行口径，
 *  回执页出「改前改后对照落在写库前那一面」那句，也不出撤销／恢复那种结果表。
 */
import { runWithLanguage } from 'base-entries';
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages } from './template-update.js';
import { m } from '../entries/index.js';

const WAKE: string = projectWakeWord({ key: 'bill.record.update' });
const KEY = 'bill.record.update';

function buildScene(): Scene {
  return {
    id: 'update',
    key: KEY,
    kind: '',
    op: '',
    family: m('skill-bill.write-scene-update.c001'),
    ...bindUpdatePages({
      wake: WAKE,
      key: KEY,
      collectState: (page) => (page.id === null ? 'pick-first' : 'review-pending'),
      confirmTitle: m('skill-bill.write-scene-update.c002'),
      caliber: '',
      middle: {
        pick: { mode: 'update' },
        markedCaption: () => m('skill-bill.write-scene-update.c003'),
        marked: {
          kind: 'note',
          title: m('skill-bill.write-scene-update.c004'),
          text: (page) => m('skill-bill.write-scene-update.c005', { p0: String(page.id), p1: String(page.deletedAt) }),
          next: m('skill-bill.write-scene-update.c006'),
        },
        noRowTitle: m('skill-bill.write-scene-update.c007'),
        noRowText: (page) => m('skill-bill.write-scene-update.c008', { p0: String(page.id) }),
        plainCaption: (page) => m('skill-bill.write-scene-update.c009', { p0: String(page.rowId) }),
        plain: { kind: 'diff', caption: m('skill-bill.write-scene-update.c010') },
      },
      prompt: (page) => {
        if (page.id === null) return m('skill-bill.write-scene-update.c011');
        if (page.deleted) return m('skill-bill.write-scene-update.c012', {
          p0: String(page.id),
          p1: String(commandLine(KEY, { op: 'restore', id: page.id })),
        });
        if (page.rowId === null) return m('skill-bill.write-scene-update.c013', { p0: String(page.id) });
        return m('skill-bill.write-scene-update.c014', { p0: String(commandLine(KEY, page.params)) });
      },
      receiptResult: 'none',
      receiptExit: 'undo',
      receiptBrand: m('skill-bill.write-scene-update.c015', { p0: String(WAKE) }),
    }),
  };
}

export const SCENE: Scene = buildScene();

/** 按语言重建本场景（#1197：文案经词条层，语言是运行期参数）。 */
export function sceneUpdate(language: string): Scene {
  return runWithLanguage(language, buildScene);
}
