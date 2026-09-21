// 库与产物落点解析：**配置文件的唯一真相**（#695；口径见「配置的存与生效口径裁定」#675 的解决评论）。
// 改造前这里读 `SKILLS_DB_PATH`（无默认值、缺失即抛），并按 `SCHEDULE_FORCE_PROD=1` 守「非 tmp 不许写库」；
// #695 按用户裁决把两个环境变量**一并删掉**：路径改从 `~/.ilife/schedule.yaml` 取，写库边界改由
// 家目录注入＋生产守卫（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`，要落到真实家目录即抛）承担——
// 把「忘了配」从静默写真实库变成响亮失败。
// 老家 schedule_db.py Q6 fallback 链（D:/.db 等）TS 线仍有意不继承：拒绝隐式写生产。
//
// **#764 起本件是全部落点算式的唯一定义地**（#749 样板的同一条：设置页只读行显示的那一组绝对路径由这里算，
// `src/health.ts` 的体检报告调这里，三处不许走散）：算式一律是**纯函数**（只拼路径、不读配置、不碰盘），
// 读配置只在下面几个 `resolve*` 薄壳里发生。
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEDULE_CONFIG_DEFAULTS, loadScheduleConfig } from '../config.js';

/** 库文件名的默认值：＝配置项 `db.name` 的默认值（同一件事只有一个定义地，本常量是它的**具名引用**，不是第二份）。 */
export const DEFAULT_DB_FILENAME = SCHEDULE_CONFIG_DEFAULTS.db.name;

/** 产物目录名的默认值：＝配置项 `html.dir` 的默认值（同上，具名引用；值形状是段串，**不绝对化**——
// 绝对化＝改语义（段串 join 会把盘符当普通段拼进去），且会让「改数据目录」不再带动产物目录，见 #761 定稿第 5 条）。 */
export const DEFAULT_HELP_DIR = SCHEDULE_CONFIG_DEFAULTS.html.dir;

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录（默认 `~/.ilife/data/`）。
 *  这是「面板上唯一可改的落点」，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadScheduleConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件名：配置 `db.name`，空串＝默认（`schedule_data.db`）。 */
export function dbFilename(): string {
  const name = loadScheduleConfig().values.db.name;
  return name !== '' ? name : DEFAULT_DB_FILENAME;
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DEFAULT_DB_FILENAME);
}

/** 目录名配置值 → 目录段：值里带分隔符时按段拼（`a/b` 是两层子目录，不是两处落点；`\` 与 `/` 都认）。 */
function dirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((seg) => seg !== '');
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  return join(dbDir, ...dirSegments(configured !== '' ? configured : DEFAULT_HELP_DIR));
}

/** 产物目录：配置 `html.dir` 的解析结果（算式见 `htmlDirOf`）。只算路径，落盘归交付那条链。 */
export function resolveHtmlDir(dbDir = resolveDbDir()): string {
  return htmlDirOf(dbDir, loadScheduleConfig().values.html.dir);
}

export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return dbFileOf(dir, filename);
}

/** 一组**解析后的绝对路径**（#764，照 #749 样板的 `BillResolvedPaths`：设置页的只读行显示的就是这一组，
// 面板不自己拼路径。作息这一组＝面板那 2 行只读 ＋ 生效数据目录。 */
export interface ScheduleResolvedPaths {
  /** 生效数据目录（`db.dir` 非空用它，空＝默认落点）——面板上唯一可改的那一项的生效值。 */
  readonly dbDir: string;
  /** 库文件绝对路径。 */
  readonly dbFile: string;
  /** HELP 产物目录绝对路径。 */
  readonly htmlDir: string;
}

/** 算那一组解析后的绝对路径。**只算路径、不建目录、不写盘**（设置页与体检都能随时调）。 */
export function resolvedSchedulePaths(): ScheduleResolvedPaths {
  const cfg = loadScheduleConfig();
  const dbDir = resolveDbDir();
  return {
    dbDir,
    dbFile: dbFileOf(dbDir, dbFilename()),
    htmlDir: htmlDirOf(dbDir, cfg.values.html.dir),
  };
}
