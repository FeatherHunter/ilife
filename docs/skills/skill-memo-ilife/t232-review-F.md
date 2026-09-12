# #232 对抗式复审 F：风险面审计（「这次改动会不会把 DSH 真机搞坏」）

- 被审对象：`docs/skills/skill-memo-ilife/t232-install-report.md` ＋ `packages/plugin-memo-ilife/src/{skill-provider.ts,index.ts,dsh-ctx.ts}` ＋ `test/skills-provider.test.mjs` ＋ `packages/skill-memo-ilife/{SKILL.md,package.json}`
- 复审员：F（风险面）。E 专攻「真机断言真伪」，本报告**不重复**其活；本报告只判**爆炸半径与可逆性**。
- 日期：2026-09-12
- 纪律：全程只读（除本文件）。**未重启、未杀、未停 127.0.0.1:43120**；未改任何 issue、未 commit、未 `git add`；工作树里别的会话的未提交改动一个字节没碰。
- 本机关键事实（自证，见 §2）：真机跑的是 **app.asar 里的 harness 0.1.5-rc.1**（不是 `%APPDATA%` 那份旧 0.1.2-alpha.1，那份已经不存在了）；`skills` 服务在本 profile **无条件存在**；运行中的 GUI 进程启动于 **2026/9/12 00:39:56**，而本次新代码的产物写盘于 **13:10:01** —— **新代码尚未被任何活着的插件树加载过**。

---

## 1. 总评 ＋ 评分

### 一句话结论

**这份改动我看不出「会把真机搞坏」的现实通道**：宿主半没有顶层副作用、没有未定义导入、没有 `process.exit`、没有漏 `await`，所有异步失败路径都自己兜住了；客户端产物一个字节没动且门①三条仍绿（#150 那条通道不在场）。**但交付方的两条关键说法是错的，而且错在「会误导回滚」的方向**：① 「宿主没有 `skills` 服务时装配期起不来」——实测语义是**静默 pending，不抛错、不崩树**；② 回滚路径「删 `index.ts:19` 的 `'skills'` 重打 `dist`」——`dist/` 被 gitignore，**git 救不回来，必须重建**，且因新增了顶层 ESM `import`，**不重建就等于没回滚**。

**最坏情况（要记住的那个）**：不是「插件不生效」，而是**技能目录整体塌掉**——宿主 `validateCandidate` 在 `dsh-skill/lib/index.js:360` **没有兜底 try**，而消费者 `dsh-tool-skill` 的会话钩子（`lib/index.js:207` `await ctx.skills.snapshot(...)`）**全文没有 try/catch**。任何提供方给出一个不合格候选，`snapshot()` 就 reject，**每一次模型请求的装配都会抛**（症状＝ agent 全线报错，而不是某个插件消失）。这条武器不是 #232 造出来的（bill／chef／calorie 同款），但 #232 又抄了一份，而它在自己的报告 §2.4[5] 里**已经写出了宿主那条更严的正则**却没写进代码——**这是一行就能拆的雷，我判「必须改」。**

最坏情况的「次一档」才是插件自身：装配期抛错 ⇒ 该行 `[E]` 日志 + 该插件不生效（本机实证见 §2.6：vision-router 本次启动就是这么抛的，GUI 照常起来了、43120 照常 401）。

### 评分（分维度，合计 100）

| 维度 | 权重 | 得分 | 扣分指名道姓 |
|---|---|---|---|
| **真机安全（爆炸半径）** | 35 | **29** | −3：`src/skill-provider.ts:65` 的 `name` 正则 `/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u` **比宿主同字段的正则宽**（宿主 `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`，`dsh-skill/lib/index.js:17`）→ 一个 `Skill-Memo`／`skill-memo_v2` 级别的改字就能把**全机技能目录**打穿（宿主 `:360` 未兜底、`dsh-tool-skill:207` 未兜底）。报告 §2.4[5] 自己写了宿主正则，却没落进代码也没落进测试。−2：新代码**100% 未在活插件树里跑过**（进程 00:39 起、产物 13:10 落，见 §2.5），本票却按「最小装机」口径收口，把唯一能证伪的那次加载全推给 #233。−1：`src/index.ts:47-53` 把**新代码**放在 `apply` 第一句，`src/index.ts:63-91` 的**老 RPC 通道**在其后——新代码抛非「already registered」的错时，**老面板跟着陪葬**（这是照抄 calorie 的形态，故只扣 1，不是 3）。 |
| **回滚可逆** | 25 | **17** | −5：回滚路径只写了一句「删 `:19` 的 `'skills'` 重打 `dist`」，**没提 `dist/` 是 gitignore 的**（`.gitignore:2 packages/*/dist/`，`git ls-files` 返回 0 个文件）——真出事时「`git checkout` 一下就好」是**错的**。−2：**没提「不重建＝没回滚」**。`dist/index.js` 顶层 `import './skill-provider.js'`（ESM 顶层导入，见 §2.2），只改源码不重打产物，模块加载照样炸。−2：**没给验证步**（回滚完怎么算回滚成功：门①、smoke、端口 401），也没提**新测试文件在回滚后会变红**（`test/skills-provider.test.mjs` import 的 6 个符号随回滚消失）。−1：**没给「不重建也能停」的应急口**（profile 摘行／`cordis.patch.yml` 禁用），而这条路仓内**已有先例**（`docs/agents/plugin-webserver-inject.md:64-72`）。+2 已在 §4 补齐可照抄序列。 |
| **与样板一致性** | 20 | **20** | 无扣分。`src/index.ts:106` 与 `plugin-chef/src/index.ts:53` **逐字节同形**；`skill-provider.ts` 与 `plugin-bill-ilife/src/skill-provider.ts` 仅差「bill 多导出一个 `skillFile()`」＋「memo 补了 name 正则允许连字符的注释」（§2.3 逐行比对表）。报告自称「照 `plugin-bill-ilife/src/index.ts:10-35`」稍有失真：`index.ts:10-35` 那段**是 bill 而不是 memo 的形态**（bill 只有 skills，memo 是 skills＋RPC 双职），memo 实际最贴近的是 **calorie**（`inject` 三连全同、注册顺序全同）。这属于出处标注不准，不影响形态，不扣。 |
| **风险是否被如实披露** | 20 | **14** | −2：风险 1 的**失败形态说反了**——「装配期起不来」暗示崩溃/抛错，实测语义是**该 fiber 永不激活（静默 pending，无抛错、无日志）**，见 §2.4。−2：风险 1 的兜底「一处一行，回滚成本极低」**低估**（gitignore＋必须重建＋回滚后测试变红，见上）。−1：§2.6 里「两条红都…别人家」的归因是对的（我复现了），但**风险 2 对本包已经不成立**（我实测 `src/client.ts` 不在宿主 `tsc -b` 程序里，`tsc -b` 不会碰 `dist/client.js`），把不存在于本包的雷写得比真雷还响，反而盖住了**隔壁 bill 那颗真雷**（§2.7）。−1：§0「偏差为零」把清单说成穷尽的，但同包内还有一个 `packages/skill-memo-ilife/AGENTS.md`（未跟踪，`LastWriteTime=13:13:56`，比报告自身的 `13:13:03` 还晚），报告一个字节没提——不能断定是本票写的，但「偏差为零」的说法因此不可自证。 |
| **合计** | 100 | **80** | |

**判词**：**放行到 #233，但下面三条不带过去不算收口**：① 把 `parseSkillText` 的 name 正则收紧成宿主同值（一行）；② 回滚步骤按 §4 重写成可照抄的命令序列（现在这句是误导）；③ 风险 1 的失败形态改成「静默 pending，不抛错」——这三条都是「说法/一行的成本、全机技能目录的收益」。

---

## 2. 作业 1–7 逐条作答（附命令与原始输出）

### 2.0 先说清我在哪台机器上判的

| 事实 | 我的证据 |
|---|---|
| 跑的是 asar 里的 harness，不是 `%APPDATA%` 那份 | live 日志栈帧 `file:///D:/0Tools/DSH%20Desktop/resources/app.asar/node_modules/@deepseek-ai/cordis/lib/index.js:1141`（§2.6）；`%APPDATA%\DSH Desktop\agent\` **已不存在**（实测 MISSING），仓内 `docs/agents/plugin-webserver-inject.md:118` 记的 0.1.2-alpha.1 那份已过时 |
| asar 版本 | `@deepseek-ai/dsh-skill@0.1.5-rc.1`、`@deepseek-ai/cordis@4.0.2`、`@deepseek-ai/dsh-base@0.1.5-rc.1` |
| 真机 GUI 还活着 | 端口 43120 LISTEN，`OwningProcess=31252`（`DSH Desktop.exe`，`StartTime=2026/9/12 0:39:56`），`Invoke-WebRequest` → 401（§2.5） |
| 新产物写盘时刻 | `dist/{index,skill-provider,dsh-ctx,client}.js` 全部 `LastWriteTime=2026/9/12 13:10:01` |

**推论（本报告全部结论的地基）**：跑着的进程用的是 **00:39 那份插件树**，`apply` 里新加的那 7 行**从未被真机执行过**。所以「真机安全」这一维度我给的是**静态可达性判断**，不是实测通过；任何声称「已验真机」的说法在本票内都站不住（交付方 §6.1 的「诚实注记」自己承认了这点，这点我认账）。

---

### 作业 1 · 逐个读改动文件：能抛错/挂起/装配失败的地方

我按「宿主加载路径」逐个过，结论先说：**没找到一条会把宿主搞坏的通道**，找到一个**能打穿技能目录的窄轨**（`name` 正则过宽），以及一处**顺序耦合**。

#### 1.1 `src/skill-provider.ts`（新，125 行）

| 检查项 | 结论 | 依据 |
|---|---|---|
| 顶层副作用 | **无** | `import` 只有 `node:fs/promises`、`node:module`、`node:path`、两个 type-only、`./bridge.js` 的常量。`skillDir()` 里的 `createRequire(...)` **在函数体内**（`:34`），不在模块作用域——这是关键，**模块导入期不可能抛**。 |
| 未定义导入 | **无** | `SKILL_PACKAGE` 取自 `./bridge.js:15`（`'skill-memo-ilife'`），`bridge.ts` 顶层只有 5 个 `const` 与 1 个 `class`，无调用（我读过全 111 行）。 |
| 可选服务当必需用 | **无** | 本文件不碰 `ctx`。 |
| 漏 `await` | **无** | `loadSkill()` 内两处 `await`（`:78` `readFile`）都在 try 内；`list`/`get` 都直接返回 promise。 |
| 挂起风险 | **低** | `readFile` 无超时，但读的是本地单文件；宿主侧另有一层 `waitWithAbort(provider.list(...), signal)`（`dsh-skill/lib/index.js:350`）会替它兜住取消。 |
| 失败是否外溢 | **不外溢** | `skillDir()` 抛 → `catch { return null }`（`:73-75`）；`readFile` 抛 → `catch { return null }`（`:79-81`）；`parseSkillText` 返 null → `return []`（`:89`）。**三条全部降级成「这个技能不存在」，不抛。** |
| `process.exit` | **无** | 全文件无 |
| 循环依赖 | **无** | `skill-provider → bridge`；`index → skill-provider, contract, bridge, dsh-ctx`；无回边。（`skill-provider` 不 import `index`，故 index 的再导出不构成环。） |

**唯一一条真隐患（要改的那条）**：

```
src/skill-provider.ts:65
  if (!/^[\p{L}0-9]+(?:-[\p{L}0-9]+)*$/u.test(name)) return null;
宿主同字段的正则（dsh-skill/lib/index.js:17）
  const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

插件侧**放行**、宿主侧**拒绝**的取值是存在的（大写字母、下划线、非 ASCII 字母、全角连字符）。一旦 `SKILL.md` 的 `name:` 落进这个交集：

```
provider.list() 给出 candidate
  → dsh-skill/lib/index.js:360  validateCandidate(candidate, provider.name)   ← 全文件此处无 try
  → throw new Error(`skill provider "dsh-memo-ilife" returned invalid skill name "…"`)
  → 但 :349-355 的 catch 只包住 provider.list() 本身，包不住 :360
  → 抛出 listLayerCandidates → collectLayer → collectFresh → collect
  → dsh-tool-skill/lib/index.js:207  const snapshot = await ctx.skills.snapshot({…})   ← 该文件全文无 try/catch
  → 模型请求装配期抛出
```

**爆炸半径：该技能的错，全机所有会话的技能目录一起塌**（不是「memo 面板坏了」）。这句我用了两次读源码（`dsh-tool-skill` 里我 grep 了全文的 `try {`/`catch`，**零命中**）。**要不要本票内消除：要，一行**（把 `:65` 换成宿主同值，或在 `test/skills-provider.test.mjs` 加一条 `assert.match(SKILL_NAME, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)`）。

#### 1.2 `src/index.ts`

```
$ git diff -- packages/plugin-memo-ilife/src/index.ts
-export const inject = ['connection', 'webServer'];
+export const inject: readonly string[] = ['connection', 'webServer', 'skills'];
…（apply 内新增 7 行：registerProvider ＋ already registered 退让 ＋ warn）
…（:101-107 新增 6 行导出 ＋ 5 行拆雷注释）
```

| 检查项 | 结论 |
|---|---|
| 顶层副作用 | **无**（新增的只有 `import './skill-provider.js'` 与 3 个 `export … from`） |
| 未定义导入 | **无**（新 import 的两个符号 `PROVIDER_NAME`／`provider as skillProvider` 都在 `skill-provider.ts:22/121` 有定义） |
| **顺序耦合（真问题，但低概率）** | `apply` 的**第一句**是新代码（`:47-53`），**第二段**是老 RPC 通道（`:63-91`）。新代码抛非「already registered」错误 ⇒ **老面板一起不注册**。可能抛的只有 `registerProvider` 内部（`:158-182`）：`create(control)`（＝`() => skillProvider`，**不可能抛**）、`name === 'runtime'`（不可能）、`layers.effect`（仅 ctx 已 dispose 时）。**判：照抄 calorie 的形态，本机 calorie 同形态活着，故不要求本票改；但这是「新代码能不能带走老能力」的唯一一处，值得在 #233 记一笔。** |
| `inject` 声明「用了就声明」 | **过**。`ctx.skills` 被访问（`:48`），`'skills'` 在 inject 里（`:19`）。反例形态（漏声明）本机有活的：vision-router 的 `cannot get property "webServer" without inject`（§2.6）。 |
| 是否误删老声明 | **没有**。`'connection'`／`'webServer'` 都在（`:19`）。测试 `test/skills-provider.test.mjs:43` 还专门锁了这条。 |
| `process.exit` / 挂起 | 无 |

#### 1.3 `src/dsh-ctx.ts`

```
+export interface SkillInvocationPolicy / SkillCandidate / SkillDefinition / SkillProvider / SkillsFace
+  readonly skills: SkillsFace;      // HostCtx
```

- **type-only，构建期擦除**：`dist/dsh-ctx.js` 实测 46 B（只留 `export {}`），**运行时零字节**，不可能抛。
- **新旧镜像不一致（既存，非本票引入，但要点名）**：`HostCtx.connection` 仍写 `{ rpc: { handle } }`（`:83`），而 `apply` 实际用的是 `ctx.connection.fetch.register`（`:59-64`，`#80` 改的道）。**镜像比实现旧了一版**。#232 新加的 `skills` 面**抄得很准**（我逐条对过 `dsh-skill/lib/index.js:452-463` 的校验红线：`name`/`description`/`invocation`/`source`/`rank`/`provider` 六项全对得上，`provider === 注册名` 这条也在），所以**本票没让镜像更坏**，但它也没顺手把 `connection` 修对。**判：留到 #233 或另开一票，不阻本票。**

#### 1.4 与宿主契约的对照（我自己重核了一遍，不引用交付方的自述）

| memo 的写法 | 宿主实际要求 | 出处 | 判定 |
|---|---|---|---|
| `provider.name = 'dsh-memo-ilife'` | 非 `runtime`，且候选 `provider` 须与之相等 | `dsh-skill:161`、`:462` | ✓ |
| `rank: 600` | 有限数；打包技能标准值恰为 600 | `dsh-skill:23` `BUNDLED_SKILL_RANK = 600` | ✓ 同值，内联合理 |
| `source: 'bundled'` | string 即可 | `:459` | ✓ |
| `list()` 返回**数组** | 接受「数组」或 `{candidates, complete}` | `:421` | ✓（数组会被当成 `complete` 未知？——`:414-425` 看到非对象就返回 `{candidates: 数组, complete: true}`，合规） |
| `get(candidate)` 只认名、返 `undefined` | `:257-262`：`undefined` 直接返回；`definition.name !== candidate.name` 触发失效缓存 | `:255-263` | ✓ 与 `:108` 的写法一致 |
| `registerProvider(() => provider)` 忽略 `control` | `control.signal` 用于生命周期；`invalidate()` 可选 | `:147-183` | ✓ 忽略合法（filesystem 用 `signal` 收尾，memo 无 watcher 故不需要） |
| **丢弃 `registerProvider` 的返回值** | **安全**：宿主自己用 `this.layers.effect(this.ctx, …)` 挂了 fiber 级 effect，`:141-142` 注释明说「Fiber disposal unregisters the provider」，`:178` label `skills.registerProvider()` | `:164-178` | ✓ **不是资源泄漏**（这点报告没说，我替它核了） |

---

### 作业 2 · 与样板 `plugin-bill-ilife/src/index.ts:10-35` 逐行比对

命令：

```
$ git diff --no-index --stat packages/plugin-bill-ilife/src/skill-provider.ts packages/plugin-memo-ilife/src/skill-provider.ts
（逐行比对见下表；两文件同源，差异 3 处）
```

| # | 差异 | bill | memo | 判定 |
|---|---|---|---|---|
| 1 | `PROVIDER_NAME` / `SKILL_NAME` 取值 | `'dsh-bill-ilife'` / `'skill-bill'` | `'dsh-memo-ilife'` / `'skill-memo-ilife'` | **必要**（换值） |
| 2 | `SKILL_NAME` 注释 | 「与 `packages/skill-bill/SKILL.md` frontmatter `name` 同值」 | 补「**由 test 逐字锁**」（`:24`） | **必要且更严**：`test/skills-provider.test.mjs:131-136` 真的加了第 8 条断言逐字对；bill 没有这条。**memo 比样板严** |
| 3 | `skillFile()` 导出 | 有（bill `:38-40`） | **无** | **无风险**：memo 在 `:99` 就地 `join(loaded.dir, SKILL_FILE)`。与 `plugin-chef` 完全一致（chef 也不导 `skillFile`）。故「与样板一致」这条不扣 |
| 4 | `parseSkillText` 的 `name` 正则 | 同宽（`\p{L}`） | 同宽，且多了一句注释说「放行连字符」 | **两端一致地错**（继承的雷，见作业 1） |
| 5 | `index.ts` 的 `inject` | 只有 `['skills']` | `['connection','webServer','skills']` | **必要**（memo 还有 RPC 双职）；与 `plugin-calorie/src/index.ts:17` 的 `['connection','skills','webServer']` **同集合**（顺序不同，cordis 用 `Object.entries` 建 map，顺序无语义） |
| 6 | `index.ts` 的 `apply` 长度 | 只注册提供方（9 行） | 注册提供方 **＋** 原 RPC 通道（52 行） | **必要**（#80 的既有职能）**但引入顺序耦合**（作业 1.2） |

**同一 crate 里更近的样板**：memo 的 `apply` 与 `plugin-calorie/src/index.ts:38-89` **逐段同形**（registerProvider → try/catch `already registered` → fetch route → try/catch `duplicate prefix route|already registered`）。报告 §1.3 说「照账单 `:28-34` 逐字同形」指的是那 7 行 catch 块（确实逐字同形），但**整段形态的真样板是 calorie**。判：**不是风险，是出处标注**；建议 #233 把这句话改成「照 calorie 样板的同段形态」。

**结论**：差异 6 处，**5 处必要、0 处引入风险、1 处（差异 6）引入低概率顺序耦合**。样板一致性我给满分。

---

### 作业 3 · 同 profile 邻居 `plugin-home-ilife` / `plugin-schedule-ilife` 的写法差异

**先纠一个前提**：这两个插件**根本没有 skills 面**，所以不存在「它们在 skills 上踩过的坑」这一说法。

```
D:\ilife\packages\plugin-home-ilife\src\index.ts:8    export const inject: readonly string[] = [];
D:\ilife\packages\plugin-home-ilife\src\index.ts:10-12  export function apply(_ctx: unknown): void { void _ctx; }   ← 空壳
D:\ilife\packages\plugin-schedule-ilife\src\index.ts:8  同上
（仓内 skill-provider.ts 只有 4 份：bill / calorie / chef / memo；home、schedule 没有）
```

它们的 3＋3 条红**完全是另一类故障**，而且**正是 #150 的原形**：

```
$ node --test test/client-bundle-48.test.mjs        # 我在仓根实跑
✔ dsh-memo-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
✔ dsh-memo-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
✔ dsh-memo-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✖ dsh-home-ilife ×3        AssertionError: dsh-home-ilife 产物缺 loader 注册头
✖ dsh-schedule-ilife ×3    SyntaxError: Cannot use import statement outside a module
                              at D:\ilife\packages\plugin-schedule-ilife\dist\client.js:7
ℹ tests 21  ℹ pass 15  ℹ fail 6
```

```
$ Get-Content packages\plugin-schedule-ilife\dist\client.js -TotalCount 3
/** dsh-schedule-ilife 客户端存根（P10 脚手架）… */
import { TAB_COMPONENT, registerSingle, openSingle } from './slot.js';      ← 裸 ESM，loader 头没了
$ Get-Content packages\plugin-memo-ilife\dist\client.js -TotalCount 3
window.__ModuleLoader__.load({
	id: "dsh-memo-ilife",
	factory: (require) => {
```

**根因我定死了（不是猜）**：

```
packages/plugin-home-ilife/tsconfig.json      ← 没有 exclude
packages/plugin-schedule-ilife/tsconfig.json  ← 没有 exclude
packages/plugin-home-ilife/src/index.ts:19     export { CLIENT_COMPONENT, … } from './client.js';   ← 取【值】
packages/plugin-schedule-ilife/src/index.ts:19 同上
```

值再导出把 `src/client.ts` 拉进宿主 `tsc -b` 程序 → `tsc -b` 用 tsc 直出的裸 ESM **覆写** tsdown 打的 loader 工厂包 → 客户端整批 crash。**memo 不会踩这个坑，两重保险**：

```
$ cd packages/plugin-memo-ilife && npx tsc -p tsconfig.json --noEmit --listFiles   # exit=0
D:/ilife/packages/plugin-memo-ilife/src/bridge.ts
D:/ilife/packages/plugin-memo-ilife/src/contract.ts
D:/ilife/packages/plugin-memo-ilife/src/dsh-ctx.ts
D:/ilife/packages/plugin-memo-ilife/src/skill-provider.ts
D:/ilife/packages/plugin-memo-ilife/src/slot.ts
D:/ilife/packages/plugin-memo-ilife/src/settings.ts
D:/ilife/packages/plugin-memo-ilife/src/index.ts
（无 client.ts，无 error TS）
$ Select-String packages\plugin-memo-ilife\src\index.ts -Pattern "from '\./client\.js'"
line 103: // 宿主**不**导出 `./client.js` 的值也不引用它的类型（#218 拆雷）…   ← 只有注释，无真引用
$ cat packages/plugin-memo-ilife/tsconfig.json     → 有 "exclude": ["src/client.ts"]
```

**爆炸半径（顺带替编排会话看一眼）**：home／schedule **不在** web profile 的 `dsh.profile.bundles` 里（我读了 profile 的 package.json），`%APPDATA%\DSH Desktop\profiles` 下只有 `web` 一个目录、也没有它们——**所以这 6 条红对正在跑的 GUI 是惰性的**。但**隔壁 `plugin-bill-ilife` 是活的雷**，见 §2.7。

---

### 作业 4 · `inject` 加 `skills` 的爆炸半径（重点）

#### (a) 这个服务在宿主里是不是真的可能缺失？——**在本 profile 里：不可能**

```
$ (asar 内) /node_modules/@deepseek-ai/dsh-base/cordis.patch.yml
    - id: skill
      name: '@deepseek-ai/dsh-skill'                     ← 无条件挂载，没有 disabled
    - id: skill-filesystem
      name: '@deepseek-ai/dsh-skill-filesystem'
    - id: skill-badge
      name: '@deepseek-ai/dsh-skill-badge'
      disabled: true                                     ← 只有 badge 被关
$ (asar 内) /node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml:393-406
# The `skill` REGISTRY stays in the host plane. … the base host `skill-filesystem` row is
# disabled here (presets own local discovery), and `tool-skill` is what a preset mounts…
- id: skill-filesystem
  disabled: true                ← 只关发现层，不关注册表
- id: tool-skill
  disabled: true
$ (asar 内) /node_modules/@deepseek-ai/dsh-skill/lib/index.js:131-135
    constructor(ctx, config = {}) { super(ctx, "skills"); … }        ← 服务名就是 "skills"
```

`dsh.profile.bundles` 的第一项就是 `@deepseek-ai/dsh-base`（我读了 `C:\Users\辰辰洋洋\.dsh\profiles\web\package.json`），而 profile 自己的 `cordis.patch.yml` 是 `[]`。**要让 `skills` 缺失，只有人去改 `dsh-base` 的 patch 或加一条 `- id: skill / disabled: true`**——本机没有。

#### (b) 若缺失，失败形态是什么？——**静默 pending，不抛错、不崩树、不记日志**

我读了 cordis 4.0.2 的 fiber 机制（不是推测）：

```
$ (asar 内) /node_modules/@deepseek-ai/cordis/lib/index.js
:1316  _refresh() {
:1319    for (const name of Object.keys(this.inject)) {
:1320      const impl = this._store[name];
:1321      if (!impl) { epoch = INACTIVE; break; }          ← 注入的服务不存在 → 整个 fiber 不激活
:1327    this._setEpoch(epoch);
:1334    this._updateState(() => { if (epoch !== INACTIVE && oldEpoch === INACTIVE) {…_reload()…}
:1339                               else {…_unload()…} });
:672     get: (target, prop, ctx) => { …
:687       error.message = `cannot get required service "${prop}" in inactive context`;   ← 只有在【激活的】fiber 上访问才会抛
```

**所以**：`inject` 里声明一个永不出现的服务 ⇒ fiber 停在 INACTIVE ⇒ **`apply` 压根不被调用** ⇒ 没有抛错、没有 `[E]`、整个插件树照常。`ctx.skills` 那条 `cannot get required service` 永远走不到（因为 apply 不跑）。**我要不要杀 GUI：不用。只有「该插件不生效」一个后果。**
反方向（声明了但**没写进 inject** 就访问）才有错——本机活证据见 §2.6。
**有没有日志**：loader 侧**没有**为 pending 状态打日志（我把 `cordis-plugin-loader/lib/index.js` 全文 grep 过 `pending|status|inactive`，唯一一条 `:620` 的 `expected service … to be implemented` 属于 `isolate` realm 服务，与本场景无关）。**判：缺服务＝完全静默**，这比「报错」更难查，是运维意义上更该怕的形态——但**它不会把 GUI 搞坏**。

#### (c) 这个风险该不该在本票内消除？——**不该，但披露口径必须改**

| 选项 | 我的判定 |
|---|---|
| 做成「可选注入＋退化」（`inject` 不加 skills，改成鸭子探测 `ctx.get('skills')`） | **不采纳**：① 会与仓内三个在跑样板（bill／chef／calorie）分叉，反而制造第二套形态；② `ctx.get('skills')` 拿到的实例仍须满足 `registerProvider` 契约，退化只是把「静默 pending」换成「静默不注册」，**风险不降**；③ `docs/agents/dsh-client-contract.md:165-170` 已把 `inject=["skills"]` 定为本仓口径。 |
| 用「装配期探测 + 缺了就跳过」 | 同上，且要多一份运行时代码，收益为 0（因为缺服务时 apply 根本不会跑）。 |
| **留到 #233 真机端到端验** | **采纳，且这是唯一有信息量的动作**：本票所有结论都建立在「asar 里的 dsh-base 无条件挂 `skill`」这一静态事实上，唯一次真机加载才是终局证据（本机 GUI 00:39 启动、产物 13:10 落盘，See §2.5）。 |

**附带结论**：交付方自述的兜底「出问题只需把 `:19` 的 `'skills'` 去掉并重打 `dist`」**方向对、细节错**（见作业 5 与 §4）。

---

### 作业 5 · 回滚可逆性

#### 5.1 末态到底打进去了没有？——**打进去了**

```
$ Get-ChildItem packages\plugin-memo-ilife\dist -File | Sort-Object Name
bridge.js          5039  2026/9/10 10:34:12
client.js         12883  2026/9/12 13:10:01      ← tsdown 重打（loader 工厂包，§2.5）
dsh-ctx.js           46  2026/9/12 13:10:01
index.js           6428  2026/9/12 13:10:01
skill-provider.js  4955  2026/9/12 13:10:01      ← 新文件已在产物里
…
```

**所以「回滚要不要重打」的答案是：要，而且是必须的。** 理由不是猜的：

```
$ Select-String packages\plugin-memo-ilife\src\index.ts -Pattern "^import"
src/index.ts:12: import { PROVIDER_NAME, provider as skillProvider } from './skill-provider.js';
```

这是 **ESM 顶层导入**：`dist/index.js` 里会原样留一行 `import { … } from './skill-provider.js'`。只把源码里的 `'skills'` 删掉、不重建 ⇒ 产物**照旧**带着新代码与这条 import 上真机 ⇒ **等于没回滚**。而且：

```
$ git check-ignore -v packages/plugin-memo-ilife/dist/index.js
.gitignore:2:packages/*/dist/	packages/plugin-memo-ilife/dist/index.js
$ git ls-files packages/plugin-memo-ilife/dist | Measure-Object → 0
```

**`dist/` 全部被 gitignore、git 里一个文件都没有** ⇒ 「`git checkout` 一下就好」这条路**不存在**，只有重建。

#### 5.2 交付方的回滚路径够不够？——**不够，缺四件**

| 缺项 | 后果 |
|---|---|
| 没提 `dist/` 不可由 git 恢复 | 出事时第一反应 `git checkout` 会**假成功**（源码回去了、产物没回去） |
| 没提「必须重建」（因为顶层 import） | 同上，等于没回滚 |
| 没提**新文件怎么处理**（`src/skill-provider.ts`、`test/skills-provider.test.mjs`） | 回滚后 `test/skills-provider.test.mjs` 会 import 不到 `PROVIDER_NAME` 等 6 个符号 → 包内测试**变红**，会被误读成「回滚失败」 |
| 没给**不重建也能停**的应急口 | 万一 `tsc -b` 本身出不来（或不敢跑构建），没有第二条路 |

**够不够的判定：不够。** §4 我给一份可照抄的序列（分三档：不重建的应急口／最小回滚／完全回滚＋验证）。

#### 5.3 顺带核清一件事：`tsc -b` 会不会顺手把 `client.js` 打回裸 ESM？

交付方风险 2 说「谁若只跑 `tsc -b`，会把 `client.js` 打回裸 ESM（#150 事故原形）」。**对本包，这句话现在是错的**——我实测 `src/client.ts` 已不在宿主程序里（`--listFiles` 见作业 3），`tsc` 只 emit 程序内的文件，**它不会碰 `dist/client.js`**。（这条注释来自 `plugin-chef/src/index.ts:48-52` 的历史经验，那时 chef 还有 `export type { HostCaller } from './client.js'`。memo 已把类型引用也删了，见 `src/index.ts:101-105` 的拆雷注释。）

**但隔壁 bill 真的是雷**：

```
$ cd packages/plugin-bill-ilife && npx tsc -p tsconfig.json --noEmit --listFiles | grep bill
src/bridge.ts  src/slot.ts  src/client.ts  src/dsh-ctx.ts  src/skill-provider.ts  src/settings.ts  src/index.ts
                                                                  ↑↑↑ 在程序里！
$ Select-String packages\plugin-bill-ilife\src\index.ts -Pattern "client\.js"
line 47: export type { HostCaller } from './client.js';     ← 类型引用照样把 client.ts 拉进程序
$ Get-Item packages\plugin-bill-ilife\dist\client.js → 3528 B, 2026/9/11 17:29:59, 头是 window.__ModuleLoader__.load({
```

**bill 只要被人跑一次 `tsc -b`／`pnpm -r build`，`dist/client.js` 就会被裸 ESM 覆写，而 bill 在 web profile 的 bundles 里**——这是本机现存的一条「下一个人一跑构建就把真机搞坏」的通道。**不归本票，但它比本票任何风险都更接近真机事故，我把它写进 §6 的越界告警。**

---

### 作业 6 · GUI 未被伤害的证据（自己核，只读探测）

```
$ Get-NetTCPConnection -LocalPort 43120 -State Listen
LocalAddress LocalPort  State OwningProcess
127.0.0.1        43120 Listen         31252

$ Get-Process -Id 31252
   Id ProcessName   StartTime          WorkingSet
31252 DSH Desktop   2026/9/12 0:39:56  -2125590528
$ (Get-CimInstance Win32_Process -Filter "ProcessId=31252").CommandLine
"D:\0Tools\DSH Desktop\DSH Desktop.exe" --type=utility --utility-sub-type=node.mojom.NodeService …

$ Invoke-WebRequest http://127.0.0.1:43120/ -UseBasicParsing -TimeoutSec 6
ERR: 远程服务器响应: 远程服务器返回错误: (401) 未经授权。

$ Get-Content packages\plugin-memo-ilife\dist\client.js -TotalCount 3
window.__ModuleLoader__.load({
	id: "dsh-memo-ilife",
	factory: (require) => {
$ Select-String packages\plugin-memo-ilife\dist\client.js -Pattern '__ModuleLoader__\.load\('
line 1: window.__ModuleLoader__.load({
```

判定：**有服务在听（不是连接拒绝）＝进程活着；PID 未变、启动时间未变（未被重启）；401 与交付方自述同状；`dist/client.js` 仍是 loader 工厂包（12883 B，头在位）。** 我全程只做了 TCP/HTTP 只读探测与文件读取，**没有任何 kill／restart／stop**。

**补充的独立证据（交付方没给的）**：真机的 host 日志正在写，且里面是**当前安装**的栈帧，反证 GUI 与 asar 版本都没换过：

```
$ $env:APPDATA\DSH Desktop\logs\host\dsh-2026-09-12.log     (LastWriteTime 13:17:11)
2026-09-12 00:40:10.205 [E] [vision-router] Error: cannot get property "webServer" without inject
    at Fiber.<anonymous> (file:///D:/0Tools/DSH%20Desktop/resources/app.asar/node_modules/@deepseek-ai/dsh-client-connection/lib/index.js:618:35)
    at file:///D:/0Tools/DSH%20Desktop/resources/app.asar/node_modules/@deepseek-ai/cordis/lib/index.js:1141:34
2026-09-12 00:40:37.483 [W] [skill-filesystem] skill file D:\3DeepSeekHarness\agents\xiaoshuai\.dsh\skills\备忘录\SKILL.md ignored: invalid skill name "备忘录"
（同批 6 条：饼干记账／居家管家／卡路里／私家大厨／作息管家 全部 invalid skill name）
```

这两条给我的东西比「GUI 活着」更多：

1. **同一个 plugin-tree boots 路径下真的发生过「插件 apply 抛错」**（vision-router，**是 bundles 里的正式包**），结果是**一条 `[E]` 日志 + GUI 照常服务**。所以对「单插件装配失败」的最坏估计是**该插件不生效**，不是整个 GUI 起不来。
   **但我不把「GUI 一定活着」当保证**：仓内 `docs/agents/plugin-webserver-inject.md:13-29` 记录过另一次事故——**三个插件同错**时 web profile **确实起不来**（Loader `update()` 在 `cordis-plugin-loader/lib/index.js:97-101` 是 `Promise.allSettled` + `if (failures.length) throw` + 回滚）。同一错误的后果**不唯一**。所以最终口径：**「单点失败通常只死那个插件；多行同错／失败发生在启动早期，历史上真能拦住整个 profile」**。
2. **`skill-filesystem` 在真机上真的在扫盘**（它扫的是「项目根 `.dsh/skills`」，说明 profile 的 preset 层发现链是活的）——这直接支撑作业 7。

---

### 作业 7 · `~/.agents/skills` 这一层

#### 7.1 现状复核（交付方的 §4 我逐项复现，**全部属实**）

```
$ Get-ChildItem "$env:USERPROFILE\.agents\skills" -Force
Mode   Name           LinkType  Target
d----l skill-bill     Junction  {D:\ilife\packages\skill-bill}    SKILL.md=14639 B
d----- skill-calorie  (真目录)                                    SKILL.md=30559 B   ← 拷贝
d----l skill-chef     Junction  {D:\ilife\packages\skill-chef}    SKILL.md=7756 B
（skill-home／skill-schedule／skill-memo-ilife 均不存在）

$ Get-FileHash …\skill-calorie\SKILL.md → 903325B1…4527A     30559 B / 161 行
$ Get-FileHash D:\ilife\packages\skill-calorie\SKILL.md → 0480E520…A3909C  31133 B / 163 行
$ Compare-Object (两文件逐行) → 差异 10 条：agents 独有 4 行、repo 独有 6 行
$ $env:DSH_AGENTS_HOME = (空)      $env:DSH_BUNDLED_SKILL_DIR = (空)
$ D:\ilife\.agents\skills 存在但为空;  $env:USERPROFILE\.dsh\skills 不存在
```

#### 7.2 这一层是什么机制、谁读它 —— **是「预设作用域的发现根」，不是插件那条路**

```
$ (asar 内) dsh-skill-filesystem/lib/index.js:73-85
    this.agentsHome = resolve(config.agentsHome ?? process.env.DSH_AGENTS_HOME ?? join(homedir(), ".agents"));
    this.bundledSkillDir = config.bundledSkillDir ?? (…process.env.DSH_BUNDLED_SKILL_DIR);
$ 同文件 :21-25、:150-188  六个根的固定 rank
    PROJECT_DSH=100  PROJECT_AGENTS=200  CUSTOM=300  USER_DSH=400  USER_AGENTS=500(=~/.agents/skills)  BUNDLED=600
$ 同文件 :29-30   const name = "skill-filesystem"; const inject = ["skills"];
$ (asar 内) dsh-agent-presets/presets/standard/agent.cordis.yml:84-85
    - id: skill-filesystem
      name: '@deepseek-ai/dsh-skill-filesystem'        ← 【preset 层】挂载，无 config（走默认根）
```

**谁读它：web app 里由 agent preset 挂的那个 `skill-filesystem` 读**（host 层那条同名行在 web profile 里被 `disabled: true` 关掉了，见作业 4(a)）。它按 `homedir()/.agents/skills` 扫子目录找 `SKILL.md`，rank 500。

#### 7.3 DSH 会不会同时从 profile 与这里发现同一个技能 ⇒ 冲突？

**会不会重复发现：会。会不会崩：不会。谁会赢：`~/.agents` 那份赢——而且不是按 rank 赢，是按「层」赢。**

```
$ (asar 内) dsh-skill/lib/index.js:298-311
    async collectFresh(options) {
      const layers = [this.layers.global, ...this.layers.chainLayers(options.scope)];
      const merged = new Map();
      for (const layer of layers) {
        const collected = await this.collectLayer(layer, options);
        for (const entry of collected.entries) merged.set(entry.candidate.name, entry);   ← 后者覆盖前者
      }
$ (asar 内) dsh-scope/lib/index.js:155-181
    chainLayers(scope) 「farthest ancestor first and the exact scope last, so a caller layering them
                        in order gives the nearest scope the final word」
    merge(): new Map(global.entries()); for (layer of chainLayers) … merged.set(name, value)
$ (asar 内) dsh-skill/lib/index.js:114-115（类注释）
    「…the nearest layer's entry wins a duplicate name outright, and the rank order decides
      duplicates only within one layer.」
```

而层归属是写死的（`dsh-skill:110-112`、`:141-142` 与 `dsh-web-app/cordis.patch.yml:393-400` 的注释）：

- **仓库插件（bill／chef／calorie／memo）的提供方 → global 层**（profile bundle 行，无 scope）
- **preset 的 `skill-filesystem` → preset 作用域层（更近）**

**所以：同名技能，`~/.agents/skills` 那份无条件盖掉仓库插件提供方那份，rank 600 一点用没有。**

这条推论有直接后果，**交付方没说**：
- `skill-bill`／`skill-chef`：两份**是同一个文件**（Junction 回指仓库）⇒ 看不出差别。
- **`skill-calorie`：那份**陈旧拷贝**正是真机此刻实际喂给 agent 的正文。** 它不是「休眠的欠账」，是**正在生效的那一份**。我算出它到底落下了什么：

```
$ Compare-Object (agents 拷贝 161 行) (repo 163 行) → 差异 10 条，其中 repo 独有 6 行含：
   => | `设置档案`／`记活动量`／`改档案` | `calorie.view.profile-wizard`（页面装配在 src/profile/setup.ts） |
   => - **页面已落地（#86 四页 ＋ #179 档案预检页）**：verify 页 **存在**，配置型 wizard 词命中即先出页，不再走文字 verify…
   <= - **fallback（#86 落地前）**：verify 页当前 **不存在** …
```

**判：`skill-calorie` 的陈旧拷贝已经在造成问题**——它给 agent 的指引是「verify 页不存在，走文字 verify」，而仓库（#179 已落地）说该页**存在**。这正是「坏的先例」，而且是**静默**的（拷贝就是拷贝，没有任何警告；`dsh-skill:320` 的 `ignored because a higher-priority skill already exists` 只在**同一层内**去重时打，跨层覆盖连日志都没有——我在 live 日志里 grep `higher-priority` **零命中**，与代码一致）。**归别人家的票，但它是本报告给 memo 那条约会建议的直接依据。**

#### 7.4 该不该为 memo 建链接？——**我判「暂不建」，先确认三件、且必须用 Junction 不能用拷贝**

**先说不建的理由（今天）**：
1. 建了以后，**权威文本从「插件提供方」变成「那个链接」**（7.3）。今天两者指向同一文件、内容逐字节相同，看不出差别；但 #231（说明面）／#229（HELP 出口）落地时会**频繁改 `SKILL.md`**——那时「谁在喂 agent」这件事必须只有一个答案，建链接会把它变成两个（改动同时到两条路，暂时无害，但一旦有人误做成拷贝就永远静默错，`skill-calorie` 就是活标本）。
2. 该根是**用户全局**根（不是 web profile 私有），会影响这台机器上 DSH 家族的全部项目与 agent（交付方 §9.2 自己点到了这一条，我认同）。
3. **本票的完成判据不需要它**：判据是「DSH 技能表可见 `skill-memo-ilife`」，而这条已经由插件提供方（global 层）覆盖；`~/.agents/skills` 是**兜底冗余**，不是必答项（票面只要求「核是拷贝还是链接」）。
4. 风险不对称：**不建**的最坏后果＝插件提供方没生效时技能不可见（可诊断、可修）；**建错**（做成拷贝）的最坏后果＝**静默喂陈旧正文**，且没有任何日志——`skill-calorie` 就是证据。

**建之前必须先确认的三件（缺一件就别建）**：
1. **必须是 `mklink /J`（Junction）指向 `D:\ilife\packages\skill-memo-ilife`，绝不能用拷贝**；建完**立刻**用 `Get-Item … | Select LinkType,Target` ＋ `realpath` 双验，并把结果写进报告（照交付方 §3 的验法）。
2. **先签「谁权威」的账**：`SKILL.md` 的后续改动（#231／#229）以后只认哪一条路？（我的建议：**认仓库文件，然后建 Junction**——因为两条路最终都落到同一份文件，Junction 只是让「不重载插件树也能改」；拷贝一律禁止。）
3. **先确认被陈旧拷贝盖掉的那份要不要一起修**：`skill-calorie` 的 30559 B 拷贝此刻正在生效（7.3）。**在 memo 建链接之前**，最好由卡路里线的人把它换成 Junction（或删掉），否则等于承认「这台机器上同名的两份可以不一样」，而 memo 会照着这个坏先例走。

**我做了/没做什么**：只读探测（`Get-ChildItem`／`Get-FileHash`／`Compare-Object`）＋源码判读。**没有创建任何链接、没有改 `~/.agents` 下任何东西。**

---

## 3. 风险清单（一条一行：风险 → 触发条件 → 爆炸半径 → 现有缓解 → 是否够）

| # | 风险 | 触发条件 | 爆炸半径 | 现有缓解 | 够不够 |
|---|---|---|---|---|---|
| R1 | **候选 `name` 过宽 → 宿主 `validateCandidate` 抛（无兜底）** | 有人把 `packages/skill-memo-ilife/SKILL.md` 的 `name:` 改成插件正则放行、宿主正则拒绝的值（大写/下划线/非 ASCII） | **全机所有会话的技能目录塌**（`dsh-skill:360` 未兜底 → `dsh-tool-skill:207` 未兜底 → 模型请求装配期抛） | 无兜底；只有 `test/skills-provider.test.mjs:131-136` 锁住「`SKILL_NAME` 常量 == frontmatter 实测值」，而**不锁宿主正则** | **不够**。一行收紧 `src/skill-provider.ts:65` 即可，**必须改** |
| R2 | **新代码在 `apply` 第一句，可带走老 RPC 通道** | `registerProvider` 抛非 `already registered` 的错（现实上只有 `layers.effect` 在 ctx 已 dispose 时） | 备忘录面板＋设置页一起不注册（技能侧反而没事） | 与 `plugin-calorie:38-89` 同形，而 calorie **本机活着**（同 profile bundles 内） | **够（本票不改）**。若要更稳：把 RPC 通道那段挪到 `registerProvider` **之前**（与 #80 的既有能力对齐）；**留到 #233／另票** |
| R3 | **`inject` 加 `skills` 后插件静默 pending** | 宿主没有 `skills` 服务（本机不可能：`dsh-base` 无条件挂 `@deepseek-ai/dsh-skill`） | **只有这个插件不生效**；不抛错、不崩树、**无日志**（cordis `_refresh()` → INACTIVE，`:1316-1327`） | 无 | **够**（宿主侧不可能缺失）；但**交付方把它描述成「装配期起不来」是错的**，会误导排障方向 |
| R4 | **回滚假成功** | 出事时按报告那句「删 `:19` 的 `'skills'` 重打 `dist`」只改了源码没重建（或先 `git checkout` 就以为完事） | 真机照旧加载坏产物；若已重启则故障原样复现 | 无（`dist/` gitignore，git 救不回） | **不够**。按 §4 的命令序列执行才够 |
| R5 | **`SKILL.md` frontmatter 加一条插件解析器不认的行 → 技能静默消失** | 往 `SKILL.md` 头加缩进块／列表（如 `allowed-tools:` 多行）——`parseSkillText:54-55` 遇不匹配行**整份返 null** | 只有 memo 技能从技能表消失（`list()` 返 `[]`），无错无日志 | 无（宿主侧走真 YAML 解析器，两边严格度不同） | **够**（退化方向安全：少一个技能 ≠ 崩），但**与 7.4 的链接建议耦合**：建了链接后「两边解析器谁说了算」会把这条放大 |
| R6 | **`~/.agents/skills` 同名覆盖（跨层静默覆盖，rank 失效）** | 在 `~/.agents/skills/skill-memo-ilife` 建**拷贝**（而非 Junction），或日后有人手改那份 | agent 读到陈旧正文；插件提供方的新内容**永远看不到**；**无任何日志** | 无；本机已有活标本 `skill-calorie`（30559 B 陈旧拷贝，正在生效） | **不够**（机制层面无护栏）；缓解＝**只允许 Junction、且建前后双验**（§5） |
| R7 | **（越界告警，非本票）`plugin-bill-ilife` 一跑 `tsc -b` 就废掉 client 产物** | 任何人跑 `tsc -b`／`pnpm -r build`（bill 无 `exclude` 且 `index.ts:47` 有 `export type … from './client.js'`） | bill 的 `dist/client.js` 被裸 ESM 覆写 → 客户端整批 crash（#150 原形）；**bill 在 web profile bundles 里** | 无 | **不够**。修法同 chef/memo：删类型引用 ＋ tsconfig 加 `exclude: ["src/client.ts"]`。**建议立刻另开票** |
| R8 | **（越界告警，非本票）`plugin-home-ilife`／`plugin-schedule-ilife` 的 client 产物已被覆写** | 已经发生了（工作树现况） | 若这两个包日后被加进任何 profile 的 bundles，**客户端整批 crash**；今天不在 bundles 里故 GUI 安全 | 无 | **不够**。属别人家未提交改动；**别在本票碰**，但要有人接 |

---

## 4. 回滚步骤（可直接照抄）

**前置事实（决定了下面每一句）**
- `D:\ilife\packages\plugin-memo-ilife` **就是**真机安装的插件本体（profile 里是 `link:D:/ilife/packages/plugin-memo-ilife`）。
- `dist/` 全被 gitignore（`.gitignore:2`），**git 只能回滚源码，产物必须重建**。
- **禁止**用仓库级 `git checkout .`／`git stash`／`pnpm -r build`：工作树里有 5 个以上别的会话的未提交改动，且仓库级 `tsc -b` 会顺手废掉 bill 的 client 产物（R7）。

### 档 0 · 先取证（不改任何东西，30 秒）

```powershell
Get-NetTCPConnection -LocalPort 43120 -State Listen | Select-Object LocalPort,OwningProcess,State
Get-Content "$env:APPDATA\DSH Desktop\logs\host\dsh-$(Get-Date -Format yyyy-MM-dd).log" -Tail 120 |
  Select-String -Pattern 'dsh-memo-ilife|failed to apply loader entry|without inject|inactive context|expected service'
cd D:\ilife; node --test test/client-bundle-48.test.mjs        # 期望：21 条里 memo 3 绿、home/schedule 6 红（基线）
```

### 档 1 · 最小回滚（保留备忘录面板；**推荐**）

```powershell
cd D:\ilife

# 1) 只回滚本票改过的两个源文件（路径级，绝不碰别人的改动）
git checkout -- packages/plugin-memo-ilife/src/index.ts packages/plugin-memo-ilife/src/dsh-ctx.ts

# 2) 移走本票新增的两个文件
Remove-Item packages\plugin-memo-ilife\src\skill-provider.ts
Remove-Item packages\plugin-memo-ilife\test\skills-provider.test.mjs
#   （test 必须一起移走：它 import 的 PROVIDER_NAME 等 6 个符号已随回滚消失，留着会红）

# 3) 重建宿主产物（必须！dist 是 gitignore 的；且 dist/index.js 有顶层 import 指向 skill-provider.js）
cd packages\plugin-memo-ilife
npm run build:host            # == tsc -b；src/client.ts 已被 exclude，dist/client.js 不会被碰
Remove-Item dist\skill-provider.js* -ErrorAction SilentlyContinue   # 可选：清掉孤儿产物

# 4) 验证
Select-String -Path dist\index.js -Pattern 'skill-provider|skills'   # 期望：0 命中
Get-Content dist\client.js -TotalCount 1                             # 期望：window.__ModuleLoader__.load({
node --test test\smoke.test.mjs
cd D:\ilife; node --test test/client-bundle-48.test.mjs               # 期望：memo 3 绿、总数 15/6 不变
```

**做完这一步，能力回到 #232 之前**：备忘录面板与 RPC 通道照旧，`skill-memo-ilife` 不再出现在技能表。**要不要重启 GUI 由操作者决定**（不重启＝当前进程本来就是旧代码，看不出差别；重启＝真机确认）。

### 档 2 · 完全回滚（连技能包清单一起退回）

```powershell
cd D:\ilife
git checkout -- packages/skill-memo-ilife/SKILL.md packages/skill-memo-ilife/package.json
# 注意：packages/skill-memo-ilife/AGENTS.md 是【未跟踪】文件，git 不会动它；是否删除另行判断（不属本票清单）
# 然后重复档 1 的第 3、4 步
```

### 档 3 · 应急：不重建也要停（只在「构建本身不可信／跑不动」时用）

仓内已有先例（`docs/agents/plugin-webserver-inject.md:64-72`：当年就是这么把三个插件停掉的）。二选一：

```powershell
# 3a) 从 profile 的 bundles 里摘掉这一行（照先例；文件里 dependencies 保留不删）
notepad "C:\Users\辰辰洋洋\.dsh\profiles\web\package.json"    # 删 "dsh-memo-ilife", 这一行
# 3b) 或用 profile 的补丁层按 id 禁用（row id 就是 dsh-memo-ilife，见该包 cordis.patch.yml）
#     把 "C:\Users\辰辰洋洋\.dsh\profiles\web\cordis.patch.yml"（现为 []）写成：
#       - id: dsh-memo-ilife
#         disabled: true
```

两者都**要重启 GUI 才生效**（profile 在启动期组装）。**代价：备忘录面板与设置页一起消失**——损失比档 1 大，故只作最后手段。
**路径确认**：本机唯一含 ilife `link:` 与对应 `dsh.profile.bundles` 的 profile 目录是 `C:\Users\辰辰洋洋\.dsh\profiles\web\`（`%APPDATA%\DSH Desktop\profiles` 下只有 `web` 且没有 `package.json`）。若要求 100% 确定，改之前先在 GUI 的设置→插件页核一眼来源路径。

### 回滚后「算成功」的三条判据

1. `Invoke-WebRequest http://127.0.0.1:43120/` 仍是 **401**（有服务在听；不是连接失败）。
2. `node --test test/client-bundle-48.test.mjs` → **21 条 / 15 绿 / 6 红**，且 memo 的 3 条**绿**。
3. 若已重启 GUI：`%APPDATA%\DSH Desktop\logs\host\` 当日日志里 **没有** `failed to apply loader entry dsh-memo-ilife`，**也没有** `dsh-memo-ilife` 相关的 `[E]`。

---

## 5. 对 `~/.agents/skills` 的建议

**结论：本票内不建；要建就先办完下面三件，且只准用 Junction。**（我只给判断与证据，**没有动手创建任何东西**。）

1. **不建的理由**（按重要性）：① 建了之后权威文本从「插件提供方」变成「那份链接」，而跨层覆盖是**静默**的（`dsh-skill:305` `merged.set` 覆盖，无日志——我在 live 日志里 grep `higher-priority` 零命中，与代码一致）；② 本票完成判据不需要它（判据要的「技能表可见」已由 global 层的插件提供方满足）；③ 该根是**用户全局**根，波及这台机器上所有项目与 agent；④ 风险不对称：不建＝少一个技能可诊断；建错（拷贝）＝**静默喂旧正文**，本机已有活标本。
2. **先确认三件**：① **只准 `cmd /c mklink /J`，禁止拷贝**，建完立刻 `Get-Item | Select LinkType,Target` ＋ `realpath` 双验并留证据；② **先签「谁权威」**——我的建议是「认仓库文件 ＋ Junction」，并明确**禁止拷贝**（拷贝一律视为故障）；③ **先让卡路里线处理它的陈旧拷贝**（30559 B 那份此刻正在生效，内容比仓库少 6 行、多 4 行，含「verify 页不存在」的过期指引）。否则 memo 等于承认「同名两份可以不一样」这个坏先例。
3. **如果哪天决定建**，命令是（**现在不要执行**，仅备查）：

```powershell
# 1) 先确认目标不存在，且仓内文件是想要的版本
Test-Path "$env:USERPROFILE\.agents\skills\skill-memo-ilife"      # 期望 False
Get-Content D:\ilife\packages\skill-memo-ilife\SKILL.md -TotalCount 4
# 2) 建 Junction（不是拷贝）
cmd /c mklink /J "$env:USERPROFILE\.agents\skills\skill-memo-ilife" "D:\ilife\packages\skill-memo-ilife"
# 3) 立刻双验
Get-Item "$env:USERPROFILE\.agents\skills\skill-memo-ilife" | Select-Object LinkType,Target
node -e "const fs=require('fs');console.log(fs.realpathSync(String.raw`C:\Users\辰辰洋洋\.agents\skills\skill-memo-ilife`))"
# 4) 归属记录：写进 docs/skills/skill-memo-ilife/ 下的说明，注明「此链接由谁、何时、为何建，禁止改成拷贝」
```

---

## 6. 给编排会话的整改清单

### 必须改（本票收口前，成本都是一行/一段字）

| # | 项 | 落点 |
|---|---|---|
| M1 | **把 `name` 正则收紧成宿主同值** `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`，或退一步在 `test/skills-provider.test.mjs` 加一条 `assert.match(SKILL_NAME, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)`（**推荐两者都做**） | `packages/plugin-memo-ilife/src/skill-provider.ts:65`；测试 `:131-136` 附近 |
| M2 | **重写报告里的回滚段**，照本报告 §4 换成可照抄命令序列（要点：`dist/` 是 gitignore ⇒ 必须重建；`dist/index.js` 有顶层 import ⇒ 不重建＝没回滚；新测试文件要一起移走；给档 3 应急口） | `docs/skills/skill-memo-ilife/t232-install-report.md` §10.1 |
| M3 | **改正失败形态的表述**：「宿主无 `skills` 服务 ⇒ 插件静默 pending（不抛错、不崩树、无日志），只有本插件不生效」，并写明依据（cordis `_refresh()` `:1319-1322`） | 同上 §10.1，以及 §6.1 的「诚实注记」旁边 |
| M4 | **越界告警（不属本票，但请立刻另开票）**：`plugin-bill-ilife` 缺 `exclude: ["src/client.ts"]` 且 `src/index.ts:47` 仍有 `export type { HostCaller } from './client.js'`，`--listFiles` 实测 `src/client.ts` **在宿主程序里** ⇒ 下一次 `tsc -b`／`pnpm -r build` 会把 bill 的 `dist/client.js` 覆写成裸 ESM，而 bill 在 web profile 的 bundles 里。修法照 chef/memo：删类型引用 ＋ tsconfig 加 exclude。**这是本机现在最接近 #150 事故的一条通道。** | 新票；`packages/plugin-bill-ilife/src/index.ts:47`、`packages/plugin-bill-ilife/tsconfig.json` |

### 建议改（可与 #233 一起）

| # | 项 | 说明 |
|---|---|---|
| S1 | **把 `skill-provider` 的注册挪到 RPC 通道之后**（或给新块单独 try 且永不重抛） | 让「新代码抛错」不可能带走 `#80` 那条既有 RPC 能力。代价：与 calorie 样板分叉，需在注释里写明理由 |
| S2 | **`ParseSkillText` 与宿主解析器的严格度差异写进注释/测试** | 插件是正则解析、宿主是 `yaml.parse`；往 frontmatter 加缩进块／列表会让技能**静默消失**（R5）。加一条「frontmatter 只允许 `key: value` 单行」的测试即可 |
| S3 | **修 `src/dsh-ctx.ts:83` 的 `HostCtx.connection` 镜像** | 它还是 `{ rpc: { handle } }`，而实现用 `ctx.connection.fetch.register`（#80 起）。镜像比实现旧一版，属既存欠账 |
| S4 | **把报告 §1.3 的样板出处改成 calorie** | 形态的真样板是 `plugin-calorie/src/index.ts:38-89`（同形），bill 只是 catch 块那 7 行的出处 |
| S5 | **归属登记**：`packages/skill-memo-ilife/AGENTS.md`（未跟踪，13:13:56）与本票清单的关系 | 报告 §0「偏差为零」因此不可自证；要么认领，要么注明是别的会话的 |

### 留到 #233（真机端到端 ＋ 肉眼终审）

| # | 项 |
|---|---|
| T1 | **重启后核 `skill-memo-ilife` 真的在 agent 技能表里**（唯一能证伪「静默 pending」的动作；本票全程没做，因为硬纪律禁止重启） |
| T2 | 重启后核日志**没有** `failed to apply loader entry dsh-memo-ilife`，且 memo 面板／设置页照旧 |
| T3 | 判 `~/.agents/skills/skill-memo-ilife` 建不建（先办 §5 的三件确认；**卡路里的陈旧拷贝是前置**） |
| T4 | 判 `inject` 三连（`connection`/`webServer`/`skills`）在本机是否**全部**需要：`webServer` 那条是历史事故的遗留声明（`docs/agents/plugin-webserver-inject.md`），`ctx.connection.fetch.register` 走的是 `/api` 载体——值得在真机上确认「多声明一个用不到的服务」是否纯无副作用 |
| T5 | `test/skills-provider.test.mjs:90` 那条**反向断言**（`assert.ok(!def.content.includes('memo.help.lookup'))`）在 #229 落地后必须翻成正向——已在测试注释里标了，别漏 |

---

## 附：本报告的复核命令清单（全部只读，可原样重放）

```powershell
# 门①（#150 回归）
cd D:\ilife; node --test test/client-bundle-48.test.mjs

# 包内回路
cd D:\ilife\packages\plugin-memo-ilife; node --test test/smoke.test.mjs test/skills-provider.test.mjs
cd D:\ilife\packages\plugin-memo-ilife; npx tsc -p tsconfig.json --noEmit --listFiles   # 看 client.ts 是否在宿主程序

# GUI 只读探测（不重启、不杀）
Get-NetTCPConnection -LocalPort 43120 -State Listen | Select-Object LocalPort,OwningProcess
Get-Content D:\ilife\packages\plugin-memo-ilife\dist\client.js -TotalCount 1

# 真机日志（证据来源）
Get-Content "$env:APPDATA\DSH Desktop\logs\host\dsh-2026-09-12.log" | Select-String 'without inject|skill-filesystem|dsh-memo-ilife'

# ~/.agents 层
Get-ChildItem "$env:USERPROFILE\.agents\skills" -Force | Select-Object Name,LinkType,Target
Compare-Object (Get-Content "$env:USERPROFILE\.agents\skills\skill-calorie\SKILL.md") (Get-Content D:\ilife\packages\skill-calorie\SKILL.md)

# git 事实
cd D:\ilife; git check-ignore -v packages/plugin-memo-ilife/dist/index.js; git ls-files packages/plugin-memo-ilife/dist
git status --porcelain -- packages/plugin-memo-ilife packages/skill-memo-ilife
```

（asar 内部读取用 `node` 现算头部偏移后按路径取文件到内存，只读、不落盘：`@deepseek-ai/dsh-skill/lib/index.js`、`@deepseek-ai/dsh-skill-filesystem/lib/index.js`、`@deepseek-ai/dsh-scope/lib/index.js`、`@deepseek-ai/cordis/lib/index.js`、`@deepseek-ai/cordis-plugin-loader/lib/index.js`、`@deepseek-ai/dsh-base/cordis.patch.yml`、`@deepseek-ai/dsh-web-app/cordis.patch.yml`、`@deepseek-ai/dsh-agent-presets/presets/standard/agent.cordis.yml`、`@deepseek-ai/dsh-tool-skill/lib/index.js`。）

**查不到的（写在这里，避免下一票重做）**：① 运行中 GUI 的插件树 row 状态无法直接读（没有 `/api` 可查、宿主日志也不打印每行状态），我只有「进程启动时间早于产物写盘时间」这一条间接证据；② `dsh-tool-skill:207` 抛出之后的**最终**用户可见症状（是「工具报错」还是「整轮对话失败」）我没有追到宿主的上层兜底——只确认了那条路径上**没有 try/catch**；③ `%APPDATA%\DSH Desktop\run-state.json` 是 8 月 22 日旧安装的残留（`exe` 指向 `D:\0Tools\DSHDesktop\...`，版本 0.4.1），与当前进程无关，别拿它当状态源。
