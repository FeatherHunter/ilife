/** 同步域 · **命令的运行件**（票 #855：域逻辑搬回本域，出口只查表调用）。
 *
 * 两条命令逐字从 `src/cli/cmd_read.ts` 搬来：
 *   - `memo.sync`（写）：反向对账三步（本地缺标识补建／远端完成→本地／远端改期→本地），回执带 11 项统计，
 *     同步报告页随行（#661 遗留 HELP 承诺）；
 *   - `memo.auth`（读）：只读诊断 —— `status`（授权状态）／`diag`（任务域自检 sentinel，显式才跑，零写）。
 *     授权三支（`init`／`qr`／`poll`）随 `lark.cliPath` 删键退役（定稿 #759）；「飞书授权」唤醒词同步退役。
 * 搬迁判据：`node docs/skills/skill-memo-ilife/t855-产物基线.mjs --check` 逐条一致（行为字节不变）。
 */
import type { CommandOut } from '../shared/commandSpec.js';
import { fail } from '../shared/exit.js';
import type { MemoDb } from '../db/readonly.js';
import { authStatus } from './auth.js';
import { runSentinel } from './sentinel.js';
import { reconcileWishes } from '../wish/index.js';
import { fillMemoPage, pageEnvelope, syncSnapshot } from '../render/index.js';
import { bookletFileStem } from '../help/index.js';
import { m } from '../entries/index.js';

/** `memo.sync`：飞书↔本机反向对账 ＋ 同步报告页随行。 */
export function runSync(params: Record<string, unknown>, db: MemoDb): CommandOut {
  void params;
  // #661：反向对账三步（本地缺标识补建／远端完成→本地／远端改期→本地），回执带 11 项统计。
  // #665：同步报告页随行（#661 遗留 HELP 承诺，出页归这一支）。
  const r = reconcileWishes(db);
  const snap = syncSnapshot(r.receipt);
  const payload = pageEnvelope({
    commandCn: m('skill-memo-ilife.sync-run.c001'), wakeWord: m('skill-memo-ilife.sync-run.c002'), sceneId: 'sync-from-feishu',
    title: snap.title, summary: snap.summary, sections: snap.sections,
    copyLog: {
      thinking: m('skill-memo-ilife.sync-run.c003'),
      data_structure: m('skill-memo-ilife.sync-run.c004'),
      call_chain: m('skill-memo-ilife.sync-run.c005'),
      exception: r.receipt.errors.length ? r.receipt.errors.join('; ') : m('skill-memo-ilife.sync-run.c006'),
    },
    extra: { ...r.receipt },
    message: r.receipt.message,
  });
  return { data: r.receipt, exit: r.exit, deliver: { html: fillMemoPage('sync_report', payload), stem: bookletFileStem('memo_sync_feishu') } };
}

/** `memo.auth`：飞书授权只读诊断（`status`／`diag`，无唤醒词）。 */
export function runAuth(params: Record<string, unknown>, db: MemoDb): CommandOut {
  void db;
  // #760 起只剩只读诊断：`status`（授权状态）／`diag`（任务域自检 sentinel，显式才跑，零写）。
  // 授权三支（`init`／`qr`／`poll`）随 `lark.cliPath` 删键退役（定稿 #759：授权交由复制安装指引那段
  // prompt，内容见 `memo.config.read` 回执的 `lark.prompt`）；「飞书授权」唤醒词同步退役。
  const step = params.step === undefined ? 'status' : String(params.step);
  if (step === 'status') {
    return { data: { ok: true, message: m('skill-memo-ilife.sync-run.c007'), step: 'status', ...authStatus() }, exit: 0 };
  }
  if (step === 'diag') {
    // #666 自检 sentinel（D-03 任务半场）：显式才跑；默认四步不碰它，零写。
    const r = runSentinel(params.dryRun === true ? { dryRun: true } : undefined);
    return { data: r.receipt, exit: r.exit };
  }
  fail(2, m('skill-memo-ilife.sync-run.c008'));
}
