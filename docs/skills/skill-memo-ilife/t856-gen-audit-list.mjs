#!/usr/bin/env node
/** #856 · 机审名单接线（六列机审名单从清单派生＋显式排除＋豁免）。
 *
 * t407（bill 那份，有 0／1／2 退出码）是判据真件，但它的 FILES 写死了 32 份账单产物名单，
 * 直接跑备忘录会报「共 0 份」exit 1——改它归公共层小票 #851（串行窗口），不在本票。
 * 本件只做接线 click：读批目录 manifest.json，产出本批机审名单
 * `t856-audit-list.json`（34 份产物＋显式排除＋notShipped 豁免），并做存在性门：
 *   exit 0 名单 34 件齐且排除项一处不多进；exit 1 缺件并点名；exit 2 用法错。
 * 不做裸目录扫描（t407:36-40 已写明裸筛会把老样／对照／墙页混进来）。
 * 分隔符门与跨宽门零改动直接复用（见实施证据里的实跑读数）。
 *
 * 用法：
 *   node docs/skills/skill-memo-ilife/t856-gen-audit-list.mjs <批目录>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const OUT_NAME = 't856-audit-list.json';
/** 显式排除：墙页／总索引／链路总表自身与非本册对照页不进审计。 */
const EXCLUDES = ['手机墙-390.html', '桌面墙-1280.html', '总索引.html', '链路总表.html'];

function main() {
  const dirArg = process.argv[2];
  if (!dirArg) { console.error('用法：node t856-gen-audit-list.mjs <批目录>'); process.exit(2); }
  const dir = resolve(dirArg);
  const mfPath = join(dir, 'manifest.json');
  if (!existsSync(mfPath)) { console.error(`没有清单：${mfPath}`); process.exit(2); }
  const mf = JSON.parse(readFileSync(mfPath, 'utf8'));
  const files = (mf.rows || []).map((r) => r.file);
  const notShipped = Array.isArray(mf.notShipped) ? mf.notShipped : [];
  const missing = files.filter((f) => !existsSync(join(dir, f)));
  const leaked = EXCLUDES.filter((f) => files.includes(f));
  const list = {
    batch: mf.batch || 't856-备忘录验收形制',
    source: 'manifest.json rows[].file（派生，非手抄；t407 判据复用时 FILES 替换为此名单）',
    excludes: EXCLUDES,
    count: files.length,
    files,
    notShipped,
  };
  writeFileSync(join(dir, OUT_NAME), JSON.stringify(list, null, 2) + '\n', 'utf8');
  const bad = [
    ...missing.map((f) => `审计名单缺件：${f}`),
    ...leaked.map((f) => `排除项混入名单：${f}`),
  ];
  console.log(`机审名单：${files.length} 件；排除 ${EXCLUDES.length} 项；豁免 ${notShipped.length} 项；` + (bad.length === 0 ? '缺失 0 -> 可发' : `缺失 ${bad.length} -> 不可发`));
  if (bad.length) { for (const b of bad) console.error(`  ${b}`); process.exit(1); }
}

main();
