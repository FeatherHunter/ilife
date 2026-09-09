# #116 纯技能路取证证据（AFK 门禁：隔离安装 + 严口径真调用，skill-calorie@0.2.0）

- 票：[#116 卡路里·纯技能路真调用取证](https://github.com/FeatherHunter/ilife/issues/116)（父图 #64）。
- 口径：`docs/calorie-dual-path-acceptance.md`（§3.1 隔离安装、§3.2 严口径真调用、§3.3 版本钉死登记、§4 数据口径、§5 判定三分、§9 七条）。
- 取证日期：**2026-09-09**（本机时区，UTC+8）。取证全程未碰真库（`D:\2Study\StudyNotes\.db`），见 §6。
- 判定总览：**§3.1 隔离安装 ✅ 过 / §3.2 严口径真调用 ❌ 缺证据（阻断）/ §3.3 版本钉死登记 ✅ / SKILL.md 版本串 ✅ @0.2.0**。
- HITL 手跑旁证：不归本 agent（由维护者另做）。

## 0 版本钉死四元组（§3.3）

| 项 | 精确值 |
| --- | --- |
| `skills`（安装器） | `1.5.25`（`npx skills --version` 实测；安装命令用 `skills@latest` 按规格原文，解析到 1.5.25） |
| `skill-calorie`（运行时） | **`0.2.0`**（会话里 AI 实际执行 `npx -p skill-calorie@0.2.0 …`，精确版本，无 `^`/`@latest`） |
| `opencode` | `1.18.13`（`opencode --version` 实测） |
| 仓 commit SHA | `7d63b38`（取证开始时 `git rev-parse --short HEAD`；本证据各 commit 见 §7） |

## 1 隔离安装（§3.1）✅ 过

- 隔离目录（仓外）：`C:\Users\辰辰洋洋\AppData\Local\Temp\ilife-t116-173949`（`$env:TEMP\ilife-t116-<随机>`，先写最小 `package.json` 再装，符合并发协议 §2.1）。
- 命令原文（exit 0，2026-09-09 15:03）：

  ```powershell
  npx skills@latest add FeatherHunter/ilife -s skill-calorie -a opencode --copy -y
  # MARK_ISOINSTALL=0
  ```

- 安装日志要点（`.scratch/t116/run-isolate-install.log`，工作副本未入仓）：`Selected 1 skill: skill-calorie`、`✓ skill-calorie (copied)` → `~\.agents\skills\skill-calorie`、`Installed 1 skill`、`Done!`。
- `list --json` 原文（入仓）：`docs/research/t116-assets/skills-list.json`——1 条，`name=skill-calorie`、`scope=project`、`source=FeatherHunter/ilife`、`path=<隔离目录>\.agents\skills\skill-calorie`。
- 落点目录树（`.agents\skills\skill-calorie\`）：含 `SKILL.md`（带 frontmatter，见下）、`package.json`（`version=0.2.0`）、`templates/`（6 个 html）、`src/`、`scripts/`、`test/`；**无 `dist/`**（线上 URL 安装不含 `dist`，已知残余，运行时走 npm，与规格 §6 一致）。
- 落点 `SKILL.md` 头 4 行（含 frontmatter）：

  ```text
  ---
  name: skill-calorie
  description: "卡路里一期饮食体重运动身体目标照片分析复盘，唯一出口 calorie-cmd-read（argv加JSON加exit）"
  ---
  ```

## 2 严口径真调用（§3.2-AFK 门禁）❌ 缺证据（阻断）

- 严口径语句（票面原样，未改一字）：`opencode run '卡路里 help' -m opencode/mimo-v2.5-free`（模型取票面点名的免费模型；`big-pickle` 已下架见下）。
- 隔离库：`$env:SKILLS_DB_PATH=<隔离目录>\db`（空仿真库；AI 在会话里另用 `$env:TEMP\sk-test`，同样与真库无关）。
- 会话 JSON（入仓）：`docs/research/t116-assets/session-run4-ses_f7ae1e88.json`（run4，35 消息/33 工具调用，唯一出现 AI 自发 CLI 调用的会话；run3/run5 会话 ID 与断言摘要见 §2.2/§2.4，原始导出留 `.scratch/t116/` 工作副本，opencode 本机会话库中仍可按 ID 导出复核）。
- 断言脚本（入仓）：`docs/research/t116-assets/assert-session.mjs`（A1-A4，`node docs/research/t116-assets/assert-session.mjs <session.json>`）。

### 2.1 模型下架（环境事实变更）

- 前两跑（15:04、15:20）`opencode run '卡路里 help' -m big-pickle` 均 5 秒速败 exit 1：`ProviderModelNotFoundError: Model not found: big-pickle/.`（`.scratch/t116/run-opencode-run2.log`）。
- `opencode models opencode` 当天列表仍含 `big-pickle`（陈旧），可用免费模型含 `opencode/mimo-v2.5-free`（票面点名）——后三跑改用它。
- 失败会话 `ses_f7af6004effeamufWXjjWh2t3N` 无任何 AI 动作（模型解析阶段即死），不作证据，仅记此。

### 2.2 run3（ses_f7ae80272ffev5qWQkXni3qJ4E，15:35 exit 0）——AI 未调 CLI

- 3 条消息、1 工具调用（`Loaded skill: skill-calorie`，输出 18,947 字 = SKILL.md 全文，A3 过）。
- AI 直接回总结文本，未发起任何 `calorie-cmd-read`（A1/A2/A4 缺）。判：**不成**（波动样本 1）。

### 2.3 run4（ses_f7ae1e88affeVPpp8sF57CMcLL，15:45 exit 0）——AI 自发 7 次调用，全败于引号转义

- 35 条消息、33 工具调用；A1 ✅（7 次 `calorie-cmd-read`，6 次钉 `npx -p skill-calorie@0.2.0`）、A3 ✅（skill-load + 全程 `skill-calorie@0.2.0`）。
- 7 次输出全为错误：裸命令 `CommandNotFoundException` ×1；`ERR 2: --params 须为 JSON…position 1` ×3（单引号 JSON 被 opencode shell 层剥掉双引号）；`ERR 2: 未知参数：q\:…` ×3（转义变体同样被拆）。**无一次 `"exit":0` envelope**（A2 ❌），无 `data.output`、无 HTML 产物、AI 未回路径（A4 ❌）。
- AI 另在隔离目录内 `npm install skill-calorie@0.2.0` + 直接 `node …/cmd_read.js` 尝试（均仓外，不污染仓库），同样受引号问题牵连。
- 断言实测：`node docs/research/t116-assets/assert-session.mjs session-run4…` → `1 session(s) FAILED`（A1 PASS/A2 FAIL/A3 PASS/A4 FAIL），`ASSERT_EXIT=1`。
- 判：**不成**（波动样本 2）。失败属 Windows PowerShell 引号转义环境坑，非技能缺陷（同命令在直接 pwsh 里可跑通，见既往 #47 档），但按 §5/§9-7 不得顶替。

### 2.4 run5（ses_f7ad6f42dffeEcK08pxUggInkp，15:54 exit 0）——同 run3，无 CLI 调用

- 3 条消息、1 工具调用（skill-load）。断言：`A1 FAIL / A2 FAIL / A3 PASS / A4 FAIL`（`1 session(s) FAILED`）。
- 三轮同语句同模型样本：run3（无调用）、run4（7 次调用全败于引号转义）、run5（无调用）。**§3.2 最终判定：缺证据（阻断）**，见 §5-7。

## 3 版本钉死登记（§3.3）✅

见 §0 四元组。运行时精确到 `skill-calorie@0.2.0`（会话 R1 清单为证）；安装器 `skills@latest→1.5.25`（规格命令原文）；commit SHA 见 §7 清单。

## 4 数据标注（§4 / §9-4）

- 本票全部会话走**隔离仿真库**：启动环境 `SKILLS_DB_PATH=<隔离目录>\db`（空）；run4 内 AI 自建 `$env:TEMP\sk-test`。**未读未写真库**（§6）。
- help 类命令不依赖数据；空库不产生"同文一致"误读（各调用均报 `ERR 2` 参数错误，与数据无关）。
- 真库副本+哨兵（`.scratch/map2/t116/realcopy/`，`T116-SENTINEL-321`）为 9/8 旧样本，本轮未复用（help 流不需要行数据），特此标注以免混用。

## 5 §9 七条逐条对照

1. **可复现** ✅：命令原文 + exit + 版本元组（§0）+ 日期（2026-09-09）齐备；会话 JSON 与断言脚本入仓（§7 路径）。
2. **可打开** ⚠️（§3.2 缺连带）：隔离安装侧 SKILL.md/目录树可查；真调用侧无 HTML 产物（缺）。
3. **机器可判** ✅：`assert-session.mjs`（A1-A4）已跑，run4 实测 `FAILED` exit 1（诚实红）。
4. **数据标注** ✅：§4 逐条标注，无混用、无空库同文顶替。
5. **版本一致** ✅：全链 `skill-calorie@0.2.0` / opencode 1.18.13 / skills 1.5.25；`mimo-v2.5-free` 两次可比（run3/run4 同模型同语句）。
6. **零触碰** ✅：真库 SHA256/大小/时间见 §6（只读取证）。
7. **无替代品** ✅：未用手动跑、手写 HTML、旧会话顶替；失败记**缺证据**，不记过。

## 6 零触碰自证（真库只读）

- 本轮只读实测（2026-09-09 16:06，未执行任何写库命令；全程 `SKILLS_DB_PATH` 指向隔离目录，会话内 AI 亦只用隔离库）：
  - `SHA256(calorie_data.db) = DC6A061B1E0979F40249E6F414070F02FE15A3C70A5C0572239332D2F41BF11C`
  - 大小 `3,072,000 B`（与 t123 P-3 一致），`LastWriteTime = 2026-09-09 15:01:21`。
- **mtime 差异如实登记**：t123 P-3 登记为 `2026-08-29 11:49:11`。本次 mtime（15:01:21）**早于本取证首条命令**（15:02 `npm view`），故非本轮写入；疑为并发 session / 维护者 / DSH 进程的轮外写入（本 agent 未确证来源，见 §9）。大小未变，本轮零读写仍成立（本轮无任何指向真库的命令）。

## 7 交付文件 + commit 清单

| 文件 | 说明 |
| --- | --- |
| `docs/research/t116-pure-skill-evidence.md` | 本文件 |
| `docs/research/t116-assets/skills-list.json` | `list --json` 原文（`e2338e1`） |
| `docs/research/t116-assets/assert-session.mjs` | 断言脚本 A1-A4（`d5a43dd`） |
| `docs/research/t116-assets/session-run4-ses_f7ae1e88.json` | run4 会话 JSON（本轮 commit，见 §7） |

过程日志（未入仓，`.scratch/t116/`）：`run-isolate-install.log`、`run-skills-list.log`（UTF-16 原文）、`run-opencode-run{,2,3,4,5}.log`、`run-session-list{,2}.log`、`run-export{,4}.log`、`session-new-utf8.json`、`session-run4(-utf8).json`、`dump-cli.py`、`dump-success.py`、`commit-msg-*.txt`。

## 8 SKILL.md 版本串复核（#123 同步项第三方验证）✅

- 落点 `SKILL.md`：`@0.2.0` 命中 3 处（第 173/179 行含运行时钉死与版本登记行），`@0.1.1` 命中 **0** 处；工作区 `packages/skill-calorie/SKILL.md` 同样 `@0.1.1` 零命中。**不是旧的 `@0.1.1`** ✅。
- 会话内 AI 回复亦引用 `skill-calorie@0.2.0`（run3 文本 + run4 R1 清单）。**不是旧的 `@0.1.1`** ✅。

## 9 未确证项

- §3.2 严口径真调用：envelope + HTML 产物暂缺 → **缺证据（阻断）**（三轮样本如 §2.2–§2.4）。
- HITL 手跑旁证：由维护者另做，不在本证据内。
- `big-pickle` 下架后票面"如 `opencode/mimo-v2.5-free`"表述仍有效（mimo 可用），但建议 #122 收口时登记模型漂移。
- 真库 mtime 前移（08-29 → 09-09 15:01:21，大小不变，发生于本轮之前）：未确证写入来源；本轮零触碰仅覆盖本取证窗口。
- run3/run5 会话 JSON 未入仓（仅 run4 入仓 + 三轮断言摘要在 §2 内）；三者均可按会话 ID 在本机 opencode 库中重新导出复核。
