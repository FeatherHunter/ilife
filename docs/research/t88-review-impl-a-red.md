# #88 实施 A 段 · 红队审查（红队 3 席 · 可实施性与 parity）

> 被审：`8bb13a9`→`d7a0492`→`92b9cfd`→`bf43324`→`42d51f2`（S1／S2／S3）。依据：协议 §5.1／§6、`.scratch/orchestrator/{dispatch-rules,t88-acceptance}.md`、`docs/research/t88-plan.md`、`t88-impl-a.md`、F3 冻结镜像（302,820 B）。
> 纪律：只读仓内；写仅 `.scratch/orchestrator/red3-*` 与本文件；build／`node --test`／`pnpm test`／变异／git add／commit 全持锁（各次 `WAITED=0`）；无安装、无杀进程；每次测试后 `SKILL.md` 状态为空。**未读蓝队同票报告**（保持独立）。

## ① 独立复跑

| 对象 | 实测 | exit |
|---|---|---|
| `t88-probe-impl-a.mjs`（复制为 `red3-probe-impl-a.mjs`＋样本落点重定向到本席 scratch，不写其 `.scratch/t88/out/`） | `RESULT: 44/44 fails=0` | 0 |
| `probe-contract`／`rework1`／`shell3`／`rework2` | 17/17／26/26／exit 0／6/6 | 0 |
| 靶向 `node --test …help-center-88.test.mjs`（持锁） | tests 23／pass 23／fail 0 | 0 |
| 四门 `build`／`boundaries`／`snapshot:check`／`publish:pre`（持锁） | 逐条 PASS | 0/0/0/0 |
| canonical `pnpm test`（持锁，**本席自跑**，23 s） | tests 1040／pass 1015／fail 25；`base=34 after=29 新增=0 消失=5`；SKILL.md CLEAN | 1（既有红） |
| 本席自设 `red3-recompute.mjs`（35 断言） | `RESULT: 35/35 fails=0` | 0 |

三轮 `after-*.log` delta 独立重算（`新增=0`×3、并集 0）；白名单与 `93e27f9` diff 0 行（blob `b7a48bb` 逐字相同）。

## ② A1–A8

| # | 判定 | 本席依据 |
|---|---|---|
| A1 | ✅ | 10／54／436；id 436/436、子功能 54/54；types 329/79/6/22（内联色实测 408＋6）；`____` 130、「三句话」436 **两侧同算** |
| A2 | ✅ | 恒走 `renderHelpShell`；`git diff --stat 93e27f9..42d51f2 -- packages/base-render` **0 行**；130 implemented／0 pending；file 态 436 卡／54 子功能／1,308 按钮 |
| A3 | ✅ | ①六标记逐个 0＋泛化 0＋`report.markers` 六键；②数据层／HTML 层唯一＋重复抛 `duplicate-id`；③`COPY_RUNTIME_JS===buildSharedHelpersJs()`＋剥 helpers 后三串 0＋源码零通道 |
| A4 | ✅ | 四门复跑 exit 0；测试门**本席自跑 canonical** delta 新增 0 |
| A5 | ✅ | 4 处 src 变异＋1 探针级；本席独立重跑 3 处（⑤） |
| A6 | ✅ | `git ls-files docs/research/t88-*` 含证据＋9 探针；`RESULT: n/m` 机器可读 |
| A7 | ✅ | `git diff --name-only 8bb13a9~1..42d51f2`＝9 条，全在声明路径；无 `plugin-*`／`cmd_read.ts`／`keys.ts`／`templates` |
| A8 | ✅ | 本段零 `buildSharedHelpersJs`／`style.ts` 改动 |

## ③ 样本复算

磁盘样本与本席独立渲染**逐字一致**（sha256 同）。逐项复现：**1,010,979 B／3,559 行**／`data-scene-id` 436（唯一 436）／`data-subgroup-id` 54（唯一 54）／`data-action-id` 1,308／六标记 0／泛化 0／HTML `id` 13（唯一 13）／inline 802,573 B／text 24,421 B。**零不符**。

## ④ F3 parity

分组序／label／图标逐字相等；54 子功能 `(id,label,序)` 逐字相等；**436 条 `prompt_template`／`title`／`wake_word` 逐字相等**；`types` 文本逐条相等（F3 payload 全字符串，E-2 复证 414）；**三档色逐条 = F3 运行时 `TYPE_DEFAULT`**（结果/回执/查看/校验/选择 `#e8f2ff/#0a63ce`、过程/向导 `#e2f7f5/#00897b`，F3 `:1693-1703`）＋产物内联色 408／6；`____` 130／「三句话」436（F3 侧独立复算同值）；L-19：22 条 legacy id 与 F3 `legacy_*` 集**完全不相交**。

## ⑤ 变异复核（自写脚本、持锁、`tsc -b --force` 绕开其自报 mtime 陷阱）

| 变异 | 红 | 还原 |
|---|---|---|
| MUT-A（legacy id 回 `legacy_*`） | 靶向 fail 1＋本席探针 33/35；sha `B7FA011F…A2914128`→`5793CAD6…40644192`（**与其自报逐字相同**） | sha 一致；23/23＋35/35 |
| MUT-B（置空 `sharedCssText`） | `TemplateError: 资产为空串或未提供…`（`asset-missing`）；靶向 1/0/1 | sha 一致；绿 |
| **MUT-E（本席自设）** | `receipt` 色改过程色 → **其 23 用例全绿（23/23）**，本席探针红（32/35） | sha 一致；绿 |

三次还原后 `git status --short -- helpCenter.ts` 均空。MUT-B2／C／D 未复跑（同族已覆盖）。

## ⑥ R-cond 1–8

R-cond-1 ✅ 真红（`asset-missing` 复现）；2 ✅ L-19 入仓；3 ✅ 方案 §3 改「方案已定，实施后达成」；4 ✅ `rework1` 改解析 `style.test.mjs` ns 表＋`help.ts` `cls()` 实参（26/26）；5 ✅ `Object.values(TEMPLATE_MARKERS)`＋泛化行；6 ✅ 指针改 `docs/research/`；7 ✅ 测试 `:124` id 轴子集；8 ✅ 三轮＋并集 `新增=0`、白名单 0 行。

## ⑦ 新探针（盲区）

`red3-recompute.mjs`：①inline `<style>` 内容 === `buildStyleSheet().css` 逐字、helpers 块 === `ASSET_WRAPPERS` 包裹的 `COPY_RUNTIME_JS`、inline 的 `<section>` 片段 === file 的 `<section>` 片段逐字（**真同源**）；②file 436 id 去转义后与数据层 id **逐字同序**（其测试只比 inline vs file）；③text 态**逐行解析** 436 条按序比对（替代其 `includes` 弱判据）；④**徽章色逐条 = F3 `TYPE_DEFAULT`**（其白名单仅集合相等）；⑤无场景静默丢弃；⑥缺省 `updatedAt` 两次渲染逐字相同；⑦inline 尊重 `sceneData` 覆盖。`red3-escape.mjs` 量化属性转义面。

## ⑧ 缺陷清单

- **D-1（S3 · 本票引入）** 三档色**逐条映射无断言**：MUT-E 证明其 23 用例＋44/44 探针对「哪一档配哪个色」零鉴别力（互换 `receipt`／`process` 全绿）。产物本身正确。建议补 `TYPE_DEFAULT[badge.text] === badge.{bg,fg}` 逐条断言。
- **D-2（S3 · 本票引入）** 1/436 的 `data-scene-id` 被 `escapeHtml`（`… --days <N> --chain "…"`）→ 属性值非 CLI 原文；去转义可逐字还原（已证）。L-19 应注明「HTML 属性为转义形态」。
- **D-3（S3 · 本票引入）** `text` 态含裸 `<N>`（同一条 legacy CLI）：语义未冻结（其 §7.2 已登记），但**非 HTML-safe**，建议明写。
- **D-4（S3 · 范围外发现）** 审查期间冻结白名单 `test-failset.txt` **被并发会话瞬时改写为 30 条**（头注「2 轮并集，blue3-test-1/2.log」＋末行 `test\schedule-split.test.mjs`），终态与 HEAD blob 逐字一致；`blue3-summary3.txt:2` `BLUE3_WL_BLOB_MATCH=False` 独立佐证；`failset-union.mjs:21` 会覆盖该冻结文件 → 建议加只读守卫。
- **D-5（S3 · 本票范围）** 其探针「text 覆盖 436 id」用 `includes`（子串即通过）；本席已用逐行解析替代验证。
- **D-6（S1 违规 · 纪律 · 本票引入）** 实施者**自报**一次未持锁 `node --test`（`t88-impl-a.md` §7-5）。§2 把 `node --test` 列入必须持锁项，§6 明确「绕过锁跑 build/test/git = **S1 违规**」。减轻情节：单次、只读、锁空闲（同序列 `WAITED_*=0`）、无并发冲突、SKILL.md 三轮 CLEAN、主动登记、其后全程持锁。**事实以自报为据，本席无法独立取证。**

## ⑨ 五维

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **29** | A1／A2／A3 逐条复算通过、零新增契约面；扣 1＝三档色映射未断言 |
| 证据真实可复现 25 | **24** | 9 探针＋靶向＋四门＋canonical 全自跑；样本与独立渲染逐字一致；扣 1＝text 同源弱判据 |
| parity 20 | **19** | 436 逐字／分组序图标／子功能 id／三档色／130／436 全通过；扣 1＝1 条属性转义＋text 裸尖括号 |
| 工程红线 15 | **11** | 路径／持锁／危险 git／安装均合规；扣 4＝§6 S1 违规（D-6） |
| 文档同步 10 | **10** | L-01…L-19 入仓回填、偏离记账、未做／未确证如实登记 |
| **合计／均分** | **93/100** | 技术面无 S1 |

## verdict

# **FAIL（S1 违规 · 纪律）**

- **技术面**：A1–A8 全部达成，无技术性 S1、无用户可见回归，证据逐条可复现。
- **否决项**：§6「绕过锁跑 build/test/git = S1 违规」——D-6 本票引入且自认；按冻结口径「任一 S1 → FAIL」。
- **建议处置（裁决权在编排者）**：① 按 §6 字面 → 成果作废重做（鉴于零损害、自报、复跑全绿，**本席不建议**）；② 书面裁定 D-6 降 S2（不可重犯＋具名票号）→ 技术面 PASS（93）；③ 无论何者，D-1 的逐条色断言应在 S4／S5 补齐。
- **未复核**：MUT-B2／C／D 未复跑；`publish:tarball`／`fresh`／`plan`／`doctor` 未复跑（本段未改发布面）；F3 对账依赖仓外路径。审查结束时工作区含并发会话的 S4 WIP（`packages/base-render/src/{controls,style}.ts`），与本席路径无关。
