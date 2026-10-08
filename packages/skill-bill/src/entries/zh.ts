/** skill-bill · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
 *
 *  归属：本包自己的命名空间（ADR-0004 §3「词条随包存放，命名空间＝包名」）。
 *  key 形态（第一轮＝**派生命名**，见地图 #1197 决定记录）：<件名>.<位置>.<键>——
 *  件名取场景件名，位置取该词在 InstallmentSpec 里那一格。
 *
 *  不变量：本表的中文值**逐字等于改造前写死在场景件里的字面量**——所以不启用多语言时产物逐字节不变。
 *  首批 28 条（#1204 首迁件 `write/scene-installment.ts` 的全部用户可见文案；参数名
 *  `total`／`periods`／`start_date` 是槽位标识、命令键冻结，二者都不进本表）。
 */
export const zh = {
  /* ── 记分期场景（write/scene-installment.ts）── */
  'installment.family': '特殊收支族',
  'installment.total.label': '总额',
  'installment.total.hint': '总价，如 1200',
  'installment.total.why': '没给：不分总额就摊不了期',
  'installment.periods.label': '期数',
  'installment.periods.hint': '分几期，如 12',
  'installment.periods.why': '没给：分几期由用户定，不许默认',
  'installment.first-date.label': '首期日',
  'installment.first-date.hint': '第 1 期哪一天，如 2026-10-01',
  'installment.first-date.why': '没给：首期日不定就算不出每期日期',
  'installment.section1': '先看这一笔缺什么',
  'installment.chips.tail-diff': '尾差归最后一期',
  'installment.chips.total-check': '合计等于总价',
  'installment.section2': '分期参数只供核对',
  'installment.description': '参数只供核对，改值重说。',
  'installment.section3': '分摊预览',
  'installment.no-shares-chip': '三样齐了才算得出分摊',
  'installment.fold-title': '还缺什么，以及补齐后照抄的那条',
  'installment.prompt-label': '照这个口径逐期记，点这颗复制',
  'installment.prompt-label-blocked': '补齐后照这句跟助手说一遍',
  'installment.receipt.state': '写库成功',
  'installment.receipt.next': '这一笔已记下，撤销见下方按钮。',
  'installment.receipt.rows-label': '这次记了几笔',
  'installment.receipt.rows-detail': '按库里的改动算',
  'installment.receipt.periods-label': '分期参数',
  'installment.receipt.feedback-detail': '每期日期＝每月同日，该月没有那一天就回退月末。改期数走「改记录」。',
  'installment.receipt.no-shares-chip': '缺分期参数，未分摊，这一笔仍已记下',
  'installment.receipt.caption': '写进去的项与值',
};
