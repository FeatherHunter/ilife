/** #721 · 联动域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const LINK_DECLARATION: DomainDeclaration = {
  id: 'link',
  label: '联动',
  icon: '🔗',
  order: 6,
  entries: [
    {
      phrase: '买东西',
      key: 'bill.link.submit',
      preset: { scene: 'purchase' },
      scenes: [
        {
          id: 'link_purchase',
          title: '买东西联动(记账 + 录物品)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔买东西的账并联动录入(唤醒词:买东西):\n\n  金  额: ____\n  物  品: ____ (如:空气炸锅)\n  分  类: ____ (选填,默认居家/家电)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '吃饭',
      key: 'bill.link.submit',
      preset: { scene: 'meal' },
      scenes: [
        {
          id: 'link_meal',
          title: '吃饭联动(记账 + 记卡路里)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔吃饭的账并联动卡路里(唤醒词:吃饭):\n\n  金  额: ____\n  吃  了: ____ (如:午饭 鸡腿饭)\n  分  类: ____ (选填,默认餐饮)\n',
          types: ['采集'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'link_1', label: '联动', scenes: ['link_purchase', 'link_meal'] },
  ],
};
