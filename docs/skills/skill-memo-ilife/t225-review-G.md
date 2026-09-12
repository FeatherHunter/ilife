# t225 形状闸门 · 对抗式复审 G（该不该放行）

> **被审**：`docs/skills/skill-memo-ilife/t225-structure-design.md`（413 LF）＋ `packages/skill-memo-ilife/AGENTS.md`（13 LF）＋ 票面 `t225-body.md`。
> **判据**：`docs/agents/structure.md`（125 LF 全文已逐条读）＋ 裁决正本 `t220-orchestrator-decisions.md` ＋ `t224-resolution.md`。
> **复审日期**：2026-09-12　**立场**：只读，未改任何被审文件、未 commit、未动 issue。
> **本席亲跑**（命令与原始输出见第三节各条）：`node -e` LF 计数、`node --test` 四文件、`node -e` 探针（`createRegistry`）、`node tooling/write-snapshot.mjs --check`、`node tooling/check-boundaries.mjs`、`git ls-files`／`git status`。

---

## 一、放行裁决

**有条件放行。**

一句话：**形状骨架（7 件 ＋ 1 层目录 ＋ 唯一出口 ＋ 告警线落点）站得住，实测数字基本可信；但文档里有一处与裁决正本相反的死条款（管线归属仍写「乙 ＋ 同名同签名临时件」）、一处违反铁律五的转发布局、一处与裁决五对不上的资产形状缺口——这三条不修，「#227／#228 开工」会把形状错误一次传染两张票。**

**条件清单（必须改完才能开工的 6 条，详见第四节）**

1. §1.3／§2.3／§五第 6 条／§九表格四处「乙 ＋ 临时件」全部改写成**甲（自持最小管线）**，并写死三条硬条件与 `#240`。
2. 新件命名清单去掉「同名同签名临时件」，改成照抄 `packages/skill-bill/src/output.ts:17`／`:42`／`:66` 三个**现役函数名**——仓内不存在 `saveHtmlFile`，别造这个名字。
3. `src/help/index.ts`（B3）改成「单一票主 ＋ 只发布已消费的名字」，并把 §2.2「转发 7 个」改成合铁律五的形态。
4. 资产形状补 `aliases` 落点（裁决五要求留在资产里），并明确 `sceneData.buildHelpSceneIndex()` 的消费者；`version` 必须从老 yaml 顶层读、生成物加摘要锁（裁决九）。
5. 把 `packages/skill-memo-ilife/package.json` 补进 §4.3 表（**34 LF**，报告写 33）；「13 个新件」的算法与目录树对齐（**实为 14 个条目**）。
6. 一节范围／§六 风险 4 补「`memo.help.lookup` 是第 11 条命令，须同步 `docs/memo-migration-split.md:18-28` 那张 key 表」；D1／D2／D3 写成成对的改法。

---

## 二、评分

| 维度 | 分 | 判词 |
| --- | --- | --- |
| **合仓规**（`structure.md` 铁律／标准／五步） | **64 / 100** | 五条铁律逐条有交代；但铁律五在 B3 上踩线（转发层 ＋ 包根出口从 49 涨到 58），铁律四的沿袭缺口未按 `structure.md:46` 的判据收口。 |
| **可执行性**（#227／#228 能不能照着干） | **58 / 100** | 11 件职责与导出数写得下手；但「临时件同名同签名」会让两张票对着一个不存在的符号写码，`aliases`／`version`／索引消费者三处留白。 |
| **归属正确性**（A／B／D 逐件归票） | **72 / 100** | 主体正确；4 处问题：D4 归错票、「index.ts 三票共改」无纪律、D1 缺配套件文件、新件数算错。 |
| **数字可信**（实测口径） | **82 / 100** | 逐件重算 22 件**全部对上**；LF 口径与命令可复现；扣分在 `package.json` 33≠34、`#208` 复裁后未刷新、`skill-chef/AGENTS.md` 引用不实。 |
| **总分** | **68 / 100** | 达到「有条件放行」线（≥60），未达「直接放行」线（≥80）。**打回也不对**：骨架不需要推倒，改的是 6 处措辞与 1 处布局。 |

---

## 三、作业 1–6 逐条作答

### 作业 1 · 形状合不合 `docs/agents/structure.md`

**（1-A）合格的**

| 条文 | 原文依据 | 本报告 | 判 |
| --- | --- | --- | --- |
| 第一步判据：每行一个能力 | `structure.md:80` | §1.1 只落 1 个包；§1.2 每行单一归属 | ✅ |
| 第二步判据：导出数数得出、≤5 | `structure.md:87` | §2.2 逐件写出 1／2／3／3 | ✅（**但 B3 例外，见 1-B②**） |
| 第二步点头条件一：新建目录层级 | `structure.md:88` | §2.1 ＋ §十如实报「触发」 | ✅ |
| 第二步点头条件二：碰三个以上能力 | `structure.md:88` | 只落一个包，如实报「不触发」 | ✅（判断对；`base-paint`／落盘件是公共层，不是能力） |
| 结构标准：一次性脚本住包内 `scripts/` | `structure.md:69` | A3 落 `scripts/gen-help-assets.mjs`，与既有 `build-help.mjs` 同目录 | ✅ |
| 结构标准：告警线数字写在各包自己的地方 | `structure.md:70` | C2 落 `packages/skill-memo-ilife/AGENTS.md`，不落 `docs/` | ✅ |
| 第四步：超线报句式 | `structure.md:97-101` | §四 末段预登记，句式逐字 | ✅ |
| 目录出口：只有出这个目录才算对外 | `structure.md:94` | §2.2 末段把两个目录内自用件排除在对外清单外 | ✅（方向对，但把该条**反过来**用成「必须转发」——见 1-B②） |

**（1-B）违反或踩线之处**

**① 铁律四的沿袭缺口，报告收口方式不完整。**
`structure.md:64`：`src/` 下第一层**必须是能力名，不能是工种名**；`structure.md:46` 的判据是「把目录名念给用户听，他能在 HELP 里指出这是哪一组」。
实测 HEAD 的 `src/` 第一层是 `cli/`／`fetch/`／`policy/`／`render/`／`help/`（`git ls-files packages/skill-memo-ilife` 逐行可核）——**五个全是工种名**，`help/` 也在其中。报告判「`help/` 是技能级落点、铁律四管不到它」，这个论证本身**成立**（先例：`skill-bill/src/help/`、`skill-schedule/src/help/` 同形，卡路里那张图第五节同判），但报告只报了「既有目录」这一层事实，没有把它按 `structure.md:68`「就地摆正」的规矩登记成**这项改动里明确不摆正的东西**。
⇒ 判：**踩线但可接受**（票 4 已裁「不做整包重排，那是另立的票」）。要求：在 §六 明写一行「沿袭缺口：`src/` 第一层五个工种名本次一个都不摆正，整包重排另立票」，让后来的复审有据可查。

**② 铁律五：B3 是一层只做转发的包装，且会把包根出口放大。**
`structure.md:58`：违反的样子逐字含「**一层只做转发的包装**」；判据是「**删掉一个转发函数，外面说不出少了什么，那它就是白占一层**」。
实测今天 `packages/skill-memo-ilife/dist/index.js` 的运行时出口 **49 个**（`node -e` 见 3-1 原始输出），`src/index.ts` 逐字 `export * from './help/index.js'`，而 `dist/help/index.js` 今天只出 2 个名字。B3 一加，§2.2 自己要「转发 7 个」＋ `lookup.ts` 2 个 ＝ **9 个**，包根出口变 **58 个**。
报告的处理是引用 `structure.md:94`「只有出这个目录才算对外」来给它开豁免——**这条引反了**：`:94` 说的是「目录内互相用的不必对外给」，用来**缩小**接口，不是用来给新增转发件背书。
⇒ 判：**违反铁律五**。修法见第四节第 3 条。

**③ 「生成的资产」的定义（`structure.md:9`）判对了，但仍留了一个待确认。**
`structure.md:9` 明写不管「生成的资产」；报告 §4.1 判 `src/help/scenes/*.ts` **要数行数**（因为编译进 `dist`）。本席**支持这个判**：`structure.md:7` 的管辖是「`packages/` 下全部源码」，「生成的资产」在 `:9` 与「页面模板、构建产物」同列，指产物类；`.ts` 源码不是产物。同形先例是 `packages/skill-schedule/src/help/scenes/help-assets.ts` 确实活在 `src/` 里被 `tsc` 编译。
⇒ 判：**不违反**。要求：把「待确认」降级为「已判」，别让 `#227` 落地时再犹豫一次（留待确认等于留下一处会翻的边界）。

**（1-C）第二步「每个文件对外给什么」的漏项**
`structure.md:85` 要求「导出几个、各一句」。§2.2 的 `helpFile.ts` 行写「对外给 3 个」，但 §2.2 末尾与 §1.2 都没交代它**是否还要带类型出口**（先例 `packages/skill-bill/src/render/helpFile.ts` 实测 14 个运行时出口 ＋ 8 个类型出口，`skill-schedule/src/help/helpFile.ts` 实测 19 个导出）。报告把类型归给了公共层契约（`packages/base-render/src/spec/help.ts`），这部分成立（铁律二：定义只出现一次）；但 §2.2 那张表应当写成「运行时 3 个 ＋ 类型 0 个（全部转引公共层契约）」——一句话的事，缺了就会被 `#228` 按先例补出类型副本。
（附：§2.2 的类型出处引 `packages/base-render/src/spec/help.ts:48-59` 有误差——`SceneSubgroup` 在 `:39-43`、`SceneGroup` 在 `:45-50`，`:48-59` 落在两个类型中间。）

---

### 作业 2 · `src/help/scenes/` 这层该不该建

**（2-①）单文件真的会超 350 吗 —— 推断合理，且实测把推断抬成了结论**

命令（本席亲跑）：

```
node -e "const t=require('fs').readFileSync('D:/ilife/packages/skill-schedule/src/help/scenes/help-assets.ts','utf8');console.log('LF',(t.match(/\n/g)||[]).length);console.log('wake_word',(t.match(/wake_word/g)||[]).length);console.log('scenes[]',(t.match(/\"scenes\":/g)||[]).length);"
```

原始输出：`LF 2198`　`wake_word 87`　`scenes[] 34`（另 `Select-String '"id":'` 计 124 处）。

- 同形先例的**行数密度 ＝ 2198 ÷ 87 场景 ≈ 25.3 LF／场景**（若按它注释自称的 85 场景，26.2）。
- 备忘录同形载荷 ＝ 8 域／**13 二级组/34 个 `scenes[]` 容器**／**30 场景**（`t222-content-reconcile.md:21` 逐字「8 域 / 13 二级组 / 30 场景」）。
- 折算：30 × 25.3 ≈ **759 LF**；报告自估 600–1200 落在同一区间。**单文件必超 350**（超 2 倍以上）。
- ⇒ **报告的推断成立，且不需要「推断」二字**：直接引「作息 2198 LF／87 场景」的实测密度即可。编排裁决 10（`t220-orchestrator-decisions.md:126-129`）已用同一组数判过，报告却仍标「推断」，是**把已定的结论又降级回猜测**。
- 附带一处勘误：同形先例 `help-assets.ts` 是**单文件 5 个一级分组**，`scenes[]` 容器 34 个——也就是说「一域一容器」的粒度**在单文件里就已经做到了**；差异只在**是否跨文件**。这一点报告 §1.2 注里没写，写出来反而更有说服力。

**（2-②）8 个域文件各 1 导出 → `src/help/index.ts` 会不会变成转发垃圾场**

- **不会因为「8 个各 1 导出」而变成垃圾场**：铁律五限的是**一个文件**的对外数（`structure.md:53`），不限制一个目录里有多少件；8 个域文件各出 1 个常量，逐个都合规。
- **但 `index.ts` 本身会**：它今天出 2 个（`buildHelpLookup`／`lookupWake`），B3 之后 §2.2 要它出 9 个，且路径上**没有任何外部消费者**。§2.3 的依赖图自己写着：`cmd_read.ts` 只吃 `manifest.ts` ＋ `helpFile.ts` ＋ 公共层落盘件，**`sceneData`／`scenes` 不在出口的引用链上**。
- **判：真·转发垃圾场（1-B② 的落地）**。`structure.md:57` 的判据问「删掉一个转发函数，外面说不出少了什么」——把 `src/help/index.ts` 的这 7 行删掉，`cmd_read.ts` 一行不用改，`#227`／`#228`／`#229` 也不受影响。⇒ 它白占一层。
- 修法（见第四节第 3 条）：`index.ts` 只发布**已被目录外消费**的名字；`#227`／`#228` 若确需 `sceneData`／`helpFile` 对外，再按「从第二个用法里长出来」（`structure.md:67`）现加。

**（2-③）有没有更少件数的合法形状（对比）**

| 形状 | 件数 | 单件 LF（实测折算） | 超 350 | 合铁律四 | 代价 |
| --- | --- | --- | --- | --- | --- |
| **甲（本报告）** `scenes/<域>.ts` 8 件 | 13（含脚本／说明面） | 40–150 | 否 | 文件名取一级分组 ✅ | **多一层目录**（触发 `:88` 点头）；`index.ts` 转发面大 |
| **乙** `help/memo.ts`…8 件扁平 | 12 | 40–150 | 否 | 文件名取一级分组 ✅ | **不新建目录层级**（`scenes/` 是工种名派生的中间层，去掉它 → `:88` 的点头条件从「触发」变「不触发」）；仍是 8 件 |
| **丙** 3 件按内容类别（采集／查看／回执） | 7 | 250–300（估算） | 否（贴近线） | **文件名取不到 HELP 一级分组**（类别不是用户能指出的一组）❌ | 件数最少，但**违反铁律四**，与「8 域＝一级分组」的既定前提打架 |
| **丁** 单个 `help-assets.ts` | 5 | ≈760 | **是** | 文件名不合铁律四 ❌ | 直接撞 350 线，编排裁决 9／10 已点名「不许照抄作息单文件」❌ |

**判**：报告的「甲」**可行但多要一次点头**；「乙」是**同合规、少一层目录、少要一次点头**的更省形状（`src/help/` 是既有目录，往里加 8 个 `memo.ts` 型文件既不新建目录层级，也不新增工种名层）。「丙」不合铁律四，「丁」撞线 —— 都排除。
⇒ **放行条件**：报告必须在 §1.1／§2.1 里**把「乙」作为对比项写出来并给出否决理由**。若说不出理由，就该改判乙（本席倾向乙：少一层目录层级，直接消掉 `structure.md:88` 的唯一触发条件）。这一条**不阻塞 #227／#228 开工**（两形状对 `#227`／`#228` 的接口零差异），列入第五节。

---

### 作业 3 · 逐件归属表对不对

**读过的票面**：`t227-body.md`（35 LF）／`t228-body.md`（37 LF）／`t229-body.md`（29 LF）／`t230-body.md`（17 LF）／`t231-body.md`（19 LF）／`t224-resolution.md`（32 LF）／`t235-migration-body.md`／`t220-orchestrator-decisions.md`（145 LF）。

**（3-A）对的**

| 件 | 报告归 | 票面依据 | 判 |
| --- | --- | --- | --- |
| A1 8 域文件 | #227 | `t227-body.md:5-8`「老骨架搬进仓库…形状三层 `groups[].subgroups[].scenes[]`」 | ✅ |
| A2 sceneData | #227 | 同票：「资产入库」 | ✅ |
| A3 生成器 | #227 | `t227-body.md:7`「若走机器生成 ＋ `--check` 字节一致的路…生成器与产物都入仓」 | ✅ |
| A4 helpFile | #228 | `t228-body.md:3-5`「喂给通用 help 模板…`import { renderHelpShellHtml } from 'base-paint/help-shell'`」 | ✅ |
| A5 manifest | #229 | `t229-body.md:3`（落盘路径与通式）＋ `t224-resolution.md:9`（速查支产物名） | ✅ |
| B1 cmd_read | #229 | `t229-body.md:23` 逐字「**本票的第一件事是改分派顺序**」 | ✅ |
| B2 命令表 | #229 | `t229-body.md:24`「还要登记进 `src/render/envelope.ts:5-16` 的命令表（现在只有 10 条）」 | ✅（实测 `MEMO_KEY_SHAPES` 在 `envelope.ts:5-16`，引用准确） |
| B4 `base-paint` 依赖 | #228 | `t228-body.md:13`「本票要新增依赖」＋ 裁决 12 | ✅ |
| B5 边界名单 | #228 | `t228-body.md:8`「`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 要移出 `'skill-memo-ilife'`」 | ✅（行号实测已漂到 `:41`，报告 §六 风险 4 已如实记） |
| D3 combos 登记 | #229 | `t224-resolution.md:11` 决议④「必须登记…`memo.help.lookup` 进 `combos.yaml` 并重跑生成器」 | ✅（但报告仍标「需裁」，见 3-B③） |

**（3-B）错配／漏配／重复配**

**① D4 归错票（错配）。**
报告 §一 表 ＋ §三 ＋ §六 风险 2 三处都把 `packages/plugin-memo-ilife/test/skills-provider.test.mjs:90` 归 **#231**。实测该文件 `:88-90` 逐字：

```
88:     // ⚠️ 已知缺口（归 #231／#229）：`memo.help.lookup` 今天**还不存在**…
90:     assert.ok(!def.content.includes('memo.help.lookup'), '正文暂不含 HELP 命令；#229 落地说明面后本行须改成正向断言');
```

`:88` 明写 **#231／#229**，`:90` 的断言语义写的是「**#229 落地说明面后**」。而 `t231-body.md:3` 的本职是「把…写进 `SKILL.md` 说明面」。⇒ **正确归法：改的是 #229（它同时改命令表与说明面引用），#231 只是复核方**。报告写成「#231 单归」会让 #229 关票时留下一条**已知会红的断言**（`t229` 完成判据要求「真跑一次拿到落盘文件与绝对路径回执」——那一刻 `SKILL.md` 里若已写 `memo.help.lookup`，这条反向断言就红）。
⇒ **判：错配**。修法：归 **#229**，并在 #231 的票面写「复核」。

**② B3 是「一票三归」，违反第一步自己的基准（重复配 ＋ 无纪律）。**
§1.1 逐字「本次全部改动只落一个包…**没有一行跨两个能力**」，而 B3 一行写「**#227／#228／#229**」；§三 也跟着写三票共改。`structure.md:81` 的例外只对「一行要给两个**能力**」开口（须写明走哪个公开接口），B3 是**一行的三个票主**，不是两个能力，报告没走那条例外也没给纪律。
⇒ 判：**重复配，且是三票并行改同一个文件**（`#227`→`#228`→`#229` 虽串行，但 `t228-body.md` 与 `t227-body.md` 都写着「等票 5 关票」即可开工，落地窗口会重叠）。修法：单一票主 ＋ 只发布已消费的名字（第四节第 3 条）。

**③ D3 的归票与「需裁」状态与裁决正本不一致（漏刷新）。**
报告 §三／§六 风险 1 仍写「**#229（需裁）**」，并在 §五 第 7 条要负责人裁「登记 vs 不改断言」。而 `t224-resolution.md:11` 已把它裁掉：「**④ `combo` 侧＝必须登记（推翻本票草案原先的「不登记」）**」，`t220-orchestrator-decisions.md:49-55` 是本席亲验的两条证据链。
⇒ 判：**归属对（#229），状态过期**。修法：删掉「需裁」二字，写成「已裁：登记 ＋ 重跑 `packages/base-combos/scripts/gen-present.mjs`」。

**④ D1 漏配配套件。**
`test/memo-split.test.mjs:9-15` 实测读的是 `docs/memo-migration-split.md` 的 ` ```memo-keys ` 代码块（`:18` 起，`:19-28` 十条 `memo.* | shape`），再 `assert.equal(rows.length, 10)`。报告只写「10 → 11 条的固定计数改」，**没写要同时改那张文档表**，也没写这是**第 11 条命令**这件事。`#229` 照报告做，改完计数仍然红（表里只有 10 行）。
⇒ 判：**漏配**。修法：D1 行写成「`docs/memo-migration-split.md:19-28` 补第 11 行 ＋ `test/memo-split.test.mjs:15` 10 → 11」。

**⑤ D2 漏配测试数据。**
`packages/skill-memo-ilife/test/render.test.mjs:5-16` 的 `GOOD` 常量只列了 10 个 key；`:19-29` 那个用例在改计数后会对 `memo.help.lookup` 取到 `undefined`，再走 `buildMemoEnvelope` → `renderEnvelopeHtml`。报告只写「`assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 10)`；B2 一改即红」。
⇒ 判：**漏配（但不算错配）**。修法：D2 行补「`GOOD` 补一条 `memo.help.lookup` 的载荷」。

**⑥ A6 行是空行（格式）。**
§1.2 A 组标题写「新增（**9 个源码件**＋ 1 个脚本）」，表里 A6 是「**不建**」。⇒ 标题与表自相矛盾，数不对（真数见作业 5）。§五 第 2 条又写「新增 **11 个源码件** ＋ 1 个脚本 ＋ 1 个说明面」——**11／12／13／14 四个数在文档里各出现一次**（§1.2 标题 9、§2.1 树 13、§2.2 表 11、§五第 2 条 11＋1＋1）。修法：统一成「源码 11 ＋ 脚本 1 ＋ 说明面 1 ＋ 告警线文档 1（AGENTS.md 与说明面是同一件）＝ **13 个新文件**，其中源码 11」。

**（3-C）本席另核出的归属缺口**

| 件 | 报告 | 应为 | 依据 |
| --- | --- | --- | --- |
| `docs/memo-migration-split.md:19-28` | 未列 | **#229** | `test/memo-split.test.mjs:9-15` 的数据源 |
| `docs/memo-migration-split.md` 与 `packages/base-combos/combos.yaml` ＋ `src/present.ts` 重生成 | §六 提到重跑，未入 §三 表 | **#229** | `t224-resolution.md:11`；`test/combos-p8.test.mjs:115-120` 锁死生成物 |
| `packages/skill-memo-ilife/package.json` 的 `scripts.test` 一行 | §三 归 **#230** | **#230**（对）但须加「同一文件两票各改一行、且 §三 已把依赖那半归 #228」的纪律 | `t230-body.md:11` 逐字点名票 9 |

---

### 作业 4 · D1–D4 那四条「必须同批改的测试」是不是真红的、真的必须同批

**先给现状基线（本席亲跑，四文件全绿）**

```
node --test packages/skill-memo-ilife/test/*.test.mjs   →  tests 22 / pass 22 / fail 0
node --test packages/plugin-memo-ilife/test/skills-provider.test.mjs → tests 8 / pass 8 / fail 0
node --test test/memo-split.test.mjs                    →  pass 2 / fail 0
node --test test/combos-p8.test.mjs                     →  tests 9 / pass 9 / fail 0
```

与报告自称的「22 项全绿」「8/8 绿」**逐项对上**。

| # | 报告写的断言 | 实测 | 红不红 | MR 必须同批？ |
| --- | --- | --- | --- | --- |
| **D1** | `test/memo-split.test.mjs:15` `assert.equal(rows.length, 10)` | `:15` 逐字准确；`:9-11` 数据源是 `docs/memo-migration-split.md` 的 ` ```memo-keys ` 块（`:18` 起） | **会红**（加第 11 条 key 后块里 11 行） | **必须**。但报告漏了上半段：**不同步改 `docs/memo-migration-split.md:19-28` 就白改** |
| **D2** | `packages/skill-memo-ilife/test/render.test.mjs:20` `assert.equal(Object.keys(MEMO_KEY_SHAPES).length, 10)` | `:20` 逐字准确 | **会红** | **必须**。另须补 `GOOD` 载荷（`:5-16`），否则改完计数会在 `:23` 取到 `undefined` |
| **D3** | `test/combos-p8.test.mjs:107-114` 逐条断言 `MEMO_KEY_SHAPES` 每键都在 `PRESENT_KEYS` 里 | `:107-112` 逐字准确（`reg = createRegistry(PRESENT_KEYS)`，`:110` `reg.resolve(key).key`） | **会红**，本席用探针独立证实 ↓ | **必须**，且**下半段（`:115-120` 生成物逐字相等）同一批** |
| **D4** | `packages/plugin-memo-ilife/test/skills-provider.test.mjs:90` 反向断言 | `:90` 逐字准确 | **今天绿；不是「不改就红」**（只有在 `#229` 把 `memo.help.lookup` 写进 `SKILL.md` 之后才会红） | **必须同批，但归 #229 不归 #231**（见作业 3-B①） |

**D3 的独立探针（本席亲跑，验证「必红」）**

```
node -e "import('file:///D:/ilife/packages/base-link-core/dist/index.js').then(async reg=>{const p=await import('file:///D:/ilife/packages/base-combos/dist/index.js');const r=reg.createRegistry(p.PRESENT_KEYS);try{r.resolve('memo.help.lookup')}catch(e){console.log('THROWS:',e.message)}})"
```

原始输出：

```
THROWS: 未知 registry key：memo.help.lookup（对不上即 fail，不返空）
```

补充实测：`combos.yaml` 里 `memo.help.lookup` → `false`；`combos.yaml` 的 `combos:` 段共 110 条，其中 `memo.*` **10 条**（`packages/base-combos/scripts/gen-present.mjs` 的 `combosKeys()` 导出函数亲跑）；`packages/base-combos/src/present.ts` 里 `memo.*` 也是那 10 条（`:104-113`）。
⇒ **D3 的机制链完全坐实**：`MEMO_KEY_SHAPES` 加到 11 条而 `combos.yaml`／`present.ts` 不动 ⇒ `:110` 当场抛 ⇒ `:107` 那个用例红；且 `:115-120` 会把任何手改 `present.ts` 的做法一并判红（`renderPresent(combosKeys(yaml))` 逐字比对）——**两条必须一起改，这正是裁决 4（`t220-orchestrator-decisions.md:49-55`）的原文判决**。

**结论**：D1／D2／D3 **真必须同批**，且报告都漏了「配套的另一半」；**D4 的「必修」成立但「归 #231」错**，且它是**明天才红**，不是今天红。

---

### 作业 5 · 告警线数字复核（LF 口径，只数 `\n`）

**命令（本席亲跑，输出为原始输出）**

```
node -e "const fs=require('fs'),p=require('path');const root='D:/ilife/packages/skill-memo-ilife';const out=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','dist','.git'].includes(e.name))continue;
const f=p.join(d,e.name);if(e.isDirectory())walk(f);else{const t=fs.readFileSync(f,'utf8');
out.push([p.relative(root,f).replace(/\\/g,'/'),(t.match(/\n/g)||[]).length]);}}}
walk(root);out.sort((a,b)=>b[1]-a[1]);for(const [f,lf] of out)console.log(String(lf).padStart(5),f);"
```

**逐件表（本席重算，全包 36 个文件全列）**

| 件 | 本席 LF | 报告 §4.3 | 对否 |
| --- | --- | --- | --- |
| `templates/sync_report.html` | 512 | 512（注内） | ✅ |
| `templates/wish_plan.html` | 272 | —（不在表，合规） | ✅ |
| `templates/change_category.html` | 257 | — | ✅ |
| `templates/wish_complete.html` | 239 | — | ✅ |
| `templates/init_report.html` | 225 | — | ✅ |
| **`src/cli/cmd_read.ts`** | **147** | **147（最大）** | ✅ |
| **`src/fetch/db.ts`** | **108** | 108 | ✅ |
| `templates/memo_query.html` | 104 | — | ✅ |
| **`src/fetch/feishu.ts`** | **100** | 100 | ✅ |
| `test/fetch.test.mjs` | 76 | 76（注内最大） | ✅ |
| `test/cli.test.mjs` | 75 | — | ✅ |
| **`SKILL.md`** | **63** | 59 | ❌ **差 4**（票 12 会话刚补 frontmatter，报告写 59 是补前快照） |
| **`src/render/html.ts`** | **62** | 62 | ✅ |
| **`src/policy/wakewords.ts`** | **58** | 58 | ✅ |
| `test/render.test.mjs` | 54 | — | ✅ |
| `test/policy.test.mjs` | 51 | — | ✅ |
| **`src/render/envelope.ts`** | **43** | 43 | ✅ |
| **`src/help/lookup.ts`** | **42** | 42 | ✅ |
| **`scripts/build-help.mjs`** | **37** | 37 | ✅ |
| `test/skill.test.mjs` | 35 | — | ✅ |
| **`package.json`** | **34** | **33** | ❌ **差 1**（票 12 会话往 `files` 加了 `"SKILL.md"`） |
| `src/policy/category.ts` | 30 | 30 | ✅ |
| `src/policy/reminder.ts` | 25 | 25 | ✅ |
| `src/render/templates.ts` | 25 | 25 | ✅ |
| `src/policy/crud.ts` | 24 | 24 | ✅ |
| `src/fetch/errors.ts` | 23 | 23 | ✅ |
| `src/policy/wish.ts` | 14 | 14 | ✅ |
| **`AGENTS.md`（新件）** | **13** | 不在表 | ⚠️ 新件未登记（口径外应写明） |
| `src/render/errors.ts` | 11 | 11 | ✅ |
| `src/policy/index.ts` | 9 | 9 | ✅ |
| `tsconfig.json` | 8 | 8 | ✅ |
| `src/fetch/index.ts` | 5 | 5 | ✅ |
| `src/index.ts` | 5 | 5 | ✅ |
| `src/render/index.ts` | 5 | 5 | ✅ |
| `src/help/index.ts` | 2 | 2 | ✅ |
| `tsconfig.tsbuildinfo` | 0 | 0（口径外） | ✅ |

**判**

1. **「0 件超线，最大 `src/cli/cmd_read.ts` 147」——成立。** 逐件重算 22 件里 20 件逐字对上，全包无一件 ≥350（最大源文件 147＝额度的 42%）。
2. **两处数字过期**：`package.json` 33 → **34**、`SKILL.md` 59 → **63**。原因都是票 12 会话在本报告成文后改了这两件（`git status` 实测两者均为 ` M`）。**不改变结论**（都远低于 350），但 §4.3 那张表自称「实测」就必须是实测。
3. **`AGENTS.md`（13 LF）未登记**。它不在 §4.1 声明的范围内（`src/**/*.ts` ＋ `scripts/*.mjs`），漏登记本身不违规，但**新件一行都不在该表里**，读的人会以为本票没碰行数口径。建议 §4.1 加一句「本票新建的 `AGENTS.md`（13 LF）是口径文件本身，不入表」。
4. **漏算该算的件**：
   - `src/help/scenes/*.ts`（将来的 8 件）——报告 §4.1 已声明要数，✅；§四 末尾也做了第四步预登记，✅。**但预计值应改**：报告写「每件预计 40～150 LF」，按作业 2 的实测密度（25.3 LF／场景）折算，30 场景均分 8 域 ≈ 每件 95 LF（最大域若占 8 场景 ≈ 205 LF），**仍在 350 内，但上界不该写 150 那么乐观**，应写 40–220。
   - `scripts/*.mjs`——只有 1 件（`build-help.mjs` 37），✅ 在表内。
   - `test/*.mjs` 5 件、`templates/*.html` 6 件、`SKILL.md`、`tsconfig*`——按 §4.1 口径边界不算，理由与 `structure.md:9` 对得上，✅。
5. **口径复现验证**：报告 §4.2 说「清点法会少 2～4 行」。本席实测四个文件的差值 —— `cmd_read.ts` **少 4**、`envelope.ts` 少 2、`lookup.ts` 少 2、`db.ts` **少 8**。⇒ **「2～4 行」不成立**（`db.ts` 少 8）。结论（一律取 LF）不变，但那句括号里的数字要改。
6. **一处与告警线有关、报告完全没提的事实**：本包 `npm test`（＝`node --test ../../test/scaffold.test.mjs`）**今天就是红的**。本席亲跑：

   ```
   node tooling/write-snapshot.mjs --check
   → FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19），请跑 pnpm snapshot 重写
   ```

   即 `test/scaffold.test.mjs:10` 的第二个用例先失败。⇒ §3.1 建议的「加一行 `test/*.test.mjs`」**不会让包内 `npm test` 变绿**（第一个用例已经红）。这不推翻「加一行」的价值（净风险仍低），但**必须如实写进 #230 的票面**，否则 #230 会以「包内 npm test 绿」为完成判据而卡死。基线 `pnpm boundaries` 本席复跑 **PASS**（与裁决第四节第 4 条一致）。

---

### 作业 6 · 放行判断

**不能无条件放行。判：有条件放行 —— 改完第四节 6 条即可放行，改完前 `#227`／`#228` 不许开工。**

理由（按严重度）：

1. **§1.3／§2.3／§五第 6 条／§九表格仍写「乙 ＋ 同名同签名临时件」——与裁决正本相反的死条款。** 编排已裁「**甲**」（`t224-resolution.md:3-7`、`t220-orchestrator-decisions.md:25-41`：`_N` 从 `_2` 起、头注释指向 `#237` ＋ `#240`、`#229` **不挂** `#237` 阻塞边）。文档里同时存在「乙（定方向）」与「挂迁移票 #240」两种互斥说法，`#229` 施工时按哪条都可能错。
2. **「临时件」的措辞会造出撞名件 ＋ 依赖一个还不存在的符号。** 见下「撞名判定」。
3. **B3 的转发布局违反铁律五，并让三张票并行改同一个文件。**
4. **资产形状缺 `aliases` 落点**（裁决五要求留在技能侧资产、渲染时剥离），且 `sceneData.buildHelpSceneIndex()` 没有点名消费者。
5. **D4 归错票**，会让 `#229` 关票时留下一条已知会红的断言。
6. **数字与配套件三处不齐**（`package.json` 34、`SKILL.md` 63、D1 的另一半 `docs/memo-migration-split.md`）。

**★ 撞名判定（作业要求的专项）**

- **仓内实测不存在 `saveHtmlFile`。** 全仓（`packages/`／`docs/`／`test/`／`tooling/`，排除 `node_modules`／`dist`）grep 该词，命中**全部**在文档里：`docs/skills/skill-chef/map-chef-body.md:242,249`、`docs/skills/skill-chef/t13-body.md`、`docs/skills/skill-chef/t236-structure-design.md:70,124`、`docs/skills/skill-memo-ilife/{t220,t224-*,t235}-*.md`、`docs/skills/skill-memo-ilife/t225-structure-design.md` 自身。**没有一行代码定义它**。
- 它归 `#237`（`.scratch/chef-help` 系 + `docs/skills/skill-chef/t236-structure-design.md:70`），且 `#237` 是**人工点头闸门**（裁决 3 第 3 条：`#237` OPEN、进度 0%、且阻塞 `#215`）。
- **⇒「放一份同名同签名的临时件」有双重风险**：
  ①**依赖不存在的符号**：`#229` 若照 §1.3 写 `import { saveHtmlFile } from ...`，那个包／那个文件今天不存在，`tsc -b` 直接 TS2307（裁决 12 对 `base-paint` 记过同一个坑）。仓里**有现成可抄的真名**：`packages/skill-bill/src/output.ts:17` `nextExclusiveCandidate`／`:42` `writeFileExclusiveWithRetry`／`:66`（`deliverHtml`）——报告 §1.3 自己就写「照抄 `:27-39`／`:42-58`／`:72-86` 那三块」，那三块的函数名就是这两个，**照抄时连名字一起照抄即可，不必也不该另造 `saveHtmlFile`**。
  ②**将来撞名**：真共用件一旦落地（名字按用户原话固定是 `saveHtmlFile`），本包那个同名件会造成两个同名不同源的符号；报告虽然写了「两个不许同时在仓」，但**这个约束靠人记**，而 `#240`（迁移票）是**独立票**、`blocked_by = #237`——两张票的时序没有任何机制保证「先删后建」。
- **另外，签名也不一致**：`#237` 定的是 `saveHtmlFile({ dir, stem, html, onExists? }) → { mode, path, bytes }`（`docs/skills/skill-chef/t236-structure-design.md:70`、`t13-body.md:10`），而报告 §1.3 写的是 `saveHtmlFile({dir, stem, html}) → 绝对路径`。**「同名同签名」这句话本身就不成立**——少了 `onExists`，返回形状也不同（`{mode,path,bytes}` vs 绝对路径字符串）。⇒ 即便走乙，`#229` 照报告写也会与 `#237` 对不上。

**⇒ 必须改成的措辞（逐字可抄）**

> **§1.3 第 2 条（替换整条）**：
> 「**落盘那一小块（`wx` 独占创建 ＋ `EEXIST` 递补 ＋ `resolve` 绝对路径 ＋ 本地时间戳）由备忘录自持**（编排裁决 3「判甲」，`t224-resolution.md:3`）。三条硬条件：①只抄通式那一小块，**不搬**卡路里的命令名→中文段落映射／动态段／三态回退；②`_N` **从 `_2` 起**（照三家现役行为与老实物 `备忘录_HELP_20260820_150143_2.html`）；③自持件**头注释**写明「这是第 4 份同逻辑实现；共用件＝`#237` 的 `saveHtmlFile`；备忘录迁入见 `#240`」。**函数名照抄来源件**（`packages/skill-bill/src/output.ts` 的 `nextExclusiveCandidate`／`writeFileExclusiveWithRetry`），**不新造 `saveHtmlFile` 这个名字**——仓内今天没有这个符号，造它等于同时欠一个不存在的依赖和一次将来的重命名。`#229` **不挂** `#237` 阻塞边；欠债由 `#240`（`blocked_by = #237`）单独偿还。」
>
> **§2.3 依赖图末行（替换）**：`└─> src/help/deliver.ts（或 cmd_read.ts 内）  甲（定案）＝自持最小管线（照 packages/skill-bill/src/output.ts:17／:42）`
>
> **§五 第 6 条（替换）**：「**落盘那一小块本包自持**（第 4 份同逻辑，照饼干记账 `output.ts` 的 `wx` ＋ `EEXIST` ＋ `resolve`）；头注释指向共用件票 `#237` 与本图迁移票 `#240`。**不预置任何同名临时件**，也不依赖 `#237` 先落地。」
>
> **§九「管线归属」行（替换）**：`甲：自持最小管线（_N 从 _2 起，头注释指向 #237／#240；#229 不挂 #237）` 出处 `t224-resolution.md:3-7`。

**★ 关于「只改措辞够不够」**：够。甲／乙对 `#227`／`#228` 的接口零差异（编排自己记过「若裁甲，成本差异只影响 A5 一个文件的落点与件数」），所以这处修改**不需要重画目录树**，只替换 4 段文字 ＋ §2.3 一行。

---

## 四、必须改完才能开工的清单

1. **§1.3 第 2 条整条替换**为第三节「必须改成的措辞」第 1 段（自持最小管线 ＋ 三条硬条件 ＋ 照抄来源件函数名 ＋ 不新造 `saveHtmlFile` ＋ 不挂 `#237`）。
2. **§2.3 依赖图末行 ＋ §五 第 6 条 ＋ §九「管线归属」行**同步替换（同一事实共四处，必须一起改，否则文档自相矛盾）。
3. **B3 重写**：`src/help/index.ts` 归**单票主**（建议 #229，因为它同时改出口），且只发布**目录外真被消费**的名字；§2.2「转发 7 个」改成「今天转发 0 个新增（`sceneData`／`helpFile` 由 `cmd_read.ts` 直引或用子路径出口）」；§三 `src/help/index.ts` 行从「#227／#228／#229」改成单一票号 ＋ 一行纪律。
4. **资产形状补齐（`#227` 的输入，缺了就要返工）**：①8 个域文件的导出形状里必须有 `aliases` 位（裁决五：别名留技能侧资产、渲染时剥离）；②`version` 从老 yaml 顶层读、**不许写死**（裁决九），并在 §2.5 注明；③生成物加 SHA-256 摘要锁 ＋ `--check`；④`editable_fields` 清洗后 **64 条／29 场景**（裁决六，报告 §2.5 写的「76 条／29 场景」是清洗前的数）。
5. **`sceneData.buildHelpSceneIndex()` 点名消费者**：若只有 `#228` 用，改判归 `#228`；若无人用，删掉这个导出（铁律五判据）。
6. **数字与配套件三处校正**：§4.3 表 `package.json` 33 → **34**、`SKILL.md` 59 → **63**；§4.2 括号「少 2～4 行」→「少 2～8 行（随件而变）」；D1 行补 `docs/memo-migration-split.md:19-28` 那一半，D2 行补 `GOOD` 载荷，D3 行删「需裁」改成「已裁：登记 ＋ 重跑 `gen-present.mjs`」。
7. **D4 改归 #229**（`:88` 原注释写明 #231／#229、`:90` 断言语义是「#229 落地后」），#231 票面写「复核」。〔并入第 6 条一起改即可，此处单列以免漏〕
8. **新件计数统一**：`源码 11（8 域 ＋ sceneData ＋ helpFile ＋ manifest）＋ 脚本 1 ＋ 说明面 1（AGENTS.md）＝ 13 个新文件`；删掉 §1.2 A 组标题的「9 个源码件」与 §五 第 2 条的「11 个源码件 ＋ 1 个脚本 ＋ 1 个说明面」两种算法。
9. **§4.1 补一句**：`packages/skill-memo-ilife/AGENTS.md`（13 LF）是口径文件本身，不入行数表；`src/help/scenes/*.ts` 的预计区间改 40–220 LF。
10. **§3.1 加如实提示**：包内 `npm test` 今天因 `tooling/write-snapshot.mjs --check` 报「快照过期」**已经是红的**（本席亲跑原文见作业 5 第 6 条），加 `test/*.test.mjs` 之后仍不会绿；#230 的完成判据不能写成「包内 npm test 绿」。

> 第 1–4 条是**阻塞性**的（不修则 `#227`／`#228` 必返工）；第 5–10 条是**同批必改但可在开工同一步改**（`#227` 读报告的同一时刻就能改掉，不需要等第二轮）。

---

## 五、可以边做边改的清单

1. **`packages/skill-memo-ilife/AGENTS.md:13` 的出处句**：「与兄弟技能同一口径、同一落点（`packages/skill-chef/AGENTS.md` 逐字同数）」——**该文件今天不存在**（本席实测 `Test-Path` → `False`；`packages/` 下 `AGENTS.md` 实测**只有 1 份**，就是本包这份）。350 的真出处是**用户答复**（`docs/skills/skill-chef/map-chef-body.md:197`／`:212`，逐字「350 ＋ LF 口径，写进 packages/skill-chef/AGENTS.md」）。改法：把「`packages/skill-chef/AGENTS.md` 逐字同数」改成「用户答复 `350 ＋ LF`（`docs/skills/skill-chef/map-chef-body.md:197`）；兄弟件 `packages/skill-chef/AGENTS.md` 尚未落盘（截至 2026-09-12）」。**不影响放行**，但留着就是一处指向不存在文件的引用。
2. **§2.2 类型出处行号**：`packages/base-render/src/spec/help.ts:48-59` → 实为 `SceneSubgroup` `:39-43`／`SceneGroup` `:45-50`（`:48-59` 落在两个类型之间）。§2.2 `helpFile.ts` 行补「类型 0 个（全部转引公共层契约）」。
3. **§2.2 的 `helpFile.ts`／`manifest.ts` 行号引用**：§2.4 引 `packages/skill-bill/src/output.ts:27-39`／`:42-58`／`:72-86` 有半行误差（`nextExclusiveCandidate` 实为 `:17-29`、`writeFileExclusiveWithRetry` `:42-48`），行号随第 1 条一起订正。
4. **§六 风险 4 的第一条（地图 `map-220-body.md:80` 与票面相反）** 本席已核：报告记的「票面 `t225-body.md:10` 写 `packages/skill-memo-ilife/AGENTS.md`」**逐字准确**，保留即可，不必动地图正文。
5. **§十 的「点头条件」表**：如果采纳作业 2 的「乙」形状（去掉 `scenes/` 这一层），本表「新建目录层级＝触发」应改为「不触发」，本票的点头理由就只剩「它是票 7／票 8 的前置门」一条。**形状对 `#227`／`#228` 的接口零差异，故不阻塞开工。**
6. **D 组「三处固定计数」的说法**（§六 风险 2）：加上 D1 的配套件后其实是**四处**（`docs/memo-migration-split.md` ＋ 三个测试文件 ＋ `combos.yaml`／`present.ts`）。措辞统一即可。
7. **§0 的文件自称「十一节」**：实际十二节（`## 零`＋`一`→`六`＋`九`→`十一`，`七`／`八` 缺号）。改成「十二节」或补号，纯体例。
8. **§六 风险 8「本票的雾：无」** 与文档自身的三处「待确认」（§4.1 生成物算不算源码、§六 风险 5、§五 第 7 条两裁项）不一致。第 5 条已裁（第五作业），第 7 条已裁（裁决 4），改完就真「无」了。

---

## 附：本席用过的命令与关键原始输出（可复现）

```powershell
# 1) 全包 LF 逐件（本报告作业 5 的表）
node -e "const fs=require('fs'),p=require('path');const root='D:/ilife/packages/skill-memo-ilife';const out=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','dist','.git'].includes(e.name))continue;
const f=p.join(d,e.name);if(e.isDirectory())walk(f);else{const t=fs.readFileSync(f,'utf8');
out.push([p.relative(root,f).replace(/\\/g,'/'),(t.match(/\n/g)||[]).length]);}}}
walk(root);out.sort((a,b)=>b[1]-a[1]);for(const [f,lf] of out)console.log(String(lf).padStart(5),f);"
# → 147 src/cli/cmd_read.ts  108 src/fetch/db.ts  100 src/fetch/feishu.ts  63 SKILL.md  34 package.json  13 AGENTS.md  2 src/help/index.ts  …

# 2) 同形先例密度（作业 2）
node -e "const t=require('fs').readFileSync('D:/ilife/packages/skill-schedule/src/help/scenes/help-assets.ts','utf8');console.log('LF',(t.match(/\n/g)||[]).length,(t.match(/wake_word/g)||[]).length,(t.match(/\"scenes\":/g)||[]).length);"
# → LF 2198 wake_word 87 scenes[] 34   （2198/87 ≈ 25.3 LF/场景 → 30 场景 ≈ 759 LF）

# 3) D3 真红（作业 4）
node -e "import('file:///D:/ilife/packages/base-link-core/dist/index.js').then(async reg=>{const p=await import('file:///D:/ilife/packages/base-combos/dist/index.js');const r=reg.createRegistry(p.PRESENT_KEYS);try{r.resolve('memo.help.lookup')}catch(e){console.log('THROWS:',e.message)}})"
# → THROWS: 未知 registry key：memo.help.lookup（对不上即 fail，不返空）

# 4) 四文件全绿基线（作业 4）
node --test packages/skill-memo-ilife/test/*.test.mjs        # tests 22 / pass 22 / fail 0
node --test packages/plugin-memo-ilife/test/skills-provider.test.mjs   # tests 8 / pass 8 / fail 0
node --test test/memo-split.test.mjs                          # pass 2 / fail 0
node --test test/combos-p8.test.mjs                           # tests 9 / pass 9 / fail 0

# 5) 包内 npm test 今天已红（作业 5 第 6 条）
node tooling/write-snapshot.mjs --check
# → FAIL: 快照过期（文件 0.1.0@932e7b250d278d50 ≠ 实际 0.1.0@ef9b16473d03cf19），请跑 pnpm snapshot 重写
node tooling/check-boundaries.mjs    # → OK（基线 PASS，与裁决第四节第 4 条一致）

# 6) 撞名排查（作业 6）
Get-ChildItem D:\ilife\packages,D:\ilife\docs,D:\ilife\test,D:\ilife\tooling -Recurse -File -Include *.ts,*.mjs,*.md,*.json |
  Where-Object {$_.FullName -notmatch 'node_modules|\\dist\\'} | Select-String 'saveHtmlFile'
# → 命中全在文档；代码里只有 nextExclusiveCandidate(:17/:27) / writeFileExclusiveWithRetry(:42) / deliverHtml(:66)
```

**只读声明**：本席未修改 `docs/skills/skill-memo-ilife/t225-structure-design.md`、`packages/skill-memo-ilife/AGENTS.md`、`t225-body.md` 或被引的任何代码文件；未 `git add`、未 commit、未动 issue；唯一写入是本文件。工作树里属于别的会话的改动（`packages/skill-chef/**`、`packages/skill-schedule/**`、`packages/plugin-chef/**`、`pnpm-lock.yaml`、`tooling/check-boundaries.mjs`）全程只读（`git status --porcelain` 前后一致）；`packages/skill-calorie/**` 实测干净。
