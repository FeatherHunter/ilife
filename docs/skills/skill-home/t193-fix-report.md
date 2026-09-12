# #193 整改报告（F2：文档侧 ＋ 前任代码改动自证）

- 日期：2026-09-12（整改会话）｜UTF-8 无 BOM、真实换行｜红线：未跑仓根 build/test、未重启/kill DSH、未 `git commit`、未改 issue／未发评论／未关票、未碰别家在途件。
- 本件只报告**我做了什么**；前任的件我只**验证**、不改（除下面第 一 节明确记录的一处「发现但没动」）。

## 一、前任代码改动自证（两次输出都是我亲自跑的，非转述）

件：`packages/plugin-home-ilife/package.json`（`test` 串加 `test/skills-provider.test.mjs`）＋ `test/skills-provider.test.mjs`（7 → 9 条）。

| 步骤 | 命令 | 实际输出 |
|---|---|---|
| ① 基线 | `pnpm --filter dsh-home-ilife test` | `tests 16 / pass 16 / fail 0`（provider 9 ＋ smoke 7） |
| ② 反例 | `src/index.ts:32` → `if (false) throw error;` → `pnpm run build:host` → `node --test test/smoke.test.mjs test/skills-provider.test.mjs` | `tests 16 / pass 14 / fail 2`，`TEST_EXIT=1` |
| ③ 还原 | 改回 `if (!String((error as Error)?.message ?? error).includes('already registered')) throw error;` → 重建 → 复跑 | `pass 16 / fail 0`，`TEST_EXIT=0` |

②变红的两条（正好＝新增的那 2 条，7→9 就是这 2 条）：

- `重名退让之外的一切错误必须原样重抛（他错不吞）` → `AssertionError: Missing expected exception: 非「already registered」的错误须原样重抛`（`skills-provider.test.mjs:108`）
- `退让只认 already registered（错误文案里没有这句即须重抛）` → `Missing expected exception: 近义文案不得被当退让吞掉`，`expected: /provider limit reached/`（`:120`）

**结论：前任代码改动成立**——这 2 条对 `index.ts:32` 那句条件抛有真实覆盖（原 7 条是零覆盖）。残留检查：`git diff -- packages/plugin-home-ilife/src/index.ts` → **空**。

**顺带发现一处未入索引的缺口（我没动它，交编排方）**：`package.json` 是 `MM`、`test/skills-provider.test.mjs` 是 `AM`——**索引里那份 `package.json` 的 test 串还是** `node --test test/smoke.test.mjs`（不含新件），**索引里那份用例只有 7 条**（`git show :…` 实测），新增的 2 条只在工作区。照索引直接提交 ⇒ `pnpm test` 跑不到新用例、9 条变 7 条。

## 二、`t193-install-report.md` 逐条改动（10 条全做）

1. **用词纪律**：报告 `装机` **11 → 0**、`落地` **3 → 0**（含 §6① 链接文字那 1 处），`t193-body.md` 同类 **2 → 0**；口径照 `docs/agents/wording.md:50-51`。名词位用「安装」（本仓已有 `#50 安装布局` 用例名先例），动作位用规范短语「把技能装到 agent 读得到的位置」。
2. **§5 件清单**：`??` → 现场真实状态（`A `／`AM`）；补 `docs/skills/skill-home/t193-body.md`（`MM`）；另把 7 行 ` M` 订正为 `M `/`MM`（原稿把「已入索引」写成「工作区」，与 `git status --porcelain` 不符），并加状态图例。
3. **§5.1 订正**：删掉「会同时打红 skills-cli 与提供方两条线」。真凭据＝宿主 `@deepseek-ai/dsh-skill/lib/index.js:17` 的 `SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`（纯 ASCII）与 `:454` 抛 `invalid skill name`；本件提供方自己的正则在 `src/skill-provider.ts:69` 是 `/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u`，**接受**中文名 ⇒「提供方被打红」不成立；并注明 `test/skills-export-47.test.mjs:21` 是 `PKGS=['skill-calorie']`，**今天不含 `skill-home`**、本轮不覆盖本件。
4. **§2.3 弱证据**：把「两次输出逐字段相同」标为**弱证据**（两次 `resourceBase.path` 都落 `D:\ilife\packages\skill-home`，同一地址；②只证明插件半能从 profile junction 加载，不证明技能已进 agent 技能表）。路径矛盾走**「补齐脚本路径」**这一支（不删「可复跑」）：补逐字命令 `node .scratch/home-t193/probe-provider.mjs "<base>"`；**我亲自复跑两次**，`EXIT1=0`／`EXIT2=0`，两次都 `listCount:1`、`bodyBytes:12535`、`SKILL.md` 首行 `---`。
5. **回滚补全**：§3.3③「两条」→「三条」并补第 3 条实测；§3.4 回滚命令**新增** `cmd /c rmdir "…\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home"`，自检改 3 条 `Get-Item`；`~/.agents/skills/skill-home` 注明本票没建过、回滚无需处理（若票 11 建了属票 11 范围，命令已给）。
6. **口径对齐**：`照 #150 对 #59` → `照 #143 对 #59`（§6① 标题＋正文两处）。**注意票面自身不一致**：线上 issue 首句写 `#150`、末句写 `照 #143 对 #59`；`t193-body.md:3` 的 `#150` **我没改**（它是票面快照，改了就与线上不同），留此备裁。
7. **必报五步对账**（新增一段，口径照 `docs/agents/structure.md:72-107`）：第一／二步**未单独报批**（依据地图 `docs/skills/skill-home/map-183-body.md`：「票 10…**不占用户决策时间**，可与票 12 并行交给子代理先做」）；第四步**不触发**（本包无 `AGENTS.md`、无告警线数字，最大源文件 121 行）；第五步＝件清单，与票面逐条对——**偏差不为零，已逐条列**（多出客户端产物 4 件＋回路用例 1 件＋文档 2 件）。
8. **§4 订正**：② fallback 由「待核」升为**确定项**；③ `~/.agents/skills` 由「首选」降为**备选**（反例：`skill-schedule` 不在那条路也已装齐）。
9. **分区提交提醒**（新增一段）：点名列了索引里别家的在途件（`docs/skills/skill-chef/**`、`packages/skill-chef/**`、`docs/skills/skill-memo-ilife/**`、`packages/base-render/**` 等），要求路径白名单 `git add --`，禁 `git add -A`／`git add .`。
10. **进度事实**（新增一句）：本地 `t193-body.md` 已是「进度：100%」但**未发布**——`gh issue view 193` 实测 `state=OPEN`、`comments=0`。

## 三、fallback Junction：查证结果与「是否补建」

**没补建——它本来就在**（兄弟都有，它也有）：实测 `C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-home` ＝ `LinkType=Junction`，`Target=D:\ilife\packages\plugin-home-ilife\node_modules\skill-home`，`CreationTime=2026-09-12 18:00:28`，经链接读 `SKILL.md` 首行＝`---`；兄弟件 bill／calorie／chef／memo／schedule **同样都有**、形状一致（`…\plugin-<x>-ilife\node_modules\skill-<x>`）⇒ 启动器自管。

**任务给的路径要订正**：`C:\Users\辰辰洋洋\.dsh-module-fallback\node_modules\`（主目录根）**Test-Path=False**，六件全「不存在」；真地址在 **web profile 下**（`.dsh\profiles\web\.dsh-module-fallback\node_modules\`）。报告 §4② 已按真地址写，并加「别去那儿找」提示。

`~/.agents/skills`：实测只有 `skill-bill`／`skill-chef`／`skill-memo-ilife`（Junction）与 `skill-calorie`（陈旧拷贝，无 `LinkType`），**无** `skill-home`；`skill-schedule` 也不在那条路 ⇒ 备选。

## 四、未做到的项与理由

- **未补前任那份索引缺口**：我的 3 件已入索引；`package.json`／`test/skills-provider.test.mjs` 的未入索引状态我没动（超出我的授权，交编排方裁）。
- **未做安装态强证据**：§2.3 只做标注；要真跑得重启 DSH ⇒ 红线不许，属票 11。
- 未跑仓根 `pnpm build`／`pnpm test`（红线）；未 `git commit`（红线）；未重启/杀 DSH。
- 报告 diff 里含前任自己未入索引的改动（我拿到的工作区本就不等于索引版本），我只对自己那 10 组改动负责。
