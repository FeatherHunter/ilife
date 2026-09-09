# t88 变更前门禁基线（入仓副本）

> 票：wayfinder 地图 #63 / 票 **#88《HELP 速查台重建》**
> 本目录是 **#88 的唯一验收基线**，由编排者冻结，任何人不得改口径。

## 1. 来源与冻结时间

| 项 | 值 |
| --- | --- |
| 采集现场 | `.scratch/t88/baseline/`（`.scratch/` 被 `.gitignore` 忽略 → 现场不可复现，故入仓） |
| 采集时间 | 2026-09-09 19:57–20:07（本地） |
| 起点 sha | `90128d853d703457a0f48b419428c7c41c0e8e3f`（`master`）feat(86): 证据t86+changeset（真机4页exit0+只读sha同值+先看后写receipt） |
| 环境 | node v24.19.0／pnpm 11.8.0／Windows PowerShell 5.1／Chrome（headless 夹具可用） |
| 采集方式 | `pwsh` 工具逐条执行，每命令落盘 `<NN>-<门>.log` ＋ 回读 `MARK_<门>=$LASTEXITCODE`；build／test 持 `D:\ilife\.scratch\locks\gate.lock`（协议 §2 原样片段） |

## 2. 口径（冻结，勿改）

1. **四门 exit 0**：`pnpm build`／`pnpm boundaries`／`pnpm snapshot:check`／`pnpm publish:pre` 逐条 **exit 0**（变更前实测 0／0／0／0）。
2. **`pnpm test` 失败集「新增 = 0」**：以 `test-failset.txt`（**34 条具名白名单**，三轮 canonical 并集）为基准，比对**具名测试名集合**，**不以 exit 码为准**（`pnpm test` 基线 exit 1 属既有红）。
   - 判定命令：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt <after.log>` → 要求输出 `新增=0`。
3. **canonical 口径是 `pnpm test`，不得用 `node --test` 直跑替代**：两者不等价（直跑 tests 1011／fail 20；canonical tests 1017／fail 26；失败集差异 canonical 独有 17 条、直跑独有 9 条）。差异明细见 `mode-delta-node-direct-vs-canonical.txt`。
4. **抖动项**（三轮中仅 1 轮出现，共 5 条：`#41 M3 真 CLI 串行冒烟 18 新键`／`#76 无宿主可执行证据`／`#80 HELP 生成与键名一致性`／`helpers JS ≤820px 视口收窄为 3（FX-76-2）`／`③ check-combos 全绿`）不计入"新增"，但也不得据此放宽其余口径。
5. 基线本身若要调整，必须回到编排者裁决。

## 3. 基线结论摘要

| 门 | exit | 关键行 |
| --- | --- | --- |
| `pnpm build` | **0** | 无 `error TS` |
| `pnpm boundaries` | **0** | `boundaries: PASS` |
| `pnpm snapshot:check` | **0** | `OK: 快照 == 实际拉取版（0.1.0@932e7b250d278d50）` |
| `pnpm publish:pre` | **0** | `check-publish --pre：PASS` |
| `pnpm test:types` | 0 | 无 `error TS` |
| `pnpm doctor` | 0 | `doctor: PASS` |
| `pnpm publish:tarball` | 0 | `OK: skill-calorie tarball 含全部 6 件模板` |
| `pnpm publish:fresh` | 0 | `OK: fresh-tmp npm install 2 实包成功` |
| `pnpm publish:plan` | 0 | `PLAN 预演：base-paint → skill-calorie → dsh-life-pack → dsh-calorie` |
| `pnpm test` | **1** | **991 pass／26 fail**（tests 1017／suites 129），三轮计数一致 |
| `pnpm changeset:status` | **1** | **环境红**：`Cannot find module '@changesets/errors'`（node_modules 安装态残缺，与代码无关；按协议 §2.1 未自行 `pnpm install`） |
| `pnpm snapshot`（写） | 未跑 | 按设计不跑：会改写 `packages/ilife-skills/skill.snapshot.json`，校验由 `snapshot:check` 覆盖 |

## 4. 文件清单

| 入仓文件 | 来源（`.scratch/t88/baseline/`） | 说明 |
| --- | --- | --- |
| `BASELINE.md` | 同名 | 主基线文档（§5 为冻结口径） |
| `README.md` | 新建 | 本文件（入仓说明） |
| `test-failset.txt` | 同名 | **34 条具名白名单**（`;` 注释 ＋ 一行一条，可被 `t101-fail-set.mjs` 名单模式读取） |
| `test-failset-report.txt` | 同名 | canonical #1 失败集明细（含条目） |
| `failset-union.mjs` | 同名 | 并集生成器（`node failset-union.mjs <log…>`） |
| `t101-delta.txt` | 同名 | 相对入仓旧名单 `docs/research/t101-baseline-failures.txt` 的漂移（消失 15／新增 11） |
| `mode-delta-node-direct-vs-canonical.txt` | 现场生成 | `node --test` 直跑 vs canonical `pnpm test` 的失败集差异证据 |
| `01`–`03-*.log` | 同名 | 起点记录（`git status`／`git log -1`／分支） |
| `04-pnpm-build.log`／`08-test-types.log` | 同名 | 构建与类型门（`tsc -b`） |
| `05-boundaries.log`／`06-snapshot-check.log`／`07-publish-pre.log` | 同名 | 四门之三 |
| `09b-pnpm-test-canonical-1.log`／`09c-pnpm-test-canonical-2.log` | `09b-pnpm-test.log`／`09c-pnpm-test.log` | **canonical `pnpm test` 两轮**（第二轮用于证明抖动对：`#80`＋`check-combos` ↔ `#76`＋`helpers`） |
| `10-doctor.log`／`11-publish-tarball.log`／`12-publish-fresh.log`／`13-changeset-status.log`／`14-publish-plan.log` | 同名 | 其余门禁 |

**未入仓项及原因**：

- `09a-pnpm-test-dead.log`（26 KB）＝首跑被会话中断杀死的**截断证据**，非有效基线。
- `09-pnpm-test.log`（356 KB）＝`node --test` **直跑兜底模式**日志，与 canonical 不等价（见 §2.3），仅保留差异摘要 `mode-delta-…txt`；正文留在采集现场。
- `09d-pnpm-test.log`＝与 `09c` 同质的第三轮，为控制体积（入仓总计 **276.8 KB** ≤600 KB）未入仓。
- `run-gates.ps1`＝上一 session 的残留物，**本基线未使用**。

## 5. 复跑（实施者／审查者）

```powershell
# 四门（须持 gate.lock）
pnpm build; pnpm boundaries; pnpm snapshot:check; pnpm publish:pre

# 全量测试（canonical，须持 gate.lock；exit 1 属既有红）
pnpm test *> .scratch/<你的目录>/after.log

# 失败集 delta（新增必须为 0）
node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/<你的目录>/after.log
```
