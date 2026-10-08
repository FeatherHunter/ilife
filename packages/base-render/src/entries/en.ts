/** base-render · 词条表（**终端语言 en**：回退链最后一站，DSH 宿主口径）。
 *
 *  与 zh.ts 的 key **一一对应**（缺哪一条就走回退链，兜底是 zh 那一句——不是空串）。
 *  英文按需：本轮只翻这两处硬缝用到的词，逐句对应，不做全量。
 */
export const en = {
  /* ── progress-list（目标进度） ── */
  'progress-list.state.blank': 'Not recorded',
  'progress-list.state.on-track': 'In progress',
  'progress-list.state.done': 'Goal met',
  'progress-list.state.over': 'Over',
  'progress-list.remain': '{value}{unit} to go',
  'progress-list.over': 'Over by {value}{unit}',
  'progress-list.exact': 'Just reached',
  /* ── 状态徽章 ── */
  'status-badge.text.ok': 'Success',
  'status-badge.text.warn': 'Warning',
  'status-badge.text.danger': 'Failed',
  'status-badge.text.empty': 'No data',
};
