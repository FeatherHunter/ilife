/** #975 · 重写表 · **日程与计划**（plan 域：10 条唤醒词／28 条场景）。
 *
 * 域内场景（次序与 fixture 一致）：补计划×3、复盘×4、商量计划×4、商量后同步飞书×1、
 * 生成计划结果×5、改计划×4、删计划×2、日程管家同步×1、复盘四档×4（今日／本周／本月／区间）。
 * 写法与口径见 `../help-rewrite-base.mjs` 的文件头；本域特别约定：
 *  - 起止时刻一律 `time`（老 hint 恰是 `HH:MM`），日期一律 `date`；只有「复盘区间」那一条的区间
 *    保持 `text`＋hint（老 hint 明说接受相对词与自由区间语法，硬套 `date` 会把「上周／上月」这类写法弄丢）。
 *  - 老 `dimensions` 里绝大多数是**描述当前局面**的开关（`existing_events:4`／`locked_events:2`／
 *    `conflict`／`drift`／`no_history`／`gap_or_overlap`／`feishu_synced`／`feishu:"full"`／
 *    `memo_cli`／`completion_all`／`events_count`／`round`／`fields`）——它们不是用户要填的参数，
 *    逐条改写进意图句，老维度名进该条 `drops`；`history_days`／`candidates`／四档的 `range` 属口径自算，
 *    同样具名 `drops`。
 *  - 老 prompt 里的预置值（`id=544`／`17:00-18:00`／`2026-07-23`／`已有 4 条`／`第 2 段`）逐条剥离成字段或
 *    进意图句，正文不留裸 ISO 日期、不留 `____`。
 */
import { F, scene } from '../help-rewrite-base.mjs';

export const SCENES = [
  /* 补计划·基础：口径必填 date／time_start／time_end／title（`src/policy/plan.ts:101` 的
     `validateEnsureInput` → `validateEvent` 三元组 ＋ 标题）；老 prompt 的「后天 17:00-18:00 健身」
     三件各自成字段，相对词 `后天` 进 hint。 */
  scene(
    'ensure_event_basic',
    '给某一天补一条安排',
    '补计划',
    '我要往某一天的计划里补一条安排。如果我没说全日期、起止时刻或做什么,问我补齐。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天／后天'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 17:00'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 18:00；须晚于开始时刻'),
      F('title', '做什么', 'text', true, '如 健身'),
    ],
  ),

  /* 补计划·幂等：老 prompt 的「(已有)」是局面（同一时段之前排过），不是用户要填的参数 ⇒ 进意图句；
     字段与基础那条同形（口径只认三元组＋标题，幂等命中由口径按 date＋起止自己判，不另立开关）。 */
  scene(
    'ensure_event_idempotent',
    '同一时段重复补也不新建',
    '补计划',
    '我要在同一天的同一时段再补一遍,这个时段之前已经排过了;已经有了就照原来的留着,别再建一条。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-27；也可写 今天'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 17:00'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 18:00；须晚于开始时刻'),
      F('title', '做什么', 'text', true, '如 健身'),
    ],
  ),

  /* 补计划·含备注：老 `notes`（值「细节」）与 `category`（值「健康.健身」）都是用户要填的 ⇒ 立字段；
     老 prompt 正文里的 `(练背+有氧)` 是备注的例，进 hint。 */
  scene(
    'ensure_event_with_notes',
    '带细节与分类的一条安排',
    '补计划',
    '我要补一条带细节的安排,顺便把它归到某个分类里。如果我没说全日期、起止时刻或做什么,问我补齐。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 17:00'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 18:00；须晚于开始时刻'),
      F('title', '做什么', 'text', true, '如 健身'),
      F('notes', '细节(选填)', 'text', false, '这条安排的补充说明，如 练背+有氧'),
      F('category', '分类', 'text', true, '白名单里的二级分类，如 健康.健身；只写一级会提示细化'),
    ],
  ),

  /* 复盘（裸词）：单日逐条标完成状态那一张（`src/plan/handlers.ts:113-116`，不带 granularity ⇒ 单日）。
     `date` 不给即今天（`resolveDateParam`），故选填、相对词进 hint。 */
  scene(
    'review_today_normal',
    '把这一天的执行情况逐条对一遍',
    '复盘',
    '我要把这一天的计划逐条对一下执行情况,一条条标出完成状态。先给我看这一天的排布,确认后再写入。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
    ],
  ),

  /* `completion_all: true` ＝ 这一天已全部标过（局面）⇒ 进意图句、具名丢弃；字段只剩日期。 */
  scene(
    'review_today_all_done',
    '都标过完成之后再看一遍',
    '复盘',
    '这一天的计划我全都标过完成了,别再让我逐条重标,直接说这一天的结论。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
    ],
    ['completion_all'],
  ),

  /* `events_count: 0` ＝ 这一天没有计划（局面）⇒ 进意图句；老 prompt 的裸日期成 `date` 字段。 */
  scene(
    'review_no_events',
    '这一天没有计划时怎么看',
    '复盘',
    '我要看的那一天没有任何计划,别报成故障,告诉我这一天没得对就行。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-01'),
    ],
    ['events_count'],
  ),

  /* `memo_cli: true` ＝ 这一趟先拉备忘录的打卡数据（局面）⇒ 进意图句、具名丢弃。 */
  scene(
    'review_with_memo_sync',
    '先对备忘录打卡数据再逐条对',
    '复盘',
    '我要先把备忘录里这一天的打卡数据对一遍,再逐条对计划的执行情况。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
    ],
    ['memo_cli'],
  ),

  /* 商量计划：口径必填 date ＋ 非空 events（`src/policy/plan.ts:90` 的 `validateUpsertInput`，
     preview 只校验不落盘）⇒ 日期必填；先出候选、用户确认后落库是这一支的固定流程，进意图句。 */
  scene(
    'plan_discuss_tomorrow',
    '商量某一天怎么安排',
    '商量计划',
    '我想商量某一天怎么安排,先跟我把候选排出来,我看过再落库。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天／后天'),
    ],
  ),

  /* `existing_events: 4` ＝ 这一天已经排了几条（局面）⇒ 进意图句；锁定后填空隙的做法也写在意图里。 */
  scene(
    'plan_with_locked',
    '已有几条锁定时把空档填起来',
    '商量计划',
    '这一天我已经排了几条,就在这几条之外把空档填起来,先跟我把候选排出来,我看过再落库。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['existing_events'],
  ),

  /* `memo_cli: true` ＝ 这一趟去拉备忘录的心愿清单（局面）⇒ 具名丢弃、进意图句；
     老 prompt 的「心愿 X」是开放名 ⇒ 立一个选填 `text`（不给就由技能从清单里挑）。 */
  scene(
    'plan_with_wish',
    '把心愿排进这一天',
    '商量计划',
    '我想把心愿清单里的事排进这一天,先把心愿列出来跟我一起挑,看过候选再定。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
      F('wish', '要排的心愿(选填)', 'text', false, '要推进的那件事，如 体检预约；空＝我自己从心愿清单里挑'),
    ],
    ['memo_cli'],
  ),

  /* `gap_or_overlap: true` ＝ 候选排布有空隙或重叠（局面）⇒ 进意图句。
     口径那道门是 24h 覆盖（首 00:00、尾 23:59／24:00、逐条首尾相接，`src/policy/plan.ts:67`），
     意图句按用户能懂的话说「首尾相接」。 */
  scene(
    'plan_24h_coverage_fail',
    '候选有空隙或撞车时重新排',
    '商量计划',
    '我这次排出来的安排有空隙或者撞车,请把不连续的地方点出来,重新排到一天首尾相接。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['gap_or_overlap'],
  ),

  /* `feishu: "full"` ＝ 这一趟连远端一起同步（局面；现口径的远端开关只有 `ensure`／`skip`，
     都不是用户要挑的值）⇒ 具名丢弃、进意图句。 */
  scene(
    'plan_feishu_sync',
    '商量完顺手同步到飞书',
    '商量计划',
    '商量完这一天的安排之后,顺便整份同步到飞书日历,同步前先问我一句。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['feishu'],
  ),

  /* `history_days: 7` ＝ 贴合率回看多少天（口径自算）、`candidates: "6-10 段"` ＝ 候选段数（口径按空档算）
     ⇒ 两者都进 `drops`；用户能给的只有「排哪一天」。 */
  scene(
    'plan_result_tomorrow',
    '出一张计划结果页',
    '商量计划',
    '帮我按这一天的空档把计划排出来,出一张能看的计划结果,标出跟平时习惯贴不贴。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['history_days', 'candidates'],
  ),

  /* `round: "2-N"` ＝ 这是第几轮调整（局面）⇒ 进意图句、具名丢弃；老 prompt 的「第 2 段」「19:00」
     是这次要改的那一处 ⇒ 立一个自由文本 `change`，例进 hint（版本不覆盖是这一支的固定做法，写进意图句）。 */
  scene(
    'plan_result_adjust',
    '改一处再出一版候选',
    '商量计划',
    '候选那一版我看过了,想改一处再出一版,新版跟上一版都留着,别把上一版盖掉。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
      F('change', '要怎么改', 'text', true, '如 第 2 段改成 19:00 开始'),
    ],
    ['round'],
  ),

  /* `no_history: true` ＝ 库里没有历史作息可参考（局面）、`history_days: 7` ＝ 口径自算的回看窗口
     ⇒ 两者都具名丢弃；贴合度显示「—」不降级那件事写进意图句。 */
  scene(
    'plan_result_history_none',
    '还没有历史作息可参考时怎么排',
    '商量计划',
    '这是个新环境,还没有历史作息可参考,照样把这一天的计划排出来,贴合那一栏空着就行。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['history_days', 'no_history'],
  ),

  /* `locked_events: 2` 与 `conflict: true` ＝ 已锁定的条数与候选撞车（都是局面）⇒ 进意图句、具名丢弃。 */
  scene(
    'plan_result_conflict',
    '候选跟已锁定的安排撞上了',
    '商量计划',
    '这一天已经锁定了不能动的安排,候选里有跟它们撞上的,请把冲突点标出来让我改。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['locked_events', 'conflict'],
  ),

  /* `drift: true` ＝ 这一版跟历史习惯偏离（局面）⇒ 具名丢弃；老 prompt 的「把下午改成运动」是场景举例
     （§0.2 举例豁免），照旧留在意图句里。 */
  scene(
    'plan_result_drift',
    '排得跟平时习惯不一样',
    '商量计划',
    '我想把下午换成运动,跟平时下午都在工作的习惯不一样,是我有意这么排的;请把偏离的地方标出来,我看过仍然可以落库。',
    [
      F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-09-28；也可写 明天'),
    ],
    ['drift'],
  ),

  /* 改计划：口径要正整数 `id` 且**至少改一个字段**（`src/policy/plan.ts:142` 的 `validateUpdateInput`）
     ⇒ 记录 ID 与标题立字段、备注选填；老 `fields: ["title","notes"]` 是「这次改这两项」的局面描述
     ⇒ 具名丢弃（它的两个值已经各自成字段）。 */
  scene(
    'update_event_basic',
    '换掉某一条的标题或备注',
    '改计划',
    '我要把一条已经排好的安排调一调,换成别的说法或者补上备注。如果我没说清是哪一条或改成什么,问我补齐。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
      F('title', '标题', 'text', true, '要改成什么，如 健身(上午)'),
      F('notes', '备注(选填)', 'text', false, '要改成什么；空＝这一项不动'),
    ],
    ['fields'],
  ),

  /* 改时段：起止两个时刻各自成 `time` 字段（老 prompt 的 `17:30-18:30` 正是双空位拆两行的形状）。 */
  scene(
    'update_event_time',
    '把某一条挪到别的时段',
    '改计划',
    '我要把一条已经排好的安排挪到别的时段。如果我没说清是哪一条或新的起止时刻,问我补齐。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 17:30'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 18:30；须晚于开始时刻'),
    ],
  ),

  /* 改完成状态：`completion` 是 6 态闭集（`src/policy/plan.ts:8` 的 `VALID_COMPLETIONS`）
     ⇒ `select` ＋ 非空 `options`，枚举字面不进标签。 */
  scene(
    'update_event_completion',
    '标某一条的完成状态',
    '改计划',
    '我要给一条已经排好的安排标上完成状态,就标这一条,别动别的。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
      F('completion', '完成状态', 'select', true, '按这条实际做到什么程度选', {
        options: ['已完成', '已完成(超时)', '部分完成', '未完成', '未完成(不可抗力)', '未复盘'],
      }),
    ],
  ),

  /* `feishu_synced: true` ＝ 这条已经同步过飞书（局面）⇒ 进意图句、具名丢弃；
     要改什么与「改单个事件字段」同一组输入（老 prompt 改的正是 title）。 */
  scene(
    'update_event_feishu_ask',
    '改完先问要不要同步飞书',
    '改计划',
    '我要改一条已经同步到飞书的安排,改完先问我飞书那边要不要一起改。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
      F('title', '标题', 'text', true, '要改成什么，如 健身(上午)'),
      F('notes', '备注(选填)', 'text', false, '要改成什么；空＝这一项不动'),
    ],
    ['feishu_synced'],
  ),

  /* 删计划：口径只要正整数 `id`（路由表 `删计划` 的 `needs` 也只有 `id`）⇒ 单字段；
     删前先报这条是什么、确认后再删，是这一支的固定流程，进意图句。 */
  scene(
    'deactivate_event',
    '撤掉某一条安排',
    '删计划',
    '我要把一条已经排好的安排撤掉。删之前先告诉我这条是什么,确认后再删。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
    ],
  ),

  /* `feishu_synced: true` ＝ 这条已经同步过飞书（局面）⇒ 进意图句、具名丢弃；
     飞书那边要不要一起删由技能当场问，不立成字段。 */
  scene(
    'deactivate_with_feishu',
    '撤掉已同步飞书的那一条',
    '删计划',
    '我要撤掉一条已经同步到飞书的安排,删之前先问我飞书那边要不要一起删,确认后再删。',
    [
      F('event_id', '记录 ID', 'number', true, '纯数字，如 544；先在日程里查到这条记录的编号'),
    ],
    ['feishu_synced'],
  ),

  /* 日程管家同步：老维度写的是格式（`YYYY-MM-DD`），老 prompt 说的是「今天」⇒ 选填、空＝今天；
     反向对账与逐条询问是这一支的固定流程，进意图句。 */
  scene(
    'feishu_resync_basic',
    '跟飞书对账之后同步某一天',
    '日程管家同步',
    '我要把某一天的日程跟飞书那边对一遍,差在哪就一条条问我,我确认了再同步。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
    ],
  ),

  /* 复盘四档：唤醒词点的那一档就是粒度（`replayWindowOf`，`src/plan/replayDocs.ts:87`），用户只报锚点；
     今日档的锚点不给即今天，故 `date` 选填。老 prompt 的「(唤醒词:复盘今日)」是实现注记（首行已由
     `scene()` 生成），不进正文。 */
  scene(
    'replay_day',
    '一整天的计划与实际对照',
    '复盘今日',
    '我要把计划跟实际对一遍,看看这一天过得怎么样。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
    ],
  ),

  /* 本周档：起止由唤醒词那一档自动换算（`relativeToRange('本周')`）⇒ 老 `range` 属口径自算、具名丢弃；
     窗口里没有用户要填的东西，故零参。 */
  scene(
    'replay_week',
    '一周的趋势与规律',
    '复盘本周',
    '我要把这一周整个过一遍,看趋势和规律,起止不用我报。',
    [],
    ['range'],
  ),

  /* 本月档：同上（`relativeToRange('本月')` 自动换算到本月 1 日～月末）⇒ `range` 具名丢弃、零参。 */
  scene(
    'replay_month',
    '一个月的聚合与环比',
    '复盘本月',
    '我要把这一个月整个过一遍,跟上一段比一比,看看目标达成得怎么样。',
    [],
    ['range'],
  ),

  /* 区间档：老 hint 明说这一格接受相对词与自由区间语法（`任意 start-end(预置 上周/上月/今年/上年 +
     自由区间语法)`）⇒ 保持 `text`＋hint，不硬套 `date`、也不拆成两个 `date`（拆了就写不出「上周」这类词）；
     老 prompt 的裸区间 `2026-07-13~2026-07-19` 是这一格的例，进 hint。
     hint 只列现口径真认的相对词（`RELATIVE_RANGES`：本周／上周／本月／上月），跨年的区间走显式起止。 */
  scene(
    'replay_range',
    '任意一段区间的跨域回看',
    '复盘区间',
    '我要跨一段区间整体回看一遍,起止我自己给。',
    [
      F('range', '区间', 'text', true, '写 本周／上周／本月／上月，或自己给起止，如 2026-07-13~2026-07-19'),
    ],
  ),
];
