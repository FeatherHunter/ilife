/** 场景件：撤销（`op=undo`）——本件只是差异声明，块位序列住 `./template-update.ts`。
 *
 * 本件的差异：采集页的候选只列**没撤销过的**那些，选中之后只出只读回显（不出 diff 表）；
 *  摘要行之后那一行口径说清「撤销只打标、不删数据、要回来就说恢复」（采集页与回执页各出一处，同一句只写一份）；
 *  回执页出「撤销标记」那张对照表，退出口给的是「恢复这一笔」。
 */
import { commandLine } from '../shared/writeParts.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindUpdatePages, blockedStateOf, missingRowText } from './template-update.js';

/** 撤销这件事那句说明（采集页与回执页各出一处，同一句话只写在这里一份）。 */
const SOFT_DELETE_NOTE = '撤销只打标，不删数据，记录还在库里。'
  + '撤销过的那一笔不算进查询和统计，要回来就说「恢复」。';
const WAKE: string = projectWakeWord({ key: 'bill.record.update', op: 'undo' });
const KEY = 'bill.record.update';

export const SCENE: Scene = {
  id: 'undo',
  key: KEY,
  kind: '',
  op: 'undo',
  family: '批量与修正族',
  ...bindUpdatePages({
    wake: WAKE,
    key: KEY,
    collectState: blockedStateOf,
    confirmTitle: '确认撤销',
    caliber: SOFT_DELETE_NOTE,
    middle: {
      pick: { mode: 'undo', hint: '候选只列没撤销过的记录，挑一条即可。' },
      markedCaption: () => '这一条记录　已打标撤销，只读回显',
      marked: {
        kind: 'note',
        title: '这一条已经撤销过',
        text: (page) => '记录编号 ' + page.id + ' 在 ' + page.deletedAt + ' 已经撤销过了，这一支不再重复撤销。',
        next: '要它回到库里就说「恢复」。要撤别的记录就换一个编号。',
      },
      noRowTitle: '这个编号没有可撤销的记录',
      noRowText: missingRowText,
      plainCaption: (page) => '这一条就是要撤销的记录　只读回显　记录编号 ' + page.rowId,
      plain: { kind: 'none' },
    },
    prompt: (page) => {
      if (page.id === null) return '这一页先不写库。从候选里指定一条记录，再跟助手说一遍「撤销」。';
      if (page.deleted) return '记录编号 ' + page.id + ' 那一条已经撤销过，再撤一次无事可做。\n'
        + '要它回到库里就说「恢复」：' + commandLine(KEY, { op: 'restore', id: page.id }) + '。';
      return '这一条就是这次要撤销的目标。撤销只打标记、不删记录，撤完还能恢复。照这条说：\n'
        + commandLine(KEY, page.params);
    },
    receiptStatus: 'warn',
    receiptNext: '这一笔已标记撤销，记录还在。恢复见下方按钮。',
    receiptCaliber: SOFT_DELETE_NOTE,
    receiptResult: 'undo',
    receiptExit: 'restore',
  }),
};
