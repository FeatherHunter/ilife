// DB 路径解析与隔离守卫：SKILLS_DB_PATH 必设，无默认值（铁律缺失阻断）。
// 老家 db.py _fallback_db_dir（D:/.db）TS 线有意不继承：拒绝隐式写生产。
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const DB_FILENAME = 'biscuit_accountant.db';
export const GOALS_FILENAME = 'goals.json';

export function resolveDbDir(): string {
  const env = process.env.SKILLS_DB_PATH;
  if (!env) {
    throw new Error(
      '[skill-bill] SKILLS_DB_PATH 未设置：拒绝隐式落盘。' +
        '生产请设置 SKILLS_DB_PATH；测试请传显式 tmp 路径。',
    );
  }
  return env;
}

export function resolveDbPath(filename = DB_FILENAME, dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, filename);
}

export function resolveGoalsPath(dir = resolveDbDir()): string {
  mkdirSync(dir, { recursive: true });
  return join(dir, GOALS_FILENAME);
}

/** 测试隔离守卫：非 tmp 路径写库须 BILL_FORCE_PROD=1（卡路里哨兵语义的饼干版）。 */
export function assertWritablePath(dbPath: string): void {
  const forceProd = process.env.BILL_FORCE_PROD === '1';
  const underTmp = resolve(dbPath).startsWith(resolve(tmpdir()));
  if (!underTmp && !forceProd) {
    throw new Error(
      '[skill-bill] 拒绝写入非 tmp 路径 ' + dbPath + '：测试隔离守卫。' +
        '如确需生产写，请设置 BILL_FORCE_PROD=1（opt-in 可见）。',
    );
  }
  if (!underTmp && forceProd) {
    console.error('[skill-bill] BILL_FORCE_PROD=1: 写入 ' + dbPath);
  }
}
