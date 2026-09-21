#!/usr/bin/env node
/** #834 · **发批**：把「整批真跑的 34 件产物」铺成一个可发的批目录，并一次跑出四件成品。
 *
 * 一次生成、两处落地（#825 §七）：墙页／总索引／链路总表与产物**同目录**（iframe 与相对链接才落得到），
 * 清单源与读数在仓内（本件只读仓内权威 `t856-manifest.json`）。
 *
 * 清单口径（#825 §二）：`rows` **逐字**取仓内权威件（`file` ＝ 最终发布名，全仓只此一处算）；
 * 本件只改三样：`batch`／`madeAt`／`readings`（索引页要原样上屏的那段机器读数，由 `--readings` 给）。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t834-发批.mjs --src <源目录> --batch <批目录> [--readings <读数.json>]
 * 退出码：0＝造册＋双端墙＋总索引＋链路总表＋机审名单全绿；1＝任一件红（逐条点名）；2＝用法错。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DOCS = join(ROOT, 'docs', 'skills', 'skill-memo-ilife');
const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };

const SRC = resolve(argOf('--src', 'packages/skill-memo-ilife/.scratch/t834/源'));
const BATCH = resolve(argOf('--batch', 'packages/skill-memo-ilife/.scratch/t834/验收'));
const READINGS = argOf('--readings', '');
if (!existsSync(SRC)) { console.error('源目录不存在：' + SRC + '（先跑 t834-gen-batch.mjs 整批真跑）'); process.exit(2); }

/* ① 铺清单：rows 逐字取仓内权威件，只换 batch／madeAt／readings 三段。 */
mkdirSync(BATCH, { recursive: true });
const src = JSON.parse(readFileSync(join(DOCS, 't856-manifest.json'), 'utf8'));
const mf = {
  ...src,
  batch: 't834-收口批（34 格真产物）',
  madeAt: new Date().toISOString().slice(0, 10),
  source: src.source + '；本批 rows 逐字照抄，只换 batch／madeAt／readings（#834 收口）',
  readings: READINGS !== '' && existsSync(resolve(READINGS))
    ? JSON.parse(readFileSync(resolve(READINGS), 'utf8'))
    : { 说明: '未给 --readings：本段照旧（清单未给本批机器读数，索引页这一段不该为空）' },
};
writeFileSync(join(BATCH, 'manifest.json'), JSON.stringify(mf, null, 2) + '\n', 'utf8');
console.log('清单铺好：' + join(BATCH, 'manifest.json') + '（rows ' + mf.rows.length + ' 行，逐字取仓内权威件）');

const run = (label, argv) => {
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  console.log('\n── ' + label + '（exit=' + r.status + '）');
  for (const l of String(r.stdout ?? '').trim().split(/\r?\n/).slice(-12)) console.log('   ' + l);
  if (r.status !== 0) {
    for (const l of String(r.stderr ?? '').trim().split(/\r?\n/).slice(0, 12)) console.error('   ! ' + l);
  }
  return r.status;
};

const codes = [];
/* ② 造册 ＋ 双端墙 ＋ 总索引 ＋ 行内自检（同一次跑出，自检读的是刚写的三页）。 */
codes.push(['造册＋双端墙＋总索引', run('t856-gen-wall.mjs --stage', [join(DOCS, 't856-gen-wall.mjs'), '--stage', SRC, BATCH])]);
/* ③ 链路总表（七列，按族分节，末尾死链自检）。 */
codes.push(['链路总表', run('t856-gen-linkage.mjs', [join(DOCS, 't856-gen-linkage.mjs'), BATCH])]);
/* ④ 机审名单（清单派生 ＋ 显式排除，供六列机审在批目录上判缺件）。 */
codes.push(['机审名单', run('t856-gen-audit-list.mjs', [join(DOCS, 't856-gen-audit-list.mjs'), BATCH])]);

console.log('');
const failed = codes.filter(([, c]) => c !== 0);
console.log('RESULT: ' + codes.map(([n, c]) => n + '=' + c).join('；'));
process.exit(failed.length === 0 ? 0 : 1);
