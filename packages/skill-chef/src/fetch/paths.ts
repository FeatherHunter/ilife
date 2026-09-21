// 库路径解析：**配置文件的唯一真相**（#695；口径见「配置的存与生效口径裁定」#675 的解决评论）。
// 改造前这里读 `SKILLS_DB_PATH`（无默认值、缺失即抛），并按 `CHEF_FORCE_PROD=1` 守「非 tmp 不许写库」；
// #695 按用户裁决把两个环境变量**一并删掉**：路径改从 `~/.ilife/chef.yaml` 取，写库边界改由
// 家目录注入＋生产守卫（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`，要落到真实家目录即抛）承担——
// 把「忘了配」从静默写真实库变成响亮失败。
// 老家 db_config._fallback_db_dir（D:/CookHub）TS 线仍有意不继承：拒绝隐式写生产。
//
// **#796 起本件是全部落点算式的唯一定义地**（设置页只读行显示的那一组绝对路径由这里算，
// `src/health.ts` 的体检报告与 `src/help/manifest.ts` 的产物段值都调这里，三处不许走散）：
// 算式一律是**纯函数**（只拼路径、不读配置、不碰盘），读配置只在下面几个 `resolve*` 薄壳里发生。
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { CHEF_CONFIG_DEFAULTS, loadChefConfig } from '../config.js';

/** 库文件名（老常量）：默认值表里那一项就是唯一定义地，本常量是它的**具名引用**，不是第二份。 */
export const DEFAULT_DB_FILENAME = CHEF_CONFIG_DEFAULTS.db.name;

/** 产物目录名（`html.dir` 空串时用的默认）：同上，具名引用。 */
export const DEFAULT_HTML_DIR = CHEF_CONFIG_DEFAULTS.html.dir;

/** 场景产物根名（`html.sceneDir` 空串时用的默认）：同上，具名引用（#766 新增，#796 起面板第 4 只读行显示它）。 */
export const DEFAULT_SCENE_DIR = CHEF_CONFIG_DEFAULTS.html.sceneDir;

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录（默认 `~/.ilife/data/`）。
 *  这是「面板上唯一可改的落点」，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DEFAULT_DB_FILENAME);
}

/** 目录名配置值 → 目录段：值里带分隔符时按段拼（`cook_html/help` 是两层子目录，不是两处落点）。
 *  **不绝对化**：段串保持相对拼在库目录下（#795 定稿）。 */
function dirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((seg) => seg !== '' && seg !== '.');
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  return join(dbDir, ...dirSegments(configured !== '' ? configured : DEFAULT_HTML_DIR));
}

/** 场景产物根算式：`<库目录>/<html.sceneDir 值>`（空串＝默认根名）——面板第 4 只读行显示它。
 *  与 `htmlDirOf` 同形（#795 定稿：两行是父子目录，值不动，只把标题分开）。 */
export function sceneDirOf(dbDir: string, configured: string): string {
  return join(dbDir, ...dirSegments(configured !== '' ? configured : DEFAULT_SCENE_DIR));
}

/** 库文件名：配置 `db.name`，空串＝默认（`chef_data.db`）。 */
export function dbFilename(): string {
  const name = loadChefConfig().values.db.name;
  return name === '' ? DEFAULT_DB_FILENAME : name;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadChefConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件完整路径（目录不存在即建，`mkdir -p` 语义）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return dbFileOf(dir, filename);
}

/** 产物目录：配置 `html.dir` 的解析结果（算式见 `htmlDirOf`）。只算路径，落盘归交付那条链。 */
export function resolveHtmlDir(dbDir = resolveDbDir()): string {
  return htmlDirOf(dbDir, loadChefConfig().values.html.dir);
}

/** 场景产物根：配置 `html.sceneDir` 的解析结果（算式见 `sceneDirOf`）。只算路径。 */
export function resolveSceneDir(dbDir = resolveDbDir()): string {
  return sceneDirOf(dbDir, loadChefConfig().values.html.sceneDir);
}

/** 一组**解析后的绝对路径**（#796，照 #749 样板）：设置页的只读行显示的就是这一组，面板不自己拼路径
 *  （#677 冻结的边界）。六家的 `*.config.read` 回执都扩这样一组，每家的格子按自家落点项来；
 *  大厨这一组＝面板那 3 行只读 ＋ 生效数据目录（#766 落点后加 `sceneDir` 第 4 格，见 #796 遗留出口）。 */
export interface ChefResolvedPaths {
  /** 生效数据目录（`db.dir` 非空用它，空＝默认落点）——面板上唯一可改的那一项的生效值。 */
  readonly dbDir: string;
  /** 库文件绝对路径。 */
  readonly dbFile: string;
  /** HELP 产物目录绝对路径。 */
  readonly htmlDir: string;
  /** 场景产物根绝对路径（`html.dir` 的父级，标题与 HELP 产物目录区分开）。 */
  readonly sceneDir: string;
}

/** 算那一组解析后的绝对路径。**只算路径、不建目录、不写盘**（设置页与体检都能随时调）。 */
export function resolvedChefPaths(): ChefResolvedPaths {
  const cfg = loadChefConfig();
  const dbDir = resolveDbDir();
  return {
    dbDir,
    dbFile: dbFileOf(dbDir, dbFilename()),
    htmlDir: htmlDirOf(dbDir, cfg.values.html.dir),
    sceneDir: sceneDirOf(dbDir, cfg.values.html.sceneDir),
  };
}
