/** 面板的视图逻辑（纯函数：无 DOM、无 node、无 react），客户端与单测共用同一份。
 *
 * 判定「有没有新版」不自己算版本号大小：更新核心已经在快照里给了结论
 * （`canInstall` 为真即有新版可装，`blockedReason` 非空即为什么装不了，见更新包 README 第 8 节），
 * 本文件只把结论翻成三种状态与一句话，不另起一套版本比较。
 */
import type { CheckReceipt, BlockedReason, UpdateSnapshot } from 'dsh-plugin-update';
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

export type VerdictKind = 'unknown' | 'up-to-date' | 'update-available' | 'blocked';

export interface Verdict {
  readonly kind: VerdictKind;
  /** 一句话结论（面板那行正文）。 */
  readonly text: string;
  /** 这一行给不给按钮：缺席给「装上」，有新版给「装上更新」，其余不给。 */
  readonly action: 'install' | 'update' | null;
}

/** 把快照翻成一行结论：还没查 / 已是最新 / 有新版 / 装不了（附人话原因）。 */
export function verdictOf(target: TargetInfo, snapshot: UpdateSnapshot): Verdict {
  const absent = isAbsent(target);
  const latest = snapshot.latestVersion;
  if (absent && latest === null) {
    return { kind: 'unknown', text: '未安装；点「检查更新」查最新版本后装上。', action: null };
  }
  if (absent) {
    return { kind: 'update-available', text: '未安装；最新版本 ' + String(latest) + '。', action: 'install' };
  }
  if (snapshot.blockedReason !== null) {
    const blocked = snapshot.blockedReason as BlockedReason;
    if (blocked === 'pending-restart') {
      return { kind: 'blocked', text: reasonText(blocked), action: null };
    }
    return { kind: 'blocked', text: reasonText(blocked), action: null };
  }
  if (latest === null) {
    return { kind: 'unknown', text: '还没查过最新版本；点「检查更新」。', action: null };
  }
  if (snapshot.canInstall) {
    return { kind: 'update-available', text: '有新版：' + String(latest) + '，点「装上更新」。', action: 'update' };
  }
  return { kind: 'up-to-date', text: '已是最新（' + String(latest) + '）。', action: null };
}

/** 待重启横幅文案（更新包 README 第 10 节：说清新版号与「重启后才生效」两件事）。 */
export function pendingRestartText(target: TargetInfo, snapshot: UpdateSnapshot): string | null {
  if (snapshot.blockedReason !== 'pending-restart') return null;
  const installed = snapshot.installedVersion ?? snapshot.job?.targetVersion ?? null;
  const running = snapshot.runningVersion;
  if (installed === null) return '⚠️ 新版已装好，重启宿主后生效。';
  if (installed === running) return '⚠️ 新版 ' + installed + ' 已装好，重启宿主后生效。';
  return '⚠️ 新版 ' + installed + ' 已装好，正在跑的还是 ' + running + '，重启宿主后生效。';
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
