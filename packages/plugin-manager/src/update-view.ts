/** 面板的视图逻辑（纯函数：无 DOM、无 node、无 react），客户端与单测共用同一份。
 *
 * 判定「有没有新版」不自己算版本号大小：更新核心已经在快照里给了结论
 * （`canInstall` 为真即有新版可装，`blockedReason` 非空即为什么装不了，见更新包 README 第 8 节），
 * 本文件只把结论翻成三种状态与一句话，不另起一套版本比较。
 */
import type { CheckReceipt, BlockedReason, UpdateSnapshot } from 'dsh-plugin-update';
import { dualInstallCmd } from './nav.js';
import { reasonText } from './update-contract.js';

/** 一个更新目标的面板数据（宿主 `ilife-manager.targets` 的每行）。 */
export interface TargetInfo {
  readonly key: string;
  readonly title: string;
  readonly packageName: string;
  readonly phones: { readonly status: string; readonly check: string; readonly install: string } | null;
  /** 宿主启动那一刻磁盘上的版本；null = 启动时这个包还没装。 */
  readonly runningVersion: string | null;
  readonly installedVersion: string | null;
  /** 已装产物里有没有爱生活页签槽的注册代码；**宿主没给这一行时为 undefined**（老宿主）。
   * 见 `slotStateOf`：判据缺席不许猜，退回「装了但我们不知道接没接上」那一态。 */
  readonly panelRegistered?: boolean;
  /** 技能包随插件的那条精确 pin（插件包 manifest 里的 `skill-*` 依赖）。 */
  readonly skill: { readonly packageName: string; readonly version: string } | null;
}

/** 更新电话查到的结果（`updateCheck` / `updateStatus` 回包体）。 */
export interface CheckOutcome {
  readonly snapshot: UpdateSnapshot;
  readonly manual: string | null;
  readonly receipt: CheckReceipt | null;
}

/** 缺席：宿主启动时没装、现在磁盘上也没有（`runningVersion`/`installedVersion` 都是 null）。 */
export function isAbsent(target: TargetInfo): boolean {
  return target.runningVersion === null && target.installedVersion === null;
}

/** 缺席卡要说清的四态（前两态给动作，后两态**不给动作**——重装与重启都不会改变那两个状态）。
 *
 * 判据是**两处独立事实**，不许互相顶替：宿主的装机读数（磁盘上有没有、产物里有没有注册代码），
 * 与浏览器侧的页签槽账本（这一家的设置页此刻在不在浏览器里）。前者答「装没装、重装有没有用」，
 * 后者答「接没接上」。用账本代理「装没装」会说假话：真机实测四家已装却显示「未安装」（0.2.5 已修）。
 */
export type SlotState = 'connected' | 'absent' | 'unregistered-product' | 'not-connected';

/** 一家页签此刻的状态：账本里已注册 → `connected`（面板显示它自己的设置页），否则按宿主装机读数分三态。 */
export function slotStateOf(target: TargetInfo | null, inLedger: boolean): SlotState {
  if (inLedger) return 'connected';
  if (target === null || isAbsent(target)) return 'absent';
  if (target.panelRegistered === false) return 'unregistered-product';
  return 'not-connected';
}

export type VerdictKind = 'unknown' | 'up-to-date' | 'update-available' | 'blocked';

/** 这一行给的按钮（票 #740）：装上／装上更新／重试安装／重新检查。
 *  前两个是「做新的事」，后两个是**把卡住的状态推回可做**——拦截态不许没有出路。 */
export type VerdictAction = 'install' | 'update' | 'retry' | 'recheck';

export interface Verdict {
  readonly kind: VerdictKind;
  /** 一句话结论（面板那行正文）：事实 ＋ 后果 ＋ 动作，三段齐全。 */
  readonly text: string;
  readonly action: VerdictAction | null;
}

/** 这一家是不是「装好了、只差重启」——判据是**事实**（磁盘版本 ≠ 正在跑的版本），不是原因码。
 *
 * 为什么不许按原因码判（票 #740 真机）：同一种事实在更新核心里可能报成两种码——
 * `pending-restart`，或者被上一次中断的任务盖成 `recovery-required`。按码判会把「该重启」
 * 漏成一句「装不上」，用户看到的正是那种读不懂的屏。 */
export function restartPendingOf(snapshot: UpdateSnapshot): boolean {
  const installed = snapshot.installedVersion;
  return installed !== null && installed !== snapshot.runningVersion;
}

/** 待重启那一句（三段齐全：事实 → 后果 → 动作）。 */
export function restartLine(snapshot: UpdateSnapshot): string {
  const installed = snapshot.installedVersion ?? snapshot.job?.targetVersion ?? '新版本';
  return '新版 ' + String(installed) + ' 已装到磁盘；正在运行的是 ' + snapshot.runningVersion + '。重启 DSH（退出后重新打开）后生效。';
}

/** 拦截态各自给得出的下一步：面板能代劳的给按钮，代劳不了的给 null（那种走手工命令块）。 */
function actionForBlocked(reason: BlockedReason): VerdictAction | null {
  if (reason === 'installation-changed') return 'recheck';
  if (reason === 'recovery-required') return 'retry';
  return null;
}

/** 装成一家之后，其余各家的读数一律作废（票 #740）：七家共用同一份使用范围清单，
 *  刚那次安装已经改写了它，旧快照再拿去装必然被守卫拦下。这句话就是那条守卫的人话。 */
export function staleVerdict(): Verdict {
  return { kind: 'blocked', text: '刚装过别的插件，共用的安装清单变了。点「重新检查」重新读一次，再操作这一家。', action: 'recheck' };
}

/** 把除 `keepKey` 之外的行全标成过期（票 #740）：装成一家 ⇒ 七家共用的安装清单被改写，
 *  其余各家的旧快照再拿去装必然被守卫拦下。纯函数：状态源与单测共用同一份判据，
 *  不关心行里还有什么（泛型只要求有 `stale` 这一格）。 */
export function markStaleOthers<T extends { readonly stale?: boolean }>(
  rows: Readonly<Record<string, T>>,
  keepKey: string,
): Record<string, T> {
  const next: Record<string, T> = {};
  for (const [key, row] of Object.entries(rows)) next[key] = key === keepKey ? row : { ...row, stale: true };
  return next;
}

/** 把快照翻成一行结论：还没查 / 已是最新 / 有新版 / 待重启 / 装不了（附人话原因与下一步）。 */
export function verdictOf(target: TargetInfo, snapshot: UpdateSnapshot): Verdict {
  const absent = isAbsent(target);
  const latest = snapshot.latestVersion;
  if (absent && latest === null) {
    return { kind: 'unknown', text: '未安装。点「检查更新」查最新版本，再点「装上」。', action: null };
  }
  if (absent) {
    return { kind: 'update-available', text: '未安装；最新版本 ' + String(latest) + '。点「装上」安装。', action: 'install' };
  }
  // ① 装了没重启：先说这件事——它压过一切「装不上」（那时用户该做的只有重启）。
  if (restartPendingOf(snapshot)) {
    return { kind: 'blocked', text: restartLine(snapshot), action: null };
  }
  // ② 有东西可装、却被守卫或环境拦下：说清原因 ＋ 给一个能执行的下一步。
  //    「没东西可装」的那些拦截不在这里说——那时守卫与用户无关，不该在屏上占一行（真机实测：
  //    已经是最新的一家挂着「安装清单变了」＋一条重装命令，纯噪声）。
  const installed = snapshot.installedVersion;
  const hasNewer = latest !== null && latest !== installed;
  if (snapshot.blockedReason !== null && hasNewer) {
    const blocked = snapshot.blockedReason as BlockedReason;
    return { kind: 'blocked', text: reasonText(blocked), action: actionForBlocked(blocked) };
  }
  if (latest === null) {
    return { kind: 'unknown', text: '还没查过最新版本。点「检查更新」。', action: null };
  }
  if (snapshot.canInstall) {
    // 把「正在运行的是哪个版本」写进同一行：用户不必回头去版本行里找。
    return { kind: 'update-available', text: '有新版本 ' + String(latest) + '（正在运行 ' + snapshot.runningVersion + '）。点「装上更新」。', action: 'update' };
  }
  return { kind: 'up-to-date', text: '已是最新版本 ' + String(latest) + '。', action: null };
}

/** 待重启横幅文案（更新包 README 第 10 节：说清新版号与「重启后才生效」两件事）。
 *  判据同 `restartPendingOf`（按事实）；横幅要说清是**哪一家**（七家一起列时不点名等于没说）。 */
export function pendingRestartText(target: TargetInfo, snapshot: UpdateSnapshot): string | null {
  if (!restartPendingOf(snapshot)) return null;
  return '⚠️ ' + target.title + '：' + restartLine(snapshot);
}

/** 面板展示的那条可复制命令（用户会照着敲的那一条）。
 *
 * 缺席包给人人都会用的**单命令双包**口径（#674 冻结的装入口径：不带版本号、不带任何开关）；
 * 已装包给更新包回包里那条（`--save-exact ... --registry=` 是它 README 第 9 节的冻结合同，
 * 本仓不动它——要改只能提上游）。规范词见 docs/plugins/plugin-manager/t678-缺席即装与检查更新.md。 */
export function manualForDisplay(target: TargetInfo, manual: string | null): string | null {
  if (isAbsent(target)) return dualInstallCmd(target.packageName);
  return manual;
}

/** 版本行两行文字：插件包（本家） ＋ 技能包（随插件，不单独查更新）。 */
export function versionLines(target: TargetInfo, snapshot: UpdateSnapshot | null): readonly string[] {
  const running = snapshot?.runningVersion ?? target.runningVersion ?? 'unknown';
  const installed = snapshot?.installedVersion ?? target.installedVersion;
  const lines = [target.packageName + ' ' + running + (installed && installed !== running ? '（磁盘已装 ' + installed + '）' : '')];
  if (target.skill) lines.push(target.skill.packageName + ' ' + target.skill.version + '（随插件，不单独查更新）');
  else lines.push('技能包随插件（不单独查更新）');
  return lines;
}
