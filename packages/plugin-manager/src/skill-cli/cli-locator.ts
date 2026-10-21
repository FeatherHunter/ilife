/** 技能出口定位：按包名解析「已装的那一份」，解析不到再回退单仓相对路径。
 *
 * 定位与改版前逐字同路：以**本家 bridge 模块**为解析起点（`spec.moduleUrl`），
 * 走 Node 解析规则找 `<技能包名>/package.json`，再拼包内出口相对路径。
 * 开发单仓（packages/plugin-<名>/dist/bridge.js）与安装态（node_modules/dsh-<名>/dist/bridge.js）
 * 因此走同一条路，读的都是已装的那份，不是构建期抄进代码的字面量。
 */
import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SkillCliErrorCode } from './contract.js';

/** 定位器的输入：只取规格里与定位有关的那几格。 */
export interface CliLocatorSpec {
  readonly skillPackage: string;
  readonly repoRelativeCli: string;
  readonly packageRelativeCli: string;
  readonly moduleUrl: string;
  readonly makeError: (code: SkillCliErrorCode, message: string) => Error;
}

/** 一只定位器：现算出口路径，按需断言存在。 */
export interface CliLocator {
  cliPath(): string;
  assertCliPresent(cli?: string): void;
}

/** 单仓回退根：从本家模块（dist 下的一个文件）向上三级即 packages 目录。 */
function repoRootOf(moduleUrl: string): string {
  return join(dirname(fileURLToPath(moduleUrl)), '..', '..', '..');
}

/** 造一只定位器（纯函数：不缓存解析结果，安装态中途变化也能读到当下那份）。 */
export function createCliLocator(spec: CliLocatorSpec): CliLocator {
  function resolveSkillCli(): string {
    try {
      const pkgJson = createRequire(spec.moduleUrl).resolve(spec.skillPackage + '/package.json');
      return join(dirname(pkgJson), spec.packageRelativeCli);
    } catch {
      return join(repoRootOf(spec.moduleUrl), spec.repoRelativeCli);
    }
  }
  function cliPath(): string {
    return resolveSkillCli();
  }
  function assertCliPresent(cli?: string): void {
    const path = cli ?? cliPath();
    try {
      accessSync(path, constants.R_OK);
    } catch {
      throw spec.makeError('missing-cli', '技能出口缺失（先构建对应包）：' + path);
    }
  }
  return { cliPath, assertCliPresent };
}
