/** #721 · 写入域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const WRITE_DECLARATION: DomainDeclaration = {
  id: 'write',
  label: '写入',
  icon: '✏️',
  order: 1,
  entries: [
    {
      phrase: '记支出',
      key: 'bill.record.add',
      preset: { kind: 'expense' },
      scenes: [
        {
          id: 'write_expense',
          title: '记一笔支出',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔支出(唤醒词:记支出):\n\n  金  额: ____\n  分类/名目: ____ (如:房租 / 午饭 / 打车)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在;补记昨天写「昨天」)\n  账  户: ____ (选填,如:支付宝 / 微信)\n  账  本: ____ (选填,如:旅行 / 生活)\n  币  种: ____ (选填,默认人民币;外币如:USD)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记收入',
      key: 'bill.record.add',
      preset: { kind: 'income' },
      scenes: [
        {
          id: 'write_income',
          title: '记一笔收入',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔收入(唤醒词:记收入):\n\n  金  额: ____\n  分类/名目: ____ (如:工资 / 退款 / 卖闲置)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在)\n  账  户: ____ (选填,如:银行卡 / 微信)\n  币  种: ____ (选填,默认人民币;外币如:USD)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '拍账单',
      key: 'bill.record.add',
      preset: { kind: 'photo' },
      scenes: [
        {
          id: 'write_bill_photo',
          title: '拍账单记账(图片识别)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我拍账单记账(唤醒词:拍账单):\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '批量录入',
      key: 'bill.record.add',
      preset: { kind: 'batch' },
      scenes: [
        {
          id: 'write_batch',
          title: '批量录入多笔',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我批量记几笔账(唤醒词:批量录入):\n\n  条  目: ____ (每行一笔,如:午饭35 / 奶茶25 / 打车20)\n  账  本: ____ (选填,如:旅行)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记退款',
      key: 'bill.record.add',
      preset: { kind: 'refund' },
      scenes: [
        {
          id: 'write_refund',
          title: '记一笔退款(冲销原支出)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔退款(唤醒词:记退款):\n\n  金  额: ____\n  原支出: ____ (描述哪一笔,如:昨天那笔午饭 / 5月1日买的衣服)\n  退款原因: ____ (选填,如:退货/取消订单/差价)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记报销',
      key: 'bill.record.add',
      preset: { kind: 'reimburse' },
      scenes: [
        {
          id: 'write_reimburse',
          title: '记一笔报销支出(#待报销)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔报销支出(唤醒词:记报销):\n\n  金  额: ____\n  分  类: ____ (选填,如:餐饮 / 差旅)\n  备  注: ____ (选填,自动加 #待报销)\n  时  间: ____ (选填,默认现在)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '报销到账',
      key: 'bill.record.add',
      preset: { kind: 'reimburse-done' },
      scenes: [
        {
          id: 'write_reimburse_done',
          title: '报销到账(记收入 + 流转标签)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记录报销到账(唤醒词:报销到账):\n\n  金  额: ____\n  关  联: ____ (选填,如:哪一笔 #待报销)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记借出',
      key: 'bill.record.add',
      preset: { kind: 'lend' },
      scenes: [
        {
          id: 'write_lend',
          title: '借给别人钱',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔借出(唤醒词:记借出):\n\n  金  额: ____\n  对  象: ____ (借给谁)\n  期  限: ____ (选填,如:月底还)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记借入',
      key: 'bill.record.add',
      preset: { kind: 'borrow' },
      scenes: [
        {
          id: 'write_borrow',
          title: '向别人借钱',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔借入(唤醒词:记借入):\n\n  金  额: ____\n  对  象: ____ (向谁借)\n  期  限: ____ (选填)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记收回',
      key: 'bill.record.add',
      preset: { kind: 'collect' },
      scenes: [
        {
          id: 'write_collect',
          title: '收回借出的钱',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔收回(唤醒词:记收回):\n\n  哪一笔: ____ (对象/金额/描述,如:小明还我那 500)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记偿还',
      key: 'bill.record.add',
      preset: { kind: 'repay' },
      scenes: [
        {
          id: 'write_payback',
          title: '偿还借入的钱',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔偿还(唤醒词:记偿还):\n\n  哪一笔: ____ (对象/金额/描述,如:还小明那 500)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '记分期',
      key: 'bill.record.add',
      preset: { kind: 'installment' },
      scenes: [
        {
          id: 'write_installment',
          title: '记一笔分期(平摊预写)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔分期(唤醒词:记分期):\n\n  名  目: ____ (如:手机 / 电脑)\n  总  价: ____\n  期  数: ____ (如:24)\n  首期日: ____ (选填,默认今天,每月固定这一天)\n  账  户: ____ (选填)\n  账  本: ____ (选填)\n',
          types: ['向导'],
        },
      ],
    },
    {
      phrase: '记一笔',
      key: 'bill.record.add',
      scenes: [
        {
          id: 'write_record',
          title: '记一笔',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我记一笔(唤醒词:记一笔):\n\n  金  额: ____ (支出写负数,收入写正数)\n  分类/名目: ____ (如:餐饮 / 工资 / 打车)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在;补记昨天写「昨天」)\n  账  户: ____ (选填,如:支付宝 / 微信)\n',
          types: ['采集'],
        },
      ],
    },
    {
      phrase: '改记录',
      key: 'bill.record.update',
      carries: ['id'],
      scenes: [
        {
          id: 'write_update',
          title: '修改已有记录',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我改一条记录(唤醒词:改记录):\n\n  目  标: ____ (如:最近一笔 / 某天的某条 / ID)\n  要改的字段: ____ (如:金额改成 38 / 分类改成交通 / 备注加牛奶)\n',
          types: ['选择'],
        },
      ],
    },
    {
      phrase: '撤销',
      key: 'bill.record.update',
      preset: { op: 'undo' },
      carries: ['id'],
      scenes: [
        {
          id: 'write_undo',
          title: '撤销一条记录(软删)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我撤销一条记录(唤醒词:撤销):\n\n  目  标: ____ (默认最近一笔;或描述某条)\n',
          types: ['选择'],
        },
      ],
    },
    {
      phrase: '恢复',
      key: 'bill.record.update',
      preset: { op: 'restore' },
      carries: ['id'],
      scenes: [
        {
          id: 'write_restore',
          title: '恢复已撤销记录',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我恢复一条已撤销的记录(唤醒词:恢复):\n\n  目  标: ____ (描述被撤销的记录,如:昨天撤销的午饭)\n',
          types: ['选择'],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'write_1', label: '记账', scenes: ['write_expense', 'write_income', 'write_bill_photo', 'write_batch', 'write_record'] },
    { id: 'write_2', label: '特殊收支', scenes: ['write_refund', 'write_reimburse', 'write_reimburse_done', 'write_lend', 'write_borrow', 'write_collect', 'write_payback', 'write_installment'] },
    { id: 'write_3', label: '修正', scenes: ['write_update', 'write_undo', 'write_restore'] },
  ],
};
