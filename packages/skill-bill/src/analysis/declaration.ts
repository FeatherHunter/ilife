/** #721 · 分析域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
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
          prompt_template: '请加载「饼干记账」技能,帮我看某个月的收支汇总(唤醒词:看月度):\n\n  月: ____ (如:本月 / 上月 / 3月 / 2026-03)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看某年的收支汇总(唤醒词:看年度):\n\n  年: ____ (如:今年 / 2026 / 去年)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看某段时间的收支总览(唤醒词:看总览):\n\n  开始日期: ____ (选填,默认本月1号)\n  结束日期: ____ (选填,默认今天)\n',
          types: ['查看'],
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
          title: '本周简报(对比上周)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我看本周简报(唤醒词:看周报):\n\n  周: ____ (选填,本周 / 上周)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看钱花在哪些分类(唤醒词:看分类):\n\n  时  间: ____ (选填,如:本月 / 5月 / 5月1到10号)\n  账  户: ____ (选填,如:支付宝)\n  收  支: ____ (选填,支出/收入/全部,默认支出)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看各账户的花销情况(唤醒词:看账户):\n\n  时  间: ____ (选填,如:本月 / 上月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看各账本的收支汇总(唤醒词:看账本):\n\n  时  间: ____ (选填,如:本月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看收入和支出的结构(唤醒词:看结构):\n\n  时  间: ____ (选填,如:本月 / 5月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看记账情况统计(唤醒词:做统计):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我看本期和上期对比(唤醒词:看对比):\n\n  周  期: ____ (如:本周vs上周 / 本月vs上月 / 今年vs去年)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我对比两段时间(唤醒词:看双区间):\n\n  区间一: ____ (如:5月 / 5月1到10号)\n  区间二: ____ (如:6月 / 6月1到10号)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看同比对比(唤醒词:看同比):\n\n  月: ____ (如:本月 / 6月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看两段时间的分类差异(唤醒词:看分类对比):\n\n  区间一: ____ (如:5月)\n  区间二: ____ (如:6月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看每月的收支走势(唤醒词:看趋势):\n\n  月  数: ____ (选填,近 6 / 12 个月,默认 12)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看某分类的月度变化(唤醒词:看分类趋势):\n\n  分  类: ____ (如:餐饮 / 出行)\n  月  数: ____ (选填,近 6 / 12 个月,默认 12)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看大额支出排行(唤醒词:看大额):\n\n  条  数: ____ (选填,默认 10)\n  时  间: ____ (选填,如:本月 / 5月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看高频消费排行(唤醒词:看高频):\n\n  时  间: ____ (选填,如:本月 / 近30天)\n  条  数: ____ (选填,默认 10)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看金额区间分布(唤醒词:看分布):\n\n  时  间: ____ (选填,如:本月 / 5月)\n  收  支: ____ (选填,支出/收入,默认支出)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看记账活跃度(唤醒词:看活跃):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我看 AI 消费洞察(唤醒词:看洞察):\n\n  时  间: ____ (选填,如:本月 / 近90天,默认近30天)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看异常波动(唤醒词:看异常):\n\n  时  间: ____ (选填,近 N 个月,默认 6)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看借贷总览(唤醒词:看借贷):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我看报销汇总(唤醒词:看报销):\n\n  时  间: ____ (选填,如:本月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看分期总览(唤醒词:看分期):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我看退款统计(唤醒词:看退款):\n\n  时  间: ____ (选填,如:本月)\n',
          types: ['查看'],
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
