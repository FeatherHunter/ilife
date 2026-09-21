#!/usr/bin/env node
// 居家管家 · 场景页脚手架（票 #805，薄 CLI）。
//
// 域票开工第一步就是跑它，不许手抄样板：
//   node packages/skill-home/scripts/new-scene-page.mjs <域> <页族>
//   node packages/skill-home/scripts/new-scene-page.mjs --all   # 一次生成全部在役页族
//   node packages/skill-home/scripts/new-scene-page.mjs --check # 只比对（不一致 exit 1 并点名）
//   node packages/skill-home/scripts/new-scene-page.mjs --list  # 列出 46 族
// 退出码：0＝齐；1＝族名不对／比对不一致；2＝用法错／附录读不动。

import { readFileSync } from 'node:fs';
import {
  loadAppendix, shapeTable, VALID_DOMAINS,
  generateFamily, generateRegistry, allFamilies,
} from './lib/scene-page-scaffold.mjs';

function usage() {
  console.log('用法: new-scene-page.mjs <域> <页族> | --all | --check | --list');
  console.log('域: ' + VALID_DOMAINS.join('／'));
}

const args = process.argv.slice(2);
let appendix;
try {
  appendix = loadAppendix();
} catch (e) {
  console.log('RESULT: ABORT exit=2 :: 附录读不动 ' + e.message);
  process.exit(2);
}
const shapes = shapeTable();

if (args[0] === '--list') {
  for (const [d, f] of allFamilies(appendix)) console.log(d + '/' + f);
  console.log('RESULT: families=' + appendix.families.length);
  process.exit(0);
}

if (args[0] === '--all') {
  for (const [d, f] of allFamilies(appendix)) {
    const r = generateFamily(appendix, shapes, d, f, true);
    console.log('WROTE ' + d + '/' + f);
    void r;
  }
  const g = generateRegistry(appendix, true);
  console.log('WROTE registry ' + g.file);
  console.log('RESULT: PASS families=' + appendix.families.length);
  process.exit(0);
}

if (args[0] === '--check') {
  let bad = 0;
  for (const [d, f] of allFamilies(appendix)) {
    const r = generateFamily(appendix, shapes, d, f, false);
    for (const [label, file, want] of [['template', r.tFile, r.tText], ['page', r.pFile, r.pText]]) {
      let disk = null;
      try { disk = readFileSync(file, 'utf8'); } catch { /* 缺件即不一致 */ }
      if (disk !== want) { bad += 1; console.log('DIFF ' + d + '/' + f + ' :: ' + label + ' ' + file); }
    }
  }
  const g = generateRegistry(appendix, false);
  let diskReg = null;
  try { diskReg = readFileSync(g.file, 'utf8'); } catch { /* 缺件即不一致 */ }
  if (diskReg !== g.text) { bad += 1; console.log('DIFF registry :: ' + g.file); }
  console.log(bad === 0 ? 'RESULT: PASS families=' + appendix.families.length : 'RESULT: FAIL diff=' + bad);
  process.exit(bad === 0 ? 0 : 1);
}

if (args.length === 2) {
  const [domain, family] = args;
  if (!VALID_DOMAINS.includes(domain)) {
    console.log('RESULT: ABORT exit=1 :: 未知域：' + domain + '（要 ' + VALID_DOMAINS.join('／') + '）');
    process.exit(1);
  }
  try {
    const r = generateFamily(appendix, shapes, domain, family, true);
    const g = generateRegistry(appendix, true);
    console.log('WROTE ' + r.tFile);
    console.log('WROTE ' + r.pFile);
    console.log('WROTE registry ' + g.file);
    console.log('RESULT: PASS ' + domain + '/' + family);
    process.exit(0);
  } catch (e) {
    console.log('RESULT: ABORT exit=1 :: ' + e.message);
    process.exit(1);
  }
}

usage();
process.exit(2);
