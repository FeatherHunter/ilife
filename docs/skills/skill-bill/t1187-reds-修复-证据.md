# t1187-reds 修复证据（MAP1179 3红变绿 · feat/1187-reds-fix-2）

分支 feat/1187-reds-fix-2 · worktree D:/ilife-wt-reds2 · 基 95f0241b（integ/1179-bill-copy-three-forms 尖，与 D:/ilife-wt-integ 同提交）
主区 D:/ilife 未动（master）；禁令遵守：未 switch/checkout、未 reset/stash/clean/restore .、未 amend/rebase/push --force；未碰 base三包/registry；只 add 自有 8 件（7 码＋本文），前复核。
诊断循环：先调 diagnosing-bugs（Phase1 紧循环 node --test record-write/t721 → Phase2 复现 21/19/2＋6/5/1 → Phase3 4 假设排序 → Phase4 页面实测取证），再调 tdd 修（红→绿＋变异改坏必红）。

## 一、根因重判（逐红对照 MAP 规格，先判再动手）

| 红 | 旧断言位置 | MAP 规格对照 | 重判 | 改法 | 新旧对照证据 |
|---|---|---|---|---|---|
| record-write:261 缺 id | test 246-264 检查页含 `缺必需槽位：记录编号` | 1181 采集分行设计：t1181-collect-copy.test.mjs:59 `旧 thin 长句零产出`（`!text.includes('缺必需槽位')`），t1181-证据 §三“英文键不上纯文本。旧 thin 长句零产出”＋“SAY 与回落壳共用新人话门” | **真滞后**：旧断言与 1181 已定设计矛盾（页与复制三份已换 已给/还差/下一步分行，信封仍留旧句作日志，见 add 缺槽位 test 162-184 同 pattern：信封旧、页新） | 更新断言到新文案：页针 `缺必需槽位：记录编号` → `还差 记录编号`（复制文本还差行，#say-cfg 内；显示提示行 `还差 1 项：记录编号。` 本就 HIT 不动；信封 `includes('缺必需槽位：记录编号')` 保持绿不动） | 页实测（BILL 家目录临时库）：CASE1 信封 `缺必需槽位：记录编号（已出采集页…）` 绿；页 MISS 旧句、HIT `还差 1 项：记录编号。`/data-chip rid/say-hint；复制文本 `饼干记账 改记录 采集\\n已给 无\\n还差 记录编号\\n下一步 补齐后跟助手说一遍「改记录」`（.scratch/probe 页验，见 §三） |
| record-write:422 方向阻断 | test 413-423 检查页含 `方向和这一型对不上：记支出要负数，给的是 +35.00` | 1181 §三“回落壳经 params 加 blocked 同源，复制恒等于已显示行”＋ SAY saySheet.ts:119-123 missingLabels 只按 cfg 必填位算（不读 blockedItems 方向）；blockedSlots.ts:52-64 方向只服务录入路径，件头三处真阻断（写库拦＋不可复制＋按钮置灰） | **真回归**：MAP 换载荷门时把方向原话移出 SAY 路径，全给但方向反时 SAY miss=0 误判 ready（hint“已填齐”＋复制“还差 无”）而信封 blocked（ok:false）——页与信封打架，按钮该置灰却放行 | 修产品：template-expense.ts collectPage 加 `hasDirectionBlocked = blocked.some(b=>b.why!=='没给')`，方向项在时绕过 SAY 走回落壳（回落含 blockedBar 方向原话，复制仍走新人话门，t1181 零产出仍成立；判据 why 非“没给”即方向项，blockedSlots 唯一产出位） | 页实测修前：CASE2 信封 `写库已阻断：金额（方向…+35.00）` 绿；页 MISS 方向句、hint=`已填齐，可以复制去说了。`、复制 `已给 分类…金额 35.00\\n还差 无\\n下一步 已填齐…`（错）；修后：同 params 走回落，页 HIT 方向句、hint 还差、按钮置灰、复制 `还差 金额`（blocked 同源），record 21/21 绿 |
| t721:110 六唤醒词 | test 109-124 扫 src/**（除 8 声明＋wakeTable）整串字面量 == WAKE phrase 即红 | wakeTable 域声明为准：wakeTable.ts 件头“算得出来的不许写…别处不再写第二处字面量”，正确示范 scene-expense.ts:13 wakeWordOfKind / scene-update.ts:12 projectWakeWord；sayWords 全表仅 {word} 占位（设计正确） | **真回归**：MAP 59cdbe6b（账户/目标 fallback）＋1e0ebf56（分析 word:）新增 6 处第二书写位（merger full.log runId 1239426f 尾段同 6 件） | 修产品：6 处改投影（account fallback→projectWakeWord{key:bill.account.query}；goal 两处→{key:bill.goal.query,op:budget/saving}；monthly→{key:bill.analysis.overview,kind:monthly}；range→{key:bill.analysis.compare,kind:range}；trend→{key:bill.analysis.trend,kind:trend}），输出同串，指纹不动 | 修前 6/5/1 hits 6 件（account:60 看账户汇总、monthly:55、range:126、trend:134、goal:94 看预算、:99 看目标）；修后 6/6 绿；变异改回一处字面量即 6/5/1 红（scene-monthly:56 单红，见 §四） |

Q2Q3 重判：前诊断曾判 Q2Q3 不过而停手；本次用户明确要求修即为承诺目标，归属 MAP1179 下 1181（载荷门）＋1184/1185（字面量引入方），回写本修复单即可，无需另起缺陷票。

## 二、改 diff（7 码＋本文，23+/11-）

```
 packages/skill-bill/src/account/copyTextAccount.ts      | 5 +++--
 packages/skill-bill/src/analysis/scene-monthly.ts       | 3 ++-
 packages/skill-bill/src/analysis/scene-range-compare.ts | 3 ++-
 packages/skill-bill/src/analysis/scene-trend.ts         | 3 ++-
 packages/skill-bill/src/goal/copyTextGoal.ts            | 7 ++++---
 packages/skill-bill/src/write/template-expense.ts       | 9 +++++++--
 packages/skill-bill/test/record-write.test.mjs          | 4 +++-
 7 files changed, 23 insertions(+), 11 deletions(-)
```
要点：account/goal 加 `import { projectWakeWord }` 并把 fallback 字面量换投影调用；分析三件加同 imports 并把 `word:'看…'` 换 `projectWakeWord({key,kind})`（title: 值位豁免不动）；expense 加 hasDirectionBlocked 守卫（三行注释＋一行判据＋一行三元）；record test 仅换一针＋两行 1181 注释（信封断言不动）。

## 三、三份不变对照（复制恒等于已显示行；旧门零产出仍成立）

- t1181 采集三份 10/10 绿（runId c7075af2 段内；空/半给/就绪三态＋旧长句零产出 `!includes('缺必需槽位')` 仍过）——新人话门未动。
- t1184 分析金色（月度/双区间/趋势逐字节）＋ t1185 账户目标（卡片/合计/纵表）随 copy7 113/113 绿（runId 28a335ef）——投影换字面量输出同串（`看账户汇总/看预算/看目标/看月度/看双区间/看趋势` 逐字同值），纸面与复制同源未漂。
- t1185 旧合计 thin 零产出＋ t1186 旧 thin 零产出绿——base 冻结面未碰。
- 方向修后复制：SAY `还差 无` → 回落 `还差 金额`（blocked 同源），仍是新人话门（无 `缺必需槽位/写库已阻断` 长句），t1181 第 59 行仍绿；页内 blockedBar 方向原话为显示行，回落复制 `还差 金额` 与显示一致。
- 指纹 44/44 PASS 未重录（runId f5b8bb36 / f4eb1145）：指纹夹具 16 采集均为缺槽位型（{kind:expense} 等），方向正数型不在账本内；t721 投影输出同串，故 44 页逐字节一致。warning 26/26、shape 54/54 同绿。

## 四、GATE-RUN（run-locked --ticket 1187；tsc 写死 node node_modules/typescript/bin/tsc -b packages/skill-bill）

| 门 | 命令 | runId | exit | 读数 |
|---|---|---|---|---|
| worktree | git worktree add -b feat/1187-reds-fix-2 D:/ilife-wt-reds2 95f0241b | 9beee335-4e7f-4bc9-a2fe-20ca2a67fa99 | 0 | HEAD 95f0241b |
| install | pnpm install --prefer-offline | 9250aea1-463c-47c8-998f-91e4251592ac | 0 | +138（复用138/下载0） |
| tsc base-link-core | node node_modules/typescript/bin/tsc -b packages/base-link-core | 9a9bbfd4-c6a8-4e13-9841-a64134a12014 | 0 | 空输出 |
| tsc base-render | node node_modules/typescript/bin/tsc -b packages/base-render | 7865a5b9-de47-401a-830b-4b81035f2bf8 | 0 | 空输出 |
| tsc skill-bill（基） | node node_modules/typescript/bin/tsc -b packages/skill-bill | 750c7fe3-4826-4861-96d7-0d30a3d2d11b | 0 | 空输出 |
| record 复现红 | node --test packages/skill-bill/test/record-write.test.mjs | 1ed26307-f5e1-4e2f-b09e-ad88a29aa1e3 | 1 | 21/19/2（:261/:422） |
| t721 复现红 | node --test packages/skill-bill/test/t721-判据与摘要锁.test.mjs | d6ae21ad-dcef-49be-bc92-963c5550279f | 1 | 6/5/1（:110 6件） |
| tsc（t721 修后） | tsc -b packages/skill-bill | 2b039d2d-0752-4067-92b8-88113278e095 | 0 | 空输出 |
| t721 绿 | t721 单测 | f9b123d3-b6bd-47c1-aaf1-e5eacdeab914 | 0 | 6/6 |
| t721 变异红→绿 | 字面量改回一处→t721；还原→tsc | （变异）exit1 6/5/1 scene-monthly:56 单红；还原 tsc exit0 后 6/6 | 1→0 | 改坏必红 |
| record 261 绿剩1红 | record 单测（test 一针已换） | 0cf690b1-643d-45cc-9b6a-c746a706860d | 1 | 21/20/1（仅:422） |
| 261 变异红 | collectCopyText 还差→还差X→record | 26397bb6-2ced-4d6b-95f3-1d8ebca56ce8 | 1 | 21/19/2（:261 重红＋:422） |
| record 全绿 | record 单测（方向守卫后） | 27e5a92d-bd8d-4aa6-b313-8365342814bd | 0 | 21/21 |
| 方向变异红→绿 | hasDirectionBlocked=false→record；还原→tsc | 95e9c28d / 49300736 | 1→0 | 21/20/1 重红后回绿 |
| 三门同绿 | record＋t721＋t1181 | c7075af2-a29a-4417-87be-ac6600ec5338 | 0 | 37/37 |
| 全量 | node --test packages/skill-bill/test/*.test.mjs | 7f0fcd1d-0b57-4324-929f-6851dc5f092a | 0 | 578/578/0（143 suites） |
| 指纹 | gen-page-fingerprints --check | f5b8bb36 / f4eb1145 | 0 | 44/44 |
| 告警线 | check-warning-line | 216549dc | 0 | 26/26（超线8存量已挂号） |
| 形状 | check-scene-shape | 28d9cdef | 0 | 54/54 |
| 复制七门 | t1180-t1186 | 28a335ef | 0 | 113/113 |
| t686+t689 | t686＋t689 | 7767b7f7 | 0 | 25/25 |
| gen | gen-cli --check | 569001ce | 0 | 16条7能力 PASS |
| t1187 | t1187-verify | ed0fada3 | 0 | 8/8 |
| 落盘复验 record | record（落盘） | 0fd3fea9-66bc-4a8e-bdd1-798c15165890 | 0 | 21/21 |
| 落盘复验 t721 | t721（落盘） | db1612a1-0568-4d07-9409-063d5225cbd4 | 0 | 6/6 |

TDD 红绿＋变异小结：t721（红 6/5/1→绿 6/6→变异单红→还原绿）；261（红 21/19/2→换针绿 21/20/1→变异 21/19/2→还原）；422（红 21/20/1→守卫绿 21/21→变异 21/20/1→还原）。

## 五、尾 5 行（落盘读尾）

- .scratch/reds2-record-write.log 尾 5：`ℹ duration_ms … / LOCK-RELEASED ticket=1187 runId=0fd3fea9… exit=0 / RESULT: … exit=0`（21/21 绿）。
- .scratch/reds2-t721.log 尾 5：`ℹ duration_ms 354 / LOCK-RELEASED …db1612a1… exit=0 / RESULT … exit=0`（6/6 绿）。
- .scratch/reds2-fingerprint.log 尾 5：`LEDGER …t689-页面指纹.json / RESULT: 44/44 / PASS: 44 张… / LOCK-RELEASED …f4eb1145… exit=0`。
- gate-runs.log 本单段尾 5 含上表落盘三行 RUN（0fd3fea9/db1612a1/f4eb1145 全 exit 0）。

## 六、全量结果与超线/merge

- 全量 578/578/0 exit 0（runId 7f0fcd1d）；前值 570/567/3（1187 证据），本次 3 红清零，多出 8 条为基线后新增用例（同仓同尖，非本单引入）。
- 指纹 44/44 未 --write（差异集 0，无需 --declare-layout-change 1187-reds）；warning 26/26（超线 8 存量：analysis/declaration、ticket、health、query/list、query/read、saySheet、template-update 等，均已挂号，本单新增 0 件）；shape 54/54；gen 16条7能力；copy7 113；t686+t689 25；t1187 8。
- 超线：本单 7 件改动均未新增超线（最大 template-expense 261→267，仍 <350；其余 <200）。
- Merge：本分支 feat/1187-reds-fix-2 基 95f0241b（即 integ 尖），完工前未 merge integ（基即尖，无需合）；主区未动；待提交 8 件（7 码＋本文），.scratch 落盘不进仓。
