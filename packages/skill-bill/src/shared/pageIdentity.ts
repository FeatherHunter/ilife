/** 页面三个公共标识（**唯一定义地**）：文档版本／技能名／页面标题。整页装配的调用方与复制日志都读它，
 *  别处只引用、不另写这三个字面量（同一件事实两处就会走散）。
 *
 * 谁在用（两个调用点，指名）：
 *   ① `src/record/receipt.ts`——结果型回执整页：envelope 三字段、复制日志版本、页标题前缀；
 *   ② `src/record/collect.ts`——过程型采集页：同样这三处。
 *   另有 `src/shared/writeParts.ts` 的 `writeSection` 取技能名做 `data-skill`。
 *  第二个消费者：`src/query/`（随兄弟图 #403 的查询域一起到位，出来的是同一套采集页／回执页／复制区）。
 *
 * 为什么另立一件：这三个取值是「页面是谁」那件活，与回执事实、`<section>` 段不是同一件事——
 *  混在 `./writeParts.ts` 里会把那份的对外名字顶过五个（铁律五）。
 */

/** 文档版本（envelope 的 `version`，也是复制日志第 5 段后半）。 */
export const DOC_VERSION = '0.1.0';

/** 技能名（envelope 的 `skill`，也是 `<section>` 上 `data-skill` 的取值）。 */
export const DOC_SKILL = 'bill';

/** 页面标题前缀（两种页各接一个后缀，如「·写库回执」）。 */
export const DOC_TITLE = '饼干记账';
