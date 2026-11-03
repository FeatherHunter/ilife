/** 体检用的目录探针（#1327 从 health.ts 抽出）：在不在 ＋ 能不能写。
 *
 * 抽出只为一件事：health.ts 已挂号 494 LF（告警线 350），本次 #1327 又要在里面加行告警，
 * 故把同一套写探针搬到本件，health.ts 只留判据与报告装配。口径不变：**不建目录本身**，
 * 只在场内建一个探针文件再删（老技能三家同一套做法）。
 */
import { existsSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { m } from './entries/index.js';

/** 目录项：在不在 ＋ 能不能写。 */
export interface DirVerdict {
  readonly exists: boolean;
  readonly writable: boolean;
  readonly reason: string;
}

/** 目录能不能写：建一个探针文件再删掉。**不建目录本身**。 */
function writeProbe(dir: string): { readonly ok: boolean; readonly reason: string } {
  const probe = join(dir, '.ilife-health-probe-' + String(process.pid) + '-' + String(Date.now()));
  try {
    writeFileSync(probe, 'probe', { encoding: 'utf8', flag: 'wx' });
    unlinkSync(probe);
    return { ok: true, reason: '' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** 已算过的目录结论按路径记一份：同一份报告里同一个目录不重复起写探针。 */
const dirMemo = new Map<string, DirVerdict>();

/** 目录结论（带同报告内记忆）。 */
export function dirVerdict(dir: string): DirVerdict {
  const memoized = dirMemo.get(dir);
  if (memoized !== undefined) return memoized;
  const verdict = dirVerdictUncached(dir);
  dirMemo.set(dir, verdict);
  return verdict;
}

function dirVerdictUncached(dir: string): DirVerdict {
  if (!existsSync(dir)) return { exists: false, writable: false, reason: '' };
  try {
    if (!statSync(dir).isDirectory()) return { exists: false, writable: false, reason: m('skill-bill.health.c016') };
  } catch (e) {
    return { exists: false, writable: false, reason: e instanceof Error ? e.message : String(e) };
  }
  const probe = writeProbe(dir);
  return { exists: true, writable: probe.ok, reason: probe.reason };
}
