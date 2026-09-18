// 库路径解析：**配置文件的唯一真相**（#695；口径见「配置的存与生效口径裁定」#675 的解决评论）。
// 改造前这里读 `SKILLS_DB_PATH`（无默认值、缺失即抛），并按 `SCHEDULE_FORCE_PROD=1` 守「非 tmp 不许写库」；
// #695 按用户裁决把两个环境变量**一并删掉**：路径改从 `~/.ilife/schedule.yaml` 取，写库边界改由
// 「测试基座强制 `ILIFE_CONFIG_DIR`」（`base-link-core` 的 `CONFIG_TEST_ISOLATION_MISSING`）承担——
// 把「忘了配」从静默写真实库变成响亮失败。
// 老家 schedule_db.py Q6 fallback 链（D:/.db 等）TS 线仍有意不继承：拒绝隐式写生产。
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadScheduleConfig } from '../config.js';

/** 库文件名的默认值：＝改造前的代码常量 `DB_FILENAME`（配置项 `db.name` 空串即用它）。 */
export const DEFAULT_DB_FILENAME = 'schedule_data.db';

/** 库文件名：配置 `db.name`，空串＝默认（`schedule_data.db`）。 */
export function dbFilename(): string {
  const name = loadScheduleConfig().values.db.name;
  return name === '' ? DEFAULT_DB_FILENAME : name;
}

/** 库目录：配置 `db.dir`，空串＝数据目录（`~/.ilife/data/`，`ILIFE_CONFIG_DIR` 可整体接管）。 */
export function resolveDbDir(): string {
  const dir = loadScheduleConfig().values.db.dir;
  return dir === '' ? loadScheduleConfig().dataDir : dir;
}

export function resolveDbPath(filename = dbFilename(), dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}
