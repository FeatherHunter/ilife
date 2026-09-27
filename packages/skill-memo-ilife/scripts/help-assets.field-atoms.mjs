#!/usr/bin/env node
/** 备忘录 HELP · **#974 字段面台账**（老字段提示里的信息，去处逐条写死）。
 *
 * 为什么单列一件：正文台账（`help-assets.atoms.mjs`）管的是 `prompt_template` 里的每一句；**字段提示**
 * （`editable_fields[].hint`／`options`）是另一半用户看得见的字——老提示里的信息（默认值、格式、单位、
 * 适用范围、选项解释）同样「不许丢」。本件按 `场景 → 字段 → 去处` 逐条写死，生成器与测试逐条断言。
 *
 * 去处五种：
 *   - `hint`    ＝改后该字段的 `hint` 里有这段字（`as` 逐字在场）
 *   - `options` ＝改后该字段的 `options` 标签串里有这段字（对象选项取 `label`）
 *   - `say`     ＝改后正文那句人话承载（老提示里的信息挪进了正文）
 *   - `params`  ＝参数行／控件形态本身承载（标签文字、`(选填)` 标记、非 select 即自由文本、必填校验）
 *   - `drop`    ＝**有意删**，必须给理由
 * 老侧逐字在 `help-assets.before.mjs`（`fields`），断言时随失败信息一起打印，便于人复核。
 */
/** 改后该字段 hint 里有这段字。 */
const FH = (as, note) => ({ to: 'hint', as, ...(note ? { note } : {}) });
/** 改后该字段 options 的标签串里有这段字。 */
const FO = (as, note) => ({ to: 'options', as, ...(note ? { note } : {}) });
/** 改后正文那句人话承载（信息从字段提示挪进正文）。 */
const FS = (as, note) => ({ to: 'say', as, ...(note ? { note } : {}) });
/** 参数行／控件形态承载。 */
const FP = (why) => ({ to: 'params', why });
/** 有意删（理由必填）。 */
const FD = (why) => ({ to: 'drop', why });

const 自由文本 = '「自由文本」由控件形态承载：不是 select 就是任意文本（页面不再写一句）';
const 必填 = '「必填」由标签不带 (选填) ＋ 弹层必填校验承载（页面上写出来是重复）';
const 可选 = '「可选」由标签的 (选填) 承载';
const 格式 = '格式由 hint 的格式串承载（同一条 entry 已列）';

export const FIELD_ATOMS = {
  memo_add_basic: {
    category: [FO('备忘/心愿/打卡/情绪日记'), FH('空＝备忘')],
    sub_category: [FH('没给就由我推断', '老提示的「AI 智能推断 1 个 2 字」＝没给时由我推断，逐字落进 hint'), FP(自由文本)],
    media: [FH('图片/音频/视频', '老提示「可选附件(图片/音频/视频)」里的三种形态必须留')],
    due: [FH('仅心愿生效;格式 YYYY-MM-DD')],
  },
  memo_update_basic: {
    id: [FH('数字'), FP(必填)],
    content: [FP('「新内容」由标签承载；' + 可选)],
    category: [FO('备忘/心愿/打卡/情绪日记'), FH('空＝不改'), FP('「新顶层分类」由标签「新分类」＋「选项即四个顶层分类」承载')],
    sub_category: [FH('空＝不改'), FP('「新子分类」由标签承载；' + 可选)],
  },
  memo_delete_basic: {
    id: [FH('可多个'), FH('空格分隔'), FP(必填)],
    with_reminders: [FD('命令行开关（连同关联提醒一起删）：语义已由正文流程句承载（「有关联提醒时,先告诉我再删」），不另立控件')],
    true: [FD('命令行自动化开关（跳过二次确认）：对话里执行时确认由正文流程句承载，页面不必再给一个「跳过确认」控件')],
  },
  memo_change_category_single: {
    id: [FH('数字'), FP(必填)],
    category: [FO('备忘/心愿/打卡/情绪日记'), FP('「目标分类」由标签「新分类」承载')],
    bulk_indicator: [FD('路由判定位（原话含「都／全部」走批量）：批量那条另有一张卡（`批量改分类(网页向导)`），路由表一行未动，本卡不再需要这个判定位')],
  },
  memo_change_subcategory: {
    id: [FH('数字'), FP(必填)],
    sub_category: [FH('2 字'), FH('留空＝清除'), FP(自由文本)],
  },
  memo_batch_change_category: {
    from_category: [FP('「原分类」由标签逐字承载')],
    to_category: [FH('先给个建议值,页面上还能改')],
    bulk_indicator: [FD('路由判定位（一次改多条）：批量卡本身就是这一条，判定位不再需要；路由表一行未动')],
  },
  memo_search_keyword: {
    keyword: [FH('如 咖啡'), FP('「搜索词」由标签「关键词」承载')],
    category: [FO('备忘/心愿/打卡/情绪日记'), FH('空＝不限'), FP('「过滤」由卡片的场景（搜）承载')],
    sub_category: [FH('按子分类过滤')],
    due: [FH('只看排在这一天的'), FH('格式 YYYY-MM-DD')],
  },
  memo_search_alias: {
    keyword: [FH('如 咖啡'), FP('「搜索词」由标签「关键词」承载')],
  },
  memo_get_detail: {
    id: [FH('数字'), FP(必填)],
  },
  memo_search_by_date: {
    start: [FH('格式 YYYY-MM-DD')],
    end: [FH('格式 YYYY-MM-DD')],
    category: [FH('只看这个分类'), FP('「顶层分类过滤」＝只看这个分类，语义同')],
  },
  memo_search_wish: {
    keyword: [FH('如 游泳'), FP('「搜索词」由标签「关键词」承载；' + 可选)],
    due: [FH('只看排在这一天的')],
  },
  memo_search_checkin: {
    keyword: [FH('如 跑步'), FP('「搜索词」由标签「关键词」承载；' + 可选)],
  },
  memo_search_mood: {
    keyword: [FH('如 加班'), FP('「搜索词」由标签「关键词」承载；' + 可选)],
  },
  memo_remind_with_note: {
    content: [FP('「笔记内容」由标签逐字承载')],
    remind_at: [FH('格式 YYYY-MM-DD HH:MM')],
    repeat_type: [FO('一次性/每天/每周/每月/每年'), FH('空＝一次性')],
    repeat_rule: [FH('每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM', '老提示给的是四类格式（每天/每周/每月/每年），四类都要在')],
  },
  memo_remind_existing: {
    note_id: [FS('不填笔记 ID 也可以,那就单独建一条提醒', '「可不关联具体笔记」是行为信息，挪进正文那句')],
    remind_at: [FH('格式 YYYY-MM-DD HH:MM')],
    content: [FP('「提醒内容」由标签逐字承载')],
    repeat_type: [FO('一次性/每天/每周/每月/每年'), FH('空＝一次性')],
    repeat_rule: [FH('每天 HH:MM;每周 周几 HH:MM;每月 几号 HH:MM;每年 MM-DD HH:MM')],
  },
  memo_reminders_active: {
    status: [FO('已废弃(撤下提醒,笔记保留)', '老提示对「已废弃」的解释落进该选项的显示名（机器值仍是「已废弃」）'), FH('空＝只看有效提醒')],
  },
  memo_complete_wish: {
    ids: [FH('可多个'), FP('「心愿 ID 列表」由标签「心愿 ID」＋ hint 的可多个承载')],
    content: [FH('空＝拷贝心愿原文')],
  },
  memo_wish_schedule: {
    ids: [FH('可多个'), FP('「心愿 ID 列表」由标签「心愿 ID」＋ hint 的可多个承载')],
    due: [FH('期望完成日期;格式 YYYY-MM-DD')],
  },
  memo_add_wish: {
    content: [FP('「心愿内容」由标签「内容」＋场景「记心愿」承载')],
    sub_category: [FP(自由文本)],
    due: [FH('想哪天完成'), FH('格式 YYYY-MM-DD')],
    tasklist_guid: [FH('任务清单 ID'), FH('空＝我的任务')],
  },
  memo_delete_wish: {
    id: [FP('「心愿 ID」由标签逐字承载')],
  },
  memo_update_wish: {
    id: [FP('「心愿 ID」由标签逐字承载')],
    content: [FP('「新内容」由标签逐字承载')],
  },
  memo_add_checkin: {
    content: [FH('打卡内容')],
    sub_category: [FP(自由文本)],
    reminder_id: [FD('内部值（老提示自述「溯源用」），不是用户会填的词；提醒与笔记的关系由提醒域维护（同 `FIELD_DROPS`）')],
  },
  memo_delete_checkin: {
    id: [FP('「打卡 ID」由标签逐字承载')],
  },
  memo_update_checkin: {
    id: [FP('「打卡 ID」由标签逐字承载')],
    content: [FP('「新内容」由标签逐字承载')],
  },
  memo_add_mood: {
    content: [FH('情绪内容')],
    sub_category: [FP(自由文本)],
  },
  memo_delete_mood: {
    id: [FP('「情绪日记 ID」由标签逐字承载')],
  },
  memo_update_mood: {
    id: [FP('「情绪日记 ID」由标签逐字承载')],
    content: [FP('「新内容」由标签逐字承载')],
  },
};
