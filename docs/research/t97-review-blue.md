# #97 蓝队审查报告（独立复现 · wayfinder #63）

> 被审：`4671169`／`11be0c7`／`a2e95be`。结论：**verdict FAIL** —— 无 S1-交付缺陷；**S2×2＋S3×3**；五维 **77<85**。
> 全部结论为审查者自跑（§5.1）；唯一写物＝本文件与 `.scratch/orchestrator/blue7-*`。

## ① 路径／禁区（0 命中）

三笔共 **6 文件**（`t97-probe-receipts.mjs`／`src/cli/write.ts`／`src/render/receipt.ts`／`t97-m5-contract.md`／`test/m5-receipt-97.test.mjs`／`t97-impl.md`）—— **全在声明路径内**；`src/analysis/**`、`packages/base-render/**`、`cmd_read.ts`、`tooling/**`、其余技能 **0 命中**；无 `git add -A` 痕迹。

## ② 契约合规

- **只追加成立**：`CrudReceipt extends M5Fields`（`receipt.ts:43`）；10 字段签名 parent↔`4671169` 逐字无改；键集冻结断言 10+7 通过。
- **`receipt` 形 `ok`/`message`**：`cmd_read.ts:224-226` 运行时强制（本票未改）；**P9** 由 C8 探针 5 键实测：stdout 恰一行 JSON、`shape='receipt'`、`version='0.1.0'` 不变。
- **冻结面**：base-render 靶向 **465/465 exit 0**（`32fba6dc`；派单称「130 条」与实测不符）；`snapshot:check` exit 0。
- 探针 **35/35**（`67326ca6`）、回归 **40/40**（`cb478f68`）我均独立复现。

## ③ `write.ts` 与 #120 交叠（无冲突／无覆盖）

`git diff 4671169 HEAD -- src/cli/write.ts` ＝ 18+/13-，**逐 hunk 核**：全属 #120（`SOFT_STILL_COUNTED→SOFT_EXCLUDED` 3 处＋注释＋`measureCliNames` 及 1 处调用），3 个文案 hunk 均**保留** #97 的 `ids:[]／idSource:'condition'／writtenFields:['is_deleted']`；反向 `4671169` diff 内 **0 处**触碰 `SOFT_*`／`HARD_*`／`deleteStatus`。→ **互不覆盖**，`4d98e5f` 干净叠加。

## ④ 门禁／对账（自跑，全部经 `run-locked.mjs --ticket 97`）

| 门 | runId | exit |
|---|---|---|
| `pnpm build` | `f163c0b0` | **0**（等锁 70s）|
| `pnpm boundaries` | `8f699043` | **0** |
| `pnpm snapshot:check` | `c48a93f8` | **0** |
| `pnpm publish:pre` | `69843e86` | **0** |
| 靶向 m5-receipt-97 | `cb478f68` | **0**（40/40）|
| 探针 | `67326ca6` | **0**（35/35）|
| canonical `pnpm test` | `fc68e5ef` | **4294967295** |

- **canonical**：测试本体跑完（`blue7-g7-canonical.log`：`tests 1086／pass 1058／fail 28`），包装器 wedged 未退（owner 活、子 `cmd.exe` 无子进程）→ **编排者裁定后释放锁**，RUN 记 `exit=4294967295`。delta（`t101-fail-set` exit 1）：**`base=34 after=32 新增=3 消失=5`**。
- **新增 3 条定责**：① `packages\skill-home\test\render.test.mjs`（suite 行）② `落库 · 饮食 batch/copy/…`（`AssertionError: calorie.diet.batch exit 3221225477 stderr=`＝`0xC0000005`）③ `覆盖门 · 35 写键逐键落库断言`（②的**级联**：崩溃后 6 键写后 SELECT 未执行）。②③属 `cmd-write-40-persist.test.mjs`（**非本票所有权**）。**单独复跑（先 `tsc -b --force` 重建，PRE/POST sha 均 `35E98EB962D0`／`16EACC103991`）**：persist `3836d37d`／`2531831e` **17/17**；home `61a44bd2`／`4d1d8e9f` **6/6** —— 三条**均不复现**；窗口内 4+ session，无 headless 与全量重叠。**分类：签名属 §5.1 B 类，但 §5.2 第 1 条形式强制 C 类；按 §6 交编排者三步判定。**
- **白名单**：`git diff 93e27f9 -- docs/research/t88-baseline/test-failset.txt` ＝ **0 行** ✅
- **对账（#120 同标准）**：`check-gate-audit --evidence docs/research/t97-impl.md --ticket 97 --since 2026-09-09T13:00:00Z --until 2026-09-09T13:30:00Z` → **exit 1，`matched=0/0 auditEntries=173 scoped=27 undeclared=27`**（证据**零** `GATE-RUN` 声明＋27 条无人声明）；**无** `docs/research/t97-gate-runs.log` 导出（§2.4.4）。反向核：证据引用的 **12 个 runId 全部**存在、`cmd=` 与声明**逐字一致**、exit 相符 → prose 可复现、机读声明缺失。

## ⑤ 提交／tracker

3 笔中文规范、内容＝声明路径；**未 push**（`origin/master` 仍 `90128d85`，last push 19:35 早于首笔 21:00:57）；reflog 近 40 条**全为 commit**（无 reset／checkout／stash／clean）；证据 4 文件受跟踪。票面 **OPEN**；body **无 BOM、真实换行、无字面 `\n`**。**认领＝第一笔写操作 ✅**（`issue-tracker.md:44` 用 `--add-assignee`；`assigned 12:55:07Z` < 首笔 `13:00:57Z`）。

## ⑥ 断电／变异纪律

自认 S3（变异后未即时重建 dist→假红）**已按 §7 更正留痕**（`t97-impl.md:155-160`）；两轮假红 `55f0c0ed`／`7dbd6f1d` 的 `40/5/35` 与 MUT-97-2 签名逐字一致。还原自证 `35E98EB9…A0C7`／`16EACC10…575A` 与我实测一致；`mut1 40/39/1`、`mut2 40/5/35` 与证据一致；**MUT- 残留 0**。审查期间红队曾对两文件做 src 变异（21:47／21:48），**dist 一度停在变异产物**——我的守卫（先校验 sha 再重建＋复跑）已阻断污染。

## ⑦ 自设新探针（打被审脚本盲区）

`.scratch/orchestrator/blue7-probe.mjs`（`e9365451`，**11/13**）：C1 `water.log` 重复口径、C2 `diet.add` 对照、C3 `exercise.add` 批量 ids、C4 条件写≡旧版 `id=n/a`、C5 同值 UPDATE、C6 **五个票面未覆盖键**的 `affectedRows` 只读对账、C7 幽灵字段／漂移／camelCase 覆盖、C8 P9＋`ok`/`message`、C9 `idSource` **四值**。盲区依据：`checkM5` 接受 `idSource∈{condition,none}` 即达标；票面测试 226-230 行只断言**三值**；§3.6 与漂移无脚本覆盖。

## ⑧ 缺陷清单

| 编号 | 级 | 归属 | 内容 |
|---|---|---|---|
| **D-1** | **S2** | 本票范围 | 证据**缺全部** `GATE-RUN` 声明＋无受跟踪对账源 → `check-gate-audit` **exit 1**（`matched=0/0, undeclared=27`）。与 #120 的 D-2 同类，须修（§2.4.2／§2.4.4）。 |
| **D-2** | **S2** | 本票范围 | `t97-impl.md:38` 引 `after2.json` 为 §2 表源，但表中 `body.measure-add` 行（`waistCm／hipCm`）**与所引文件不符**（after2 实为 `["date","waist_cm","hip_cm"]`）；真源 `after-final.json`（`gen-table2.mjs:4`）。即 `4671169` 该键输出**库列名**，违反契约 §3.4「CLI 参数名」，修复实由 #120 的 `4d98e5f` 落地（合并点已合规）。须更正引用＋补归属注记。 |
| **D-3** | S3 | 本票范围 | `water.log` 重复跳过硬编码 `ids:[]／idSource:'none'`，而 `addMeal` 已回传 `dupId`（`fetch/diet.ts:65,96`）；同情形 `diet.add` 为 `record／[dupId]`。实测 C1：`idSource=none ids=[] 库内原 id=2 m5Line="id=n/a … 影响 0 行"`，与 §3.3「`none`＝拿不到 id」张力（§3.6 又允许两读，契约内部不一致）。 |
| **D-4** | S3 | 本票范围 | 契约正本 `t97-m5-contract.md:102` 断言「同值 UPDATE → `noChange=true`」，**实测不成立**（C5：`weight.update` 同值 → `noChange=false, affectedRows=1`；该键从不传 `noChange`）。须修文或补实现。 |
| **D-5** | S3 | 范围外 | canonical 新增 3 条（定责见 §④）：`skill-home/render` 与 #97 无关联 → 按 §6 修订 2 第 1 步转票；persist 两条待编排者裁定 B/C。另 `run-locked.mjs:356-359` 无子进程超时／看门狗 → 活 owner wedged 时锁永不放（实测阻塞 red7 **440s**）。 |

**无 S1-交付缺陷**：合并点行为合规（35/35＋40/40＋四门 exit 0＋白名单 0 行＋P9 未破＋冻结面 465/465），无数据丢失，证据无造假（12 runId 逐条可核）。

## ⑨ 五维与 verdict

契约一致 **25**／30 · 证据真实可复现 **15**／25（D-1＋D-2）· parity **17**／20 · 工程红线 **13**／15 · 文档同步 **7**／10。**均分 77 → FAIL**（量刑律：均分 <85 → FAIL，无 S1 不豁免）。
**关闭前须修**：D-1（补 `GATE-RUN`＋导出 `docs/research/t97-gate-runs.log`）、D-2（引用改 `after-final.json`＋归属注记）；D-3／D-4／D-5 记账；persist 两条交编排者裁定。**本席不关票。**
