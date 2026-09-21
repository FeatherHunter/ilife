/** 饼干记账自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #677 落地；卡路里那一份是
 * `packages/skill-calorie/src/config.ts`，本件与它同形）：
 *   · 每个技能一份 YAML 配置文件，默认 `~/.ilife/bill.yaml`；`ILIFE_CONFIG_DIR` 可覆盖位置；
 *   · **配置文件是唯一真相**，环境变量不参与配置；
 *   · 「重置为默认」先自动备份 `.bak`，备份失败即不写盘、原文件保持不动。
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付。本件只做「饼干记账的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 一处约定照卡路里那份：**空串＝按默认落点**——落点由各取用处按本域常量算（今天写死在哪，
 * 默认就是哪里），所以空串不是「没配」，而是「用老落点」，老数据不会看起来丢了。
 * #749 起这条约定的**两半分头**：**读**认空串；**写**（首次落文件／保存／重置）把面板上可改的
 * 那一格（`db.dir`）落成算出来的绝对路径——见下面 `writableDefaults()` 的注释。
 *
 * 键表出处：`docs/research/t692-six-skill-paths-survey.md` 的记账 8 项去掉 1 项包内固定
 * （包内页面模板目录）＝上设置页候选 7 项，其中「产物文件名主体」在源码里是两个值（#677 起键数 8）。
 * **#762 起那两个产物名主体出表**（见下面 `BILL_CONFIG_RETIRED`），故本表现为 6 键。
 */
import { configPaths, loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/bill.yaml`。 */
export const BILL_CONFIG_STEM = 'bill' as const;

/** 饼干记账那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。 */
export const BILL_CONFIG_DEFAULTS = {
  // 库目录留空＝按默认落点（配置目录下的 data/，即 #675 定的 ~/.ilife/data/）。
  db: { dir: '', name: 'biscuit_accountant.db', goals: 'goals.json' },
  // 备份目录留空＝库目录下的 backups；主体是那份时间戳文件名的主干。
  backup: { dir: '', stem: 'biscuit_' },
  html: { dir: 'biscuit_accountant_html' },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键。命中的键跳过校验、不进取值，
 *  也不会被写回——任何一次保存／重置天然把它抹掉（`saveConfig` 写的是按默认值表补齐的那一份）。
 *  名单**只许写已经删掉的键**（键还在默认值表里就写进清单＝在有护栏上开洞，`base-link-core` 当场拒）。
 *  `html.helpStem`／`html.quickRefStem`（#747 定稿）删于 #762：两个产物文件名主体回到代码常量，
 *  落点值住 `src/help/helpFile.ts` 的 `HELP_FILE_STEM` 与 `src/help/helpPaths.ts` 的 `LOOKUP_FILE_STEM`。
 *  退出条件：下一个大版本删掉这张清单。 */
export const BILL_CONFIG_RETIRED: readonly string[] = ['html.helpStem', 'html.quickRefStem'];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type BillConfigValues = typeof BILL_CONFIG_DEFAULTS;

/** 写盘那一份用的默认值表：**可改落点**（`db.dir`）写成算出来的绝对路径（#746 总口径回灌，本票 #749 落地）。
 *
 * 为什么写绝对路径：面板上「数据目录」那一格显示的是从配置文件算出的生效值，而空串的语义是「按默认落点」
 * ——默认落点由 `os.homedir()` 派生，换机器／改用户名就会漂到别处；写死了才是「这一格写的是什么就是什么」。
 * **代价**（维护者已确认接受）：换机器后 yaml 指向不存在的目录。**只读落点保持相对**（`backup.dir` 的值是
 * 「库目录下的哪个子目录／前缀」，绝对化＝改语义）。
 *
 * 口径的两半：**读**仍认空串（＝按默认落点，老文件一份不用动，也不与 #762 的退休键过渡打架）；
 * **写**（首次落文件／保存／重置）一律落绝对路径。那一格不自己拼路径——直接用 `configPaths(stem).dataDir`，
 * 今天算数据目录只有这一处算法（`base-link-core/src/config/dirs.ts`）。 */
function writableDefaults(): ConfigRecord {
  return {
    ...BILL_CONFIG_DEFAULTS,
    db: { ...BILL_CONFIG_DEFAULTS.db, dir: configPaths(BILL_CONFIG_STEM).dataDir },
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
export interface LoadedBillConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: BillConfigValues;
}

/** 每进程按**配置目录**记一份：`ILIFE_CONFIG_DIR` 一变（测试逐用例换临时目录）即现读，
 *  同一目录里不反复读盘（「保存即生效」由 `saveBillConfig`／`resetBillConfig` 清记忆保证，
 *  不靠长连接）。记忆位不绑「进程」而绑「配置文件路径」，是为了不让换目录后的读落到上一份的缓存上
 *  ——照 `packages/skill-calorie/src/config.ts:47-67` 同形（#718 那一侧先落的这条）。 */
let memo: { file: string; loaded: LoadedBillConfig } | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。
 *
 *  读回来的 `values` 是**文件里那份 ⊕ 默认值**（文件里写空串则仍是空串＝按默认落点）；
 *  首次落文件时写下去的是 `writableDefaults()`（可改落点＝绝对路径）。 */
export function loadBillConfig(): LoadedBillConfig {
  const file = configPaths(BILL_CONFIG_STEM).configFile;
  if (memo === null || memo.file !== file) {
    const loaded = loadConfig(BILL_CONFIG_STEM, writableDefaults(), BILL_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      file,
      loaded: {
        path: loaded.path,
        dataDir: loaded.dataDir,
        created: loaded.created,
        values: loaded.values as unknown as BillConfigValues,
      },
    };
  }
  return memo.loaded;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveBillConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(BILL_CONFIG_STEM, writableDefaults(), withoutBlankEditableDir(values), BILL_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/bill.yaml.bak`）。 */
export function resetBillConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(BILL_CONFIG_STEM, writableDefaults(), BILL_CONFIG_RETIRED);
  memo = null;
  return r;
}
