/** 场景件：恢复（`op=restore`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页的候选**只列已经撤销过的**那些（`recordPicker` 的 `mode='restore'`），选中之后出只读回显
 *  ＋ 一行「它现在带着撤销标记」的口径；摘要行之后那一行口径说清「恢复＝清掉标记、这一笔回到查询与统计」；
 *  回执页出「恢复结果」那张表（标记现值），退出口给的是「撤销这一笔」。
 */
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages, blockedStateOf, missingRowText } from './template-update.js';

/** 恢复这件事那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。 */
const RESTORE_NOTE = '恢复就是清掉那个撤销标记，这一笔回到查询和统计里。'
  + '候选只列已经撤销过的记录，没撤销过的不进来。';
const WAKE: string = projectWakeWord({ key: 'bill.record.update', op: 'restore' });
const KEY = 'bill.record.update';

export const SCENE: Scene = {
  id: 'restore',
  key: KEY,
  kind: '',
  op: 'restore',
  family: '批量与修正族',
  ...bindUpdatePages({
    wake: WAKE,
    key: KEY,
    collectState: blockedStateOf,
    confirmTitle: '确认恢复',
    caliber: RESTORE_NOTE,
    middle: {
      pick: { mode: 'restore', hint: '候选只列已经撤销过的记录，挑一条即可。' },
      markedCaption: (page) => '这一条就是要恢复的记录　只读回显　记录编号 ' + page.rowId,
      marked: {
        kind: 'caliber',
        text: (page) => '它现在带着撤销标记，' + page.deletedAt + ' 撤销的。恢复之后标记清掉，这一笔回到查询和统计里。',
      },
      noRowTitle: '这个编号没有可恢复的记录',
      noRowText: missingRowText,
      plainCaption: () => '这一条记录　没撤销过，只读回显',
      plain: {
        kind: 'note', title: '这一条没撤销过',
        text: (page) => '记录编号 ' + page.id + ' 没有撤销标记，没有可清的东西。',
        next: '要撤它就说「撤销」。要改它就说「改记录」。',
      },
    },
    prompt: (page) => {
      if (page.id === null) return '这一页先不写库。从候选里指定一条已经撤销过的记录，再跟助手说一遍「恢复」。';
      if (!page.deleted) return '记录编号 ' + page.id + ' 那一条没撤销过，没有标记可清。\n'
        + '要撤它就说「撤销」：' + commandLine(KEY, { op: 'undo', id: page.id }) + '。';
      return '这一条就是这次要恢复的目标。恢复只把撤销标记清掉，别的项一概不动。照这条说：\n'
        + commandLine(KEY, page.params);
    },
    receiptStatus: 'ok',
    receiptNext: '这一笔已恢复正常，撤销见下方按钮。',
    receiptCaliber: '',
    receiptResult: 'restore',
    receiptExit: 'undo',
  }),
};
