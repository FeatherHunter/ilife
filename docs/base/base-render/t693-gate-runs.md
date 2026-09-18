# t693 运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log`）

本文件是协议 §2.3 第 4 条的导出件：把本次窗口内属于票号 693 的运行条目逐行抄录，供第三方复核。
判定「有没有走包装器」看运行记录里的持锁行（`START`／`RUN`），不看持锁者记录文件在不在
（它只在持锁期间存在、释放即删）。抄录时刻 2026-09-18T10:21Z（UTC）；等待量全为 0–1ms（未与他人抢锁）。

其中跑出非 0 的三条是**过程中的红态**，不是最终门禁读数，原文见 `t693-证据.md` 的「过程中的红」一节：

```
RUN ticket=693 runId=3117c72a-c131-4149-9f9d-649acb637611 cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=1 pid=12776 at=2026-09-18T10:15:33.509Z
RUN ticket=693 runId=8d4cdca4-313a-4a51-b57b-89a066cee26e cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=1 pid=32860 at=2026-09-18T10:15:46.532Z
RUN ticket=693 runId=304f77ac-3d60-46ad-9a29-2704bbf497b0 cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=0 exit=1 pid=23600 at=2026-09-18T10:18:13.553Z
```

全量条目：

```
RUN ticket=693 runId=a6e0d3a6-2cb1-4a3c-8b25-a074e8fe772e cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=29284 at=2026-09-18T10:13:28.805Z
RUN ticket=693 runId=c8990c55-2235-46ab-9243-222a560b5d76 cmd="node packages/base-render/scripts/gen-help-shell.cjs" waitedMs=0 exit=0 pid=37652 at=2026-09-18T10:14:18.369Z
RUN ticket=693 runId=7ade8ac5-90f7-4667-8d9d-6e47d4eabc81 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=1 exit=0 pid=30716 at=2026-09-18T10:14:23.853Z
RUN ticket=693 runId=3117c72a-c131-4149-9f9d-649acb637611 cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=1 pid=12776 at=2026-09-18T10:15:33.509Z
RUN ticket=693 runId=8d4cdca4-313a-4a51-b57b-89a066cee26e cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=1 pid=32860 at=2026-09-18T10:15:46.532Z
RUN ticket=693 runId=64e24c41-bd11-4259-a136-d6b09c26008d cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=0 pid=25360 at=2026-09-18T10:16:01.099Z
RUN ticket=693 runId=5ca3ed85-82a4-48fb-8540-7ca7e70ae372 cmd="node .scratch/t693/mutation-window.mjs" waitedMs=0 exit=1 pid=10280 at=2026-09-18T10:16:28.942Z
RUN ticket=693 runId=bc721654-6fb2-4350-8231-b2bb60614e32 cmd="node .scratch/t693/mutation-window.mjs" waitedMs=0 exit=0 pid=36796 at=2026-09-18T10:16:49.988Z
RUN ticket=693 runId=a26795fe-46e7-4bf0-834c-99db83f71bce cmd="node .scratch/t693/mutation-window.mjs" waitedMs=0 exit=0 pid=30616 at=2026-09-18T10:17:22.849Z
RUN ticket=693 runId=a0bdfa2f-4d13-4a86-b3d0-860cad2587c7 cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=0 pid=11052 at=2026-09-18T10:17:59.408Z
RUN ticket=693 runId=304f77ac-3d60-46ad-9a29-2704bbf497b0 cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=0 exit=1 pid=23600 at=2026-09-18T10:18:13.553Z
RUN ticket=693 runId=9e321d79-761e-4ac5-beef-a0198e865bfd cmd="node .scratch/t693/mutation-window.mjs" waitedMs=0 exit=0 pid=27424 at=2026-09-18T10:19:27.664Z
RUN ticket=693 runId=044aefe1-420f-4cb3-8b86-6a5d5cef21c0 cmd="node packages/base-render/scripts/gen-help-shell.cjs --check" waitedMs=0 exit=0 pid=31472 at=2026-09-18T10:19:32.138Z
RUN ticket=693 runId=6b617377-a5a0-4351-a6f6-a7c1c61cf300 cmd="node docs/base/base-render/t693-mut.mjs" waitedMs=0 exit=0 pid=29752 at=2026-09-18T10:20:27.942Z
RUN ticket=693 runId=d6e96e86-cbd3-472e-a4f6-df20971a4337 cmd="node --test packages/skill-memo-ilife/test/help-dom-243.test.mjs packages/skill-schedule/test/help-file-202.test.mjs packages/skill-home/test/help-delivery-190.test.mjs packages/skill-chef/test/help-delivery-216.test.mjs packages/skill-bill/test/help-exit-148.test.mjs" waitedMs=0 exit=0 pid=15720 at=2026-09-18T10:20:52.353Z
```

注：`.scratch/t693/mutation-window.mjs` 是票内草稿期的等价脚本，其入仓版为 `docs/base/base-render/t693-mut.mjs`
（末条 `6b617377` 即入仓版实跑）；两者做的是同一件事，最终读数以入仓版为准。
