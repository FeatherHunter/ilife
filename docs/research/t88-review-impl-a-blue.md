# #88 实施 A 段 · 蓝队审查报告（契约／并发／门禁／纪律）

> 审查者：蓝队席（独立 session，只读源码／tracker）。被审：`8bb13a9`→`d7a0492`→`92b9cfd`→`bf43324`→`42d51f2`（HEAD `42d51f2`）。
> 依据：`docs/subagent-concurrency-protocol.md`（§2／§2.1／§2.2／§3／§5.1／§6）＋ `.scratch/orchestrator/t88-acceptance.md`（A1–A8）＋ `docs/research/t88-baseline/BASELINE.md`。
> 复跑现场 `.scratch/orchestrator/blue3-*`（gitignored）；脚本 `blue3-run-gates.ps1`／`blue3-round3.ps1`／`blue3-probe*.mjs`。**未改任何源码／证据／tracker**。

## ① 禁区与冻结面
- `git diff 90128d8..HEAD --stat` = 39 文件／5966 插入，逐条落在声明路径内（`93e27f9..HEAD` 为 17 文件／1805）。
- 禁区**逐条零改动**（`git diff 90128d8..HEAD --stat -- <路径>` 输出为空）：`packages/base-render/**`、`src/cli/cmd_read.ts`、`src/cli/keys.ts`、`templates/*`、`packages/plugin-*`、其余 5 技能、`packages/skill-calorie/SKILL.md`。
- 冻结面独立复算（读 `base-paint` dist）：`SPEC_FROZEN_SURFACE` **130／implemented 130／pending 0**。
- `src/render/index.ts` +7 行**仅加导出**：新增 12 值＋4 类型导出，**无删除／改名**（探针 P1：`90128d8` 导出名 ⊄ HEAD 为空集）。
- ⚠ **并发告警（范围外）**：审查期间 20:34:43 起工作区出现**非本段**改动 `packages/base-render/src/controls.ts`（+49 行，属 S4／实施 B 面）。本报告全部门禁／测试实测（20:31–20:34:06）**早于**该改动，结论未受污染；此后任何复跑都会带上它。

## ② 提交纪律
- 5 commit **逐条只含声明路径**（`git show --stat` 逐提交核对）；未跟踪的 `.tmp-*`／`docs/research/t123-release-evidence/` **未进任何提交** → 无 `git add -A`／`git add .` 痕迹。
- `git reflog`／`--all` 仅 `commit` 记录：**无** `stash`／`reset --hard`／`checkout --`／`clean`／切分支；`git stash list` 空。
- **未 push**：`master` 领先 `origin/master`(`90128d8`) 9 提交；无新增远端。
- 提交信息中文、含落点；变异还原走 `mutate-restore.ps1`（备份回拷＋sha256＋路径守卫），**未用 `git checkout`**。
- 收尾 `git status --short`：本票路径全干净；`SKILL.md` 三轮后均空（#124 未复现）。

## ③ 门禁实测（全部持锁，逐条 exit）
| 门 | exit | 现场 |
|---|---|---|
| `pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` | **0／0／0／0** | `blue3-gate-*.log` |
| 靶向 `node --test help-center-88` | **0** | 23/23（另在「父进程持锁」下复跑 23/23 exit 0） |
| canonical `pnpm test` R1／R2／R3 | 1／1／1（既有红） | 1040·1015·25／1038·1012·**26**／1040·1015·25 |
| `t101-fail-set.mjs` delta | — | R1 **新增=0**；R2 **新增=1**；R3 **新增=0** |
| 复核实施者 `after-{1,2,3}.log` | — | 3/3 **新增=0** |
| `git diff 93e27f9 -- test-failset.txt` | **0 行** | 白名单未改口径 |
- R2 唯一新增＝`test\schedule-split.test.mjs` **文件级崩溃**（tests 1038），**单跑 3/3 exit 0**，非本票路径；R2 期间我并发跑 8 路渲染探针 → 判**抖动＋审查者自身负载**，**非本票引入**（6 轮中 5 轮 新增=0）。
- 探针独立复跑（只读）：`t88-probe-impl-a.mjs` **44/44**（含 F3 仓外对账 5 条，F3 存在）、`probe-contract` **17/17**、`probe-rework1` **26/26**、`probe-rework2` **6/6**、`probe-shell3` exit 0。

## ④ 证据／tracker
- `git ls-files docs/research/t88-*` = 35 条；`t88-impl-a.md`／`t88-probe-impl-a.mjs`／`.changeset/t88-help-center.md`／`helpCenter.ts`／`help-center-88.test.mjs` **全部受跟踪**。
- #88：**state=OPEN**（未提前 close）、assignee=`FeatherHunter`（未被动过）、无 BOM（首字符 `#`）、`CRLF=0／LF=43`（真换行）、字面 `\n` 命中 **0**。
- **审查者自身事故（如实登记）**：我的脚本调用了 `docs/research/t88-baseline/failset-union.mjs`，该脚本会**改写冻结白名单** `test-failset.txt`（其自身注释已警告）。已用 `git cat-file blob` **逐字节还原**：`git hash-object` == `HEAD:…` = `b7a48bb…`，`git diff 93e27f9` 回 **0 行**；三轮 delta 分别在该污染**之前（R1／R2）与还原之后（R3）**的干净白名单上取得。此后不再调用该脚本。

## ⑤ 未持锁事件的独立裁定
**事实**：`t88-impl-a.md` §7-5 自认「核对 MUT-A 还原时用 `node --test …` 跑了一次（未持锁）」。证据面：`.scratch/t88/run-force-build.log` **为空**，该次运行**无任何可审计产物**；`WAITED_*` 从未落盘（`.scratch/t88/*.log` 命中 0）→「锁当时为空」**不可独立复核**。

① **构成 S1 违规：是。** §2（`subagent-concurrency-protocol.md:18`）把 `pnpm test`／`node --test` 明文列入**必须持锁**项且**无只读豁免**；§6（`:112`）明文「绕过锁跑 build/test/git…＝**S1 违规**」。自认不改变定性（§5.1:97 不因自认放宽）。
② **后果**：§6（`:112`）对该类违规的**唯一法定后果**是「该票成果**作废并重做**」；协议**未**给实施者／审查者「按比例豁免」的权力。按比例处置只能作为**编排者具名书面处置**成立（依据：`t88-acceptance.md:41`「裁决权在编排者」＋ §6:108「除非编排者**书面改期并给出具名票号**」机制）。
③ **审查者建议（非裁决）**：不建议维持字面「作废重做」，三条可验证理由——(a) **零共享面写入**：新代码零 `node:`／零 fs 写（P3 静态扫描全 0），靶向测试不写 `SKILL.md`，不可能损坏 `dist/`／`.tsbuildinfo`／index；(b) **结论可独立复现**：我持锁复跑 23/23、44/44、canonical 3 轮新增=0，与自认那次无分歧；(c) **自认且无掩盖**。但**必须**落地具名书面处置＋三项补偿控制：①持锁复跑证明无分歧（**我已完成**）；②书面记账（§7-5 **已完成**）；③补可审计痕迹——`run-locked.ps1` 的 `WAITED_*` 改落盘（现仅 `Write-Host`）。
④ **条文依据**：`:18`／`:97`／`:108`／`:110`／`:112`；`t88-acceptance.md:41`。

## ⑥ 自设新探针（被审脚本覆盖不到）
1. **出口面只增不减**（P1）：未动冻结出口面。
2. **跨进程／并发确定性**（P2）：两个独立 node 进程＋同进程 8 路并发渲染，file 态 sha256 全等（`3947b13f…`／1,010,979 B）；源码 `Date.now`／`new Date` 命中 0 → 无隐藏状态／时间源。
3. **属性安全与往返**（P3）：436 条中 **1 条** legacy `Scene.id` 含 `"` 与 `<N>`（`python scripts/render_today_meals.py … --chain "…"`）；冻结壳转义正确（属性 `&quot;`／`&lt;`，payload `\u003c`／`\"`），**往返逐字相等**、`data-t` 可复制（Q1–Q8 全绿）→ 非缺陷，登记 #106 注意项。
4. **并发窗口**（P3b）：父进程**持协议锁**时子进程跑靶向测试 **exit 0／23-23**；测试文件零锁获取（无死锁面）；锁自持自放、无残留。
5. **dist 新鲜度**（P4）：功能断言跑 gitignored `dist/`；断言 dist 不早于 src 且含 R1-7 语义 → 未踩 `tsc -b` 增量 mtime 陷阱。

```js
// 最小可复跑骨架（完整脚本：.scratch/orchestrator/blue3-probe*.mjs）
const m = await import('file:///D:/ilife/packages/skill-calorie/dist/render/index.js');
const d = m.buildHelpSceneData({ updatedAt: '2026-09-09 12:00' });
const s = d.groups.flatMap(g => g.subgroups.flatMap(x => x.scenes));
const html = m.renderHelpCenterHtml({ mode: 'file', updatedAt: '2026-09-09 12:00' }).html;
const attr = [...html.matchAll(/data-scene-id="([^"]*)"/g)].map(x => x[1]);
const dec = t => t.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
console.log('ID_EQ', JSON.stringify(attr.map(dec)) === JSON.stringify(s.map(x => x.id)));
console.log('ATTR_SAFE', attr.every(a => !/["<>]/.test(a)), 'N', attr.length);
```

## ⑦ 缺陷清单
| # | 级别 | 归属 | 内容 |
|---|---|---|---|
| **D1** | **S1 违规** | 本票范围（过程） | 未持锁 `node --test` 自检（§7-5 自认）→ 见 §⑤ |
| D2 | S3 | 本票范围 | `t88-plan.md:5`／`:178` 仍写 `probe-rework1` **21/21**，实测 **26/26** |
| D3 | S3 | 本票范围 | `t88-plan.md:46`／`:131` 指向不存在的 `test/help-center-88-guards.test.mjs`（实际合并，§7-4 已记账） |
| D4 | S3 | 本票范围 | `t88-impl-a.md` §0 只列 4 commit，漏 `42d51f2`；#88 评论亦写「4 commit」 |
| D5 | S3 | 本票范围 | `run-locked.ps1` 的 `WAITED_*` 未落盘 → §7-5「锁为空」不可复核 |
| D6 | S3 | **范围外发现** | `test\schedule-split.test.mjs` 6 轮中 1 次文件级崩溃（疑审查者并发负载）→ 转 flake 票，**不决定 FAIL** |
| D7 | S3 | 范围外 | 1/436 legacy id 含 `"`／`<N>`（转义正确）→ 归 #106 |

## ⑧ 五维与裁决
| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **29** | A1 10/54/436＋id 436/436＋54/54 逐项复算；A2 130/0＋零新增契约面；A3 三守卫独立复跑；A8 base-render 零改动（提交面） |
| 证据真实可复现 25 | **22** | 摘要行全复现（44/44／17/17／26/26／6/6／23/23）；扣：未持锁那次零可审计产物＋`WAITED_*` 未落盘 |
| parity 20 | **19** | F3 逐条对账（436 prompt／title／wake_word、10×54 序、414 id）本机 F3 存在、**含 5 条 F3 断言全绿**；扣：22 条 legacy id 语义变化仅靠台账 |
| 工程红线 15 | **10** | 无危险 git／无 push／无 install／路径守卫齐备；**扣 5＝D1** |
| 文档同步 10 | **7** | D2／D3／D4 三处正本滞后 |
| **均分** | **87.0** | (29+22+19+10+7)/5 |
| **verdict** | **FAIL** | §6:110「任一 S1 → FAIL」。**注**：FAIL 完全由 D1（过程违规）触发，交付物本身**无 S1 缺陷**（均分 87 达线）。若编排者就 D1 出具**具名书面按比例处置**（附 §⑤③ 三项补偿控制），本段按 **PASS（87）** 成立；否则按 §6:112 执行**成果作废并重做**。 |

**关闭建议**：D2–D5 随 B 段同步；D6 转 flake 票；D7 归 #106；本段**不自行关票**。
