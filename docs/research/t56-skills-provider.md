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

## 2 安装态验证（真机落盘，只读；待补）

（下一步补：`C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\dsh-calorie@0.2.0` 的 `dist/skill-provider`、按包名解析 `SKILL.md`、rank/source/candidate 三量、版本一致、重名退让。）

## 3 版本一致（待补）

（下一步补：提供方技能版本 = 落盘 `skill-calorie@0.2.0`。）
