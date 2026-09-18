// 库路径解析：**配置文件的唯一真相**（#695；口径见「配置的存与生效口径裁定」#675 的解决评论）。
// 改造前这里是环境变量 `SKILLS_DB_PATH`（预检必设，无默认值）；#695 按用户裁决删掉环境变量读取，
// 路径改从 `~/.ilife/memo.yaml` 取，写库边界改由「测试基座强制 `ILIFE_CONFIG_DIR`」
// （`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`）承担。
// 连接口径不变：新仓直连老库文件 `<库目录>/memo.db`（SQLite、WAL、外键开），连接层禁 DDL。
import { join } from 'node:path';
import { loadMemoConfig } from '../config.js';

/** 库文件名的默认值：＝改造前的代码常量（配置项 `db.name` 空串即用它）。 */
export const DEFAULT_DB_FILENAME = 'memo.db';

/** 库文件名：配置 `db.name`，空串＝默认（`memo.db`）。 */
export function dbFilename(): string {
  const name = loadMemoConfig().values.db.name;
  return name === '' ? DEFAULT_DB_FILENAME : name;
}

/** 库目录：配置 `db.dir`，空串＝数据目录（`~/.ilife/data/`，`ILIFE_CONFIG_DIR` 可整体接管）。 */
export function resolveDbDir(): string {
  const dir = loadMemoConfig().values.db.dir;
  return dir === '' ? loadMemoConfig().dataDir : dir;
}

/** 库文件路径：`<库目录>/<库文件名>`（**不建目录**——备忘的库由用户／老技能建，本包不建空库）。 */
export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  return join(dir, filename);
}
