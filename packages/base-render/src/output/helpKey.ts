/** #1281 · HELP 产物的**数据指纹**（#1277 甲式）：这份产物代表的「数据 ＋ 渲染器」的身份。
 *
 *  六家技能共用一套共享 help 壳（`base-paint/help-shell`），故算式**只该有一份实现**——本件即唯一实现：
 *  各家把自己那份 HELP 数据与本次生成的**分钟串**交给 `helpDataKeyOf`，拿到的返回值当**不透明串**
 *  交给 `base-paint/save-html` 的 `{reuse:{byAge,byDataKey}}`（公共层不解释它是什么，只比对逐字相等）。
 *
 *  ## 为什么不能按整页哈希（`byContent`）
 *  HELP 页里嵌着**分钟级**的生成时刻（`subtitle`／`meta_blocks[0]` 与各家的 `generated_at` 同源），
 *  整页哈希跨分钟必不相同 ⇒ 等于「一分钟一份」，复用整个失效（#1277 实测）。
 *
 *  ## 算式
 *  ① 整份数据 `JSON.stringify`；② 把**那个分钟串**在整份 JSON 里替换成占位符（`\u0000`）——它出现在
 *  几处就换几处，**其余每一个字段都参与**（含真印在页上的唤醒词那类内容字段）；③ 掺进**壳身份**
 *  （模板 PREFIX ＋ SUFFIX 逐字的 sha256 前 16 位）后取 sha256 前 32 位十六进制。
 *
 *  壳身份必须在里面：数据没变、模板改了，窗口内会把**旧页**当命中——「改一句文案 → 打开 HELP 看效果」
 *  这条迭代当场看不见改动，直到数据变或窗口过期（#1277 对抗式审查实测到的洞）。
 *
 *  取 32 位十六进制（`[0-9a-f]`）——它要写进 HTML 注释，只许安全字符。
 */
import { createHash } from 'node:crypto';
import { HELP_SHELL_PREFIX, HELP_SHELL_SUFFIX } from '../helpShell.js';

/** 壳（渲染器）的身份：模板/共享壳改了，页正文就变了 ⇒ 指纹必须把渲染器也算进去。
 *  壳＝PREFIX ＋ SUFFIX 逐字（生成物 `src/helpShell.ts` 由 `scripts/gen-help-shell.cjs` 从模板切出）。 */
const HELP_SHELL_KEY = createHash('sha256')
  .update(HELP_SHELL_PREFIX, 'utf8').update('\u0000', 'utf8').update(HELP_SHELL_SUFFIX, 'utf8')
  .digest('hex').slice(0, 16);

/** 数据 ＋ 渲染器的指纹。`stamp`＝本次生成时刻那个**分钟串**（各家自己的 `formatHelpMinute(now)`）：
 *  它在 `data` 里出现几处就一并中性化；`stamp` 为空串时整份 JSON 原样参与（不中性化任何东西）。 */
export function helpDataKeyOf(data: unknown, stamp: string): string {
  const json = JSON.stringify(data);
  const canonical = stamp.length === 0 ? json : json.split(stamp).join('\u0000');
  return createHash('sha256').update(HELP_SHELL_KEY, 'utf8').update('\u0000', 'utf8')
    .update(canonical, 'utf8').digest('hex').slice(0, 32);
}
