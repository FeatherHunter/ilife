/** #721 · 查询域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余；参数行 `____`→`{{name}}`。
 * kind 第一性设计：单日（查某天／查账单／区间起止）`date`（只吃 YYYY-MM-DD，“5月1号／上周五／昨天”
 * 由执行侧解 ISO，hint 写空语义）；周／月／时间窗（本周／本月／近30天／5月1到10号）一律 `text`
 * （窗口表达式，非单日；`week` 禁用——现有“周”非 ISO 周，见 REPORT §3.2）；
 * 条数 `number`；分类／账户／账本／关键词／标签／对象／名目／记录 id／排序 `text`（开放）；
 * 收支 `select`（支出／收入／全部三项封闭，`options` 必填，空＝默认进 `hint`）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const QUERY_DECLARATION: DomainDeclaration = {
  id: 'query',
  label: '查询',
  icon: '🔍',
  order: 2,
  entries: [
    {
      phrase: '查今天',
      key: 'bill.record.today',
      scenes: [
        {
          id: 'query_today',
          title: '查今天收支',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查今天」。\n\n我想看今天的收支。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '查昨天',
      key: 'bill.record.today',
      preset: { date: 'yesterday' },
      scenes: [
        {
          id: 'query_yesterday',
          title: '查昨天收支',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查昨天」。\n\n我想看昨天的收支。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '查某天',
      key: 'bill.record.today',
      needs: ['date'],
      scenes: [
        {
          id: 'query_date',
          title: '查某一天的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查某天」。\n\n我想查某一天的账。\n\n日期:{{query_date}}',
          types: ['查看'],
          editable_fields: [
            { name: 'query_date', label: '日期', value: '', hint: '格式 YYYY-MM-DD，如 2026-05-01', required: true, kind: 'date' },
          ],
        },
      ],
    },
    {
      phrase: '查最近',
      key: 'bill.record.today',
      preset: { recent: true },
      scenes: [
        {
          id: 'query_recent',
          title: '查最近记录',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查最近」。\n\n我想看最近的记录。近几天与条数二选一。\n\n条数(选填):{{limit}}\n排序(选填):{{sort}}\n近几天(选填):{{recent_days}}',
          types: ['查看'],
          editable_fields: [
            { name: 'limit', label: '条数(选填)', value: '', hint: '空＝10；纯数字', required: false, kind: 'number' },
            { name: 'sort', label: '排序(选填)', value: '', hint: '如 金额从大到小', required: false, kind: 'text' },
            { name: 'recent_days', label: '近几天(选填)', value: '', hint: '如 近7天、近30天；与条数二选一', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查账单',
      key: 'bill.record.today',
      scenes: [
        {
          id: 'query_bills',
          title: '查账单',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查账单」。\n\n我想查账单。\n\n日期(选填):{{query_date}}',
          types: ['查看'],
          editable_fields: [
            { name: 'query_date', label: '日期(选填)', value: '', hint: '空＝今天；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
          ],
        },
      ],
    },
    {
      phrase: '查周',
      key: 'bill.record.range',
      preset: { range: 'week' },
      scenes: [
        {
          id: 'query_week',
          title: '查某周的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查周」。\n\n我想查某一周的账。\n\n周:{{week}}',
          types: ['查看'],
          editable_fields: [
            { name: 'week', label: '周', value: '', hint: '如 本周、上周、5月第2周；非 ISO 周，不用周选择器', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查月',
      key: 'bill.record.range',
      preset: { range: 'month' },
      scenes: [
        {
          id: 'query_month',
          title: '查某个月的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查月」。\n\n我想查某个月的账。\n\n月:{{month}}',
          types: ['查看'],
          editable_fields: [
            { name: 'month', label: '月', value: '', hint: '如 本月、上月、3月', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查区间',
      key: 'bill.record.range',
      needs: ['start', 'end'],
      scenes: [
        {
          id: 'query_range',
          title: '查任意时间段',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查区间」。\n\n我想查某段时间的账。\n\n开始日期:{{start_date}}\n结束日期:{{end_date}}',
          types: ['查看'],
          editable_fields: [
            { name: 'start_date', label: '开始日期', value: '', hint: '格式 YYYY-MM-DD，如 2026-05-01', required: true, kind: 'date' },
            { name: 'end_date', label: '结束日期', value: '', hint: '格式 YYYY-MM-DD，如 2026-05-10；查全年结束填当年12-31', required: true, kind: 'date' },
          ],
        },
      ],
    },
    {
      phrase: '查分类',
      key: 'bill.record.range',
      needs: ['category'],
      scenes: [
        {
          id: 'query_category',
          title: '查某分类的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查分类」。\n\n我想查某个分类的账。\n\n分类:{{category}}\n时间(选填):{{period}}\n账户(选填):{{account}}\n账本(选填):{{ledger}}\n收支(选填):{{direction}}',
          types: ['查看'],
          editable_fields: [
            { name: 'category', label: '分类', value: '', hint: '如 餐饮、出行、奶茶', required: true, kind: 'text' },
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、5月、5月1到10号', required: false, kind: 'text' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝', required: false, kind: 'text' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '', required: false, kind: 'text' },
            { name: 'direction', label: '收支(选填)', value: '', hint: '空＝全部', required: false, kind: 'select', options: ['支出', '收入', '全部'] },
          ],
        },
      ],
    },
    {
      phrase: '查账户',
      key: 'bill.record.range',
      needs: ['account'],
      scenes: [
        {
          id: 'query_account',
          title: '查某账户流水',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查账户」。\n\n我想查某个账户的流水。\n\n账户:{{account}}\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'account', label: '账户', value: '', hint: '如 支付宝、微信、招行', required: true, kind: 'text' },
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、上月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查账本',
      key: 'bill.record.range',
      needs: ['ledger'],
      scenes: [
        {
          id: 'query_ledger',
          title: '查某账本的记录',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查账本」。\n\n我想查某个账本的记录。\n\n账本:{{ledger}}\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'ledger', label: '账本', value: '', hint: '如 生活、旅行、借贷', required: true, kind: 'text' },
            { name: 'period', label: '时间(选填)', value: '', hint: '', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '搜备注',
      key: 'bill.record.search',
      needs: ['q'],
      scenes: [
        {
          id: 'query_search',
          title: '搜索备注关键词',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「搜备注」。\n\n我要按关键词搜备注。\n\n关键词:{{keyword}}',
          types: ['查看'],
          editable_fields: [
            { name: 'keyword', label: '关键词', value: '', hint: '', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查标签',
      key: 'bill.record.search',
      preset: { kind: 'tag' },
      needs: ['tag'],
      scenes: [
        {
          id: 'query_tag',
          title: '查标签',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查标签」。\n\n我想按标签聚合查账。\n\n标签:{{tag}}',
          types: ['查看'],
          editable_fields: [
            { name: 'tag', label: '标签', value: '', hint: '如 #旅行、#待报销', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查欠款',
      key: 'bill.record.search',
      preset: { kind: 'debt' },
      scenes: [
        {
          id: 'query_debt',
          title: '查未还欠款',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查欠款」。\n\n我想查未还欠款。不填对象查全部。\n\n对象(选填):{{person}}',
          types: ['查看'],
          editable_fields: [
            { name: 'person', label: '对象(选填)', value: '', hint: '空＝全部；如 小明', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查待报销',
      key: 'bill.record.search',
      preset: { kind: 'reimburse' },
      scenes: [
        {
          id: 'query_pending_reimburse',
          title: '查待报销',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查待报销」。\n\n我想看待报销的支出。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '查分期',
      key: 'bill.record.search',
      preset: { kind: 'installment' },
      scenes: [
        {
          id: 'query_installment',
          title: '查进行中的分期',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查分期」。\n\n我想查进行中的分期。不填名目查全部。\n\n名目(选填):{{item_name}}',
          types: ['查看'],
          editable_fields: [
            { name: 'item_name', label: '名目(选填)', value: '', hint: '空＝全部；如 手机', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '查账单详情',
      key: 'bill.record.detail',
      needs: ['id'],
      scenes: [
        {
          id: 'query_bill_detail',
          title: '查账单详情',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查账单详情」。\n\n我想看一条账单的详情。\n\n记录 id:{{record_id}}',
          types: ['查看'],
          editable_fields: [
            { name: 'record_id', label: '记录 id', value: '', hint: '从查账单或查今天的列表里取', required: true, kind: 'text' },
          ],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'query_1', label: '按时间', scenes: ['query_today', 'query_yesterday', 'query_date', 'query_recent', 'query_week', 'query_month', 'query_range', 'query_bills', 'query_bill_detail'] },
    { id: 'query_2', label: '按条件', scenes: ['query_category', 'query_search', 'query_tag', 'query_account', 'query_ledger'] },
    { id: 'query_3', label: '按状态', scenes: ['query_debt', 'query_pending_reimburse', 'query_installment'] },
  ],
};
