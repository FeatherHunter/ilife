/** 场景件：**批量录入**（`kind=batch`）——本件只是差异声明，块位序列住 `./template-batch.ts`。
 *
 * 本件的差异（老侧 `templates/写入/batch_confirm.html:47-68` 那一张采集页）：
 *   ① 单笔化：这一屏一次只落一笔，`params.rows` 给了就照它铺多行，没给＝本次参数就是唯一那一行；
 *   ② 逐行可编辑表以 `totalOf: 'amount'` 出合计行，缺项逐行标红（判定只此一处，住 `../shared/rowEditorTable.ts`）；
 *   ③ 账本与币种留空按缺省落库那条常驻浅色静态提示，页内动作只剩复制区那一组。
 *
 *  #1206 首切件（多语言文本外置）：本件的用户可见文案不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`sceneBatch(language)` 按语言取值，`SCENE` 是 `zh`
 *  的那一份（不启用多语言时与改造前逐字节相同）。其中回执状态与读数行标签复用记分期那两个 key
 *  （同句只一处定义，见本件 `receiptState`／`receiptRowsLabel`）；表名 `batch` 是页内控件名前缀、
 *  眉标是唤醒词（命令关键字冻结），都不进词条表。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG, type SkillBillMessageId } from '../entries/index.js';
import { nextStepOf } from './typeBadge.js';
import { wakeWordOfKind } from '../triggers/wakeTable.js';
import type { Scene } from './scene.js';
import { bindBatchPages } from './template-batch.js';

const WORD: string = wakeWordOfKind('batch');
const KEY = 'bill.record.add';

/** 按语言取本件的差异声明（key 拼错编译期红：`SkillBillMessageId` 从 zh 表派生）。 */
export function sceneBatch(language: string = 'zh'): Scene {
  const t = (id: SkillBillMessageId): string => resolve(SKILL_BILL_CATALOG, language, id);
  return {
    id: 'batch',
    key: KEY,
    kind: 'batch',
    op: '',
    family: t('batch.family'),
    ...bindBatchPages({
      word: WORD,
      kind: 'batch',
      section1: t('batch.section1'),
      caliber: t('batch.caliber'),
      foldNote: t('batch.fold-note'),
      section2: t('batch.section2'),
      tableName: 'batch',
      totalLabel: t('batch.total-label'),
      promptTitle: t('batch.prompt-title'),
      section3: t('batch.section3'),
      receiptState: t('installment.receipt.state'),
      receiptNext: nextStepOf({ page: 'receipt', exit: true }),
      receiptCaliber: t('batch.receipt-caliber'),
      receiptRowsLabel: t('installment.receipt.rows-label'),
      receiptCaption: t('batch.receipt-caption'),
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = sceneBatch('zh');
