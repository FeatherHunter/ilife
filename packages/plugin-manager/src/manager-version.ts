/** 按**包名**读任意已安装包的版本（票 #918）：六家插件与技能侧的共用处。
 *
 * 读的是**已装的那份**（按 Node 解析规则找到 `<包名>/package.json`，开发单仓与安装态同形），
 * 不是构建期抄进代码里的字面量；只解析 `version` 字段，不读别的、不缓存、不轮询；
 * **永不抛**——解析不到／读不到／解析失败／字段缺失一律回 `VERSION_UNKNOWN` 并 `warn` 留痕（含路径与原因）。
 *
 * 总管**自己**那行版本号不走这里（票 #986）：它由构建期注入面板产物（见 `tsdown.config.ts`
 * 与 `client.ts`），不再经宿主读盘 ＋ RPC 往返——标签的延迟不依赖宿主可用性。
 * #737 定下的目的（手写常量会与包版本无声漂开一整版）由构建门继续守着：
 * 产物里的注入值必须等于包版本。
 *
 * 本文件只许宿主半引用：它 import 了 `node:fs`／`node:path`／`node:url`，
 * 进浏览器束会被 `test/client-bundle-48.test.mjs` 的纯度门拦住。
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { VERSION_UNKNOWN } from './update-contract.js';

interface ReadOutcome {
  readonly version: string | null;
  readonly reason: string;
}

function readOne(path: string): ReadOutcome {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    return { version: null, reason: 'read failed: ' + (error instanceof Error ? error.message : String(error)) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    return { version: null, reason: 'parse failed: ' + (error instanceof Error ? error.message : String(error)) };
  }
  const version = (parsed as { version?: unknown } | null | undefined)?.version;
  if (typeof version !== 'string' || version.trim().length === 0) {
    return { version: null, reason: 'version field missing or empty' };
  }
  return { version: version.trim(), reason: '' };
}

/** warn 不得抛：读数降级不受影响。 */
function warnVersionRead(what: string, reason: string): void {
  try {
    console.warn('[dsh-life-pack] version read failed: ' + what + ' reason=' + reason);
  } catch {
    /* 同上 */
  }
}

/** 按**包名**找那份已装包描述文件的路径：从 `from` 那份模块出发按 Node 解析规则找 `<包名>/package.json`
 *  （六家插件与六个技能包的 `exports` 都留了 `./package.json` 这一条）。
 *
 *  解析不到就抛（`MODULE_NOT_FOUND`）——接住它的是 `installedVersionOf`，调用方不必自己包 try。 */
export function installedPackageJsonPath(packageName: string, from: string = import.meta.url): string {
  return createRequire(from).resolve(packageName + '/package.json');
}

/** 读**任意装机包**的版本（#918：全仓唯一定义，六家与技能侧都走这一处）。
 *
 *  读的是**已装的那份**（不读构建期字面量）、只解析 `version`、
 *  不缓存不轮询、**永不抛**——解析不到／读不到／解析失败／字段缺失一律回 `VERSION_UNKNOWN` 并 warn 留痕。
 *  `from` 只在测试里给（拿哨兵件验「读的是给的那一份」）。 */
export function installedVersionOf(packageName: string, from: string = import.meta.url): string {
  let filePath: string;
  try {
    filePath = installedPackageJsonPath(packageName, from);
  } catch (error) {
    warnVersionRead(packageName, 'resolve failed: ' + (error instanceof Error ? error.message : String(error)));
    return VERSION_UNKNOWN;
  }
  const outcome = readOne(filePath);
  if (outcome.version === null) {
    warnVersionRead(packageName + ' @ ' + filePath, outcome.reason);
    return VERSION_UNKNOWN;
  }
  return outcome.version;
}
