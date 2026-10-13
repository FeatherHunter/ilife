/** #721 · 账户域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余。
 * kind 设计：金额 `number`；账户名／改法／转出入账户 `text`（用户自建账户名，开放，不进 `select`）；
 * 类型 `text` ＋ `source:'accountTypes'`（用户 2026-10-13 裁定，条目 19：候选＝**已有账户写过的类型**
 * 从 `goals.json` 生成期读一次，不是预置闭集；#977 那条「`select` 会锁死」按最新裁定作废，
 * 新类型在对话里直接说即可）；时间 `date`（只吃 YYYY-MM-DD，“现在”由执行侧解，hint 写空＝现在）。
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
            { name: 'account_type', label: '类型(选填)', value: '', hint: '点候选选用过的类型；要新的直接敲，再点「＋ 新建」', required: false, kind: 'text', source: 'accountTypes', empty_label: '不写类型', allow_new: true },
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
            { name: 'account', label: '账户', value: '', hint: '从账户表里选；列表里没有就先去新增账户', required: true, kind: 'text', source: 'accounts', create_scene: 'account_add' },
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
            { name: 'from_account', label: '从账户', value: '', hint: '从账户表里选；列表里没有就先去新增账户', required: true, kind: 'text', source: 'accounts', create_scene: 'account_add' },
            { name: 'to_account', label: '到账户', value: '', hint: '从账户表里选；列表里没有就先去新增账户', required: true, kind: 'text', source: 'accounts', create_scene: 'account_add' },
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
