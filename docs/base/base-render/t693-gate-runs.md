# t693 运行记录导出（对账源，抄自 `.scratch/locks/gate-runs.log`）

本文件是协议 §2.3 第 4 条的导出件：把 `ticket=693` 的全部 `RUN` 条目按窗口抄录，供第三方复核。
判定「有没有走包装器」看运行记录里的持锁行（`START`／`RUN`），不看持锁者记录文件在不在（它只在持锁期间存在、释放即删）。
抄录时刻 2026-09-18T10:39:10.499Z；条目共 39 条（含复核席位与实施席位两方，按 cmd 与时刻分块）。

## 一、门禁窗口（协议 §2.4 的对账窗口，逐条与 `t693-证据.md` §4.4 的声明同 runId）

窗口：`2026-09-18T10:37:07.594Z` → `2026-09-18T10:37:14.465Z`；门禁对账读数 `RESULT: matched=7/7 undeclared=0 gate-audit: PASS`
（`runId=2bce452f-4a5b-49e2-9880-ac9ad8d29929`，该对账命令自身在此窗口之外）。

```
RUN ticket=693 runId=180d8759-c908-4e3c-96e1-784d69041256 cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=35252 at=2026-09-18T10:37:07.796Z
RUN ticket=693 runId=9d8d163e-7aa4-4a29-b427-1a56676767ec cmd="node docs/base/base-render/t693-mut.mjs" waitedMs=0 exit=0 pid=41568 at=2026-09-18T10:37:09.790Z
RUN ticket=693 runId=556741cf-6b76-40f1-a27c-52c26be14212 cmd="node packages/base-render/scripts/gen-help-shell.cjs --check" waitedMs=1 exit=0 pid=41744 at=2026-09-18T10:37:09.923Z
RUN ticket=693 runId=0c4fc890-fc46-431f-a3ef-5668931e9d5f cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=0 exit=0 pid=29764 at=2026-09-18T10:37:10.141Z
RUN ticket=693 runId=d356c887-deab-45ad-895b-863128cd106d cmd="node --test packages/base-render/test/help-shell-136.test.mjs packages/base-render/test/mobile-base-507.test.mjs" waitedMs=0 exit=0 pid=41596 at=2026-09-18T10:37:10.379Z
RUN ticket=693 runId=7ee6a73f-505a-4880-b769-38c83a002155 cmd="node --test packages/skill-memo-ilife/test/help-dom-243.test.mjs packages/skill-schedule/test/help-file-202.test.mjs packages/skill-home/test/help-delivery-190.test.mjs packages/skill-chef/test/help-delivery-216.test.mjs packages/skill-bill/test/help-exit-148.test.mjs" waitedMs=0 exit=0 pid=41616 at=2026-09-18T10:37:14.202Z
RUN ticket=693 runId=4449c352-43a6-4836-97de-5ad3d263b090 cmd="node docs/agents/t540-指纹绑定.mjs --scope packages/base-render" waitedMs=0 exit=0 pid=37128 at=2026-09-18T10:37:14.450Z
```

## 二、窗口外 · 实施席位（过程运行，逐条披露在 `t693-证据.md` §六，不进门禁对账）

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
RUN ticket=693 runId=07afd6f1-b7fa-4a0a-8b51-e8266e81961e cmd="node .scratch/t693/commit.mjs" waitedMs=1 exit=0 pid=2712 at=2026-09-18T10:22:02.133Z
RUN ticket=693 runId=132393e9-5526-4f54-a894-0991cf64a2f0 cmd="pnpm test" waitedMs=0 exit=1 pid=12180 at=2026-09-18T10:25:05.661Z
RUN ticket=693 runId=45840919-0f93-4051-b02f-d0ba085df7a5 cmd="node --test packages/base-render/test/help-toast-stack-693.test.mjs" waitedMs=110027 exit=0 pid=16368 at=2026-09-18T10:25:12.639Z
RUN ticket=693 runId=de347f21-8573-4350-ad5c-82e6430de13b cmd="node packages/base-render/scripts/gen-help-shell.cjs --check" waitedMs=0 exit=0 pid=42148 at=2026-09-18T10:25:26.100Z
RUN ticket=693 runId=315ec665-4701-4b4b-a809-081b8c39395b cmd="node node_modules/typescript/bin/tsc -b packages/base-render" waitedMs=0 exit=0 pid=25716 at=2026-09-18T10:25:26.275Z
RUN ticket=693 runId=579094ed-c85e-4881-867c-8866e0f909fc cmd="node --test packages/base-render/test/help-shell-136.test.mjs packages/base-render/test/mobile-base-507.test.mjs" waitedMs=0 exit=0 pid=35124 at=2026-09-18T10:25:30.875Z
RUN ticket=693 runId=29148971-ece9-4686-b8ac-b426b551d656 cmd="node packages/base-render/scripts/gen-help-shell.cjs --check" waitedMs=0 exit=0 pid=42856 at=2026-09-18T10:27:12.185Z
RUN ticket=693 runId=3fe9c991-b1bb-409a-b3df-2555e4463288 cmd="node .scratch/t693/review-probe.mjs" waitedMs=0 exit=1 pid=38108 at=2026-09-18T10:27:50.693Z
RUN ticket=693 runId=119d85c8-c7dc-4271-b469-a1ca59d508ce cmd="node .scratch/t693/review-restore.mjs" waitedMs=0 exit=0 pid=42752 at=2026-09-18T10:28:27.777Z
RUN ticket=693 runId=3b1ba76c-a700-474b-a14a-34e856aaf358 cmd="node .scratch/t693/review-probe.mjs" waitedMs=0 exit=0 pid=37824 at=2026-09-18T10:29:22.174Z
RUN ticket=693 runId=6b8007e5-fca8-4d07-bc52-dd501aa5842d cmd="node --test packages/skill-memo-ilife/test/help-dom-243.test.mjs packages/skill-schedule/test/help-file-202.test.mjs packages/skill-home/test/help-delivery-190.test.mjs packages/skill-chef/test/help-delivery-216.test.mjs packages/skill-bill/test/help-exit-148.test.mjs" waitedMs=0 exit=0 pid=30136 at=2026-09-18T10:29:52.028Z
RUN ticket=693 runId=8d31646a-1f3c-4c85-91db-dba550f7b857 cmd="node tooling/check-gate-audit.mjs --evidence docs/base/base-render/t693-证据.md --ticket 693 --since 2026-09-18T10:13:00Z --until 2026-09-18T10:21:00Z" waitedMs=0 exit=1 pid=2708 at=2026-09-18T10:30:22.018Z
RUN ticket=693 runId=c55d292f-e632-4f17-92bf-4b2be8c33677 cmd="node docs/agents/t540-指纹绑定.mjs --scope packages/base-render" waitedMs=0 exit=0 pid=4336 at=2026-09-18T10:30:31.719Z
RUN ticket=693 runId=df9b06bf-7798-494f-bb38-2b79ca8b7a05 cmd="node --test packages/base-render/test/*.test.mjs" waitedMs=1 exit=1 pid=7660 at=2026-09-18T10:30:44.319Z
RUN ticket=693 runId=5cb408e5-160c-499a-96d5-e5b8e60812f9 cmd="pnpm test" waitedMs=0 exit=1 pid=16460 at=2026-09-18T10:34:03.019Z
RUN ticket=693 runId=a2dfdfe7-243c-4965-9bdb-d0c4968b6493 cmd="node docs/agents/t540-指纹绑定.mjs --scope packages/base-render" waitedMs=0 exit=0 pid=16452 at=2026-09-18T10:36:13.509Z
```

## 三、窗口外 · 复核席位与其余（本席声明在 `t693-复核-独立.md` §三；本导出只作对账源，不代替其声明）

```
RUN ticket=693 runId=2bce452f-4a5b-49e2-9880-ac9ad8d29929 cmd="node tooling/check-gate-audit.mjs --evidence docs/base/base-render/t693-证据.md --ticket 693 --since 2026-09-18T10:37:07.594Z --until 2026-09-18T10:37:14.465Z" waitedMs=0 exit=0 pid=11832 at=2026-09-18T10:38:34.192Z
```
