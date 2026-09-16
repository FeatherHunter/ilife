/** T351-v14 · **计划编辑器**的状态形状（唯一产出者）＋序列化。
 *
 * ## 形状跟着库走（不是我拍的）
 *
 * 真库 `workout_plans` 每次训练一行：`(week_number, day_of_week, session_index)` 唯一，
 * 带 `session_label` 与 `time_start/time_end`；实测一天排 4 段，时段写在 `session_label` 前缀里
 * （`"上午·胸·3 角度"`）。故本形状是 **周 → 日 → 段 → 动作**，**段就是「一次训练」**。
 *
 * ## 四条要求落在哪
 *
 *   ① 周用 TAB 选 → `EditorState.weeks` 是数组，页签数＝它的长度（加周就多一个）；
 *   ② 每天 4 段、每段选时段 → `EditorDay.sessions`（上限 `maxSessionsPerDay`）＋ `EditorSession.slot`
 *      （取值域 `EditorState.slots`：凌晨／上午／下午／晚上，负责人 2026-09-15 定；
 *      时段是分类签不是唯一键，同一时段可建多段，靠 `timeStart/timeEnd` 区分）；
 *   ③ 第 2 周起锁动作 → `EditorWeek.locked`：锁住的周页面不许增删段与动作，**只许改参数**；
 *   ④ 零分隔符 → 本件与运行时里**没有一处**拿 `|`／`-`／`·` 拼文案；日期也输出成「2026年9月7日」。
 *
 * ## 有氧怎么装（负责人 2026-09-15 认可）
 *
 * 库里**计划侧没有有氧类型、也没有时间字段**（全库 264 个动作：`type` 只有 `main`／`iso`，
 * `sets` 只有 `reps/weight/unit`，`unit` 只有 `kg`／`自重`）；有氧只出现在**记录侧**
 * `exercise_log`（`category='有氧'` ＋ `duration_minutes`，实测 1437 条，含 7 条爬楼机）。
 * 动库不变的前提下，有氧这样装：`type='有氧'`，并用**一段 set 承载时长**
 * （`reps` ＝ 分钟数、`weight = 0`、`unit = '分钟'`）——因为 `sets[i]` 本来就是「量 ＋ 单位」的通用形状。
 * 页面上这一行只出「时长」一个格。
 */

/** 一节课里排的一个动作。`kind` 决定这一行要填哪些参数——「有氧只有时间」就落在这里。 */
export interface EditorMove {
  readonly name: string;
  readonly part: string;
  readonly type: string;
  readonly equip: string;
  /** 动作库里的分类值（`力量`／`有氧`）；页面据此切换参数面。 */
  readonly kind: '力量' | '有氧';
  /** 目标短语（例如「胸整体」），可空。**不装单位与节奏那类素材**，那些拆成元素或落库时再组。 */
  readonly goal: string;
  readonly sets: number;
  readonly reps: number;
  readonly mode: 'kg' | 'rm';
  readonly load: number;
  /** **有氧专用**：一次做多久（分钟）。力量动作恒 0。 */
  readonly minutes: number;
}

/** 一次训练（＝库里的一行）：一个时段 ＋ 起止时间 ＋ 这节课的动作。
 *  时间对应库 `time_start/time_end`（`HH:MM`），空串＝没定（页面上就是没填的两格）。 */
export interface EditorSession {
  readonly slot: string;
  readonly timeStart: string;
  readonly timeEnd: string;
  readonly moves: readonly EditorMove[];
}

/** 一天：最多 `maxSessionsPerDay` 次训练（真库实况：一天 4 段）。 */
export interface EditorDay {
  readonly sessions: readonly EditorSession[];
}

/** 一周。**第 1 周是母版**；`locked` 的周只许改参数，不许改动作（负责人③）。 */
export interface EditorWeek {
  readonly locked: boolean;
  readonly days: readonly EditorDay[];
}

/** 动作库里的一件（库本体来自参数里的**文件地址**，页面只负责「从库里选」）。 */
export interface EditorLibMove {
  readonly name: string;
  readonly part: string;
  readonly type: string;
  readonly equip: string;
  readonly kind: '力量' | '有氧';
  readonly goal: string;
}

/** 编辑器整页的状态（序列化进 `#pe-state`，运行时读回来）。 */
export interface EditorState {
  readonly title: string;
  readonly startDate: string;
  readonly slots: readonly string[];
  readonly maxSessionsPerDay: number;
  readonly maxMovesPerSession: number;
  readonly libSource: string;
  readonly lib: readonly EditorLibMove[];
  readonly weeks: readonly EditorWeek[];
  readonly wakeWord: string;
  /** 首屏就把动作库选择层打开（给样张／验收墙用）。 */
  readonly openPicker?: { readonly w: number; readonly d: number; readonly s: number } | null;
  /** 首屏停在第几个周页签（样张用；不传＝第 1 周）。 */
  readonly openWeek?: number;
}

/** 把状态序列化进页面：`<` 写成 `\u003c`，防 `</script>` 断标签（与契约 INJECT-DATA 同法）。 */
export function serializeState(state: EditorState): string {
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/** 日期上屏一律写成「2026年9月7日」——ISO 里那两个连字符也算分隔符，负责人④不接受。 */
export function cnDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m === null) return iso;
  return m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
}
