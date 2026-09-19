/** #721 · 账户域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
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
          prompt_template: '请加载「饼干记账」技能,帮我新增账户(唤醒词:新增账户):\n\n  账户名: ____ (如:招行卡 / 花呗)\n  类  型: ____ (选填,如:银行卡 / 支付 / 信用)\n',
          types: ['采集'],
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
          prompt_template: '请加载「饼干记账」技能,帮我修改账户(唤醒词:改账户):\n\n  账  户: ____ (如:招行卡)\n  改成什么: ____ (如:改名「招行工资卡」 / 停用)\n',
          types: ['选择'],
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
          prompt_template: '请加载「饼干记账」技能,帮我做账户间转账(唤醒词:账户转账):\n\n  金  额: ____\n  从账户: ____ (如:支付宝)\n  到账户: ____ (如:招行卡)\n  时  间: ____ (选填,默认现在)\n',
          types: ['采集'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看账户汇总(唤醒词:看账户汇总):\n',
          types: ['查看'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'account_1', label: '账户管理', scenes: ['account_add', 'account_update', 'account_transfer', 'account_summary'] },
  ],
};
