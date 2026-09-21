/** 私家大厨自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #695 落地）：**每个技能一份 YAML 配置文件，
 * 配置文件是唯一真相，环境变量不参与配置**。默认落点 `~/.ilife/chef.yaml`（由 `os.homedir()` 派生，
 * 平台无关，只此一处）；数据目录默认 `~/.ilife/data/`，
 * 首次读时自动建；「重置为默认」先另存 `<配置目录>/chef.yaml.bak`。
 *
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付，本件只做「私家大厨的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 默认值逐项等于改造前的代码常量（对照读数见 `docs/skills/skill-chef/t695-证据.md`）：
 *   · `db.name`＝`chef_data.db`（原 `src/fetch/paths.ts` 的 `DB_FILENAME`）；
 *   · `html.dir`＝`cook_html/help`（原 `src/help/manifest.ts` 的 `HELP_DIR_SEGMENTS` 两段——配置形状是
 *     字符串、段间用 `/` 或 `\` 分隔，因为受限子集不收数组；见 `base-link-core/README.md` §支持范围）。
 *   · `html.sceneDir`＝`cook_html`（#766 新增：域产物根，三层目录层 1 的落点来源；
 *     `html.dir` 的语义与默认值一动不动，存量配置文件不受影响，缺项按此默认补）.
 * **#796 起 `files.help`／`files.lookup` 出表**（见下面 `CHEF_CONFIG_RETIRED`）：两个产物文件名主体
 * 回到代码常量（`src/help/manifest.ts` 的 `HELP_FILE_STEM`／`LOOKUP_FILE_STEM`）。
 * 用法上一处约定：**空串＝按默认落点**——`db.dir` 空即用数据目录（`~/.ilife/data/`），由取用处算，
 * 所以空串不是「没配」，老数据不会看起来丢了。
 * #796 起这条约定的**两半分头**：**读**认空串；**写**（首次落文件／保存／重置）把面板上可改的
 * 那一格（`db.dir`）落成算出来的绝对路径——见下面 `writableDefaults()` 的注释。
 */
import { configPaths, loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/chef.yaml`。 */
export const CHEF_CONFIG_STEM = 'chef' as const;

/** 私家大厨那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。
 *  **#796 起 3 键**（`db.dir`／`db.name`／`html.dir`）：面板 5 行 → 3 行（可改 1 ＋ 只读 2）；
 *  **#766 起 4 键**：加 `html.sceneDir`（域产物根，默认 `cook_html`，`html.dir` 不动）。 */
export const CHEF_CONFIG_DEFAULTS = {
  db: { dir: '', name: 'chef_data.db' },
  html: { dir: 'cook_html/help', sceneDir: 'cook_html' },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键的叶子全路径。命中的键跳过校验、
 *  不进取值、也不会被写回（任何一次保存／重置天然抹掉它）。名单**只许写已经删掉的键**——键还在默认值表里
 *  就写进清单＝在护栏上开洞，`base-link-core` 收到清单时当场拒。
 *  `files.help`／`files.lookup`（#795 定稿）在本票 #796 里删：文件名回代码常量，产物名逐字不变。
 *  退出条件：下一个大版本删掉这张清单。 */
export const CHEF_CONFIG_RETIRED: readonly string[] = ['files.help', 'files.lookup'];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type ChefConfigValues = typeof CHEF_CONFIG_DEFAULTS;

/** 写盘那一份用的默认值表：**可改落点**（`db.dir`）写成算出来的绝对路径（#746 总口径回灌，本票 #796 落地）。
 *
 * 为什么写绝对路径：面板上「数据目录」那一格显示的是从配置文件算出的生效值，而空串的语义是「按默认落点」
 * ——默认落点由 `os.homedir()` 派生，换机器／改用户名就会漂到别处；写死了才是「这一格写的是什么就是什么」。
 *
 * 口径的两半：**读**仍认空串（＝按默认落点，老文件一份不用动，也不与 #762 的退休键过渡打架）；
 * **写**（首次落文件／保存／重置）一律落绝对路径。那一格不自己拼路径——直接用 `configPaths(stem).dataDir`，
 * 今天算数据目录只有这一处算法（`base-link-core/src/config/dirs.ts`）。 */
function writableDefaults(): ConfigRecord {
  return {
    ...CHEF_CONFIG_DEFAULTS,
    db: { ...CHEF_CONFIG_DEFAULTS.db, dir: configPaths(CHEF_CONFIG_STEM).dataDir },
  };
}

/** 写盘前把可改落点那一格的**空白值**去掉：空串＝按默认落点，而写的时候那个落点要落成绝对路径
 *  （见 `writableDefaults`）——去掉这一格，`base-link-core` 的 `fillDefaults` 自会补上写盘用的默认值。
 *  组里一个子项都不剩时连组一起去掉（空组写出去解析不回来）。 */
function withoutBlankEditableDir(values: ConfigRecord): ConfigRecord {
  const group = values['db'];
  if (typeof group !== 'object' || group === null || Array.isArray(group)) return values;
  const dir = (group as Record<string, unknown>)['dir'];
  if (typeof dir !== 'string' || dir !== '') return values;
  const next: Record<string, unknown> = { ...(group as Record<string, unknown>) };
  delete next['dir'];
  const out: ConfigRecord = { ...values };
  if (Object.keys(next).length === 0) delete out['db'];
  else out['db'] = next as ConfigRecord['db'];
  return out;
}

/** 读回来的一份配置：文件路径（人话报错要指它）＋数据目录＋取值。 */
export interface LoadedChefConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: ChefConfigValues;
}

/** 每份配置文件记一份：家目录一变（测试逐用例换临时家目录）即现读，
 *  同一文件里不反复读盘（「保存即生效」由 `saveChefConfig`／`resetChefConfig` 清记忆保证，
 *  不靠长连接）。记忆位不绑「进程」而绑「配置文件路径」，是为了不让换目录后的读落到上一份的缓存上
 *  ——照 `packages/skill-bill/src/config.ts` 同形（#749 那一侧先落的这条）。 */
let memo: { file: string; loaded: LoadedChefConfig } | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。
 *
 *  读回来的 `values` 是**文件里那份 ⊕ 默认值**（文件里写空串则仍是空串＝按默认落点）；
 *  首次落文件时写下去的是 `writableDefaults()`（可改落点＝绝对路径）。 */
export function loadChefConfig(): LoadedChefConfig {
  const file = configPaths(CHEF_CONFIG_STEM).configFile;
  if (memo === null || memo.file !== file) {
    const loaded = loadConfig(CHEF_CONFIG_STEM, writableDefaults(), CHEF_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      file,
      loaded: {
        path: loaded.path,
        dataDir: loaded.dataDir,
        created: loaded.created,
        values: loaded.values as unknown as ChefConfigValues,
      },
    };
  }
  return memo.loaded;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveChefConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(CHEF_CONFIG_STEM, writableDefaults(), withoutBlankEditableDir(values), CHEF_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/chef.yaml.bak`）。 */
export function resetChefConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(CHEF_CONFIG_STEM, writableDefaults(), CHEF_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 把配置里的相对段串拆成段（`cook_html/help` → `['cook_html','help']`；`\` 与 `/` 都认，
 *  空段丢弃——Windows 用户手写路径时两种分隔符都会用）。段数由值决定，故「几段」这件事配置形状能表达。 */
export function splitDirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((s) => s.length > 0);
}
