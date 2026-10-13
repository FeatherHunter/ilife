/** #721 · 查询域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余；参数行 `____`→`{{name}}`。
 * kind 第一性设计：单日（查某天／区间起止）`date`（只吃 YYYY-MM-DD，“5月1号／上周五／昨天”
 * 由执行侧解 ISO，hint 写空语义）；时间窗（周／月／年／区间）一律 `period`——粒度分段＋原生控件，
 * 取值是人话表达式（周／月另带起止日期），命令侧不必懂 ISO 周号（#1275 定稿；`week` 仍禁用——
 * 现有“周”非 ISO 周，见 REPORT §3.2）；
 * 条数 `number`；分类／账户／账本／关键词／标签／对象／名目／记录 id／排序 `text`（开放）；
 * 收支 `select`（支出／收入／全部三项封闭，`options` 必填，空＝默认进 `hint`）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

/** 多条件那条词条的**投影标记**（住在它的 `preset` 里）：`./read.js` 的多条件分支照它认
 *  「这一页是哪条词」，值只在这里写一次。`routeWakeword` 从唤醒词「查多条件」把它带下来，
 *  `projectWakeWord` 的规则①认它——两处都读域声明，谁都不另写字面量。 */
export const MULTI_COND = 'many';

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
      // 日期**可选**（空＝今天）：不拦路由（`needs` 不写 date），但给了就带下去，
      // 并且它是投影认词（`projectWakeWord` 规则②）的线索——店头才印「查某天」而不是通用词「查今天」。
      carries: ['date'],
      scenes: [
        {
          id: 'query_date',
          title: '查某天的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查某天」。\n\n我想查某一天的账，不填日期就是今天。\n\n日期(选填):{{query_date}}',
          types: ['查看'],
          editable_fields: [
            { name: 'query_date', label: '日期(选填)', value: '', hint: '空＝今天；格式 YYYY-MM-DD，如 2026-05-01', required: false, kind: 'date' },
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
            { name: 'limit', label: '条数(选填)', value: '', hint: '空＝10；点建议值或手填 1~200', required: false, kind: 'number', presets: [10, 20, 50], exclusive_group: 'count' },
            { name: 'sort', label: '排序(选填)', value: '', hint: '空＝时间从近到远', required: false, kind: 'select', empty_label: '默认：时间从近到远', options: ['时间从近到远', '时间从远到近', '金额从大到小', '金额从小到大'] },
            { name: 'recent_days', label: '近几天(选填)', value: '', hint: '与条数二选一；点建议值或手填 1~365', required: false, kind: 'number', presets: [7, 30, 90], exclusive_group: 'count' },
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
            { name: 'week', label: '周', value: '', hint: '点框任意处开周选择器（ISO 周，周一为第一天）；如 本周、上周', required: true, kind: 'week' },
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
            { name: 'month', label: '月', value: '', hint: '点框任意处开月度选择器；如 本月、上月', required: true, kind: 'month' },
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
            { name: 'category', label: '分类', value: '', hint: '如 餐饮、出行、奶茶', required: true, kind: 'text', source: 'categories' },
            { name: 'period', label: '时间(选填)', value: '', hint: '', required: false, kind: 'period' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝', required: false, kind: 'text', source: 'accounts' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '账本＝记录的分组（如 生活、旅行）；一笔记录只归一个账本', required: false, kind: 'text', source: 'ledgers' },
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
            { name: 'account', label: '账户', value: '', hint: '如 支付宝、微信、招行', required: true, kind: 'text', source: 'accounts' },
            { name: 'period', label: '时间(选填)', value: '', hint: '', required: false, kind: 'period' },
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
            { name: 'ledger', label: '账本', value: '', hint: '账本＝记录的分组（如 生活、旅行）；一笔记录只归一个账本', required: true, kind: 'text', source: 'ledgers' },
            { name: 'period', label: '时间(选填)', value: '', hint: '', required: false, kind: 'period' },
          ],
        },
      ],
    },
    {
      phrase: '查多条件',
      key: 'bill.record.range',
      // 条件是**任选**：一条也不给时由命令侧阻断（`./read.js` 的 `viewRecordRange` 末尾那条），
      // `needs` 空＝路由不拦。`carries` 列的是「给了就带下去」的条件槽（与 `needs` 一样进示例），
      // 多条件页的副题照这一组把条件写全。`preset` 只放投影标记，不是查询条件。
      preset: { cond: MULTI_COND },
      carries: ['category', 'account', 'ledger', 'start', 'end'],
      scenes: [
        {
          id: 'query_multi',
          title: '查多个条件的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查多条件」。\n\n我想按多个条件查账（条件给几个都行，至少要给一个）。\n\n分类(选填):{{category}}\n账户(选填):{{account}}\n账本(选填):{{ledger}}\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'category', label: '分类(选填)', value: '', hint: '如 餐饮、出行、奶茶', required: false, kind: 'text', source: 'categories' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝、微信、招行', required: false, kind: 'text', source: 'accounts' },
            { name: 'ledger', label: '账本(选填)', value: '', hint: '账本＝记录的分组（如 生活、旅行）；一笔记录只归一个账本', required: false, kind: 'text', source: 'ledgers' },
            { name: 'period', label: '时间(选填)', value: '', hint: '', required: false, kind: 'period' },
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
            { name: 'tag', label: '标签', value: '', hint: '如 #旅行、#待报销', required: true, kind: 'text', source: 'tags' },
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
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查分期」。\n\n我想查进行中的分期。不填名目查全部。\n\n名目(选填):{{item_name}}\n状态(选填):{{status}}\n账户(选填):{{account}}',
          types: ['查看'],
          editable_fields: [
            { name: 'item_name', label: '名目(选填)', value: '', hint: '空＝全部；如 手机', required: false, kind: 'text' },
            { name: 'status', label: '状态(选填)', value: '', hint: '空＝全部', required: false, kind: 'select', options: ['全部', '进行中', '已还清'] },
            { name: 'account', label: '账户(选填)', value: '', hint: '空＝全部；如 支付宝', required: false, kind: 'text', source: 'accounts' },
          ],
        },
      ],
    },
    {
      phrase: '查某编号的账',
      key: 'bill.record.detail',
      needs: ['id'],
      scenes: [
        {
          id: 'query_bill_detail',
          title: '查某编号的账',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「查某编号的账」。\n\n我想看一条账单的详情。\n\n编号:{{record_id}}',
          types: ['查看'],
          editable_fields: [
            { name: 'record_id', label: '编号', value: '', hint: '从查某天或查今天或查最近的列表里的『编号』列取', required: true, kind: 'text' },
          ],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'query_1', label: '按时间', scenes: ['query_today', 'query_yesterday', 'query_date', 'query_recent', 'query_week', 'query_month', 'query_range', 'query_bill_detail'] },
    { id: 'query_2', label: '按条件', scenes: ['query_category', 'query_search', 'query_tag', 'query_account', 'query_ledger', 'query_multi'] },
    { id: 'query_3', label: '按状态', scenes: ['query_debt', 'query_pending_reimburse', 'query_installment'] },
  ],
};
