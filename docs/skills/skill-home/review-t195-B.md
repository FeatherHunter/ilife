# t195 part2 对抗式审查 B（结构纪律与风险）

**裁决：打回（68/100）。** 引用面准确度很高（抽查的近二十处 `04:`／`05:` 行号全部对上），扣分集中在两处结构漏项：门禁改法以「摘名＋补依赖」为终点（不充分），影响清单缺了内容资产整条线。缺陷全是加法式，补齐三条必改项后可复议到 70 线上。

| 项 | 分 | 依据摘要 |
| --- | --- | --- |
| A 目标达成 | 20/30 | 两问只答到一半：门禁与旧件答清了，影响清单漏内容资产线；第二步要的「新件导出几个、各一句」仍写「待定」（part2:32、:66）。 |
| B 事实与证据 | 24/30 | 行号引用几乎全对；错在 :27 与 :28 破处计数自相矛盾、:27 漏生产调用点、:15「没有回归网」措辞过强。 |
| C 纪律合规 | 15/20 | 五步标注全对、开库时机不越票界；铁律四把「待命名」判成「合规」，第四步未披露 350 不是本包数字。 |
| D 风险与缺口 | 9/20 | 漏：空名单假绿、行为面门禁、生成器／摘要锁／禁手改、生成器与 `build-help.mjs` 抢同一注入块。 |

## 1 门禁改法：必要已证实，充分不成立

- 必要 ✅（我读全 `tooling/check-boundaries.mjs`）：`:55` 名单今天只剩 `skill-home`；新件 import `base-paint` 同时撞 `:57-62` 依赖闭包与 `:74-78` 源码扫描，各 1 处、退出码 1（`:80`），part2:38-39 说法成立；「摘名＋加依赖是同一动作的两半」与 `:52` chef 先例注释逐字相符。
- 判据 ✅：`node tooling/check-boundaries.mjs` → `boundaries: PASS`（`:81`）；破界 → `boundaries: N 处破界` ＋ exit 1（`:80`），part2:40 预期输出准确。
- 不充分 ①：摘名后 `:55` 成**空数组** → `:57-62` 循环空转（依赖闭包断言直接消失）、`SRC_SCAN` 为空使 `:78` 退化为恒真，脚本照样打印 `boundaries: PASS`。part2:40 只说到「不再替 skill-home 拦越界」，没说**整段被架空、输出变假绿**，也没给就地摆正动作（`docs/agents/structure.md:68`）。
- 不充分 ②：行为面门禁缺席。`check-boundaries.mjs:32` 自己点名「HTML 产物逐件 sha256 在 `pnpm snapshot:html:check`」；`tooling/skill-html-snapshot.mjs:46` 有 `{ id:'home', dir:'skill-home', fill:'fillTemplate' }`。part2 只在 :27／:39 把快照当「别动 help.html 的理由」，§2 判据未纳入——而 §1.4 又建议微改 help.html，改了就必红，重写前还须过 `skill-html-snapshot.mjs:374` 的 MARKER_ALLOW 显式改＋审查。
- 反向核过（不是拦路项）：`pnpm snapshot:check`（`package.json:16` → `tooling/write-snapshot.mjs:9-17`）只锁 `ilife-skills` 与 `base-combos`，与 skill-home 无关；`pnpm publish:*`（`package.json:22-25`）`--only` 不含 skill-home，虽 `tooling/check-publish.mjs:53-65` 名单含它，故 part2:18「不动发布面」成立。
- 判据补全（一句话）：改完跑 `node tooling/check-boundaries.mjs`（预期 `boundaries: PASS`）＋`pnpm snapshot:html:check`（预期逐件一致，改过 help.html 则须先 `pnpm snapshot:html`）＋`node --test test/scaffold.test.mjs`——05:55 记载该件两个 `it` 跑的正是 `check-boundaries.mjs` 与 `write-snapshot.mjs --check`，即包内 `scripts.test` 早已间接卡门禁。

## 2 旧件影响面：两条核数

- ① `packages/skill-home/package.json`：`:32` 原文 `"test": "node --test ../../test/scaffold.test.mjs"`，part2:17「只跑仓根 scaffold 两件」属实（05:55：该件 14 行、仅 2 个 `it`）；`files` 在 `:16-22`，part2:18「只一条脚本字符串、三条 files 不动」属实。
- ② `grep -rn "help.html" packages/skill-home --include=*.ts,*.mjs,*.json` → **0 命中**：读取面全是按名键间接（05:59-60：`HOME_TEMPLATES:27`、`templateFor→'help':55`、`loadTemplate:62-67`，**生产调用点 `cmd_read.ts:721`**）；快照实物确有 1 条（`tooling/skill-html.snapshot.json:697`）。故 part2:27「三处读它」不完整（漏 `templateFor`／生产调用点），且 :27「同时改测试与快照三处」与 :28「破 1 份测试＋1 份快照」自相矛盾。
- 顺带：part2:15「本票新增行为没有回归网」措辞过强——仓根 `test`（`package.json:13`）本就显式列出 `packages/skill-home/test/*.test.mjs`，part2 自己在 :44 也这么说了。

## 3 铁律判定与必报五步

- 铁律引用属实 ✅：part2:47 指 `04:57-61`，实测正是铁律一–五各一句；与 `structure.md:21-58` 原文一致。
- 铁律四 ❌：part2:52 判「**合规**（待命名结论）」，但新件名与 `src/help/index.ts` 是否加件都还「待定」（:32、:66）；名字未定不能判合规。铁律一／二／五判「有疑问」审慎，可接受。
- 抽件是否够：part2:12 **如实说了**「5 行一支（`:674-678` 实测相符），抽完 741 行仍在告警线之上」✅。但第四步缺一句必需事实：**350 不是本包数字**（04:73／:83：本包无 `AGENTS.md`、包内零命中，350 取自兄弟包），而 `structure.md:70` 要求「数字由各包自己定、写在各包自己的地方」；part2:10 直接拿它触发第四步，未披露来源缺口，也没把「就地定下本包数字」列入动作。
- 五步标注 **全对** ✅：第一步本次要做、第二步本次要做、第三步留待、第四步当场报、第五步留待，与 04:65-69 逐条对得上；:59 的报警话术与 `structure.md:99` 逐字一致。
- 越票界 ✅：`gh issue view 190` 的 Question 明写「该命令在**开库之前**分派（跑完不建 `.db`）」＋「要把『看帮助不许把库建出来』摆正」，与实测 `cmd_read.ts:54-56`（grep 命中 54/55/56）一致；part2:13、:65 把开库时机让给票 7＝一致。小瑕疵：:13 已给「不动 `:55-59`」建议，:65 又把它列回「定不下来」，一件事两处口径松。

## 4 内容资产形态（生成器／摘要锁／禁手改）

- 先例存在 ✅：`packages/skill-calorie/src/triggers/wake-assets.ts` 255362 B、`packages/skill-bill/src/triggers/wake-assets.ts` 38556 B（与 08-calorie-practice.md:7 数字一致）；skill-home 今天**没有** `wake-assets.ts`、也无摘要锁件（`Get-ChildItem -Include` 零命中）。
- **三件都没进 part2 影响清单** ❌：part2:7-34 只列 `cmd_read.ts`／`package.json`／`build-help.mjs`／`help.html`／`src/help` 两件，全篇无生成器、无摘要锁、无「禁手改」。三件在 part1:14,17,42-52／part3:58／part5:10,17／06-precedents.md:53,78 都写了，part2 与它们对不上 ⇒ 影响清单不全（structure.md:76-81）。
- 另一处漏：生成器与 `build-help.mjs` 都要碰 `SKILL.md` 注入块（part5:25 已点），part2:20-23 只当注入块是 `build-help.mjs` 一家的。

## 5 必改项（位置＋动作）

1. `t195-part2-existing-and-gates.md:27-28`：重算读取面（补 `src/render/templates.ts:55`／`loadTemplate:62-67`／`cmd_read.ts:721`）与破处计数，消掉「三处」与「1 测试＋1 快照」的矛盾。
2. `:38-40`：§2 补空名单后 `:57-62`／`:74-78` 被架空的假绿现象＋就地摆正动作；判据纳入 `pnpm snapshot:html:check` 与 `node --test test/scaffold.test.mjs`。
3. `:7-34`：§1 补内容资产线——生成物（路径待定亦可）＋`scripts/gen-help-assets.mjs`（含 `--check`）＋`test/help-assets.test.mjs` 摘要锁＋事实源只读＋禁手改词。
4. `:10`：披露 350 的来源，并把「定下本包告警线数字写进包内」列为动作（`structure.md:70`）；`:52` 铁律四改「待命名，暂不判合规」。

计分口径：以本票正文（`t195-body.md:3`、:18）两问＝第一步影响清单＋第二步结构设计为准，按 part2 对两问的贡献打分；第二步判据要「导出几个、各一句」（`structure.md:85`、04:66），part2 对新件仍留白，故 A 不给高分。
