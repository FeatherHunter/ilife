/** 卡路里自己的配置面：那份默认值表 ＋ 读／写／重置三个薄转调。
 *
 * 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #676 落地）：
 *   · 每个技能一份 YAML 配置文件，默认 `~/.ilife/calorie.yaml`；`ILIFE_CONFIG_DIR` 可覆盖位置；
 *   · **配置文件是唯一真相**，环境变量不参与配置；
 *   · 「重置为默认」先自动备份 `.bak`，备份失败即不写盘、原文件保持不动。
 * 读写实现（受限 YAML 子集解析、键表与类型校验、备份、建目录）住 `base-link-core` 的 `src/config/`
 * ——#694 已交付。本件只做「卡路里的那份表 ＋ 转调」，一份实现不抄第二处（结构纪律铁律一）。
 *
 * 默认值逐项等于改造前的代码常量（对照读数见 `docs/plugins/plugin-calorie/t676-证据.md`）。
 * 用法上一处约定：**空串＝按默认落点**——落点由各取用处按本域常量算（今天写死在哪，默认就是哪里），
 * 所以空串不是「没配」，而是「用老落点」，老数据不会看起来丢了。
 */
import { configPaths, loadConfig, resetConfig, saveConfig } from 'base-link-core';
import type { ConfigRecord } from 'base-link-core';

/** 配置文件主体名：`<配置目录>/calorie.yaml`。 */
export const CALORIE_CONFIG_STEM = 'calorie' as const;

/** 卡路里那份配置表：键即设置页的行，一层嵌套（子集支持范围见 base-link-core README）。
 *
 * ⚠️ `xunji.cli` 是**页外键**（t692 裁定：训记 CLI 入口属「包内固定、不上设置页」的三项之一）：
 * 它进这张表是为了让测试把训记那条外调指到一个 fixture 脚本——等价于原 `CALORIE_XUNJI_STUB`
 * 那条环境变量缝，但入口是**配置**这条唯一真相。空串＝包内编译产物，即生产行为，页面上没有它的行。 */
export const CALORIE_CONFIG_DEFAULTS = {
  db: { dir: '', name: 'calorie_data.db' },
  html: { dir: 'calorie_html' },
  photos: { dir: '', gifs: 'gifs' },
  xunji: { key: '', cli: '', stateDir: '', catalog: '', backfillDays: 1 },
  land: { scheduleCli: '', memoCli: '', xunjiSeconds: 300, landSeconds: 60 },
};

/** **已退休键**（#762 过渡件）：我们自己删过、老配置文件里必然还留着的键的叶子全路径。命中的键跳过校验、
 *  不进取值、也不会被写回（任何一次保存／重置天然抹掉它）。名单**只许写已经删掉的键**——键还在默认值表里
 *  就写进清单＝在护栏上开洞，`base-link-core` 收到清单时当场拒。
 *  `land.scheduleCli`／`land.memoCli` 预定在【实施】卡路里设置页收窄（#757）里删；**那一票必须先定下
 *  这两个跨技能出口的替代通道**（`workout/landRunner.ts` 的出口算式与 `health.ts` 的落点判据都读它们，
 *  且 `test/t612/t613/t614`、`cmd-write-40-persist.test.mjs` 拿它们当测试缝指到 fixture）。填进来之前，
 *  本清单保持为空。退出条件：下一个大版本删掉这张清单。 */
export const CALORIE_CONFIG_RETIRED: readonly string[] = [];

/** 取值形状由默认值表派生（同一件事只有一个定义地）。 */
export type CalorieConfigValues = typeof CALORIE_CONFIG_DEFAULTS;

/** 读回来的一份配置：文件路径（人话报错要指它）＋数据目录＋取值。 */
export interface LoadedCalorieConfig {
  readonly path: string;
  readonly dataDir: string;
  readonly created: boolean;
  readonly values: CalorieConfigValues;
}

/** 每进程按**配置目录**记一份：`ILIFE_CONFIG_DIR` 一变（测试逐用例换临时目录）即现读，
 *  同一目录里不反复读盘（「保存即生效」由 `saveCalorieConfig`／`resetCalorieConfig` 清记忆保证，
 *  不靠长连接；记忆位不绑「进程」而绑「配置目录」是为了不让换目录后的读落到上一份的缓存上）。 */
let memo: { file: string; loaded: LoadedCalorieConfig } | null = null;

/** 读一份配置（文件不存在即按默认值落一份并把配置目录／数据目录建出来）。 */
export function loadCalorieConfig(): LoadedCalorieConfig {
  const file = configPaths(CALORIE_CONFIG_STEM).configFile;
  if (memo === null || memo.file !== file) {
    const loaded = loadConfig(CALORIE_CONFIG_STEM, CALORIE_CONFIG_DEFAULTS, CALORIE_CONFIG_RETIRED);
    // base-link-core 读回来时已经过了「键齐 ＋ 类型对」两道校验（不认识的键、类型不符一律抛），
    // 故这一处从宽松记录到形状记录的转换是有依据的投影，不是猜测。
    memo = {
      file,
      loaded: {
        path: loaded.path,
        dataDir: loaded.dataDir,
        created: loaded.created,
        values: loaded.values as unknown as CalorieConfigValues,
      },
    };
  }
  return memo.loaded;
}

/** 写一份配置（写出去的是完整一份：没给的项按默认值补齐）。写完清记忆，同进程后续读也现取。 */
export function saveCalorieConfig(values: ConfigRecord): { path: string } {
  const r = saveConfig(CALORIE_CONFIG_STEM, CALORIE_CONFIG_DEFAULTS, values, CALORIE_CONFIG_RETIRED);
  memo = null;
  return r;
}

/** 重置为默认（先另存 `<配置目录>/calorie.yaml.bak`）。 */
export function resetCalorieConfig(): { path: string; backupPath: string | null } {
  const r = resetConfig(CALORIE_CONFIG_STEM, CALORIE_CONFIG_DEFAULTS, CALORIE_CONFIG_RETIRED);
  memo = null;
  return r;
}
