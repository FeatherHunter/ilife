/** #975 · 重写表 · **写入与同步**（write 域：4 条唤醒词／15 条场景）。
 *
 * 域内场景（次序与 fixture 一致）：见本文件 `SCENES` 数组；条数与 fixture 的 write 域必须相等。
 * 写法与口径见 `../help-rewrite-base.mjs` 的文件头；本域特别约定：
 *  - 「记作息」族的口径必填位是 date／time_start／time_end／activity／category
 *    （`src/policy/record.ts:85`）；`duration_minutes` 由口径按起止时刻**自算**并核对（`:99-104`），
 *    立成字段会让用户填错就报错 ⇒ 一律 `drops` 掉。
 *  - 条件开关（`true`／`false`／`已有 N 条` 这类描述局面的值）进意图句，不进字段表，并在 `drops` 里具名。
 */
import { F, scene } from '../help-rewrite-base.mjs';

export const SCENES = [
  /* 记一条作息：口径必填 date／time_start／time_end／activity／category；
     `duration_minutes` 由口径按起止时刻自算并核对，故不立字段（立了反而让用户填错就报错）。 */
  scene(
    'record_add_single',
    '记一条作息',
    '记作息',
    '我刚做完一件事,帮我记一条作息。如果我没说全日期或起止时刻,问我补齐。',
    [
      F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD，如 2026-09-27'),
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 14:00'),
      F('time_end', '结束时刻', 'time', true, '格式 HH:MM，如 15:00；须晚于开始时刻'),
      F('activity', '做了什么', 'text', true, '如 写 AI 调优代码'),
      F('category', '分类', 'text', true, '白名单里的二级分类，如 工作.AI调优；只写一级会提示细化'),
    ],
    ['duration_minutes'],
  ),

  /* 拉某区间的消息：老字段把起止两个时刻塞进一个 `range`（`YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM`），
     按 §0.1「双空位拆两行」拆成起止两个日期字段（起止取当天 00:00／23:59，口径自补）。 */
  scene(
    'prep_with_range',
    '按区间拉取消息',
    '准备消息',
    '我要把某一段时间的聊天消息拉出来备用。起止都按整天算。',
    [
      F('start_date', '开始日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-20；含当天 00:00'),
      F('end_date', '结束日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-24；含当天 23:59'),
    ],
    ['range'],
  ),

  /* ── 「记作息」族：三条**变体**场景（老实物就是拿它们演示校验回执的） ──────────────
     变体卡的重点在「AI 会不会按规矩提示我」，故字段只留该变体要演示的那几个，
     缺的必填位由意图句里那句「问我补齐」兜住（口径缺槽位时报 POLICY_MISSING_SLOT）。 */

  /* 从 JSON 文件批量导入（与 batch_add 是两条：这条只给文件路径）。 */
  scene(
    'record_add_json',
    '从 JSON 文件导入',
    '记作息',
    '我要从这个 JSON 文件批量导入作息数据。如果字段没对上,告诉我哪一条差什么。',
    [F('input', '文件路径', 'text', true, 'JSON 文件路径,如 D:\\\\data\\\\records.json')],
  ),

  /* category 不在白名单：重点是看回执怎么提示「要不要申请新增」。 */
  scene(
    'record_add_illegal_category',
    '分类不在白名单里',
    '记作息',
    '我要记一条分类不在白名单里的作息,看看会怎么提示我。',
    [
      F('time_start', '开始时刻', 'time', true, '格式 HH:MM，如 14:00'),
      F('activity', '做了什么', 'text', true, '如 写代码'),
      F('category', '分类', 'text', true, '写一个不在白名单里的二级分类,如 娱乐.游戏'),
    ],
  ),

  /* 只给一级分类：看回执会不会提示细化到二级（口径给 warning，仍写入）。 */
  scene(
    'record_add_l1_only',
    '只写到一级分类',
    '记作息',
    '我只写一级分类,看看会不会提示我细化。',
    [
      F('activity', '做了什么', 'text', true, '如 写代码'),
      F('category', '分类', 'text', true, '只写一级,如 创作'),
    ],
  ),

  /* 漏说必填位：重点是「问我补齐」这条流程句本身，故零字段。
     老 `missing`（任一必填）是**描述局面**的值（哪个字段漏了），不是用户要填的参数 ⇒ 具名丢弃。 */
  scene(
    'record_add_missing_field',
    '漏说了一样必填的',
    '记作息',
    '我记一条作息,但漏说了一样必填的,看看会不会问我补齐。',
    [],
    ['missing'],
  ),

  /* 批量导入：与 record_add_json 的差别在「一次一批、没有唯一键」这条性质。
     老 `mode`（一次性批量写入无唯一键不幂等）是**这次操作的固定性质**，不是用户要挑的值 ⇒ 丢弃，
     改由意图句说清；老 `date` 是目标日期（缺省当日）⇒ 选填 `date` 字段。 */
  scene(
    'batch_add',
    '一次导入一批',
    '记作息',
    '我要一次导入一批作息数据(没有唯一键,重复执行会重复插入)。',
    [
      F('input', '文件路径', 'text', true, 'JSON 文件路径,如 D:\\\\data\\\\batch.json'),
      F('date', '目标日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD'),
    ],
    ['mode'],
  ),

  /* ── 「准备消息」族（本组 5 条唤醒词今天没有命令可执行 ⇒ 产物一律标【待开发】） ──────── */

  /* 默认窗（游标拉到当前）：老 `range` 的 hint 是 `默认(游标到当前)`＝局面描述，不是用户填的值 ⇒ 丢弃。 */
  scene(
    'prep_default',
    '从上次游标拉到当前',
    '准备消息',
    '帮我把消息准备到当前时间(接着上次的位置)。',
    [],
    ['range'],
  ),

  /* 翻页：老 `page` 的 hint 是 `N` ⇒ `number`（页码从 1 起）。 */
  scene(
    'prep_pagination',
    '往后翻一页',
    '准备消息',
    '帮我往后翻页看更早的消息。',
    [F('page', '页码', 'number', true, '第几页,从 1 开始,如 3', { min: 1 })],
  ),

  /* 空区间：老 `range` 的 hint 是 `无消息区间`＝局面描述（那天恰好没有消息）⇒ 丢弃；
     老 prompt 里的裸日期 `2026-07-23` ⇒ `date` 字段。 */
  scene(
    'prep_no_messages',
    '这一天没有消息',
    '准备消息',
    '我要拉某一天的消息(那天没有消息,看看会怎么回我)。',
    [F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-23')],
    ['range'],
  ),

  /* ── 「同步作息」族 ───────────────────────────────────────────── */

  /* 一条龙同步（准备→分析→写入）：老 `range` 是 `默认` ⇒ 丢弃；日期做成「空＝今天」。 */
  scene(
    'sync_full',
    '把消息同步成作息记录',
    '同步作息',
    '把我今天的消息同步成作息记录(准备、分析、写入一条龙)。',
    [F('date', '日期(选填)', 'date', false, '空＝今天；格式 YYYY-MM-DD')],
    ['range'],
  ),

  /* 指定日期同步：老 `date` 的 hint 是 `YYYY-MM-DD` ⇒ `date` 字段（裸日期进 hint 的例）。 */
  scene(
    'sync_partial_day',
    '同步指定那一天',
    '同步作息',
    '把指定那天的消息同步成作息记录。',
    [F('date', '日期', 'date', true, '格式 YYYY-MM-DD，如 2026-07-22')],
  ),

  /* ── 「增量同步」族 ───────────────────────────────────────────── */

  /* 从上次游标继续：老 `cursor`（上次结束位置）是**局面**（游标由口径自己取）⇒ 丢弃。 */
  scene(
    'sync_incremental',
    '接着上次继续同步',
    '增量同步',
    '接着上次结束的位置继续增量同步。',
    [],
    ['cursor'],
  ),

  /* 首次同步（没有游标）：老 `first_time`（true）是**局面** ⇒ 丢弃；改由意图句说「从最早开始」。 */
  scene(
    'sync_no_cursor',
    '第一次同步没有游标',
    '增量同步',
    '我从来没同步过,从最早的消息开始同步。',
    [],
    ['first_time'],
  ),
];
