/**
 * 配置件测试基座（#694 / #675 解决评论的「替代护栏」）。
 *
 * 删掉五个写库开关（`*_FORCE_PROD`）之后，「跑测试误写真实数据」的隔离靠两件事：
 *   ① 测试一律把 `ILIFE_CONFIG_DIR` 指到临时目录 —— 技能因此读不到真实配置；
 *   ② **测试基座强制设置它、缺了直接报错** —— 把「忘了配」从静默危险变成响亮失败。
 *
 * 本文件是第 ② 条的落点：`setupConfigTestBase()` 设完当场自证（自证不通过即抛）。
 * 配置件自己另有一道同向的门：跑在 node 测试运行器里却没设 `ILIFE_CONFIG_DIR` 即抛
 * `CONFIG_TEST_ISOLATION_MISSING`（见 `src/config/dirs.ts`），两条一起把口子堵死。
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** 位置覆盖变量的名字（与 `src/config/dirs.ts` 的 `CONFIG_DIR_ENV` 同值）。 */
export const CONFIG_DIR_ENV = 'ILIFE_CONFIG_DIR';

/** 缺了就报错：调用方必须已经拿到一个临时配置目录。 */
export function requireConfigTestBase() {
  const dir = process.env[CONFIG_DIR_ENV];
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new Error('测试基座缺 ' + CONFIG_DIR_ENV
      + '：测试一律指向临时目录，缺了直接报错（#675 替代护栏），不许落到真实家目录');
  }
  return dir;
}

/** 开一个独占临时配置目录并接管 `ILIFE_CONFIG_DIR`；返回目录与清理函数。 */
export function setupConfigTestBase() {
  const dir = mkdtempSync(join(tmpdir(), 'ilife-config-test-'));
  process.env[CONFIG_DIR_ENV] = dir;
  requireConfigTestBase(); // 设完当场自证：读不回来就是基座自己坏了
  return {
    dir,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
