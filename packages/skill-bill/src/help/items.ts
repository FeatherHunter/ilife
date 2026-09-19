/** HELP 交付面·现找条目（#689 结构搬迁第三批：从 `src/render/views.ts` 拆来）。
 *  一件事实：`bill.help.lookup` 的 list 载荷 `{ items, total }`——短语→key／shape／cli／一句话的快照
 *  由 `./lookup.js` 构建期注入 SKILL.md，本件只做运行时的按需过滤（`q` 空即全量）。
 *
 *  谁在用（指名）：`src/cli/cmd_read.ts` 的 `dispatchHelp`（HELP 交付，经 `./index.js` 门取）。 */
export interface HelpItem { phrase: string; key: string; shape: string; cli: string; desc: string; }

export function buildHelpItems(all: HelpItem[], q?: string): { items: HelpItem[]; total: number } {
  const items = !q || !q.trim() ? all : all.filter((h) => (q as string).includes(h.phrase) || h.phrase.includes((q as string).trim()));
  return { items, total: items.length };
}
