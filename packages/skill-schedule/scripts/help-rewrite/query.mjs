/** #975 · 重写表 · **查询与浏览**（query 域：12 条唤醒词／28 条场景）。
 *
 * 域内场景（次序与 fixture 一致）：今天总结×4、汇总作息×2、查作息×4、查作息详情×3、
 * 查作息时间轴×2、查作息范围×3、查作息状态×1、查日程×5、24h 概览×1、查多日计划×1、
 * 按 ID 查记录×1、周视图×1。
 * 写法与口径见 `../help-rewrite-base.mjs` 的文件头；本域特别约定：
 *  - 老 `range` 把起止塞进一个字段，按 hint 分两路：
 *    hint 是 `YYYY-MM-DD ~ YYYY-MM-DD` 的（`summary_range_default`／`range_default`）按 §0.1
 *    拆成 `start_date`／`end_date` 两个 `date`，老名 `range` 进 `drops`；
 *    hint 是「任意范围／任意」这种**接受相对词**的（`summary_range_full`／`range_text`）保持 `text`＋hint——
 *    口径层 `resolveRangeParam` 只认 `RELATIVE_RANGES` 里的相对词（`src/policy/record.ts:58-77`），
 *    起止由执行侧解，硬套 `date` 会把相对词挡在控件外；
 *    hint 是 `本周(自动计算)` 的（`range_this_week`）**零参**：那张卡就是「本周」这一档的示范，
 *    窗口由口径按周一到周日算（与 `复盘本周`／`复盘本月` 同例），再挂一个可改写的时间范围字段
 *    等于和通用卡 `range_default` 重复 ⇒ 老名 `range` 具名丢弃、窗口写进意图句。
 *  - 「周视图」的老维度 `week`（`目标周(默认本周;锚点日期 YYYY-MM-DD)`）不立 `week` kind：
 *    处理函数读的是**锚点那一天**（`weekDatesOf(resolveDateParam(params))`，`src/query/handlers.ts:70-79`），
 *    故立 `date` 字段（名与命令槽位 `params.date` 同名），老名 `week` 具名丢弃。
 *  - 老 `date` 的「今天／昨天」是相对默认词 ⇒ 进 `hint`（`空＝今天`／`空＝昨天`），不进 `value`。
 */
import { F, scene } from '../help-rewrite-base.mjs';

export const SCENES = [
  /* 今天总结 ×4：老 dims 的 `complete`（`true`／`false`）与 `records`（`0`）都是**描述当前局面**的开关
     （这一天记满没有／有没有记录），不是用户要填的参数 ⇒ 改写成意图句的一部分，维度名具名丢弃。 */
  scene(
    'summary_full_24h',
    '一整天记满的回顾',
    '今天总结',
    '我要今天一整天的作息综合报告,这一天已经记满 24 小时。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
    ['complete'],
  ),

  scene(
    'summary_partial',
    '还没记完的当天小结',
    '今天总结',
    '我要今天的作息小结,这一天还没记完,先按已有的记录给。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
    ['complete'],
  ),

  scene(
    'summary_specific_date',
    '指定某天的总结',
    '今天总结',
    '我要某一天的作息总结。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-22'),
    ],
  ),

  scene(
    'summary_no_records',
    '那天一条记录都没有',
    '今天总结',
    '我要某一天的作息总结,那天一条记录都没有,如实告诉我。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-22'),
    ],
    ['records'],
  ),

  /* 汇总作息 ×2：老 hint 是 `YYYY-MM-DD ~ YYYY-MM-DD` ⇒ 双空位拆成起止两个 `date`（老名 `range` 丢弃）。 */
  scene(
    'summary_range_default',
    '一段日期的作息汇总',
    '汇总作息',
    '我要一段日期的作息汇总。',
    [
      F('start_date', '开始日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-13；含当天'),
      F('end_date', '结束日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-19；不早于开始日期'),
    ],
    ['range'],
  ),

  /* 老 `range` 是「任意范围」（接受相对词）⇒ `text`＋hint；`format: "text"` 是这一档的**呈现开关**
     （处理函数不读 `params.format`，`src/query/handlers.ts` 零命中）⇒ 进意图句，维度名具名丢弃。 */
  scene(
    'summary_range_full',
    '一段时间的文本汇总',
    '汇总作息',
    '我要一段时间的作息汇总,直接回文本,不用出页面。',
    [
      F('range', '时间范围', 'text', true, '接受 本周、上周、上月 这类相对词，也可写起止日期'),
    ],
    ['format'],
  ),

  /* 查作息 ×4：「今天／昨天」进 `hint`；`records: 0`（那天没有记录）是局面开关 ⇒ 进意图句并具名丢弃。 */
  scene(
    'record_list_today',
    '今天做过什么',
    '查作息',
    '我想看看今天我做了什么。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
  ),

  scene(
    'record_list_yesterday',
    '昨天做过什么',
    '查作息',
    '我想看看昨天我做了什么。',
    [
      F('date', '日期(选填)', 'date', false, '空＝昨天；填了必须是 YYYY-MM-DD'),
    ],
  ),

  scene(
    'record_list_specific',
    '某一天做过什么',
    '查作息',
    '我想看看某一天我做了什么。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
    ],
  ),

  scene(
    'record_list_empty',
    '那天没有任何记录',
    '查作息',
    '我想看看某一天我做了什么,那天一条记录都没有,如实告诉我。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-01'),
    ],
    ['records'],
  ),

  /* 查作息详情 ×3：`include_reasoning`（`true`）是局面开关（这一档要看 AI 的归类依据）⇒ 进意图句并丢弃。 */
  scene(
    'detail_day',
    '某一天的全部详情',
    '查作息详情',
    '我要看某一天的全部作息详情,每条记录都展开。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
    ],
  ),

  /* 老 `record_id` 的 hint 是 `N`（数值族）⇒ `number`；口径按正整数收（`needInt`，`src/query/handlers.ts:35-41`），
     故给 `min: 1`。 */
  scene(
    'detail_record',
    '这条记录的完整详情',
    '查作息详情',
    '我要看某一条记录的完整详情。',
    [
      F('record_id', '记录 ID', 'number', true, '纯数字，如 123；从查作息或时间轴里取', { min: 1 }),
    ],
  ),

  scene(
    'detail_with_reasoning',
    '某一天的分类依据',
    '查作息详情',
    '我要看某一天的作息是怎么被归类的,把 AI 的判断依据一起给我。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
    ],
    ['include_reasoning'],
  ),

  /* 查作息时间轴 ×2：单日，故一律 `date`。 */
  scene(
    'timeline_today',
    '今天的时间轴',
    '查作息时间轴',
    '我要看今天的 24 小时时间轴。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
  ),

  scene(
    'timeline_specific',
    '某一天的时间轴',
    '查作息时间轴',
    '我要看某一天的 24 小时时间轴。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
    ],
  ),

  /* 查作息范围 ×3：起止型拆两个 `date`；相对窗口型（本周／任意）保持 `text`＋hint。 */
  scene(
    'range_default',
    '一段日期的统计',
    '查作息范围',
    '我要看一段日期的作息统计。',
    [
      F('start_date', '开始日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-13；含当天'),
      F('end_date', '结束日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-19；不早于开始日期'),
    ],
    ['range'],
  ),

  /* 老 `range` 是「本周(自动计算)」（预置相对窗口）⇒ 相对默认词进 `hint`（空＝本周），字段保持 `text`。 */
  scene(
    'range_this_week',
    '本周的统计',
    '查作息范围',
    '我要看本周的作息统计,就按周一到周日这一整周。',
    [],
    ['range'],
  ),

  scene(
    'range_text',
    '统计直接给文本',
    '查作息范围',
    '我要看某一段时间的作息统计,直接回文本,不用出页面。',
    [
      F('range', '时间范围', 'text', true, '接受 本周、上周、上月 这类相对词，也可写起止日期'),
    ],
    ['format'],
  ),

  /* 查作息状态：老 `scope: "all"` 说的是「看整库」这一局面——处理函数不读 `params.scope`，
     整库读数一律由 `getStatus` ＋ `getLastRecord` 给（`src/query/handlers.ts:43-45`）⇒ 进意图句并具名丢弃。 */
  scene(
    'status_default',
    '作息库整体怎么样',
    '查作息状态',
    '我要看作息库整体的状态,一共记了多少、最近记到哪一天。',
    [],
    ['scope'],
  ),

  /* 查日程 ×5：`include_inactive`（`true`）是局面开关（这一档要把撤下的也列出来）⇒ 进意图句并丢弃。 */
  scene(
    'list_events_today',
    '今天的日程',
    '查日程',
    '我要看今天的日程安排。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
  ),

  scene(
    'list_events_specific',
    '某一天的日程',
    '查日程',
    '我要看某一天的日程安排。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
    ],
  ),

  scene(
    'search_event_title',
    '按标题找一条日程',
    '查日程',
    '我想在今天里找找有没有某件事的安排。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
      F('title', '标题关键词', 'text', true, '如 健身'),
    ],
  ),

  /* 老 `time_start`／`time_end` 的 hint 就是 `HH:MM` ⇒ `time`：口径层 `normalizeTime` 强校验 HH:MM
     （`src/policy/record.ts:36-42`），处理函数拿它们当查重窗口（`src/query/handlers.ts:104-113`）。 */
  scene(
    'search_event_triplet',
    '某个时段有没有安排',
    '查日程',
    '我想看看今天某个时段里有没有安排。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 17:00'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 18:00；须晚于开始时刻'),
    ],
  ),

  scene(
    'list_events_inactive',
    '今天删掉了哪些日程',
    '查日程',
    '我要看今天有哪些日程被删掉了,删掉的那些也要一并列出来。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
    ['include_inactive'],
  ),

  scene(
    'query_plans_today',
    '今天一整天的安排',
    '24h 概览',
    '我要看今天 24 小时的整体安排。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；填了必须是 YYYY-MM-DD'),
    ],
  ),

  /* 老 `dates` 的 hint 是 `YYYY-MM-DD,YYYY-MM-DD,...`：多值不锁闭集 ⇒ `text`＋hint（票面同判）。 */
  scene(
    'query_plans_multi',
    '连着几天的计划',
    '查多日计划',
    '我要看连着几天的计划安排。',
    [
      F('dates', '日期(可多天)', 'text', true, '格式 YYYY-MM-DD，多天用逗号分隔，如 2026-07-13,2026-07-14,2026-07-15'),
    ],
  ),

  scene(
    'get_record_basic',
    '按记录 ID 定位一条',
    '按 ID 查记录',
    '我要看某一条记录的详情,靠记录 ID 定位。',
    [
      F('record_id', '记录 ID', 'number', true, '纯数字，如 123；从查作息或时间轴里取', { min: 1 }),
    ],
  ),

  /* 周视图：老 `week` 的「目标周」由锚点那天算出来 ⇒ 立 `date`（锚点日期，与命令槽位 `params.date` 同名），
     老名 `week` 具名丢弃；本家 `week` kind 零实例（票面 Q7 裁定不启用）。 */
  scene(
    'week_view',
    '一周七天的作息总览',
    '周视图',
    '我要看这一周从周一到周日的作息总览。',
    [
      F('date', '锚点日期(选填)', 'date', false, '空＝本周；填这一周里的任意一天，格式 YYYY-MM-DD'),
    ],
    ['week'],
  ),
];
