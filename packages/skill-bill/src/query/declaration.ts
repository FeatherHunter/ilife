/** #721 · 查询域的**域声明**（手写、唯一事实源）。
 *
 * 一条唤醒词的字面量只准住在这里（判据＝`test/t721-判据与摘要锁.test.mjs` 扫非声明件）；
 * 场景的 `wake_word` 是投影、不写——词条拥有它；二级组按场景 id 指回词条名下的场景。
 * 合并方：`src/triggers/wakeTable.ts`（词表＋路由＋派生）与 `src/triggers/wake-assets.ts`（HELP 目录）。
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
          prompt_template: '请加载「饼干记账」技能,帮我看今天的收支(唤醒词:查今天):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我看昨天的收支(唤醒词:查昨天):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我查某天的账(唤醒词:查某天):\n\n  日  期: ____ (如:5月1号 / 上周五 / 2026-05-01)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我看最近的记录(唤醒词:查最近):\n\n  条  数: ____ (选填,默认 10)\n  排  序: ____ (选填,如:金额从大到小)\n  近几天: ____ (选填,如:近7天 / 近30天;与条数二选一)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查账单(唤醒词:查账单):\n\n  日  期: ____ (选填,默认今天;可写「昨天」或「2026-09-06」)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某周的账(唤醒词:查周):\n\n  周: ____ (如:本周 / 上周 / 5月第2周 / 2026-05-11那一周)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某个月的账(唤醒词:查月):\n\n  月: ____ (如:本月 / 上月 / 3月 / 2026-03)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某段时间的账(唤醒词:查区间):\n\n  开始日期: ____ (如:5月1号 / 2026-05-01)\n  结束日期: ____ (如:5月10号 / 2026-05-10;某年填 12月31日)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某分类的账(唤醒词:查分类):\n\n  分  类: ____ (如:餐饮 / 出行 / 奶茶)\n  时  间: ____ (选填,如:本月 / 5月 / 5月1到10号)\n  账  户: ____ (选填,如:支付宝)\n  账  本: ____ (选填)\n  收  支: ____ (选填,支出/收入/全部,默认全部)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某账户的流水(唤醒词:查账户):\n\n  账  户: ____ (如:支付宝 / 微信 / 招行)\n  时  间: ____ (选填,如:本月 / 上月)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查某账本的记录(唤醒词:查账本):\n\n  账  本: ____ (如:生活 / 旅行 / 借贷)\n  时  间: ____ (选填)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我搜备注关键词(唤醒词:搜备注):\n\n  关键词: ____\n',
          types: ['查看'],
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
          title: '查标签(#tag 聚合)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我查标签(唤醒词:查标签):\n\n  标  签: ____ (如:#旅行 / #待报销)\n',
          types: ['查看'],
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
          title: '查未还欠款(借贷状态)',
          status: '',
          prompt_template: '请加载「饼干记账」技能,帮我查欠款(唤醒词:查欠款):\n\n  对  象: ____ (选填,如:小明;不填查全部)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查待报销(唤醒词:查待报销):\n',
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
          prompt_template: '请加载「饼干记账」技能,帮我查分期(唤醒词:查分期):\n\n  名  目: ____ (选填,如:手机;不填查全部)\n',
          types: ['查看'],
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
          prompt_template: '请加载「饼干记账」技能,帮我查一条账单的详情(唤醒词:查账单详情):\n\n  记录 id: ____ (从「查账单」或「查今天」的列表里取)\n',
          types: ['查看'],
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
