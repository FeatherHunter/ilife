/** base-render · 词条表（**终端语言 en**：回退链最后一站，DSH 宿主口径）。
 *
 *  与 zh.ts 的 key **一一对应**（缺哪一条就走回退链，兜底是 zh 那一句——不是空串）。
 *  英文按需：只翻本包已接词条的渲染位，逐句对应，不做全量。
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
  /* ── blocks.ts（区块渲染；#1232 迁入） ── */
  'base-render.blocks.c001': 'No data',
  'base-render.blocks.c002': 'Copy instruction',
  'base-render.blocks.c003': 'renderDetailSection: types[] element text',
  'base-render.blocks.c004': 'Written at ',
  'base-render.blocks.c005': '/* literal from the design reference · authorized copy: #f3ecdc (track background; the same one-off literal as `--pill` in spec §1) */',
  'base-render.blocks.c006': '/* literal from the design reference · authorized copy: #c96f3f (gradient start of the share bar; source: design reference `.scale-fill`; not listed in spec §1, to be folded into the skin) */',
  'base-render.blocks.c007': '/* base-paint block style asset · #104 · 12 sections */',
  'base-render.blocks.c008': 'Not recorded',
  'base-render.blocks.c009': 'Short by {p1}{p2}',
  'base-render.blocks.c010': 'To fix: ',
  'base-render.blocks.c011': 'In development',
  /* ── contract.ts（渲染契约；#1232 迁入） ── */
  'base-render.contract.c001': 'Not installed [{p1}]. Please install it and try again.',
};
