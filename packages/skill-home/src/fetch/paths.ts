// 库、产物目录、主密钥文件与备份的**落点解析**：配置文件的唯一真相（#695；口径见「配置的存与生效口径裁定」#675）。
// 改造前这里读 `SKILLS_DB_PATH`（无默认值、缺失即抛），并按 `HOME_FORCE_PROD=1` 守「非 tmp 不许写库」；
// #695 按用户裁决把两个环境变量**一并删掉**：路径改从 `~/.ilife/home.yaml` 取，写库边界改由
// 家目录注入＋生产守卫（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`，要落到真实家目录即抛）承担——
// 把「忘了配」从静默写真实库变成响亮失败。
// 老家 home_manager/db.py Q6 fallback 链（D:/.db 等）TS 线仍有意不继承：拒绝隐式写生产。
//
// **#794 起本件是全部落点算式的唯一定义地**（设置页只读行显示的那一组绝对路径由这里算，
// `src/health.ts` 的体检报告与 `src/help/manifest.ts` 的产物目录名都调这里，各处不许走散；
// 照记账 #749 样板）：算式一律是**纯函数**（只拼路径、不读配置、不碰盘），读配置只在下面几个
// `resolve*` 薄壳里发生。
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { HOME_CONFIG_DEFAULTS, loadHomeConfig } from '../config.js';

/** 库文件名的默认值：＝改造前的代码常量 `DB_FILENAME`（配置项 `db.name` 空串即用它）。 */
export const DEFAULT_DB_FILENAME = 'home.db';

/** 备份目录名的默认值：＝改造前的代码常量 `BACKUP_DIR_NAME`（配置项 `backup.dir` 空串即用它）。 */
export const DEFAULT_BACKUP_DIR_NAME = 'backups';

/** 主密钥文件名的默认值：新键 `key.file` 空串即用它（#793 定稿）。 */
export const DEFAULT_MASTER_KEY_FILENAME = '.master.key';

/** 库文件名：配置 `db.name`，空串＝默认（`home.db`）。 */
export function dbFilename(): string {
  const name = loadHomeConfig().values.db.name;
  return name === '' ? DEFAULT_DB_FILENAME : name;
}

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录（默认 `~/.ilife/data/`）。
 *  这是「面板上唯一可改的落点」，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadHomeConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DEFAULT_DB_FILENAME);
}

/** 库文件完整路径（目录不存在即建，`mkdir -p` 语义）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return dbFileOf(dir, filename);
}

/** 目录名配置值 → 目录段：值里带分隔符时按段拼（`a/b` 是两层子目录，不是两处落点）；
 *  空段丢弃——Windows 用户手写路径时两种分隔符都会用。 */
function dirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((seg) => seg !== '' && seg !== '.');
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  const name = configured !== '' ? configured : HOME_CONFIG_DEFAULTS.html.dir;
  return join(dbDir, ...dirSegments(name));
}

/** 产物目录：配置 `html.dir` 的解析结果（算式见 `htmlDirOf`）。只算路径，落盘归交付那条链。 */
export function resolveHtmlDir(dbDir = resolveDbDir()): string {
  return htmlDirOf(dbDir, loadHomeConfig().values.html.dir);
}

/** 主密钥文件算式：值绝对 ⇒ 用它；相对 ⇒ `<数据目录>/<值>`；空串 ⇒ `<数据目录>/.master.key`
 *  （#793 定稿：与 `backup.dir` 同一条「绝对优先」规则）。文件名与绝对路径两种取值都要能解。 */
export function keyFileOf(dataDir: string, configured: string): string {
  if (configured === '') return join(dataDir, DEFAULT_MASTER_KEY_FILENAME);
  return isAbsolute(configured) ? configured : join(dataDir, configured);
}

/** 主密钥文件：配置 `key.file` 的解析结果（算式见 `keyFileOf`）。只算路径，不建文件、
 *  不生成口令——密钥是人的口令，文件不在时报错＋人话指引（见 `src/fetch/masterKey.ts`）。 */
export function resolveKeyFile(dataDir?: string): string {
  const cfg = loadHomeConfig();
  return keyFileOf(dataDir ?? cfg.dataDir, cfg.values.key.file);
}

/** 备份目录算式：值绝对 ⇒ 用它；相对 ⇒ `<库目录>/<值>`；空串 ⇒ `<库目录>/backups`
 *  （#793 定稿口径，与记账同名键统一——相对值不再按当刻工作目录解：技能是被宿主 spawn 的，
 *  宿主不传 `cwd`，相对值于是跟着「宿主从哪儿启动」变）。
 *
 * 为什么相对值不再按**当刻工作目录**解：同一个相对值换个启动位置就是另一个目录，
 * 而面板只读显示的是技能回执算出来的绝对路径，两边会走散。 */
export function backupDirOf(dbDir: string, configured: string): string {
  if (configured === '') return join(dbDir, DEFAULT_BACKUP_DIR_NAME);
  return isAbsolute(configured) ? configured : join(dbDir, configured);
}

/** 备份目录：配置 `backup.dir` 的解析结果（算式见 `backupDirOf`）。
 *  「不自动建」是体检那条判据的口径——本函数只算路径，建目录归调用方。 */
export function resolveBackupDir(dbDir = resolveDbDir()): string {
  return backupDirOf(dbDir, loadHomeConfig().values.backup.dir);
}

/** 一组**解析后的绝对路径**（#794，照记账 #749 样板）：设置页的只读行显示的就是这一组，
 *  面板不自己拼路径（#677 冻结的边界）。六家的 `*.config.read` 回执都扩这样一组，
 *  每家的格子按自家落点项来；居家这一组＝面板那 4 行只读 ＋ 生效数据目录。 */
export interface HomeResolvedPaths {
  /** 生效数据目录（`db.dir` 非空用它，空＝默认落点）——面板上唯一可改的那一项的生效值。 */
  readonly dbDir: string;
  /** 库文件绝对路径。 */
  readonly dbFile: string;
  /** HTML 产物目录绝对路径。 */
  readonly htmlDir: string;
  /** 备份目录绝对路径。 */
  readonly backupDir: string;
  /** 主密钥文件绝对路径。 */
  readonly keyFile: string;
}

/** 算那一组解析后的绝对路径。**只算路径、不建目录、不写盘**（设置页与体检都能随时调）。 */
export function resolvedHomePaths(): HomeResolvedPaths {
  const cfg = loadHomeConfig();
  const dbDir = dbDirOf(cfg.dataDir, cfg.values.db.dir);
  return {
    dbDir,
    dbFile: dbFileOf(dbDir, cfg.values.db.name),
    htmlDir: htmlDirOf(dbDir, cfg.values.html.dir),
    backupDir: backupDirOf(dbDir, cfg.values.backup.dir),
    keyFile: keyFileOf(cfg.dataDir, cfg.values.key.file),
  };
}
