/** #721 · 目标域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const GOAL_DECLARATION: DomainDeclaration = {
  id: 'goal',
  label: '目标',
  icon: '🎯',
  order: 4,
  entries: [
    {
      phrase: '设定预算',
      key: 'bill.goal.write',
      preset: { op: 'set-budget' },
      needs: ['amount'],
      scenes: [
        {
          id: 'goal_set_budget',
          title: '设定月度预算',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我设定月度预算(唤醒词:设定预算):\n\n  金  额: ____ (如:3000)\n  月  份: ____ (选填,如:本月 / 8月;默认本月起)\n  分  类: ____ (选填,如:餐饮;不填 = 总预算)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '设定目标',
      key: 'bill.goal.write',
      preset: { op: 'set-saving' },
      needs: ['name', 'amount'],
      scenes: [
        {
          id: 'goal_set_saving',
          title: '设定储蓄目标',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我设定储蓄目标(唤醒词:设定目标):\n\n  目  标: ____ (如:换手机 / 旅行基金)\n  金  额: ____ (如:10000)\n  截止日期: ____ (选填,如:12月底)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '看预算',
      key: 'bill.goal.query',
      preset: { op: 'budget' },
      scenes: [
        {
          id: 'goal_budget_status',
          title: '查看预算执行',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我看预算执行情况(唤醒词:看预算):\n\n  月  份: ____ (选填,如:本月 / 8月)\n',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '看目标',
      key: 'bill.goal.query',
      preset: { op: 'saving' },
      scenes: [
        {
          id: 'goal_saving_status',
          title: '查看目标进度',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我看储蓄目标进度(唤醒词:看目标):\n',
          types: ['查看'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'goal_1', label: '预算', scenes: ['goal_set_budget', 'goal_budget_status'] },
    { id: 'goal_2', label: '目标', scenes: ['goal_set_saving', 'goal_saving_status'] },
  ],
};
