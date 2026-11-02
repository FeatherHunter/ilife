/** 「第 1 周 周三」这种写法的**唯一定义地**（页面与报错话术共用）。
 *
 * 为什么独立成件（结构纪律的「同族第二处用法才切」）：这句话原本只有写命令件（`write.ts`）在用，
 * 校验器（`planStore.ts`）的报错话术里还是 `第1周周3` 那种连写两个「周」的写法——印在页上像错字
 * （负责人 2026-09-15 第 ④ 条：文字不能出现不合理）。第二个用法出现时切出来，两边共用一份。
 *
 * 注意 `write.ts` 反过来要 import `planStore.ts`，故本件不能住在两者任一处（会成环），单独一件最省事。
 */

/** 星期名（`day_of_week` 1–7）：`第 1 周 周三` 里的那截。 */
import { m } from '../entries/index.js';
/* #1320 · 星期汉字是上屏文案：改渲染期取词（原模块级数组按位置索引，故用函数保「0 位空串／越界回原值」的语义）。 */
function dowCnOf(dn: number): string | undefined {
  switch (dn) {
    case 0: return '';
    case 1: return m('skill-calorie.workout-dayPhrase.c002');
    case 2: return m('skill-calorie.workout-dayPhrase.c003');
    case 3: return m('skill-calorie.workout-dayPhrase.c004');
    case 4: return m('skill-calorie.workout-dayPhrase.c005');
    case 5: return m('skill-calorie.workout-dayPhrase.c006');
    case 6: return m('skill-calorie.workout-dayPhrase.c007');
    case 7: return m('skill-calorie.workout-dayPhrase.c008');
    default: return undefined;
  }
}

/** 「第 1 周 周三」——周次与星期都带空格与「周」字，读得出是哪一周的哪一天。 */
export function dayPhrase(wn: number, dn: number): string {
  return m('skill-calorie.workout-dayPhrase.c001', { p0: String(wn), p1: String(dowCnOf(dn) ?? String(dn)) });
}
