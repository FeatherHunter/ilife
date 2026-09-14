/** 页面三个公共标识 ＋ 场景名（**唯一定义地**）：文档版本／技能名／页面标题／`sceneKeyOf`。
 *  整页装配的调用方与复制日志都读它，别处只引用、不另写这几个字面量（同一件事实两处就会走散）。
 *
 * 谁在用（三个调用点，指名）：
 *   ① `src/record/receipt.ts`——结果型回执整页：envelope 三字段（其中 `key` 过 `sceneKeyOf`）、
 *      复制日志版本、页标题前缀；
 *   ② `src/record/collect.ts`——过程型采集页：同样这几处；
 *   ③ `src/shared/writeParts.ts` 的 `writeSection` 取技能名做 `data-skill`；
 *   另有本件的 `sceneKeyOf`——两张页的内置 envelope（`src/record/collect.ts` 与 `src/record/receipt.ts`）拿它
 *      把对外命令名收成场景名（`bill.record.add` → `record.add`），公共层的日志场景标识再与技能名拼回整名。
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

/** 页面内置 envelope 的 `key`（＝**场景名**，技能内的本地名）。
 *
 * 为什么不是对外命令名：公共层的日志第 1 段（`scene`）由 envelope 派生，形如 `{skill}.{key}`
 *  （`packages/base-render/src/text.ts:296-298` 的 `sceneText`）——`skill` 已是 `bill`，
 *  这里再写一条带 `bill.` 前缀的整名，日志就会印成 `bill.bill.record.add`（两处都重复一遍）。
 *  本件按公共层的分工收口：**页面内置 envelope 的 key＝本地场景名**（`bill.record.add` → `record.add`），
 *  `skill` ＋ `key` 拼起来正好是对外命令名；`<section data-key>` 与 CLI 那条 envelope 照旧写整名，
 *  两件事各按各的口径，不混。
 */
export function sceneKeyOf(key: string): string {
  const prefix = DOC_SKILL + '.';
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}
