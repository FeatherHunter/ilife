# 审票 #188 对抗式审查（审查员 A）

裁决：**通过**　总分 **90/100**（A 目标达成 32／B 证据真实性 34／C 风险与失效面 24）。立场＝证伪；除本页点名者外，报告数字全部独立复现。
## 1 门真的跑到新用例（复现报告 §7）
```
cd packages\skill-home; npm test
> node --test test/help-assets.test.mjs ../../test/scaffold.test.mjs
ℹ tests 12  ℹ suites 2  ℹ pass 12  ℹ fail 0  ℹ cancelled 0  ℹ skipped 0    EXIT=0
```
10 条新用例逐条列出；「包内用例从不执行」的洞已堵（`package.json:31` 的 test 串含新用例，且 scaffold 未被挤掉）。
## 2 `--check` 两态 ＋ 复原
- 一致态（连跑两次）：`OK：…与生成结果字节一致（9 域／30 二级组／73 场景）`，`EXIT=0`／`EXIT=0`。
- 漂移态（`"录物品"`→`"录物品X"`）：`DRIFT：…与生成结果不一致（禁止手改；重跑不带 --check 即覆盖）` ＋ `行 61：生成 …"录物品", ≠ 盘上 …"录物品X",`，`DRIFT_EXIT=1`。判红且**有差异摘要** ✅（小瑕疵：摘要另印「生成 1165 ≠ 盘上 1165」两数相等，行数口径有误，不影响判定）。
- 复原：按字节写回 → `RESTORED_SHA=F61F49E7B36B6FA7FF79B1449E5B2CAD82951C37E15B262CD6F230E444E2E732`，**与报告 `F61F49E7…E732` 逐字一致**，再跑 `RESTORED_EXIT=0`。
## 3 事实源逐字（复现 §1）
`Get-FileHash`：仓内 `src/help/scenarios.yaml` ＝ 仓外 `D:\2Study\…\references\scenarios.yaml` ＝ `F80184CE9A0A7B345404941DFDD21E2E0B56CC1577DC059C536DF5D9BF7E665A`，`EQUAL=True`；仓内 **46267 B／1283 行（LF=1283、CR=1283，CRLF 原样）／无 BOM**。三项全中。
## 4 形状、计数与逐字段
- 资产：**1164 行（LF=1164、ReadAllLines=1164）／43798 B／CR=0／无 BOM／末尾真换行**——§3 全中。
- grep 定点计数：域 9＝`items,space,outfit,stats,express,receipt,family,setup,link`；二级组 `xxx_N` **30**；`"wake_word": "` **73**；`"types": [` **73**；`deprecated: true` **1**。事实源侧 `scenario_id: ` 73／`wake_word: ` 73。
- 抽 3 条逐字段对**仓外 yaml 同一条**（含 types 顺序与 prompt 全文）：`add_text`（yaml:41-52／资产 59-67，`采集+回执`→`["采集","回执"]`）✅；`first_use`（yaml:889-895／资产 992-998，`向导+回执`）✅；`location_manage`（yaml:556-562／资产 422-428，`查看+选择+回执`）✅，prompt 均逐字。
- 唯一有意偏离：`link_overview` 仓外 prompt 非空，资产 1049 段为空串——票面 39 行「prompt 不迁」所定，**非缺陷**；`test:110` 显式跳过 link 域 prompt 比对，口径诚实。
## 5 反例自证（本席最重要项，两次实际输出）
- A（资产 `"录物品"`→`"录物品X"`）：`tests 10／pass 7／fail 3／EXIT=1`，变红用例名＝`事实源与生成物摘要锁（改一个字即红）`、`资产＝重跑生成器的结果（与事实源一致，不靠自觉）`、`逐字段对事实源：域顺序／组内出现序／scenario_id／types 切分／prompt 逐字`。
- B（`add_text` 的 `types` 去掉 `"回执"`）：`pass 7／fail 3／EXIT=1`。
- 两次复原后 sha 回 `F61F49E7…E732`，`pass 10／fail 0／EXIT=0`。**锁真抓漂移，复原无误。**
## 6 对账断言的强弱：**等值断言，但只在「词」这一层**
`test/help-assets.test.mjs:135-146` 是枚举版等值断言：`WAKE_ENTRIES.length===91`、`deepEqual(noHit, DEPRECATED)`、`deepEqual(unlanded, UNLANDED)`（16 条逐条点名，实测 91 条速查）。**往速查加一条新词会红**（实测插入 `{ phrase: '审票探针词', … }` → `pass 9／fail 1／EXIT=1`）。
**但反例自证一处真洞**：`wakewords.ts:29` 的 `{ phrase: '录物品', key: 'home.item.add' }` 改成 `key: 'home.item.search'`（唤醒词误路由到「查」）→ `tests 10／pass 10／fail 0／EXIT=0` **全绿**。因对账只锁 `phrase`，`key` 不参与；`test:148-156` 只比命名空间集合、不逐条配对。仓内 `cli.test.mjs`／`render.test.mjs` 直传 `home.item.add` 键且不在本门（需 dist），该漂移能**整门溜过**。复原后 `SHA_RESTORED_SAME=True`。
## 7 没越界
`git status --short --untracked-files=all packages/skill-home` 仅 8 行：` M package.json`（差量＝test 串＋两条 `gen:help-assets*`，实测 diff 逐字相符）＋7 个新件。`git diff --stat -- SKILL.md scripts/build-help.mjs` **输出为空＝未动** ✅。`src/` 无新建域目录，与 `t195-decisions-record.md:40,44` 决策 3 一致；报告引的「#195 硬约束 6」见同档 `:75`，非杜撰。生成器三件**零仓外路径残留**（grep `2Study|D:\\|StudyNotes` 无命中）。
## 8 `--check` 失效面：源不在盘＝**报错退出 1，不静默跳过** ✅
临时改名 `scenarios.yaml` → `Error: 仓内事实源不在盘上：…scenarios.yaml`（`scripts/lib/help-assets.mjs:186`），`EXIT=1`；源不在盘也把门打红：`node --test test/help-assets.test.mjs` → `tests 1／pass 0／fail 1／TEST_EXIT=1`。**与作息「源不在盘就静默跳过」的洞见相反**。复原后 `YAML_SHA=F80184CE…665A`、`--check EXIT2=0`。
## 9 缺陷与分数
| # | 缺陷 | 位置／实测 | 扣分 |
|---|---|---|---|
| D1 | 票面 39 行要求登记位 `status: "deprecated"`，实现改挂**组**上 `deprecated: true`，3 条 `status` 仍 `""`；报告 §5 已如实点名请复核，但与票面字面不符 | 资产 1049 段／`test:90,124-133` | A −3 |
| D2 | 对账锁只锁 `phrase` 不锁 `key`，唤醒词误路由可整门溜过（§6 实测全绿） | `wakewords.ts:29`／`test:135-146` | C −4 |
| D3 | `build` 链不含 `gen:help-assets:check`（`test:165` 反断言「生成器不进 build」），漂移只在 `test` 时拦 | `package.json:30-33` | C −2 |
| D4 | §9「拆分前 409 行」已不可复验（旧件被替换）；现存 51／192／172／176 行均实测相符 | `scripts/*` | B −1 |
其余报数无一处注水，故 B 只扣 D4。
必须整改（不阻断本票，交票 6／票 7）：① 先定 D1 口径再让票 6 取值；② 对账锁补 `(phrase,key)` 配对；③ `gen:help-assets:check` 接进 build 或由票 9 明确豁免。
审查声明：只读＋临时变异**按字节复原**（资产／事实源／`wakewords.ts` 三处均验回原 sha，最终实测 `ASSET=F61F49E7…`、`YAML=F80184CE…`）；未 `git add`／未 commit／未跑仓根 `pnpm build`／`pnpm test`；唯一新增文件即本页。
