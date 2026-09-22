#!/usr/bin/env node
/** #792 · 作息域四件机器读数的**重出**入口（一条命令从产物目录重出 sep／resp／fmt／facts）。
 *
 *  为什么要有这一件：判分引擎（`packages/base-render/scripts/判分.mjs`）吃的是**读数目录**里的四件 JSON，
 *  四件的形状定义只写一处 —— `docs/base/base-render/t867-读数链契约.md`。契约同时写死了三件 reader 的
 *  **命令形态**（`t867-facts.mjs` 的 `READERS` 表）。本件不重写任何口径：它只把那张表里写死的三条命令
 *  按作息域的参数（产物目录／读数目录／三档）逐条跑一遍，第四件（`facts.json`）交给**本域自己的装配器**
 *  `docs/skills/skill-schedule/t792-facts.mjs`（DOM 六列 ＋ 两列机器候选；人核四列缺省 0）。
 *  ⇒ 四件读数**没有第二处定义**：本件是调度，不是第二套算式。
 *
 *  ⚠️ **与契约的一处有意分叉（写清，免得下一批人以为漏接线）**：契约 §四点名的装配器是
 *  `docs/skills/skill-memo-ilife/t867-facts.mjs`，它吃一份**人核档**（`.md`）才出 facts。作息这一批的
 *  `d1`／`d2` 两列经复核**判为全 61 页 0 分**（口径：起点 0，只对能用 DOM／CSS 读数或 `文件:行` 复核的项扣分；
 *  机器能读的五类——字号／触摸目标／三档溢出／分隔符串／内部标识符——由 sep／resp／fmt 直接进 D3／D5 与硬扣分，
 *  不再进人核位；详见 #792 证据件「第二段」一节），故本域**不设人核档**，直接用 `t792-facts.mjs` 量机器列。
 *  日后真出现需要人核的扣分项时，再按契约补人核档并把下面那一行换回 `t867-facts.mjs`。
 *
 *  用法（仓根）：
 *    node docs/skills/skill-schedule/t792-读数.mjs \
 *      [--pages .scratch/t792/产物] [--readings .scratch/t792/读数] \
 *      [--widths 390,768,1440] [--label t792] \
 *      [--human docs/skills/skill-schedule/t792-人核档.md] [--no-facts]
 *
 *  行为：三件 reader **逐条现产**（已存在也重跑，保证四件是同一刻的读数）；给了 `--human` 再跑 facts 装配器
 *  （它会**复用**刚产的三件，只校不产）。`--no-facts` 只出三件。
 *
 *  退出码：0＝四件齐；1＝某件 reader 有命中或装配器红（读数照旧落盘，看末尾点名）；2＝用法错／缺浏览器。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const argOf = (argv, name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

/** 三件 reader 的命令形态：**逐字**来自 `docs/base/base-render/t867-读数链契约.md` §一–§三 与
 *  `docs/skills/skill-memo-ilife/t867-facts.mjs` 的 `READERS` 表（这里只填作息域的参数值）。 */
export const READERS = Object.freeze([
  {
    out: 'sep.json',
    argv: (pages, out, widths, label) => ['packages/skill-calorie/scripts/audit-separators.mjs',
      '--dir', pages, '--json', out, '--quiet'],
    how: 'node packages/skill-calorie/scripts/audit-separators.mjs --dir <页群目录> --json <读数目录>/sep.json --quiet',
  },
  {
    out: 'resp.json',
    argv: (pages, out, widths, label) => ['packages/skill-calorie/scripts/measure-responsive.mjs',
      '--dir', pages, '--widths', widths.join(','), '--json', out, '--label', label],
    how: 'node packages/skill-calorie/scripts/measure-responsive.mjs --dir <页群目录> --widths <档> --json <读数目录>/resp.json --label <名>',
  },
  {
    out: 'fmt.json',
    argv: (pages, out, widths, label) => ['docs/skills/skill-calorie/t516-判据-版式.mjs',
      '--dir', pages, '--widths', widths.join(','), '--json', out],
    how: 'node docs/skills/skill-calorie/t516-判据-版式.mjs --dir <页群目录> --widths <档> --json <读数目录>/fmt.json',
  },
]);

const USAGE = [
  '用法: node docs/skills/skill-schedule/t792-读数.mjs [--pages <产物目录>] [--readings <读数目录>]',
  '        [--widths 390,768,1440] [--label t792] [--no-facts]',
  '  （本域不设人核档：facts 由 t792-facts.mjs 量机器列，见件头那处分叉说明）',
].join('\n');

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); return 0; }
  const pages = resolve(argOf(argv, '--pages', '.scratch/t792/产物'));
  const readings = resolve(argOf(argv, '--readings', '.scratch/t792/读数'));
  const label = argOf(argv, '--label', 't792');
  const widths = argOf(argv, '--widths', '390,768,1440').split(',').filter((s) => s !== '').map(Number);
  const withFacts = !argv.includes('--no-facts');
  if (widths.some((w) => !Number.isFinite(w)) || widths.length === 0) { console.error('--widths 解析不出宽度：' + argOf(argv, '--widths', '')); return 2; }
  if (!existsSync(pages) || !statSync(pages).isDirectory()) { console.error('产物目录不是目录：' + pages); return 2; }
  mkdirSync(readings, { recursive: true });

  let worst = 0;
  for (const spec of READERS) {
    const outAbs = resolve(readings, spec.out);
    const a = spec.argv(pages, outAbs, widths, label);
    const script = resolve(ROOT, a[0]);
    console.log('READER-PRODUCE ' + spec.out + ' :: ' + spec.how);
    const got = spawnSync(process.execPath, [script, ...a.slice(1)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const tail = String(got.stdout ?? '').trim().split(/\r?\n/).slice(-2).join(' ／ ');
    console.log('READER-EXIT ' + spec.out + ' exit=' + got.status + (tail === '' ? '' : ' :: ' + tail));
    if (got.error) { console.error(spec.out + ' 起不来：' + got.error.message); return 2; }
    if (got.status === 2) { console.error(spec.out + ' 基础设施失败（exit 2：缺浏览器或参数错）'); return 2; }
    if (!existsSync(outAbs)) { console.error(spec.out + ' 没落盘（reader exit=' + got.status + '）'); return 1; }
    if (got.status === 1) worst = 1; // 「有命中」是正常读数（契约 §七），不是基础设施失败
  }

  if (withFacts) {
    const facts = resolve(readings, 'facts.json');
    const a = ['docs/skills/skill-schedule/t792-facts.mjs', '--pages', pages, '--out', facts];
    console.log('READER-PRODUCE facts.json :: node ' + a.join(' ') + '（**本域自己的装配器**：DOM 六列 ＋ 两列机器候选，见件头那处分叉说明）');
    const got = spawnSync(process.execPath, [resolve(ROOT, a[0]), ...a.slice(1)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    for (const line of String(got.stdout ?? '').trim().split(/\r?\n/).slice(-40)) console.log('  ' + line);
    console.log('READER-EXIT facts.json exit=' + got.status);
    if (got.error) { console.error('facts.json 装配器起不来：' + got.error.message); return 2; }
    if (got.status !== 0) { console.error('facts.json 装配器红（exit=' + got.status + '）'); return 1; }
  } else {
    console.log('SKIP facts.json（没给 --human，或 --no-facts）：三件已落 ' + readings);
  }

  console.log('READINGS ' + readings + ' :: sep.json／resp.json／fmt.json' + (withFacts ? '／facts.json' : '') + '（四件同住一处，判分引擎按这个约定读）');
  return worst;
}

process.exitCode = main(process.argv.slice(2));
