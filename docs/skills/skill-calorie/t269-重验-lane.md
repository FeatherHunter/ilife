裁决：**PASS —— #{269} 可关闭**。判据 1、3 在本席独立复跑读数上均达成；81 条红里归 #269 的 **0 条**，去掉 #269 后红数 81 → 113 —— 本票是净减红方。

## 机器证据

基线 sha＝`506bdcaba3d51dd257856841c1adb9096966f355`（`git -C D:\ilife rev-parse HEAD`）。检出 `D:\ilife-wt\wf155-a2`（`worktree add -d … HEAD`，detached；收工 `git status --porcelain -- packages/` 为空）。日志在 `.scratch\t269a2\`。

| 判据 | 命令 | 机器读数 |
|---|---|---|
| 3 构建 | `pnpm build` | exit **0**（`tsc -b` 全绿 → `gen-cli --stamp` ok → 7 个插件 `build:client` 全 Done）。上一轮那条 `contract-signatures.ts(390,20) TS2344` 已随 `a185119` 消失 |
| 3 基线 | `pnpm test` | `tests 2384 / pass 2301 / fail 81 / skipped 2`，exit 1；81 条红落 **34 件** |
| 1 复跑 | `node docs/skills/skill-calorie/t269-终验-run.mjs` | exit **0**，读数 **13/13 绿**；逐条字节 70046／71371／69785／69734／69501／69881／69566／69633／69547／70035／69674／70036／69920 —— 与上一轮 13 个数**逐个相同** |
| 3 红件 A／B | 本检出内 `write.ts:85` 去掉 `?? dietReceiptDoc(…)` 一项（＝#269 之前）后重跑 `pnpm test` | A（含 #269）`fail 81`；B（去掉）`fail 113`。**只在 A 红 0 条；只在 B 红 32 条** |
| 5 变异 | 改 `shared\docPage.ts:110` 去掉结尾 `</html>` | `t269-终验-run.mjs` → exit 1，读数 **0/13 绿**（13 条红因均为「未以 `</html>` 收尾」） |
| 5 还原 | `git hash-object` 回 `4b045fee…` ＋ `tsc -b --force` | `t269-终验-run.mjs` → exit 0，读数 **13/13 绿** |
| 6 取证 | `node docs/skills/skill-calorie/t269-重验-waterlog.mjs` | `calorie.water.log`（权威示例 `{"ml":300}`）exit 0，**69814 字节**、首 15 字节 `<!doctype html>`、末 12 字节 `ody>\n</html>`、含 `charset`／`<style`／复制区／读数卡 ⇒ **完整文档**（非片段）。69814 与上一轮 A 侧数字一致 |

口径取证（不裁定）——**当刻是 14 条**：`src/diet/receipt.ts:38-53` 的 `DIET_RECEIPT_KEYS` 为 9 条饮食（`add／batch／copy／remove／remove-by-date／remove-by-range／remove-by-type／update／update-by-date`）＋ **4 条食品库**（`product.add／import／update／deprecate`）＋ 1 条饮水（`water.log`）；票面 13 条＝该 14 条去掉 `water.log`。上一轮写「9＋3＋1」与它自己给的「14 条」不自洽（9+3+1=13）。

红件三分类（规则见 `t269-重验-归因.mjs` 头注）：

- **①归 #269：0 条**。差集读数 `只在 A 红（0）`。这条是**完备**中立化而非抽样：`git show --stat 1f88525` 显示 #269 源码面只有 `src/cli/write.ts`（+7/−1）与 `src/diet/receipt.ts`（新增），而后者全仓只被 `write.ts:49` 一处 import ⇒ 去掉那一项后本票产物整条不可达。
- **②归别的线：81 条（34 件）**——B 侧 113 条是 A 侧 81 条的**超集**，即这 81 条与 #269 无关。件名：`analysis-t5`／`cmd-read-t11`／`cmd-write-40`／`cmd-write-40-persist`／`copy-component-179`／`profile-doc-179`／`t275-营养饮水总览页`／`docpage-printable-448`／`exercise-accept-267`／`fetch-t4`／`help-center-88`／`help-center-106`／`field-labels-449`／`fusion-shared-422`／`home-lock-374`／`render-copy-90`／`softdelete-120`／`sport-homogeneity-109`／`t359-seven-point`／`t440-部位名单一来源`／`t445-告警线门`／`t511-清尾二`／`weight-review-335`／`wizard-86`／`calorie-routing-81`／`calorie-triggers` ＋ `photo-*` 八件；末次改动票号在 90–529 与 T2#21／#478 之间。**33／34 件在近 10 提交内改动次数为 0**（`git rev-list --count 645aa37..HEAD -- <件>`），唯一例外 `exercise-accept-267`（被 `aac39bf` 改）。断言原文（`cmd-write-40-persist.test.mjs:633`）：`calorie.product.deprecate 文案缺「软删除：行保留，已从查询与统计中排除；暂无恢复入口」：已下架：燕麦片（不再出现在搜索和统计里；暂时无法恢复）`。
- **③判据本身陈旧：人工核实 1 条，其余 32 条未分开**。已核实 `field-labels-449.test.mjs:233`（`#449 ④ 标签单源`），断言原文 `运动域标签表登记必须只有一处`，实得 `[diet/fieldLabels.ts, exercise/fieldLabels.ts, weight/fieldLabels.ts, workout/fieldLabels.ts]`。读该件 251–252 行：断言把**全仓**命中集钉成单元素，而设计已按域各长一张表（`exercise` 548b221／`weight` 473dd15／`workout` 8285c15／`diet` **2450e91 fix(496)**，无一是 #269 带来的）⇒ 判据未随扩域更新。其余 32 条：我的字面量抽取在 `actual／expected` 数组渲染上会误取（抽样 3 条全假阳），**不硬塞**。

## 逐条路径

- 报告 `docs/skills/skill-calorie/t269-重验-lane.md`（本件）；可复跑脚本同目录 `t269-重验-reds.mjs`（红件清单／A-B 差集）、`t269-重验-归因.mjs`（三分类）、`t269-重验-waterlog.mjs`（饮水取证）。上一轮 `t269-终验-run.mjs` 原样复用、未改。
- 日志 `.scratch\t269a2\`：`build4.log`（exit 0）、`gen-check.log`、`test-base.log`（A＝81 红）、`test-off.log`（B＝113 红）、`reds-base.json`、`red-attrib4.json`、`attrib4.txt`、`reddiff.txt`、`run13.md`／`run13off.md`／`run13mut.md`／`run13back2.md`、`waterlog.txt`、`tsc-*.log`。
- 临时改过并已还原两件（`git hash-object` 回原值、`git status` 为空）：`src/cli/write.ts` → `540ecba0…`、`src/shared/docPage.ts` → `4b045fee…`；备份 `.scratch\t269a2\*.orig`。

## 缺陷清单

1. **S2（范围外，归 #478／`aac39bf`）**：当刻 master 派生件已走散。`node packages/skill-calorie/scripts/gen-cli.mjs --check` exit **1**：盘上 `routes.generated.ts:85` 为 `--params '{"window":"7d","meal":"早餐"}'`，生成器输出 `'{"window":"7d"}'`；权威声明 `src/home/routes.ts:28` 与生成器一致。`git log -1 -- routes.generated.ts` ＝ `aac39bf`，而 `645aa37` 上该行与生成器一致 ⇒ 走散由 `aac39bf` 引入。**不决定本票裁决**（`pnpm build` 走 `--stamp`，exit 0），但少一面门。另：`8c1d94b` 提交信息写「重生成派生路由总表」，`git show --stat 8c1d94b` 只含 2 个 doc／script 件、未碰该派生件 —— 任务书与上一轮据它认定「派生件已重生成」，与提交内容不符，而 `gen:check` 在当刻 master 上仍红。
2. **S3（归上一轮 lane）**：上一轮把该集的构成写成「9＋3＋1」，与它自己断言的 14 条不自洽（应为 9＋4＋1）。计数不实，方向不错（`water.log` 确在集内、`product.import` 确在集内），对它的 FAIL 结论无影响。
3. **S3（范围外，归 #449 及后续扩域各票）**：`field-labels-449` 的「单源」断言范围是全仓，设计已扩到四域各一张表 ⇒ 该件长期红（见 ③）。

未做项与下一手缺什么：

1. **判据 2 本轮未重跑**。给的是结构论证：`src/diet/receipt.ts:54` 的 `if (!DIET_RECEIPT_KEYS.has(key)) return null;` ⇒ 不在该集的命令一律退回原 `res.html`，故除 `water.log`（14−13 的唯一差项）外其余写命令产物逐字节不变。要坐实仍需一次 33 条 A／B 逐字节复跑。
2. **③类还差 32 条未分开**：需逐件读语义；我的字面量规则在 `expected:`／`actual:` 数组渲染上误取。下一手可换成「按 `git log -S` 找哪次提交删掉了判据要的字面量」。
3. **环境事实**：`D:\ilife` 工作区**不干净**（20 ＋ 件被改，含 `src/diet/receipt.ts`），本席一律未碰，读数全取自 `wf155-a2` 的干净检出。`node_modules` 是指向 `D:\ilife` 的 junction，`pnpm` 依赖自检报 `minimumReleaseAge 已变`，本席以 `pnpm_config_verify_deps_before_run=warn` 旁路（未安装、未清任何目录）。
4. **`tsc -b` 增量陷阱**：还原被改源码后 mtime 变旧，`tsc -b` 会跳过重编、读到旧 `dist`（我第一次还原后误得 0/13）。还原后复跑必须 `tsc -b --force`。
