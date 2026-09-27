/** #721 · 目标域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余；
 * 参数行 `____`→`{{name}}`。kind 设计：金额 `number`（支出负数规则进 hint，不另立类型）；
 * 月份／目标名 `text`（“本月／8月”“换手机”皆开放表达，硬套 `date` 会误杀）；
 * 截止日期 `text`（“12月底”非 ISO，`date` 只吃 YYYY-MM-DD）；
 * 分类 `text`（开放，不进 `select`）。
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「设定预算」。\n\n我要设定月度预算。不填分类就是总预算。\n\n金额:{{amount}}\n月份(选填):{{month}}\n分类(选填):{{category}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位，如 3000', required: true, kind: 'number' },
            { name: 'month', label: '月份(选填)', value: '', hint: '空＝本月起；如 本月、8月', required: false, kind: 'text' },
            { name: 'category', label: '分类(选填)', value: '', hint: '空＝总预算；如 餐饮', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「设定目标」。\n\n我要设定一个储蓄目标。\n\n目标:{{goal_name}}\n金额:{{amount}}\n截止日期(选填):{{deadline}}',
          types: ['采集'],
          editable_fields: [
            { name: 'goal_name', label: '目标', value: '', hint: '如 换手机、旅行基金', required: true, kind: 'text' },
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位，如 10000', required: true, kind: 'number' },
            { name: 'deadline', label: '截止日期(选填)', value: '', hint: '如 12月底', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看预算」。\n\n我想看预算执行情况。\n\n月份(选填):{{month}}',
          types: ['查看'],
          editable_fields: [
            { name: 'month', label: '月份(选填)', value: '', hint: '空＝本月；如 本月、8月', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看目标」。\n\n我想看储蓄目标进度。',
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
