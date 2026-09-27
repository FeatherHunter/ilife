/** #721 · 写入域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式 `请你加载技能 饼干记账,执行唤醒词「X」。`；
 * 意图句＝原首行“帮我…”提纯（去“请加载…技能”“(唤醒词:X)”冗余）；参数行 `____`→`{{name}}`，
 * 标签去格式／单位／例子（进 `hint`），`（选填）`转 `required:false`。
 * kind 第一性设计：金额／总价 `number`（纯数字串，单位住 hint；`记一笔` 的正负规则进 hint，不断新类型）；
 * 期数 `number`（整数）；时间／首期日 `date`（只吃 YYYY-MM-DD，“现在／昨天”由执行侧解 ISO，hint 写空语义）；
 * 分类／账户／账本／币种／对象／期限／定位（原支出／哪一笔／目标）／改字段／条目（多行）一律 `text`
 * （开放词：用户自建分类账户、记录定位走候选页联动、`select` 会锁死；多行由 hint“每行一笔”承载，不另立类型）；
 * 本域无 `select`／`week` 实例（`week` 规则先行，见 REPORT §3.2）。
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记支出」。\n\n我要记一笔支出。\n\n金额:{{amount}}\n分类/名目:{{category}}\n备注(选填):{{note}}\n时间(选填):{{record_time}}\n账户(选填):{{account}}\n账本(选填):{{ledger}}\n币种(选填):{{currency}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'category', label: '分类/名目', value: '', hint: '如 房租、午饭、打车', required: true, kind: 'text' },
            { name: 'note', label: '备注(选填)', value: '', hint: '', required: false, kind: 'text' },
            { name: 'record_time', label: '时间(选填)', value: '', hint: '空＝现在；补记昨天填昨天，填了由执行侧解成 YYYY-MM-DD', required: false, kind: 'date' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝、微信', required: false, kind: 'text' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '如 旅行、生活', required: false, kind: 'text' },
            { name: 'currency', label: '币种(选填)', value: '', hint: '空＝人民币；外币如 USD', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记收入」。\n\n我要记一笔收入。\n\n金额:{{amount}}\n分类/名目:{{category}}\n备注(选填):{{note}}\n时间(选填):{{record_time}}\n账户(选填):{{account}}\n币种(选填):{{currency}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'category', label: '分类/名目', value: '', hint: '如 工资、退款、卖闲置', required: true, kind: 'text' },
            { name: 'note', label: '备注(选填)', value: '', hint: '', required: false, kind: 'text' },
            { name: 'record_time', label: '时间(选填)', value: '', hint: '空＝现在；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 银行卡、微信', required: false, kind: 'text' },
            { name: 'currency', label: '币种(选填)', value: '', hint: '空＝人民币；外币如 USD', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「拍账单」。\n\n我要拍账单照片记账，请识别图片中的金额和项目。',
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「批量录入」。\n\n我要批量记几笔账。\n\n条目:{{items}}\n账本(选填):{{ledger}}',
          types: ['采集'],
          editable_fields: [
            { name: 'items', label: '条目', value: '', hint: '每行一笔，如 午饭35、奶茶25、打车20', required: true, kind: 'text' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '如 旅行', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记退款」。\n\n我要记一笔退款，冲销原支出。\n\n金额:{{amount}}\n原支出:{{original}}\n退款原因(选填):{{reason}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'original', label: '原支出', value: '', hint: '描述哪一笔，如 昨天那笔午饭、5月1日买的衣服', required: true, kind: 'text' },
            { name: 'reason', label: '退款原因(选填)', value: '', hint: '如 退货、取消订单、差价', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记报销」。\n\n我要记一笔报销支出，自动加 #待报销标签。\n\n金额:{{amount}}\n分类(选填):{{category}}\n备注(选填):{{note}}\n时间(选填):{{record_time}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'category', label: '分类(选填)', value: '', hint: '如 餐饮、差旅', required: false, kind: 'text' },
            { name: 'note', label: '备注(选填)', value: '', hint: '自动加 #待报销', required: false, kind: 'text' },
            { name: 'record_time', label: '时间(选填)', value: '', hint: '空＝现在；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「报销到账」。\n\n我的报销到账了，记一笔收入并流转标签。\n\n金额:{{amount}}\n关联(选填):{{related}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'related', label: '关联(选填)', value: '', hint: '如 哪一笔 #待报销', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记借出」。\n\n我借给别人一笔钱。\n\n金额:{{amount}}\n对象:{{person}}\n期限(选填):{{deadline}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'person', label: '对象', value: '', hint: '借给谁', required: true, kind: 'text' },
            { name: 'deadline', label: '期限(选填)', value: '', hint: '如 月底还', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记借入」。\n\n我向别人借了一笔钱。\n\n金额:{{amount}}\n对象:{{person}}\n期限(选填):{{deadline}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'person', label: '对象', value: '', hint: '向谁借', required: true, kind: 'text' },
            { name: 'deadline', label: '期限(选填)', value: '', hint: '', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记收回」。\n\n别人还我钱了，记一笔收回。\n\n哪一笔:{{which}}',
          types: ['采集'],
          editable_fields: [
            { name: 'which', label: '哪一笔', value: '', hint: '对象/金额/描述，如 小明还我那500', required: true, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记偿还」。\n\n我要还一笔借入的钱。\n\n哪一笔:{{which}}',
          types: ['采集'],
          editable_fields: [
            { name: 'which', label: '哪一笔', value: '', hint: '对象/金额/描述，如 还小明那500', required: true, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记分期」。\n\n我要记一笔分期，按月平摊预写。\n\n名目:{{item_name}}\n总价:{{total}}\n期数:{{periods}}\n首期日(选填):{{first_date}}\n账户(选填):{{account}}\n账本(选填):{{ledger}}',
          types: ['向导'],
          editable_fields: [
            { name: 'item_name', label: '名目', value: '', hint: '如 手机、电脑', required: true, kind: 'text' },
            { name: 'total', label: '总价', value: '', hint: '纯数字，不带单位', required: true, kind: 'number' },
            { name: 'periods', label: '期数', value: '', hint: '纯数字，如 24', required: true, kind: 'number' },
            { name: 'first_date', label: '首期日(选填)', value: '', hint: '空＝今天，每月固定这一天；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
            { name: 'account', label: '账户(选填)', value: '', hint: '', required: false, kind: 'text' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「记一笔」。\n\n我要记一笔，支出或收入都可以。\n\n金额:{{amount}}\n分类/名目:{{category}}\n备注(选填):{{note}}\n时间(选填):{{record_time}}\n账户(选填):{{account}}',
          types: ['采集'],
          editable_fields: [
            { name: 'amount', label: '金额', value: '', hint: '纯数字，不带单位；支出填负数，收入填正数', required: true, kind: 'number' },
            { name: 'category', label: '分类/名目', value: '', hint: '如 餐饮、工资、打车', required: true, kind: 'text' },
            { name: 'note', label: '备注(选填)', value: '', hint: '', required: false, kind: 'text' },
            { name: 'record_time', label: '时间(选填)', value: '', hint: '空＝现在；补记昨天填昨天，填了由执行侧解成 YYYY-MM-DD', required: false, kind: 'date' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝、微信', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「改记录」。\n\n我要改一条已有记录。执行前请告诉我目标是哪条，确认后再改。\n\n目标:{{target}}\n要改的字段:{{changes}}',
          types: ['选择'],
          editable_fields: [
            { name: 'target', label: '目标', value: '', hint: '如 最近一笔、某天的某条、ID', required: true, kind: 'text' },
            { name: 'changes', label: '要改的字段', value: '', hint: '如 金额改成38、分类改成交通、备注加牛奶', required: true, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「撤销」。\n\n我要撤销一条记录（软删）。执行前请告诉我目标是哪条，确认后再撤销。\n\n目标:{{target}}',
          types: ['选择'],
          editable_fields: [
            { name: 'target', label: '目标', value: '', hint: '空＝最近一笔；或描述某条', required: false, kind: 'text' },
          ],
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「恢复」。\n\n我要恢复一条已撤销的记录。执行前请告诉我目标是哪条，确认后再恢复。\n\n目标:{{target}}',
          types: ['选择'],
          editable_fields: [
            { name: 'target', label: '目标', value: '', hint: '描述被撤销的记录，如 昨天撤销的午饭', required: true, kind: 'text' },
          ],
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
