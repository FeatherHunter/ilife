/** 居家管家自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #695 落地）：**每个技能一份 YAML 配置文件，
 * 配置文件是唯一真相，环境变量不参与配置**。默认落点 `~/.ilife/home.yaml`（由 `os.homedir()` 派生，
 * 平台无关，只此一处）；数据目录默认 `~/.ilife/data/`，
 * 首次读时自动建；「重置为默认」先另存 `<配置目录>/home.yaml.bak`。
 *
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付，本件只做「居家管家的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 默认值逐项等于改造前的代码常量（对照读数见 `docs/skills/skill-home/t695-证据.md`）：
 *   · `db.dir`＝`''`（空串＝按默认落点：数据目录 `~/.ilife/data/`，由取用处算——见 `src/fetch/paths.ts`）；
 *   · `db.name`＝`home.db`（原 `src/fetch/paths.ts` 的 `DB_FILENAME`）；
 *   · `html.dir`＝`home_manager_html`（原 `src/help/manifest.ts` 的 `HELP_HTML_DIR_NAME`——家是**一段**目录，
 *     配置形状是字符串、段间用 `/` 或 `\` 分隔，因为受限子集不收数组；见 `base-link-core/README.md` §支持范围）；
 *   · `key.file`＝`.master.key`（#794 新增：主密钥文件，绝对优先、否则数据目录下）；
 *   · `backup.dir`＝`backups`（原 `src/fetch/backup.ts` 的 `BACKUP_DIR_NAME`，老家 `ops.py:26` 同值）。
 * `files.help`／`files.lookup`（原 `manifest.ts` 的两个主体名）已于 #794 出表，
 * 文件名回到代码常量（见 `src/help/manifest.ts` 的 `HELP_FILE_STEM`／`LOOKUP_FILE_STEM`）。
 * 用法上一处约定：**空串＝按默认落点**——`db.dir` 空即用数据目录，由取用处算，
 * 所以空串不是「没配」，老数据不会看起来丢了。
 * #794 起这条约定的**两半分头**（照记账 #749 样板）：**读**认空串；**写**（首次落文件／保存／重置）
 * 把面板上可改的那一格（`db.dir`）落成算出来的绝对路径——见下面 `writableDefaults()` 的注释。
 */
import { configPaths, loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/home.yaml`。 */
export const HOME_CONFIG_STEM = 'home' as const;

/** 居家管家那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。 */
export const HOME_CONFIG_DEFAULTS = {
  db: { dir: '', name: 'home.db' },
  html: { dir: 'home_manager_html' },
  key: { file: '.master.key' },
  backup: { dir: 'backups' },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键的叶子全路径。命中的键跳过校验、
 *  不进取值、也不会被写回（任何一次保存／重置天然抹掉它）。名单**只许写已经删掉的键**——键还在默认值表里
 *  就写进清单＝在护栏上开洞，`base-link-core` 收到清单时当场拒。
 *  `files.help`／`files.lookup`（#793 定稿）删于本票 #794：两个产物文件名主体回到代码常量
 *  （`src/help/manifest.ts` 的 `HELP_FILE_STEM` 与 `LOOKUP_FILE_STEM`）。
 *  退出条件：下一个大版本删掉这张清单。 */
export const HOME_CONFIG_RETIRED: readonly string[] = ['files.help', 'files.lookup'];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type HomeConfigValues = typeof HOME_CONFIG_DEFAULTS;

/** 写盘那一份用的默认值表：**可改落点**（`db.dir`）写成算出来的绝对路径（#746 总口径回灌，本票 #794 落地，
 *  照记账 #749 样板）。
 *
 * 为什么写绝对路径：面板上「数据目录」那一格显示的是从配置文件算出的生效值，而空串的语义是「按默认落点」
 * ——默认落点由 `os.homedir()` 派生，换机器／改用户名就会漂到别处；写死了才是「这一格写的是什么就是什么」。
 * **代价**（维护者已确认接受）：换机器后 yaml 指向不存在的目录。**只读落点保持相对**（`backup.dir` 与
 * `key.file` 的值是「库目录／数据目录下的哪个位置」，绝对化＝改语义）。
 *
 * 口径的两半：**读**仍认空串（＝按默认落点，老文件一份不用动，也不与 #762 的退休键过渡打架）；
 * **写**（首次落文件／保存／重置）一律落绝对路径。那一格不自己拼路径——直接用 `configPaths(stem).dataDir`，
 * 今天算数据目录只有这一处算法（`base-link-core/src/config/dirs.ts`）。 */
function writableDefaults(): ConfigRecord {
  return {
    ...HOME_CONFIG_DEFAULTS,
    db: { ...HOME_CONFIG_DEFAULTS.db, dir: configPaths(HOME_CONFIG_STEM).dataDir },
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
export interface LoadedHomeConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: HomeConfigValues;
}

/** 每进程按**配置文件路径**记一份（#915 就地摆正：与五家兄弟件同形，`skill-bill/src/config.ts` 的
 *  理由逐字相同——「记忆位不绑『进程』而绑『配置文件路径』，是为了不让换目录后的读落到上一份的缓存上」：
 *  测试逐用例换临时家目录、同一进程里连读几份配置，绑进程就会把第二份读成第一份）。
 *  「保存即生效」仍由写路径清记忆保证（见 `saveHomeConfig`／`resetHomeConfig`），不靠长连接。 */
let memo: { file: string; loaded: LoadedHomeConfig } | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。
 *
 *  读回来的 `values` 是**文件里那份 ⊕ 默认值**（文件里写空串则仍是空串＝按默认落点）；
 *  首次落文件时写下去的是 `writableDefaults()`（可改落点＝绝对路径）。 */
export function loadHomeConfig(): LoadedHomeConfig {
  const file = configPaths(HOME_CONFIG_STEM).configFile;
  if (memo === null || memo.file !== file) {
    const loaded = loadConfig(HOME_CONFIG_STEM, writableDefaults(), HOME_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      file,
      loaded: {
        path: loaded.path,
        dataDir: loaded.dataDir,
        created: loaded.created,
        values: loaded.values as unknown as HomeConfigValues,
      },
    };
  }
  return memo.loaded;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveHomeConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(HOME_CONFIG_STEM, writableDefaults(), withoutBlankEditableDir(values), HOME_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/home.yaml.bak`）。 */
export function resetHomeConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(HOME_CONFIG_STEM, writableDefaults(), HOME_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 把配置里的相对段串拆成段（`home_manager_html` → `['home_manager_html']`；`\` 与 `/` 都认，
 *  空段丢弃——Windows 用户手写路径时两种分隔符都会用）。段数由值决定，故「几段」这件事配置形状能表达。 */
export function splitDirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((s) => s.length > 0);
}
