// #823 结构清账：把 packages/skill-memo-ilife 的 src/ 与 scripts/ 逐件量出来。
// 口径：LF 口径只数 \n（包内 AGENTS.md 定的告警线算法）；告警线 350。
// 跑法：node docs/skills/skill-memo-ilife/research/inventory-memo-src.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const PKG = 'packages/skill-memo-ilife';
const LINE = 350;

/** 递归收集 .ts（src 下）与 .mjs（scripts 下）。 */
function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, ext, out);
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

const lf = (p) => readFileSync(p, 'utf8').split('\n').length - 1;
const files = [...walk(join(PKG, 'src'), '.ts'), ...walk(join(PKG, 'scripts'), '.mjs')]
  .map((p) => ({ path: relative(PKG, p).replace(/\\/g, '/'), lines: lf(p), bytes: statSync(p).size }))
  .sort((a, b) => b.lines - a.lines);

const over = files.filter((f) => f.lines > LINE);
const byDir = {};
for (const f of files) {
  const d = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '(顶层散件)';
  (byDir[d] ??= []).push(f);
}

const totalLines = files.reduce((a, f) => a + f.lines, 0);
const lines = [];
lines.push('# #823 结构清账：`packages/skill-memo-ilife` 逐件读数');
lines.push('');
lines.push('**谁读**：[结构规格 #823](https://github.com/FeatherHunter/ilife/issues/823) 开工前先读。这一页只给**读数**，不给结论 —— 目标形状怎么定是本票的事。');
lines.push('');
lines.push('**怎么量**：LF 口径（只数 `\\n`，与包内 `AGENTS.md` 定的告警线算法同口径）；范围＝`src/**/*.ts` ＋ `scripts/*.mjs`（**不算** `templates/*.html`／`SKILL.md`／`test/*.mjs`／`dist/`，那几类 `structure.md` 划在管辖外）。');
lines.push('');
lines.push('**生成器**：`docs/skills/skill-memo-ilife/research/inventory-memo-src.mjs`（可重跑）。');
lines.push('');
lines.push('## 一 总量');
lines.push('');
lines.push('| 项 | 读数 |');
lines.push('|---|---|');
lines.push('| 件数 | **' + files.length + '** |');
lines.push('| LF 合计 | **' + totalLines + '** |');
lines.push('| 告警线（本包 350 ＋ LF） | **' + LINE + '** |');
lines.push('| **超线件** | **' + over.length + '** |');
lines.push('| 超线件 LF 区间 | ' + (over.length ? over[over.length - 1].lines + ' – ' + over[0].lines : '—') + ' |');
lines.push('');
lines.push('## 二 超线件逐条（超线即触发必报五步第四步）');
lines.push('');
lines.push('| 件 | LF | 字节 | 超线 |');
lines.push('|---|---|---|---|');
for (const f of over) lines.push('| `' + f.path + '` | **' + f.lines + '** | ' + f.bytes + ' | +' + (f.lines - LINE) + ' |');
lines.push('');
lines.push('## 三 逐目录清账');
lines.push('');
lines.push('| 目录（`src/` 下相对路径） | 件数 | LF 合计 | 最大件 | 最大件 LF |');
lines.push('|---|---|---|---|---|');
const dirs = Object.entries(byDir).sort((a, b) => b[1].reduce((x, f) => x + f.lines, 0) - a[1].reduce((x, f) => x + f.lines, 0));
for (const [d, fs] of dirs) {
  const sum = fs.reduce((a, f) => a + f.lines, 0);
  const max = fs[0];
  lines.push('| `' + d + '/` | ' + fs.length + ' | ' + sum + ' | `' + max.path.split('/').pop() + '` | ' + max.lines + ' |');
}
lines.push('');
lines.push('## 四 全部件（按 LF 降序）');
lines.push('');
lines.push('| 件 | LF |');
lines.push('|---|---|');
for (const f of files) lines.push('| `' + f.path + '`' + (f.lines > LINE ? ' ⚠️' : '') + ' | ' + f.lines + ' |');
lines.push('');
lines.push('## 五 判结构合不合规，要照的尺');
lines.push('');
lines.push('- `docs/agents/structure.md`：五条铁律（尤其**铁律四：能力目录名取自 HELP 一级分组**）＋ 结构标准 ＋ 必报五步。');
lines.push('- 对照样板：`docs/skills/skill-memo-ilife/research/calorie-architecture-reference.md`（卡路里 **10 个能力域**，每域 `index.ts` 门 ＋ `commands.ts` 声明 ＋ `routes.ts` 路由；最小能力目录 **3 件**）。');
lines.push('- **备忘录今天只有 `src/wish/` 一个目录是按 HELP 一级分组切的**（其余 `cli`／`config`／`fetch`／`health`／`help`／`policy`／`render` 是工种名或框架位）。');
lines.push('- 备忘录的 8 个域（HELP 一级分组）：`memo`／`search`／`remind`／`wish`／`checkin`／`mood`／`sync`／`init`。');
lines.push('');
lines.push('## 六 这一页**不**回答的（归 #823）');
lines.push('');
lines.push('- 目标 `src/` 树长什么样、8 个域目录各放什么。');
lines.push('- 共用位（`shared`／`render`／`cli`／`triggers`／`fetch`／`db`）怎么切。');
lines.push('- 命令登记与机器门装哪几道。');
lines.push('- 超线件拆不拆、拆到哪一层、搬迁分几批。');

writeFileSync('docs/skills/skill-memo-ilife/t823-结构清账.md', lines.join('\n'), 'utf8');
console.log('件数 ' + files.length + '；LF 合计 ' + totalLines + '；超线 ' + over.length + ' 件');
for (const f of over) console.log('  超线 ' + f.lines + '  ' + f.path);
