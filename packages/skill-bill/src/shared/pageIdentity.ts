/** 页面三个公共标识 ＋ 场景名（**唯一定义地**）：文档版本／技能名／页面标题／`sceneKeyOf`。
 *  整页装配的调用方与复制日志都读它，别处只引用、不另写这几个字面量（同一件事实两处就会走散）。
 *
 * 谁在用（两个能力，指名）：
 *   ① `src/write/`——写入域：结果型回执整页与过程型采集页的 envelope 三字段（其中 `key` 过 `sceneKeyOf`）、
 *      复制日志版本、页标题前缀；`src/shared/writeParts.ts` 的 `writeSection` 取技能名做 `data-skill`；
 *   ② `src/query/`——查询域：通用查询列表页的同一批取值（envelope 三字段、复制日志版本、页标题前缀）。
 *  两域的页面内置 envelope 都拿本件的 `sceneKeyOf` 把对外命令名收成场景名（`bill.record.today` → `record.today`），
 *      公共层的日志场景标识再与技能名拼回整名。
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
 *  `skill` ＋ `key` 拼起来正好是对外命令名；`<section data-key>` **同写场景名**（R4 收口：`bill.` 只许出现在
 *  复制载荷区，页面标记一律不带技能前缀），两处一个值，不再各写各的。
 */
export function sceneKeyOf(key: string): string {
  const prefix = DOC_SKILL + '.';
  return key.startsWith(prefix) ? key.slice(prefix.length) : key;
}
