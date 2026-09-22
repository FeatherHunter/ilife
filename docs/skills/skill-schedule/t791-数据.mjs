#!/usr/bin/env node
/** #791 链路页·**数据件**：唤醒词 → 命令 → 产物（八张域票清单件的汇总读数）。
 *
 *  它是什么：一份**纯数据**（零逻辑、零 IO）——`docs/skills/skill-schedule/t791-链路总览.mjs` 的输入。
 *  为什么单独立件：那张页面要 51 行的唤醒词归属表（哪个词→哪条命令→哪几件产物），
 *  这份表是**本票自己裁的**（老侧清单 `场景清单.json` 零设计列，归属是各域票裁的），
 *  与生成器的渲染/自检代码分开住，读的人一眼能看完、改的人也只会改坏这一件。
 *
 *  三列各是什么（**名字一律不自己算**，见票面「不许动的东西」）：
 *    · `ROWS[].phrase`：唤醒词**逐字**照 `packages/skill-schedule/src/triggers/routes.generated.ts`
 *      （由各能力 `routes.ts` 派生的权威路由表）；`order` 只作核对，读表时以路由表为准；
 *    · `ROWS[].products`：本域清单件里的**逐字文件名**（`t783…t790` 各自探针从 `delivery.path`
 *      复制出来的那一份）——生成器按它定位盘上文件，页面上也逐字印（含 `·` 的照印，不改名）；
 *    · 一件产物**只归一条路由**（生成器逐件核：「谁都没点名」或「被点名两次」都算红）。
 *      故同页的那几条路由共用同一个数组常量，不抄第二遍（抄一遍就多一个定义地）。
 *
 *  读法（生成器照这个顺序走）：① `ROWS` 逐条在路由表里核到（phrase 逐字、order 条条对上）；
 *  ② 八份清单件的每一件产物在 `ROWS` 里恰好被点名一次，且 `file`／`bytes`／`sha256_12` 三个都对上；
 *  ③ 路由表里没被 `ROWS` 点名、也不在 `EXCLUDED` 里的条＝红（漏一条不许放过）。
 *
 *  清单件（归档件，证据可回查）：`.scratch/t783/成品/t783-清单.json` … `.scratch/t790/成品/t790-清单.json`。
 */

/** 一份域清单件（八张域票各一件）：`dir` 是它那一支产物目录（产物名逐字取清单记的那一份）。 */
export const MANIFESTS = [
  { ticket: 783, domain: 'write', file: '.scratch/t783/成品/t783-清单.json', dir: '.scratch/t783/成品', label: '写入与同步' },
  { ticket: 784, domain: 'query-today', file: '.scratch/t784/成品/t784-清单.json', dir: '.scratch/t784/成品', label: '查询与浏览·单日族' },
  { ticket: 785, domain: 'query-range', file: '.scratch/t785/成品/t785-清单.json', dir: '.scratch/t785/成品', label: '查询与浏览·范围与跨天' },
  { ticket: 786, domain: 'query-plan', file: '.scratch/t786/成品/t786-清单.json', dir: '.scratch/t786/成品', label: '查询与浏览·日程族' },
  { ticket: 787, domain: 'plan-write', file: '.scratch/t787/成品/t787-清单.json', dir: '.scratch/t787/成品', label: '日程与计划·写侧' },
  { ticket: 788, domain: 'plan-review', file: '.scratch/t788/成品/t788-清单.json', dir: '.scratch/t788/成品', label: '日程与计划·复盘与飞书' },
  { ticket: 789, domain: 'analyze', file: '.scratch/t789/成品/t789-清单.json', dir: '.scratch/t789/成品', label: '分析与洞察' },
  { ticket: 790, domain: 'admin', file: '.scratch/t790/成品/t790-清单.json', dir: '.scratch/t790/成品', label: '辅助与管理' },
];

/* ── 几组共用的产物（同一枚 key 的几条路由共用一张页：数组常量只写一处） ───────── */

/** 单日整页那五件（七条路由共用）。 */
const TODAY_PAGE = [
  '今天总结（满 24h）.html', '今天总结（指定日期）.html', '今天总结（昨日）.html',
  '今天总结（无记录）.html', '今天总结（老侧空日示例）.html',
];
/** 区间汇总那两件（「汇总作息」「查作息范围」「查作息游标」三条共用）。 */
const RANGE_PAGE = ['区间汇总（21 天）.html', '区间汇总（本周）.html'];
/** 记录三件套结果那三件（「补一条作息」「录作息」「记作息」三条共用）。 */
const RECORD_RESULT = ['记作息结果（单条）.html', '记作息结果（JSON 一条）.html', '记作息结果（只记一级）.html'];
/** 批量导入回执那两件（『records[]』形态）。 */
const BATCH_RECEIPT = ['批量导入回执.html', '批量导入回执（部分成）.html'];
/** 修正作息回执（三条 amend 路由共用）。 */
const AMEND_RECEIPT = ['修正作息回执.html'];
/** 对比那三件（三条 months 路由共用）。 */
const COMPARE_PAGE = ['对比两个月.html', '对比（上周和这周）.html', '对比（工作日对周末）.html'];
/** 查日程那六件（「查日程」「看日程」两条共用）。 */
const PLAN_DAY_PAGE = [
  '查日程（今日）.html', '查日程（指定日期）.html', '查日程（标题搜索命中）.html',
  '查日程（标题搜索零命中）.html', '查日程（时段查重）.html', '查日程（含已软删）.html',
];
/** 商量计划那一对的预览页。 */
const PREVIEW_PAGE = ['商量计划预览（过程型）.html'];
/** 商量计划那一对的结果页。 */
const RESULT_PAGE = [
  '制定次日计划结果.html', '制定次日计划结果（调整后再生成）.html', '制定次日计划结果（无历史参考）.html',
];

/** 51 条路由 → 一行一条归属（顺序＝路由表 order）。 */
export const ROWS = [
  // ── HELP 一族（schedule.help.lookup）──────────────────────────────────────────
  { phrase: '作息管家 HELP', order: 0, kind: 'HELP 文件', products: [], note: '四条 HELP 别名命中的就是 HELP 文件本身（唯一那条链）' },
  { phrase: '作息管家帮助', order: 1, kind: 'HELP 文件', products: [], note: '同「作息管家 HELP」那一份产物' },
  { phrase: '作息管家能做什么', order: 2, kind: 'HELP 文件', products: [], note: '同「作息管家 HELP」那一份产物' },
  { phrase: '作息管家使用说明', order: 3, kind: 'HELP 文件', products: [], note: '同「作息管家 HELP」那一份产物' },
  // ── 查询与浏览·单日族（schedule.record.today：一枚 key 七条路由共用一张页）──────
  { phrase: '今天总结', order: 4, kind: '单日整页', products: TODAY_PAGE, note: '七条路由全落这一枚 key，出口只按 key 分派 ⇒ 一条路由一张页、各词共用' },
  { phrase: '今日作息', order: 5, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页（同一枚 key）' },
  { phrase: '今日总结', order: 6, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页（同一枚 key）' },
  { phrase: '今天作息', order: 7, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页（同一枚 key）' },
  { phrase: '查作息时间轴', order: 8, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页（同一枚 key）' },
  { phrase: '查作息状态', order: 9, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页：老侧那五条状态读数上了页尾「作息库现状」' },
  { phrase: '查作息', order: 11, kind: '单日整页', products: TODAY_PAGE, note: '同「今天总结」那一张页（同一枚 key）' },
  // ── 查询与浏览·范围与跨天（schedule.record.range）────────────────────────────
  { phrase: '汇总作息', order: 12, kind: '区间整页', products: RANGE_PAGE, note: '区间汇总：分类聚合 ＋ 7 维趋势 ＋ 睡眠统计（21 天／本周两趟）' },
  { phrase: '查作息范围', order: 13, kind: '区间整页', products: RANGE_PAGE, note: '同「汇总作息」那一张页（同一枚 key）' },
  { phrase: '查作息游标', order: 14, kind: '区间整页', products: RANGE_PAGE, note: '同「汇总作息」那一张页（游标只是取值起点）' },
  { phrase: '周视图', order: 48, kind: '周视图整页', products: ['周视图.html'], note: '7×24 全分类矩阵那一张页（键同区间汇总，preset 分档）' },
  // ── 查询与浏览·详情（schedule.record.detail）──────────────────────────────────
  { phrase: '查作息详情', order: 15, kind: '详情整页', products: ['作息详情（按日）.html', '作息详情（推理链）.html'], note: '同一枚 key 两支（按日／按 ID），同一张页：11 个字段逐条上台面 ＋ 推理链全文' },
  { phrase: '按ID查记录', order: 16, kind: '详情整页', products: ['作息详情（按 ID）.html'], note: '老 HELP 那条不带空格的原词' },
  { phrase: '按 ID 查记录', order: 49, kind: '详情整页', products: ['作息详情（按 ID）.html'], note: '老 HELP 那条带空格的原词，键与槽位同「按ID查记录」' },
  // ── 写入与同步（schedule.record.write）───────────────────────────────────────
  { phrase: '补一条作息', order: 17, kind: '写库回执整页', products: [...RECORD_RESULT, ...BATCH_RECEIPT], note: 'op=add：三件套结果页三档 ＋ 批量导入回执两档（同一枚 key 的形态）' },
  { phrase: '录作息', order: 18, kind: '写库回执整页', products: RECORD_RESULT, note: '同「补一条作息」那一族（op=add）' },
  { phrase: '修正作息', order: 19, kind: '写库回执整页', products: AMEND_RECEIPT, note: 'op=amend：蓝调 diff ＋ 多字段前后对照' },
  { phrase: '改作息', order: 20, kind: '写库回执整页', products: AMEND_RECEIPT, note: '同「修正作息」那一张页（op=amend）' },
  { phrase: '这条记错了', order: 21, kind: '写库回执整页', products: AMEND_RECEIPT, note: '同「修正作息」那一张页（op=amend）' },
  { phrase: '写作息摘要', order: 22, kind: '写库回执整页', products: ['写作息摘要回执.html'], note: 'op=summary：老侧只写库不产页，这一张页由写入与同步那一票补' },
  { phrase: '记作息', order: 23, kind: '写库回执整页', products: BATCH_RECEIPT, note: '同「补一条作息」那一族（批量导入那一支）' },
  // ── 分析与洞察（schedule.record.compare）─────────────────────────────────────
  { phrase: '对比两个月', order: 24, kind: '分析整页', products: COMPARE_PAGE, note: 'kind=months：整月对比 ＋ 任意两段（区间／工作日对周末）' },
  { phrase: '月份对比', order: 25, kind: '分析整页', products: COMPARE_PAGE, note: '同「对比两个月」那一张页（kind=months）' },
  { phrase: '跨月对比', order: 26, kind: '分析整页', products: COMPARE_PAGE, note: '同「对比两个月」那一张页（kind=months）' },
  { phrase: '类别深挖', order: 27, kind: '分析整页', products: ['类别深挖（区间）.html', '类别深挖（单日）.html'], note: 'kind=category：24h×N 天热力图 ＋ 分类总览 ＋ 记录明细（区间／单日两档）' },
  { phrase: '异常检测', order: 28, kind: '分析整页', products: ['异常检测（7 天）.html', '异常检测（30 天）.html'], note: 'kind=anomaly：红框黄框 ＋ 7 维雷达（7 天／30 天两档窗口）' },
  // ── 查询与浏览·日程族（schedule.plan.today）──────────────────────────────────
  { phrase: '查多日计划', order: 29, kind: '日程整页', products: ['查多日计划（3 天）.html'], note: 'view=aggregate：多日一表 ＋ 逐日 24 格' },
  { phrase: '24h 概览', order: 30, kind: '日程整页', products: ['24h 概览（1 天）.html'], note: '同「查多日计划」那一张页的单日档' },
  { phrase: '查日程', order: 31, kind: '日程整页', products: PLAN_DAY_PAGE, note: '四支共用一张页：缺省／按标题搜／按时段查重／含已软删（各一趟产物）' },
  { phrase: '看日程', order: 32, kind: '日程整页', products: PLAN_DAY_PAGE, note: '同「查日程」那一张页（同一枚 key）' },
  // ── 日程与计划（schedule.plan.write）─────────────────────────────────────────
  { phrase: '商量计划', order: 33, kind: '过程型预览 ＋ 结果整页', products: [...PREVIEW_PAGE, ...RESULT_PAGE], note: 'op=preview 先预览（不写库），落盘那一趟出结果页 —— 两页一条链' },
  { phrase: '一起规划', order: 34, kind: '过程型预览 ＋ 结果整页', products: PREVIEW_PAGE, note: '同「商量计划」那一对页的预览（锁定事件区就是这一天已有的排布）' },
  { phrase: '规划明天', order: 35, kind: '过程型预览 ＋ 结果整页', products: RESULT_PAGE, note: '同「商量计划」那一对页的结果页（落盘那一趟，三档）' },
  { phrase: '规划一天', order: 36, kind: '过程型预览 ＋ 结果整页', products: ['制定次日计划结果（调整后再生成）.html'], note: '同「商量计划」那一对页的结果页（把某一段改时间之后再生成一版）' },
  { phrase: '讨论计划', order: 37, kind: '过程型预览 ＋ 结果整页', products: PREVIEW_PAGE, note: '同「商量计划」那一对页的预览（op=preview）' },
  { phrase: '补计划', order: 38, kind: '写库回执整页', products: ['补计划回执（新建）.html', '补计划回执（幂等命中）.html', '补计划回执（含备注·远端没成）.html', '补计划回执（多天批量）.html'], note: 'op=ensure：新建档 ＋ 幂等命中档 ＋ 含备注那一档（这一趟远端没成）＋ 多天批量（『dates[]』形态）' },
  { phrase: '改计划', order: 39, kind: '写库回执整页', products: ['改计划回执（改时段）.html', '改计划回执（只改完成状态）.html'], note: 'op=update：改时段 ＋ 只改完成状态两档' },
  { phrase: '删计划', order: 40, kind: '写库回执整页', products: ['删计划回执（软删）.html'], note: 'op=deactivate：软删语义写在页上' },
  { phrase: '复盘今日', order: 41, kind: '复盘整页', products: ['复盘今日.html'], note: 'op=review ＋ granularity=day：计划对实际 ＋ 健康分' },
  { phrase: '复盘本周', order: 42, kind: '复盘整页', products: ['复盘本周.html'], note: 'op=review ＋ granularity=week：7 维趋势 ＋ 热力图' },
  { phrase: '复盘本月', order: 43, kind: '复盘整页', products: ['复盘本月.html'], note: 'op=review ＋ granularity=month：月度聚合 ＋ 环比对比' },
  { phrase: '复盘区间', order: 44, kind: '复盘整页', products: ['复盘区间（1 天·按今日档）.html', '复盘区间（7 天·按本周档）.html', '复盘区间（61 天·通用档）.html'], note: '同一枚 key 按跨度路由：≤1 天／≤7 天／其余三档（各一份产物）' },
  { phrase: '日程管家同步', order: 45, kind: '飞书回执整页', products: ['日程管家同步（回执）.html'], note: 'op=sync：这一趟的账 ＋ 没成的逐条' },
  { phrase: '飞书探测', order: 46, kind: '飞书只读整页', products: ['飞书探测（没装）.html', '飞书探测（三档全通）.html', '飞书探测（装了没登录）.html'], note: 'op=sync ＋ dryRun=true：只读三档（这一条建零改零删）' },
  { phrase: '复盘', order: 47, kind: '复盘整页', products: ['复盘（逐条标记）.html', '复盘（该日无活跃事件）.html', '复盘（已全部标记）.html'], note: '裸词：单日逐条那张页（逐条 completion ＋ 讨论区），三档（标准／该日无活跃事件／已全部标记）' },
  // ── 辅助与管理（schedule.help.lookup ＋ preset 分档）─────────────────────────
  { phrase: '初始化数据库', order: 10, kind: '管理回执整页', products: ['初始化回执（新建）.html', '初始化回执（已就绪）.html', '初始化回执（有数据）.html'], note: 'view=init：新建／已就绪／有数据三档（建库幂等）' },
  { phrase: '首次使用', order: 50, kind: '管理向导整页', products: ['首次使用向导.html'], note: 'view=firstUse：老侧 6 步 ＋ 飞书强引导 ＋ 初始化报告' },
];

/**
 * 路由表里的**有意不出**条——生成器**从路由表自己认**（不写死短语，写死就多一个定义地）：
 *   ① 落 `schedule.help.lookup` 且**没有 preset** 的四条（`作息管家 HELP`／帮助／能做什么／使用说明）：
 *      它们命中的是 HELP 文件本身——那一份产物已经挂在那四条自己的行上，这里是「不另出第二条产物」；
 *   ② 老侧有、新仓**没有命令**的三条语取链（准备消息／同步作息／增量同步）：地图 `Out of scope`
 *      （外置消息库为准），老侧本身也只回分页 JSON。
 *  `reason` 按**认法**给（键＋preset 条件／新仓无此命令），不按短语给：换一条别名进来理由照样成立。
 */
export const EXCLUDED = {
  helpAlias: '命中的就是 HELP 文件本身（四条别名与「作息管家 HELP」同一份产物，不另出第二条产物链）',
  noCommandWakeWords: ['#1 准备消息', '#2 同步作息', '#3 增量同步'],
  noCommandReason: '语取链：地图 Out of scope（外置消息库为准），新仓没有它的命令；老侧本身也只回分页 JSON',
};
