/** #422 · 运动类别色表（**技能层单源**）：`strength`／`cardio`／`flex`／`daily` 四类色只在本文件定义一处。
 *
 * 老实物出处：`D:\2Study\StudyNotes\SKILLS\卡路里\templates\exercise_summary.html:14` 的
 * `--strength:#5856d6; --cardio:#0071e3; --flex:#34c759; --daily:#ff9500;`（该四类色是本件独有，
 * 见 `docs/skills/skill-calorie/t156-老HTML盘点-写与汇总.md` 第 173 行）；
 * 融合设计 §三 冲突表第 1 行裁定：「老四类语义色作为增补标识保留」——故逐值保留。
 *
 * 消费者（分布页／趋势页／迷你条／图表）一律引用本表：**页面与各 `*Docs.ts` 不许再写第二份色表**
 * （判据：全仓检索这四组「键→色值」绑定，命中文件数＝1）。
 *
 * 两笔记账：
 *   - `cardio` 取值 `#0071e3` 与本仓 H-01 禁色表（禁的是**UI 主色**）同字面量；本表是类别语义色，
 *     按融合设计冲突表第 1 行逐值保留。若复核席判它不可入产物，改值只在本文件一行。
 *   - 库内分类（`力量`／`有氧`／`柔韧`／`日常`）到这四个键的对照属分类口径，住各页自己的取数层
 *     （如 `src/render/exercisePort.ts` 的 `KNOWN_CATS`），本表只管键→色。
 */

/** 运动四类（键取自老实物 CSS 变量名）。 */
export type ExerciseCategory = 'strength' | 'cardio' | 'flex' | 'daily';

/** 运动类别色表（本仓唯一定义地）。 */
export const EXERCISE_CATEGORY_COLORS: Readonly<Record<ExerciseCategory, string>> = Object.freeze({
  strength: '#5856d6',
  cardio: '#0071e3',
  flex: '#34c759',
  daily: '#ff9500',
});

/** 取类别色：表外类别给 `undefined`（不编缺省色，免得哪一页悄悄用了别类的色）。 */
export function categoryColor(category: string): string | undefined {
  return EXERCISE_CATEGORY_COLORS[category as ExerciseCategory];
}
