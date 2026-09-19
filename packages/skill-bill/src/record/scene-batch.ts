/** 场景件：**批量录入**（`kind=batch`）——本件只是差异声明，块位序列住 `./template-batch.ts`。
 *
 * 本件的差异（老侧 `templates/写入/batch_confirm.html:47-68` 那一张采集页）：
 *   ① 单笔化：这一屏一次只落一笔，`params.rows` 给了就照它铺多行，没给＝本次参数就是唯一那一行；
 *   ② 逐行可编辑表以 `totalOf: 'amount'` 出合计行，缺项逐行标红（判定只此一处，住 `../shared/rowEditorTable.ts`）；
 *   ③ 账本与币种留空按缺省落库那条常驻浅色静态提示，页内动作只剩复制区那一组。
 */
import { nextStepOf } from '../shared/typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindBatchPages } from './template-batch.js';

const WORD: string = wakeWordOfKind('batch');
const KEY = 'bill.record.add';

export const SCENE: Scene = {
  id: 'batch',
  key: KEY,
  kind: 'batch',
  op: '',
  family: '批量与修正族',
  ...bindBatchPages({
    word: WORD,
    kind: 'batch',
    section1: '先看缺什么',
    caliber: '本批一次只落一笔。',
    foldNote: '补齐后照上面那条口令跟助手说一遍。',
    section2: '核对这一屏',
    tableName: 'batch',
    totalLabel: '这一屏合计',
    promptTitle: '这一段就是补齐后要发给助手的话',
    section3: '补齐了再请助手记',
    receiptState: '写库成功',
    receiptNext: nextStepOf({ page: 'receipt', exit: true }),
    receiptCaliber: '本批一次只落一笔，回执里的编号就是它。',
    receiptRowsLabel: '这次记了几笔',
    receiptCaption: '这一笔记成什么',
  }),
};
