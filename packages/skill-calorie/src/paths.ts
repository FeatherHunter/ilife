/** T1 #20 · DB 路径解析与隔离守卫（对照老家 db.find_db_path + cwd 哨兵）。
 *
 * 与老家的一处有意偏离：老家缺 SKILLS_DB_PATH 时静默落 D:/.db；TS 线按铁律
 * 「缺失阻断不返空」直接抛错，拒绝隐式写生产。测试一律传显式 tmp 路径。
 */
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const DB_FILENAME = 'calorie_data.db';

export function resolveDbDir(): string {
  const env = process.env.SKILLS_DB_PATH;
  if (!env) {
    throw new Error(
      '[skill-calorie] SKILLS_DB_PATH 未设置：拒绝隐式落盘。' +
        '生产请设置 SKILLS_DB_PATH；测试请传显式 tmp 路径。',
    );
  }
  return env;
}

export function resolveDbPath(filename = DB_FILENAME, dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

/** 测试隔离守卫：非 tmp 路径写库须 CALORIE_FORCE_PROD=1（老家哨兵语义的 TS 版）。 */
export function assertWritablePath(dbPath: string): void {
  const forceProd = process.env.CALORIE_FORCE_PROD === '1';
  const underTmp = resolve(dbPath).startsWith(resolve(tmpdir()));
  if (!underTmp && !forceProd) {
    throw new Error(
      `[skill-calorie] 拒绝写入非 tmp 路径 ${dbPath}：测试隔离守卫。` +
        '如确需生产写，请设置 CALORIE_FORCE_PROD=1（opt-in 可见）。',
    );
  }
  if (!underTmp && forceProd) {
    console.error(`[skill-calorie] CALORIE_FORCE_PROD=1: 写入 ${dbPath}`);
  }
}
