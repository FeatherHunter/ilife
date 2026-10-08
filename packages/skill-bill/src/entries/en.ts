/** skill-bill · 词条表（英文列：与 `zh.ts` 同 key，缺英文先留空串并在票面记英文待译——本批 28 条首迁即配齐英文）。
 *
 *  key 集合的权威是 `zh.ts`；拼错 key 编译期红（`SkillBillMessageId` 从 zh 派生，见 `index.ts`）。
 */
export const en = {
  /* ── 记分期场景（write/scene-installment.ts）── */
  'installment.family': 'Special income and expense',
  'installment.total.label': 'Total amount',
  'installment.total.hint': 'Total price, e.g. 1200',
  'installment.total.why': 'Missing: installments cannot be split without a total amount',
  'installment.periods.label': 'Number of installments',
  'installment.periods.hint': 'How many installments, e.g. 12',
  'installment.periods.why': 'Missing: the number of installments is up to you, no default is assumed',
  'installment.first-date.label': 'First due date',
  'installment.first-date.hint': 'Date of the first installment, e.g. 2026-10-01',
  'installment.first-date.why': 'Missing: per-installment dates cannot be computed without a first due date',
  'installment.section1': 'See what this entry is missing',
  'installment.chips.tail-diff': 'Rounding difference goes to the last installment',
  'installment.chips.total-check': 'Installments add up to the total price',
  'installment.section2': 'Installment parameters are for verification only',
  'installment.description': 'Parameters are read-only; tell me again with new values to change them.',
  'installment.section3': 'Installment preview',
  'installment.no-shares-chip': 'The split is computed once all three are given',
  'installment.fold-title': 'What is still missing, and the line to repeat once complete',
  'installment.prompt-label': 'Record each installment as stated; tap to copy',
  'installment.prompt-label-blocked': 'Once complete, repeat this line to the assistant',
  'installment.receipt.state': 'Saved to your ledger',
  'installment.receipt.next': 'This entry has been recorded; see the button below to undo.',
  'installment.receipt.rows-label': 'Entries recorded this time',
  'installment.receipt.rows-detail': 'Counted from actual ledger changes',
  'installment.receipt.periods-label': 'Installment parameters',
  'installment.receipt.feedback-detail': 'Each installment falls on the same day each month, or the last day of shorter months. To change the count, use the edit-entry command.',
  'installment.receipt.no-shares-chip': 'Installment parameters missing, not split; this entry is still recorded',
  'installment.receipt.caption': 'Saved fields and values',
};
