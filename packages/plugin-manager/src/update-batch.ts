/** 宿主批量接线（票 1170）：一次登记批量五电话与各目标单电话。 */
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMultiHostUpdate } from 'dsh-plugin-update/batch';
import type { MultiHostUpdate, MultiTargetSpec } from 'dsh-plugin-update/batch';
import { installedVersionOf } from './manager-version.js';
import { VERSION_UNKNOWN } from './update-contract.js';
import { BATCH_PREFIX, MANAGER_TARGET_KEY, UPDATE_TARGETS } from './update-targets.js';

/** 缺席包占位运行版本：读不到已装版时给读取器的占位（沿用旧口径）。 */
export const MISSING_RUNNING_VERSION = '0.0.0' as const;

/** 七目标转批量 targets：prefix 照抄更新目标表，pluginId 沿上游缺省。 */
export function buildBatchTargets(): MultiTargetSpec[] {
  return UPDATE_TARGETS.map((target) => ({
    key: target.key,
    title: target.title,
    packageName: target.packageName,
    prefix: target.phonePrefix,
  }));
}

/** 按包名读运行版本：读不到回占位，不抛。 */
export function runningVersionOf(packageName: string): string {
  const version = installedVersionOf(packageName);
  return version === VERSION_UNKNOWN ? MISSING_RUNNING_VERSION : version;
}

/** 本包落在哪个使用范围：沿旧 resolveProfileDir 同手法（票 1170 薄读数）。 */
export async function resolveProfileDir(): Promise<{ dir: string; name: string }> {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 12; depth += 1) {
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
    try {
      const raw = await readFile(join(directory, 'package.json'), 'utf8');
      const manifest = JSON.parse(raw) as { name?: unknown };
      if (manifest.name === 'dsh-life-pack') {
        const marker = sep + 'node_modules' + sep + 'dsh-life-pack';
        const at = directory.indexOf(marker);
        if (at > 0) {
          const dir = directory.slice(0, at);
          return { dir, name: basename(dir) };
        }
        return { dir: directory, name: basename(directory) };
      }
    } catch {
    }
  }
  const fallback = join(homedir(), '.dsh', 'profiles', 'web');
  return { dir: fallback, name: basename(fallback) };
}

let cached: Promise<MultiHostUpdate> | null = null;

/** 建批量宿主能力（单例）：prefix life，selfKey 排最后，失败继续下一家。 */
export function getBatchHost(ctx: unknown): Promise<MultiHostUpdate> {
  if (cached !== null) return cached;
  cached = buildBatchHost(ctx);
  return cached;
}

async function buildBatchHost(ctx: unknown): Promise<MultiHostUpdate> {
  const profile = await resolveProfileDir();
  const targets = buildBatchTargets();
  const runningByKey = new Map(targets.map((target) => [target.key, runningVersionOf(target.packageName)]));
  const batch = createMultiHostUpdate(
    {
      ctx,
      readerOverridesFor: (spec: MultiTargetSpec) => ({
        runningVersion: runningByKey.get(spec.key) ?? MISSING_RUNNING_VERSION,
        profileDir: profile.dir,
        profileName: profile.name,
      }),
    },
    {
      prefix: BATCH_PREFIX,
      targets,
      selfKey: MANAGER_TARGET_KEY,
      stopOnFailure: false,
    },
  );
  return batch;
}

/** 测试与卸载用：清单例（正常运行不调）。 */
export function resetBatchHostForTests(): void {
  cached = null;
}
