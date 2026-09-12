# #232 对抗式复审报告（复审员 E）

- 被审交付：`docs/skills/skill-memo-ilife/t232-install-report.md` ＋ `packages/plugin-memo-ilife/{src/skill-provider.ts, src/index.ts, src/dsh-ctx.ts, test/skills-provider.test.mjs}` ＋ `packages/skill-memo-ilife/{SKILL.md, package.json}`
- 票面：`D:\ilife\docs\skills\skill-memo-ilife\t232-body.md`／GitHub `#232`
- 复审日期：2026-09-12　复审模式：**只读**（未改任何仓内文件，除本报告；未 commit、未 `git add`、未改任何 issue、未重启／未杀 127.0.0.1:43120 的 GUI）
- 本轮 GUI 进程：PID 31252，启动时间 `2026/9/12 0:39:56`（复审结束时仍在听 43120，`GET /` 回 401 ＝ 有服务在听）
- 复核脚本落在系统临时目录（`%TEMP%\t232-host-validate.cjs`、`%TEMP%\t232-desc-assert.cjs`），**不在仓内**

---

## 1. 总评 ＋ 评分

| 维度 | 分数 | 一句话结论 |
|---|---|---|
| 真机断言真伪 | **93 / 100** | 六条关键真机断言**全部复现成功**，逐字节数字（12883 B／509 B／3895 B／sha256）一个不差；扣分在两处「精度虚报」与一处「报账口径说错」。 |
| 门的可信度 | **88 / 100** | 门①基线 `21/15/6` 复现一致、`dsh-memo-ilife` 3/3 绿；扣分在「改前基线」这一格本质不可独立复现（只有交付方单向声明）＋ 附带门只跑了受影响面清单里的两张。 |
| 越权与纪律 | **90 / 100** | 改动面严格落票；`skill-chef`／`skill-calorie`／`skill-schedule`／`plugin-chef`／`pnpm-lock.yaml`／`tooling/**` 一个没碰；无 commit、无 `git add`。扣分在一件**未报账的包内文件**。 |
| 报告诚实度 | **80 / 100** | 主动披露了「此刻屏幕上没出现」（诚实）与一条已被我复现的回退风险；但 **5 处可核事实写错**（行数 ×3 处、`index.ts` 增量 ×1、Junction 创建时间 ×1、`ERR 3` 归因 ×1、取证方式措辞 ×1），其中「129 行／121 行」写进了报告三处 ＋ 已写回线上 `#232` 正文。 |
| **加权总分** | **87 / 100** | 交付本体是**真货**；报告的数字纪律配不上交付本体的精度。 |

### 每处扣分指名道姓

1. **`skill-provider.ts` 行数虚报 4 行**：报告 §0 对账表 `:40`、§0 第四步 `:49`、§1.1 标题 `:55` 三处写「129 行」，实测 **125 行**（LF 计数 125，`node` 逐字节数出）。报告 §1.1 自己的行号表只映射到 `121–125`，与「129 行」自相矛盾。
2. **`test/skills-provider.test.mjs` 行数虚报 16 行**：同上三处写「121 行」，实测 **137 行**。这两个错数被逐字抄进 `t232-body.md:32` ⇒ **已经写回线上 `#232` 正文**（我 `gh issue view 232` 核过，线上正文里同样写着「129 行」）。
3. **「三条 Junction 的创建时间同为一」不成立**：报告 §3 `:311`、线上 `#232` 正文、`t232-body.md` 都写「三条创建时间同为 `2026-09-11 17:59:07`」。实测三条各不相同：`plugin-memo-ilife/node_modules` = **2026-09-08 10:22:59**、profile = **2026-09-11 08:15:39**、fallback = **2026-09-11 17:59:07**。实质判断（「开工前就已如此」）仍然成立，但那个「同为」是编的精确。
4. **`ERR 3` 的拦截面说错**：报告 §6.2 与测试注释（`test/skills-provider.test.mjs:88`）说「未知联动 key upstream 已拦」。实测那条 `ERR 3: 未知联动 key：memo.help.lookup` 来自 **`src/cli/cmd_read.ts:123` 的 `memoShapeFor()`**（`src/render/envelope.ts:20` 抛 `MemoRenderError`），**不是**十键 `dispatch()` 的 `default:` 分支（`:95`，那句文案是「未知 memo key：」）。结论不变、归因错。
5. **「8 条断言」这个密度说法对不上覆盖内容**：报告 §1.4 说「8 条断言」——`it()` 数确实是 8 条，但其中「说明面与速查表口径」那条的 description 部分（`:121-123`）实测**打不到要害**（见 §2 打假 9），真正锁住「list 返回 description」的只有 `:61` 一条弱断言。**8 条 `it()` ≠ 8 处要害都有锁。**
6. **一件未报账的包内文件**：`packages/skill-memo-ilife/AGENTS.md`（13 行，未跟踪）。报告 §0 第五步「不碰」清单与 §0 `:47` 的「其余改动全部属别的会话」清单都没提它。
7. **「宿主 `validateCandidate` 8 条红线全 PASS」的说法超出实际覆盖面**：报告 §2.4 `[5]` 列了 8 行 PASS，但那一节是**自查**（照源码重写一遍），不是跑宿主的函数。我用宿主真源码（`dsh-skill/lib/index.js:452-464` 原样抽函数）跑了一遍：10 条判定线（8 条 + `modelInvocable`／`userInvocable` 两条拆开）全 PASS，结论**反而比报告更强**——所以这不是虚报结论，是虚报了取证方式。

---

## 2. 打假 1–10 逐条（附复跑命令与原始输出）

### 打假 1 —— 「profile 里的 Junction 不是拷贝，三条 realpath 全落仓库本体」

**判断：复现成功**（附一条细节打假）。

```powershell
$p1="$env:USERPROFILE\.dsh\profiles\web\node_modules\skill-memo-ilife"
$p2="$env:USERPROFILE\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-memo-ilife"
$p3="D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife"
Get-Item -LiteralPath $p | Select LinkType,Target,Attributes
```

```
C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-memo-ilife
  LinkType = Junction   Attrs = Directory, ReparsePoint
  Target   = C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-memo-ilife
C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-memo-ilife
  LinkType = Junction   Attrs = Directory, ReparsePoint
  Target   = D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife
D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife
  LinkType = Junction   Attrs = Directory, ReparsePoint
  Target   = D:\ilife\packages\skill-memo-ilife
```

`node`（`fs.realpathSync.native`）：

```
realpath: D:\ilife\packages\skill-memo-ilife     ← profile 那一跳
realpath: D:\ilife\packages\skill-memo-ilife     ← fallback 那一跳
realpath: D:\ilife\packages\skill-memo-ilife     ← 包内 workspace 那一跳
profile nm isSymbolicLink: true
fallback  isSymbolicLink: true
SKILL.md via profile chain exists: true
SKILL.md realpath: D:\ilife\packages\skill-memo-ilife\SKILL.md
```

**结论：票面「那是拷贝」确实判错，交付方的更正成立；三条链全 Junction、末梢是仓库本体。**
**但**：报告 §3 `:311` 与线上 `#232` 正文写的「三条 Junction 的创建时间同为 `2026-09-11 17:59:07`」**不成立**：

```
C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-memo-ilife
   Creation=2026-09-11 08:15:39  LastWrite=2026-09-11 08:15:39
C:\Users\辰辰洋洋\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-memo-ilife
   Creation=2026-09-11 17:59:07  LastWrite=2026-09-11 17:59:07
D:\ilife\packages\plugin-memo-ilife\node_modules\skill-memo-ilife
   Creation=2026-09-08 10:22:59  LastWrite=2026-09-08 10:22:59
```

只有 fallback 那一跳是这个时间。三条都早于本票开工（2026-09-12），所以「未改任何 Junction」的判断**不受影响**。

---

### 打假 2 —— 「门①改前＝改后：`tests 21 / pass 15 / fail 6`，memo 3/3 绿，6 红是 home 3 ＋ schedule 3」

**判断：复现成功**（「改后」那一侧；「改前」那一侧**无法独立复现**）。

```powershell
cd D:\ilife; node --test test/client-bundle-48.test.mjs
```

```
✔ dsh-chef client：classic 执行并注册自身 id（#48 整批 crash 回归）
✔ dsh-chef client：factory 可物化，导出 apply/inject，无 node 依赖
✔ dsh-chef client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✖ dsh-home-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归）
✖ dsh-home-ilife client：factory 可物化，导出 apply/inject，无 node 依赖
✖ dsh-home-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✔ dsh-life-pack client：classic 执行并注册自身 id（#48 整批 crash 回归）
✔ dsh-life-pack client：factory 可物化，导出 apply/inject，无 node 依赖
✔ dsh-life-pack client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像）
✔ dsh-memo-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） (0.7966ms)
✔ dsh-memo-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 (0.9296ms)
✔ dsh-memo-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） (0.2384ms)
✖ dsh-schedule-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） (0.4916ms)
✖ dsh-schedule-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 (0.5192ms)
✖ dsh-schedule-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） (0.1881ms)
ℹ tests 21
ℹ pass 15
ℹ fail 6
```

6 条红的成因我核了原始报错：`dsh-schedule-ilife` 三条都是 `D:\ilife\packages\plugin-schedule-ilife\dist\client.js:7  import { TAB_COMPONENT, … } from './slot.js';  SyntaxError: Cannot use import statement outside a module` ＋「产物缺 loader 注册头」——正是 `#150` 那个地雷在**别人家**复发；`dsh-home-ilife` 三条同族。**与备忘录包无关，数字与红点分布与报告逐字一致。**

**扣分点**：「改前基线」是交付方的单向声明——`HEAD` 里没有这些源文件（`skill-provider.ts` 是新增未跟踪文件），我**无法**在不写工作树的前提下回到改前状态独立复现。这一格按「无法独立复现，但改后实测一致 ＋ 6 红成因可归因」处理。

---

### 打假 3 —— 「`SKILL.md` 正文与 `git HEAD` 逐字节一致（正文 3895 B，sha256 `0351F7AE…`）」

**判断：复现成功，逐位一致。**

```powershell
cd D:\ilife; git diff -- packages/skill-memo-ilife/SKILL.md
```

```diff
@@ -1,3 +1,7 @@
+---
+name: skill-memo-ilife
+description: "「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP 文件（老骨架 8 域／13 二级组／30 场景，走仓内通用 help 模板）；唯一出口 memo-cmd-read。触发词：备忘录HELP（不分大小写）。文件 DB 笔记：按关键词／时间／分类／子分类搜与看、记一条、改一条、删一条（真删须 confirm）、批量改分类、提醒（设／查／废弃／完成）、心愿排期、统计、飞书同步。"
+---
 # 备忘录（memo）SKILL
 
 文件 DB 笔记：增删改查、分类、心愿排期、提醒路由、飞书同步。唯一出口 `memo-cmd-read <memo.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。

 packages/skill-memo-ilife/SKILL.md | 4 ++++
 1 file changed, 4 insertions(+)
```

`node` 逐字节（`git show HEAD:…` 取原始字节，不经文本管道）：

```
HEAD bytes = 3895  sha256 = 0351F7AEAED1BD52F144D47EB794EB78D754832757255A677681302EE71E37AD
CUR  bytes = 4404
HEAD content found inside CUR at byte offset: 509
prefix bytes = 509           prefix hex head = 2d2d2d   ← "---"
body sha256 = 0351F7AEAED1BD52F144D47EB794EB78D754832757255A677681302EE71E37AD
body identical to HEAD = true
starts with BOM = false
has CR = false
```

**diff 只有 4 行新增，正文零改动；3895 B／sha256／509 B 前缀／无 BOM／无 CR 全部对上。**

---

### 打假 4 —— 「`dist/client.js` 仍是 loader 工厂包（含 `window.__ModuleLoader__.load({` 头，12883 B）」

**判断：复现成功。**

```powershell
cd D:\ilife\packages\plugin-memo-ilife
(Get-Item dist\client.js).Length          # 12883
Get-Content dist\client.js -TotalCount 3
$c = Get-Content dist\client.js -Raw
$c -match '(?m)^import '                  # False
$c -match 'node:'                         # False
$c -match '__ModuleLoader__'              # True
```

```
client.js size = 12883
window.__ModuleLoader__.load({
	id: "dsh-memo-ilife",
	factory: (require) => {
contains 'import ' = False
contains 'node:' = False
contains __ModuleLoader__ = True
```

`dist/` 时间戳序列也支持报告的构建顺序声明：`src/*.ts` = `2026/9/12 13:09:11~13:09:30`，`dist/{index,skill-provider,dsh-ctx,client}.js` **全部** = `2026/9/12 13:10:01`。**末态 client.js 确为 loader 工厂包，`#150` 事故形态未复发。**

---

### 打假 5 —— 「技能表可见 `skill-memo-ilife`（名 ＋ description）」

**判断：复现成功**（两层都复现到了；**但「技能表可见」有一处精度要说清**）。

我从 **web profile 目录**起解析（与 DSH 真机加载插件同一条链），真跑 `apply`，再用**宿主真源码**校验候选：

```
[1] dsh-memo-ilife/package.json -> D:\ilife\packages\plugin-memo-ilife\package.json
[1] entry -> D:\ilife\packages\plugin-memo-ilife\dist\index.js
[1] realpath(entry) -> D:\ilife\packages\plugin-memo-ilife\dist\index.js
[1] skill-memo-ilife/package.json -> D:\ilife\packages\skill-memo-ilife\package.json
[1] realpath(skill root) -> D:\ilife\packages\skill-memo-ilife
[2] name = dsh-memo-ilife
[2] inject = ["connection","webServer","skills"]
[3] providers registered = [ 'dsh-memo-ilife' ]
[4] list.length = 1
[4] name = skill-memo-ilife
[4] description = 「备忘录HELP」→memo.help.lookup 出备忘录自己的 HELP 文件（……202 字）
[4] provider = dsh-memo-ilife | source = bundled | rank = 600
[4] invocation = {"modelInvocable":true,"userInvocable":true}
[4] resourceBase = {"kind":"directory","path":"D:\\ilife\\packages\\skill-memo-ilife"}
[6] get.content first line = # 备忘录（memo）SKILL
[6] contains memo-cmd-read = true
[6] contains memo.help.lookup = false
[6] fm name === SKILL_NAME = true
```

我把宿主 `dsh-skill/lib/index.js` 的 `validateCandidate`／`validateDefinition`／`toSummary`／`SKILL_NAME` **原样抽出**（不是照抄重写）跑候选：

```
host BUNDLED_SKILL_RANK = 600 | host SKILL_NAME regex = ^[a-z0-9]+(?:-[a-z0-9]+)*$
Array.isArray(list()) = true -> observation.complete = true
  PASS  typeof name === string
  PASS  SKILL_NAME.test(name)
  PASS  typeof description === string
  PASS  description.length > 0
  PASS  modelInvocable boolean
  PASS  userInvocable boolean
  PASS  typeof source === string
  PASS  rank finite number
  PASS  typeof provider === string
  PASS  provider === registered name
  => validateCandidate: PASS (real host source, no throw)
=== host validateDefinition(get() 结果) ===  => PASS
```

`toSummary`（模型在技能表里真正读到的那一份）＝ `{name:"skill-memo-ilife", description:"…202 字…", invocation:{modelInvocable:true,userInvocable:true}, source:"bundled", provider:"dsh-memo-ilife", resourceBase:{kind:"directory", path:"D:\\ilife\\packages\\skill-memo-ilife"}}`。

包内测试也复跑全绿：`node --test test/*.test.mjs` → `ℹ tests 16 / pass 16 / fail 0`（8 条新回路 ＋ 8 条烟囱）。

**要说的精度**：我复现到的是「**宿主红线全过 ＋ `list` 真的产出这个候选**」。第 ② 层「真装机口径」我复现到 `/profile 解析链 → 真 dist/index.js → 真跑 apply`，**与交付方同一深度**。至于「**此刻屏幕上**已经出现」，我另有一层旁证：该 profile 的 `package.json` 里 `"dsh-memo-ilife": "link:D:/ilife/packages/plugin-memo-ilife"` 在 dependencies、`dsh-memo-ilife` 也在 `dsh.profile.bundles` 列表里——**接线早就在位**；新增的注册代码要下次加载插件树才进内存。交付方 §6.1 那句「诚实注记」主动承认了这一点，**这是加分的诚实，不是隐瞒**。

---

### 打假 6 —— 「`memo-cmd-read` 真跑拿到绝对路径＝未达成（`ERR 3: 未知联动 key`）」＋「它到底依不依赖 #229」

**判断：复现成功；「依赖 #229」我的独立判断＝**依赖成立，且**判据后半条在本票分界内本来就不可达**。

```powershell
cd D:\ilife\packages\skill-memo-ilife
node dist\cli\cmd_read.js                       # exit=2
node dist\cli\cmd_read.js memo.help.lookup      # exit=3
```

```
[stderr]
ERR 2: 用法：memo-cmd-read <memo.key> [--params JSON对象] [--html 输出路径] [--timeout 毫秒]
ERR 3: 未知联动 key：memo.help.lookup
```

**归因纠正**（报告写错了，结论不变）：我把三层都探了——

```
memoShapeFor threw: MemoRenderError | 未知联动 key：memo.help.lookup
MEMO_KEY_SHAPES keys = ["memo.search","memo.detail","memo.create","memo.update","memo.remove",
                        "memo.remind","memo.wish","memo.sync","memo.batch","memo.stats"]   ← 只有 10 条
```

`cmd_read.ts` 的执行顺序是 `:119` 解析参数 → `:123` `memoShapeFor(o.key)` → 才到 `:129` 开库。所以 `ERR 3` 出自 **`:123` 的 `memoShapeFor()`**（`src/render/envelope.ts:20`），**没有走到** `dispatch()` 的 `default: fail(3, '未知 memo key：' + key)`（`:95`）。报告 §6.2 与测试注释（`test/skills-provider.test.mjs:88`）的「upstream 已拦」说的是另一句话、另一个位置。

**独立判断「依不依赖 #229」——依赖，三条各自独立成立：**

1. `MEMO_KEY_SHAPES` 只有 10 条（我上面实测列出），`memo.help.lookup` 不在其中 ⇒ 要加键必须动 `src/render/**` 的形状表，而那正是 #229 正文点名的第二项：「`memo.help.lookup` 还要登记进 `src/render/envelope.ts:5-16` 的命令表（现在只有 10 条）」。
2. #229 正文第一段：「**本票的第一件事是改分派顺序**：`src/cli/cmd_read.ts:129` 现在**无条件 `openMemoDb`** ⇒ 要照账单 …… 把 `memo.help.lookup` **在开库之前**分派掉」——正是我实测的 `:123` 前置位置，与分派表同属 #229 范围。
3. #229 自己的完成判据就是「真跑一次 `memo-cmd-read memo.help.lookup` 拿到落盘文件与绝对路径回执」——**与本票判据后半条是同一句话**。同一句判据落在两张票上，只能有一张拥有它。
4. 线上 `#229` 状态 `OPEN`、进度 `0%`，且自述「等票 4（决策）＋票 8（渲染接线）关票」；线上 `#233` 的「下一步」明写「等票 10（锁）＋票 11（说明面）＋**票 12（装机）**关票」——地图计划表把 #229 标为阻塞 #233，与 `map-220-body.md` 一致。

**顺带纠一条**：#229 的判据里还有「跑完**不建库**」这一条。今天 `memo.help.lookup` 在 `:123` 就抛了，根本没走到 `:129` 开库 ⇒ 这条今天**是空过**的（不是「已验过」）。谁把后半条往本票拽，都要连这条一起接。

---

### 打假 7 —— 「`inject` 加 `skills` 的风险」（交付方自述依据是同 profile 的 chef／bill 已同样注入）

**判断：依据复现成功；「缺服务会不会真起不来」＝会，但风险极低。**

我核了三家的真源码：

```
packages/plugin-bill-ilife/src/index.ts:14:  export const inject: readonly string[] = ['skills'];
packages/plugin-bill-ilife/src/index.ts:29:      ctx.skills.registerProvider(() => skillProvider);
packages/plugin-chef/src/index.ts:14:        export const inject: readonly string[] = ['skills'];
packages/plugin-chef/src/index.ts:29:        ctx.skills.registerProvider(() => skillProvider);
packages/plugin-calorie/src/index.ts:17:    export const inject = ['connection', 'skills', 'webServer'];
packages/plugin-calorie/src/index.ts:45:    ctx.skills.registerProvider(() => skillProvider);
```

⇒ **账单与大厨确实都 `inject` 了 `skills`**，交付方这条依据是真的。

`dsh-ctx.ts` 的写法是否与别人一致：**与卡路里逐字同形**（备忘录本来就是照卡路里抄的六边形样板）——`SkillCandidate`／`SkillDefinition`／`SkillProvider`／`SkillsFace` 接口逐条相同，`HostCtx` 都是 `connection: {rpc:{handle}}` ＋ `skills: SkillsFace` ＋ `effect` ＋ `logger?`；账单／大厨走的是另一形状（`SkillHostCtx { skills; logger? }`，因为那几个包没有 RPC 面）。**没有分裂、没有自造。**

「宿主缺该服务会不会真起不来」——**会，且没有失败退化分支**：

```
dsh-skill/lib/index.js:132   super(ctx, "skills");              ← SkillRegistry 以 "skills" 挂成服务
dsh-skill/lib/index.js:147   registerProvider(create) { … }
dsh-skill/lib/index.js:101   new NamedEntries(name => new Error(`a skill provider named "${name}" is already registered`))
docs/agents/dsh-client-contract.md:47-49  host 侧 "skills" 即服务名 …… host 插件 inject 写 "skills" 即注入该注册表
```

`ctx.skills` 是 **inject 声明式硬取用**（cordis 形态），本仓三个先例都**没有**软取（没有任何一家写 `ctx.get('skills')` 判空）。所以「宿主没有 `skills` 服务 ⇒ 本插件装配期起不来」这个机理**成立**；交付方 §10.1 的兜底（去掉 `:19` 的 `'skills'` 一行并重打 `dist`，一处一行）也描述得对。

**风险实测极低**，两条独立证据：

- **服务是宿主标配**：该 profile 的 `dsh.profile.bundles` 含 `@deepseek-ai/dsh-base` ＋ `@deepseek-ai/dsh-web-app`，`@deepseek-ai/dsh-skill` 就在 `~/.dsh/profiles/node_modules/` 里随宿主装载；同一棵树里**卡路里／账单／大厨三个插件已经在用同一个 `skills` 服务并正常工作**。
- **降级路径已被本仓验证过**：`docs/agents/dsh-client-contract.md:171-172` 记着本项目的软依赖写法（`ctx.get('betterSidebar')` 判空，没装就不注册）——但那是**客户端槽位**的软依赖；服务面这里三家先例都取硬声明。**照先例走是对的，不算本票引入的新风险。**

**我的判断**：这条风险**可接受**，且比交付方自述的还低一点——因为它不是「本票新开的口子」，而是**沿着卡路里／账单／大厨三条已在真机跑着的先例往同一个服务上加第四个消费者**。真正要等真机走实的只有一件事：**新增注册代码要下次加载插件树才进内存**（见打假 5 的精度说明）。

---

### 打假 8 —— 「frontmatter 的 `description` 是否会让 skills-cli 出问题」＋ 入口口径核对

**判断：YAML 复现成功（不会出问题）；入口口径＝不合格。**

用真 YAML 解析器（`js-yaml`，从 web profile 的 `node_modules` 加载）解 frontmatter：

```
first line = "---"
end --- at line index 3 (1-based 4)
yaml parser = C:/Users/辰辰洋洋/.dsh/profiles/web/node_modules/js-yaml
parsed OK = ["name","description"]
name = "skill-memo-ilife"
description length = 202
description startsWith = "「备忘录HELP」→memo.help."
```

⇒ 双引号包裹、内部含中文与全角括号、含 `→` 与 `／`，**标准解析器一次过**；`name`／`description` 两个键都在，无多余键、无冒号歧义（值整体被引号包住）。**skills-cli 这一侧不会因为 YAML 语法出问题。**

**但入口口径有硬伤——这是本轮最重的一条实质发现：**

用户裁定的唯一入口是 **`备忘录 HELP`（中间一个空格，不分大小写）**。权威出处四处一致：

- `docs/skills/skill-memo-ilife/map-220-body.md:41`：「HELP 入口只认 1 条：`备忘录 HELP`（不分大小写）」
- `t226-amendment.md:5-7`：用户原话「就 备忘录 HELP 不分大小写……」
- `t224-decision-draft.md:83`：裁决表第 6 条
- 线上 `#231` 正文：「`SKILL.md` 里的 HELP 触发口径**只写 `备忘录 HELP`（注明不分大小写）**」

实测交付方写进去的是 **`备忘录HELP`（无空格）**：

```
description.includes("备忘录 HELP") (带空格) = false
description.includes("备忘录HELP")  (无空格) = true
SKILL.md 全文 includes("备忘录 HELP") = false
SKILL.md 全文 includes("备忘录HELP")  = true
```

frontmatter 原句是「**触发词：备忘录HELP（不分大小写）**」，并且把「（不分大小写）」挂在了**无空格那个错形**上。SKILL.md 正文里**一次都没有**出现带空格的裁定入口。

**为什么这条归本票要认**：补 frontmatter 是 `#232` 的活（`#231` 正文自己划的界：「补 frontmatter 是票 12 的活，两票别打架：本票只动正文，frontmatter 归票 12」），而 **description 正是模型的入口口径**——它是 agent 在技能表里唯一看得到的触发说明。今天它把唯一入口写成了另一个字符串，而且**没有任何断言拦得住**（见打假 9）。`#231` 接手时要改的是**正文**，它照裁定写「备忘录 HELP」，于是同一份文件里会同时存在「触发词：备忘录HELP」与正文的「备忘录 HELP」——**自相矛盾会留在盘上**。

---

### 打假 9 —— 「测试是不是真测到了东西」

**判断：三条要害（注册／重名退让／list 返回 description）——前两条锁得硬，第三条只有弱断言；有 1 条近永真、1 条已被复现是假的断言。**

我逐条读了 `test/skills-provider.test.mjs`（137 行，8 个 `it()`），并真跑了「description 断言到底能拦什么」的对照实验：

```
phrases total                    = 28
phrases present in description   = 3 ["批量改分类","心愿排期","记一条"]
phrases missing from description = 25
assert( missing.length < phrases.length ) => true
任取一句不含任何 28 短语的简介 -> missing = 28 | 断言成立 = false
```

**逐条判：**

| 条 | 位置 | 判 |
|---|---|---|
| ① `inject` 含 `skills` 且旧声明不丢 | `:40-44` | **真测**。读的是 `dist/index.js` 的真导出（构建产物），而且 `inject` 在源码里加了 `readonly string[]` 注解，值来自 `dist`。 |
| ② `apply` 只注册一个提供方 | `:46-51` | **真测，且硬**。`assert.equal(calls.providers.length, 1)` 会抓到多注册；`create(control)` 真被调用、真拿到返回的 provider 对象。 |
| ③ `list` 摘要 | `:53-76` | **半真**。`length===1`／`provider===PROVIDER_NAME`／`source`／`rank 600`／`invocation`／`resourceBase.kind`／`skillDir()===resourceBase.path`／`existsSync(SKILL.md)`／`raw.includes('name: '+SKILL_NAME)` **都是真断言**；**但 `:61` 那条「描述非空」只查 `length>0`，`:73` 只查 `description.slice(0,12)` 落在文件里——真正「list 返回的 description 就是 frontmatter 那一段」这件事，从头到尾没有一条断言锁住**（没有 `parsed.description === c.description`）。 |
| ④ `get` 给全文 ＋ 过期候选失效 | `:78-95` | **真测**。`:93-94` 用改名候选验 `undefined`，正对宿主 `:259` 的契约。 |
| ⑤ 重名退让 | `:97-104` | **真测**。桩里让 `registerProvider` 抛真宿主文案，断言 `doesNotThrow` ＋ `warns.length>=1`；`assert.ok(calls.warns.length >= 1)` 是最弱的那种但确实能抓「静默吞掉」。 |
| ⑥ 「说明面与速查表口径」 | `:106-124` | ⚠️ **一条近永真 ＋ 一条已被复现是假**。`phrases.length===28`（`:111`）锁的是**路由表自己**，不是说明书——路由表变了它才红，说明书写错它不红。`:121-122` 的 `missingInDesc.length < phrases.length` 实测＝ `25 < 28`，意思是「有 3 条场景短语碰巧也是简介里的能力词」——**它测的是巧合，不是口径**；任何包含「记一条」或「批量改分类」四个字的长简介都能过。`:112` 的 `startsWith('「备忘录HELP」')` **恰好把无空格那个错形焊死**（见打假 8）。 |
| ⑦ 打包清单带 `SKILL.md` | `:126-129` | **真测**。读真 `package.json` 的 `files`。 |
| ⑧ `SKILL_NAME` 与 frontmatter 逐字一致 | `:131-136` | **真测**。走 `parseSkillText` 真解析真文件。但注意：`:135` 的 `assert.equal(parsed.name, 'skill-memo-ilife')` 与 `:59-60` 的同类断言**重复了三次**，且都是同一个字面量——这不算同义反复（值来自真文件真解析），但密度是虚的。 |

**已被复现是假的那一条**（我在打假 8 已证）：

```
:90  assert.ok(!def.content.includes('memo.help.lookup'), '正文暂不含 HELP 命令；#229 落地说明面后本行须改成正向断言');
```

这条**断言「正文不含 `memo.help.lookup`」为真**。但 `#229` 一落地，正文（说明面）就该写这条命令——那时这条断言会**把正确的交付打成红**。交付方自己在注释里坦白了（「#229 落地说明面后本行须改成正向断言」），`t232-install-report.md §10.4` 也复述了一遍，**所以是已知并已声明的缺口，不是隐瞒**；但它是**埋在盘上的一颗延时地雷**：谁在 #229／#231 之后跑这道门，会先撞到一条**反向断言**，而不是交付方的注释。

**结论**：「真测到了『注册』『重名退让』——是；真测到了『list 返回 description』——否，只有弱断言，且那条最强的弱断言当前正把错形焊死。」

---

### 打假 10 —— 越权检查

**判断：越权＝没有；报账＝有 1 处漏项。**

```powershell
git -C D:\ilife status --porcelain
```

本票声称的 6 个改动面，**逐条对得上账**：

```
 M packages/plugin-memo-ilife/src/dsh-ctx.ts     ← 声明：+46 行      实测 git diff --stat：46 insertions  ✓
 M packages/plugin-memo-ilife/src/index.ts       ← 声明：+22 −1      实测：+21 −1（numstat `21  1`）偏差 1 行
 M packages/skill-memo-ilife/SKILL.md            ← 声明：+4 行       实测：4 insertions  ✓
 M packages/skill-memo-ilife/package.json        ← 声明：+1 行       实测：1 insertion  ✓
?? packages/plugin-memo-ilife/src/skill-provider.ts        ← 新增  ✓
?? packages/plugin-memo-ilife/test/skills-provider.test.mjs ← 新增  ✓
```

`packages/plugin-memo-ilife/src/index.ts` 的实际 diff（`git diff --numstat`）：**`21	1`** ⇒ 增 21 行、删 1 行。报告写「＋22 −1 行」，并在括号里给了明细（「doc 注释 3 行、import 2 行、inject 1 行、apply 注册 7 行、export 6 行、拆雷注释 4 行」＝23）。逐行归类实际是：doc 注释含空行 7 行 ＋ import 1 行 ＋ inject 1 行 ＋ apply 内 12 行（注释 1 ＋ try/catch 块 7 ＋ 空行等）＋ export 7 行 ＝ 28。**总量偏 1 行、明细偏 5~6 行**；**这不是虚报功能，是行数明细没对准**，我按「同类问题、同一根因」并入评分里那条第 1 项的扣分，不单列。

**别的会话／别的包，确认没被本票碰：**

```
 M packages/plugin-chef/package.json          M packages/skill-schedule/src/render/html.ts
 M packages/plugin-chef/src/client.ts         M packages/skill-schedule/src/render/index.ts
 M packages/skill-chef/SKILL.md               M pnpm-lock.yaml
 M packages/skill-chef/package.json           M tooling/check-boundaries.mjs
 M packages/skill-schedule/package.json       ?? (skill-chef / skill-schedule / skill-calorie 大批未跟踪文件)
```

- `packages/skill-chef/**`、`packages/plugin-chef/**`：工作树里有改动，但报告 §0 第五步 `:47` **主动把它们划给「别的会话」**，我的检查支持这个划分（改动内容与该包 `#218` 大厨线的 skill-provider／frontmatter 同族，与备忘录无耦合）。
- `packages/skill-calorie/**`：**完全没出现在 `git status` 里** ⇒ 报告 §8.4「本票不碰」成立。
- `packages/plugin-memo-ilife/package.json`：`git diff --stat` 为空 ⇒ 未动（这个很重要：`files` 是技能包的事，插件包不该动，实测没动）。

**纪律三条我逐个核：**

- **未 commit**：`git log --oneline -3` 顶端仍是 `3da2559 feat(skill-calorie): …（#179）`，`git reflog -3` 顶端同一条 ⇒ 本票**没有产生任何提交**。
- **未 `git add`**：`git status --porcelain` 里本票的 6 个路径，两个新文件仍是 `??`（未跟踪），四个改动文件仍是 ` M`（工作区列）而**不是 `M `（索引列）** ⇒ 未暂存。✓
- **未改任何 issue、未 close**：`gh issue view 232` 状态 `OPEN`，正文里本票自己的实测摘要段与报告一致；`#229`／`#231`／`#233` 全部 `OPEN`、进度 `0%` ⇒ 没被顺手改过、没被关。✓（我**只读** `gh issue view`，未做任何写操作。）

**漏项一处**：`?? packages/skill-memo-ilife/AGENTS.md`（13 行，未跟踪）。它属于 **`skill-memo-ilife` 这个被审的包**，内容是「文件行数告警线＝350 行」——正好是本票 §0 第四步「超线报警」引用的那条口径的落点。报告 §0 第五步既没把它列进「实际交付」，§0 `:47` 也没把它列进「属别的会话的改动」，**两边都没提**。它不构成越权（没碰别的包、没碰别人的文件），但**报账不全**——而本票报告的最大毛病恰恰就是「账目精度」。

---

## 3. 不成立或无法复现的断言清单

| # | 声称 X | 实际 Y | 证据 |
|---|---|---|---|
| 1 | `src/skill-provider.ts` **129 行**（报告 §0:40／§0:49／§1.1:55，并已写回线上 `#232`） | **125 行**（LF 计数 125，无 CR，末字节 `\n`） | `node` 逐字节：`bytes=5123 LF=125 CR=0`；报告自己的行号表只映射到 `121–125` |
| 2 | `test/skills-provider.test.mjs` **121 行**（同上三处，并已写回线上 `#232`） | **137 行**（LF 计数 137，8 个 `it()`） | `node` 逐字节：`bytes=8591 LF=137 CR=0`；`it(` 计数 = 8，`describe(` = 1 |
| 3 | 三条 Junction 的**创建时间同为** `2026-09-11 17:59:07`（报告 §3:311、线上 `#232`、`t232-body.md`） | 三条**各不相同**：包内 = `2026-09-08 10:22:59`、profile = `2026-09-11 08:15:39`、fallback = `2026-09-11 17:59:07`（三条都早于开工日 09-12，实质判断仍成立） | `Get-Item -Force` 的 `CreationTime`／`LastWriteTime` |
| 4 | `ERR 3: 未知联动 key` 由 **upstream**（十键分派）拦下（报告 §6.2、`test/skills-provider.test.mjs:88` 注释） | 由 **`cmd_read.ts:123` 的 `memoShapeFor()`** 抛 `MemoRenderError`（`src/render/envelope.ts:20`）；十键 `dispatch()` 的 `default:` 文案是「未知 memo key：」，根本没执行到 | `memoShapeFor('memo.help.lookup')` 真跑抛 `MemoRenderError \| 未知联动 key：memo.help.lookup`；`MEMO_KEY_SHAPES` 实测只有 10 条键 |
| 5 | 技能表 description 的触发词口径＝用户裁定的唯一入口 | 写的是 **`备忘录HELP`（无空格）**；裁定入口 **`备忘录 HELP`（有空格）** 在 frontmatter 与 SKILL.md 全文中**均不出现** | `description.includes("备忘录 HELP") = false`／`includes("备忘录HELP") = true`；`SKILL.md` 全文同样 false／true；裁定出处 `map-220-body.md:41`、`t226-amendment.md:5-7`、`t224-decision-draft.md:83`、线上 `#231` |
| 6 | 宿主 `validateCandidate` **8 条红线全 PASS**（报告 §2.4 `[5]`，措辞为「自查」） | 「全 PASS」成立且**更强**（我抽宿主真源码跑，10 条判定线全过，`validateDefinition` 也过）；不成立的是**取证方式**——报告那一节是照源码重写的自查，不是跑宿主函数，却写成「宿主红线自查（validateCandidate…）」 | 从 `dsh-skill/lib/index.js` 原样抽 `validateCandidate`／`validateDefinition`／`toSummary` 跑真候选：10 PASS ＋ `validateCandidate: PASS (real host source, no throw)` |
| 7 | `test/skills-provider.test.mjs` 的 description 断言覆盖「list 返回 description」这件事（报告 §1.4 ④「list 唯一摘要」） | 只有弱断言：`:61` 查 `length>0`、`:73` 查 `slice(0,12)` 命中文件、`:121-122` 的 `missing.length < phrases.length` 实测为 `25 < 28`（靠 3 条场景短语碰巧也是能力词）。**没有一条断言 `parsed.description === c.description`** | `phrases present in description = 3 ["批量改分类","心愿排期","记一条"]`；`任取一句不含 28 短语的简介 -> missing = 28 | 断言成立 = false` |
| 8 | 报告「其余改动全部属别的会话」是完整清单 | **漏一项**：`?? packages/skill-memo-ilife/AGENTS.md`（13 行）既不在本票交付清单，也不在「别的会话」清单 | `git status --porcelain`；文件内容为「文件行数告警线＝350 行」 |
| 9 | 「改前基线」`tests 21 / pass 15 / fail 6`（报告 §2.2 前半） | **无法独立复现**：`HEAD` 里没有 `skill-provider.ts`（未跟踪新增），回到改前必须改工作树 ⇒ 本复审（只读）不可为。「改后」`21/15/6` 与 6 红分布**已复现一致**，6 红成因（schedule／home 的 `dist/client.js` 是裸 ESM）也已核实属别人家 | 本报告打假 2 的完整输出 |
| 10 | 报告 §0 `:42` 写 `src/index.ts`「＋22 −1 行」，逐行明细「doc 注释 3 行、import 2 行、inject 1 行、apply 注册 7 行、export 6 行、拆雷注释 4 行」＝23 | 实际 `git diff --numstat` = **`21	1`**（增 21 删 1）；逐行归类的明细实为 28 行（doc 注释含空行 7、import 1、inject 1、apply 内 12、export 7） | `git diff --numstat -- packages/plugin-memo-ilife/src/index.ts`；`git diff -U0` 数 `+`／`-` 行 |

**无法复现／查不到的（如实记，附试过什么）：**

- **「此刻屏幕上已出现 `skill-memo-ilife`」**：查不到。试过——`Invoke-WebRequest http://127.0.0.1:43120/` 回 401（未授权）；按硬纪律**不重启、不杀** PID 31252，故无法把新增注册代码推进正在跑的那棵插件树。交付方 §6.1 自认同一限制，与我一致。
- **`~/.agents/skills` 三个根的实际技能枚举**：只做到「链接／拷贝」这一层（`skill-bill` → `D:\ilife\packages\skill-bill`、`skill-chef` → `D:\ilife\packages\skill-chef`、`skill-calorie` 是真目录＝拷贝，报告 §4 全部复现一致）。**`skill-memo-ilife` 没装进这个根、`~/.dsh/skills` 不存在、`D:\ilife\.agents\skills` 存在**——与报告一致；发现根四条我也对着 `dsh-skill-filesystem/lib/index.js:150-188` 核过（`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`<dsh-home>/skills`、`<agentsHome>/skills` ＋ `bundledSkillDir`），报告的根清单**准确**。
- **`pnpm test` 全量**：未跑（会改写别的技能的 `SKILL.md`，硬纪律禁止；且报告 §8.6 已声明同一理由）。替代证据：我跑了 `node tooling/check-boundaries.mjs` → `boundaries: PASS`／`exit=0`（11 条 OK，含 `OK: skill-memo-ilife 依赖闭包不含 base-*`），与报告一致。

---

## 4. 对 #232 关票口径的意见

**交付方建议**：前半条（技能表可见 `skill-memo-ilife`）达成即关票，后半条（`memo-cmd-read` 真跑拿到绝对路径）并入 `#233`。

**我的意见：方向同意，但「即关」不同意——必须补三件事，否则不能关。**

同意的部分：后半条**确实不属于本票**，我的独立判断（打假 6）比交付方给的还硬——`memo.help.lookup` 落在 `MEMO_KEY_SHAPES`（10 条，实测）与 `cmd_read.ts:123` 的分派前置位置，两处都写在 `#229` 正文里，而且 `#229` 的完成判据与本票判据后半条**是同一句话**，`#229` 今天 `OPEN`／`0%`。往本票里拽＝同时越 `#229`／`#230` 的界，得不偿失。**✅ 后半条并入 `#233` 我同意。**

不同意的部分，**关票前必须补**：

1. **改掉 description 里的入口写法（必须）。** 现在是「触发词：备忘录HELP（不分大小写）」，用户裁定的是 `备忘录 HELP`（带空格）。这是**模型的入口口径**，也是 `#231` 要动的同一份文件——不改就会在盘上留下「frontmatter 说 HELP 无空格、正文说 HELP 有空格」的自相矛盾。改法：frontmatter description 里写 `备忘录 HELP`；`test/skills-provider.test.mjs:112` 的 `startsWith('「备忘录HELP」')` 同步改成带空格形，**并补一条断言直接锁 `parsed.description === c.description`**（今天没有这条，所以这类错才跑得过去）。
2. **订正写回线上 `#232` 正文的三个错数（必须）。** 线上正文里「129 行」（出现 2 处：摘要行与 `t232-body.md:32`）、「三条创建时间同为 `2026-09-11 17:59:07`」。`#232` 是这张图的**证据票**，留着错数会污染 `#233` 的终审。改法：`gh issue edit 232 --body-file <订正后的 t232-body.md>`。
3. **把那颗延时地雷标成显式阻塞（必须）。** `test/skills-provider.test.mjs:90` 断言「正文**不含** `memo.help.lookup`」。`#229`／`#231` 落地后这条会红，而红的原因是**断言本身过期**，不是交付坏了。要么现在就在 `#229`／`#231` 的正文里加一行「落地时必须把 memo 侧这条断言翻成正向」，要么把这条断言从「反向」改成「在 `#229` 落地前允许缺席」的形态。**只写在注释里不够**——注释在读报错的人眼里等于不存在。

**另外两件可以只记账、不必拦关票的**（我列出来是怕 `#233` 拿去当结论）：

- `test/skills-provider.test.mjs:121-122` 那条近永真断言（实测 `25 < 28`）。它今天不会误导人，但下次有人「加固说明面」时会以为有网。
- `packages/skill-memo-ilife/AGENTS.md` 未报账（内容为 350 行告警线，与本票 §0 第四步引用的口径同源）。补一句归属即可。

**关票口径我的完整表述**：**「前半条达成（我已独立复现到宿主真校验 ＋ 真 profile 解析链 ＋ 真 `apply`）＋ 上述 1／2／3 三件补齐」→ 可关；后半条并入 `#233`，并在 `#233` 的验收项里显式写上「`memo-cmd-read memo.help.lookup` 真跑拿到绝对路径 ＋ 跑完不建库（`#229` 判据后半句）」。**

---

## 5. 给编排会话的整改清单

### 必须改（不改则本票不可关）

1. **入口口径纠形**：`packages/skill-memo-ilife/SKILL.md` frontmatter description 里的「触发词：备忘录HELP（不分大小写）」→ **「触发词：备忘录 HELP（不分大小写）」**（带空格，与 `map-220-body.md:41`／`t226-amendment.md:5-7`／`t224-decision-draft.md:83`／线上 `#231` 一致）。改这一行时**正文零改**的约束仍适用（前缀重写、逐字节自检照旧）。
2. **测试同步纠形 ＋ 补真断言**：
   - `packages/plugin-memo-ilife/test/skills-provider.test.mjs:112` 的 `startsWith('「备忘录HELP」')` → 带空格形；
   - **新增**一条 `assert.equal(c.description, parseSkillText(readFileSync(...)).description)`（或等价），把「list 返回的描述 ＝ frontmatter 实测描述」焊死——今天这条完全缺失，正是错形跑过去的原因。
3. **订正线上 `#232` 正文**：删掉/改掉「129 行」「121 行」「三条创建时间同为 `2026-09-11 17:59:07`」。建议顺带把「宿主 `validateCandidate` 8 条红线自查」改成准确措辞（「照宿主 `:452-464` 逐条自查」），别再让人误以为跑过宿主函数。
4. **给 `#229`／`#231` 加一条显式交接项**：`test/skills-provider.test.mjs:90` 的反向断言（正文不含 `memo.help.lookup`）必须在说明面落地那一票里翻成正向；写进那两张票的正文，不要只留注释。

### 建议改

5. **报告行数纪律**：`t232-install-report.md` §0／§1.1／§1.4 的行数，逐一按「LF 计数」复算一遍（`SKILL.md` 63／`package.json` 34／`dsh-ctx.ts` 87／`index.ts` 107 **实测正确**；`skill-provider.ts` 应 125、`test/skills-provider.test.mjs` 应 137）。`index.ts` 的「＋22 −1」也改准（实际 `21	1`）。**这份报告的强项就是逐字节，别让行数这一格拖后腿。**
6. **补一处报账**：把 `packages/skill-memo-ilife/AGENTS.md`（350 行告警线，13 行，未跟踪）写进交付清单或「属别的会话」清单。它正好是本票 §0 第四步引用的口径落点，报它反而加分。
7. **`#229` 的「跑完不建库」要留个记号**：今天 `memo.help.lookup` 在 `cmd_read.ts:123` 就抛，**开库（`:129`）根本没走到** ⇒ 那条判据今天**是空过**的。谁拿「今天已经过」当结论都会错。
8. **§9 待裁项第 2 条（装进 `~/.agents/skills`）我的意见**：**先不装**。该根是**用户全局**根（不是 web profile 私有），会影响这台机器上所有项目；而插件提供方这一路已经把 `skill-memo-ilife` 送进了技能表（我已复现到宿主红线全过）。两路同名并存虽然宿主有明确的裁决规则（`dsh-skill/lib/index.js:114-115`：「the nearest layer's entry wins a duplicate name outright, and the rank order decides duplicates only within one layer」——报告 §9.2 那句「按层最近者优先，同层按 rank 定序」**我核过，说法准确**），但多一路就多一份陈旧风险（该根下 `skill-calorie` 就是拷贝且已陈旧，报告 §4 已实测）。**留到 `#233` 真机端到端时如果确实发现技能表看不到再装**，那时有真机证据支撑，回滚也只需删一个 Junction。
9. **`t232-body.md` 的编码**：我 `Get-Content t232-body.md` 读出的是乱码（该文件像是非 UTF-8 落盘），线上 `#232` 正文本身正常。这张图前头的 `t224-*.md` 也有同像。**不是本票的错**，但下次 `gh issue edit --body-file` 前值得确认一遍编码，别把乱码写回线上。

---

## 6. 本复审的能力边界（如实声明）

- **只读**成立：本轮**没有**修改 `D:\ilife` 下任何文件（`git status --porcelain` 在复审前后一致，仅新增本报告），**没有** commit，**没有** `git add`，**没有**改任何 issue（只用 `gh issue view` 读），**没有**重启／杀 43120 的 GUI（PID 31252，`StartTime 2026/9/12 0:39:56`，复审全程未变）。
- 两个复核脚本写在 `%TEMP%`（`t232-host-validate.cjs`、`t232-desc-assert.cjs`），仓内零新增。
- 我**没有**复现「改前基线」（不可为，见清单 #9），**没有**看到「此刻屏幕上的技能表」（硬纪律禁止重启，见清单末段）。这两格在我的评分里已按「无法独立复现」而非「假」计。
