---
'dsh-life-pack': patch
---

#1313 多席位工具链入仓：建树、三方合并收票、测试确定性驱动。

- `tooling/worktree-init.mjs`：一条命令建工作树（git worktree add → pnpm install --offline → 写该席位的 `.scratch/README.md` 落脚页），幂等、可 `--dry`、退出码区分「装依赖失败」与「前置不满足」。
- `tooling/premerge-child.mjs`：收回子工作树改动时做三方合并（base＝建树 SHA），当前树没动的直接搬、两边都改的合干净、冲突只落侧车且当前树一字节不动；替代「按变动文件覆盖」的旧收法（历史上覆盖过集成树的新提交）。
- `tooling/run-tests.mjs` ＋ `tooling/test-suite.mjs`：逐件隔离驱动（缺省 `--jobs 1`、每件墙钟、完成守卫、杀进程树、失败只回日志尾），修掉单进程 `node --test` 默认并行度 × 每件 headless Chrome 导致的进程爆炸与挂起；全量清单统一到 `SUITE_GLOBS`，`pnpm test` 与 CI 走同一份。
- 文档：`docs/agents/多席位工具链.md`（三个入口与冲突裁决），AGENTS.md 并发纪律段加载指针。
