# 票 #351 · 门禁运行读数件（`t351-v16` 窗口）

**本件是什么**：本窗口**所有持锁运行**的声明与对账源。第 §一 节逐条声明（`GATE-RUN runId=<标识> cmd=<命令>`，边跑边补），第 §三 节把本次窗口内 `.scratch/locks/gate-runs.log` 的相关条目**逐字导出**——导出件即对账源，两条应逐字对得上。

- 锁协议：`docs/subagent-concurrency-protocol.md` §2；包装器 `tooling/run-locked.mjs`；锁目录 `.scratch/locks/`（锁文件 `gate.lock`、归属记录 `owner.json`、留痕 `gate-runs.log`）。
- 票号 `--ticket 351`；本窗口的 `runId` 一律以 `t351-v16-` 开头。
- 本件只导出 `ticket=351` 且 `runId` 以 `t351-v16-` 开头的条目；**同窗口其它会话（543／478／157 等）的条目不在件**（§三 只留一条 `157` 的引用行，见 §四）。

---

## 一、声明（本窗口持锁运行，逐条）

| # | runId | 命令 | exit | 这次跑出来的是什么 |
|---|---|---|---|---|
| 1 | `t351-v16-gencheck` | `pnpm gen:check` | **1** | **未达目的，但被挡住的原因不是生成件**：本机 `pnpm` 是 DSH 自带那份，跑脚本前先做依赖状态自检，判定要 `pnpm install` 重装 `node_modules`，无 TTY 即 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 中止（日志 `.scratch/t351-v16/logs/gen-check.log`）。票面禁「在仓库里跑任何包管理器安装／新增命令」，故**不按它的提示设 `CI=true` 放行**，改跑它底层那条命令（#2）。 |
| 2 | `t351-v16-gencheck-node` | `node packages/skill-calorie/scripts/gen-cli.mjs --check` | **0** | 生成件同步面绿：`package.json` 的 `gen:check` 逐字就是这条（`"gen:check": "node packages/skill-calorie/scripts/gen-cli.mjs --check"`），绕开 pnpm 包装层＝同一条判据。 |
| 3 | `t351-v16-run` | `node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-v16/products` | **0** | **全量重跑**：37 份产物 ＋ 29 条判据，`RESULT: 66/66`、`PROBE: PASS（29/29 判据全绿）`。 |
| 4 | `t351-v16-wall-stage` | `cmd /c "cd /d D:\ilife\docs\skills\skill-calorie\scene05-验收墙 && node gen-wall.mjs --stage D:\ilife\.scratch\t351-v16\products ."` | **0** | 复制 37 件进墙目录 ＋ 出双墙 ＋ 出索引 ＋ 内建自检：`37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发`。 |
| 5 | `t351-v16-check` | `cmd /c "cd /d D:\ilife\docs\skills\skill-calorie\scene05-验收墙 && node gen-wall.mjs --check ."` | **0** | **票面验收命令 ① 的正例读数**（见 `t351-v16-evidence.md` §五）。 |
| 6 | `t351-v16-check-red` | `cmd /c "cd /d …scene05-验收墙 && node …\mutate.mjs backup manifest.json …\manifest.bak.json && node …\mutate.mjs break manifest.json 1 && node gen-wall.mjs --check ."` | **1** | **票面验收命令 ② 的反例**：清单第 1 行发布名改成盘上不存在的名字 → `36 格；…；缺失 1 -> 不可发` ＋ 点名 `清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html`。 |
| 7 | `t351-v16-check-restore` | `cmd /c "cd /d …scene05-验收墙 && node …\mutate.mjs restore manifest.json …\manifest.bak.json && node gen-wall.mjs --check ."` | **0** | **反例改回**：回 `37 格；链接 189 条；缺失 0 -> 可发`；清单 SHA256 与改前逐字一致（`086E6975…371E78`）。 |
| 8 | `t351-v16-counter-stage`（第 1 次） | `node docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs --stage .scratch/t351-v16/products .scratch/t351-v16/counter` | **2** | 未达目的：`--stage` 的目标目录里要先有清单，草稿副本目录当时是空的 → `没有清单：…\counter\manifest.json`。补齐清单后**用同一个 runId 重跑**（第 3 个条目）。 |
| 9 | `t351-v16-counter-dead`（第 1 次） | `cmd /c "cd /d D:\ilife\.scratch\t351-v16\counter && node …\mutate.mjs break manifest.json 1 && node …\gen-wall.mjs . 手机墙-390.html 390 820"` | **1** | 因 #8 第 1 次未成、`counter\manifest.json` 不在，本条只跑到报错。补齐后重跑（第 10 个条目）。 |
| 10 | `t351-v16-counter-stage`（第 2 次） | 同 #8 | **0** | 草稿副本铺成：`复制进仓：37 件` ＋ `37 格；链接 189 条；缺失 0 -> 可发`。 |
| 11 | `t351-v16-counter-dead`（第 2 次） | 同 #9 | **1** | **两条腿一起红的读数**（在草稿副本里做，不碰交付目录）：`36 格；链接 114 条；缺失 2 -> 不可发`，两行点名 —— `清单点名却没有文件：1 看本周计划 -> …` 与 `页上引用却落不到：看本周计划-反例-盘上没有.html`。这就是仓规 §6.2／§7 点名的那处**假绿灯**的反面证据。 |

> **runId 复用如实记账**：#8／#9 与 #10／#11 是两对同 id 的运行（第一次未达目的、补齐后原 id 重跑）。`gate-runs.log` 里因此各有两条 `START`／`RUN`，§三 逐字保留、不做挑选。

---

## 二、本票**未**持锁的运行（如实记账：只读、不改工作区、不产生产物）

这些不是「跑批／编译／测试／变异」，只是读盘取样，故没有进持锁区；命令与读数都写在 `t351-v16-evidence.md` 里，列在这里免得到时对不上：

| 动作 | 命令 | 读数 |
|---|---|---|
| 数产物份数并列出文件名 | `Get-ChildItem .scratch/t351-v16/products -Filter *.html` | 37 份 |
| 载荷面双前缀检索 | `Select-String -Path .scratch/t351-v16/products/*.html -Pattern "calorie\.calorie\." -AllMatches` | 27 份命中、各 1 处、合计 27 |
| 双前缀落点定位 | 取该文件 `IndexOf("calorie.calorie.")` 后看前后 260／400 字节 | 落在 `id="ilife-copy-log"` 的 `data-t` 载荷「场景标识」行 |
| 墙目录结构读数 | `Get-ChildItem` ＋ 对三张页各跑三条正则（`<iframe `／`loading="lazy"`／`transform:scale\(`） | 40 个 `.html`；双墙各 37 格、`loading="lazy"` **0** 处；桌面墙 37 处缩放 |
| 清单完整性 | `Get-FileHash manifest.json -Algorithm SHA256` ＋ 读首 3 字节 | 与改前逐字一致；首 3 字节 `123,10,32`＝`{`＋换行＋空格 ⇒ **不带 BOM** |
| 外部五条唤醒词命中 | 对 `packages/skill-calorie/dist/triggers/*.js` 三件数这 5 个词的命中数 | `routes.generated.js` 6、`scene-05-workout.js` 32、`wake-assets.js` 16 |
| 返工自证（交付形状，2026-09-15 编排者收活后） | 读 `t351-v16-evidence.md` 全文：① 数**表格区**（以 `\|` 起始的行）里 `<批>`／`<墙>` 的出现次数；② 正则抠出反引号里的 `` `D:\…\.html` `` 去重后逐条 `Test-Path -LiteralPath` | ① **0**（95 行表格区；全文残留 2 处＝文件头第 7、8 行图例本身，按编排者要求保留）；② 产物原批 **37/37**、发布名副本 **37/37**（合计 74/74） |

---

## 三、原始导出（`D:\ilife\.scratch\locks\gate-runs.log`，逐字，按时间序）

```text
START ticket=351 runId=t351-v16-gencheck cmd="pnpm gen:check" waitedMs=20013 pid=64180 at=2026-09-15T11:45:35.011Z
RUN ticket=351 runId=t351-v16-gencheck cmd="pnpm gen:check" waitedMs=20013 exit=1 pid=64180 at=2026-09-15T11:45:44.256Z
START ticket=351 runId=t351-v16-gencheck-node cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=40020 pid=35800 at=2026-09-15T11:47:01.069Z
RUN ticket=351 runId=t351-v16-gencheck-node cmd="node packages/skill-calorie/scripts/gen-cli.mjs --check" waitedMs=40020 exit=0 pid=35800 at=2026-09-15T11:47:01.309Z
START ticket=351 runId=t351-v16-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-v16/products" waitedMs=0 pid=60032 at=2026-09-15T11:47:01.363Z
RUN ticket=351 runId=t351-v16-run cmd="node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-v16/products" waitedMs=0 exit=0 pid=60032 at=2026-09-15T11:47:11.370Z
START ticket=351 runId=t351-v16-wall-stage cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node gen-wall.mjs --stage D:\\ilife\\.scratch\\t351-v16\\products .\"" waitedMs=80058 pid=18552 at=2026-09-15T11:49:56.561Z
RUN ticket=351 runId=t351-v16-wall-stage cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node gen-wall.mjs --stage D:\\ilife\\.scratch\\t351-v16\\products .\"" waitedMs=80058 exit=0 pid=18552 at=2026-09-15T11:49:56.656Z
START ticket=351 runId=t351-v16-check cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node gen-wall.mjs --check .\"" waitedMs=0 pid=62376 at=2026-09-15T11:50:26.763Z
RUN ticket=351 runId=t351-v16-check cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node gen-wall.mjs --check .\"" waitedMs=0 exit=0 pid=62376 at=2026-09-15T11:50:26.871Z
START ticket=351 runId=t351-v16-check-red cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs backup manifest.json D:\\ilife\\.scratch\\t351-v16\\manifest.bak.json && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node gen-wall.mjs --check .\"" waitedMs=0 pid=32968 at=2026-09-15T11:50:26.927Z
RUN ticket=351 runId=t351-v16-check-red cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs backup manifest.json D:\\ilife\\.scratch\\t351-v16\\manifest.bak.json && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node gen-wall.mjs --check .\"" waitedMs=0 exit=1 pid=32968 at=2026-09-15T11:50:27.106Z
START ticket=351 runId=t351-v16-check-restore cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs restore manifest.json D:\\ilife\\.scratch\\t351-v16\\manifest.bak.json && node gen-wall.mjs --check .\"" waitedMs=0 pid=44980 at=2026-09-15T11:50:27.164Z
RUN ticket=351 runId=t351-v16-check-restore cmd="cmd /c \"cd /d D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙 && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs restore manifest.json D:\\ilife\\.scratch\\t351-v16\\manifest.bak.json && node gen-wall.mjs --check .\"" waitedMs=0 exit=0 pid=44980 at=2026-09-15T11:50:27.308Z
START ticket=351 runId=t351-v16-counter-stage cmd="node docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs --stage .scratch/t351-v16/products .scratch/t351-v16/counter" waitedMs=0 pid=69472 at=2026-09-15T11:50:46.782Z
RUN ticket=351 runId=t351-v16-counter-stage cmd="node docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs --stage .scratch/t351-v16/products .scratch/t351-v16/counter" waitedMs=0 exit=2 pid=69472 at=2026-09-15T11:50:46.928Z
START ticket=351 runId=t351-v16-counter-dead cmd="cmd /c \"cd /d D:\\ilife\\.scratch\\t351-v16\\counter && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙\\gen-wall.mjs . 手机墙-390.html 390 820\"" waitedMs=0 pid=46672 at=2026-09-15T11:50:47.025Z
RUN ticket=351 runId=t351-v16-counter-dead cmd="cmd /c \"cd /d D:\\ilife\\.scratch\\t351-v16\\counter && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙\\gen-wall.mjs . 手机墙-390.html 390 820\"" waitedMs=0 exit=1 pid=46672 at=2026-09-15T11:50:47.111Z
START ticket=351 runId=t351-v16-counter-stage cmd="node docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs --stage .scratch/t351-v16/products .scratch/t351-v16/counter" waitedMs=0 pid=53796 at=2026-09-15T11:50:54.842Z
RUN ticket=351 runId=t351-v16-counter-stage cmd="node docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs --stage .scratch/t351-v16/products .scratch/t351-v16/counter" waitedMs=0 exit=0 pid=53796 at=2026-09-15T11:50:54.981Z
START ticket=351 runId=t351-v16-counter-dead cmd="cmd /c \"cd /d D:\\ilife\\.scratch\\t351-v16\\counter && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙\\gen-wall.mjs . 手机墙-390.html 390 820\"" waitedMs=0 pid=29508 at=2026-09-15T11:50:55.079Z
RUN ticket=351 runId=t351-v16-counter-dead cmd="cmd /c \"cd /d D:\\ilife\\.scratch\\t351-v16\\counter && node D:\\ilife\\.scratch\\t351-v16\\mutate.mjs break manifest.json 1 && node D:\\ilife\\docs\\skills\\skill-calorie\\scene05-验收墙\\gen-wall.mjs . 手机墙-390.html 390 820\"" waitedMs=0 exit=1 pid=29508 at=2026-09-15T11:50:55.322Z
```

---

## 四、本票**引用**但不属本窗口的一条（照抄，不算本票的运行）

票面 §六-2 点名的「场景05 三条验收测试在当刻 HEAD 已实测为绿（编排者跑的）」，本席**未重跑**，只从同一份 `gate-runs.log` 里引用它的读数（票号栏记 `157`，runId 不是本窗口的）：

```text
START ticket=157 runId=a4fb4f0e-8921-4f4d-9b52-16ead1e13a28 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=1 pid=51628 at=2026-09-15T11:41:19.266Z
RUN ticket=157 runId=a4fb4f0e-8921-4f4d-9b52-16ead1e13a28 cmd="node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs" waitedMs=1 exit=0 pid=51628 at=2026-09-15T11:41:26.992Z
```

> 它打的是 `exit=0`；票面另给的 `tests 3 / pass 3 / fail 0` 是本席未参与的那次运行的摘要行，本件按「引用」记，不当本票读数用。
