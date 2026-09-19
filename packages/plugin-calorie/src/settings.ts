/** dsh-calorie 设置页元数据（#676：从只读脚手架换成真配置页）。
 *
 * 本文件是**设置页的行表**：一个可配置项一行，写清它在配置文件里的键、中文标题、
 * 分级（常用 / 高级）、控件种类与人话指引。它是页面渲染的唯一依据。
 *
 * **本文件必须零 node 依赖**：`tsconfig.client.json` 把它收进 client 侧编译，
 * 浏览器产物不许带 node 内建。默认值不住这里，也不从技能包 import——
 * 取值一律由宿主经技能 CLI 的 `calorie.config.read` 端点现取（见 bridge.ts）。
 *
 * 口径：
 *   · 配置表形状（键与默认值）的**唯一定义地**是技能侧 `packages/skill-calorie/src/config.ts`
 *     的 `CALORIE_CONFIG_DEFAULTS`（本文件是它在页面上的投影，逐键对齐由
 *     `test/config-surface-676.test.mjs` 用源码文本锁死）；
 *   · **空串＝按默认落点**（老落点由技能各取用处算）。所以「空」不是「没配」，
 *     而是「还走改造前那个位置」，老数据不会看起来丢了——行文案按这个语义写。
 */
export const SETTINGS_OWNER = 'dsh-calorie' as const;
export const SETTINGS_SLOT = 'ilife:calorie' as const;

/** 配置文件主体名：落点 `~/.ilife/calorie.yaml`（`ILIFE_CONFIG_DIR` 可整体接管）。 */
export const CONFIG_STEM = 'calorie' as const;

/** 分级：常用项直接画在页面上，其余进默认收起的「高级」组（#675 冻结口径）。 */
export type ConfigTier = 'common' | 'advanced';

/** 控件种类：只有这三种（与受限 YAML 子集的字符串／数字／布尔一一对应，没有数组）。 */
export type ConfigControl = 'text' | 'number' | 'switch';

export interface ConfigItem {
  /** 配置文件里的键路径，一层嵌套用 `.` 连接，例 `xunji.stateDir`。 */
  readonly key: string;
  /** 页面上那一行的中文标题。 */
  readonly title: string;
  readonly tier: ConfigTier;
  readonly control: ConfigControl;
  /** 一行人话：这一项管什么、留空会怎样。 */
  readonly hint: string;
}

/** 常用项：用户裁决三点的五项——改了就影响「库与产物落在哪、训记认不认你」，放页面上。 */
const COMMON: readonly ConfigItem[] = [
  {
    key: 'db.dir',
    title: '数据目录',
    tier: 'common',
    control: 'text',
    hint: '库文件与各类产物的根目录。留空＝按默认落点（配置目录下的 data/），也就是改造前那个位置。',
  },
  {
    key: 'db.name',
    title: '库文件名',
    tier: 'common',
    control: 'text',
    hint: '数据目录下的数据库文件名。改它等于换一个库，老数据留在旧文件里不会跟过来。',
  },
  {
    key: 'html.dir',
    title: 'HTML 产物目录名',
    tier: 'common',
    control: 'text',
    hint: '数据目录下放交付页面的子目录名。改它之后新页面落新地方，旧页面留在原处。',
  },
  {
    key: 'photos.dir',
    title: '照片目录',
    tier: 'common',
    control: 'text',
    hint: '身材照的存放目录，绝对路径。留空＝未配：读照片不报错，出 GIF 与写照片会被拦下。',
  },
  {
    key: 'xunji.key',
    title: '训记 KEY',
    tier: 'common',
    control: 'text',
    hint: '训记用的凭据。留空＝没配，推送与回写会被拦下；它同时是敏感值，别贴给别人。',
  },
];

/** 高级项：默认收起（13 项减常用 5 项＝8 项）。改错了多半只是自己撞上麻烦，不确定就别动。 */
const ADVANCED: readonly ConfigItem[] = [
  {
    key: 'photos.gifs',
    title: '照片 GIF 子目录',
    tier: 'advanced',
    control: 'text',
    hint: '照片目录下放 GIF 的子目录名。',
  },
  {
    key: 'xunji.stateDir',
    title: '训记状态文件目录',
    tier: 'advanced',
    control: 'text',
    hint: '限频记账点与同步游标放哪。留空＝家目录下的 .mavis，也就是改造前那个位置。',
  },
  {
    key: 'xunji.catalog',
    title: '训记动作库路径',
    tier: 'advanced',
    control: 'text',
    hint: '动作名判定用哪份库。留空＝用包内预置的那份，也就是改造前那个位置。',
  },
  {
    key: 'xunji.backfillDays',
    title: '回写默认天数',
    tier: 'advanced',
    control: 'number',
    hint: '从训记拉实绩时不带天数参数时的窗口，整数天。',
  },
  {
    key: 'land.scheduleCli',
    title: '跨技能出口 · 作息',
    tier: 'advanced',
    control: 'text',
    hint: '「落地训练」调作息那一步的入口文件。留空＝按包布局算（改造前那个位置）。',
  },
  {
    key: 'land.memoCli',
    title: '跨技能出口 · 备忘',
    tier: 'advanced',
    control: 'text',
    hint: '「落地训练」调备忘那一步的入口文件，同上。',
  },
  {
    key: 'land.xunjiSeconds',
    title: '训记调用限时（秒）',
    tier: 'advanced',
    control: 'number',
    hint: '外部调训记超过这个秒数即 exit 4。机器慢就调大。',
  },
  {
    key: 'land.landSeconds',
    title: '落地调用限时（秒）',
    tier: 'advanced',
    control: 'number',
    hint: '落地训练那几步超过这个秒数即 exit 4，同上。',
  },
];

/** 设置页的行表，顺序即页面顺序。 */
export const CONFIG_ITEMS: readonly ConfigItem[] = [...COMMON, ...ADVANCED];

/** 常用项行数（页面上直接画出来的那些）。 */
export const COMMON_ITEM_COUNT = COMMON.length;

/** 高级组标题与副文案。 */
export const ADVANCED_GROUP_TITLE = '高级' as const;
export const ADVANCED_GROUP_NOTE = '不常改。留空＝按默认落点（改造前那个位置），不确定就别动。' as const;

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
