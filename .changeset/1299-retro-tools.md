---
'dsh-life-pack': patch
---

#1299 retro 三件套工具化：会话指针、证据自检、一条命令门禁。

- `tooling/session-pointers.mjs`：从 DSH 会话转录取可复算的用户原话指针——zstd 多帧解码、有界等待、seq／时刻／消息类型复算；指针逐字可贴进证据的 ②／④ 格。
- `tooling/check-evidence.mjs`：关票前核对四步闸门与证据可解析性——格式门（复用 `tooling/make-evidence.mjs`）、指针复算、危险代码提交身份与票号、机器读数类别、changeset、「同目录同前缀」资产、④ 格自相矛盾；查不了的项记 WARN，不替人补。
- `tooling/gate.mjs`：`--scope` 一条命令跑 tsc -b＋该包测试＋汇总行，日志落盘、失败点名 STAGE；`--full` 委托既有全量门脚本（全量套件清单只有一份事实源）。
- 文档同步三处：`docs/agents/编排纪律.md`（指针／证据／门禁的工具入口）、`docs/agents/issue-tracker.md`（GraphQL 回退）、`docs/subagent-concurrency-protocol.md`（有界等待与超时换通道、一条命令门禁）。
