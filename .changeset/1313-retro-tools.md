---
'dsh-life-pack': patch
---

#1313 多席位工具链入仓：建树、三方合并收票、测试确定性驱动。

- `tooling/worktree-init.mjs`：一条命令建工作树（git worktree add → pnpm install --offline → 写该席位的 `.scratch/README.md` 落脚页），可 `--dry`、退出码区分「装依赖失败」与「前置不满足」。重复调用时安装结果记在 `<树>/.scratch/worktree-init-install.json`：只有上一轮 `ok` 才跳过，`failed`／无记录会重装、仍失败就 exit 1（不把失败洗成 PASS）；`--dry` 也写 `--json`（`dryRun: true`、`install: planned`）。
- `tooling/premerge-child.mjs`：收回子工作树改动时做三方合并（base＝建树 SHA）。改动清单＝子树 `base..HEAD` 已提交 ∪ 工作区未提交（只读 `git status` 会漏掉已 commit 的产出）；前置校验同仓库与 base 祖先；双方都删判 noop；两阶段写回（有冲突则本轮整棵树不写、JSON `applied=false`、冲突只落侧车）；`--dry` 也逐条打 CONFLICT；写回保留 exec 位与符号链接；`git merge-file` 内部失败归 `InternalError`、exit 3。替代「按变动文件覆盖」的旧收法（历史上覆盖过集成树的新提交）。
- `tooling/run-tests.mjs` ＋ `tooling/test-suite.mjs`：逐件隔离驱动（缺省 `--jobs 1`、每件墙钟超时、完成守卫、杀进程树、失败只回日志尾），修掉单进程 `node --test` 默认并行度 × 每件 headless Chrome 导致的进程爆炸与挂起。TAP 完成后赖着不退记 `hung`（独立结局，不再混进 pass），超时杀进程后必有界收尾；日志名加路径哈希防撞名。全量清单统一到 `SUITE_GLOBS`；同时删除旧表第 18 条 `packages/skill-home/test/*/*.test.mjs`（该 glob 在树上展开 0 件，清单是单一事实源，删条属行为变更）。
- 分工：`pnpm test`＝真实 home 快照隔离门禁（命令 exit 0），`pnpm test:suite`＝本驱动 `--all`（逐件读数）；清单同源、隔离与门禁不同源。`gate.mjs --scope <包>`（tsc -b＋该包测试）是「改完一包」的入口。
- 文档：`docs/agents/多席位工具链.md`（三个入口、两阶段与冲突裁决、已知红读数更正），AGENTS.md 并发纪律段加载指针。
