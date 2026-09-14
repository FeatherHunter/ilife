#!/usr/bin/env node
/**
 * #393 · 变异自证用的源码级改坏／还原（只动本票声明路径下的 `src/diet/rankingDocs.ts`）。
 *
 *   node .scratch/t393/mutate.mjs --apply    # 改坏一处装配（RANK_ZH.high_calorie），先落一份原文备份
 *   node .scratch/t393/mutate.mjs --restore  # 用备份逐文件还原，并断言与备份逐字节一致
 *
 * 改坏点选 `RANK_ZH.high_calorie`：它在 `buildRankingDoc` 与 `buildAllRankingsDoc` 两件里都进产物，
 * 因此预期「部分用例 sha 变、其余用例保持」——既能证明探针抓得住，也能证明它不是「一律全变」的假红。
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';

const TARGET = 'packages/skill-calorie/src/diet/rankingDocs.ts';
const BACKUP = '.scratch/t393/backup/rankingDocs.orig.ts';
const FROM = "  high_calorie: '高热量', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白',";
const TO = "  high_calorie: '高热量!', low_calorie: '低热量', frequent: '常吃', high_carb: '高碳水', high_protein: '高蛋白',";

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--restore') ? 'restore' : null;
if (!mode) throw new Error('用法: --apply | --restore');

if (mode === 'apply') {
  const src = readFileSync(TARGET, 'utf8');
  if (src.split(FROM).length - 1 !== 1) throw new Error('改坏点不是恰一处（原文可能已被改过）');
  if (!existsSync(BACKUP)) writeFileSync(BACKUP, src, 'utf8');
  else if (sha(readFileSync(BACKUP, 'utf8')) !== sha(src)) throw new Error('备份与当刻原文不一致，拒绝改坏');
  writeFileSync(TARGET, src.replace(FROM, TO), 'utf8');
  console.log('MUTATE applied sha ' + sha(src) + ' → ' + sha(readFileSync(TARGET, 'utf8')));
} else {
  const want = readFileSync(BACKUP, 'utf8');
  copyFileSync(BACKUP, TARGET);
  // Windows 上 `copyFileSync` 会把备份的 mtime 一并带过来：mtime 往回走会让 `tsc -b` 认为「没变」而跳过重编，
  // 于是 dist 里留着改坏后的产物（#325 记的假绿链）。还原后显式把 mtime 置为当刻，下一次编译才真的重编。
  const now = new Date();
  utimesSync(TARGET, now, now);
  const got = readFileSync(TARGET, 'utf8');
  if (sha(got) !== sha(want)) throw new Error('还原后与备份不一致');
  console.log('MUTATE restored sha ' + sha(got) + ' 与备份一致 mtime=' + statSync(TARGET).mtime.toISOString());
}
