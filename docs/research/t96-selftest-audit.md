# #96 · `pnpm gate:selftest:html` 独立锁日志对账（D-1 修复的审计留痕）

**为什么要单独一份**：D-1 修复把 `gate:selftest:html` 的锁与留痕移到**独立锁目录** `.scratch/locks-selftest/`（`package.json:29` 的 `--lock-dir`）。因此该命令的 `RUN` 条目**不再出现在**主审计日志 `.scratch/locks/gate-runs.log` 里——它是**另一条同样落盘的审计线**，不是「无留痕」。

**本文件的声明**（runId 均抄自 `.scratch/locks-selftest/gate-runs.log` 的 `RUN` 行）：

GATE-RUN runId=53a348de-5560-4095-b7e8-d75d6a59d370 cmd="node --test tooling/test/skill-html-snapshot.test.mjs"
GATE-RUN runId=16a455de-742a-40f7-8340-ccf4056dfe28 cmd="node --test tooling/test/skill-html-snapshot.test.mjs"
GATE-RUN runId=14b787b9-6558-4a3f-98dd-d49316094e98 cmd="node --test tooling/test/skill-html-snapshot.test.mjs"

三笔均为 `exit=0`，`tests 10 / pass 10 / fail 0`，用途：
- `53a348de…`（`waitedMs=30018`）：新口径单跑（等 #88 的 `gate:selftest` 持独立锁后取得）；
- `16a455de…`（`waitedMs=0`）：**主锁被 `t96-close-holdlock` 占用期间**取得独立锁 → 内层不再依赖主锁；
- `14b787b9…`（`waitedMs=0`）：**复现蓝队死锁场景**（外层 `t96-close-nestctl` 持主锁）时取得独立锁 → 嵌套不再死锁。

对账命令与导出：

```
node tooling/check-gate-audit.mjs --evidence docs/research/t96-selftest-audit.md \
  --log .scratch/locks-selftest/gate-runs.log --ticket 96 \
  --since 2026-09-09T14:04:00.000Z --until 2026-09-09T14:08:00.000Z \
  --export docs/research/t96-selftest-runs.log
```

（无放宽开关：三笔全部 `exit=0`。主日志的对账见 `docs/research/t96-close-gate.md` §4。）
