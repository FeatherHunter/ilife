## Question

用户 Q4=A 定了「本次只让新增／改动的 HELP 相关件合规」，而 `docs/agents/structure.md` 的必报五步要求**第一步「影响清单」与第二步「结构设计」先报用户点头**再动手。本票就是那道门：在任何人写第一行代码之前，把形状报清、拿到点头。

要定的形状（把已关票的事实摆上桌）：

1. 新增哪几个目录、哪几个文件（内容资产／生成器／渲染接线／命名通式／落盘点），每个文件对外给什么（导出几个、各一句）；有没有共用件、写得出哪两个能力在用。
2. HELP 交付算不算一个「能力」——`src/help/` 这种技能级落点违不违反铁律四（先例：卡路里 `help-lookup` 是技能级查找入口，铁律四管不到它，见 `docs/skills/skill-calorie/t179-180-structure-design.md` 第五节）。备忘录的 HELP 一级分组是那 8 个域，`src/` 下第一层今天却是 `fetch/`／`policy/`／`render/`／`cli/`／`help/` 这些工种名——本票要判：本次新增件按哪个粒度取名，旧件怎么就地摆正。
3. 被碰到的旧件（`src/cli/cmd_read.ts`／`src/help/lookup.ts`／`scripts/build-help.mjs`／`src/render/index.ts` 等）逐件怎么摆正；哪件已超告警线，要不要顺手抽件（抽的话影响面多大）。
4. **文件行数告警线**：`skill-memo-ilife` 至今没有数字（先例：卡路里 350 行，且那条数字只见于两张清单、没写在包内自己的地方）。**本图取 350 ＋ LF 口径（只数 `\n`）**——这是最新先例（私家大厨那张图的用户答复 `350 ＋ LF 口径，写进packages/skill-chef/AGENTS.md`）；落点也照它：写进 `packages/skill-memo-ilife/AGENTS.md`（`structure.md` 要求这条数字写在各包自己的地方），**不是** `docs/`。按此口径本包今天超线几件，本票一并报出。
5. 每件归哪张票（资产入库／渲染接线／出口落盘），以及「包内 `test` 脚本盖不到新用例」要不要同批修。

产出：一份形状报告（落 `docs/skills/skill-memo-ilife/`，含第一步影响清单 ＋ 第二步结构设计），并**拿到用户点头**才算关票——本票关票是资产入库票与渲染接线票开工的前置。

**并入票 1（`#221`）／票 2（`#222`）的实测**：

- **中英名对照已备**：票 2 报告第五节给了域级与二级组的名字对照（8 域中文名 ↔ 新命令前缀），第一步影响清单与第二步结构设计照它落。
- 票 1 指出备忘录今天**一件 HELP 交付件都没有**、且**没有库就看不了帮助**——结构设计要把「分派先于开库」写进形状里。
- 「HELP 交付算不算一个能力」多一份先例：兄弟图 `#208`（私家大厨）也把 `src/` 下的工种名（`cli`／`fetch`／`policy`／`render`，只有 `help/` 站得住）判给「整包重排」那张票，本图照此**只摆正被碰到的件**。

## 进度：90%

下一步：形状报告已成文，待项目负责人点头后关票

报告落 `docs/skills/skill-memo-ilife/t225-structure-design.md`（十一节：第一步影响清单／第二步结构设计／逐件归属表／告警线实测表／给负责人的一页纸／开工前置与风险／已定案件／点头条件／第五步对账位）。
告警线已落 `packages/skill-memo-ilife/AGENTS.md`（**350 ＋ LF 口径**）。**本票只写形状、不写业务代码**：未改 `packages/` 下任何代码文件、未 commit、未动任何 issue（含本图正文）。

### 三句话说清新件住哪

- **新件全落既有的 `packages/skill-memo-ilife/src/help/`**（技能级入口，非能力目录——同题先例＝卡路里 `help-lookup`）；目录名不动、不做整包重排。
- **8 个域文件落 `src/help/scenes/{memo,search,remind,wish,checkin,mood,sync,init}.ts`**（域＝HELP 一级分组，铁律四下身**文件名**取自这一级），加 `sceneData.ts`（合成）／`helpFile.ts`（出整页 HTML）／`manifest.ts`（命名三个值）；生成器 `scripts/gen-help-assets.mjs`。
- **出口仍只有一条命令** `memo.help.lookup`，落 `src/cli/cmd_read.ts`；**分派先于开库**（今天没有库就看不了帮助）整体归票 9。

### 告警线实测（350 ＋ LF）

本包今天 **0 件超线**：最大 `src/cli/cmd_read.ts` **147 LF**，其后 `fetch/db.ts` 108／`fetch/feishu.ts` 100／`render/html.ts` 62／`render/envelope.ts` 43／`help/lookup.ts` 42／`scripts/build-help.mjs` 37／`package.json` 33，其余 ≤30。

### 要负责人点头的两条（一页纸原文在报告第五节）

1. **`test/combos-p8.test.mjs` 要求「备忘录每个命令都登记在 `combos.yaml`」，而票 4 草案写「不登记」**——二者只能留一个（**建议：登记 `memo.help.lookup` 那一条**，与既有 10 条备忘录命令同形）。
2. **包内 `npm test` 今天盖不到包内任何用例**（`test/*.test.mjs` 五件只在仓根跑，实测 22 项全绿）——**建议票 10 同批改一行**。

另：落盘共用件方向已按编排会话定案走**乙（`#237` 的 `saveHtmlFile`）**，报告 §1.3 已写出「未就绪时先放同名同签名临时件、共用件一到即删」的降级写法。

