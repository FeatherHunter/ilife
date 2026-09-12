# 票 #187 决策 · 对抗式复审（复审员 B：目标达成与风险，证伪向）

- 被审件：`docs/skills/skill-home/t187-decision.md`（以 2026-09-12 更正后的磁盘版为准，含 ③「要登记」与 ②「不定义 `q`」两处更正）
- 立场：只读证伪，不动任何文件；行号一律＝仓内实测行号
- 裁决：**72/100 — 整改后通过**（A 目标推进 26／35，B 风险识别 22／35，C 第一性原理 24／30）
- 一句话：方向对（缺省＝文件、机制走共用件、不自造第二份通式），但**拿不出「会红」的既有用例、没交代 `_N` 起步、`q`／`--html` 两支留成开口**，§③ 的登记落地成本也算漏了。

## 一、有没有踩坏既有行为：现存断言**一条都不会直接被改红**，但有三处开口（无确定红，属票 7 落地选择）

逐条核过 `packages/skill-home/test/cli.test.mjs`（113 行，整份读过）：

1. `cli.test.mjs:93-96`（用例 `help.lookup：全表 + 现找`）：`run(['home.help.lookup'])` 断言 `status=0` ＋ `data.total >= 88`。决策 §②.1 只要求缺省**追加** `delivery`（`:27`「只追加，既有五字段一字不改、序不变」），`data` 不动 ⇒ **不红**；但这是本图唯一直接锁「缺省出口」形状的断言，票 7 若顺手改 `data`（例如把 `items` 换成文件信息）就当场红——决策**没写这条禁手**。
2. 隐患（未定，非必红）：决策 §②.2 说产物 `居家管家_速查表_<stamp>.html` 且「载荷保留今天的 `{items,total}`」。若票 7 把 `mode:"lookup"` 读成纯落盘、`data` 只回回执 ⇒ `:96` 的 `total>=88` 落在 `mode` 支上不成立。决策未写「`data` 仍走 `buildHelpItems` 全表」——**该补一行**。
3. `cli.test.mjs:97-98`：`run(['home.help.lookup','--params','{"q":"帮我查物品牛奶"}'])` 断言 `data.items` 含 `home.item.search`。这是**今天活着的契约**（`src/render/views.ts:74-76` 的 `buildHelpItems(all,q)`），而决策 `:28` 只写「居家本图**不定义** `q` 的语义」——**既没冻结、也没删**：票 7 要么保留现支，要么删支，两条路后果完全不同（删了 ⇒ 本条用例红、`exit 2`）。决策把这条留给下游自由裁量，是**本票最该闭合而没闭合的一处**。
4. `cli.test.mjs:108-111`（`--html` 落盘）：走的是 `home.item.search`，**不是** help 键；决策 §② 通篇未提 `home.help.lookup --html` 的去留，而 `src/cli/cmd_read.ts:719-729` 今天对所有键统一支持 `--html`。这是一条活着的 CLI 契约，决策沉默 ⇒ 票 7 可能无意中砍掉它（账单是 `--html` 不吃复用，见 `skill-bill/src/cli/cmd_read.ts:80`）。

结论：**不能给「会红」的具体用例清单，因为决策刻意做成兼容的**；这本身是加分，但上面 2／3／4 三条开口必须在票 7 之前钉死。

## 二、与票 6／票 7 的矛盾：无互相打脸，但有**未并入**与**引用过期**两处

1. 票 7（`t190-body.md:5,6,7,8`）：路径／`delivery`／独占写／开库前分派逐条与决策 §①.2、§②.1、§②.5 **对得上**；`t190-body.md:9` 明写「参数名以票 4 裁决为准」⇒ `mode:"lookup"` 正好接上。**无矛盾**。
2. 票 7 未接第 8 条门禁前提：决策 `:43` 给票 6／票 7 的硬约束 8＝「门禁摘名单是这条依赖的前提（票 12 第七条已写）」。实测 `tooling/check-boundaries.mjs:55` 的 `SKILLS_BASE_FROZEN = ['skill-home']` **仍在**，`t190-body.md` 全文**未提**摘名单；落地时谁摘、何时摘没归属 ⇒ 票 7 一 `import 'base-paint/save-html'` 就被拦（`:57`）。
3. 票 6（`t189-body.md:19,35`）要求「共用件要写得出哪两个能力在用」；决策 §①.4／`:43` 答的是「依赖必要」与「禁造第二份通式」，**没有正面回答「哪两个能力在用」**。实测 `saveHtmlFile`／`helpReuseWindowOf` 现役消费方已有 5 家（`skill-bill`／`skill-calorie`／`skill-schedule`／`skill-chef`／`skill-memo-ilife`），居家是第 6 家——决策 `:30` 却写「**两家**都这么做」，把 6 家写成 2 家，是**论证取材不足**（结论不受影响，但 A 的一节要害证据没写全）。
4. 引用过期：决策 `:18` 落点「住 `src/help/`」挂「票 12 决策 3」。但票 12 的结构设计原文（`t195-structure-design.md:85`、`t195-part1-new-files.md:9`、`t195-part5-overview.md:52`）把这件写成 **`src/render/helpPaths.ts`**。本图自己的规矩是「引用它时必须先核现行件」（决策 `:45` 第 10 条），此处**对本仓文档自我违例**：票 7 照 t195 会建错位。

## 三、`mode:"lookup"` 是不是最优解：**是，且是五家里最贴合既有约定的一支**

- 居家参数面今天就靠 `--params` 一个口（`src/cli/cmd_read.ts:686-698`，未识别键走 `fail(2)` `:695`）。`mode` 是居家**既有主键**：`:304`（搬家 `checklist`／`commit`）、`:315`（位置查 `manage`／`space`／`suggest`／`find`）、`:396`（出行 `pack`）；`src/policy/wakewords.ts:42,43,51,52,62,63` 的唤醒词 `preset` 也全用 `mode`。
- 更硬的一条：账单在**同一个键**上就是 `mode:"lookup"`（`skill-bill/src/cli/cmd_read.ts:111-117`，互斥与非法值口径逐字在 `:116-117`），决策 `:29` 引用成立。居家照抄即「一个键两种产物」，与 `home.item.detail` 的 `view`、`home.location.query` 的 `mode` 同形。
- 我找不到更贴合的既有键，也没找到另立 `--lookup` 旗标或位置参数的支持证据；**`mode` 优于新键**（新键会与 `mode` 撞口径，且唤醒词 `preset` 体系里没有别的键）。

## 四、复用窗口在不在伤害目标：**落在边界，不改口径，但必须写明验收口径**

- 共用件语义实测（`packages/base-render/src/output/saveHtml.ts:34,36-37,291-302,361-366`）：`{reuse:{byAge:86400000}}`＝按**落盘名里的时间戳**取最新一份，**严格小于**窗口即命中，「返回已有那份，不新建、不改写」；`byAge:0`＝永不命中（每次落新的）。
- 因此**第二次说「帮助」不再落新文件**，但**回执路径不变、文件在盘上、可打开** ⇒ 地图目标「明确拿到 help HTML 文件」**仍成立**（「明确拿到」＝有绝对路径回执，不是「每次都新建」），且反复说帮助不堆垃圾文件（决策 `:30` 理由成立）。
- **验收风险（真）**：若验收用「目录里多了一个文件／时间戳更新」作判据，第二次就红；共用件没有「本次是否命中复用」的出口（只返回 `HtmlReceipt{mode,path,bytes}`），调用方只能自己扫目录 ⇒ 说不清。这是**验收口径问题，不是决策错误**：整改只需在票 7 写死一句「第一次跑落新文件；24h 内重跑回同一路径（复用命中），要强制新件走 `reuseHours:0`（共用件 `saveHtml.ts:112-141` 的既有口）」。
- 附带提醒：决策 `:30` 说「两家都这么做」——实际 5 家都在用同一窗口（`helpReuseWindowOf`），窗口的唯一定义与默认值在共用件（`saveHtml.ts:69,136-141`），决策方向正确。

## 五、有没有更简单的路：**没有比「一件落点值」更少件的做法；但决策漏答两条本票必答项**

- 查过「零自持、连落点值也进共用件」：**不成立**。共用件的接口是 `saveHtmlFile({dir,stem,html,…})`（`saveHtml.ts:339`）＋ `HtmlLanding{dir,stem}`（`:75`），目录名／文件名主体是**调用方给的**；结构标准「共用位里不许出现任何一个能力的名字」（`structure.md:66`）⇒ 把 `home_manager_html`／`居家管家_HELP` 塞进共用件会直接违规。所以落点值只能住在技能里，**一件是最小必需**，决策 §①.1 站得住。
- 但两条**更简／必修**没答：①`_N` 起步值——`docs/skills/skill-chef/t3-template-contract.md:656-664` 明文「**票 4／票 7 必读**：递补起始数字不得照抄记账的 `_2`，要照老家的 `_1`」，决策全文**零字**回答；这是维护者肉眼终审会看见的那类差异。②`home.help.lookup --html` 支的去留（见 §一.4）。

## 六、结构纪律：铁律五缺一半，铁律二「第二个用法」这条实质合规

- 铁律五（`structure.md:51-58`）：判据要「数得出一个文件对外给的东西有几个」。决策只说自持「落点值」一件，**没给这件文件的导出面**（导出几个、各一句）——票 12 早已指出「名字未定就不能判合规」（`t195-facts/04-constraints.md:60` 同源），决策理应顺手定死（例如导出 2 个常量 ＋ 1 个类型）。
- 铁律二／共用件生长（`structure.md:28-35,67`）：`base-paint/save-html` **不是预先设计**，是 `#237` 从 2 家用法收进去、其后长到 5 家，居家是第 6 家用它——「写得出哪两个能力在用」**答得出**，故 §① 的合流判断成立，且引用 `skill-bill/src/render/helpPaths.ts:7`、`packages/base-render/src/output/saveHtml.ts` 均**逐字属实**（实测）。

## 七、§③「要登记」的反证检查（按更正要求单列）

- 事实核对**全部属实**：`packages/base-combos/combos.yaml` 的 `combos:` 段实测 **111 条**（calorie 100 ＋ memo 11），`calorie.help.center:111-115`、`calorie.help.lookup:116-120`、`memo.help.lookup:556-557` 都在表内，`home.*` 0 条；条数、构成、先例都对。
- 用途判读：它不是「联动功能表」，而是**跨技能可呈现命令的注册面**——表头只写「唯一真相源（P8 #9）：注册 87 键」（`:1`），help 系条目与普通命令同形（`shape: list` ＋ `title` ＋ `cmd`），所以「help 命令进注册面」这件事**本身不是越范围**；对照 `bill.*`：账单今天 0 条，说明这张表**从来不是全仓穷尽登记**，居家只登 1 条会留下与账单同款的不完整状态（可接受，但决策 `:37` 应显式承认）。
- **成本下限算错（真缺陷）**：`:37` 说「改一处 `yaml` 一行」。实测 `test/combos-p8.test.mjs:115-120` 断言 `present.ts == renderPresent(combosKeys(yaml))`，而 `packages/base-combos/scripts/gen-present.mjs:2,43` 是**代码生成**（`present.ts` 头 `@generated`，禁手改）⇒ 必须跑生成器重写 `packages/base-combos/src/present.ts`；`:121-137` 还断言 `HELP.md` 块 == `buildHelpBlock(yaml)`（同批重生成）。漏这两步 ⇒ 组合门直接红。决策未提这两件，票 7 会按「一行」估工。
- 锁的落点要写细：`:37` 说「补一条锁」——今天锁 memo 的是 `test/combos-p8.test.mjs:140-146`（只覆盖 memo 的 dist 文件与 PRESENT_KEYS），补锁若写在这个 `it` 里必须同时把 `home` 的 dist 文件加进 `runtime` 数组（`:142` 附近），否则「新锁」根本没跑到。另：`home.help.lookup` 进 registry 后，若走新票的 `home-cmd-read` 出口则该键今天**不可解析**（`plugin-home-ilife/src/bridge.ts:17` 只暴露 `ilife.home.read`）——登记与入口实现是否同批，决策没问，票 7 会撞上。

## 八、必须整改（按优先级，票 7 之前闭合）

1. 补 `_N` 起步值一行（照老家 `_1`，引 `t3-template-contract.md:656-664`），并写进票 7。
2. 冻结 `home.help.lookup` 的三支归属：缺省＝文件；`mode:"lookup"`＝速查表文件；`q`＝保留现有 `buildHelpItems` 过滤支（`cli.test.mjs:97-98` 是活契约）；`--html`＝照旧。写清「哪支改、哪支不许动」。
3. `data` 形状禁改：缺省支与 `mode` 支都必须仍回 `{items,total}`（`cli.test.mjs:93-98`）。
4. 写明验收口径：24h 内重跑回同一路径（复用命中）；要强制新件用 `reuseHours:0`（`saveHtml.ts:112-141`）。验收步骤写「第一次跑后核绝对路径可打开」。
5. §③ 订正成本：登记需重跑 `gen-present.mjs`（改 `present.ts`）与 `build-help.mjs`（改 `HELP.md`），并说明「只登 1 条、其余 `home.*` 另立票」是**有意的不完整**（与 `bill.*` 0 条同款）。
6. 引用订正：`:18` 的「票 12 决策 3 → `src/help/`」与 `t195-structure-design.md:85`／`t195-part1-new-files.md:9` 的 `src/render/helpPaths.ts` 对齐（改文档或显式声明覆盖），否则票 7 建错位。
7. 给 `helpPaths.ts` 的导出面（铁律五）；把门禁摘名单（`tooling/check-boundaries.mjs:55`）的落地归属写进票 7 的第一步。
8. 数字订正：`:30`「两家都这么做」→ 实测 5 家在用（`skill-bill`／`skill-calorie`／`skill-schedule`／`skill-chef`／`skill-memo-ilife`）。
