/** #848 · 产物册子的唯一定义地（34 格主体 ＋ 4 族归属 ＋ 1 共用件）。
 *
 * 冻的是 What（份数／主体／目录／族归属），How 留给视觉基准票（#849／#851）：
 * 本件只定每格出什么主体、属哪个族，不定任何样式实现。
 *
 * - 份数：30 结果页（每场景一份）＋ 4 过程页（4 条向导场景各加一张过程页）＝ 34。
 *   64 格作废（10 条读类场景的查看与回执是同一份页）；20 条采集不单出页
 *   （备忘录采集在同一次 prompt 填空完成，链路仅 5 真缺槽位）。
 * - 主体算法：28 条主体等于唤醒词原样；唯一撞名对加形态后缀
 *   （备忘改分类／备忘改分类-批量）；4 张过程页加向导后缀。
 *   唤醒词均为中文常用字，无符号转义表。
 * - 目录：扁平 `memo_html/`（定义地是 `src/help/manifest.ts` 的
 *   `DEFAULT_HELP_HTML_DIR_NAME` ＋ `helpHtmlDirName()`，本件只引用不重写）；
 *   既有 216 件原地不动，34 格新主体与其并排。
 * - 时间戳：实例落盘为 `〈主体〉_YYYYMMDD_HHMMSS[_N].html`，`_N` 从 `_2` 起、
 *   绝不静默覆盖——唯一定义地是共用件 `base-paint/save-html` 的 `saveHtmlFile`，
 *   本件只引用不重写。册子行存主体；墙按主体前缀匹配时间戳实例的那 5 行小改
 *   归验收形制票（#825），不在本件。
 * - 下游：8 张域票读主体与份数；#825 消费清单字段；#849 定 4 族＋1 件的实现。
 *
 * 对抗式更正一处：`t822-册子冻结.md` §五第 6 行把批量结果页主体误写作
 * `备忘改分类`（与单条结果同名，会撞）。按同文 §二「单条／批量」后缀规则＋
 * 本票用户故事 14（撞名按构造不可能），此处落实为 `备忘改分类-批量`。
 */

export type BookletFamily = '列表查询' | '向导' | '报告' | '通用回执';

export interface BookletRow {
  readonly seq: number;
  readonly sceneId: string;
  readonly wake: string;
  readonly file: string;
  readonly family: BookletFamily;
  readonly kind: '结果页' | '过程页';
  readonly check: string;
}

/** 34 格行表：seq 1–30 结果页（`t822-册子冻结.md` §五原序），31–34 过程页。 */
export const BOOKLET_ROWS: readonly BookletRow[] = [
  { seq: 1, sceneId: 'memo_add_basic', wake: '记备忘', file: '记备忘', family: '通用回执', kind: '结果页', check: '新建回执可点开' },
  { seq: 2, sceneId: 'memo_update_basic', wake: '改备忘', file: '改备忘', family: '通用回执', kind: '结果页', check: '修改回执可点开' },
  { seq: 3, sceneId: 'memo_delete_basic', wake: '删备忘', file: '删备忘', family: '通用回执', kind: '结果页', check: '删除回执可点开' },
  { seq: 4, sceneId: 'memo_change_category_single', wake: '备忘改分类', file: '备忘改分类', family: '通用回执', kind: '结果页', check: '单条改分类回执可点开' },
  { seq: 5, sceneId: 'memo_change_subcategory', wake: '备忘改子分类', file: '备忘改子分类', family: '通用回执', kind: '结果页', check: '改子分类回执可点开' },
  { seq: 6, sceneId: 'memo_batch_change_category', wake: '备忘改分类', file: '备忘改分类-批量', family: '通用回执', kind: '结果页', check: '批量改分类结果可点开' },
  { seq: 7, sceneId: 'memo_search_keyword', wake: '搜备忘', file: '搜备忘', family: '列表查询', kind: '结果页', check: '关键词结果可点开' },
  { seq: 8, sceneId: 'memo_search_alias', wake: '查备忘', file: '查备忘', family: '列表查询', kind: '结果页', check: '别名搜索结果可点开' },
  { seq: 9, sceneId: 'memo_get_detail', wake: '看备忘', file: '看备忘', family: '列表查询', kind: '结果页', check: '单条详情可点开' },
  { seq: 10, sceneId: 'memo_search_by_date', wake: '按时间搜备忘', file: '按时间搜备忘', family: '列表查询', kind: '结果页', check: '时间范围结果可点开' },
  { seq: 11, sceneId: 'memo_search_wish', wake: '查心愿', file: '查心愿', family: '列表查询', kind: '结果页', check: '心愿列表可点开' },
  { seq: 12, sceneId: 'memo_search_checkin', wake: '查打卡', file: '查打卡', family: '列表查询', kind: '结果页', check: '打卡列表可点开' },
  { seq: 13, sceneId: 'memo_search_mood', wake: '查情绪', file: '查情绪', family: '列表查询', kind: '结果页', check: '情绪列表可点开' },
  { seq: 14, sceneId: 'memo_remind_with_note', wake: '记提醒', file: '记提醒', family: '通用回执', kind: '结果页', check: '记提醒回执可点开' },
  { seq: 15, sceneId: 'memo_remind_existing', wake: '设提醒', file: '设提醒', family: '通用回执', kind: '结果页', check: '设提醒回执可点开' },
  { seq: 16, sceneId: 'memo_reminders_active', wake: '看提醒', file: '看提醒', family: '列表查询', kind: '结果页', check: '有效提醒列表可点开' },
  { seq: 17, sceneId: 'memo_completed_reminders', wake: '查已提醒备忘', file: '查已提醒备忘', family: '列表查询', kind: '结果页', check: '已提醒列表可点开' },
  { seq: 18, sceneId: 'memo_complete_wish', wake: '完成心愿', file: '完成心愿', family: '通用回执', kind: '结果页', check: '完成心愿结果可点开' },
  { seq: 19, sceneId: 'memo_wish_schedule', wake: '心愿排期', file: '心愿排期', family: '通用回执', kind: '结果页', check: '心愿排期结果可点开' },
  { seq: 20, sceneId: 'memo_add_wish', wake: '记心愿', file: '记心愿', family: '通用回执', kind: '结果页', check: '记心愿回执可点开' },
  { seq: 21, sceneId: 'memo_delete_wish', wake: '删心愿', file: '删心愿', family: '通用回执', kind: '结果页', check: '删心愿回执可点开' },
  { seq: 22, sceneId: 'memo_update_wish', wake: '改心愿', file: '改心愿', family: '通用回执', kind: '结果页', check: '改心愿回执可点开' },
  { seq: 23, sceneId: 'memo_add_checkin', wake: '记打卡', file: '记打卡', family: '通用回执', kind: '结果页', check: '记打卡回执可点开' },
  { seq: 24, sceneId: 'memo_delete_checkin', wake: '删打卡', file: '删打卡', family: '通用回执', kind: '结果页', check: '删打卡回执可点开' },
  { seq: 25, sceneId: 'memo_update_checkin', wake: '改打卡', file: '改打卡', family: '通用回执', kind: '结果页', check: '改打卡回执可点开' },
  { seq: 26, sceneId: 'memo_add_mood', wake: '记情绪', file: '记情绪', family: '通用回执', kind: '结果页', check: '记情绪回执可点开' },
  { seq: 27, sceneId: 'memo_delete_mood', wake: '删情绪', file: '删情绪', family: '通用回执', kind: '结果页', check: '删情绪回执可点开' },
  { seq: 28, sceneId: 'memo_update_mood', wake: '改情绪', file: '改情绪', family: '通用回执', kind: '结果页', check: '改情绪回执可点开' },
  { seq: 29, sceneId: 'memo_sync_feishu', wake: '备忘录同步', file: '备忘录同步', family: '报告', kind: '结果页', check: '对账报告可点开' },
  { seq: 30, sceneId: 'memo_init_setup', wake: '首次使用', file: '首次使用', family: '报告', kind: '结果页', check: '初始化报告可点开' },
  { seq: 31, sceneId: 'memo_batch_change_category', wake: '备忘改分类', file: '备忘改分类-批量-向导', family: '向导', kind: '过程页', check: '批量勾选过程可点开' },
  { seq: 32, sceneId: 'memo_complete_wish', wake: '完成心愿', file: '完成心愿-向导', family: '向导', kind: '过程页', check: '完成勾选过程可点开' },
  { seq: 33, sceneId: 'memo_wish_schedule', wake: '心愿排期', file: '心愿排期-向导', family: '向导', kind: '过程页', check: '排期勾选过程可点开' },
  { seq: 34, sceneId: 'memo_init_setup', wake: '首次使用', file: '首次使用-向导', family: '向导', kind: '过程页', check: '首次使用引导过程可点开' },
];

/** 4 族格数（复算：19＋9＋2＋4＝34）。 */
export const BOOKLET_FAMILIES: readonly { readonly name: BookletFamily; readonly cells: number }[] = [
  { name: '通用回执', cells: 19 },
  { name: '列表查询', cells: 9 },
  { name: '报告', cells: 2 },
  { name: '向导', cells: 4 },
];

/** 1 共用件：复制区按钮排加说明行（一处定义，34 格复用；实现归 #849／#851）。 */
export const BOOKLET_SHARED_PIECE = { name: '复制区按钮排加说明行', scope: '34 格复用' } as const;

/** 按场景取文件名主体（结果页缺省；过程页须显式传）。 */
export function bookletFileStem(sceneId: string, kind: '结果页' | '过程页' = '结果页'): string {
  const hit = BOOKLET_ROWS.find((r) => r.sceneId === sceneId && r.kind === kind);
  if (hit === undefined) throw new Error('[memo] 册子无此格：' + sceneId + '／' + kind);
  return hit.file;
}
