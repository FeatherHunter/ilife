/** #529 · 身材照片 HELP 两页（`calorie.help.center` 的 q 支）的**内容面**：每条照片命令的人话名与
 *  人话说明、命令到分组的落位、以及目录顺序。
 *
 * 为什么另立一件（结构纪律「必报五步」第 ①②③ 步）：
 *  - **为什么需要**：改前这两页的内容面与装配面同处 `helpDoc.ts`——`desc` 直接取
 *    `triggers/scene-09-photo.ts` 的场景说明，而那份说明是**给 AI 读的**（`存一张身材照(发图/路径双模式)`：
 *    半角括号 ＋ 两个斜杠），上屏即用户看不懂的专业说法；「这条命令属于哪一类」这层信息当时根本不存在。
 *  - **为什么住这里**：它是「字段名 → 页面文本」的**内容映射**，与装配无关、与取数无关，是可独立复用的
 *    薄数据件；放回 `helpDoc.ts` 会把那件从 79 行撑过 350 行告警线，且让「改文案」与「改版面」互相阻塞。
 *  - **对外边界**：只出「纯数据 ＋ 一个查表函数」，不产 HTML、不读盘、不碰 DOM。
 *  - **判据与替换关系**：`helpDoc.ts` 是唯一消费者；取数与信封仍走 `helpLookup.ts`（本件不碰 `key`／
 *    `exec`／`wakeWord`），本件只补「上屏用的人话」。
 *
 * **文字纪律（#529 硬要求）**：本件每个字符串都是**给用户看的**，故
 *  ① 零内部标识符（命令键、包名、函数名、`process.env.*` 一律不进来）；
 *  ② 中文句子里不留半角 `,`／`:`／`(`／`/`（用「，」「：」「（）」或改写）；
 *  ③ 不写 `·`／`；`／`、`／`｜`／`~` 这类并列分隔符——并列语义一律交给形状（徽章／行／卡／目录），
 *     判据是 `scripts/audit-separators.mjs` 的节点级读数（本件一条字符串都不该命中）。
 *
 * **唤醒词逐字上屏（#529 回补，为什么它不能丢）**：本页是「现找」的落点——用户拿走的是**一句唤醒词**
 *  （他要能对 AI 说出这句话）。改前那一版把唤醒词印在每行开头（`身材照 · body_photo_… · 存一张…`），
 *  `#529` 的中间态把命令键换掉时**把唤醒词也一起丢了**（页面上一个字都没有），
 *  机械闸门 `photo-helpdoc-488` 的 `assertKeysOnlyAsAttribute` 就是当场揭示这一点的牙齿。
 *  唤醒词不住本件（它来自 `helpLookup.ts` 的命中项，单一来源）；本件只给它一个**标签**，
 *  由 `helpDoc.ts` 用 `renderChips` 把它排成一行徽章。
 */

/** 一个分组（页内一节）：`id` 既是锚点也是目录项的落点。 */
export interface PhotoHelpSection {
  /** 锚点 id 的短名（页内拼 `PHOTO_HELP_ANCHOR_PREFIX + id`）。 */
  readonly id: string;
  /** 节标题（四个字以内，目录与节头同一份）。 */
  readonly label: string;
  /** 该节一句话说明（出在节头下方；说「这一类是干什么的」，不复述条数）。 */
  readonly lead: string;
}

/** 目录／节序：与 `helpLookup.ts` 的 SoT 场景序无关，是**给人看的走法**（先存、再看、再比、再动图、最后整理）。 */
export const PHOTO_HELP_SECTIONS: readonly PhotoHelpSection[] = Object.freeze([
  Object.freeze({ id: 'save', label: '存照片', lead: '把手上的照片收进身材照库，以后按日期和标签翻得到' }),
  Object.freeze({ id: 'look', label: '看照片', lead: '按标签和时间把库里的照片摆出来看' }),
  Object.freeze({ id: 'compare', label: '对比照片', lead: '挑两张并排看，看出这段时间的变化' }),
  Object.freeze({ id: 'motion', label: '生成动图', lead: '把一段时间的照片连成动图，一眼看出走势' }),
  Object.freeze({ id: 'organize', label: '整理照片', lead: '给照片挂标签或者摘标签，也可以删掉不要的' }),
]);

/** 锚点 id 前缀（`helpDoc.ts` 与节头 `id` 必须逐字同源，故只在这里写一份）。 */
export const PHOTO_HELP_ANCHOR_PREFIX = 'help-';

/** 唤醒词那一行的标签名（说清这枚徽章是什么：用户要照着说的一句话）。 */
export const PHOTO_HELP_SAY_LABEL = '说这句';

/** 清单上方那一句读法（**一页一句**，替代改前「每条命令各印一遍」：同事实一页一处）。 */
export const PHOTO_HELP_ROWS_LEAD = '每条点开都有一句原文，按一下按钮就复制走，粘给我就能用';

/** 一条命令的上屏文本。 */
export interface PhotoHelpText {
  /** 分组 id（=`PHOTO_HELP_SECTIONS[].id`）。 */
  readonly section: string;
  /** 人话名（动作开头，六个字以内；与唤醒词同义改写成读者看得懂的说法）。 */
  readonly label: string;
  /** 一句话说明：先说「这句话是干什么的」，需要补的括号一律用全角。 */
  readonly detail: string;
}

/** 命令键 → 上屏文本（**键本身不出屏**，只用来查表：它仍住在行的 `data-help-row` 属性里供机器认人）。
 *
 *  覆盖面＝`helpLookup.ts` 的 `KEY_EXEC` 全 10 条；`photoHelpTextOf` 查不到即抛——
 *  新增照片命令而忘了补文案时**当场炸**，不静默掉回「给 AI 读的原始说明」。
 */
export const PHOTO_HELP_TEXT: Readonly<Record<string, PhotoHelpText>> = Object.freeze({
  body_photo_add_single: Object.freeze({
    section: 'save', label: '存一张身材照', detail: '存刚拍的一张照片，照片上会记下当天日期',
  }),
  body_photo_add_note: Object.freeze({
    section: 'save', label: '存一张带备注的', detail: '除了日期和标签，再记一句当时的情况，比如「早上空腹」',
  }),
  body_photo_add_batch: Object.freeze({
    section: 'save', label: '一次存好几张', detail: '把同一天的几张照片一次收进来，共用一个日期和标签',
  }),
  body_photo_list: Object.freeze({
    section: 'look', label: '看身材照', detail: '挑一个标签看这一类照片，默认看最近九十天',
  }),
  body_photo_compare: Object.freeze({
    section: 'compare', label: '对比两张照片', detail: '挑两张并排放在一起看，顺便算出隔了多少天',
  }),
  body_photo_gif: Object.freeze({
    section: 'motion', label: '做成动图', detail: '把一段时间的照片按顺序连起来，播放变化过程',
  }),
  body_photo_delete: Object.freeze({
    section: 'organize', label: '删掉一张照片', detail: '确认之后才真的删，删了就找不回来',
  }),
  body_photo_tag_set: Object.freeze({
    section: 'organize', label: '改标签', detail: '把一张照片的标签整套换掉，比如从「正面」改成「侧面」',
  }),
  body_photo_tag_add: Object.freeze({
    section: 'organize', label: '加标签', detail: '在原有标签之外再挂一个，一张照片可以同时有几个标签',
  }),
  body_photo_tag_remove: Object.freeze({
    section: 'organize', label: '去掉标签', detail: '只摘掉指定的那个标签，照片本身还留在库里',
  }),
});

/** 未补文案时的失败（与全仓「缺失阻断不返空」同口径）。 */
export class PhotoHelpTextError extends Error {
  readonly code = 'missing-data' as const;

  constructor(message: string) {
    super(message);
    this.name = 'PhotoHelpTextError';
  }
}

/** 查一条命令的上屏文本；缺项即抛（不返空、不回落原始说明）。 */
export function photoHelpTextOf(key: string): PhotoHelpText {
  const found = PHOTO_HELP_TEXT[key];
  if (found === undefined) {
    throw new PhotoHelpTextError('照片 HELP 缺上屏文案：' + key);
  }
  return found;
}

/** 锚点 id（节头与目录项共用一个拼法）。 */
export function photoHelpAnchorOf(sectionId: string): string {
  return PHOTO_HELP_ANCHOR_PREFIX + sectionId;
}

/** 分组 id → 该组里的命令键序（顺序跟 `helpLookup.ts` 的 SoT 场景序，同组内不改序）。 */
export function photoHelpKeysBySection(keys: readonly string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const key of keys) {
    const { section } = photoHelpTextOf(key);
    const bucket = grouped.get(section);
    if (bucket === undefined) grouped.set(section, [key]);
    else bucket.push(key);
  }
  return grouped;
}
