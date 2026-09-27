/** #721 · 分析域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
 *
 * #977 · 第一性重写（Q1–Q4定调）：首行统一卡路里式；意图句去冗余；参数行 `____`→`{{name}}`。
 * kind 第一性设计：起止日期 `date`（只吃 YYYY-MM-DD，相对默认进 hint）；
 * 月／年／周／周期／区间／时间窗一律 `text`（“本月／今年／本周vs上周／5月1到10号／近30天”
 * 皆窗口表达式，非单日；`week` 禁用，见 REPORT §3.2）；
 * 条数／月数 `number`；分类／账户 `text`（开放）；收支 `select`（封闭三项／两项，`options` 必填）。
 */
import type { DomainDeclaration } from '../triggers/routeSpec.js';

export const ANALYSIS_DECLARATION: DomainDeclaration = {
  id: 'analysis',
  label: '分析',
  icon: '📊',
  order: 3,
  entries: [
    {
      phrase: '看月度',
      key: 'bill.analysis.overview',
      preset: { kind: 'monthly' },
      scenes: [
        {
          id: 'monthly_summary',
          title: '某月收支汇总',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看月度」。\n\n我想看某个月的收支汇总。\n\n月:{{month}}',
          types: ['查看'],
          editable_fields: [
            { name: 'month', label: '月', value: '', hint: '如 本月、上月、3月', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看年度',
      key: 'bill.analysis.overview',
      preset: { kind: 'yearly' },
      scenes: [
        {
          id: 'yearly_summary',
          title: '年度收支汇总',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看年度」。\n\n我想看某一年的收支汇总。\n\n年:{{year}}',
          types: ['查看'],
          editable_fields: [
            { name: 'year', label: '年', value: '', hint: '如 今年、2026、去年', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看总览',
      key: 'bill.analysis.overview',
      preset: { kind: 'overview' },
      scenes: [
        {
          id: 'range_overview',
          title: '时间段收支总览',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看总览」。\n\n我想看某段时间的收支总览。\n\n开始日期(选填):{{start_date}}\n结束日期(选填):{{end_date}}',
          types: ['查看'],
          editable_fields: [
            { name: 'start_date', label: '开始日期(选填)', value: '', hint: '空＝本月1号；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
            { name: 'end_date', label: '结束日期(选填)', value: '', hint: '空＝今天；填了必须是 YYYY-MM-DD', required: false, kind: 'date' },
          ],
        },
      ],
    },
    {
      phrase: '看周报',
      key: 'bill.analysis.overview',
      preset: { kind: 'week' },
      scenes: [
        {
          id: 'week_brief',
          title: '本周简报',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看周报」。\n\n我想看本周简报，对比上周。\n\n周(选填):{{week}}',
          types: ['查看'],
          editable_fields: [
            { name: 'week', label: '周(选填)', value: '', hint: '空＝本周；如 本周、上周', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看分类',
      key: 'bill.analysis.overview',
      preset: { kind: 'category' },
      scenes: [
        {
          id: 'category_breakdown',
          title: '钱花在哪些分类',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看分类」。\n\n我想看钱花在哪些分类。\n\n时间(选填):{{period}}\n账户(选填):{{account}}\n收支(选填):{{direction}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、5月、5月1到10号', required: false, kind: 'text' },
            { name: 'account', label: '账户(选填)', value: '', hint: '如 支付宝', required: false, kind: 'text' },
            { name: 'direction', label: '收支(选填)', value: '', hint: '空＝支出', required: false, kind: 'select', options: ['支出', '收入', '全部'] },
          ],
        },
      ],
    },
    {
      phrase: '看账户',
      key: 'bill.analysis.overview',
      preset: { kind: 'account' },
      scenes: [
        {
          id: 'account_breakdown',
          title: '各账户花销情况',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看账户」。\n\n我想看各账户的花销情况。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、上月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看账本',
      key: 'bill.analysis.overview',
      preset: { kind: 'ledger' },
      scenes: [
        {
          id: 'ledger_summary',
          title: '各账本收支汇总',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看账本」。\n\n我想看各账本的收支汇总。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看结构',
      key: 'bill.analysis.overview',
      preset: { kind: 'structure' },
      scenes: [
        {
          id: 'income_expense_structure',
          title: '收入支出来源去向',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看结构」。\n\n我想看收入和支出的结构。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、5月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '做统计',
      key: 'bill.analysis.overview',
      preset: { kind: 'stats' },
      scenes: [
        {
          id: 'stats',
          title: '记账情况统计',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「做统计」。\n\n我想看记账情况统计。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '看对比',
      key: 'bill.analysis.compare',
      preset: { kind: 'period' },
      scenes: [
        {
          id: 'period_compare',
          title: '本期和上期对比',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看对比」。\n\n我想看本期和上期的对比。\n\n周期:{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '周期', value: '', hint: '如 本周vs上周、本月vs上月、今年vs去年', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看双区间',
      key: 'bill.analysis.compare',
      preset: { kind: 'range' },
      scenes: [
        {
          id: 'range_compare',
          title: '两段时间对比',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看双区间」。\n\n我要对比两段时间。\n\n区间一:{{range1}}\n区间二:{{range2}}',
          types: ['查看'],
          editable_fields: [
            { name: 'range1', label: '区间一', value: '', hint: '如 5月、5月1到10号', required: true, kind: 'text' },
            { name: 'range2', label: '区间二', value: '', hint: '如 6月、6月1到10号', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看同比',
      key: 'bill.analysis.compare',
      preset: { kind: 'yoy' },
      scenes: [
        {
          id: 'year_over_year',
          title: '今年和去年同比',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看同比」。\n\n我想看同比对比。\n\n月:{{month}}',
          types: ['查看'],
          editable_fields: [
            { name: 'month', label: '月', value: '', hint: '如 本月、6月', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看分类对比',
      key: 'bill.analysis.compare',
      preset: { kind: 'category' },
      scenes: [
        {
          id: 'category_compare',
          title: '两段时间分类差异',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看分类对比」。\n\n我想看两段时间的分类差异。\n\n区间一:{{range1}}\n区间二:{{range2}}',
          types: ['查看'],
          editable_fields: [
            { name: 'range1', label: '区间一', value: '', hint: '如 5月', required: true, kind: 'text' },
            { name: 'range2', label: '区间二', value: '', hint: '如 6月', required: true, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看趋势',
      key: 'bill.analysis.trend',
      preset: { kind: 'trend' },
      scenes: [
        {
          id: 'monthly_trend',
          title: '每月收支走势',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看趋势」。\n\n我想看每月的收支走势。\n\n月数(选填):{{months}}',
          types: ['查看'],
          editable_fields: [
            { name: 'months', label: '月数(选填)', value: '', hint: '空＝12；如 6、12', required: false, kind: 'number' },
          ],
        },
      ],
    },
    {
      phrase: '看分类趋势',
      key: 'bill.analysis.trend',
      preset: { kind: 'category' },
      scenes: [
        {
          id: 'category_trend',
          title: '某分类的月度变化',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看分类趋势」。\n\n我想看某个分类的月度变化。\n\n分类:{{category}}\n月数(选填):{{months}}',
          types: ['查看'],
          editable_fields: [
            { name: 'category', label: '分类', value: '', hint: '如 餐饮、出行', required: true, kind: 'text' },
            { name: 'months', label: '月数(选填)', value: '', hint: '空＝12；如 6、12', required: false, kind: 'number' },
          ],
        },
      ],
    },
    {
      phrase: '看大额',
      key: 'bill.analysis.trend',
      preset: { kind: 'top' },
      scenes: [
        {
          id: 'top_expense',
          title: '大额支出排行',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看大额」。\n\n我想看大额支出排行。\n\n条数(选填):{{limit}}\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'limit', label: '条数(选填)', value: '', hint: '空＝10；纯数字', required: false, kind: 'number' },
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、5月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看高频',
      key: 'bill.analysis.trend',
      preset: { kind: 'frequent' },
      scenes: [
        {
          id: 'top_frequency',
          title: '高频消费排行',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看高频」。\n\n我想看高频消费排行。\n\n时间(选填):{{period}}\n条数(选填):{{limit}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、近30天', required: false, kind: 'text' },
            { name: 'limit', label: '条数(选填)', value: '', hint: '空＝10；纯数字', required: false, kind: 'number' },
          ],
        },
      ],
    },
    {
      phrase: '看分布',
      key: 'bill.analysis.trend',
      preset: { kind: 'distribution' },
      scenes: [
        {
          id: 'amount_distribution',
          title: '金额区间分布',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看分布」。\n\n我想看金额区间分布。\n\n时间(选填):{{period}}\n收支(选填):{{direction}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月、5月', required: false, kind: 'text' },
            { name: 'direction', label: '收支(选填)', value: '', hint: '空＝支出', required: false, kind: 'select', options: ['支出', '收入'] },
          ],
        },
      ],
    },
    {
      phrase: '看活跃',
      key: 'bill.analysis.trend',
      preset: { kind: 'activity' },
      scenes: [
        {
          id: 'activity',
          title: '记账活跃度',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看活跃」。\n\n我想看记账活跃度。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '看洞察',
      key: 'bill.analysis.trend',
      preset: { kind: 'insight' },
      scenes: [
        {
          id: 'insight',
          title: 'AI 消费洞察',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看洞察」。\n\n我想看 AI 消费洞察。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '空＝近30天；如 本月、近90天', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看异常',
      key: 'bill.analysis.trend',
      preset: { kind: 'anomaly' },
      scenes: [
        {
          id: 'anomaly',
          title: '异常波动检测',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看异常」。\n\n我想看异常波动检测。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '空＝近6个月；如 近6个月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看借贷',
      key: 'bill.analysis.trend',
      preset: { kind: 'debt' },
      scenes: [
        {
          id: 'debt_summary',
          title: '借贷总览',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看借贷」。\n\n我想看借贷总览。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '看报销',
      key: 'bill.analysis.trend',
      preset: { kind: 'reimburse' },
      scenes: [
        {
          id: 'reimburse_summary',
          title: '报销汇总',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看报销」。\n\n我想看报销汇总。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月', required: false, kind: 'text' },
          ],
        },
      ],
    },
    {
      phrase: '看分期',
      key: 'bill.analysis.trend',
      preset: { kind: 'installment' },
      scenes: [
        {
          id: 'installment_summary',
          title: '分期总览',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看分期」。\n\n我想看分期总览。',
          types: ['查看'],
        },
      ],
    },
    {
      phrase: '看退款',
      key: 'bill.analysis.trend',
      preset: { kind: 'refund' },
      scenes: [
        {
          id: 'refund_summary',
          title: '退款统计',
          status: '',
          prompt_template: '请你加载技能 饼干记账,执行唤醒词「看退款」。\n\n我想看退款统计。\n\n时间(选填):{{period}}',
          types: ['查看'],
          editable_fields: [
            { name: 'period', label: '时间(选填)', value: '', hint: '如 本月', required: false, kind: 'text' },
          ],
        },
      ],
    },
  ],
  subgroups: [
    { id: 'analysis_1', label: '汇总', scenes: ['monthly_summary', 'yearly_summary', 'range_overview', 'week_brief'] },
    { id: 'analysis_2', label: '结构', scenes: ['category_breakdown', 'account_breakdown', 'ledger_summary', 'income_expense_structure'] },
    { id: 'analysis_3', label: '对比', scenes: ['period_compare', 'range_compare', 'year_over_year', 'category_compare'] },
    { id: 'analysis_4', label: '趋势', scenes: ['monthly_trend', 'category_trend'] },
    { id: 'analysis_5', label: '金额', scenes: ['top_expense', 'top_frequency', 'amount_distribution'] },
    { id: 'analysis_6', label: '统计洞察', scenes: ['stats', 'activity', 'insight', 'anomaly'] },
    { id: 'analysis_7', label: '状态聚合', scenes: ['debt_summary', 'reimburse_summary', 'installment_summary', 'refund_summary'] },
  ],
};
