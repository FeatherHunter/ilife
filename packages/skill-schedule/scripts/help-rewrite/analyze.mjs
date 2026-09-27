/** #975 · 重写表 · **分析**（analyze 域：5 条唤醒词／12 条场景）。
 *
 * 域内场景（次序与 fixture 一致）：写作息摘要×2、整月对比、任意范围对比、周对比、
 * 修正作息×3（基本／JSON 内联／超 24h 提醒）、类别深挖×2（区间／单日）、异常检测×2。
 * 写法与口径见 `../help-rewrite-base.mjs` 的文件头；本域另有四条约定：
 *  - **分类一律 `text`**：它收的是开放名（一级名／二级名／`一级.二级` 路径都收），口径按 `l1Of`
 *    归到一级分类再筛（八个一级白名单见 `src/policy/category.ts:6`，归一见 `src/analyze/handlers.ts`），
 *    不是老 prompt 里点名的闭集 ⇒ 不立 `select`；
 *  - **区间拆两行**：老维度把起止塞进一格（`YYYY-MM-DD ~ YYYY-MM-DD`）的，按 §0.1 拆成
 *    `*_start`／`*_end` 两个 `date`，老名进 `drops`；
 *  - **口径自算的值不立字段**：一条记录有多旧、某个相对窗口落在周几到周几，口径自己算得出来
 *    （相对范围见 `src/policy/routing.ts:35`；fixture 里 `compare_week_vs_week` 的 result 就写着「自动计算」），
 *    立成字段只会让用户填错 ⇒ 写进意图句并具名 `drops`；
 *  - **`number` 的值域直接抄口径**：`total_minutes` 是 0~1440 的整数（`src/policy/record.ts:157`）、
 *    记录 id 是正整数（`:122`）、异常窗口 `windowDays` 是 2~90（`:190`）——不自己另定一套数。
 */
import { F, scene } from '../help-rewrite-base.mjs';

export const SCENES = [
  /* 摘要基本形：老 prompt 的 `2026-07-22` 是裸日期，`工作.AI调优` 与 `60 分钟` 是预置值，
     三者分别落成 date／category／total_minutes 三个字段。摘要按「天 ＋ 一级分类」各存一行。 */
  scene(
    'add_summary_basic',
    '写摘要',
    '写作息摘要',
    '我要给某天的某个分类补一条时长摘要。如果我没说全日期、分类或时长,问我补齐。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-22'),
      F('category', '分类', 'text', true, '白名单里的一级分类(八类之一)，如 工作'),
      F('total_minutes', '总时长', 'number', true, '单位分钟，纯数字，如 60', { min: 0, max: 1440, step: 1 }),
    ],
  ),

  /* 再写一次：老 prompt 的 `(已有)` 是**局面**（这天这个分类已经写过一行），不是用户要填的值 ⇒
     进意图句，不立字段；老维度 date／category 两个名字都留在字段里，故无 `drops`。
     口径是 upsert（`src/fetch/db.ts:271` 的 `ON CONFLICT(date, category) DO UPDATE`）＝新时长盖旧的。 */
  scene(
    'add_summary_idempotent',
    '重写已有摘要',
    '写作息摘要',
    '同一天同一个分类我已经写过一条了,再写一次要把原来那条的时长盖掉。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-22'),
      F('category', '分类', 'text', true, '白名单里的一级分类(八类之一)，如 工作'),
    ],
  ),

  /* 整月对比：老字段的 hint 就是 `YYYY-MM`，正是 #978 落的 `month` kind 的形状。 */
  scene(
    'compare_months',
    '整月对比',
    '对比两个月',
    '我要对比两个月的作息。',
    [
      F('month_a', '前一个月', 'month', true, '格式 YYYY-MM，如 2026-06'),
      F('month_b', '后一个月', 'month', true, '格式 YYYY-MM，如 2026-07'),
    ],
  ),

  /* 任意范围对比：老 `range_a`／`range_b` 一格塞起止 ⇒ 各拆 `*_start`／`*_end` 两个 `date`，
     老名进 `drops`；段名 `label_a`／`label_b` 是开放名（口径空则用起止日期当名字，`record.ts:179`），选填。 */
  scene(
    'compare_range',
    '任意范围对比',
    '对比两个月',
    '我要对比前后两段自定义日期区间的作息(这次不是整月对整月)。',
    [
      F('label_a', '前一段名称(选填)', 'text', false, '如 上周；空＝用起止日期当名字'),
      F('range_a_start', '前一段开始日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-14'),
      F('range_a_end', '前一段结束日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-20'),
      F('label_b', '后一段名称(选填)', 'text', false, '如 本周；空＝用起止日期当名字'),
      F('range_b_start', '后一段开始日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-21'),
      F('range_b_end', '后一段结束日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-27'),
    ],
    ['range_a', 'range_b'],
  ),

  /* 周对比：老 `range_a`／`range_b` 的值是 `周一~周日`——那是「上周／本周」这两个**相对窗口**的定义，
     范围由口径**自动计算**（fixture 的 result 就写着「自动计算」；`routing.ts:42` 上周＝周一~周日）⇒
     不立字段、具名 `drops`；两个段名留下当可选字段，相对默认词（上周／本周）按 §0.2 进 `hint`。 */
  scene(
    'compare_week_vs_week',
    '周对比',
    '对比两个月',
    '我要比上周和这周这两段(这次不是整月对整月)。',
    [
      F('label_a', '前一段名称(选填)', 'text', false, '空＝上周'),
      F('label_b', '后一段名称(选填)', 'text', false, '空＝本周'),
    ],
    ['range_a', 'range_b'],
  ),

  /* 改一条记录多字段：老 prompt 的 `工作.AI调优`／`写代码` 是要改成的新值 ⇒ 两个 `text` 字段；
     老维度 `fields`（`["category","activity"]`）是「这次改哪几个字段」的清单（描述局面），
     不是用户要填的值 ⇒ 具名 `drops`（要改成的值已各有一个字段兜住）。 */
  scene(
    'amend_basic',
    '改 1 条记录多字段',
    '修正作息',
    '我这条作息记错了,要改它的分类和活动。如果我没说清改成什么,问我补齐。',
    [
      F('record_id', '记录 ID', 'number', true, '正整数，纯数字，如 123', { min: 1, step: 1 }),
      F('category', '改成哪个分类', 'text', true, '白名单里的二级分类，如 工作.AI调优；只写一级会提示细化'),
      F('activity', '改成做了什么', 'text', true, '如 写代码'),
    ],
    ['fields'],
  ),

  /* JSON 内联改：老 prompt 的 `id=123` 是裸 id ⇒ `number` 字段（口径要正整数，`record.ts:122`）；
     老维度 `json` 的 `...` 是一段待填文本 ⇒ 一个 `text` 字段，形状进 `hint`。 */
  scene(
    'amend_json_inline',
    'JSON 内联修改',
    '修正作息',
    '我要用一段 JSON 一次改掉一条记录的多个字段。如果我没说全改哪条或改成什么,问我补齐。',
    [
      F('record_id', '记录 ID', 'number', true, '正整数，纯数字，如 123', { min: 1, step: 1 }),
      F('json', 'JSON 内容', 'text', true, '一段 JSON 对象，键＝字段名；如 {"category":"工作.AI调优","activity":"写代码"}'),
    ],
  ),

  /* 超过 24h 提醒：老维度 `record_date` 的值是 `24h 前`，说的是**这条记录有多旧**（局面），
     由记录自身读得出来（口径自算），不是用户要填的参数 ⇒ 具名 `drops`；`(超 24h)` 那句进意图句。
     老 prompt 没说这次要改成什么，故两个改值字段按变体卡写法给选填，缺的由「问我补齐」兜住。 */
  scene(
    'amend_24h_warn',
    '超过 24h 修改警告',
    '修正作息',
    '我要改一条几天前记的作息(已经超过 24 小时了),看看会怎么提醒我。',
    [
      F('record_id', '记录 ID', 'number', true, '正整数，纯数字，如 123', { min: 1, step: 1 }),
      F('category', '改成哪个分类(选填)', 'text', false, '白名单里的二级分类，如 工作.AI调优'),
      F('activity', '改成做了什么(选填)', 'text', false, '如 写代码；和分类至少填一样'),
    ],
    ['record_date'],
  ),

  /* 区间内某分类深挖：老 `range` 一格塞起止 ⇒ 拆 `range_start`／`range_end`，老名进 `drops`；
     老 prompt 的 `这周` 是相对窗口词 ⇒ 按 §0.2 进 `hint`（本周＝周一~周日，`routing.ts:40`）；
     `健身` 是要深挖的分类（口径按 `l1Of` 归到一级再筛）⇒ `text` 字段，例进 `hint`。 */
  scene(
    'category_range',
    '区间内某分类深挖',
    '类别深挖',
    '我要看某个分类在这段时间里都是什么时候做的。',
    [
      F('range_start', '开始日期(选填)', 'date', false, '空＝本周一；格式 YYYY-MM-DD，如 2026-09-21'),
      F('range_end', '结束日期(选填)', 'date', false, '空＝本周日；格式 YYYY-MM-DD，如 2026-09-27'),
      F('category', '分类', 'text', true, '白名单里的分类，如 健身；写二级会按它的一级分类算'),
    ],
    ['range'],
  ),

  /* 单日某分类：老 prompt 的 `7/15` 是裸日期 ⇒ `date` 字段（例进 `hint`）；`健身` 同上。 */
  scene(
    'category_day',
    '单日某分类',
    '类别深挖',
    '我要看某个分类在这一天都是什么时候做的。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-15'),
      F('category', '分类', 'text', true, '白名单里的分类，如 健身；写二级会按它的一级分类算'),
    ],
  ),

  /* 默认窗：老 prompt 的 `最近` 是相对默认词，老维度 `window` 的 7 正是口径缺省值（`record.ts:189`）
     ⇒ 选填、空＝最近 7 天，默认词进 `hint`；值域 2~90 抄口径（`:190`）。 */
  scene(
    'anomaly_default',
    '默认 7 天窗口检测',
    '异常检测',
    '帮我看看最近的状态正不正常,有没有异常。',
    [
      F('window', '回看天数(选填)', 'number', false, '空＝最近 7 天；单位天，纯数字，如 7', { min: 2, max: 90, step: 1 }),
    ],
  ),

  /* 30 天窗：老 prompt 的 `30 天` 是预置值 ⇒ `number` 字段（必填），例进 `hint`。 */
  scene(
    'anomaly_window_30',
    '30 天窗口',
    '异常检测',
    '帮我回看更长一段时间里有没有异常。',
    [
      F('window', '回看天数', 'number', true, '单位天，纯数字，如 30', { min: 2, max: 90, step: 1 }),
    ],
  ),
];
