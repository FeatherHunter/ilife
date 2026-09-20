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
  /** 这句话是否指着「下面这条命令」：指着就必须真把命令块摊出来（票 #740 第三轮）。
   *  没有这一格时出现过失配：`recovery-required` 那句写着「就用下面这条命令重装」，
   *  而命令块只在「拦截态且没按钮」时才画，那句下面什么都没有。 */
  readonly manualHint?: boolean;
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

/** 待重启那一句（三段齐全：事实 → 后果 → 动作）。
 *
 * 措辞不写「新版」：磁盘上那份也可能比正在跑的**低**（手工降级），「新版」就不实了；
 * 只照事实说「磁盘上装的是 X、正在运行的是 Y」。
 * 动作只给「重启 DSH」：这一态下面板**做不了别的**——更新包的可装判据要求最新版严格高于
 * **正在运行**的版本（`service.js:219`），而凭证只发在可装态（`service.js:256`：`receipt` 只在
 * `canInstall` 时给），所以这一态里「重试安装」点了也是白点。 */
export function restartLine(snapshot: UpdateSnapshot): string {
  const installed = snapshot.installedVersion ?? snapshot.job?.targetVersion ?? '新版本';
  return '磁盘上装的是 ' + String(installed) + '；正在运行的是 ' + snapshot.runningVersion + '。重启 DSH（退出后重新打开）后生效。';
}

/** 「条件在别处（目录／清单／别处装的），改完回来重读一次」的原因码：面板能给的下一步就是「重新检查」。
 *
 *  为什么要逐码列（票 #740 第三轮的朗读表）：`unknown-profile`／`registry-conflict`／`invalid-installation`／
 *  `source-install` 这四态原先一个动作都不给，屏上那句却写着「再点「检查更新」」——那颗按钮住在面板题头，
 *  结果浮层一开（点「检查更新」就开）就被浮层盖住，够不着。跟两张「还没查过」的卡是同一类病。 */
const RECHECK_REASONS: ReadonlySet<string> = new Set(['installation-changed', 'unknown-profile', 'registry-conflict', 'invalid-installation', 'source-install']);

/** 「这一步面板代劳不了、得照下面那条命令做」的原因码：这些话下面必须真有命令块。 */
const NEEDS_MANUAL: ReadonlySet<string> = new Set(['source-install', 'invalid-installation', 'recovery-required']);

/** 拦截态各自给得出的下一步：面板能代劳的给按钮，代劳不了的给 null（那种走手工命令块）。 */
function actionForBlocked(reason: BlockedReason): VerdictAction | null {
  if (RECHECK_REASONS.has(reason)) return 'recheck';
  if (reason === 'recovery-required') return 'retry';
  // `incompatible-node`（要升级 Node 并重启 DSH）与 `pending-restart`（要重启，且已被上面那条事实判据截走）
  // 这两态面板一步也做不了，按定义给 null；它们那句里点名的「检查更新」发生在重启之后，那时浮层早已关掉。
  return null;
}

/** 这一行此刻该画哪颗按钮：结论自带的动作优先，**失败的行一律给「重新检查」**（票 #740 第三轮）。
 *
 *  失败的行（查不到最新版／检查过期／装失败）没有快照、也就没有结论，原先一颗按钮都不画：
 *  屏上写着「再点「检查更新」」，那颗按钮却在浮层底下 ⇒ 无路可走。重新查一次对每一种失败都成立。 */
export function cardActionOf(verdict: Verdict | null, phase: 'idle' | 'checking' | 'ready' | 'installing' | 'failed'): VerdictAction | null {
  if (verdict?.action) return verdict.action;
  return phase === 'failed' ? 'recheck' : null;
}

/** 装成一家之后，其余各家的读数一律作废（票 #740）：七家共用同一份使用范围清单，
 *  刚那次安装已经改写了它，旧快照再拿去装必然被守卫拦下。这句话就是那条守卫的人话。 */
export function staleVerdict(): Verdict {
  return { kind: 'blocked', text: '刚在本面板装过别的插件，共用的安装清单变了，这一家要先重读一次。点「重新检查」，再点「装上更新」。', action: 'recheck' };
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
    // 动作给「重新检查」而不是让人去点面板顶上那颗「检查更新」：浮层开着的时候，顶上那颗被盖住了
    // （票 #740 对抗式审查第三轮的朗读表逮到）⇒ **每张卡自己的动作必须在这张卡上够得着**。
    return { kind: 'unknown', text: '未安装。点「重新检查」查最新版本，再点「装上」。', action: 'recheck' };
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
    return { kind: 'blocked', text: reasonText(blocked), action: actionForBlocked(blocked), manualHint: NEEDS_MANUAL.has(blocked) };
  }
  if (latest === null) {
    return { kind: 'unknown', text: '还没查过最新版本。点「重新检查」。', action: 'recheck' };
  }
  if (snapshot.canInstall) {
    // 把「正在运行的是哪个版本」写进同一行：用户不必回头去版本行里找。
    return { kind: 'update-available', text: '有新版本 ' + String(latest) + '（正在运行 ' + snapshot.runningVersion + '）。点「装上更新」。', action: 'update' };
  }
  if (hasNewer) {
    // 有新版、却没有可用凭证（这一通的凭证过期，或压根没签发）⇒ **不许说「已是最新」**：
    // 那是假话（最新版就在官方源上、磁盘上还是旧的），正确答案是重新检查一次拿新凭证。
    return { kind: 'update-available', text: '有新版本 ' + String(latest) + '（正在运行 ' + snapshot.runningVersion + '）。点「重新检查」，再点「装上更新」。', action: 'recheck' };
  }
  return { kind: 'up-to-date', text: '已是最新版本 ' + String(latest) + '。', action: null };
}

/** 待重启横幅：**一行总账**，只点名哪几家要做「重启 DSH」这件事。
 *
 *  为什么不再逐家重复那句话（票 #740 对抗式审查第三轮的朗读表逮到）：同一句「重启 DSH…后生效」
 *  会同时出现在横幅和那家卡片上，一屏两遍。分工定死：**横幅答「谁要重启」，卡片答「为什么、怎么做」**。 */
export function restartBannerText(titles: readonly string[]): string | null {
  if (titles.length === 0) return null;
  return '⚠️ 待重启 DSH（退出后重新打开）：' + titles.join('、');
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
