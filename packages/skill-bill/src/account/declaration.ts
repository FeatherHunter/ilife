/** #721 · 账户域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余。
 * kind 设计：金额 `number`；账户名／改法／转出入账户 `text`（用户自建账户名，开放，不进 `select`）；
 * 类型 `text`（“银行卡／支付／信用”只是例子，用户可自造类型，`select` 会锁死）；
 * 时间 `date`（只吃 YYYY-MM-DD，“现在”由执行侧解，hint 写空＝现在）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const ACCOUNT_DECLARATION: DomainDeclaration = {
  id: 'account',
  label: '账户',
  icon: '💳',
  order: 5,
  entries: [
    {
      phrase: '新增账户',
      key: 'bill.account.write',
      preset: { op: 'add' },
      needs: ['name'],
      scenes: [
        {
          id: 'account_add',
          title: '新增账户',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「新增账户」。\n\n我要新增一个账户。\n\n账户名:{{account_name}}\n类型(选填):{{account_type}}',
          types: ['采集'],
          editable_fields: [
            { name: 'account_name', label: '账户名', value: '', hint: '如 招行卡、花呗', required: true, kind: 'text' },
            { name: 'account_type', label: '类型(选填)', value: '', hint: '如 银行卡、支付、信用', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '改账户',
      key: 'bill.account.write',
      preset: { op: 'update' },
      needs: ['name'],
      scenes: [
        {
          id: 'account_update',
          title: '修改账户',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「改账户」。\n\n我要修改一个账户（如改名或停用）。\n\n账户:{{account}}\n改成什么:{{change}}',
          types: ['选择'],
          editable_fields: [
            { name: 'account', label: '账户', value: '', hint: '如 招行卡', required: true, kind: 'text' },
            { name: 'change', label: '改成什么', value: '', hint: '如 改名招行工资卡、停用', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '账户转账',
      key: 'bill.account.write',
      preset: { op: 'transfer' },
      needs: ['amount', 'from', 'to'],
      scenes: [
        {
          id: 'account_transfer',
          title: '账户间转账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「账户转账」。\n\n我要做一笔账户间转账。\n\n金额:{{amount}}\n从账户:{{from_account}}\n到账户:{{to_account}}\n时间(选填):{{transfer_time}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'from_account', label: '从账户', value: '', hint: '如 支付宝', required: true, kind: 'text' },
            { name: 'to_account', label: '到账户', value: '', hint: '如 招行卡', required: true, kind: 'text' },
            { name: 'transfer_time', label: '时间(选填)', value: '', hint: '空＝现在；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
          ],
        },
      ],
    },
    {
      phrase: '看账户汇总',
      key: 'bill.account.query',
      scenes: [
        {
          id: 'account_summary',
          title: '查看账户汇总',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看账户汇总」。\n\n我想看各账户汇总。',
          types: ['查看'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'account_1', label: '账户管理', scenes: ['account_add', 'account_update', 'account_transfer', 'account_summary'] },
  ],
};
