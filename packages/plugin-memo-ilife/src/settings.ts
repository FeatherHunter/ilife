/** dsh-memo-ilife 设置页元数据（#696：从只读脚手架换成真配置页）。
 *
 * 本文件是**设置页的行表**：一个可配置项一行，写清它在配置文件里的键、中文标题、
 * 分级（常用 / 高级）、控件种类与人话指引。它是页面渲染的唯一依据。
 *
 * **本文件必须零 node 依赖**：`tsconfig.client.json` 把它收进 client 侧编译，
 * 浏览器产物不许带 node 内建。默认值不住这里，也不从技能包 import——
 * 取值一律由宿主经技能 CLI 的 `memo.config.read` 端点现取（见 bridge.ts）。
 *
 * 口径：
 *   · 配置表形状（键与默认值）的**唯一定义地**是技能侧 `packages/skill-memo-ilife/src/config.ts`
 *     的 `MEMO_CONFIG_DEFAULTS`（本文件是它在页面上的投影，逐键对齐由
 *     `test/config-surface-696.test.mjs` 用编译产物锁死）；
 *   · **空串＝按默认落点**（老落点由技能各取用处算），所以「空」不是「没配」，
 *     而是「还走改造前那个位置」，老数据不会看起来丢了——行文案按这个语义写；
 *   · `db.dir` 那一行的落点由配置面回执的 `dataDir` 带回（解析好的绝对路径），页面上把它**预填**进
 *     该行（`prefillFrom: 'dataDir'`），用户不必自己拼路径（#743）。
 *
 * 清单出处：「六家技能的路径类配置全量调查」备忘那 8 项全部上设置页 ＝ 行数 8：
 * 常用 4（库与产物落在哪）＋ 高级 4（两个产物文件名主体 ＋ 飞书 CLI 与二维码两处落点）。
 * 「附件目录」那一条的语义照 #712 落地后的口径写（真目录 ＋ 真包含判定），不是旧的字符串前缀。
 */
export const SETTINGS_OWNER = 'dsh-memo-ilife' as const;
export const SETTINGS_SLOT = 'ilife:memo' as const;

/** 配置文件主体名：落点 `~/.ilife/memo.yaml`（`ILIFE_CONFIG_DIR` 可整体接管）。 */
export const CONFIG_STEM = 'memo' as const;

/** 分级：常用项直接画在页面上，其余进默认收起的「高级」组（#675 冻结口径）。 */
export type ConfigTier = 'common' | 'advanced';

/** 控件种类：只有这四种（前三种与受限 YAML 子集的字符串／数字／布尔一一对应，没有数组；
 * `directory` 是**字符串那一档的页面形态**——取值仍是串，只是多一个唤起系统文件夹选择器的入口，见 #736）。 */
export type ConfigControl = 'text' | 'number' | 'switch' | 'directory';

export interface ConfigItem {
  /** 配置文件里的键路径，一层嵌套用 `.` 连接，例 `files.help`。 */
  readonly key: string;
  /** 页面上那一行的中文标题。 */
  readonly title: string;
  readonly tier: ConfigTier;
  readonly control: ConfigControl;
  /** 一行人话：这一项管什么、留空会怎样（一到两句，不写开发期口径）。 */
  readonly hint: string;
  /** 目录行的落点来源：这一行取值空着时，页面上拿配置面回执里的哪一格当它显示的绝对路径。
   *  只有 `db.dir` 标它——回执里的 `dataDir` 就是技能真会用的那个目录，逐字相同。 */
  readonly prefillFrom?: 'dataDir';
}

/** 常用项：改了就影响「库与产物落在哪」，放页面上。 */
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
    hint: '数据目录下的数据库文件名。改名＝换库，旧笔记不会被读入。',
  },
  {
    key: 'html.dir',
    title: 'HTML 产物目录名',
    tier: 'common',
    control: 'text',
    hint: '数据目录下存放 HELP 页面的子目录名。',
  },
  {
    key: 'media.dir',
    title: '附件目录',
    tier: 'common',
    control: 'directory',
    hint: '附件的存放根目录。留空＝工作目录下的 media。',
  },
];

/** 高级项：默认收起。改错了多半只是自己撞上麻烦，不确定就别动。 */
const ADVANCED: readonly ConfigItem[] = [
  {
    key: 'files.help',
    title: '产物文件名主体 · HELP',
    tier: 'advanced',
    control: 'text',
    hint: 'HELP 文件名前缀，后面自动加时间戳。',
  },
  {
    key: 'files.lookup',
    title: '产物文件名主体 · 速查表',
    tier: 'advanced',
    control: 'text',
    hint: '速查表文件名前缀。',
  },
  {
    key: 'lark.cliPath',
    title: '飞书 CLI 路径',
    tier: 'advanced',
    control: 'text',
    hint: '飞书 CLI 的可执行文件路径。留空＝自动探测。',
  },
  {
    key: 'lark.qrDir',
    title: '飞书授权二维码落点',
    tier: 'advanced',
    control: 'directory',
    hint: '飞书授权二维码 PNG 的存放目录，缺就现建。留空＝系统临时目录。',
  },
];

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
