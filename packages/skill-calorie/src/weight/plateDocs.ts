/** #109 → #294 · 体重五页共用的文档头（#332 归位后只留真有第二用法的部件）。
 *
 * 留下的理由（逐件点名）：`DOC_VERSION`／`DOC_SKILL`／`DOC_TITLE` 被 5 个子功能文件的
 * 整页装配共用——第二用法（×5），留一处定义，别处引用（铁律二）。
 * 5 个整页装配已按 HELP 下一级归位（见 `plate.ts` 头注的对照表）；`fmt` 未被任何一页
 * 使用（死码，随本次归位删掉）；`COMPARE_COLUMNS` 只有对比页用，已随装配迁入 `compare.ts`。
 */

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
export const DOC_VERSION = '0.1.0';
export const DOC_SKILL = 'calorie';

/** 体重各页共用的 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
export const DOC_TITLE = '卡路里·体重';
