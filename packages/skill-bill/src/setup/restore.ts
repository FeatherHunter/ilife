/** `op=restore`（从备份恢复）——本件住**恢复这一条的全部安全顺序**（`#688` §二 D1 的三件套）。
 *
 * 顺序是硬约束，逐条都有出处：
 *   ① **先验那一份备份读得动**（老侧是「先覆盖、后校验」，见差异表）；
 *   ② 确认前只出向导页，**不碰数据**（老侧这条没有闸门）；
 *   ③ 确认后**无条件**给现状造一份备份（老侧 `backup.py:122-124`，这一条原样继承）——
 *      并把这一份的名字写进页面与警告（「不满意可以怎么回去」）；
 *   ④ **关掉库句柄**再覆盖（Windows：覆盖打开着的库会失败，且残留的 `-wal` 旁件会与恢复回来的库打架），
 *      覆盖后重新开一条连接验库（老侧 `backup.py:139-142` 那句 `SELECT 1 FROM bills LIMIT 1` 的位置搬到了
 *      覆盖之后、但**源侧先验**在 ①）；失败时点名现状备份。
 *   ⑤ **选中项只有一处**（`selected`）：详情卡、步骤说明、口令三处都从它派生——老侧最高危缺陷
 *      （`restore.html:141-145` 的详情卡冻结在初值）就是从这里长出来的（`#688` §二 D5）。
 */
import { currentRenderLanguage } from 'base-entries';
import { closeBillDb } from '../fetch/index.js';
import type { BillDb } from '../fetch/index.js';
import { resolveBackupDir, resolveGoalsPath } from '../fetch/paths.js';
import { actionStamp } from '../shared/copyArea.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { projectWakeWord } from '../triggers/wakeTable.js';
import {
  backupStampOf, createBackup, listBackups, restoreBackup, selectedBackup, verifyRestored,
} from './backups.js';
import type { BackupEntry } from './backups.js';
import { confirmOf, restoreNameOf } from './params.js';
import type { SetupBlocked } from './params.js';
import { receiptEnvelopeOf } from './pageParts.js';
import { setupSceneFor } from './scene.js';
import { restoreSteps } from './steps.js';
import { blockedWizardDoc } from './blocked.js';
import { wizardDoc } from './template-wizard.js';
import { m } from '../entries/index.js';

/** 从备份恢复（`op=restore`）：不确认只出向导页；确认则「验备份 → 造现状备份 → 覆盖 → 验库」。 */
export function runRestore(db: BillDb, key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('restore', currentRenderLanguage());
  const word = projectWakeWord({ key: 'bill.setup.run', op: 'restore' });
  const dir = resolveBackupDir();
  const entries = listBackups(dir);
  const wanted = restoreNameOf(params);
  const selected = selectedBackup(dir, wanted);
  if (wanted !== '' && selected === null) {
    const blocked: readonly SetupBlocked[] = [{
      name: 'name', label: m('skill-bill.setup-restore.c001'),
      why: m('skill-bill.setup-restore.c002'),
    }];
    const html = blockedWizardDoc({ op: 'restore', scene, key, params, blocked, actionAt: actionStamp() });
    const message = m('skill-bill.setup-restore.c003', { p0: String(word) });
    return { data: { ok: false, message, receipt: { op: 'restore', blocked } }, page: { wakeWord: word, kind: 'single' }, html };
  }
  if (!confirmOf(params) || selected === null) {
    const ok = selected !== null;
    const message = selected === null
      ? m('skill-bill.setup-restore.c004')
      : m('skill-bill.setup-restore.c005', { p0: String(selected.file) });
    const receipt = {
      op: 'restore', selected: selected === null ? null : selected.file, count: entries.length,
      confirmed: false, safety: '', verified: false,
    };
    const envelope = receiptEnvelopeOf(key, { ok, message, ...receipt });
    const html = wizardDoc({
      op: 'restore', scene, key, params, actionAt: actionStamp(), envelope, blocked: [],
      steps: restoreSteps({
        selected: selected?.file ?? '', count: entries.length, confirmed: false, safety: '', verified: false,
      }),
      prompt: scene.promptOf({ ...params, name: selected?.file ?? '' }),
      promptLabel: m('skill-bill.setup-restore.c006'),
      entries, selected, confirmed: false, safety: '', verified: false, result: '',
    });
    return { data: { ok, message, receipt }, page: { wakeWord: word, kind: 'single' }, html };
  }
  const target: BackupEntry = selected;
  // ① 先验那一份备份读得动（老侧是覆盖之后才验，见差异表）。
  const sourceOk = verifyRestored(target.path);
  if (!sourceOk.ok) {
    const blocked: readonly SetupBlocked[] = [
      { name: 'name', label: m('skill-bill.setup-restore.c007'), why: m('skill-bill.setup-restore.c008', { p0: String(sourceOk.why) }) },
    ];
    const message = m('skill-bill.setup-restore.c009', { p0: String(word), p1: String(sourceOk.why) });
    const receipt = { op: 'restore', selected: target.file, count: entries.length, confirmed: true, safety: '', verified: false };
    const envelope = receiptEnvelopeOf(key, { ok: false, message, ...receipt });
    const html = wizardDoc({
      op: 'restore', scene, key, params, actionAt: actionStamp(), envelope, blocked,
      steps: restoreSteps({
        selected: target.file, count: entries.length, confirmed: true, safety: '', verified: false,
      }),
      prompt: scene.promptOf({ ...params, name: '' }),
      promptLabel: m('skill-bill.setup-restore.c010'),
      entries, selected: target, confirmed: true, safety: '', verified: false, result: m('skill-bill.setup-restore.c011'),
    });
    return { data: { ok: false, message, receipt }, page: { wakeWord: word, kind: 'single' }, html };
  }
  // ② 无条件给现状造一份备份（D1 的第一件，不依赖用户记不记得）。
  const safety = createBackup({ db, dir, stamp: backupStampOf(new Date()), goalsPath: resolveGoalsPath() });
  // ③ 关掉句柄再覆盖（Windows：覆盖打开着的库会失败），随后重开一条连接验库。
  const dbPath = db.path;
  closeBillDb(db);
  try {
    restoreBackup({ entry: target, dbPath, goalsPath: resolveGoalsPath() });
  } catch (e) {
    const message = m('skill-bill.setup-restore.c012', {
      p0: String(word),
      p1: String((e as Error).message),
      p2: String(safety.file),
    });
    const receipt = { op: 'restore', selected: target.file, safety: safety.file, verified: false };
    const envelope = receiptEnvelopeOf(key, { ok: false, message, ...receipt });
    const html = wizardDoc({
      op: 'restore', scene, key, params, actionAt: actionStamp(), envelope, blocked: [],
      steps: restoreSteps({
        selected: target.file, count: entries.length, confirmed: true, safety: safety.file, verified: false,
      }),
      prompt: scene.promptOf({ ...params, name: safety.file }),
      promptLabel: m('skill-bill.setup-restore.c013'),
      entries, selected: target, confirmed: true, safety: safety.file, verified: false, result: m('skill-bill.setup-restore.c014'),
    });
    return { data: { ok: false, message, receipt }, page: { wakeWord: word, kind: 'single' }, html };
  }
  const verified = verifyRestored(dbPath);
  const message = verified.ok
    ? m('skill-bill.setup-restore.c015', { p0: String(target.file), p1: String(safety.file) })
    : m('skill-bill.setup-restore.c016', {
      p0: String(target.file),
      p1: String(verified.why),
      p2: String(safety.file),
    });
  const receipt = {
    op: 'restore', selected: target.file, safety: safety.file, verified: verified.ok,
    count: listBackups(dir).length,
  };
  const envelope = receiptEnvelopeOf(key, { ok: verified.ok, message, ...receipt });
  const html = wizardDoc({
    op: 'restore', scene, key, params, actionAt: actionStamp(), envelope, blocked: [],
    steps: restoreSteps({
      selected: target.file, count: entries.length, confirmed: true, safety: safety.file, verified: verified.ok,
    }),
    prompt: scene.promptOf({ ...params, name: safety.file }),
    promptLabel: verified.ok ? m('skill-bill.setup-restore.c017') : m('skill-bill.setup-restore.c018'),
    entries: listBackups(dir), selected: target, confirmed: true, safety: safety.file,
    verified: verified.ok, result: verified.ok ? target.file : m('skill-bill.setup-restore.c019'),
  });
  return { data: { ok: verified.ok, message, receipt }, page: { wakeWord: word, kind: 'single' }, html };
}
