#!/usr/bin/env node
/** #873 席位页清单生成器（编排者用，一次性）：把「基线五维」＋「逐格缺陷清单症状」＋「册子卡」三份
 *  按格号并起来，按**写集（域）**切好，给每席一节。产物：`docs/skills/skill-chef/t873-席页清单.md`。
 *
 * 用法：node docs/skills/skill-chef/t873-席页清单.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DOCS = join(ROOT, 'docs', 'skills', 'skill-chef');
const LF = String.fromCharCode(10);

const cell = (line) => line.split('|').slice(1, -1).map((s) => s.trim());

// ── ① 基线五维（t873-开工基线.md §一） ──
const base = new Map();
for (const line of readFileSync(join(DOCS, 't873-开工基线.md'), 'utf8').split(LF)) {
  const m = line.match(/^\|\s*(\d+)\s*\|/);
  if (!m) continue;
  const c = cell(line);
  if (c.length < 9) continue;
  base.set(Number(c[0]), { 页名: c[1], 唤醒词: c[2], 五维: c.slice(3, 8).map((x) => x.replace(/\*\*/g, '')), 总分: c[8].replace(/\*\*/g, '') });
}

// ── ② 逐格缺陷清单（症状 ＋ 核实） ──
const defect = new Map();
for (const line of readFileSync(join(DOCS, 't778-逐格缺陷清单.md'), 'utf8').split(LF)) {
  const m = line.match(/^\|\s*(\d+)\s*\|/);
  if (!m) continue;
  const c = cell(line);
  if (c.length < 6) continue;
  defect.set(Number(c[0]), { 症状: c[4], 核实: c[5] });
}

// ── ③ 册子（卡 → 域目录／slug） ──
const manifest = JSON.parse(readFileSync(join(ROOT, '.scratch', 't873', 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const rows = manifest.map((r, i) => ({
  seq: i + 1, 域: r.域, 卡id: r.卡id, 唤醒词: r.唤醒词,
  slug: r.产物绝对路径.split(/[\\/]/).pop().replace(/\.html$/, ''),
  ...(base.get(i + 1) ?? {}), ...(defect.get(i + 1) ?? {}),
}));

const SEATS = [
  { 席: '搜索筛选', 域: 'search', 目录: '搜索筛选', note: '13 页同一份装配件（`docs/skills/skill-chef/t771-run-search.mjs`），一改全动' },
  { 席: '查看', 域: 'view', 目录: '查看', note: '8 页同一份装配件（`src/view/page.ts`）' },
  { 席: '录入', 域: 'add', 目录: '录入', note: '6 页（`src/add/pages.ts` ＋ `t773-run-add.mjs`）' },
  { 席: '做菜', 域: 'cook', 目录: '做菜', note: '5 页（`src/cook/run.ts`）' },
  { 席: '修改', 域: 'update', 目录: '修改', note: '4 页（`docs/skills/skill-chef/t774-run-update.mjs` 自己装配）' },
  { 席: '历史', 域: 'history', 目录: '历史', note: '4 页（`src/history/pages.ts`）' },
  { 席: '数据管理', 域: 'data', 目录: '数据管理', note: '3 页（`src/data/pages.ts`）' },
  { 席: '派生', 域: 'relation', 目录: '派生', note: '3 页（`src/relation/pages.ts`）' },
  { 席: '采购', 域: 'shopping', 目录: '采购', note: '第 35 格（`src/shopping/pages.ts`）＋ 3 个同源变体' },
  { 席: '开始使用', 域: 'setup', 目录: '开始使用', note: '第 45 格（`src/setup/pages.ts`）' },
];

const DIMS = ['信息层级', '双端自适应', '文案精炼', '视觉生动', '风格一致'];
let out = ['# t873 席位页清单（按写集切）', '',
  '由 `t873-席页清单.mjs` 从三份既有读数并出，**不手工维护**：',
  '① 改前五维与总分＝`docs/skills/skill-chef/t873-开工基线.md` §一；',
  '② 扣分项症状＝`docs/skills/skill-chef/t778-逐格缺陷清单.md`（vision 终审原文摘 ＋ 核实列）；',
  '③ 格号／唤醒词／slug＝验收批 `.scratch/t873/manifest.json`（＝册子条目序）。', '',
  '⚠️ 缺陷清单那一列的症状是**首跑口径**的终审原文，与 §一 的冻结尺读数**不同尺**（本尺严约 5 分）；',
  '它只用来**定位该页该动哪儿**，不许拿它当改前分数。分数一律取 §一。', '',
  `| 维度 | ${DIMS.join(' | ')} |`, `|---|${DIMS.map(() => '---').join('|')}|`,
  '| 全批均值（改前） | 17.1 | 17.6 | 15.19 | 13.1 | 16.5 |', ''];

for (const s of SEATS) {
  const mine = rows.filter((r) => r.域 === s.域);
  out.push(`## ${s.席}（写集：${s.note}）`, '');
  out.push('| 格 | 页名 | 唤醒词 | 信息 | 双端 | 文案 | 生动 | 风格 | 总分 | 该页扣分项（首跑口径原文摘） |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of mine) {
    out.push(`| ${r.seq} | ${r.页名} | ${r.唤醒词} | ${r.五维.join(' | ')} | **${r.总分}** | ${r.症状 ?? ''} |`);
  }
  const avg = (mine.reduce((a, r) => a + Number(r.总分), 0) / mine.length).toFixed(1);
  out.push('', `本席 ${mine.length} 页，改前均值 **${avg}**。`, '');
}

writeFileSync(join(DOCS, 't873-席页清单.md'), out.join(LF) + LF, 'utf8');
console.log('写 ' + join(DOCS, 't873-席页清单.md') + '：' + rows.length + ' 格 / ' + SEATS.length + ' 席');
