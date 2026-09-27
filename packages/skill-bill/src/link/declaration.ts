/** #721 · 联动域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余（首行的“帮我…”提为第二段）；
 * 参数行 `____`→`{{name}}`，标签去格式／枚举，`kind` 按前端最舒服的输入选（金额 `number` 数字键盘，
 * 开放名 `text`，封闭枚举 `select`；本域无日期／周实例）。
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
          title: '买东西联动',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「买东西」。\n\n我买了东西，要记一笔支出并联动录入物品。\n\n金额:{{amount}}\n物品:{{item}}\n分类(选填):{{category}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位，如 299', required: true, kind: 'number' },
            { name: 'item', label: '物品', value: '', hint: '如 空气炸锅', required: true, kind: 'text' },
            { name: 'category', label: '分类(选填)', value: '', hint: '空＝居家/家电', required: false, kind: 'text' },
          ],
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
          title: '吃饭联动',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「吃饭」。\n\n我吃了一顿，要记一笔餐饮支出并联动卡路里。\n\n金额:{{amount}}\n吃了:{{meal}}\n分类(选填):{{category}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位，如 35', required: true, kind: 'number' },
            { name: 'meal', label: '吃了', value: '', hint: '如 午饭鸡腿饭', required: true, kind: 'text' },
            { name: 'category', label: '分类(选填)', value: '', hint: '空＝餐饮', required: false, kind: 'text' },
          ],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'link_1', label: '联动', scenes: ['link_purchase', 'link_meal'] },
  ],
};
