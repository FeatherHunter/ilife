# #342 独立对抗审查 · 运行导出（审查者持锁复跑，`ticket=342`）

> 本件为 `GATE-RUN` 声明的对账源（协议 §2.3④）：下述每行均可在 `.scratch/locks/gate-runs.log` 按 `runId` 一对一复核。
> 审查者自有运行 7 次（其中 2 次为审查者自身脚手架失误的作废行，已注明，不计入证据）。

## 有效证据行（5）

```
GATE-RUN runId=68565826-e10d-412f-992c-f1e081704381 cmd="node packages/skill-calorie/test/exercise-records-342.test.mjs" exit=0（主测试 5/5 绿，RESULT pass 5 fail 0）
GATE-RUN runId=4107b551-0e58-49ad-a3f3-4f8e77b72fa0 cmd="node docs/skills/skill-calorie/t342-review-probe.mjs" exit=0（自设探针 RESULT 7/7）
GATE-RUN runId=b380ea95-fcb2-4693-8efa-7725bcef7a13 cmd="node .scratch/t342-review/probe-neg.mjs" exit=1（负对照：P6 断言翻转 → RESULT 6/7，P6 FAIL，证探针会咬）
GATE-RUN runId=483fa7be-c000-4f27-aa4e-ed138253e098 cmd="pnpm build" exit=0（根构建，exercise 零错误）
GATE-RUN runId=324b3b86-0032-4438-9906-020a83313738 cmd="pnpm gen:check" exit=0（GEN-CHECK PASS，键 118＝写 46＋读 72）
```

## 作废行（2，审查者脚手架失误，与被审票无关）

```
GATE-RUN runId=33b8f99a-ecc6-48d7-802b-e86ec0e39537 cmd="node docs/skills/skill-calorie/t342-review-probe.mjs" exit=1（Windows 下动态 import 未用 fileURL，修后重跑即绿，见 4107b551）
GATE-RUN runId=1e8dc346-6de7-4dc7-b7af-14c9a56efec2 cmd="node .scratch/t342-review/probe-neg.mjs" exit=1（副本相对路径越界＋转码污染，字节拷贝重做后见 b380ea95）
```

## 等待量（可复核）

- `68565826` waitedMs=10002（与 ticket 378 串行等待后持锁，非抢回）
- `1e8dc346` waitedMs=20002（WAIT-OWNER-ALIVE ticket 378，活锁未抢，协议 §2 遵守）
- 其余 waitedMs=0。锁释放均为 `LOCK-RELEASED … exit=<同上>`，归属一致。

## 被审票声称行的复核结论

`t342-证据.md` §1§3§4 共 11 个 `GATE-RUN runId`（fda7962d／f8223f65／b062af2b exit=1／31097095／273845f4／b5d1669a／2eb32633／54bb372b／78366f4e／b103179c／7b08aa17／8335c4e3／c8fc28b0／f5d60583 exit=1／728db5e6／1c946e10）逐一 grep 门禁日志：START/RUN 成对存在，退出码与声称一致（红即 exit=1，绿即 exit=0），一对一无缺失。
