# t832 · sync 域（1 场景）端到端证据

票：[#832](https://github.com/FeatherHunter/ilife/issues/832)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
本件是本票的交付证据：**做了什么、逐条读数、哪几条过不了以及为什么**。所有读数都可重跑，命令逐条给在下面。

---

## 一 本域是哪一格（先说清范围）

HELP 官方源 `packages/skill-memo-ilife/src/help/scenes/sync.ts` 的 `sync` 域，**1 个二级组／1 个场景**：

| 项 | 值 |
|---|---|
| 场景 id | `memo_sync_feishu` |
| 唤醒词 | `备忘录同步` |
| 标题 | 备忘录 ↔ 飞书双向对账 |
| `types` | 查看、回执 |
| 命令 | `memo.sync`（回执形状 `receipt`） |
| 册子格 | 第 29 行：主体 `备忘录同步`／族 报告／结果页／该确认「对账报告可点开」 |
| 清单格 | `t856-manifest.json` 第 29 行：`file = 备忘录同步.html`（全仓只此一处算） |
| 命令是否无需参数 | 是 —— HELP 原文「无需参数,直接发送」 |

开工时的票面缺口（原话）：**「`memo.sync` 有实现却零唤醒词；今天整域等于空的」**。本票就是补这个缺口并把它端到端跑通。

---

## 二 做了什么（三处，都在本票写集内）

| # | 件 | 改动 | 为什么 |
|---|---|---|---|
| 1 | `src/policy/wakewords.ts` | `WAKE_TABLE` 加一行 `{ phrase: '备忘录同步', key: 'memo.sync' }` ＋ 注释 | 唤醒词表是**唯一上游**：`routeWakeword()`、SKILL.md 速查块、HELP 都从它派生。缺这一行 ⇒ 路由抛 `POLICY_NO_MATCH`，SKILL.md 里也没有这一行，AI 无从按唤醒词找到命令 |
| 2 | `src/cli/cmd_read.ts` | `memo.sync` 的 `deliver.stem`：`'同步报告'` → `bookletFileStem('memo_sync_feishu')`（＝`备忘录同步`） | 产物名**只在一处算**（册子 `src/help/booklet.ts`）。旧名与清单第 29 行的 `file` 不一致 ⇒ 收口造册时该格会「清单点名却没有文件」 |
| 3 | `test/t832-sync-domain.test.mjs`（新增） | 4 例：① 路由＋SKILL.md 行；② 命令能跑（闸门开）；③ 产物落盘名／目录／体积；③ 闸门关（退出码与出页分开判） | 票面「唤醒词能路由／命令能跑／产物真落盘」三条各要一条真出口用例 |
| 旁 | `test/wizard-pages-665.test.mjs` | 一句注释里的旧名跟着改（该用例断言不绑名字） | 旧名残留 |
| 旁 | `SKILL.md` | 构建期注入块重新生成（多一行 `\| 备忘录同步 \| memo.sync \| receipt \|`） | 生成物，由 `scripts/build-help.mjs` 派生，不手改 |

**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库、任何公共层件、任何别的域的 src。没切分支、没 `reset`／`stash`。

---

## 三 逐条验收读数（2026-09-21 现场）

### 3.1 票面第一条「唤醒词能路由」——**过**

```
node --input-type=module -e "import('./packages/skill-memo-ilife/dist/policy/index.js').then(m=>console.log(m.routeWakeword('备忘录同步',{})))"
→ { key: 'memo.sync', params: {} }

routeWakeword('备忘同步')  → throw POLICY_NO_MATCH   # 反例面：不是「凡含备忘／同步就命中」的宽匹配
routeWakeword('同步一次')  → throw POLICY_NO_MATCH
```

SKILL.md 速查块新增行（构建期注入，跑 `node packages/skill-memo-ilife/scripts/build-help.mjs` 重生成）：

```
| 备忘录同步 | memo.sync | receipt | `memo-cmd-read memo.sync` |
```

### 3.2 票面第二条「命令能跑」——**分两条路判，都过**

命令有两条真出口路径，读数分开给：

| 路 | 布景 | 退出码 | 11 项统计 | 本地真写 |
|---|---|---|---|---|
| **闸门开**（远端可用） | 临时库 1 条无标识心愿（直插行）＋ 1 条带标识心愿（走 `memo.create`），挡板把远端那条改期 | **0** | `backfilled=1`、`dueOverridden=1`、`errors=[]` | 本地 `due` 由 `2026-10-20` → `2026-12-01`（对账时远端优先） |
| **闸门关**（本机没有 lark-cli） | 同一临时库 | **4** | `remote='unavailable'`、`errors` 1 条点名原因 | 本地不动 |

⇒ 「命令能跑」成立：走真唯一出口 `dist/cli/cmd_read.js`，两种远端状态下**都**给完整回执。

**一处必须写明的边界**：本机没有 lark-cli 时 **退出码是 4，不是 0**。这不是本票的缺陷，是 [#657](https://github.com/FeatherHunter/ilife/issues/657)／[#658](https://github.com/FeatherHunter/ilife/issues/658) 定死的「**ensure 型合成写**」契约（D-25，变异电池 `MUT-F` 守着的就是它）：**远端侧没成 ⇒ 退出码非 0；但页面照出**。
本域把这两件事**分开判**（票面亦如此要求）：出页与退出码互不绑定 —— 闸门关时 `delivery{mode:'file',path,bytes}` 照给、文件真在盘上、体积一致。
本票**不改**这条退出码语义：改它得先回 #657／#658 改契约，不在本票范围。

### 3.3 票面第三条「产物真落盘」——**过**

```
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/gen-sync-page.mjs
→ delivery.path = <临时库目录>\memo_html\备忘录同步_20260921_130029.html
  delivery.bytes = 32193（盘上 statSync 同值）
```

- 名字＝册子主体（`备忘录同步`）＋ 时间戳（`_YYYYMMDD_HHMMSS[_N].html`，唯一定义地是共用件 `base-paint/save-html`）；
- 目录＝`<库目录>/memo_html/` 扁平一层（册子 §三，既有产物原地并排，不另开层）；
- 与清单第 29 行 `file = 备忘录同步.html` 的**主体前缀**一致（造册时按主体取最新时间戳实例复制成 `file` 名）。

### 3.4 四个门——**过两个、卡两个、缺一个**

| 门 | 命令 | 读数 | 退出码 | 判 |
|---|---|---|---|---|
| **分隔符门** | `node packages/base-render/test/separator-probe.mjs <产物>` | 行级 1 行／节点级 1 处：`L342 点复制数据保存本次同步结果 · 点复制日志用于反馈问题`（`<hint>`） | **1** | **卡**（见 §四.1） |
| **响应式门** | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t832/pages` | `OVERFLOW-ZERO pages=1 cells=3 failed=0`（390／768／1440 三档全 0，`img=0 clip=0`） | **0** | **过** |
| **机审六列** | `node docs/skills/skill-bill/t407-v8-style-audit.mjs …` | 未跑：票面点名的那件是**账单域**的，`t824-视觉基准.md` §4 已裁「t407 本图不用；为备忘录新建六列机审」 | — | **缺**（见 §四.2） |
| **五维尺** | `node docs/skills/skill-calorie/t524-判分.mjs --dir <读数目录>` | `ENOENT … facts.json`：该判分件吃的是**同目录姊妹读件 facts.json**（静态 DOM 探针给人核的两张表），不是 HTML 目录 | **1** | **缺**（见 §四.2） |

#### 门的变异自证（票面要求「改坏必红／还原必绿」）

- **路由门**：把唤醒词行注掉 → `✖ ① 唤醒词能路由` 红（tests 4／pass 3／fail 1）；逐字节还原 → 全绿（tests 4／pass 4／fail 0）。电池件 `.scratch/t832/mutation.mjs` 可重跑。
- **分隔符门**（反方向，因为本页**本来就有债**）：原样必红（上面那 1 处）→ 把那一句里的 `·` 改成全角空格 → `命中合计 0 行／0 处`、**exit 0** → 说明这一处就是唯一命中源，门的读数不虚。

### 3.5 版式现场读数（D5 那一维的料，读数器不是门）

```
node docs/skills/skill-calorie/t525-触摸探针.mjs --dir .scratch/t832/pages --widths 390,768,1440
→ 390  可点 6  <44px 命中 5  最小字号 11px  {button.copy: 5}
  768  可点 6  <44px 命中 5  最小字号 11px  {button.copy: 5}
  1440 可点 6  <44px 命中 5  最小字号 11px  {button.copy: 5}
  RESULT: touch … small=15 … FAIL
```

三条要点：**①** 三档处数完全相同 ⇒ 这不是「只窄屏没适配」，是底座里根本没有 44px 这一档（与改前基线 82 处同一病因）；**②** 命中的全是 `button.copy`（复制区那排按钮），与分隔符门命中同一个块；**③** 最小字号 11px < 基准线 12px。

---

## 四 哪几条过不了，以及为什么（不夹带、不绕过）

### 1 分隔符门：卡在**共用件**，本票改不了

命中的那一句是 **`复制区按钮排加说明行`** —— 册子 §四点名的那 **1 处共用件**（「6 份模板各写一遍」的老账）。
它的实现是 `src/render/pageAssets.ts` 的 `MEMO_PAGE_CSS`，**34 格共用**：本票改它一个字符串，等于**同时改 6 张页面源件的共同底座**，且那正是 `t824-视觉基准.md` §3 点名要收进公共层的块。

⇒ 按并发纪律「**共用位只由它的独占票改；别人发现要改，开小票，不顺手改**」，本票**不动它**。
处置：该块已由 [#851「公共层小票：视觉基准三件」](https://github.com/FeatherHunter/ilife/issues/851) 承接（`t824` §3 与 `t849` 决策「备忘录特有形状也进公共层，走串行小票」）。
**本票的分隔符门读数即 #851 的开工基线：同批 6 张页各 1 处，合计 6 处，全部是同一句。**

### 2 机审六列／五维尺：**件还没生出来**，不是本域能补的

- 六列机审：`t824` §4 裁定「t407 本图不用；为备忘录新建」（版式位／白名单／口径按本域重写）；`t856` §五 也写明「t407 FILES 换成本票名单 —— 归 #851（公共层串行窗口）」。⇒ 归 [#851](https://github.com/FeatherHunter/ilife/issues/851)。
- 五维尺：`t524-判分.mjs` 只吃 `facts.json`（姊妹读件），而「按域给配置的判分引擎」属 #851 三件之一；规格固化票 [#849](https://github.com/FeatherHunter/ilife/issues/849) 亦在开。⇒ 归 #851／#849。

⇒ 本票不**伪造**这两门的读数（假绿比没读数更坏）。**已给到的最接近读数**就是 §3.5 的版式现场读数（触摸 5 处不足／最小字号 11px），供 #851 落地后逐页判分时对照。

### 3 页面还没搬公共层底座（D2／D3／D5 的结构性前提）

现场读数：产物里 `<!--SHARED-CSS-->` 已被替换、`#` 字面色值 55 处、断点含 `max-width:360px`（不在仓内既有集合 400／640／820／1001／1200 里）。
⇒ 与改前基线同一结论：备忘录页走的是自持 CSS，**不在公共层的响应式／触摸／形状体系内**。这一步是 #851 的定义域（「新页全部走公共层底座」），本票只把「产物名与路由」两处摆正，样式实现不越界。

---

## 五 自证（改坏必红／还原必绿）

| 跑法 | 读数 | 退出码 |
|---|---|---|
| 本票新用例（原样，包内 cwd） | `ℹ tests 4  ℹ pass 4  ℹ fail 0` | 0 |
| 变异：注掉 `备忘录同步` 那一行 | `✖ ① 唤醒词能路由…`；`ℹ tests 4  pass 3  fail 1` | 1 |
| 还原（逐字节回原文件 = true） | `ℹ tests 4  pass 4  fail 0` | 0 |
| 回归抽查（booklet848＋wizard665＋wish-sync661＋policy＋本票，包内 cwd） | `ℹ tests 33  pass 33  fail 0` | 0 |
| 回归抽查（再带 `cli-help-229`，仓根 cwd） | `ℹ tests 39  pass 38  fail 1`；红的是 `src/health.ts` 命中 `writeFileExclusiveWithRetry` —— 该件**本票一字未碰**，是既有债务（`t823-结构规格-草案.md` 已排其拆法） | 1（既有债） |

编译：`node tooling/run-locked.mjs --ticket 832 -- node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife` → exit 0（改动落地当刻）。

---

## 六 并发现场（一条要交回去的发现）

本票实施期间，**同一个包里有另一席在并行改**（新增 `src/init/` 域 ＋ 新页面件 `src/render/receipt.ts`／`templates/receipt.html`，即 init 域票的工作）。
两处写集**真的撞上了**：

| 撞的件 | 谁都要改 | 事实 |
|---|---|---|
| `src/policy/wakewords.ts` | 每张域票都要给自己那一行 | 全表唯一上游，八张域票共用一支笔 |
| `src/cli/cmd_read.ts` | 每张域票都要给自己的 deliver 分支 | 现役 847 行的单件分发器 |

⇒ `#855`（src 按 8 域重排的实施规格）里写的「**每域 `routes.ts`／`commands.ts` 各管各的，写集互斥**」正是治这个的；它**未落地**之前，八张域票并行就会撞这两件。
本票已按并发纪律处置：只 `git add` 自己声明的 5 个路径、提交前用 `git diff --cached --name-only` 复核、改坏必红／还原必绿各一次、编译与测试一律走 `run-locked.mjs`。
另有一处**该由 #855 修的接口擦伤**：本票那次编译绿的窗口内，并发席的 `cmd_read.ts` 曾引用未定义的 `buildReceiptOpts`（`TS2552`），使整树一度红 —— 这不是本票的改动，但说明**同一时刻两席改同一件**就是会互相打断编译。

### 附：一条跑法坑（本票实测，写下来免得后继再踩）

本包**测试必须把 cwd 钉在包目录跑**。出口依赖包内 `node_modules` 的 junction 依赖
（`base-paint` → `packages/base-render`），**从仓根 spawn 出口进程**时那些名字解析不到，
一律 `ERR_MODULE_NOT_FOUND`；症状看着像「代码坏了」，实际是跑法错了。
本票就用这个假象误判过一次（三条用例一起红，报的是 `dist/init/page.js` 的入口 import）——
**判「是不是代码坏了」之前，先确认 cwd**。包自己的 `test` 脚本（`node --test test/*.test.mjs`）本来就是包内跑。

---

## 七 交付对账（必报五步第五步）

| 开工前清单（§二） | 实际落到的路径 | 偏差 |
|---|---|---|
| `src/policy/wakewords.ts`（加一行唤醒词） | 同 | 零 |
| `src/cli/cmd_read.ts`（`deliver.stem` 取册子主体） | 同 | 零 |
| `test/t832-sync-domain.test.mjs`（新增用例） | 同 | 零 |
| `test/wizard-pages-665.test.mjs`（注释旧名） | 同 | 零 |
| `SKILL.md`（生成物重注入） | 同 | 零 |

提交：`d72231f3`，5 个文件／+231 −4；提交前暂存区复核只含本票 5 件。

**行数门（本包 350 LF，告警线）**：本票碰的件逐一读数 —— `src/policy/wakewords.ts` **73 LF**、`test/t832-sync-domain.test.mjs` **158 LF**（测试不管辖）；`src/cli/cmd_read.ts` **871 LF**。
`src/cli/cmd_read.ts` **已超线，需要根据规则进行重构。** 为什么超：它是十四键命令分派器 ＋ 各域参数解析 ＋ 交付装配三件事挤在一件里（#850 落两条新命令后又长了，本票动手前就已超）。**本票不拆**：拆法已由 `t823-结构规格-草案.md` 排定（拆成 `readArgs`／`delivery`／`registry`，域逻辑搬回各域），归 [#855](https://github.com/FeatherHunter/ilife/issues/855) 实施；本票只改其中**一行**（`deliver.stem`）。

---

## 八 可重跑清单（照本件复算）

⚠️ **cwd 必须是包目录** `packages/skill-memo-ilife`：出口依赖包内 `node_modules` 的 junction 依赖
（`base-paint` → `packages/base-render`），**从仓根 spawn 会 `ERR_MODULE_NOT_FOUND`** —— 那是跑法问题，不是被测行为（包自己的 `test` 脚本也是包内跑）。

```sh
cd packages/skill-memo-ilife

# 1) 编译（改代码后；仓规要求经排队锁，锁路径要按仓根算）
node ../../tooling/run-locked.mjs --ticket 832 -- node ../../node_modules/typescript/bin/tsc -b .

# 2) 本票用例（正例）：tests 4／pass 4／fail 0
node --test test/t832-sync-domain.test.mjs

# 3) 回归抽查：tests 33／pass 33／fail 0
node --test test/booklet-848.test.mjs test/wizard-pages-665.test.mjs test/wish-sync-661.test.mjs test/policy.test.mjs test/t832-sync-domain.test.mjs
```

```sh
# 4) 真产物（临时库＋隔离配置，绝不碰活库）——仓根跑
cd ../..
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/gen-sync-page.mjs

# 5) 变异电池（改坏必红／还原必绿）——仓根跑
node tooling/run-locked.mjs --ticket 832 -- node .scratch/t832/mutation.mjs

# 6) 四个门（产物目录 .scratch/t832/pages）
node packages/base-render/test/separator-probe.mjs .scratch/t832/pages/<产物>.html        # 分隔符门：卡（见 §四.1）
node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t832/pages --label t832   # 响应式门：过
node docs/skills/skill-calorie/t525-触摸探针.mjs --dir .scratch/t832/pages --widths 390,768,1440    # 版式读数
```

`SKILL.md` 重注入：`node packages/skill-memo-ilife/scripts/build-help.mjs`（生成物，勿手改）。
