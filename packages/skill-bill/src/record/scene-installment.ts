/** 场景件：**记分期**（`kind=installment`）——本件只是差异声明，块位序列住 `./template-installment.ts`。
 *
 * 本件的差异（老侧 `templates/写入/installment_confirm.html:41-66` 与 `scripts/render_write.py:466`）：
 *   ① 分摊三格（总额／期数／首期日）在本型的槽位表之外，参数名与中文名照域声明，本件把它们交给模板；
 *   ② 缺项那三句「为什么写不进去」逐格写法不同（不分总额就摊不了期／分几期由用户定／首期日不定就算不出日期）；
 *   ③ 期数角标五枚：前三枚是三格的中文名，后两枚是尾差与合计的口径。
 */
import { wakeWordOf } from '../shared/typeBadge.js';
import type { Scene } from './scene.js';
import { bindInstallmentPages } from './template-installment.js';

const KIND = 'installment';
const WORD: string = wakeWordOf(KIND);

export const SCENE: Scene = {
  id: 'installment',
  key: 'bill.record.add',
  kind: KIND,
  op: '',
  family: '特殊收支族',
  ...bindInstallmentPages({
    word: WORD,
    kind: KIND,
    totalName: 'total',
    totalLabel: '总额',
    totalHint: '总价，如 1200',
    totalWhy: '没给：不分总额就摊不了期',
    periodsName: 'periods',
    periodsLabel: '期数',
    periodsHint: '分几期，如 12',
    periodsWhy: '没给：分几期由用户定，不许默认',
    firstDateName: 'start_date',
    firstDateLabel: '首期日',
    firstDateHint: '第 1 期哪一天，如 2026-10-01',
    firstDateWhy: '没给：首期日不定就算不出每期日期',
    section1: '先看这一笔缺什么',
    chips: ['总额', '期数', '首期日', '尾差归最后一期', '合计等于总价'],
    section2: '分期参数只供核对',
    description: '参数只供核对，改值重说。',
    section3: '分摊预览',
    noSharesChip: '三样齐了才算得出分摊',
    foldTitle: '还缺什么，以及补齐后照抄的那条',
    promptLabel: '照这个口径逐期记，点这颗复制',
    promptLabelBlocked: '补齐后照这句跟助手说一遍',
    receiptState: '写库成功',
    receiptNext: '这一笔已记下，撤销见下方按钮。',
    receiptRowsLabel: '这次记了几笔',
    receiptRowsDetail: '按库里的改动算',
    receiptPeriodsLabel: '分期参数',
    receiptFeedbackDetail: '每期日期＝每月同日，该月没有那一天就回退月末。改期数走「改记录」。',
    receiptNoSharesChip: '缺分期参数，未分摊，这一笔仍已记下',
    receiptCaption: '写进去的项与值',
  }),
};
