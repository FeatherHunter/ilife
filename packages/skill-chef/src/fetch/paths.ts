// DB 路径解析与隔离守卫：SKILLS_DB_PATH 必设，无默认值（铁律缺失阻断）。
// 老家 db_config._fallback_db_dir（D:/CookHub）TS 线有意不继承：拒绝隐式写生产。
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const DB_FILENAME = 'chef_data.db';

export function resolveDbDir(): string {
  const env = process.env.SKILLS_DB_PATH;
  if (!env) {
    throw new Error(
      '[skill-chef] SKILLS_DB_PATH 未设置：拒绝隐式落盘。' +
        '生产请设置 SKILLS_DB_PATH；测试请传显式 tmp 路径。',
    );
  }
  return env;
}

export function resolveDbPath(filename = DB_FILENAME, dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

/** 测试隔离守卫：非 tmp 路径写库须 CHEF_FORCE_PROD=1（bill 哨兵语义的大厨版）。 */
export function assertWritablePath(dbPath: string): void {
  const forceProd = process.env.CHEF_FORCE_PROD === '1';
  const underTmp = resolve(dbPath).startsWith(resolve(tmpdir()));
  if (!underTmp && !forceProd) {
    throw new Error(
      '[skill-chef] 拒绝写入非 tmp 路径 ' + dbPath + '：测试隔离守卫。' +
        '如确需生产写，请设置 CHEF_FORCE_PROD=1（opt-in 可见）。',
    );
  }
  if (!underTmp && forceProd) {
    console.error('[skill-chef] CHEF_FORCE_PROD=1: 写入 ' + dbPath);
  }
}
