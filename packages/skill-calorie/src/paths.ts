/** T1 #20 · DB 路径解析与隔离守卫（对照老家 db.find_db_path + cwd 哨兵）。
 *
 * #676 起库落点的**唯一真相是配置文件**（`src/config.ts` 的 `values.db`），环境变量读取已按
 * 「配置的存与生效口径裁定」（#675）全部删除：
 *   - 库目录：`values.db.dir` 非空即用它；**空串＝按默认落点**（`loadCalorieConfig().dataDir`，
 *     默认 `~/.ilife/data/`，`ILIFE_CONFIG_DIR` 可整体改基座）；
 *   - 库文件名：`values.db.name`（默认件里恒非空，空串只作兜底回 `DB_FILENAME`）。
 * 与老家的一处有意偏离保留：老家缺 `SKILLS_DB_PATH` 时静默落 `D:/.db`；TS 线改成「配置缺项即按默认
 * 数据目录落」，绝不静默写到真实生产库里那个老路径。
 *
 * 测试隔离守卫（`assertWritablePath`）只留「非 tmp 即抛」一条：`CALORIE_FORCE_PROD` 那个
 * 「设一个变量就放行写任意路径」的 opt-in 已删除，**替代护栏是配置目录这个隔离基座**
 * （`base-link-core` 的 `ILIFE_CONFIG_DIR`：测试跑在 `node --test` 里却没设它就直接响亮报错，
 * 不会落到真实家目录）。守卫自己仍按 tmp 收敛落点，挡住「不小心写到真盘」这类手滑。
 */
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CALORIE_CONFIG_DEFAULTS, loadCalorieConfig } from './config.js';

/** 库文件名：默认值表里的那一项就是唯一定义地（本常量是它的具名引用，不是第二份）。 */
export const DB_FILENAME = CALORIE_CONFIG_DEFAULTS.db.name;

/** 库目录：`values.db.dir` 非空即用它，空串＝配置数据目录（默认 `~/.ilife/data/`）。 */
export function resolveDbDir(): string {
  const cfg = loadCalorieConfig();
  const configured = cfg.values.db.dir;
  return configured !== '' ? configured : cfg.dataDir;
}

/** 库文件名：`values.db.name` 非空即用它，空串＝`DB_FILENAME`。 */
export function resolveDbFileName(): string {
  const name = loadCalorieConfig().values.db.name;
  return name !== '' ? name : DB_FILENAME;
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
        '落点要挪，请改配置文件里的 db.dir（或把 ILIFE_CONFIG_DIR 指到临时目录）。',
    );
  }
}
