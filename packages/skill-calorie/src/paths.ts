/** T1 #20 · DB 路径解析与隔离守卫（对照老家 db.find_db_path + cwd 哨兵）。
 *
 * #676 起库落点的**唯一真相是配置文件**（`src/config.ts` 的 `values.db`），环境变量读取已按
 * 「配置的存与生效口径裁定」（#675）全部删除：
 *   - 库目录：`values.db.dir` 非空即用它；**空串＝按默认落点**（`loadCalorieConfig().dataDir`，
 *     默认 `~/.ilife/data/`，只此一处）；
 *   - 库文件名：`values.db.name`（默认件里恒非空，空串只作兜底回 `DB_FILENAME`）。
 * 与老家的一处有意偏离保留：老家缺 `SKILLS_DB_PATH` 时静默落 `D:/.db`；TS 线改成「配置缺项即按默认
 * 数据目录落」，绝不静默写到真实生产库里那个老路径。
 *
 * **#757 起本件是全部数据目录派生落点的纯算式的唯一定义地**（设置页只读行显示的那一组绝对路径由这里算，
 * `src/photo/photos.ts` 的照片目录、`src/xunji/rateLimit.ts` 的状态目录、`src/output.ts` 的产物目录与
 * `src/health.ts` 的体检报告都调这里，三处不许走散；面板不自己拼路径）：
 * 算式一律是**纯函数**（只拼路径、不读配置、不碰盘），读配置只在下面几个 `resolve*` 薄壳里发生。
 *
 * 测试隔离守卫（`assertWritablePath`）只留「非 tmp 即抛」一条：`CALORIE_FORCE_PROD` 那个
 * 「设一个变量就放行写任意路径」的 opt-in 已删除，**替代护栏是配置目录这个隔离基座**
 * （`base-link-core` 的生产守卫：测试跑在 `node --test` 里却要落到真实家目录就直接响亮报错，
 * 不会落到真实家目录）。守卫自己仍按 tmp 收敛落点，挡住「不小心写到真盘」这类手滑。
 */
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from './config.js';

/** 库文件名：默认值表里的那一项就是唯一定义地（本常量是它的具名引用，不是第二份）。 */
export const DB_FILENAME = CALORIE_CONFIG_DEFAULTS.db.name;

/** 产物目录名（`html.dir` 空串时用的默认）：同上，具名引用。 */
export const HTML_DIR_NAME = CALORIE_CONFIG_DEFAULTS.html.dir;

/** 照片目录名：`photos.dir` 空串时落下 `<库目录>/photos` 的那一段（#757：空串＝按默认落点，不再是「未配置」）。 */
export const PHOTOS_DIR_NAME = 'photos' as const;

/** GIF 子目录名：默认值表里那一项就是唯一定义地，本常量是它的具名引用，不是第二份。 */
export const GIFS_DIR_NAME = CALORIE_CONFIG_DEFAULTS.photos.gifs;

/** 训记状态目录名：`xunji.stateDir` 空串时落下 `<库目录>/xunji` 的那一段（#757：不再 `~/.mavis`）。 */
export const XUNJI_STATE_DIR_NAME = 'xunji' as const;

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录（默认 `~/.ilife/data/`）。
 *  这是「面板上可改的落点」之一，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadCalorieConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件名：`values.db.name` 非空即用它，空串＝`DB_FILENAME`。 */
export function resolveDbFileName(): string {
  const name = loadCalorieConfig().values.db.name;
  return name !== '' ? name : DB_FILENAME;
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DB_FILENAME);
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  return join(dbDir, configured !== '' ? configured : HTML_DIR_NAME);
}

/** 照片目录算式：`<库目录>/<photos.dir 值>`（空串＝默认子目录名 `photos`）——#757 起空串不再是「未配置」。
 *  设置页「照片目录」那一行（可改）与体检都调它。 */
export function photosDirOf(dbDir: string, configured: string): string {
  return configured !== '' ? configured : join(dbDir, PHOTOS_DIR_NAME);
}

/** GIF 子目录算式：`<照片目录>/<photos.gifs 值>`（空串＝默认子目录名 `gifs`）。 */
export function gifsDirOf(photosDir: string, configured: string): string {
  return join(photosDir, configured !== '' ? configured : GIFS_DIR_NAME);
}

/** 训记状态目录算式：`<库目录>/<xunji.stateDir 值>`（空串＝默认子目录名 `xunji`，不再 `~/.mavis`）。 */
export function stateDirOf(dbDir: string, configured: string): string {
  return configured !== '' ? configured : join(dbDir, XUNJI_STATE_DIR_NAME);
}

export function resolveDbPath(filename = resolveDbFileName(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

/** 测试隔离守卫：落点不在系统临时目录下即抛（不静默写生产盘）。 */
export function assertWritablePath(dbPath: string): void {
  const underTmp = resolve(dbPath).startsWith(resolve(tmpdir()));
  if (!underTmp) {
    throw new Error(
      `[skill-calorie] 拒绝写入非 tmp 路径 ${dbPath}：测试隔离守卫。` +
        '落点要挪，请改配置文件里的 db.dir（测试把家目录指到临时目录）。',
    );
  }
}
