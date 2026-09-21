/** 备忘录自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #695 落地）：**每个技能一份 YAML 配置文件，
 * 配置文件是唯一真相，环境变量不参与配置**。默认落点 `~/.ilife/memo.yaml`（由 `os.homedir()` 派生，
 * 平台无关，只此一处）；数据目录默认 `~/.ilife/data/`，
 * 首次读时自动建；「重置为默认」先另存 `<配置目录>/memo.yaml.bak`。
 *
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付，本件只做「备忘录的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 默认值逐项等于改造前的代码常量（对照读数见 `docs/skills/skill-memo-ilife/t695-证据.md`）：
 *   · `db.dir`＝空串＝按默认落点（数据目录 `~/.ilife/data/`；改造前是环境变量 `SKILLS_DB_PATH` 必设）；
 *   · `db.name`＝`memo.db`（原 `src/fetch/db.ts` 的 `memoDbFile()` 里写死的文件名）；
 *   · `html.dir`＝`memo_html`（原 `src/help/manifest.ts` 的 `HELP_HTML_DIR_NAME`，**扁平一段**）；
 *   · `media.dir`＝空串＝按默认落点（#760 起＝`<数据目录>/media`；改造前是 `src/policy/media.ts`
 *     按进程工作目录解的相对值 `media`，语义的升级归 #712，默认落点归 #760）。
 * 用法上一处约定：**空串＝按默认落点**（照卡路里的`db.dir` 那条），所以空串不是「没配」。
 * #760 起这条约定的**两半分头**（照记账样板 #749）：**读**认空串；**写**（首次落文件／保存／重置）把面板上
 * 可改的那两格（`db.dir`／`media.dir`）落成算出来的绝对路径——见下面 `writableDefaults()` 的注释。
 *
 * 键表出处：「六家技能的路径类配置全量调查」备忘 8 项（#759 定稿：面板 8 行 → 4 行）。
 * **#760 起 `files.help`／`files.lookup`／`lark.cliPath`／`lark.qrDir` 出表**（见下面 `MEMO_CONFIG_RETIRED`），
 * 故本表现为 4 键（`lark` 整组无活子项 ⇒ 组层不写出，口径见 #762）。
 */
import { join } from 'node:path';
import { configPaths, loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/memo.yaml`。 */
export const MEMO_CONFIG_STEM = 'memo' as const;

/** 附件子目录名：`media.dir` 空串（＝按默认落点）时落下 `<数据目录>/media` 的那一段。
 *  唯一定义地（`src/fetch/paths.ts` 的 `mediaDirOf` 与下面的 `writableDefaults` 都引用它）。 */
export const MEDIA_DIR_NAME = 'media' as const;

/** 备忘录那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。 */
export const MEMO_CONFIG_DEFAULTS = {
  db: { dir: '', name: 'memo.db' },
  html: { dir: 'memo_html' },
  media: { dir: '' },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键的叶子全路径。命中的键跳过校验、
 *  不进取值、也不会被写回（任何一次保存／重置天然抹掉它）；**整组的子项全退休时那一层组名也不写出**
 *  （`lark` 这一组在本家正是这个形状：`lark.cliPath`／`lark.qrDir` 全退 ⇒ 文件里不再有 `lark:` 这一层）。
 *  名单**只许写已经删掉的键**——键还在默认值表里就写进清单
 *  ＝在护栏上开洞，`base-link-core` 收到清单时当场拒。
 *  `files.help`／`files.lookup`／`lark.cliPath`／`lark.qrDir` 删于【实施】备忘录设置页收窄（#760）：
 *  两个产物名主体回到 `src/help/manifest.ts` 的代码常量，飞书 CLI 改「检测＋复制 prompt」（定稿 #759）。
 *  退出条件：下一个大版本删掉这张清单。 */
export const MEMO_CONFIG_RETIRED: readonly string[] = [
  'files.help',
  'files.lookup',
  'lark.cliPath',
  'lark.qrDir',
];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type MemoConfigValues = typeof MEMO_CONFIG_DEFAULTS;

/** 写盘那一份用的默认值表：**可改落点**（`db.dir`／`media.dir`）写成算出来的绝对路径（#746 总口径回灌，
 *  本票 #760 落地，照记账样板 #749）。
 *
 * 为什么写绝对路径：面板上那两格显示的是从配置文件算出的生效值，而空串的语义是「按默认落点」
 * ——默认落点由 `os.homedir()` 派生，换机器／改用户名就会漂到别处；写死了才是「这一格写的是什么就是什么」。
 * **只读落点保持相对**（`html.dir` 的值是「数据目录下的哪个子目录名」，绝对化＝改语义）。
 *
 * 口径的两半：**读**仍认空串（＝按默认落点，老文件一份不用动，也不与 #762 的退休键过渡打架）；
 * **写**（首次落文件／保存／重置）一律落绝对路径。那两格不自己拼路径——`db.dir` 直接用
 * `configPaths(stem).dataDir`（今天算数据目录只有这一处算法，`base-link-core/src/config/dirs.ts`）；
 * `media.dir`＝`<数据目录>/media`（#759 定稿的默认），由同一份 `dataDir` 派生。
 */
function writableDefaults(): ConfigRecord {
  const dataDir = configPaths(MEMO_CONFIG_STEM).dataDir;
  return {
    ...MEMO_CONFIG_DEFAULTS,
    db: { ...MEMO_CONFIG_DEFAULTS.db, dir: dataDir },
    media: { ...MEMO_CONFIG_DEFAULTS.media, dir: join(dataDir, MEDIA_DIR_NAME) },
  };
}

/** 写盘前把可改落点那两格的**空白值**去掉：空串＝按默认落点，而写的时候那个落点要落成绝对路径
 *  （见 `writableDefaults`）——去掉这两格，`base-link-core` 的 `fillDefaults` 自会补上写盘用的默认值。
 *  组里一个子项都不剩时连组一起去掉（空组写出去解析不回来）。 */
function withoutBlankEditableDir(values: ConfigRecord): ConfigRecord {
  const out: ConfigRecord = { ...values };
  for (const group of ['db', 'media'] as const) {
    const got = out[group];
    if (typeof got !== 'object' || got === null || Array.isArray(got)) continue;
    const dir = (got as Record<string, unknown>)['dir'];
    if (typeof dir !== 'string' || dir !== '') continue;
    const next: Record<string, unknown> = { ...(got as Record<string, unknown>) };
    delete next['dir'];
    if (Object.keys(next).length === 0) delete out[group];
    else out[group] = next as ConfigRecord[typeof group];
  }
  return out;
}

/** 读回来的一份配置：文件路径（人话报错要指它）＋数据目录＋取值。 */
export interface LoadedMemoConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: MemoConfigValues;
}

/** 每进程按**配置目录**记一份：家目录一变（测试逐用例换临时家目录）即现读，
 *  同一目录里不反复读盘（「保存即生效」由 `saveMemoConfig`／`resetMemoConfig` 清记忆保证，
 *  不靠长连接）。记忆位不绑「进程」而绑「配置文件路径」，是为了不让换目录后的读落到上一份的缓存上
 *  ——照 `packages/skill-bill/src/config.ts` 同形（#749 样板）。 */
let memo: { file: string; loaded: LoadedMemoConfig } | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。
 *
 *  读回来的 `values` 是**文件里那份 ⊕ 默认值**（文件里写空串则仍是空串＝按默认落点）；
 *  首次落文件时写下去的是 `writableDefaults()`（可改落点＝绝对路径）。 */
export function loadMemoConfig(): LoadedMemoConfig {
  const file = configPaths(MEMO_CONFIG_STEM).configFile;
  if (memo === null || memo.file !== file) {
    const loaded = loadConfig(MEMO_CONFIG_STEM, writableDefaults(), MEMO_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      file,
      loaded: {
        path: loaded.path,
        dataDir: loaded.dataDir,
        created: loaded.created,
        values: loaded.values as unknown as MemoConfigValues,
      },
    };
  }
  return memo.loaded;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveMemoConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(MEMO_CONFIG_STEM, writableDefaults(), withoutBlankEditableDir(values), MEMO_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/memo.yaml.bak`）。 */
export function resetMemoConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(MEMO_CONFIG_STEM, writableDefaults(), MEMO_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 把配置里的相对段串拆成段（`/` 与 `\` 都认，空段丢弃）。 */
export function splitDirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((s) => s.length > 0);
}
