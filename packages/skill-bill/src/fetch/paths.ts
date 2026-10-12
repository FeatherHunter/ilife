/** T1 #20 · 库、第二份库、产物目录与备份的**落点解析**（对照老家 db.find_db_path ＋ cwd 哨兵）。
 *
 * #726 起落点的唯一真相是配置文件（`src/config.ts` 的 `BILL_CONFIG_DEFAULTS` ＋ `loadBillConfig()`），
 * 环境变量读取已按「配置的存与生效口径裁定」（#675）全部删除：
 *   - 库目录：`db.dir` 非空即用它；**空串＝按默认落点**（`loadBillConfig().dataDir`，默认 `~/.ilife/data/`，
 *     配置目录只此一处，覆盖口子已随 #754 删除）；
 *   - 库文件名：`db.name`（默认 `biscuit_accountant.db`）；第二份库：`db.goals`（默认 `goals.json`）；
 *   - 产物目录：`join(库目录, html.dir)`（默认子目录名 `biscuit_accountant_html`）；
 *   - 备份目录：`backup.dir` 绝对即用它，相对按 `<库目录>/<值>` 解，空串＝`<库目录>/backups`（#749）；
 *     备份文件名：`<backup.stem><时间戳>.db`（前缀默认 `biscuit_`）。
 * 与老家的一处有意偏离保留：老家缺 `SKILLS_DB_PATH` 时静默落 `D:/.db`；TS 线改成「配置缺项即按默认落点落」，
 * 绝不静默写到真实生产库里那个老路径。
 *
 * **写库开关已退役（#726）**：`BILL_FORCE_PROD=1` 那个「往非临时目录写库须先被显式打开」的显式打开开关随 #675 的
 * 「环境变量全部删掉」一并删除，口径从「不安全就不写」改成**照写**——落点由配置文件唯一决定，
 * 生产往自己配的目录写库是正常路径，不再是需要 opt-in 的例外。替代护栏是**测试隔离基座**
 * （跑在测试运行器里却要落到真实家目录即抛 `CONFIG_TEST_ISOLATION_MISSING`，见 `base-link-core/src/config/dirs.ts`）。
 *
 * **#749 起本件是全部落点算式的唯一定义地**（设置页只读行显示的那一组绝对路径由这里算，
 * `src/health.ts` 的体检报告与 `src/help/helpPaths.ts` 的产物目录名都调这里，三处不许走散）：
 * 算式一律是**纯函数**（只拼路径、不读配置、不碰盘），读配置只在下面几个 `resolve*` 薄壳里发生。
 */
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { BILL_CONFIG_DEFAULTS, loadBillConfig } from '../config.js';

/** 库文件名（老常量）：默认值表里那一项就是唯一定义地，本常量是它的**具名引用**，不是第二份。 */
export const DB_FILENAME = BILL_CONFIG_DEFAULTS.db.name;

/** 第二份库（`goals.json`）文件名：同上，具名引用。 */
export const GOALS_FILENAME = BILL_CONFIG_DEFAULTS.db.goals;

/** 备份目录名：`backup.dir` 空串时落下 `<库目录>/backups` 的那一段。 */
export const BACKUP_DIR_NAME = 'backups' as const;

/** 产物目录名（`html.dir` 空串时用的默认）：同上，具名引用。 */
export const HTML_DIR_NAME = BILL_CONFIG_DEFAULTS.html.dir;

/** 备份文件名示例里的时间戳占位：只给设置页看「名字长什么样」，不是真时间戳格式（格式见 `backupFileName`）。 */
export const BACKUP_STAMP_PLACEHOLDER = '<时间戳>' as const;

/** 库文件名：配置 `db.name` 非空即用它，空串＝`DB_FILENAME`。 */
export function dbFilename(): string {
  const name = loadBillConfig().values.db.name;
  return name !== '' ? name : DB_FILENAME;
}

/** 第二份库文件名：配置 `db.goals` 非空即用它，空串＝`GOALS_FILENAME`。 */
export function goalsFilename(): string {
  const name = loadBillConfig().values.db.goals;
  return name !== '' ? name : GOALS_FILENAME;
}

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录（默认 `~/.ilife/data/`）。
 *  这是「面板上唯一可改的落点」，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadBillConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DB_FILENAME);
}

/** 第二份库算式（与库同目录）。 */
export function goalsFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : GOALS_FILENAME);
}

/** 目录名配置值 → 目录段：值里带分隔符时按段拼（`a/b` 是两层子目录，不是两处落点）。 */
function dirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((seg) => seg !== '' && seg !== '.');
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  return join(dbDir, ...dirSegments(configured !== '' ? configured : HTML_DIR_NAME));
}

/** 备份目录算式：值绝对 ⇒ 用它；相对 ⇒ `<库目录>/<值>`；空串 ⇒ `<库目录>/backups`（#749 定稿口径）。
 *
 * 为什么相对值不再按**当刻工作目录**解（#747 定稿那一行的算式，2026-09-20 补注改掉）：技能是被宿主
 * spawn 的、宿主不传 `cwd`，相对值于是跟着「宿主从哪儿启动」变；同一个相对值换个启动位置就是另一个目录。
 * 与居家管家同名键同一条规则（出处 #793）。 */
export function backupDirOf(dbDir: string, configured: string): string {
  if (configured === '') return join(dbDir, BACKUP_DIR_NAME);
  return isAbsolute(configured) ? configured : join(dbDir, configured);
}

/** 库文件完整路径（目录不存在即建，`mkdir -p` 语义）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return dbFileOf(dir, filename);
}

/** 第二份库完整路径（与库同目录，建目录语义同 `resolveDbPath`）。 */
export function resolveGoalsPath(dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return goalsFileOf(dir, goalsFilename());
}

/** 备份目录：配置 `backup.dir` 的解析结果（算式见 `backupDirOf`）。
 *  「不自动建」是体检那条判据的口径——本函数只算路径，建目录归调用方。 */
export function resolveBackupDir(dbDir = resolveDbDir()): string {
  return backupDirOf(dbDir, loadBillConfig().values.backup.dir);
}

/** 产物目录：配置 `html.dir` 的解析结果（算式见 `htmlDirOf`）。只算路径，落盘归交付那条链。 */
export function resolveHtmlDir(dbDir = resolveDbDir()): string {
  return htmlDirOf(dbDir, loadBillConfig().values.html.dir);
}

/** 备份文件名主体：配置 `backup.stem` 非空即用它，空串＝默认值表那一项。 */
export function backupStem(): string {
  const stem = loadBillConfig().values.backup.stem;
  return stem !== '' ? stem : BILL_CONFIG_DEFAULTS.backup.stem;
}

/** 备份文件名：`<backup.stem><stamp>.db`（主体默认 `biscuit_` ⇒ 与老口径 `biscuit_<stamp>.db` 逐字相同）。 */
export function backupFileName(stamp: string): string {
  return backupStem() + stamp + '.db';
}

/** 一组**解析后的绝对路径**（#749 样板）：设置页的只读行显示的就是这一组，面板不自己拼路径
 *  （#677 冻结的边界）。六家的 `*.config.read` 回执都扩这样一组，每家的格子按自家落点项来；
 *  记账这一组＝面板那 5 行只读 ＋ 生效数据目录。 */
export interface BillResolvedPaths {
  /** 生效数据目录（`db.dir` 非空用它，空＝默认落点）——面板上唯一可改的那一项的生效值。 */
  readonly dbDir: string;
  /** 库文件绝对路径。 */
  readonly dbFile: string;
  /** 第二份库（预算／账户）绝对路径。 */
  readonly goalsFile: string;
  /** HELP 产物目录绝对路径。 */
  readonly htmlDir: string;
  /** 备份目录绝对路径。 */
  readonly backupDir: string;
  /** 备份文件名示例：`<备份目录>/<前缀><时间戳>.db`（占位符逐字，给用户看名字形状）。 */
  readonly backupSample: string;
}

/** 算那一组解析后的绝对路径。**只算路径、不建目录、不写盘**（设置页与体检都能随时调）。 */
export function resolvedBillPaths(): BillResolvedPaths {
  const cfg = loadBillConfig();
  const dbDir = resolveDbDir();
  const backupDir = backupDirOf(dbDir, cfg.values.backup.dir);
  return {
    dbDir,
    dbFile: dbFileOf(dbDir, dbFilename()),
    goalsFile: goalsFileOf(dbDir, goalsFilename()),
    htmlDir: htmlDirOf(dbDir, cfg.values.html.dir),
    backupDir,
    backupSample: join(backupDir, backupStem() + BACKUP_STAMP_PLACEHOLDER + '.db'),
  };
}
