#!/usr/bin/env node
/** #188 · 居家管家内容资产生成器 CLI（薄壳）：参数解析、`--check`、退出码、人话输出。
 *
 * 实体在 `scripts/lib/help-assets.mjs`（读仓内 yaml → 解析 → 建形状 → 断言 → 渲染）；
 * YAML 子集读取在 `scripts/lib/yaml-subset.mjs`。
 *
 * 用法（只认这两条；**没有** `--src`／`--out`，输入源写死在仓内，不许指到仓外）：
 *   node packages/skill-home/scripts/gen-help-assets.mjs                  # 落盘
 *   node packages/skill-home/scripts/gen-help-assets.mjs --check          # 只比对，不一致打印差异摘要并 exit 1
 *
 * 事实源：`packages/skill-home/src/help/scenarios.yaml`（老骨架原样副本，仓内唯一输入源，可复跑）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generate, OUT_TS } from './lib/help-assets.mjs';

/** 差异摘要（只印行号与截断样张，不刷内容）。 */
function diffSummary(want, got) {
  const a = want.split('\n');
  const b = got.split('\n');
  const rows = [];
  for (let i = 0; i < Math.max(a.length, b.length) && rows.length < 3; i++) {
    if (a[i] !== b[i]) rows.push('  行 ' + (i + 1) + '：生成 ' + JSON.stringify(String(a[i]).slice(0, 40)) + ' ≠ 盘上 ' + JSON.stringify(String(b[i]).slice(0, 40)));
  }
  return '  行数：生成 ' + a.length + ' ≠ 盘上 ' + b.length + '\n' + rows.join('\n');
}

const argv = process.argv.slice(2);
const unknown = argv.filter((a) => a !== '--check');
if (unknown.length) {
  console.error('不认的参数：' + unknown.join(' '));
  process.exit(1);
}
const { text, stat } = generate();
const shape = stat.domains + ' 域／' + stat.subgroups + ' 二级组／' + stat.scenes + ' 场景';
if (argv.includes('--check')) {
  if (!existsSync(OUT_TS)) {
    console.error('DRIFT：' + OUT_TS + ' 不在盘上（重跑不带 --check 即生成）');
    process.exit(1);
  }
  const disk = readFileSync(OUT_TS, 'utf8');
  if (disk !== text) {
    console.error('DRIFT：' + OUT_TS + ' 与生成结果不一致（禁止手改；重跑不带 --check 即覆盖）');
    console.error(diffSummary(text, disk));
    process.exit(1);
  }
  console.log('OK：' + OUT_TS + ' 与生成结果字节一致（' + shape + '）');
  process.exit(0);
}
writeFileSync(OUT_TS, text, 'utf8');
console.log('已写入：' + OUT_TS + '（' + Buffer.byteLength(text, 'utf8') + ' 字节；' + shape
  + '，其中登记位 ' + stat.deprecatedScenes + ' 条）');
