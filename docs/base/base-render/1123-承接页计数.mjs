#!/usr/bin/env node
/** #1123 承接页计数自检（照 #1082 票面「另附清单自检」的同一口径）：把清单里每条 B 结论的承接页清单数一遍，
 *  与该形状在代码里的实际出现处逐处对上——数量不等即 exit 非 0。
 *
 * 用法：node docs/base/base-render/1123-承接页计数.mjs
 * **与 #1082 版的唯一差别**：`shared/票据纸页型.ts` 的对账行命中行 5→4——那一处内联标记已换成
 * `renderCheckRow({ text })` 调用（形状本体搬进 base 件 `check-row`），承接关系不变。
 * 读数：逐条打印「声明 N 件／M 行；实得 N 件／M 行」，末行 RESULT: PASS|RED。计数单位＝命中行（与清单的 `文件:行` 逐处对上）。
 * 红线：本脚本**只读** `packages/skill-bill/src/**`，不改任何文件。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'packages/skill-bill/src';

/** 清单 §3／§11／§12／§16 的 B 结论：形状名 ＋ 命中正则 ＋ 承接件清单（声明每件命中行数）。 */
const ENTRIES = [
  {
    section: '§3 纸头 sheet-head',
    marker: /sheetHead\(|shop-head|shop-brand|ilife-sheet-head/,
    files: {
      'analysis/ticket.ts': 2, 'help/lookupPage.ts': 1, 'query/detail.ts': 1, 'query/list-tag.ts': 1, 'query/list.ts': 1,
      'query/ticket-day.ts': 1, 'query/ticket-empty.ts': 1, 'query/ticketAccount.ts': 1, 'query/ticketCategory.ts': 1,
      'query/ticketDebt.ts': 1, 'query/ticketInstallment.ts': 1, 'query/ticketInterval.ts': 1, 'query/ticketLedger.ts': 1,
      'query/ticketMonth.ts': 1, 'query/ticketRecent.ts': 1, 'query/ticketReimburse.ts': 1, 'query/ticketToday.ts': 1,
      'query/ticketWeek.ts': 1, 'query/ticketYesterday.ts': 1, 'setup/template-list.ts': 2, 'setup/template-receipt.ts': 1,
      'setup/template-wizard.ts': 3, 'shared/票据纸页型.ts': 3, 'write/receiptPaper.ts': 2, 'write/saySheet.ts': 6,
      'write/template-update.ts': 1,
    },
  },
  {
    section: '§11 节标题 ticket-section',
    marker: /ticketSection\(|sec-heading|ilife-query-sec-title|ilife-ticket-sec/,
    files: {
      'analysis/ticket.ts': 3, 'help/lookupPage.ts': 2, 'query/detail.ts': 4, 'query/list-tag.ts': 4, 'query/list.ts': 5,
      'query/ticket-day.ts': 4, 'query/ticket-empty.ts': 4, 'query/ticketAccount.ts': 4, 'query/ticketCategory.ts': 4,
      'query/ticketDebt.ts': 4, 'query/ticketInstallment.ts': 4, 'query/ticketInterval.ts': 4, 'query/ticketLedger.ts': 4,
      'query/ticketMonth.ts': 4, 'query/ticketRecent.ts': 4, 'query/ticketReimburse.ts': 4, 'query/ticketToday.ts': 4,
      'query/ticketWeek.ts': 4, 'query/ticketYesterday.ts': 4, 'setup/template-list.ts': 4, 'setup/template-receipt.ts': 1,
      'setup/template-wizard.ts': 5, 'shared/票据纸页型.ts': 5, 'write/receiptPaper.ts': 3, 'write/saySheet.ts': 5,
      'write/template-update.ts': 2,
    },
  },
  {
    section: '§12 对账行 check-row',
    marker: /ilife-ticket-check|check-mini|checkHtmlOf/,
    files: {
      'help/lookupPage.ts': 1, 'query/detail.ts': 2, 'query/list-tag.ts': 3, 'setup/pageParts.ts': 3,
      'shared/票据纸页型.ts': 4, 'write/receiptPaper.ts': 2, 'write/template-update.ts': 2,
    },
  },
  {
    section: '§16 缺项徽章 type-badge',
    marker: /\bbadgeOf\(|\btypeBadge\(/,
    files: {
      'account/pageParts.ts': 1, 'analysis/pageParts.ts': 2, 'goal/pageParts.ts': 1, 'setup/pageParts.ts': 1,
      'write/template-batch.ts': 1, 'write/template-expense.ts': 1, 'write/template-flow.ts': 1,
      'write/template-installment.ts': 1, 'write/template-update.ts': 1, 'write/typeBadge.ts': 1,
    },
  },
];

const bad = [];
for (const e of ENTRIES) {
  let declaredFiles = 0;
  let declaredHits = 0;
  let actualFiles = 0;
  let actualHits = 0;
  for (const [rel, want] of Object.entries(e.files)) {
    const abs = join(ROOT, rel);
    let text;
    try { text = readFileSync(abs, 'utf8'); } catch { bad.push(e.section + ' 承接件读不到：' + rel); continue; }
    // 计数单位＝**命中行**（与清单里的「出现处 文件:行」逐处对上）；一行里两次同名调用算一处。
    const got = text.split('\n').filter((ln) => e.marker.test(ln)).length;
    declaredFiles += 1; declaredHits += want;
    if (got > 0) actualFiles += 1;
    actualHits += got;
    if (got !== want) bad.push(e.section + ' ' + rel + ' 声明 ' + String(want) + ' 实得 ' + String(got));
  }
  console.log(e.section + '：声明 ' + String(declaredFiles) + ' 件／' + String(declaredHits) + ' 行；实得 ' + String(actualFiles) + ' 件／' + String(actualHits) + ' 行');
}
if (bad.length > 0) {
  for (const b of bad) console.log('RED ' + b);
  console.log('RESULT: RED（承接页计数与清单不符 ' + String(bad.length) + ' 处）');
  process.exit(1);
}
console.log('RESULT: PASS（四条 B 结论的承接页清单逐件对上）');