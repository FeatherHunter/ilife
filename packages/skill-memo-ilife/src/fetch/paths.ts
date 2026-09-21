// 库路径解析：**配置文件的唯一真相**（#695；口径见「配置的存与生效口径裁定」#675 的解决评论）。
// 改造前这里是环境变量 `SKILLS_DB_PATH`（预检必设，无默认值）；#695 按用户裁决删掉环境变量读取，
// 路径改从 `~/.ilife/memo.yaml` 取，写库边界改由家目录注入＋生产守卫
// （`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`，要落到真实家目录即抛）承担。
// 连接口径不变：新仓直连老库文件 `<库目录>/memo.db`（SQLite、WAL、外键开），连接层禁 DDL。
//
// **#760 起本件是全部落点算式的唯一定义地**（设置页只读行显示的那一组绝对路径由这里算，
// `src/health.ts` 的体检报告调这里的纯函数，`src/policy/media.ts` 的附件目录调 `mediaDirOf`，
// 三处不许走散；照记账样板 #749 的 `src/fetch/paths.ts`）。
// 算式一律是**纯函数**（只拼路径、不读配置、不碰盘），读配置只在下面几个 `resolve*` 薄壳里发生。
import { isAbsolute, join, resolve } from 'node:path';
import { MEDIA_DIR_NAME, loadMemoConfig } from '../config.js';
import { DEFAULT_HELP_HTML_DIR_NAME } from '../help/manifest.js';

/** 库文件名的默认值：＝改造前的代码常量（配置项 `db.name` 空串即用它）。 */
export const DEFAULT_DB_FILENAME = 'memo.db';

/** 产物子目录名的默认值：与 `src/help/manifest.ts` 的 `DEFAULT_HELP_HTML_DIR_NAME` 同一值。
 *  这里不重写一份——直接引用那一处的常量（同一件事只有一个定义地）。 */
export const DEFAULT_HTML_DIR_NAME = DEFAULT_HELP_HTML_DIR_NAME;

/** 库文件名：配置 `db.name`，空串＝默认（`memo.db`）。 */
export function dbFilename(): string {
  const name = loadMemoConfig().values.db.name;
  return name === '' ? DEFAULT_DB_FILENAME : name;
}

/** 库目录算式：`db.dir` 非空即用它，空串＝默认数据目录。
 *  这是「面板上可改的落点」之一，写盘时那一格写成算出来的绝对路径（见 `src/config.ts`）。 */
export function dbDirOf(dataDir: string, configured: string): string {
  return configured !== '' ? configured : dataDir;
}

/** 库目录：配置 `db.dir` 的解析结果。 */
export function resolveDbDir(): string {
  const cfg = loadMemoConfig();
  return dbDirOf(cfg.dataDir, cfg.values.db.dir);
}

/** 库文件算式（目录 ＋ 文件名）。 */
export function dbFileOf(dbDir: string, name: string): string {
  return join(dbDir, name !== '' ? name : DEFAULT_DB_FILENAME);
}

/** 目录名配置值 → 目录段：值里带分隔符时按段拼（`a/b` 是两层子目录，不是两处落点）。 */
function dirSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((seg) => seg !== '' && seg !== '.');
}

/** 产物目录算式：`<库目录>/<html.dir 值>`（空串＝默认子目录名）——设置页那一行与体检都调它。 */
export function htmlDirOf(dbDir: string, configured: string): string {
  return join(dbDir, ...dirSegments(configured !== '' ? configured : DEFAULT_HTML_DIR_NAME));
}

/** 附件目录算式：空串＝`<数据目录>/media`（#759 定稿的默认）；显式绝对值即用它；
 *  显式相对值按**进程工作目录**解（#712 的现状口径，老写法 `media/x.jpg` 照旧认）。
 *
 * 为什么显式相对值不改按数据目录解：老用户的 `media.dir` 是相对工作目录写的，
 * 改基＝换语义；默认（空串）走数据目录已是新契约，两条在 `mediaDirText` 的人话里各说各的。 */
export function mediaDirOf(dataDir: string, configured: string): string {
  if (configured === '') return join(dataDir, MEDIA_DIR_NAME);
  return isAbsolute(configured) ? configured : resolve(configured);
}

/** 附件目录：配置 `media.dir` 的解析结果（算式见 `mediaDirOf`）。只算路径，
 *  「必须已存在」的判定归 `src/policy/media.ts` 的 `resolveMediaDir()`。 */
export function resolveMediaDirPath(): string {
  const cfg = loadMemoConfig();
  return mediaDirOf(cfg.dataDir, cfg.values.media.dir);
}

/** 库文件路径：`<库目录>/<库文件名>`（**不建目录**——备忘的库由用户／老技能建，本包不建空库）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  return join(dir, filename);
}

/** 一组**解析后的绝对路径**（#760，照 #749 样板的 `resolvedBillPaths`）：
 *  设置页的只读行显示的就是这一组，面板不自己拼路径。`memo.config.read` 回执带上它。 */
export interface MemoResolvedPaths {
  /** 生效数据目录（`db.dir` 非空用它，空＝默认落点）——面板上可改的两项之一的生效值。 */
  readonly dbDir: string;
  /** 库文件绝对路径（`<库目录>/memo.db`，备忘不建库——显示的是"会落在哪"）。 */
  readonly dbFile: string;
  /** HTML 产物目录绝对路径。 */
  readonly htmlDir: string;
  /** 附件目录绝对路径（空串＝`<数据目录>/media`；本技能不替用户建它）。 */
  readonly mediaDir: string;
}

/** 算那一组解析后的绝对路径。**只算路径、不建目录、不写盘**（设置页与体检都能随时调）。 */
export function resolvedMemoPaths(): MemoResolvedPaths {
  const cfg = loadMemoConfig();
  const dbDir = dbDirOf(cfg.dataDir, cfg.values.db.dir);
  return {
    dbDir,
    dbFile: dbFileOf(dbDir, dbFilename()),
    htmlDir: htmlDirOf(dbDir, cfg.values.html.dir),
    mediaDir: mediaDirOf(cfg.dataDir, cfg.values.media.dir),
  };
}
