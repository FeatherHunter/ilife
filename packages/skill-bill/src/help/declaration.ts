/** #721 · **HELP 位**的域声明（同形、无场景：4 条短语不进场景目录——防自指的规则只写一处）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const HELP_DECLARATION: DomainDeclaration = {
  id: 'help',
  order: 0,
  entries: [
    {
      phrase: '饼干记账 HELP',
      key: 'bill.help.lookup',
      scenes: [],
    },
    {
      phrase: '饼干记账帮助',
      key: 'bill.help.lookup',
      scenes: [],
    },
    {
      phrase: '查帮助',
      key: 'bill.help.lookup',
      scenes: [],
    },
    {
      phrase: '能做什么',
      key: 'bill.help.lookup',
      scenes: [],
    },
  ],
  subgroups: [],
};
