/** 场景件：**记分期**（`kind=installment`）——本件只是差异声明，块位序列住 `./template-installment.ts`。
 *
 * 本件的差异（老侧 `templates/写入/installment_confirm.html:41-66` 与 `scripts/render_write.py:466`）：
 *   ① 分摊三格（总额／期数／首期日）在本型的槽位表之外，参数名与中文名照域声明，本件把它们交给模板；
 *   ② 缺项那三句「为什么写不进去」逐格写法不同（不分总额就摊不了期／分几期由用户定／首期日不定就算不出日期）；
 *   ③ 期数角标五枚：前三枚是三格的中文名，后两枚是尾差与合计的口径。
 *
 *  #1204 首迁件（多语言文本外置）：本件的用户可见文案不住这里，住 `../entries/zh.ts`（中文基准）
 *  与 `../entries/en.ts`（英文列）；`sceneInstallment(language)` 按语言取值，`SCENE` 是 `zh`
 *  的那一份（不启用多语言时与改造前逐字节相同）。期数角标前三枚**复用**三格中文名的 key
 *  （同一概念只一处定义，见本件头注③）。参数名（`total`／`periods`／`start_date`）是槽位标识、
 *  命令键冻结，二者都不进词条表。
 */
import { resolve } from 'base-entries';
import { SKILL_BILL_CATALOG, type SkillBillMessageId } from '../entries/index.js';
import { wakeWordOf } from './typeBadge.js';
import type { Scene } from './scene.js';
import { bindInstallmentPages } from './template-installment.js';

const KIND = 'installment';
const WORD: string = wakeWordOf(KIND);

/** 按语言取本件的差异声明（key 拼错编译期红：`SkillBillMessageId` 从 zh 表派生）。 */
export function sceneInstallment(language: string = 'zh'): Scene {
  const t = (id: SkillBillMessageId): string => resolve(SKILL_BILL_CATALOG, language, id);
  return {
    id: 'installment',
    key: 'bill.record.add',
    kind: KIND,
    op: '',
    family: t('installment.family'),
    ...bindInstallmentPages({
      word: WORD,
      kind: KIND,
      totalName: 'total',
      totalLabel: t('installment.total.label'),
      totalHint: t('installment.total.hint'),
      totalWhy: t('installment.total.why'),
      periodsName: 'periods',
      periodsLabel: t('installment.periods.label'),
      periodsHint: t('installment.periods.hint'),
      periodsWhy: t('installment.periods.why'),
      firstDateName: 'start_date',
      firstDateLabel: t('installment.first-date.label'),
      firstDateHint: t('installment.first-date.hint'),
      firstDateWhy: t('installment.first-date.why'),
      section1: t('installment.section1'),
      chips: [t('installment.total.label'), t('installment.periods.label'), t('installment.first-date.label'), t('installment.chips.tail-diff'), t('installment.chips.total-check')],
      section2: t('installment.section2'),
      description: t('installment.description'),
      section3: t('installment.section3'),
      noSharesChip: t('installment.no-shares-chip'),
      foldTitle: t('installment.fold-title'),
      promptLabel: t('installment.prompt-label'),
      promptLabelBlocked: t('installment.prompt-label-blocked'),
      receiptState: t('installment.receipt.state'),
      receiptNext: t('installment.receipt.next'),
      receiptRowsLabel: t('installment.receipt.rows-label'),
      receiptRowsDetail: t('installment.receipt.rows-detail'),
      receiptPeriodsLabel: t('installment.receipt.periods-label'),
      receiptFeedbackDetail: t('installment.receipt.feedback-detail'),
      receiptNoSharesChip: t('installment.receipt.no-shares-chip'),
      receiptCaption: t('installment.receipt.caption'),
      receiptEyebrow: WORD,
    }),
  };
}

export const SCENE: Scene = sceneInstallment('zh');
