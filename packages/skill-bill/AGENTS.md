# skill-bill 包内规矩

本包的结构形状照仓规 `docs/agents/structure.md`（五条铁律、结构标准、能力目录形状、必报五步）；这里只多记一条本包自己的数字。

## 文件行数告警线

**告警线＝350 行。数法：LF 口径，只数 `\n`。**

- 范围：本包 `src/**/*.ts` 与包内 `scripts/**/*.mjs`。
- **生成物不算**——剔除名单只认生成器自己的输出声明（`scripts/gen-*.mjs` 里名字带 `OUT`／`TARGET(S)`／`DST`／`DEST`／`GEN…` 段的 `const <名> = join(SRC_DIR, …)`，与 `targets` 数组里的 `path: join(SRC_DIR, …)`），**不手写一份会过期的名单**；判据一条输出声明都抽不到即红。当前剔出两件：`src/triggers/wake-assets.ts`（`scripts/gen-wake-assets.mjs` 生成）、`src/cli/registry.ts`（`scripts/gen-cli.mjs` 生成）——重跑 `pnpm gen` 改它们不会逼无关的票来同步台账。**手写件 `src/render/helpFile.ts` 仍在扫描面内**：它 import 内容资产，但本身是人写的装配逻辑（「谁生成」才算生成物，「谁 import 生成物」不算），人改了它就照常挂号。
- 不算：`templates/*.html`（页面模板）、`SKILL.md`（说明面）、`test/*.mjs`（测试文件）、`dist/` 与 `.tsbuildinfo`（构建产物）——`structure.md` 的「管辖」一节已把它们划在外面。
- **生成器链与它的一条机器前提**（#686）：包内 `pnpm gen`／`gen:check` 覆盖本包两个生成器——`scripts/gen-cli.mjs`（写 `src/cli/registry.ts`；内容印记 `dist/.gen-inputs.json` 由 `pnpm build` 的 `--stamp` 写）与 `scripts/gen-wake-assets.mjs`（写 `src/triggers/wake-assets.ts`）；仓根 `pnpm build`／`pnpm gen:check` 已把本包收进链（CI 的 `pnpm gen:check` 那一步真跑）。**前提记一句**：wake-assets 的**事实源在仓外**（老技能目录，机器本地）——事实源不在盘的机器上 `--check` 会**明打一行 `WAKE-ASSETS SKIP` 后放行（exit 0）**，不静默当绿；但那种机器上手改 `wake-assets.ts` 不会被 `gen:check` 抓住，改词必须回事实源在盘的机器上跑生成器（`registry.ts` 那一支不受影响：它读的是本包编译产物）。
- 超线即触发必报五步的**第四步**：当场报一句「已超线，需要根据规则进行重构。」，后头接一句为什么超，再给拆法或说明这次为什么先不拆。**超线是报警，不是拦路。**

暂定：本数照兄弟件同数取 350，**待维护者确认**。

口径出处：**兄弟件同数、同落点**——`packages/skill-calorie/AGENTS.md` 与 `packages/skill-chef/AGENTS.md` 都写「350 行 ＋ LF 口径」，那两个数出自用户答复（私家大厨那张图的 Q4b，逐字「`350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`」，载 `docs/skills/skill-chef/map-chef-body.md:197`／`:212`）。本包此前没有这一条，`t406-复核-结构纪律对账.md` 第三节第 1 条把当时借来的读数记为「数字来源可追、与兄弟件同数，是过渡期唯一可用的口径」——这一件即是把那个落点补上；**本包自己的数字由维护者定，未定之前按上面那句暂定办**。

## 台账两种口径（别混用）

- **挂号值**＝**第一次挂号时**写的 LF。它是历史事实（那时确实超线），**永不回改**；本包的登记原文逐字记在 `t406` 那张表里，冻结值是 `src/cli/cmd_read.ts｜558`（那个读数由 `packages/skill-bill/AGENTS.md` 里 t406 那张表逐字给出，是该票当期的历史记录，按「地址随实况、历史不改」逐字不动）。检查脚本只核对这个冻结值**没被改写**，不拿它跟实况比。从未挂号过的件记 `—`。
- **当场实测**＝**当刻盘上**数出来的 LF，节点口径 `readFileSync(f,'utf8').split('\n').length - 1`。台账表里**只有这一列**是 `scripts/check-warning-line.mjs` 拿来对实况的：与实况不等即红（这就是「台账陈化」）。
- 某个件的 LF 掉回 350 以内：**挂号行不删**（挂号值仍是历史事实），但「当场实测」列要跟着实况改，结论列写明「已落回线内、不再触发第四步」。

## 台账（`check-warning-line.mjs` 的解析源）

下表是本包告警线的**唯一台账**：`件`＝扫描面内的文件；`挂号值`＝首次挂号时的 LF（从未挂号记 `—`）；`当场实测`＝本表成文当刻的 LF（脚本核对的就是这一列）；`结论`＝超线原话＋超因＋拆法或「本次先不拆」的理由。**改这张表就是改台账；表外别处不再写行数**（免得两处走散）。

<!-- warning-line-ledger:begin -->
| 件 | 挂号值 | 当场实测 | 结论 |
|---|---|---|---|
| `src/cli/cmd_read.ts` | 558 | 501 | 已超线，需要根据规则进行重构。超因：一个文件装全部命令分派 ＋ argv 解析 ＋ envelope 打印 ＋ HELP 交付装配（**既有超线件**，`t406-复核-结构纪律对账.md` 第五节与 `t406-实施证据.md` 第五节都已正面报警）。拆法＝按域拆分派，属「读命令搬迁」那张后票。挂号值 558＝首次挂号当刻的读数，历史事实、不回改。**本次先不拆**：结构重排不在 #686 写集（本票只立门与台账、不动任何件源码）。 |
| `src/health.ts` | — | 486 | 已超线，需要根据规则进行重构。超因：配置体检那条只读命令的**三摊活**同处一件——① 受限子集配置解析器（`ConfigRead`／`readBillConfigReadOnly`／`presentKeysOf`／`parseSubset`／`parseScalar`／`projectOnDefaults`，约一百九十行）② 目录与库的探针（`writeProbe`／`dirVerdict`／`tableCount`，约六十行）③ 七条体检判据的整份报告装配（`buildBillHealthReport`，约一百六十行）。拆法＝按这三摊切三件姊妹件：解析器另立 `src/healthConfig.ts`、探针另立 `src/healthProbe.ts`，报告装配留本件，出口经 `src/index.ts` 薄转出。**本次先不拆**：本件是 #706 刚落地的配置体检，六家面板的读数判据还在靠它对齐，窗口内大搬会把「判据住技能侧」这条口径搅成两条变更的合成读数；待收口票认领。挂号值 `—`＝从未挂号过（t406 与 #411 两张表的超线件清单里都没有它）。 |
| `scripts/check-warning-line.mjs` | — | 363 | 已超线，需要根据规则进行重构。超因：本件照抄兄弟件 `packages/skill-calorie/scripts/check-warning-line.mjs`（356 行）的形状，落成五摊活——扫描面遍历、生成物按生成器声明剔除、台账解析与逐件对账、`--sync` 同步器、主入口与报告，判据 ①～⑧ 另加两条自证；建件当刻就 363 行。**它自己也在本包告警线的管辖里，上面那条 `OVER` 就是本门对自己的一次读数**（自证这道门不是只照别人）。拆法＝按判据族切姊妹件（① 扫描面遍历与生成物剔除 ② 台账解析与逐件对账 ③ 同步器与同步断言 ④ 主入口与报告），出口留本件薄转出。**本次先不拆**：拆分不在 #686 写集，且这道门正在被本票当场收敛（`--sync` 回绿那条路必须一次成形），同一窗口里再搬件会把「红→绿」这条读数变成两次编辑的合成。挂号值 `—`＝建件即挂号，首次读数就是上表「当场实测」列。 |
<!-- warning-line-ledger:end -->

## 本包现状（机器对账，不再手抄行数）

上一版这里是**两张人手抄的行数表**（「本包现状（2026-09-15 t406 整改实测）」「#411 查询骨架后复测」）。它们已删——病就是陈化：两张表抄的读数在成文当刻就已经对不上实况（表里说超线两件，实况另有件越过了 350），此后每次改件都要人来重抄一遍，而没人重抄时表面上仍然是绿的。**逐件行数只住上表「当场实测」列**；要看当刻读数，跑一次门禁即可（它会把超线件逐条打 `OVER` 行）。

`src/triggers/wake-assets.ts` 由「**历史挂号件**」变成「**生成物自动剔除**」，所以它的冻结行不再存在——**这不是删账**：t406 那张表逐字记的挂号读数 986 是历史事实（那时它确实超线），而它现在的行数由 `scripts/gen-wake-assets.mjs` 决定、重跑 `pnpm gen` 就会变，再对它挂号只会逼无关的票来同步台账。它的行数不进台账，也不进「挂号值」这一列。

## 检查脚本

`packages/skill-bill/scripts/check-warning-line.mjs`：

- **绿**＝台账齐全**且**与实况逐件一致：`exit 0`、`RESULT: n/n`、`PASS: 告警线台账齐全且与实况一致`。
- **红**（`exit 1`）五种，都在输出里点名，末段直接给修法（`修法：node packages/skill-bill/scripts/check-warning-line.mjs --sync`）：
  - `RED 漏报（台账没有）：<件> LF=<n>`——盘上超线了却没进台账（新增件、或把某件撑过 350）；
  - `RED 台账陈化：<件> 台账=<a> 实况=<b>`——台账「当场实测」列与实况不等；
  - `RED 台账件在扫描面内不成立：<件>`——台账点名了不在扫描面内的件（改过名／搬过家／后来判成生成物）；
  - `RED 台账缺行：<件>`／`RED 挂号值被改写：<件>`——删台账任意一行、或改写冻结挂号值（登记原文起的负向对照）；
  - `RED 生成物判据自证`／`RED 生成物印记已认领：<件>`——生成物剔除法的自证（见「文件行数告警线」那节的判据）。
- **回绿＝跑同步器，不用手改数**：`node packages/skill-bill/scripts/check-warning-line.mjs --sync`
  ——「当场实测」列照当刻 LF 改、超线件补新行（挂号值 `—`，结论列写明「超因与拆法待补」）、不在扫描面内的行剔、冻结行缺了补回；**先加 `--dry` 只演练**（打印 `SYNC-PLAN 改=／增=／删=` 与逐条 `SYNC-CHANGE／ADD／DROP`，不落盘）。
  同步器只改 `begin/end` 之间那块表（落盘前断言块外前后缀逐字节相同、断言全过才落盘；落盘后回读自证打 `SYNC-VERIFY ok`）。
- **改了超线件、或新增／删除扫描面内的件，就必须同步这张台账表**，否则本门必红。这是设计行为（本门要的就是「台账不随实况更新即报警」），不是误报。
- 复跑：`node packages/skill-bill/scripts/check-warning-line.mjs`；夹具与变异可用 `--root`／`--agents` 指另一份包根与另一份 AGENTS.md（真实门禁**一律无参运行**，脚本会打印 `SCAN-ROOT:`／`LEDGER:` 两行供认口，剔出的生成物逐条打 `GENERATED-SKIP`）。本脚本**不提供**关掉扫描面的开关——缩面＝放宽。
- 测试：`packages/skill-bill/test/t686-告警线门.test.mjs`（漏报必红／陈化必红／还原必绿／缩面失明／生成物剔除与自证／同步器 `--dry` 不改文件 ＋ `--sync` 回绿／真包无参门禁的绿读数）。

## 发布（npm 官方源，交互式 wizard）

- 技能发版脚本：`scripts/wizard-publish.sh` —— 发 `base-paint@0.3.2`（前置：registry 旧版缺 `save-html` 导出，不先发技能装上就崩）＋ `skill-bill@0.2.0`（402 写入 16 词 ＋ 403 查询 17 词）。
- 插件发版脚本：`packages/plugin-bill-ilife/scripts/wizard-publish.sh` —— 发 `dsh-bill-ilife@0.2.0`。它住插件自己的目录（发谁的包，脚本就住谁的家）；硬前提是技能已落 registry（插件精确 pin 技能版本，先发插件会装到旧技能，wizard 第 1 stage 自动拦）。
- 跑法（必须 Git Bash，脚本必须 LF；发布命令绝不重定向输出，否则 stdout 非 TTY 会直接 EOTP —— 见 `SKILLS/npm-publish/SKILL.md` §4；OTP 不进聊天，见该 §4 铁律）：
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/skill-bill/scripts/wizard-publish.sh`（先跑，2 包，人扫码）
  - `"C:\Program Files\Git\bin\bash.exe" D:/ilife/packages/plugin-bill-ilife/scripts/wizard-publish.sh`（后跑，1 包，人扫码）
- 两脚本只做“前置门＋登录＋打包预检＋发布＋验证”，版本号定死在脚本头（对不上即停，不在脚本里改版本）；发完由编排者收口 G3 安装态断言 ＋ `check-publish --post`。
