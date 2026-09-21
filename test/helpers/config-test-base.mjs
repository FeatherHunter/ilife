/**
 * 配置件测试基座（#694／#675 的「替代护栏」；**#763 换通道**）。
 *
 * 「跑测试误写真实数据」的隔离靠两件事：
 *   ① 测试一律把**家目录**（Windows `USERPROFILE`／POSIX `HOME`）指到临时目录 —— 技能因此读不到真实配置
 *      （配置落在 `<家>/.ilife/<技能>.yaml`；生产侧算落点的那一行一个字不改）；
 *   ② **测试基座强制接管家目录、建完当场自证** —— 把「忘了配」从静默危险变成响亮失败。
 *
 * 本文件是第 ② 条的落点：`setupConfigTestBase()` 建临时家目录 ＋ 接管 ＋ 自证；`requireConfigTestBase()`
 * 回当刻生效的家目录（缺隔离即抛）。生产侧另有一道同向的门：跑在 node 测试运行器里却要落到**真实**
 * 家目录时抛 `CONFIG_TEST_ISOLATION_MISSING`（见 `packages/base-link-core/src/config/dirs.ts`）；
 * 第三道是真实树的逐字节快照门禁（`tooling/check-real-home-untouched.mjs`）——三道一起把口子堵死。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { configDirOf, requireIsolatedHome, useHome } from './home-test-base.mjs';

export { configDirOf, homeEnvOf, requireIsolatedHome, useHome } from './home-test-base.mjs';

/** 缺隔离就报错：调用方必须已经拿到一条临时的家目录。 */
export function requireConfigTestBase() {
  return requireIsolatedHome(homedir());
}

/** 开一条独占临时**家目录**并接管当刻进程；返回家目录与清理函数。
 *
 *  配置目录（`<家>/.ilife/`）**一并建出来**：这是**生产**的首次落点（`loadConfig()` 的
 *  `ensureConfigDirs()` 就建它），用例可以直接往 `<家>/.ilife/<技能>.yaml` 里摆半份坏文件
 *  （B4～B7 那族），不必每个用例自己先建目录。 */
export function setupConfigTestBase() {
  const dir = mkdtempSync(join(tmpdir(), 'ilife-home-test-'));
  mkdirSync(configDirOf(dir), { recursive: true });
  useHome(dir);
  requireConfigTestBase(); // 设完当场自证：读不回来就是基座自己坏了
  return {
    dir,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
