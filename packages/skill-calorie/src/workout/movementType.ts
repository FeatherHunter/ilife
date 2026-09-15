/** 动作类型的**中文名表（唯一定义地）**：库里 `main`／`iso` 两个取值 → 「主要」／「孤立」。
 *
 * 为什么独立成件（结构纪律的「同族第二处用法才切」）：这张表原住在渲染件
 * `render/workoutMovementTable.ts` 里（动作明细表的副行用它）；T351-v12 发现**校验器的警告**
 * 也印了同一件事，而且印的是**英文原值**——「只练了一种类型（main）」（负责人第 ④ 条）。
 * 两处用法出现时切出来住能力目录（`src/workout/`），渲染件与校验器都 import 这一份。
 * 方向也对：数据层（`planStore`）不能反过来依赖渲染件。
 *
 * 清单外的值**原样输出、不吞**（库里有别的新值时，页上至少看得见它是什么）。
 */
export const TYPE_ZH: Readonly<Record<string, string>> = { main: '主要', iso: '孤立' };

/** 类型原值 → 中文名；表外值原样返回。 */
export function typeZh(raw: string): string {
  return TYPE_ZH[raw] ?? raw;
}
