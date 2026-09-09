# #82 对抗式审查报告（单席兼红蓝 · 独立复跑）

> 被审：`d719197`（交付）／`94f1785`／`093a9b4`／`621ecd9`（证据）。审查起点 HEAD `621ecd9`；审查中他票提交 `5a0dc02`／`867536b`（不影响本票 blob）。
> 事故面：`packages/skill-calorie/SKILL.md` 全程 `size=30052`／首 3 字节 `2d 2d 2d`／零 NUL／`sha256=92B0D380…`／`git hash-object=7433560f…`，**改动前后与每次还原后同值**。

## ① 独立复跑清单（全部我自己跑，不采信自证）

| 命令 | runId | exit／结果 |
|---|---|---|
| `node docs/research/t82-verify-triggers.mjs` | —（只读） | 0／`RESULT: 69/69` |
| `node docs/research/t82-check-description.mjs` | — | 0／`9/9` |
| `node docs/research/t82-check-integrity.mjs` | — | 0／`8/8` |
| `node docs/research/t82-check-acceptance3.mjs <我的快照>` | — | 0／`9/9` |
| `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` | `0f9727b0`／`ab9f8d6c`／`06b884de`／`ed08abed` | 逐条 **0** |
| `pnpm help:examples:check` | `d6913939` | **0**／`RESULT: 99/99` |
| `node …/build-help.mjs`（验收③重建） | `bdfcb6d3` | 0／整文件 blob 前=后=`7433560f…` |
| 靶向 5 文件 `node --test …` | `f08a783b` | 1／`tests 32 pass 31 fail 1`，唯一红＝`FX-81-5`（基线白名单内） |
| canonical `pnpm test`（1 轮） | `7bf7c9bd` | 1／`tests 1124 pass 1097 fail 27` |

（第一轮 canonical／靶向日志 `rev82-C-targeted.log`／`rev82-D-canonical.log` 在批次结束后被**外部删除**，故重跑一轮并双点落盘；见 ⑦-6。）

## ② 功能角（核心）

- **「卡路里HELP」入口可用性**：模型实际看到的一行（我按宿主 `catalogDescription` 真函数渲染）＝
  `- \`skill-calorie\`: 「卡路里HELP」→calorie.help.center 出完整速查台；唯一出口 calorie-cmd-read。触发词：…`（518 字符）。
  三要素齐备：唤醒词「卡路里HELP」@1、键 `calorie.help.center`@10、唯一出口 `calorie-cmd-read`@42。**只读 description 可命中**（词→键→出口三步都在同一行），但**不是逐字命令**：`calorie-cmd-read calorie.help.center` 需由「唯一出口」推 argv 形态；正文 `SKILL.md:10` 给逐字命令。按编排者收口口径（「`description` 触发 ＋ 正文给命令」）**满足**；判 S3-1。
- **69 项逐字**：我自算（旧基线 frontmatter 按 `、` 切分）＝**69**，新 description 段内 `、`＝**68** → 69 项，**唯一无重复**，元素级同序 **69/69**（首项 `看今日主页`、末项 `本月复盘`）；与 `docs/research/t71-old-baseline-inventory.md:20/51` 的 69 口径一致。
- **499 与 500 截断**：从 `dsh-tool-skill/lib/index.js` **抽 `catalogDescription` 函数体 eval**（不手抄）：`normalized.length=499 ≤ 500` → **原样返回，未截断**；对手造 509 字符输入，真函数＝`slice(0,497)+'…'`（与手工口径一致）。截断态下三要素仍在（@1／@10／@42）。尾部触发词 `本月复盘`@495 → **余量仅 4 字符**；再长 4 字符即切尾。原始行 514 字符（含 `description: ` 与引号）——宿主截断的是**解析值 499**，不是原始行。

## ③ 契约角

- **真解析器双证**：`packages/plugin-calorie/dist/skill-provider.js` 的 `parseSkillText` 与宿主 `dsh-skill-filesystem` 用的真 `yaml` 解析器，对最终 frontmatter **同值**（`name=skill-calorie`／`description.length=499`）；frontmatter 恰 2 行、逐行 `key: value`。
- **引号／换行**：`description` 无半角 `"`、无半角 `,`、无 `: `（全角 `：` 不计），单行无换行 → 两解析器均不破；未转义引号风险仅在未来去掉外层引号时出现（`yaml` 对 `a: b: c` 抛 `Nested mappings…`，已实测）。
- **`HELP-AUTO` 块零改动（我自算三段）**：块内 15,645 字符与 **HEAD** 及**改动前 blob `51bcf2cf…`** 逐字相等；块外前缀 5,214→5,964、块外后缀 1,511→1,682（确为块外改写）；两枚标记各恰 1 次。重建幂等（blob 前=后）。
- 正文新增 HELP 节的口径与实现逐条对齐：`cmd_read.ts:784` 缺省 `mode='file'`、`:772-774` `q`＋`mode` 互斥 exit 2、`:786` 非法 mode exit 2；436 场景／54 子功能／10 分组由 `help-center-88/91.test.mjs` 断言。

## ④ 不回归

- `#47 skills-export` 3/3、`skill-t11` 9/9、`calorie-c43` 7/7、`#56 provider` 5/5 **全绿**；唯一红 `FX-81-5` 在基线白名单内。
- `routing.ts`／`src/**`／`test/**`／`templates/**`：四提交 `git diff --stat` **空**（零改动）；实际改动面＝`SKILL.md`＋`docs/research/t82-*`＋`.changeset/t82-skill-facade.md`。
- canonical delta（`t101-fail-set`）＝`base=34 after=32 新增=3 消失=5`。新增 3 条＝`#121 产出面（静态）`／`S3 copied 态 CSS 命中面齐全`（`packages/base-render/test/copy-copied-121.test.mjs`）＋`#87 ⑥b stat 形状逐键生效`（`packages/skill-calorie/test/output-naming-87.test.mjs`）；两文件**不读 `SKILL.md`**（其 `SKILL` 命中全是 `SKILLS_DB_PATH`／旧基线路径），且我复跑该两文件 **24/24 pass exit 0** → **瞬时红，非本票因果**（S3-4）。

## ⑤ 变异复核（独立重跑，红→持锁还原→绿＋sha）

| 变异 | 应红门 | 实测 | 还原 |
|---|---|---|---|
| MUT-82-1 块标量 | `skills-export`＋`#56` | exit 1／`fail 3`：`frontmatter 行须为 key: value：  卡路里一期…`＋provider 两条 | sha=`92B0D380…`／blob=`7433560f…`；复绿 `8/8` |
| MUT-82-2 删 AUTO 一行 | `help:examples:check` | exit 1：`产物不新鲜`／`98 != 99`／`缺示例行 calorie.diet.add` | 同上；复绿 `99/99` |
| MUT-82-3 删「卡路里HELP」 | 本票探针 | exit 1／`6/9`（`RED 含 卡路里HELP`／`RED 含 calorie.help.center`／`RED 截断后…`） | 同上；复绿 `9/9` |

## ⑥ 自设新探针（打盲区）

- **a. 含 `:`／`,` 是否破解析**：引号内注入半角 `: `＋`,` → repo 与 `yaml` 两解析器均**逐字回环**（PASS）；现网形态全角标点回环 PASS；去引号后 `yaml` 抛错（潜在风险，PASS 记为已知）。
- **b. 触发词错一字（鉴别力）**：`看今日主页`→`看今日主頁`（仅 description 行）→ `check-description` **红**（`#1 旧="看今日主页" 新="看今日主頁"`）；而 `t82-verify-triggers.mjs` **仍绿 `69/69`** —— 该脚本**根本不读新 `SKILL.md`**（输入只有旧基线＋SoT＋routing），对 description 逐字零鉴别力（S3-2）。还原后双绿。
- **c. `#124` 现场字节扫描**：首 3 字节 `2d 2d 2d`、零 NUL、无 BOM、UTF-8 有效、LF-only、以换行收尾（PASS）。
- **d. 宿主真截断函数**：从宿主源码抽函数 eval（见 ②），并证 499 未被截断、超长时口径一致。
- **e. 活会话落地**：四处已安装副本（`.dsh/profiles/web/node_modules`／`.dsh-module-fallback`／`~/.agents/skills`／`~/node_modules`）的 `description` **全是改前 62 字符版**，本 session 目录行亦然 → 运行时「卡路里HELP」入口尚未生效（S3-5）。

## ⑦ 缺陷清单

1. **S3-1（本票范围）** `description` 未给逐字 argv（强推断可用）；加逐字命令需 +20 字符 → 519 字符会触发截断并切掉尾部触发词，现取舍合理。
2. **S3-2（本票范围）** `t82-verify-triggers.mjs` 命名／定位易被误读为看守 description，实测零鉴别力；建议改名或加一行自述。
3. **S3-3（本票范围）** 证据 §3.2「`routing.ts` 当前无运行期消费者」在**提交时点**成立（HEAD 的 `helpCenter.ts` 无 `routesFor`），但当前树 `867536b` 已新增 `src/render/helpCenter.ts → routesFor` → 措辞宜加时间点（结论「agent 触发面＝description」不受影响）。
4. **S3-4（范围外）** canonical 新增 3 条为并发瞬时红（#121／#87），复跑绿。
5. **S3-5（范围外）** 安装态副本过期 → 活会话未生效（须重发版／重装）。
6. **S3-6（范围外·环境）** 我第一轮 canonical／靶向日志被外部删除（`.scratch/orchestrator/rev82-logs/` 于 22:49:27 前后丢 2 文件），已重跑并双点落盘。
7. 已登记项复核成立：M6 节位置落差（D-2）／`HELP-AUTO` 块内 `help.center` 代表词仍为「记身材照」（D-3）／9 条 non-exec 词经 description 拉入技能。

## ⑧ 五维与 verdict

契约一致 **29/30**｜证据真实可复现 **24/25**｜parity **19/20**｜工程红线 **15/15**｜文档同步 **9/10** → **均分 96**。
**S1 0（交付 0／过程 0）／S2 0／S3 6（本票 3＋范围外 3）→ verdict: PASS。**

**复跑入口**（探针脚本在 `.scratch/orchestrator/rev82-*`，未入仓）：`rev82-probes.mjs`／`rev82-block.mjs`／`rev82-mutb.mjs`＋`rev82-mutb2.ps1`；日志 `.scratch/orchestrator/rev82-logs/`（副本 `%TEMP%\rev82-*`）。门禁 runId 见 ①，可按协议 §2.4 用 `check-gate-audit.mjs --ticket 82 --since 2026-09-09T14:48:30.000Z` 复核对账。
