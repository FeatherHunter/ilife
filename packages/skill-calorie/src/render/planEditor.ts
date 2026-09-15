/** T351-v13 · **计划编辑器**的页面运行时 ＋ 状态形状（唯一产出者）。
 *
 * ## 这个件解决什么
 *
 * 前面 37 份产物都是**只读页**：文案 ＋ 复制区，用户只能看和复制。
 * 而「定计划」「改动作」这类页是**可写页**——用户要在页面上真把计划搭出来。
 * 本件产出那台编辑器的**唯一一份**运行时（把它抄到第二个页面就是两份会走散的实现，铁律二）。
 *
 * ## 为什么技能可以自产这段脚本（把口径写清楚，免得下一个人再拦一次）
 *
 * 契约的 **B3** 禁的是两件：技能**自造共享 helpers 的副本**（那段必须逐字取自
 * `buildSharedHelpersJs`，见 `./copy.ts`）与**自造填充器/标记**。
 * 它**不禁**技能给自己的页面配一段运行时——先例是 `src/render/copy.ts` 已经在自产 `<script>` 标签。
 * 本件因此守三条：① 不重写共享 helpers 的任何职责（复制、反馈一律走它——本件只更新
 * `data-t`，点击仍由 `bindCopyAction` 委派）；② 不产 `on*` 内联处理器（零注入面），事件一律委派；
 * ③ 全技能只此一份编辑器运行时。
 *
 * ## 状态形状（页面上那台编辑器的全部状态）
 *
 * 计划 = 周 × 日 × 动作，动作带时段与参数。**第 1 周是母版**，其余周默认引用它
 * （负责人规则 (b)「第一周与第二周必须完全一致」——本件把它做成**默认值**而非常校验：
 * 想不一样得显式点「改为不同」）。
 */

/** 动作库里的一件（页面只负责「从库里选」，库本身来自参数里的**文件地址**）。 */
export interface EditorLibMove {
  readonly name: string;
  readonly part: string;
  readonly type: string;
  readonly equip: string;
}

/** 一个已排进计划的动作（含时段与参数；`mode` 是负重计量方式：绝对重量或 RM）。 */
export interface EditorMove {
  readonly name: string;
  readonly part: string;
  readonly type: string;
  readonly equip: string;
  /** 时段名（取自 `EditorState.slotLabels`）。 */
  readonly slot: string;
  readonly sets: number;
  readonly reps: number;
  readonly mode: 'kg' | 'rm';
  readonly load: number;
}

/** 一天：`moves` 是该日全部动作（**每天合计上限 `maxPerDay` 个**，负责人规则）。 */
export interface EditorDay {
  readonly moves: readonly EditorMove[];
}

/** 一周：`sameAsMaster` 为真时页面显示「同第 1 周」，不单独编辑（母版周恒为 false）。 */
export interface EditorWeek {
  readonly sameAsMaster: boolean;
  readonly days: readonly EditorDay[];
}

/** 编辑器整页的状态（页面把它序列化进 `#pe-state`，运行时读回来）。 */
export interface EditorState {
  readonly title: string;
  readonly startDate: string;
  readonly totalWeeks: number;
  readonly slotLabels: readonly string[];
  readonly maxPerDay: number;
  /** 动作库来源的人话说明（例如「内置示例库」或库文件地址）。 */
  readonly libSource: string;
  readonly lib: readonly EditorLibMove[];
  readonly weeks: readonly EditorWeek[];
  /** 复制区那条命令的唤醒词（本页产出物的执行入口）。 */
  readonly wakeWord: string;
  /** 首屏就把动作库选择层打开（给样张／验收墙用；正常运行时不传）。 */
  readonly openSheet?: { readonly w: number; readonly d: number } | null;
}

/** 把状态序列化进页面：`<` 一律写成 `\u003c`，防 `</script>` 断标签（与契约 INJECT-DATA 同法）。 */
export function serializeState(state: EditorState): string {
  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/**
 * 编辑器运行时。**无模板字符串、无箭头函数**：这段文本要逐字进页面，
 * 用最朴素的 ES5 写法可以让「TS 源码里怎么写的」与「页面上跑的」一眼对得上，也省掉层层转义。
 */
