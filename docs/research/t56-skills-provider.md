# #56 技能目录验证：打包技能提供方回路 + 安装态（AFK 部分）

- 票：[#56 DSH技能目录可查](https://github.com/FeatherHunter/ilife/issues/56)（地图 #64）。
- 取证日期：2026-09-09（本机时区，`Get-Date` 实测 `2026-09-09 15:02` 起）。
- 版本元组：`dsh-calorie@0.2.0`（真机落盘实测）· `skill-calorie@0.2.0`（真机落盘实测，非旧 0.1.1）· 工作区 `dsh-calorie=0.2.0` / `skill-calorie=0.2.0` / `skill_dep=^0.2.0` · Node `v24.19.0` · HEAD `7d63b38`（取证时）。
- **待维护者一句话 HITL 确认**（未完成项）：agent 会话里查到 `skill-calorie`（名＋介绍）的一句话确认由编排者另行收集，不归本 AFK 部分；无此确认本票不得 close。

## 1 回路测试（§2.2 可复现门禁）

- 命令原文：`node --test packages/plugin-calorie/test/skills-provider.test.mjs`（仓根 `D:\ilife`，持 `D:\ilife\.scratch\locks\gate.lock`，协议 `docs/subagent-concurrency-protocol.md` §2）。
- 持锁区：`LOCK_ACQUIRED=2026-09-09T15:03:10+08:00` → `LOCK_RELEASED`（同分钟）。
- `exit code`：**0**（`MARK_TEST=0`）。
- 摘要行（日志尾 12 行）：`tests 5 / suites 1 / pass 5 / fail 0 / cancelled 0 / skipped 0`。
- 断言摘要（5 条全绿）：
  1. `inject` 声明 `connection` + `skills`；
  2. `apply` 注册且仅注册一个提供方（`name=dsh-calorie`），RPC 通道 `['/ilife-calorie']` 不变；
  3. `list` 给出唯一 `skill-calorie` 摘要（`source=bundled`、`rank=600`、描述取自 `SKILL.md` frontmatter、单份 `SKILL.md` 同源）；
  4. `get` 给全文（frontmatter 后正文，含 `calorie-cmd-read`，不带头 `---`），过期候选失效；
  5. 重名退让（`already registered` 不抛，RPC 照常，warn 留痕）。
- 日志：`.scratch/t56/run-skills-provider.log`（gitignore，不入仓；尾行见上）。
- 归属：红绿均未触源码；若红则定位到文件行后如实报告（本次全绿，无需定位）。

## 2 安装态验证（真机落盘，只读，未改 profile、未写库）

- 落盘根：`C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-calorie` —— `LinkType` 为空（真实目录，非 junction），`version=0.2.0`，`dependencies['skill-calorie']=^0.2.0`；`dist/` 含 `skill-provider.js`（+map/d.ts），即 #123 发版前置修复的提供方注册代码已随包落地。
- 探针（只读执行，不安装不写入）：`node .scratch/t56/probe-install.mjs`（自写桩 ctx，与回路同形），`MARK_PROBE=0`，日志 `.scratch/t56/run-install-probe.log`。
- 按包名解析：`createRequire(<落盘dist/index.js>).resolve('skill-calorie/package.json')` =
  `C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-calorie\package.json`（顶层扁平，无 `dsh-calorie\node_modules` 嵌套）。
- 落盘 `SKILL.md`（`…\skill-calorie\SKILL.md`，17536 B）：frontmatter `name: skill-calorie` +
  `description: "卡路里一期饮食体重运动身体目标照片分析复盘，唯一出口 calorie-cmd-read（argv加JSON加exit）"`；
  正文头两行 `# 卡路里（calorie）SKILL` ＋ `饮食/体重/运动/身体/目标/照片/分析/复盘一期全量…唯一出口 calorie-cmd-read …`。
- 票面三量（`list()` 实测唯一候选，`LIST_N=1`）：`rank=600`、`source=bundled`、`candidate=skill-calorie`
 （全量：`{name:skill-calorie, rank:600, source:bundled, provider:dsh-calorie,
  resBase:…\node_modules\skill-calorie}`；`PROVIDER_NAME=dsh-calorie`、`SKILL_NAME=skill-calorie`、
  `BUNDLED_SKILL_RANK=600`、`INJECT=["connection","skills"]`）。
- `get()` 实测：`GET_LEN=17431`、`HAS_CLI=true`（含 `calorie-cmd-read`）、`NO_FRONT=true`（frontmatter 后正文，不带头 `---`）。
- 重名退让逻辑存在（落盘 `dist/index.js` 文本实测）：`:41` `includes('already registered')`、
  `:43` `skill provider … already registered by another instance; yielding`（另 `:52` RPC 通道同形退让）。
- 顶层 `skill-calorie` 同为真实目录（`LinkType` 为空），`files=[dist, SKILL.md, templates/*.html]`（含 `SKILL.md`，registry 0.1.1 没有）。

## 3 版本一致

- 提供方解析到的技能版本 = 落盘 `skill-calorie@0.2.0`（`SKILL_VERSION=0.2.0`，探针实测），不是旧的 `0.1.1`。
- 版本元组复核：落盘 `dsh-calorie@0.2.0`（`skill_dep=^0.2.0`）· 落盘 `skill-calorie@0.2.0` ·
  工作区 `dsh-calorie=0.2.0` / `skill-calorie=0.2.0` / `skill_dep=^0.2.0` —— 落盘与工作区一致，无版本漂移。

## 4 收口（AFK 完成项 vs 待 HITL 项）

- AFK 已完成：
- ① 回路测试 exit 0（5/5）；② 安装态三量与票面一致（§2）；③ 版本一致 0.2.0（§3）。
- 回路全绿 → 无回归定位、无源码改动（本票只许写本文档与 `.scratch/t56/`；实际提交仅本文档，`.scratch/` gitignore 不入仓）。
- **待维护者一句话 HITL 确认**（未完成项）：agent 会话里查到 `skill-calorie`（名＋介绍）的一句话确认由编排者另行收集，不归本次 AFK；无此确认 #56 不得 close。
