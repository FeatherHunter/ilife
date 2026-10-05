/** 共用配置面板 · 契约：行表形状、配置面回执、几条两侧共用的常量。
 *
 * 为什么住这里：六个单品插件的设置页各有一份逐字相同的那套代码（卡片骨架／行渲染／样式表／
 * 状态机／配置面三通电话约 3105 行）。本件是抽件之后的**唯一一处定义地**。
 *
 * 本件不认识任何一家能力：行表由调用方给，分支只能由行表数据与配置面回执决定，
 * 里面不出现任何一个能力的名字（结构纪律「依赖方向」）。
 *
 * 对外只经 `config-panel-api.ts` 那一道门；本件自己不出门。
 */

/** 分级：常用项直接画在页面上，其余进默认收起的「高级」组。 */
export type ConfigTier = 'common' | 'advanced';

/** 控件种类：只有这四种（目录是**字符串那一档的页面形态**——取值仍是串，只是多一个选目录的入口）。 */
export type ConfigControl = 'text' | 'number' | 'switch' | 'directory';

/** 设置页的一行：一个可配置项一行，写清它在配置文件里的键、页面上那一行的中文标题、分级、
 *  控件种类、只读与否与人话指引。它是页面渲染的唯一依据（各家自己的那份住各自的 `settings.ts`）。 */
export interface ConfigItem {
  /** 配置文件里的键路径，一层嵌套用 `.` 连接，例 `backup.dir`。 */
  readonly key: string;
  /** 页面上那一行的中文标题。 */
  readonly title: string;
  readonly tier: ConfigTier;
  readonly control: ConfigControl;
  /** 一行人话：这一项管什么、留空会怎样（一到两句，不写开发期口径）。 */
  readonly hint: string;
  /** **只读行**：页面上不给改，值只经技能侧解析后显示；改它要编辑配置文件。
   *  只读行**不参与保存**（填值时跳过它，免得把显示用的绝对路径当成配置值写回去）。 */
  readonly readonly?: boolean;
  /** 只读行的**显示值来源**：回执 `resolved` 组里的哪一格。标了它 ⇒ 显示技能算好的绝对路径；
   *  不标 ⇒ 显示配置文件里那个值本身（数字类只读项走这一档）。 */
  readonly resolveFrom?: string;
  /** 可改行的**落点来源**：这一行取值空着时，页面上拿回执里的哪一格当它显示的绝对路径。
   *  取法先看回执 `resolved` 组同名格，再看回执顶层同名格（如 `dataDir`）——两种写法收成同一格。 */
  readonly prefillFrom?: string;
}

/** 配置面整面回执：形状与各技能侧 `<技能>.config.read` 的 data 逐字段同形。
 *
 * 技能侧多带的格（各家自己的那几格）不写在这里：各家在附加块里自己认（回执形状的唯一定义地
 * 在各家的 `contract.ts`）。本件只认下面这几格，因此里面不出现任何一个能力的名字。 */
export interface ConfigSurfaceReply {
  /** 配置文件绝对路径。 */
  readonly path: string;
  /** 数据目录绝对路径。 */
  readonly dataDir: string;
  /** 本次是不是「文件不存在、按默认值落了一份」。 */
  readonly created: boolean;
  /** 当前取值（文件里的缺项按默认值补）。 */
  readonly values: Record<string, unknown>;
  /** 一组解析后的绝对路径，给只读行显示用；**可选**：装的是旧技能时这一格缺席。 */
  readonly resolved?: Readonly<Record<string, string | undefined>>;
  /** 按行键给的告警（#915 第二步）：**只有技能侧真判出「这一格用不了」时才有这一格**；
   *  缺席＝这一行没问题，面板不亮任何东西。面板只原样画 `message`，不比较、不合成新句子。 */
  readonly alerts?: Readonly<Record<string, ConfigRowAlert>> | undefined;
}

/** 技能侧报出的「这一格真用不了」：一句人话 ＋ 故障码（面板只画 `message`，`code` 给判据与回执用）。 */
export interface ConfigRowAlert {
  readonly code: string;
  readonly message: string;
}

/** 面板对配置面的三通电话：读整面／保存一份取值／重置为默认。三个名字各家逐字相同，收在这里一处。 */
export const RPC_ENDPOINT_CONFIG_GET = 'config.get' as const;
export const RPC_ENDPOINT_CONFIG_SAVE = 'config.save' as const;
export const RPC_ENDPOINT_CONFIG_RESET = 'config.reset' as const;

/** 高级组标题（六家逐字相同，收在这里一处）。
 *
 * #934：原先还有一条副文案 `ADVANCED_GROUP_NOTE`（「不常改。留空＝用默认值。」），
 * 维护者裁定**整条删除、删后不另找地方说**——理由：三家高级项全是只读行、不参与保存、根本没有"留空"，
 * 而"留空会怎样"这条口径本就逐行住在每条的 `hint` 里（见本件 `ConfigItem.hint` 的契约）。 */
export const ADVANCED_GROUP_TITLE = '高级' as const;

/** 请求超时毫秒：与宿主侧 SPAWN_TIMEOUT_MS 同级，界面永不无限转圈。 */
export const READ_TIMEOUT_MS = 20_000 as const;

/** 快路径首帧有界重试表（#1142，照 #982 更新目标表同值：瞬时未就绪不再整面失败）。
 *
 * 有界、调用方负责卸载清理（见 `config-panel.ts` 的取数），不是无界轮询；仅读整面用，保存／重置永不自动重试。 */
export const CONFIG_READ_RETRY_MS: readonly number[] = [1000, 3000, 8000];

/** 复制那一枚按钮就地变「已复制」之后，多久变回「复制」（定稿 v3 第三条：终值 900ms，不弹提示）。
 *
 * #1162 差值终结：由现状 1500 切到终值 900（真相源 #1159 参数表＋原型 `},900)`）；老期望变红属预期，见 #1162。 */
export const COPY_FEEDBACK_MS = 900 as const;

/** T1 交互 tokens（#1160，唯一定义地，真相源 #1159 参数表）。
 *
 * 按压 .97、焦点隔离 2px＋主题色 5px、过渡 .15s——取值逐字照原型 V1
 *（`.scratch/1155-real-panel-prototype.html`：`btn:active{transform:scale(.97)}`、
 * `btn:focus-visible{box-shadow:0 0 0 2px #0b0b0d,0 0 0 5px var(--focus)}`、
 * 主题橙 #f6ad55／蓝 #0a84ff／绿 #30d158、过渡 background／transform／box-shadow／border-color 各 .15s）。
 *
 * 颜色全走主题变量、永不写死蓝：隔离环取卡面底（深浅自适应），焦点环取
 * `--ilife-focus`（缺席时退到宿主品牌色，宿主品牌色本身跟主题走）。
 * 悬停／长按／折叠／复制变勾／提示／液态归后票，本件只定按压与焦点四格。 */
export const PRESS_SCALE = 0.97 as const;
export const FOCUS_RING_GAP_PX = 2 as const;
export const FOCUS_RING_WIDTH_PX = 5 as const;
export const INTERACTION_TRANSITION = 'background .15s ease,transform .15s ease,box-shadow .15s ease,border-color .15s ease' as const;

/** T2 指针与按住 tokens（#1161，唯一定义地，真相源 #1159 参数表＋原型 V1）。
 *
 * 悬停：聚光半径 120、淡洗 13%、辉光内圈 55%＋外发光 25%、上浮 1px——逐字照原型 V1
 *（`.scratch/1155-real-panel-prototype.html`：`.btn:hover{background:color-mix(…13%…);…box-shadow:0 0 0 1px …55%…,0 4px 16px …25%…;transform:translateY(-1px)}`、
 * `::before{background:radial-gradient(120px circle at var(--mx) var(--my),…22%…,transparent 65%)}`）。
 * 页签 12%／高级行 10%不归本票（页签见 #1165，高级见 #1162），这里只定按钮 13% 一档。
 *
 * 禁用：摇头 ±2px／.3s、禁止指针、不透明度 .4——照原型（`shakeV1`＋`.btn:disabled{cursor:not-allowed;opacity:.4}`）。
 *
 * 长按：500ms 纯视觉环（底边 3px 主题色条，`:active` 驱动 0→100%，永不触发动作、不进状态机分支）＋
 * 回弹（沿用 T1 按压释放 .15s 回弹，不另起回弹曲线）。原型环色 `#30d158` 在生产侧换成主题变量。
 *
 * 颜色全走主题变量、永不写死蓝：悬停／辉光／聚光／环一律取 `--ilife-focus` 退品牌色。
 * 触屏降级与减少动态无静态常量（媒体查询即定义，见视图 `interactionCss`）。 */
export const HOVER_SPOTLIGHT_RADIUS_PX = 120 as const;
export const HOVER_WASH_PERCENT = 13 as const;
export const HOVER_GLOW_EDGE_PERCENT = 55 as const;
export const HOVER_GLOW_SOFT_PERCENT = 25 as const;
export const HOVER_LIFT_PX = 1 as const;
export const SPOTLIGHT_PEAK_PERCENT = 22 as const;
export const SPOTLIGHT_FADE_MS = 180 as const;
export const DISABLED_OPACITY = 0.4 as const;
export const DISABLED_SHAKE_MS = 300 as const;
export const LONGPRESS_MS = 500 as const;
export const LONGPRESS_RING_HEIGHT_PX = 3 as const;

/** T3 展开与结果 tokens（#1162，唯一定义地，真相源 #1159 参数表＋原型 V1）。
 *
 * 高级组：220ms 分级展开（`.advbody{transition:max-height .22s ease,opacity .22s ease}`，
 * 开态 cap 300px 即 `.open{max-height:300px;opacity:1}`；原生 details 开关离散、过渡跑不起来，
 * 故生产侧取等价形态 `ilifeFoldIn` 关键帧 0→300＋0→1 同 .22s）＋箭头旋转
 * （`.chev{transition:transform .2s}`、开态 `rotate(90deg)`）＋悬停箭头右移 2px 并跟焦点色
 * （`:hover .chev{translateX(2px)}`）。页签 12%／按钮 13% 淡洗各归其票，这里只定高级头。
 *
 * 轻提示：渐显 .18s（`.toast{transition:opacity .18s ease,transform .18s ease}`，
 * 入场位移 8px 即 `translateY(8px)→0`；生产侧 `notice` 条件挂载，进场即跑 `ilifeToastIn`）。
 *
 * 复制变勾只切时长（字面「已复制」由 #920／#908 锁死不改，见 #1162 进展）。
 * 液态拉伸影子消散与时长公式归 #1165（本工作区已落地 LIQUID_*，本票不另起第二套）；
 * 低端机模糊降级无静态常量（`@media (update: slow)` 即定义，见两处 CSS 函数尾部）。
 * 颜色全走主题变量、永不写死蓝。 */
export const ADVANCED_OPEN_MS = 220 as const;
export const ADVANCED_CHEV_MS = 200 as const;
export const ADVANCED_CHEV_SHIFT_PX = 2 as const;
export const ADVANCED_OPEN_MAX_PX = 300 as const;
export const NOTICE_FADE_MS = 180 as const;
export const NOTICE_RISE_PX = 8 as const;

/** T6 页签与液态 tokens（#1165，唯一定义地，真相源 #1159 参数表＋原型 V1）。
 *
 * 页签悬停淡洗 12%（原型 V1 `.tab:hover{background:color-mix(…12%…)}`，按钮 13% 不串用）；
 * 圆点呼吸 .8s（`dotPulseV1`：scale 1→1.5、opacity 1→.6，悬停驱动）；
 * 液态彗星式：拉伸 1.28/.86（45% 处）＋影子 180ms 消散（ghost opacity .18s），
 * 滑移时长 200＋距离×0.35、夹 220–380ms、缓动 cubic-bezier(.3,1.1,.4,1)（原型 `liquidTo` 原式）；
 * 页签过渡只 background＋border-color 各 .15s（不带 transform：页签不收缩，滑移由 glider 走）。
 * 颜色全走主题变量（`--ilife-focus` 退品牌色、缺席退橙，永不写死蓝）；触屏／减少动态无静态常量（媒体查询即定义，见视图 `tabInteractionCss`）。
 * 共用位第二个用法：配置面板按钮（T1/T2）＋爱生活页签条（本票）共用同一契约。 */
export const TAB_HOVER_WASH_PERCENT = 12 as const;
export const TAB_DOT_PULSE_MS = 800 as const;
export const TAB_TRANSITION = 'background .15s ease,border-color .15s ease' as const;
export const LIQUID_STRETCH_X = 1.28 as const;
export const LIQUID_STRETCH_Y = 0.86 as const;
export const LIQUID_GHOST_MS = 180 as const;
export const LIQUID_MIN_MS = 220 as const;
export const LIQUID_MAX_MS = 380 as const;
export const LIQUID_BASE_MS = 200 as const;
export const LIQUID_DIST_FACTOR = 0.35 as const;
export const LIQUID_EASE = 'cubic-bezier(.3,1.1,.4,1)' as const;

/** 宿主给「这是哪一种目录选择能力」时用的那两格原语的名字（软依赖：按名字现取，缺席即没有入口）。 */
export const REMOTE_DIRECTORY_PICKER = 'remote.directoryPicker' as const;

/** 宿主在「这条路不给」时回的那个码（`directory-browser-state` 的 `openRowBrowser` 只照比不认名）。 */
export const DIRECTORY_PICKER_REFUSED = 'directory-picker/unavailable' as const;

/** 一次配置电话的失败格。 */
export interface RpcErrorFace {
  readonly code?: string;
  readonly message?: string;
}

/** 配置电话的信封（收或拒，永不抛）。 */
export type RpcReply =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error?: RpcErrorFace };

/** 信封守卫：拆包前校验（信封形状的定义地在这里）。 */
export function isRpcResult(raw: unknown): raw is RpcReply {
  if (typeof raw !== 'object' || raw === null) return false;
  return (raw as { ok?: unknown }).ok === true || (raw as { ok?: unknown }).ok === false;
}

/** 印章角色：skill＝技能横条／help＝HELP 旧版／plugin＝插件双铆（定义只此一处）。 */
export type SealRole = 'skill' | 'help' | 'plugin';

/** 印章档位：copper＝铜／silver＝银／gold＝金（定义只此一处）。 */
export type SealTier = 'copper' | 'silver' | 'gold';

/** 面板上的一枚签：角色×档位＋印文＋卷轴三段文案（各家交自家三枚，六家以外不许有第四枚）。 */
export interface SealInstance {
  readonly role: SealRole;
  readonly tier: SealTier;
  /** 印文那一行（技能／某 HELP／插件）。 */
  readonly label: string;
  /** 卷轴进展。 */
  readonly progress: string;
  /** 卷轴状态。 */
  readonly status: string;
  /** 卷轴计划。 */
  readonly plan: string;
}
