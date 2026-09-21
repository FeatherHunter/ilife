/** dsh-schedule-ilife 设置页元数据（#696：从只读脚手架换成真配置页）。
 *
 * 本文件是**设置页的行表**：一个可配置项一行，写清它在配置文件里的键、中文标题、
 * 分级（常用 / 高级）、控件种类、只读与否与人话指引。它是页面渲染的唯一依据。
 *
 * **本文件必须零 node 依赖**：`tsconfig.client.json` 把它收进 client 侧编译，
 * 浏览器产物不许带 node 内建。默认值不住这里，也不从技能包 import——
 * 取值一律由宿主经技能 CLI 的 `schedule.config.read` 端点现取（见 bridge.ts）。
 *
 * 口径：
 *   · 配置表形状（键与默认值）的**唯一定义地**是技能侧 `packages/skill-schedule/src/config.ts`
 *     的 `SCHEDULE_CONFIG_DEFAULTS`（本文件是它在页面上的投影，逐键对齐由
 *     `test/config-surface-696.test.mjs` 锁死）；
 *   · **空串＝按默认落点**（老落点由技能各取用处算），所以「空」不是「没配」，
 *     而是「还走改造前那个位置」，老数据不会看起来丢了——行文案按这个语义写；
 *   · `db.dir` 那一行的落点由配置面回执的 `dataDir` 带回（解析好的绝对路径），页面上把它**预填**进
 *     该行（`prefillFrom: 'dataDir'`），用户不必自己拼路径（#743）。
 *
 * **#764 起本家照 #749 样板收窄**（定稿 #761）：页面从「可改表单」收成**一处可改 ＋ 其余只读展示**——
 *   · 可改 1 项：数据目录（`db.dir`，显示生效绝对路径，值非法／空 ⇒ 回落默认数据目录）；
 *   · 只读 2 项：库文件名／HELP 产物目录——它们**只显示技能算好的绝对路径**
 *     （`resolveFrom` 指向回执 `resolved` 组的那一格），面板既不重算也不提交；
 *   · 「飞书 CLI」状态行**不是配置项**（不进本表，见 `client.ts` 的状态区）：三档读数由技能侧出，
 *     面板只显示；同一段 prompt 与官网行见该件。
 *
 * 清单出处：「六家技能的路径类配置全量调查」（t692 §2.6、§三表）作息 **6 项**去掉 1 项包内固定
 * （包内页面模板目录）＝**上设置页候选 5 项**；`db` 组占两个键（目录＋文件名），故行数为 5。
 * **#764 起 `files.help`／`lark.cliPath` 出配置表**（键已退休，见技能侧 `SCHEDULE_CONFIG_RETIRED`），
 * 故本表是 3 行（可改 1 ＋ 只读 2）。
 */
export const SETTINGS_OWNER = 'dsh-schedule-ilife' as const;
export const SETTINGS_SLOT = 'ilife:schedule' as const;

/** 配置文件主体名：落点 `~/.ilife/schedule.yaml`（只此一处）。 */
export const CONFIG_STEM = 'schedule' as const;

/** 分级：常用项直接画在页面上，其余进默认收起的「高级」组（#675 冻结口径）。 */
export type ConfigTier = 'common' | 'advanced';

/** 控件种类：只有这四种（前三种与受限 YAML 子集的字符串／数字／布尔一一对应，没有数组；
 * `directory` 是**字符串那一档的页面形态**——取值仍是串，只是多一个唤起系统文件夹选择器的入口，见 #736）。 */
export type ConfigControl = 'text' | 'number' | 'switch' | 'directory';

/** 只读行显示的那一格：技能侧回执 `resolved` 组里的格名（面板只显示、不计算）。 */
export type ResolvedField = 'dbDir' | 'dbFile' | 'htmlDir';

export interface ConfigItem {
  /** 配置文件里的键路径，一层嵌套用 `.` 连接，例 `db.dir`。 */
  readonly key: string;
  /** 页面上那一行的中文标题。 */
  readonly title: string;
  readonly tier: ConfigTier;
  readonly control: ConfigControl;
  /** 一行人话：这一项管什么、留空会怎样（一到两句，不写开发期口径）。 */
  readonly hint: string;
  /** **只读行**（#764，照 #749 样板）：页面上不给改，值只经技能侧解析后显示；改它要编辑配置文件。
   *  只读行**不参与**保存（`fromDraft` 不收它，免得把显示用的绝对路径写回配置）。 */
  readonly readonly?: boolean;
  /** 只读行的**显示值来源**：回执 `resolved` 组里的哪一格。标了它 ⇒ 显示技能算好的绝对路径；
   *  不标 ⇒ 显示配置文件里那个值本身（数字类只读项走这一档，见 #749 补注二的甲档）。 */
  readonly resolveFrom?: ResolvedField;
  /** 目录行的落点来源：这一行取值空着时，页面上拿配置面回执里的哪一格当它显示的绝对路径。
   *  只有 `db.dir` 标它——回执里的 `dataDir` 就是技能真会用的那个目录，逐字相同。 */
  readonly prefillFrom?: 'dataDir';
}

/** 常用项：#764 起是「可改 1 ＋ 只读 2」（高级组已空，见下）。 */
const COMMON: readonly ConfigItem[] = [
  {
    key: 'db.dir',
    title: '数据目录',
    tier: 'common',
    control: 'directory',
    // 留空＝技能按默认目录落文件；页面上把解析出来的绝对路径直接填进这一行（见 client.ts 的 toDraft）。
    prefillFrom: 'dataDir',
    hint: '库文件与产物的根目录。留空＝用默认目录。',
  },
  {
    key: 'db.name',
    title: '库文件名',
    tier: 'common',
    control: 'text',
    readonly: true,
    resolveFrom: 'dbFile',
    hint: '数据目录下的库文件。',
  },
  {
    key: 'html.dir',
    title: 'HELP 产物目录',
    tier: 'common',
    control: 'text',
    readonly: true,
    resolveFrom: 'htmlDir',
    hint: 'HELP 页面的存放目录。',
  },
];

/** 高级项：#764 起已空（`files.help`／`lark.cliPath` 出配置表）——组还在，行没有。
 *  空组不渲染（见 client.ts），行表长度即 3。 */
const ADVANCED: readonly ConfigItem[] = [];

/** 设置页的行表，顺序即页面顺序。 */
export const CONFIG_ITEMS: readonly ConfigItem[] = [...COMMON, ...ADVANCED];

/** 常用项行数（页面上直接画出来的那些）。 */
export const COMMON_ITEM_COUNT = COMMON.length;

/** 高级组标题与副文案。 */
export const ADVANCED_GROUP_TITLE = '高级' as const;
export const ADVANCED_GROUP_NOTE = '不常改。留空＝用默认值。' as const;

/** 按 `a.b` 路径从配置取值里读（缺层或类型不符一律回 undefined）。 */
export function readPath(values: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let cur: unknown = values;
  for (const part of parts) {
    if (typeof cur !== 'object' || cur === null || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** 按 `a.b` 路径把值写进配置取值（中间层缺就建一层空组；已存在非组即覆盖成组）。 */
export function writePath(values: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let cur: Record<string, unknown> = values;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const next = cur[part];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}
