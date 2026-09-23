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

/** 高级组标题与副文案（六家逐字相同，收在这里一处）。 */
export const ADVANCED_GROUP_TITLE = '高级' as const;
export const ADVANCED_GROUP_NOTE = '不常改。留空＝用默认值。' as const;

/** 请求超时毫秒：与宿主侧 SPAWN_TIMEOUT_MS 同级，界面永不无限转圈。 */
export const READ_TIMEOUT_MS = 20_000 as const;

/** 复制那一枚按钮就地变「已复制」之后，多久变回「复制」（定稿 v3 第三条：1.5 秒，不弹提示）。 */
export const COPY_FEEDBACK_MS = 1500 as const;

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
