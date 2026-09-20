/** 本机「根」清单（Windows 上就是盘符）——#744 的目录浏览器要一行点得到的「换盘」入口。
 *
 * 为什么住在宿主半：浏览器里没有卷清单接口，而宿主那条目录选择接缝只有 `list`／`createDirectory`
 * 两格——「这台机器上有哪些盘」只能由宿主去问操作系统。本件把这件事收成**一次系统调用**：
 * 超时即空、结果缓存一会儿、任何失败都不抛；界面据此只是不画那一行，绝不卡住对话框。
 *
 * 只读**元数据**（`DriveInfo` 的名字与类型）：`IsReady`／卷标那类字段会真去碰设备，掉线的
 * 映射网络盘可能把整次调用拖住——本件宁可少显示一格卷标，也不让打开对话框这件事变慢。
 */

import { execFile } from 'node:child_process';
import type { RootKind, RootRow } from './directory-browser-contract.js';

/** 一次系统调用的时限：超了当「问不出来」（回空清单，不是错误）。 */
const TIMEOUT_MS = 3_000;
/** 缓存时长：开一次图会问一句，盘符却几乎不变。 */
const CACHE_MS = 60_000;

/** `DriveInfo.DriveType` → 本件的闭集；不认识的类型一律 `other`。键都是小写（比对时先折小写）。 */
const KIND_BY_TYPE: Record<string, RootKind> = {
  fixed: 'fixed',
  network: 'network',
  removable: 'removable',
  cdrom: 'optical',
  ram: 'other',
  unknown: 'other',
};

/** 取数要用的两个外界（平台与「怎么跑一条命令」），可注入以便单测。 */
export interface RootsDeps {
  readonly platform: string;
  readonly run: (command: string) => Promise<string>;
  readonly now: () => number;
}

/** 那一行 PowerShell：每个盘一行 `<名字>|<类型>`。
 *
 * 先钉住输出编码：中文环境的控制台默认按 GBK 编码输出，被重定向进管道后按 UTF-8 解会成乱码。 */
function driveCommand(): string {
  return '[Console]::OutputEncoding=[Text.Encoding]::UTF8;'
    + ' [System.IO.DriveInfo]::GetDrives() | ForEach-Object { $_.Name + "|" + $_.DriveType }';
}

/** 解析那一行的输出（纯函数）：认不出的行跳过，重复的盘符只留第一次，**绝不抛**。 */
export function parseDriveRows(stdout: string): readonly RootRow[] {
  const rows: RootRow[] = [];
  const seen = new Set<string>();
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z]):[\\/]?\s*\|\s*([A-Za-z]+)\s*$/.exec(line);
    if (match === null) continue;
    const path = match[1].toUpperCase() + ':\\';
    if (seen.has(path)) continue;
    seen.add(path);
    rows.push({ path, kind: KIND_BY_TYPE[match[2].toLowerCase()] ?? 'other' });
  }
  return rows;
}

/** 真跑一次 PowerShell（Windows 专用：调用方先按平台判过）。
 *
 * 用 `execFile` 直起 exe，不经 shell：命令里没有需要 shell 解释的东西，也就没有转义面。
 * 超期由 `timeout` 杀掉子进程并回错——本件把它当「问不出来」。 */
function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      { timeout: TIMEOUT_MS, windowsHide: true, encoding: 'utf8', maxBuffer: 1 << 20 },
      (error, stdout) => {
        if (error === null) resolve(stdout);
        else reject(error);
      },
    );
  });
}

const defaultDeps: RootsDeps = {
  platform: process.platform,
  run: runPowerShell,
  now: () => Date.now(),
};

let cached: { readonly at: number; readonly rows: readonly RootRow[] } | null = null;

/** 丢掉缓存（用例用；真机上也给将来「刚插上移动硬盘想立刻重读」留一条路）。 */
export function clearRootsCache(): void {
  cached = null;
}

/** 取本机根清单：**永不抛**。
 *
 * 非 Windows 回空清单：那边的根就是 `/`，面包屑最左那一格已经是它，没有「上面还有一层」可画。
 * Windows 上问一次系统，超时／失败／输出认不出都是空清单——行为退回「没有这一行」。 */
export async function listRoots(deps: RootsDeps = defaultDeps): Promise<readonly RootRow[]> {
  if (deps.platform !== 'win32') return [];
  if (cached !== null && deps.now() - cached.at < CACHE_MS) return cached.rows;
  let rows: readonly RootRow[] = [];
  try {
    rows = parseDriveRows(await deps.run(driveCommand()));
  } catch {
    rows = [];
  }
  cached = { at: deps.now(), rows };
  return rows;
}

/** 一通电话的回包（与 `ManagerReply` 同形）：**恒成功**——「列不出来」是空清单，
 * 不是错误码（面板据此只是不画那一行，不该弹一条失败）。 */
export function rootsReply(deps: RootsDeps = defaultDeps): Promise<{ readonly ok: true; readonly value: { readonly roots: readonly RootRow[] } }> {
  return listRoots(deps).then((roots) => ({ ok: true as const, value: { roots } }));
}
