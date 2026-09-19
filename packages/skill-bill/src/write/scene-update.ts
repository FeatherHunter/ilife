/** 场景件：改记录（`bill.record.update` 的缺省那一支，`op` 空＝改字段）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页分**三形态**（缺编号先挑一条／那一条已撤销过／带编号出确认面），选定之后中段出
 *  **原记录只读回显 ＋ 改前改后对照**（改哪几个字段取自槽位表，`id`／`op` 两格不算）；采集页不出摘要行后那一行口径，
 *  回执页出「改前改后对照落在写库前那一面」那句，也不出撤销／恢复那种结果表。
 */
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages } from './template-update.js';

const WAKE: string = projectWakeWord({ key: 'bill.record.update' });
const KEY = 'bill.record.update';

export const SCENE: Scene = {
  id: 'update',
  key: KEY,
  kind: '',
  op: '',
  family: '批量与修正族',
  ...bindUpdatePages({
    wake: WAKE,
    key: KEY,
    collectState: (page) => (page.id === null ? '三形态之一：缺记录编号 · 先挑一条' : '待核对 · 未写库'),
    confirmTitle: '确认改动',
    caliber: '',
    middle: {
      pick: { mode: 'update' },
      markedCaption: () => '这一条记录　已撤销过，只读回显',
      marked: {
        kind: 'note',
        title: '这一条已经撤销过',
        text: (page) => '记录编号 ' + page.id + ' 在 ' + page.deletedAt + ' 撤销过，改记录这一支不动已撤销的记录。',
        next: '要它回到库里就说「恢复」，恢复之后再改。要改别的记录就换一个编号。',
      },
      noRowTitle: '这个编号没有记录',
      noRowText: (page) => '记录编号 ' + page.id + ' 在库里一条都没读到。',
      plainCaption: (page) => '原记录　只读回显　记录编号 ' + page.rowId,
      plain: { kind: 'diff', caption: '改前改后对照（本次打算改的那几项）' },
    },
    prompt: (page) => {
      if (page.id === null) return '这一页先不写库。挑一条记录，说清要改哪一项、改成什么，再跟助手说一遍「改记录」。';
      if (page.deleted) return '记录编号 ' + page.id + ' 那一条已经撤销过，改记录这一支不动它。\n'
        + '要它回到库里就说「恢复」：' + commandLine(KEY, { op: 'restore', id: page.id }) + '。';
      if (page.rowId === null) return '记录编号 ' + page.id + ' 在库里读不到，可能已不在这个库。\n'
        + '核一下编号，或先说清是哪一笔，再跟助手说一遍「改记录」。';
      return '原记录与改动对照都在下面：核一眼「原值／新值」，没问题就照这条说。\n'
        + commandLine(KEY, page.params);
    },
    receiptStatus: 'ok',
    receiptNext: '这一笔已记下，撤销见下方按钮。',
    receiptCaliber: '这一页只报写后的真值，改前改后对照落在写库前那一面。',
    receiptResult: 'none',
    receiptExit: 'undo',
  }),
};
