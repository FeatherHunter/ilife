/** 作息管家自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调 ＋ 段串拆分。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #695 落地）：**每个技能一份 YAML 配置文件，
 * 配置文件是唯一真相，环境变量不参与配置**。默认落点 `~/.ilife/schedule.yaml`（由 `os.homedir()` 派生，
 * 平台无关），`ILIFE_CONFIG_DIR` 设定且非空即整体接管配置目录；数据目录默认 `~/.ilife/data/`，
 * 首次读时自动建；「重置为默认」先另存 `<配置目录>/schedule.yaml.bak`。
 *
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付，本件只做「作息管家的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 默认值逐项等于改造前的代码常量（对照读数见 `docs/skills/skill-schedule/t695-证据.md`）：
 *   · `db.name`＝`schedule_data.db`（原 `src/fetch/paths.ts` 的 `DB_FILENAME`）；
 *   · `html.dir`＝`schedule_html/help`（原 `src/help/helpPaths.ts` 的 `HELP_HTML_DIR_PARTS` 两段——
 *     配置形状是字符串、段间用 `/` 或 `\` 分隔，因为受限子集不收数组；见 `base-link-core/README.md` §支持范围）；
 *   · `files.help`＝`作息管家_HELP`（原 `src/help/helpFile.ts` 的 `HELP_FILE_STEM`）；
 *   · `lark.cliPath`＝空串（原 `LARK_CLI_PATH` 环境变量；空串＝没有显式值，走 `findLarkCli` 的兜底探测）。
 * 用法上一处约定：**空串＝按默认落点**——`db.dir` 空即用数据目录（`~/.ilife/data/`），由取用处算，
 * 所以空串不是「没配」，老数据不会看起来丢了。
 */
import { loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/schedule.yaml`。 */
export const SCHEDULE_CONFIG_STEM = 'schedule' as const;

/** 作息管家那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。 */
export const SCHEDULE_CONFIG_DEFAULTS = {
  db: { dir: '', name: 'schedule_data.db' },
  html: { dir: 'schedule_html/help' },
  files: { help: '作息管家_HELP' },
  lark: { cliPath: '' },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键的叶子全路径。命中的键跳过校验、
 *  不进取值、也不会被写回（任何一次保存／重置天然抹掉它）；**整组的子项全退休时那一层组名也不写出**
 *  （`lark` 这一组在本家将来正是这个形状：`lark.cliPath` 是它唯一的子项）。名单**只许写已经删掉的键**
 *  ——键还在默认值表里就写进清单＝在护栏上开洞，`base-link-core` 收到清单时当场拒。
 *  `files.help`／`lark.cliPath` 预定在【实施】作息管家设置页收窄（#764）里删；填进来之前，本清单保持为空。
 *  退出条件：下一个大版本删掉这张清单。 */
export const SCHEDULE_CONFIG_RETIRED: readonly string[] = [];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type ScheduleConfigValues = typeof SCHEDULE_CONFIG_DEFAULTS;

/** 读回来的一份配置：文件路径（人话报错要指它）＋数据目录＋取值。 */
export interface LoadedScheduleConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: ScheduleConfigValues;
}

/** 每进程只读一次：配置文件的「保存即生效」靠**下一次调用现读**，同一个进程里不反复读盘。 */
let memo: LoadedScheduleConfig | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。 */
export function loadScheduleConfig(): LoadedScheduleConfig {
  if (memo === null) {
    const loaded = loadConfig(SCHEDULE_CONFIG_STEM, SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      path: loaded.path,
      dataDir: loaded.dataDir,
      created: loaded.created,
      values: loaded.values as unknown as ScheduleConfigValues,
    };
  }
  return memo;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveScheduleConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(SCHEDULE_CONFIG_STEM, SCHEDULE_CONFIG_DEFAULTS, values, SCHEDULE_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/schedule.yaml.bak`）。 */
export function resetScheduleConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(SCHEDULE_CONFIG_STEM, SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 把配置里的相对段串拆成段（`schedule_html/help` → `['schedule_html','help']`；`\` 与 `/` 都认，
 *  空段丢弃——Windows 用户手写路径时两种分隔符都会用）。段数由值决定，故「几段」这件事配置形状能表达。 */
export function splitDirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((s) => s.length > 0);
}
