/** `op=import`（导入 CSV 账单）——本件住**导入这一条的全部安全顺序**（`#688` §二 D2 的四件）。
 *
 * 四件逐条落在哪一行（老侧四件全无，逐条证据见 `docs/skills/skill-bill/t731-差异表.md`）：
 *   ① **明示「本次将新增 N 行、不覆盖已有记录」**——`planImport` 算出的 `new_rows` 进载荷、进页面；
 *   ② **导入前自动备份一次**——确认那一路先 `createBackup`，把备份文件名写进载荷与页面；
 *   ③ **重复导入检测**——`planImport` 拿库里已有记录的签名逐行比，重号的进 `duplicates`、不写库；
 *   ④ **页面级结果卡**——`applyImport` 回来的成功／失败行数与失败原因进结果卡（`./template-wizard.js`）。
 *
 * 另两处**有意与老侧不同**：整批一个事务（老侧逐行各自 commit，中途失败不回退）；三档读数分开报
 *   （老侧把被跳过的空行算进 `total`）。
 */
import { existsSync } from 'node:fs';
import type { BillDb } from '../fetch/index.js';
import { resolveBackupDir, resolveGoalsPath } from '../fetch/paths.js';
import { actionStamp } from '../shared/copyArea.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { backupStampOf, createBackup } from './backups.js';
import {
  FIELD_LABEL, applyImport, existingRows, guessMap, missingRequired, parseMapping, planImport, readCsv,
} from './importer.js';
import type { ColumnMap, ImportPlan } from './importer.js';
import { confirmOf, importFileOf, mappingOf } from './params.js';
import type { SetupBlocked } from './params.js';
import { receiptEnvelopeOf } from './pageParts.js';
import { setupSceneFor } from './scene.js';
import { importSteps } from './steps.js';
import { blockedWizardDoc } from './blocked.js';
import { wizardDoc } from './template-wizard.js';

/** 把映射写回人话（复制口令里那一格；`日期=第1列,金额=第3列`）。 */
export function mappingTextOf(map: ColumnMap): string {
  const parts: string[] = [];
  for (const f of ['time', 'amount', 'category', 'account', 'ledger', 'note'] as const) {
    const col = map[f];
    if (col === undefined) continue;
    parts.push(FIELD_LABEL[f] + '=第' + String(col + 1) + '列');
  }
  return parts.join(',');
}

/** 导入 CSV（`op=import`）：不确认只出映射向导页；确认则「自动备份 → 整批一个事务写 → 结果卡」。 */
export function runImport(db: BillDb, key: string, params: Record<string, unknown>): WriteOut {
  const scene = setupSceneFor('import');
  const file = importFileOf(params);
  const blocked: SetupBlocked[] = [];
  if (file === '') blocked.push({ name: 'file', label: 'CSV 文件路径', why: '没给' });
  else if (!existsSync(file)) blocked.push({ name: 'file', label: 'CSV 文件路径', why: '这个文件不存在' });
  if (blocked.length > 0) {
    const html = blockedWizardDoc({ op: 'import', scene, key, params, blocked, actionAt: actionStamp() });
    const message = '导入还差 ' + String(blocked.length) + ' 项：' + blocked.map((b) => b.label + '（' + b.why + '）').join('、');
    return { data: { ok: false, message, receipt: { op: 'import', blocked } }, html };
  }

  const csv = readCsv(file);
  const mappingText = mappingOf(params);
  const map = mappingText === '' ? guessMap(csv) : parseMapping(mappingText);
  const missing = missingRequired(map);
  if (missing.length > 0) {
    const blocked2: SetupBlocked[] = [{
      name: 'mapping', label: '列映射',
      why: '还缺 ' + missing.map((f) => FIELD_LABEL[f]).join('、') + ' 这几列（照「日期=第1列,金额=第3列」补上）',
    }];
    const html = blockedWizardDoc({ op: 'import', scene, key, params, blocked: blocked2, actionAt: actionStamp() });
    const message = '导入还差 1 项：列映射（还是缺 ' + missing.map((f) => FIELD_LABEL[f]).join('、') + '）';
    return { data: { ok: false, message, receipt: { op: 'import', blocked: blocked2 } }, html };
  }
  const plan: ImportPlan = planImport(csv, map, existingRows(db));
  const filled: Record<string, unknown> = { ...params, mapping: mappingTextOf(map) };
  const common = {
    op: 'import' as const, file: csv.file, name: csv.name, total: csv.rows.length,
    new_rows: plan.newRows, duplicates: plan.duplicates.length, bad: plan.bad.length, mapping: mappingTextOf(map),
  };
  if (!confirmOf(params)) {
    const ok = plan.newRows > 0;
    const message = ok
      ? '导入向导：' + csv.name + ' 将新增 ' + String(plan.newRows) + ' 行，不覆盖已有记录'
      : '导入向导：' + csv.name + ' 没有可新增的行（都是库里已有的或读不出来的）';
    const receipt = { ...common, imported: 0, failed_count: 0, backup: '', confirmed: false };
    const envelope = receiptEnvelopeOf(key, { ok, message, ...receipt });
    const html = wizardDoc({
      op: 'import', scene, key, params: filled, actionAt: actionStamp(), envelope, blocked: [],
      steps: importSteps({
        fileName: csv.name, totalRows: csv.rows.length, mapped: true, newRows: plan.newRows,
        duplicateRows: plan.duplicates.length, badRows: plan.bad.length, confirmed: false, inserted: 0, failed: 0,
      }),
      prompt: scene.promptOf(filled), promptLabel: '复制给助手：照这句确认，导入前会自动备份一次',
      csv, map, plan, confirmed: false, backup: '', inserted: 0, failed: [],
    });
    return { data: { ok, message, receipt }, html };
  }
  // ② 导入前自动备份一次（D2 的第二件；与恢复同一支、同一口径）。
  const backup = createBackup({
    db, dir: resolveBackupDir(), stamp: backupStampOf(new Date()), goalsPath: resolveGoalsPath(),
  });
  const written = applyImport(db, plan);
  const ok = written.inserted > 0;
  const message = '已导入：' + String(written.inserted) + ' 行'
    + (written.failed.length > 0 ? '，失败 ' + String(written.failed.length) + ' 行' : '')
    + '（导入前已备份：' + backup.file + '）';
  const receipt = {
    ...common, imported: written.inserted, failed_count: written.failed.length,
    backup: backup.file, confirmed: true,
  };
  const envelope = receiptEnvelopeOf(key, { ok, message, ...receipt });
  const html = wizardDoc({
    op: 'import', scene, key, params: filled, actionAt: actionStamp(), envelope, blocked: [],
    steps: importSteps({
      fileName: csv.name, totalRows: csv.rows.length, mapped: true, newRows: plan.newRows,
      duplicateRows: plan.duplicates.length, badRows: plan.bad.length, confirmed: true,
      inserted: written.inserted, failed: written.failed.length,
    }),
    prompt: scene.promptOf(filled), promptLabel: '复制给助手：同一份文件再导一次会怎样',
    csv, map, plan, confirmed: true, backup: backup.file, inserted: written.inserted, failed: written.failed,
  });
  return { data: { ok, message, receipt }, html };
}
