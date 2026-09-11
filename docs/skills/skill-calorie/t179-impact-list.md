# t179 影响清单 · 场景 07 页面装配与预检确认页命令（必报五步 · 第一步）

> 票：`#179`（场景 07 基础信息 · 页面装配与那条只读页面命令）。**本文件只报清单**，用户看过再动。
> 结构判据：`docs/agents/structure.md`（五条铁律、必报五步、350 行告警线）。用词沿 `docs/agents/wording.md`。
> 证据来源：`docs/skills/skill-calorie/t163-precheck-precedent.md`（现成预检页实跑证据）、`docs/skills/skill-calorie/t163-reusable-inventory.md`（公共层盘点）。
> 行号以本仓当前 HEAD `1700773` 实测为准（`structure.md` 里写的 `cmd_read.ts` 1209 行是旧数，实测 1155 行）。

## 〇、这次要动的面（一眼表）

| 类别 | 数量 | 落在哪 |
|---|---|---|
| 新增源码文件 | 2 | `packages/skill-calorie/src/render/` |
| 新增命令登记 | 4 处 | `cli/keys.ts`／`base-combos/combos.yaml`／`triggers/routing.ts`／`cli/cmd_read.ts` |
| 生成器补 2 处 | 2 | `packages/skill-calorie/scripts/build-help.mjs`（可执行示例、显示名） |
| 生成物重跑 | 3 | `SKILL.md` 自动块、`packages/base-combos/src/present.ts`、`packages/base-combos/HELP.md` |
| 改源码 | 5 | `src/cli/write.ts`／`src/cli/cmd_read.ts`／`src/render/html.ts`／`src/triggers/scene-07-profile.ts`／`src/triggers/wake-assets.ts` |
| 改文档 | 1 | `packages/skill-calorie/SKILL.md`（自动块**外**两处） |
| 改测试 | 11 | 9 个文件里的固定计数 ＋ 唤醒词资产指纹 ＋ SoT 快照 |
| 新增测试 | 1 | `packages/skill-calorie/test/wizard-profile-07.test.mjs` |
| 重生成证据 | 1 | `docs/research/t81-exec-smoke.md` |

**一条必须先看的基线问题**：`docs/research/t81-exec-smoke.md:18` 自报「非零（失败） 1」（`复制昨日运动` exit 4），而 `test/calorie-routing-81.test.mjs:300` 断言这个数是 0。该快照最后一次改动是 `aef6ae0`（#86），当时断言同时写着 0 → **这条测试今天大概率是红的**，重生成快照也不会自动变绿。本票验收里「相关测试通过」这一条要先把它裁定掉（改快照脚本的种子、把那条路由改成无单命令入口、或另立裁定）。

## 一、新增：那条只读页面命令的四处登记

命令：`calorie.view.profile-wizard`，`shape: stat`，中文名「档案预检」（落盘名走现成机制＝`档案预检_<TS>.html`，`output.ts:249-252` 不给非 `receipt` 形加类型段，本票不新造命名）。

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/cli/keys.ts` | 在 `CALORIE_COMBOS` 的 `as const` 收口前追加一条登记项（`:137` 之后） | 命令表是唯一登记处：`title` 决定落盘中文名（`output.ts:111`），`shape` 决定交付族 |
| `packages/base-combos/combos.yaml` | 镜像一条（`skill/calorie`、`shape/stat`、`title/档案预检`、`cmd/skill-calorie`），照 `:306-310` 那四条的字段形 | `test/output-naming-87.test.mjs:124-137` 逐条比对两处 `title` 同值；`test/combos-42.test.mjs:142-156` 要求命令表 ⊆ 本文件 |
| `packages/skill-calorie/src/triggers/routing.ts` | 在 `NEW_KEY_ROUTES` 尾部追加一条 exec 路由，照 `:671-674` | 路由层是 AI 取命令的唯一来源；不登记则 HELP 卡面与命令表拿不到可跑入口 |
| `packages/skill-calorie/src/cli/cmd_read.ts` | 新增 1 个 `case`，照 `:545-551`（取视图 → `nums(metrics)` → `{data:{metrics}, html: buildProfilePrecheckDoc(v)}`） | 页面只能由命令产出（严禁手写 HTML 兜底），唯一出口是 `calorie-cmd-read` |
| `packages/skill-calorie/scripts/build-help.mjs` | ① `exampleFor()` 补 `case`（缺了构建期直接抛，`:201-204`）；② `REPR` 补显示名（不给就显示命令原文） | ① `check-examples.mjs:79-99` 要求示例行数＝登记项数且逐行真跑 exit 0；② `REPR` 决定 `SKILL.md` 命令表第一列，AI 靠它认词 |
| `packages/skill-calorie/SKILL.md` | 跑 `node packages/skill-calorie/scripts/build-help.mjs` 重写自动块（`:79-184`） | `test/skill-t11.test.mjs:51` 要求自动块＝生成器输出；不重跑，新命令对 AI 不存在 |
| `packages/base-combos/src/present.ts` | 由 `gen-present.mjs` 重生成（`@generated`，手改即挂） | `test/combos-p8.test.mjs:115-119` 钉死「文件＝生成器输出」 |
| `packages/base-combos/HELP.md` | 由 `packages/base-combos/scripts/build-help.mjs` 重生成 | `test/combos-p8.test.mjs:121-127` 钉死通道块＝生成器输出 |

**票面漏说的一条**：`combos.yaml` 改完要重跑的是 `pnpm --filter base-combos build`（＝`gen-present.mjs` ＋ `tsc -b` ＋ `build-help.mjs`）。根目录的 `pnpm build` 只是 `tsc -b`，**不带**这两个生成器——照票面写「`pnpm build` 会带」会漏掉 `present.ts` 与 `HELP.md` 两个生成物。

**不动（说明）**：`packages/skill-calorie/src/render/index.ts`（102 行）不进新文件——现成四个预检页的取数件与装配件都不在这个汇总出口里（`cmd_read.ts:77`／`:80` 直接 import `wizardPort.js`／`wizardPortDocs.js`），新页照同一路数，出口文件零改动。

## 二、新增：两个组件文件（预检确认页）

落点按票面为 `packages/skill-calorie/src/render/`（**这一处要用户点头，见第七节**）。

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/render/profilePort.ts`（新） | 预检页的取数：`buildProfilePrecheckView(db, raw)` 出视图（改前值 ＋ 待写草稿 ＋ 活动量五档 ＋ 复制 prompt） | 页面层不自算；照 `wizardPort.ts:93-146` 的围度那一段路数；「改前值」取 `fetch/profile.ts` 的 `getProfile`，**不用** `buildProfileView`（空档案即抛，预检页要能在空库上开） |
| `packages/skill-calorie/src/render/profilePortDocs.ts`（新） | 预检页的整页装配：`buildProfilePrecheckDoc(v)` ＋ 写后回执页与结果页的装配函数（见第四节） | 照 `wizardPortDocs.ts:49-61` 的 `assemble` 路数，出 doctype ＋ charset ＋ 样式的完整文档；一个文件服务场景 07 的三类产物 |
| `packages/skill-calorie/src/cli/write.ts`（改 `out()`／`receiptHtml`） | 见第四节 | 回执页装配的落点，**不是**新文件 |

判据自检：两个新文件各对外给出的东西预计 2～3 个（≤5，铁律五）；预计 120～200 行／个（不越 350）；不新增同名概念（铁律二）。

## 三、改：三条写入词的 prompt 文本（两份同改）

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/triggers/scene-07-profile.ts` | 改 `:5`／`:6`／`:7` 三条记录里的 `main_prompt.text` 与 `prompt_template`，写明「先出预检确认页，我确认后再写入」 | 唤醒词 prompt 是今天唯一被证明能让 AI 先出过程型页的机制（先例 `scene-02-diet.ts:36` 的「批量导入食品」） |
| `packages/skill-calorie/src/triggers/wake-assets.ts` | 同三处，改 `:2925`（设置档案）／`:2935` 附近（设活动量）／`:2967`（改档案）的 `prompt_template`，与上一条逐字相同 | 同一唤醒词的 prompt 有两份；AI 与 HELP 读的是这一份。注意该文件自述「机器生成、禁止手工改词」，本仓无生成器（`.tmp` 为空），本次只能手改——属对文件自述的**有意偏离**，交付时写明 |
| `packages/skill-calorie/test/wake-assets-133.test.mjs` | 改 `:68-73` 的指纹（现钉 `concat.length === 47768` ＋ `sha256 43a65af8…`） | 改 prompt 必然改指纹；这是唯一钉住那一份全文的断言 |
| `test/calorie-sot.snapshot.json` | 重算 `profile_setup`／`profile_set_activity`／`profile_update` 三条的 `entry_sha` | **票面没写的一处**：`test/calorie-triggers.test.mjs:13-24` 的 `canon()` 把 `main_prompt.text` 与 `prompt_template` 都算进 sha256，改 SoT 原文即必红（同 `#180` 要动的同一份文件，见第九节串行） |

## 四、改：写后回执页与查档案结果页切到完整文档装配

**范围只限场景 07 的三条写命令**（`calorie.profile.set`／`calorie.profile.activity`／`calorie.profile.update`），其余 32 条写命令的回执不动。

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/src/cli/write.ts` | `out()`（`:204-209`）里按场景分流：场景 07 三条走新的整页装配，其余走原 `receiptHtml`（`:196-202`） | 35 条写命令共用 `out()`，一刀切会让全技能 10 个场景的回执同时变，与本票范围不符 |
| `packages/skill-calorie/src/render/profilePortDocs.ts`（新） | 增 `buildProfileReceiptDoc(receipt)`，吃 `CrudReceipt`（`render/receipt.ts:43-54`）出完整文档 | `write.ts` 已有直接 import `../render/*` 的前例（`:42`／`:53`／`:55`），不新造跨层路数 |
| `packages/skill-calorie/src/cli/cmd_read.ts` | `calorie.view.profile` 那个 `case`（`:1014-1022`）的产出换成整页文档 | 查档案结果页今天是片段（`renderProfileHtml` 出 `<section>`），双击打不开 |
| `packages/skill-calorie/src/render/html.ts` | `renderProfileHtml`（`:639-650`）只动 `:649` 的收尾装配 | 与 `#177` 的分工 seam：`#177` 改 `:643-647` 的指标字段段，本票改收尾——写清谁改哪一层，避免两张票撞同一段 |

两项自检：换装配后 `delivery.template` 由 `receipt` 变 `doc-shell`（判族是先看 `<!doctype`，`render/envelope.ts:160-167`），属预期；`test/delivery-83.test.mjs:305-313`／`:352-363` 用的是 `calorie.water.log`，本票不碰它，那两条不受影响（已在票面点名的两处核对完毕）。

## 五、改：`SKILL.md` 里那句已过期的话

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/SKILL.md` | ① 改 `:71` 那句「verify 页当前不存在（#86 在途）」——页面早就在了；② 在自动块**外**的 M6 词→页表（`:59-63`）补场景 07 三条词 → 新命令 | ① 该句今天会把 AI 引回「文字确认」的老路；② M6 表是 AI 查「这条词先跑哪条页命令」的地方（`test/skill-t11.test.mjs:40-48` 要求 M6 正文在自动块之外，且表里现有的 7 个字符串必须留着） |

## 六、测试：被钉死的计数、要重生成的证据、要新增的测试

**A · 9 个文件里的固定计数（加一条查询命令要同步）**

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/test/cmd-read-t11.test.mjs:80` | `CALORIE_COMBOS` 条数 99 → 100 | 固定数量断言 |
| `packages/skill-calorie/test/cmd-write-40.test.mjs:72` | 同上 99 → 100 | 同上 |
| `packages/skill-calorie/test/output-naming-119.test.mjs:56` | 同上 99 → 100 | 同上（该文件 `:53-66` 另按 `shape` 数 35 条会改数据库的命令，本票不改） |
| `packages/skill-calorie/test/output-naming-87.test.mjs:111` | 同上 99 → 100 | 同上（`:147` 逐条比中文名） |
| `packages/skill-calorie/test/render-t41.test.mjs:71` | 同上 99 → 100 | 同上 |
| `packages/skill-calorie/test/skill-t11.test.mjs:52` | 同上 99 → 100 | 同上（`:53` 要求每条命令都出现在 `SKILL.md`） |
| `test/combos-42.test.mjs:145` | 同上 99 → 100 | 同上 |
| `test/calorie-routing-81.test.mjs:104`／`:121`／`:122` | 覆盖命令数 99 → 100（`coveredKeys`／`covered.size`／`EXEC_ROUTE_BY_KEY`） | 新命令要进 exec 桶才算「有可跑入口」 |
| `packages/skill-calorie/test/db-readonly-93.test.mjs:287` | 查询命令数 64 → 65（另 `:166`／`:281` 的注释同批改） | 新命令是查询命令，要在只读句柄上可跑；该文件的 `READ_PARAMS[key] ?? {}` 允许新条目不补参数 |

**B · 同文件的另外几处固定数（一并改）**：`test/calorie-routing-81.test.mjs:102`／`:227`（新拟入口 56 → 57）、`:219`（路由记录 493 → 494）、`:296`（exec 桶 398 → 399）、`:303`（证据快照行数＝exec 桶条数）。

**C · 要重生成的证据**

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `docs/research/t81-exec-smoke.md` | 重跑 `pnpm build && node docs/research/t81-exec-smoke.mjs --out docs/research/t81-exec-smoke.md` | `test/calorie-routing-81.test.mjs:296-308` 要求快照条数与 exec 桶一致；该脚本只读路由层，加一条路由即多一行 |

**D · 新增测试**

| 目录／文件 | 一句话 | 为什么碰它 |
|---|---|---|
| `packages/skill-calorie/test/wizard-profile-07.test.mjs`（新） | 照 `packages/skill-calorie/test/wizard-86.test.mjs`（249 行／9 个用例）抄七类断言：完整文档形状、词→命令一致、视图入参校验、字段口径防漂移、空库可开页、命令行端到端落盘、复制只走共享双通道 | 现成预检页的断言集已写在 `t163-precheck-precedent.md` §5，逐类照抄即得；空库可开页这一条是本票的验收项 |
| 回执页与结果页的整文档断言 | 建议并入上面这个新文件（同一个场景的三类产物一起钉） | 若拆成第二个文件，场景 07 的三类产物就要两处各自维护 |

## 七、结构问题：新组件该住哪（**这一处必须用户点头再动**）

今天 `packages/skill-calorie/src/` 第一层是**技术层**（`cli/ fetch/ render/ analysis/ triggers/ db/ migrate/`，`render/` 里 39 个文件、11 个超 350 行）。结构标准要求第一层是**能力名**（HELP 的域：饮食／体重／运动／健身计划／目标管理／身体细节／身材照片／基础信息／分析）。两条铁律相关：

- 铁律四：目录名、文件名用用户在 HELP 里说得出来的词。
- 存量口径（`structure.md:129-133`）：旧代码不专门返工，**下次被改动时**在那次改动里摆正。

两个可选落点：

| 选项 | 落点 | 代价 | 「存量碰到就摆正」怎么算 |
|---|---|---|---|
| **甲 · 就地**（票面方案） | `packages/skill-calorie/src/render/profilePort.ts` ＋ `profilePortDocs.ts` | ① 新文件出生就在技术层目录里，严格说**不受「碰到就摆正」豁免**（该条只豁免旧代码）；② 与 `wizardPort*.ts` 同住一地，改动面最小：新 2 个文件 ＋ 5 处登记 ＋ 1 个生成器补两行；③ 装配函数 `assemble`／`DOC_SHELL` 今天有 **7 份拷贝**（`wizardPortDocs.ts:49`／`dietDocs.ts`／`nutritionPortDocs.ts`／`sportDocs.ts`／`sportPortDocs.ts`／`trendDocs.ts`／`trendMiscPortDocs.ts`），照抄就是第 8 份 | 本次**被碰到**的旧件是 `render/html.ts`（只改 `:649` 一处收尾）与 `render/wizardPortDocs.ts`（只当参照，不必碰）。按纪律，新文件必须全合规、被碰的旧件只做「不加重违规」的最低处置；`html.ts` 那 44 个 `render*` 函数的整体摆正（拆分）不是本票能承载的，登记为后续按域重排的票 |
| **乙 · 新建能力目录** | `packages/skill-calorie/src/profile/`（域＝HELP 的「基础信息」，`wake-assets.ts` 的组 id 就叫 `profile`），内部再分取数与装配两个文件 | ① 与 `wizardPort*.ts` 这对同形件分家——同一个「预检确认页」概念被拆到两处住；② 复制按钮运行时在 `render/copy.ts`、整页装配在 `*Docs.ts`，跨目录取用要么 import 别人的内部件（违铁律一），要么先把这两件提到 `src/shared/`（多碰 1～2 个旧件，并把 `cmd_read.ts` 的 import 改向）；③ 域目录的收益要「整包按域重排」才兑现，只做 2 个文件等于同时存在两套惯例 | 乙把新件的合规做到满分，但把**共用件**（`assemble`／`copy.ts`）推到了必须先摆正的位置——那是「顺手扩大范围」，纪律禁止一次改动里做这件事 |

**建议：甲（就地），并附一条硬约束。** 理由三条：① 本票要动的登记横跨 `cli/`＋`triggers/`＋`render/`＋`base-combos/`，改一处就已经是跨四层，再新开一个域目录只会让「事前清单／事后对账」更容易出偏差；② `#163` 已裁「预检确认页留卡路里公共层、不上移 `base-render`」，同一裁定下「不新建域目录」是它的自然延伸——按域重排 `src/` 是整包级改动，得单独一张票；③ 跨技能面今天为零（`base-paint` 的消费方全在卡路里），域目录的收益靠一次性重排才兑现。

**硬约束（甲的前置条件，请一并点头或否决）**：不许出现第 8 份 `assemble`。两条走法：
- **甲-1（建议）**：新增一个小件 `packages/skill-calorie/src/render/docPage.ts`（公开 2 个：整页装配函数、页面模板常量），新页用它；**同时**把 7 个旧 `*Docs.ts` 也改成用它——定义只剩 1 处，代价是多碰 7 个旧件，机械风险可用「7 个页面的产物字节逐字不变」核对（现有测试已有完整文档形状断言）。
- **甲-2（次选）**：只有新页用 `docPage.ts`，7 处旧拷贝留到各自被碰时再搬——定义数仍是 7 份旧拷贝 ＋ 1 处正本，票面须写明这是**已知偏差**，且交付对账时要标出来。
- 不许的走法：新页自己再抄一份（第 8 份拷贝）——那是最初的票面方案，本次不采用。

## 八、顺序与风险

**顺序（每步做完再下一步）**

1. 先量准现成预检页：`node packages/skill-calorie/dist/cli/cmd_read.js calorie.view.measure-wizard --params '{"waistCm":80}' --output <临时目录>\m.html`，记下字节数与首尾（票面「下一步」已写）。
2. 结构落点定案（第七节）＋用户点头，再动代码。
3. 落新组件两个文件（含第七节选的装配件走法）。
4. 四处登记 ＋ 生成器两处 → 重跑三个生成物（`SKILL.md` 自动块／`present.ts`／`HELP.md`）。
5. **同步 9 个计数断言 ＋ `test/calorie-routing-81.test.mjs` 的 56／493／398 三处 ＋ 重生成 `t81-exec-smoke.md`** → 到这一步测试应回绿（除基线那条非零行）。
6. 改 `write.ts`／`cmd_read.ts`／`html.ts` 的三处装配（只场景 07）→ 用新测试钉完整文档形状。
7. 改两份 prompt 文本 ＋ 更新指纹 ＋ 重算 SoT 快照 3 条。
8. 补 `SKILL.md` 自动块外的两处（M6 表 ＋ `:71` 过期说明）→ 重跑 `build-help.mjs` 让自动块回新鲜。
9. 新增 `wizard-profile-07.test.mjs`；跑 `node packages/skill-calorie/scripts/check-examples.mjs`（逐行真跑 exit 0）。

**每一步会让什么变红**

| 步 | 变红的东西 |
|---|---|
| 4 | 9 个计数断言全红；`check-examples.mjs`（示例缺失即构建期抛）；`test/combos-p8.test.mjs:115-127`（两个生成物未重跑）；`test/output-naming-87.test.mjs:124-137`（两处中文名不同步） |
| 5 | 修完即绿；`t81-exec-smoke.md` 未重生成时 `test/calorie-routing-81.test.mjs:303` 红 |
| 6 | `packages/skill-calorie/test/render-t41.test.mjs:219-230`（若结果页换了落点或删了原函数）；`packages/skill-calorie/test/cli-smoke-t41.test.mjs:93`（要核它是否只断言能跑） |
| 7 | `test/calorie-triggers.test.mjs:41-48`（3 条 `entry_sha`）＋ `packages/skill-calorie/test/wake-assets-133.test.mjs:68-73`（指纹） |
| 8 | 不动自动块就 `test/skill-t11.test.mjs:51` 红 |

**350 行告警线（必报五步第四步）**：本票要碰的 4 个文件**今天已经超线**——`src/cli/cmd_read.ts` 1155 行、`src/cli/write.ts` 875 行、`src/triggers/routing.ts` 780 行、`src/render/html.ts` 642 行（参照件 `src/render/wizardPort.ts` 444 行也超）。动它们时按第四步当场报「已超线，需要根据规则进行重构」，并说明本次为什么不拆（各自装的不止一件事，拆分要连带动 30～40 个调用点，属别的票）。两个新文件预计 120～200 行，不越线；若把「档案字段名对照 ＋ 活动量五档 ＋ 改前改后对照」都塞进一个文件，越线风险高，所以按票面拆成取数与装配两个。

## 九、不确定／待核实

1. **`t81-exec-smoke.md` 那条非零行**（`复制昨日运动` exit 4）今天算不算既有红——它决定本票「相关测试通过」这条验收怎么判；我没跑测试，只做了静态比对（快照自报 1／断言要求 0）。
2. **`#177` 与 `#180` 在 `scene-07-profile.ts:8`（查档案）上的归属**：`#180` 正文写「已在 `#177` 顺手修」。本票不改 `:8`（只改 `:5-7` 的 prompt），但若 `#177`／`#180` 的先后与本票交错，三票会同改这个文件与同一份 SoT 快照。
3. **`buildProfilePrecheckView` 的取前值口径**：`fetch/profile.ts` 的 `getProfile` 只给 `id/age/gender/height_cm/note/activity_level`，没有创建／更新时间；老页要的两行今天拿不到（与 `#177` 同一处缺口），本票的预检页是否要显示，需裁。
4. **`REPR` 的显示名**：建议「档案预检」（与落盘名一致、用户念得出来）；若要与其它页面词的「看…」前缀统一，则用「看档案预检」。两处都无测试钉，任选其一但要写进票面。
5. **第七节甲乙两案**：乙的「先提 `assemble`／`copy.ts` 到 `src/shared/`」代价是我按铁律推的，仓里没有先例可查（今天 `src/shared/` 目录**不存在**，实测 `src/` 下只有 `analysis/ cli/ db/ fetch/ migrate/ render/ triggers/` 七个目录与 5 个根文件 `index.ts`／`kcal.ts`／`output.ts`／`paths.ts`／`schema.ts`）。
