/** T1 #20 · 库、第二份库与备份的**落点解析**（对照老家 db.find_db_path ＋ cwd 哨兵）。
 *
 * #726 起落点的唯一真相是配置文件（`src/config.ts` 的 `BILL_CONFIG_DEFAULTS` ＋ `loadBillConfig()`），
 * 环境变量读取已按「配置的存与生效口径裁定」（#675）全部删除：
 *   - 库目录：`db.dir` 非空即用它；**空串＝按默认落点**（`loadBillConfig().dataDir`，默认 `~/.ilife/data/`，
 *     `ILIFE_CONFIG_DIR` 可整体改基座）；
 *   - 库文件名：`db.name`（默认 `biscuit_accountant.db`）；第二份库：`db.goals`（默认 `goals.json`）；
 *   - 备份目录：`backup.dir` 非空即按它解（相对当刻工作目录），空串＝**库目录下的 `backups`**；
 *     备份文件名主体：`backup.stem`（默认 `biscuit_`）。
 * 与老家的一处有意偏离保留：老家缺 `SKILLS_DB_PATH` 时静默落 `D:/.db`；TS 线改成「配置缺项即按默认落点落」，
 * 绝不静默写到真实生产库里那个老路径。
 *
 * **写库开关已退役（#726）**：`BILL_FORCE_PROD=1` 那个「往非临时目录写库须先被显式打开」的哨兵随 #675 的
 * 「环境变量全部删掉」一并删除，口径从「不安全就不写」改成**照写**——落点由配置文件唯一决定，
 * 生产往自己配的目录写库是正常路径，不再是需要 opt-in 的例外。替代护栏是**测试隔离基座**
 * （`base-link-core` 的 `ILIFE_CONFIG_DIR`：跑在 `node --test` 里却没设它即抛 `CONFIG_TEST_ISOLATION_MISSING`），
 * 把「忘了配」从静默写真实库变成响亮失败。处置与 #695 四家同形（那四家删掉的是同一族的哨兵）。
 *
 * 落点算式与 `src/health.ts` 的体检报告**同源**（体检报的就是这几个落点，两处不许走散）：
 * 数据目录 `:361`／库文件 `:381`／第二份库 `:443`／产物目录 `:418`／备份目录 `:469`。
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BILL_CONFIG_DEFAULTS, loadBillConfig } from '../config.js';

/** 库文件名（老常量）：默认值表里那一项就是唯一定义地，本常量是它的**具名引用**，不是第二份。 */
export const DB_FILENAME = BILL_CONFIG_DEFAULTS.db.name;

/** 第二份库（`goals.json`）文件名：同上，具名引用。 */
export const GOALS_FILENAME = BILL_CONFIG_DEFAULTS.db.goals;

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

/** 库目录：配置 `db.dir` 非空即用它，空串＝配置数据目录（默认 `~/.ilife/data/`）。 */
export function resolveDbDir(): string {
  const cfg = loadBillConfig();
  const configured = cfg.values.db.dir;
  return configured !== '' ? configured : cfg.dataDir;
}

/** 库文件完整路径（目录不存在即建，`mkdir -p` 语义）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

/** 第二份库完整路径（与库同目录，建目录语义同 `resolveDbPath`）。 */
export function resolveGoalsPath(dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, goalsFilename());
}

/** 备份目录：配置 `backup.dir` 非空即按它解（`resolve()`，相对当刻工作目录），空串＝库目录下的 `backups`。
 *  「不自动建」是体检那条判据的口径（`health.ts:467`）——本函数只算路径，建目录归调用方。 */
export function resolveBackupDir(dbDir = resolveDbDir()): string {
  const configured = loadBillConfig().values.backup.dir;
  return configured !== '' ? resolve(configured) : join(dbDir, 'backups');
}

/** 备份文件名：`<backup.stem><stamp>.db`（主体默认 `biscuit_` ⇒ 与老口径 `biscuit_<stamp>.db` 逐字相同）。 */
export function backupFileName(stamp: string): string {
  const stem = loadBillConfig().values.backup.stem;
  return (stem !== '' ? stem : BILL_CONFIG_DEFAULTS.backup.stem) + stamp + '.db';
}
