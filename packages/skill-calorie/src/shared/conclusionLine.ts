/** #422 · 一句话结论条（技能层共用件）：复盘与各域总结共用一条。
 *
 * 形状（老实物 `exercise_recap.html` 的 `one_line` 那块、融合样张
 * `docs/skills/skill-calorie/t156-样张-运动复盘.html:102` 的 `#sec-oneline`）：
 * 一条整宽的结论句，排在指标之前，一眼读完。
 *
 * 文案边界：**整句由调用方给**（`conclusionLine('本周练 6 次、消耗 1360 卡。')`）——
 * 本件不加「💬」「一句话结论：」这类前缀，也不给默认句；空句即报错。
 * 版面：类名 `ilife-block-conclusion` 走 #420／#421 的页面级命名空间
 * （`ilife-block-<名>`），本件不写色值；底色圆角字号属公共层 `pageShell` 区，另账。
 */
import { STYLE_PREFIX, escapeHtml } from 'base-paint';
import { CalorieRenderError } from '../render/errors.js';

/** 一句话结论条：只定形状与类名，文案全由调用方给。 */
export function conclusionLine(text: string): string {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new CalorieRenderError('bad-input', 'conclusionLine: text 必须是非空字符串（本件不给默认文案）');
  }
  return '<p class="' + STYLE_PREFIX + 'block-conclusion">' + escapeHtml(text) + '</p>';
}
