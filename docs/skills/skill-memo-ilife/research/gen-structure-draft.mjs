// #823 结构规格草案的**件级搬迁映射**：从实测清单出发，逐件给「现位置 → 目标位置 → 理由」。
// 目标形状照卡路里（10 个能力域，每域 index.ts 门／commands.ts 声明／routes.ts 路由）与仓规 structure.md 铁律四
// （能力目录名取自 HELP 一级分组）。
// 跑法：node docs/skills/skill-memo-ilife/research/gen-structure-draft.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const PKG = 'packages/skill-memo-ilife';
const LINE = 350;
function walk(dir, ext, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, ext, out);
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}
const lf = (p) => readFileSync(p, 'utf8').split('\n').length - 1;
const files = [...walk(join(PKG, 'src'), '.ts'), ...walk(join(PKG, 'scripts'), '.mjs')]
  .map((p) => ({ path: relative(PKG, p).replace(/\\/g, '/'), lines: lf(p) }))
  .sort((a, b) => a.path.localeCompare(b.path));

/** 目标位置映射（`*` 通配剩余）。顺序敏感：先具体后通配。第四列＝理由。 */
const RULES = [
  // ── 包门与顶层散件 ───────────────────────────────────────────────
  ['src/index.ts', 'src/index.ts', '包门（导出面按 #703 口径收窄）'],
  ['src/config.ts', 'src/config.ts', '**边界：本图不碰**（与 #760 的分界）'],
  // ── 框架位（保留）───────────────────────────────────────────────
  ['src/cli/*', 'src/cli/*', '框架位：命令解析与分派'],
  ['src/help/*', 'src/help/*', '框架位：HELP 渲染与资产（8 域切片已住 scenes/）'],
  ['src/wish/*', 'src/wish/*（原样保留）', '**已是唯一达标的能力目录**，当样板域'],
  ['src/db/*', 'src/db/*', '框架位：库连接（只读层，禁 DDL）'],
  // ── 构建与探针件（不属 src 树）──────────────────────────────────
  ['scripts/*', 'scripts/*（位置不动）', '构建／探针件，不属 `src/` 树；**超线者另拆（见下）**'],
];
const EXPLICIT = {
  // 顶层散件：超线 614，且是散件 —— 体检项按域归属
  'src/health.ts': '拆到 src/cli/health/*.ts（按体检项分件）',
  // fetch/（11 件，工种名目录）按能力拆
  'src/fetch/db.ts': 'src/db/readonly.ts', 'src/fetch/paths.ts': 'src/shared/paths.ts',
  'src/fetch/errors.ts': 'src/shared/errors.ts', 'src/fetch/index.ts': '（撤，改为各域门）',
  'src/fetch/batch.ts': 'src/shared/batch.ts', 'src/fetch/auth.ts': 'src/sync/auth.ts',
  'src/fetch/feishu.ts': 'src/sync/feishu.ts', 'src/fetch/sentinel.ts': 'src/sync/sentinel.ts',
  'src/fetch/reminders.ts': 'src/remind/store.ts', 'src/fetch/tasks.ts': 'src/wish/tasks.ts',
  'src/fetch/taskWrite.ts': 'src/wish/taskWrite.ts',
  // policy/（7 件，工种名目录）按能力拆
  'src/policy/category.ts': 'src/memo/category.ts', 'src/policy/crud.ts': 'src/memo/crud.ts',
  'src/policy/media.ts': 'src/memo/media.ts', 'src/policy/reminder.ts': 'src/remind/policy.ts',
  'src/policy/wakewords.ts': 'src/triggers/wakewords.ts', 'src/policy/wish.ts': 'src/wish/policy.ts',
  'src/policy/index.ts': '（撤，改为各域门）',
  // render/（7 件）：共用件留框架位，页面件按域拆
  'src/render/envelope.ts': 'src/shared/envelope.ts', 'src/render/errors.ts': 'src/render/errors.ts',
  'src/render/html.ts': 'src/render/html.ts', 'src/render/index.ts': 'src/render/index.ts',
  'src/render/templates.ts': 'src/render/templates.ts',
  'src/render/pages.ts': '按域拆：各域 pages.ts（三形状各一份共用件 ＋ 域参数）',
  'src/render/pageAssets.ts': 'src/shared/pageAssets.ts（自持 CSS 的去向由 #824 裁）',
  // cli/ 的超线件
  'src/cli/cmd_read.ts': 'src/cli/{readArgs,delivery,registry}.ts ＋ 各域 commands.ts／routes.ts',
  // scripts/ 的超线件
  'scripts/gen-help-assets.mjs': '拆：声明表抽成数据件 ＋ 生成器瘦身（暂住 scripts/help/）',
};
const REASON = {
  'src/health.ts': '且是顶层散件 —— 体检项本身按域归属，不该挤在一个 614 行的散件里',
  'src/cli/cmd_read.ts': '分派器是框架位，域逻辑（commands／routes）应搬回各域',
  'scripts/gen-help-assets.mjs': '声明表与生成逻辑应分开（表抽成数据件）',
  'src/fetch/index.ts': '工种名目录的转发门，各域有了自己的 index.ts 之后多余',
  'src/policy/index.ts': '同上',
  'src/fetch/db.ts': '库连接属框架位（`src/db/`），不该住 `fetch/` 这个工种名目录',
  'src/policy/wakewords.ts': '唤醒词表是**生成物的源**，归 `triggers/`（与路由同处）',
  'src/render/pages.ts': '**同一件事一处定义**：三形状各一份共用件，各域只给参数',
  'src/render/pageAssets.ts': '自持 CSS 的去向由 #824 裁定；先归共用位',
};

const rows = files.map((f) => {
  let target = EXPLICIT[f.path];
  let rule = '';
  if (!target) for (const [pat, tgt, why] of RULES) if (pat.endsWith('*') ? f.path.startsWith(pat.slice(0, -1)) : f.path === pat) { target = tgt; rule = why; break; }
  const base = REASON[f.path] ?? rule ?? '';
  const overNote = f.lines > LINE ? '**超线 ' + (f.lines - LINE) + '**（' + f.lines + '／' + LINE + '）' : '';
  const why = [overNote, base].filter(Boolean).join('；') || '按域或按角色归位';
  return { ...f, target: target ?? '**待定（草案漏项）**', why };
});
const undecided = rows.filter((r) => r.target.includes('待定'));
const over = rows.filter((r) => r.lines > LINE);

const L = [];
L.push('# #823 结构规格 · 草案（本图最大一张票的预填）');
L.push('');
L.push('**性质**：**草案，不是决议**。#823 本体被 [命令面四问 #837](https://github.com/FeatherHunter/ilife/issues/837) 阻塞；这一页把**不依赖那四问**的部分先做实，让 #837 一关就能快速收口。');
L.push('');
L.push('**生成器**：`docs/skills/skill-memo-ilife/research/gen-structure-draft.mjs`（件级映射由实测清单生成，可重跑）。');
L.push('');
L.push('## 一 目标 `src/` 树（照卡路里的形状 ＋ 仓规铁律四）');
L.push('');
L.push('```');
L.push('src/');
L.push('  index.ts                包门（导出面收窄）');
L.push('  config.ts               ★ 边界：本图不碰');
L.push('  memo/                   备忘域（HELP 一级分组）');
L.push('  search/                 查找域');
L.push('  remind/                 提醒域');
L.push('  wish/                   心愿域（**已是达标样板，原样保留**）');
L.push('  checkin/                打卡域');
L.push('  mood/                   情绪域');
L.push('  sync/                   同步域（飞书链）');
L.push('  init/                   初始化域');
L.push('  shared/                 跨域共用件（信封／路径／错误／批量／页资产）');
L.push('  render/                 渲染框架位（html／templates／errors／index）');
L.push('  cli/                    命令解析与分派框架位（readArgs／delivery／registry／health）');
L.push('  help/                   HELP 渲染与资产（scenes/ 8 域切片已在此）');
L.push('  db/                     库连接（只读层，禁 DDL）');
L.push('  triggers/               唤醒词表与路由（**生成物的源**）');
L.push('```');
L.push('');
L.push('**每个域目录的最小三件**（照卡路里）：`index.ts` 门 ＋ `commands.ts` 声明（恰好导出一个数组）＋ `routes.ts` 路由；有页面的域另加自己的页面件与文案件。');
L.push('');
L.push('## 二 件级搬迁映射（实测 ' + rows.length + ' 件逐条）');
L.push('');
L.push('| 现位置 | LF | 目标位置 | 理由 |');
L.push('|---|---|---|---|');
for (const r of rows) L.push('| `' + r.path + '` | ' + r.lines + ' | ' + r.target + ' | ' + r.why + ' |');
L.push('');
L.push('## 三 自检：草案覆盖全了吗');
L.push('');
L.push('- 件数：实测 **' + rows.length + '** 件；映射表 **' + rows.length + '** 行 ⇒ 无遗漏' + (undecided.length ? '（**但有 ' + undecided.length + ' 件待定**）' : '，**无待定项**') + '。');
L.push('- 超线件：**' + over.length + '** 件（' + over.map((r) => r.path + ' ' + r.lines).join('；') + '）');
L.push('');
L.push('## 四 机器门与行数门（草案建议）');
L.push('');
L.push('| 门 | 照哪一件 | 守什么 |');
L.push('|---|---|---|');
L.push('| 命令登记生成 | 卡路里 `scripts/gen-cli.mjs` / `gen-routes.mjs` | 各域 `commands.ts` → 全局命令表与唤醒词表**派生**，不许手写第二份 |');
L.push('| 生成物一致性 | 仓根 `pnpm gen:check` | 生成物与源不一致即红 |');
L.push('| 命令自治自证 | 卡路里 `t293-验收-命令自治.mjs` | 每条命令都有登记、无 UNACCOUNTED |');
L.push('| 行数台账 | 卡路里 `scripts/check-warning-line.mjs` | 本包告警线 **350 ＋ LF**，台账住包 `AGENTS.md` |');
L.push('| 棘轮 | 卡路里 `test/cmd-registry-294.test.mjs` | 冻结当前读数，**只许变短** |');
L.push('');
L.push('## 五 搬迁批次（每批硬判据：编译绿 ＋ 产物字节不变）');
L.push('');
L.push('1. **批次 0 建骨架**：只建目录与三件空壳，不动任何逻辑；全量测试绿。');
L.push('2. **批次 1 样板域**：`wish/` 已是达标形状，先把它对齐到「三件 ＋ 页面件」的目标形状，作为后续各域的样板。');
L.push('3. **批次 2 拆框架位**：`cli/cmd_read.ts`（569 行）拆成 `readArgs`／`delivery`／`registry`；`health.ts`（614 行）按体检项分件。');
L.push('4. **批次 3+ 逐域搬家**：一次一个域，搬完即跑门；**每批产物字节不变**（照 #704 的批次搬家口径）。');
L.push('5. **收尾**：撤 `src/policy/index.ts` 的转发、收窄包门导出、补行数台账。');
L.push('');
L.push('**并发**：批次 3+ 的逐域搬家**天然可按域并行**（写集互斥），但**同一时刻只能有一批在跑编译与生成物重导**（走 `run-locked.mjs`）。');
L.push('');
L.push('## 六 本草案**不**覆盖的（等 #837 的四问）');
L.push('');
L.push('- `init/` 域要不要**新开一条命令**（④）、`search/` 的 `timeRange` 参数形状（⑤）、`remind/` 的 `noteId` 通道（⑥）、`memo.remove` 的 `confirm` 约定（⑦）—— 这四条决定**命令表里有几行、参数面长什么样**，是 #823 的输入而非目录形状。');
L.push('- 自持 CSS（`src/render/pageAssets.ts`）的去向 —— 由 [#824](https://github.com/FeatherHunter/ilife/issues/824) 裁。');
L.push('- 产物名与份数 —— 由 [#822](https://github.com/FeatherHunter/ilife/issues/822) 裁。');
writeFileSync('docs/skills/skill-memo-ilife/t823-结构规格-草案.md', L.join('\n'), 'utf8');
console.log('件数 ' + rows.length + '；待定 ' + undecided.length + '；超线 ' + over.length);
if (undecided.length) for (const u of undecided) console.log('  待定：' + u.path);
