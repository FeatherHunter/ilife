# #69 卡路里双路证据现状与非空数据取证

- 票：#69（map #64「卡路里·打通图（2/3）装上即用·双路实证」）
- 取证日期：2026-09-08；仓 HEAD：`6b0c1e7`（master，工作区含 #56 未提交改动）
- 环境事实：`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`（User 层持久，无默认值）；真库文件 `D:\2Study\StudyNotes\.db\calorie_data.db`
- 本报告全程只读真库：真库 SHA256 取证前后均为 `C1C94DBBA3EB575F18AE210E2CF894D0D63BD3E70542011BD0E890142F201D7C`，文件 LastWriteTime 仍是 `2026/8/29 11:49:11`

## 0 一句话答案

1. **今天（2026-09-08）不存在"非空真实数据 + 面板点亮"同时成立的窗口**：真库今日窗口 `2026-09-02~2026-09-08` 全空（food_log 最新 2026-08-19），面板只读"今天"（client 写死 `todayString()`），所以面板必然落 `ERR4 无今日数据` 同文。
2. 因此"面板数=直读"这条腿只能在**受控数据**上取证：首选**真库的临时副本**（`Copy-Item` 到 `%TEMP%`，用写键在副本里造一条今日哨兵），次选**全新隔离仿真库**；两者都不写真库。
3. 本票已用该办法在**非空数据**上跑通一次机器可复现对数（`readViaCli` 面板路 vs 直读 CLI：`data` 全等、`metrics` 16 键零差异），但**真机面板截图那一步仍缺**（需重装 dsh-calorie 0.1.7 / skill-calorie 0.1.2 并重启 DSH），故本票不关闭。
4. 双用制两条腿现状：**纯技能路**只证到"装得上 + 副本里能跑"，缺"第三方平台真调用"证据；**DSH 路**面板点亮与"数一致"只证到空库（ERR4 同文），"技能目录可查"（#56）与"非空真实数据对数"均缺。**双用制整体未过。**

## 1 口径先定：本票要证的到底是什么

- **双用制**（#64 纲领原文）：纯技能路（第三方平台隔离装＋真调用）与 DSH 路（单命令装双包、技能目录可查、面板点亮、面板数与直读一致）**双过才算成**；任一缺失按**阻断**记。
- 本票只管其中一条缝：DSH 路的「面板数与直读一致」。它要证的不是"卡路里算得对"，而是**面板看到的数 = 直接调 CLI 得到的数**（同一份数据、同一个键、同一组参数）。
- 因此取证必须满足两个前提，缺一不算：
  1. **同源**：面板进程与直读进程读**同一个 DB 文件**（#48 评论原文：真库同源，禁 tmp 一致性对比）。
  2. **非空**：读数必须落在有数据的窗口上（空库时两路同为 `ERR4` 同文，只能证明"错误同文"，不能证明"数值一致"）。

## 2 现状证据表（逐票抽取，只取票面可查原文）

| 证据 | 路线 | 命令 | 观测值 | 数据状态 | 结论 |
| --- | --- | --- | --- | --- | --- |
| #49 验收（@fabcecc） | DSH 路（仓内） | 6 桥 cliPath 断言 + 契约键直执行 + `readViaCli` | `help.center` 双路 total=10 一致；`--html` 落盘 5768B 含 `<section class=ilife-page`；`lookup` total=1 | 空/仿真（仓内 fixture，非真库） | 链路通，但**同文自比**（两路都是仓内同一份数据），非"面板对直读" |
| #49 验收（@fabcecc） | 纯技能路 | `npx skills@latest add … -l` → `-a opencode/codex --copy` → 副本 `lookup` | `Found 1 skill`；`list --json` scope=project；副本真调用 exit 0 / total=1 | 副本（隔离目录） | 装得上 + 副本里能跑；**无第三方平台会话真调用**证据 |
| #47 终审返工 | 纯技能路 | 同上（skills@1.5.24）+ 四条命令 | 发现 1 skill；落点含 SKILL.md 头 4 行；四条命令 exit 0（`help.lookup` shape=list、`diet.add` receipt、`view.home` stat、`--html` 2488B） | 临时目录（真库零触碰） | 兼容层成立；`dist/` 不进 git、线上 URL 装无 dist（未决） |
| #48 评论#4 | DSH 路（机制仿真） | 隔离 sim 目录 `npm install dsh-calorie@0.1.1 skill-calorie@0.1.1`，直驱 host handler | 四包落盘；哈希与 tip 重编一致；realpath 锚在 sim；最长链 `requestReadViaHost→host.call→handleHostCall→readViaCli→spawn` 全通；写读回 `SimApple_321` intakeCal 321 / entryCount 1 | **仿真**（隔离 npm 装，非面板） | 机制通；原文自陈"panel-lit 未测" |
| #48 关闭检查单（2026-09-08 真机） | DSH 路（真机面板） | 真库窗口 2026-09-02~2026-09-08；`direct total` vs 面板 | 重启无报错=是；设置页/边栏=有字；**direct=ERR4 无今日数据（exit 4）；panel=同文；一致=过** | **真库全空窗口** | 唯一真机对数证据，**空库同文**，不能证明数值一致 |
| #54 转正（2026-09-08） | DSH 路（真机面板） | 引用 #48 检查单 | "双面板秒级落字，与直读一致" | 真库全空窗口 | 同上，未新增非空证据 |
| #46 收口 | DSH 路（依赖/落盘） | `npm view dsh-calorie@0.1.1 dependencies`；`createRequire` 按包名解析 | `{dsh-life-pack:^0.1.0, skill-calorie:^0.1.0}`；cliPath 落 `node_modules/skill-calorie/dist/cli/cmd_read.js` | 注册表 + 安装态 | 断链可修已修；与"数一致"无关 |
| #56（OPEN，95%） | DSH 路（技能目录） | `ctx.skills.registerProvider` + 单份 SKILL.md 按包名解析；`npm pack --dry-run` | 回路 5/5；安装态 list/get 通（skill-calorie/600/bundled，正文 14KB） | 工作区 + fresh-tmp | **未发版、未真机确认** |
| 本次核验（2026-09-08） | — | `npm pack skill-calorie@latest` | 注册表 `skill-calorie@0.1.1` 顶层仅 `dist`、`package.json`，**无 SKILL.md** | 注册表 | "技能目录可查"这条腿**今天仍不成立** |
| 本次核验（2026-09-08） | — | `npm pack dsh-calorie@latest` | 注册表 `dsh-calorie@0.1.6` 的 `dist/client.js` 内 `inject=["slots"]`；master `6b0c1e7` 已改 `['slots','connection']`（未发版） | 注册表 vs master | 真机面板要等 0.1.7 发版才会落字 |
| 本次演示 A | DSH 路（面板取数实现） | `node demo-panel-vs-direct.mjs`（全新 tmp 库） | 写键 exit 0（`T69Sentinel_321` 321 卡）→ 面板路 `data` 与直读 `data` 全等；metrics 13 键零差异；entryCount=1 | **非空（仿真）** | 对数机制可复现；仿真数据不替真机验收 |
| 本次演示 B | DSH 路（面板取数实现） | 同上 + `--source <真库副本> --date 2026-09-08` | metrics 16 键零差异（含真库目标值 calorieGoal=1850 / waterGoal=4000） | **非空（真库副本 + 哨兵）** | 同源副本上双路一致；真库哈希未变 |
| 本次演示 C | DSH 路（面板取数实现） | 同上 + `--source <真库副本> --date 2026-08-19` | metrics 16 键零差异（intakeCal=1321、entryCount=2、streakDays=7、loggedDays=7） | **非空（真库副本的纯真实数据）** | 证明"非空真实数据下两路一致"；但**真机面板读不到 2026-08-19**（面板写死今天） |

### 2.1 两条腿的精确结论

**已证（可复现）**
- DSH 路·**面板点亮**：真机双面板有字（#48 检查单）。
- DSH 路·**面板数与直读一致**：**只在空库窗口**证过（direct=ERR4 / panel=同文 / 一致=过）——等价于"两路都正确报错"，不是"两路数相等"。
- 面板取数实现（`readViaCli`）与直读 CLI 在**非空数据**上的等价：本次演示 A/B/C（临时库、真库副本+哨兵、真库副本真实日）。
- 纯技能路·**装得上**：`npx skills add` 发现 + 双平台隔离安装 + 副本内真调用。

**未证（今天的缺口）**
- DSH 路·**技能目录可查**：#56 代码在工作区未提交；注册表 `skill-calorie@0.1.1` **包内无 SKILL.md**；真机 agent 会话未确认。
- DSH 路·**非空真实数据的真机对数**：面板只读今天，真库今天为空；演示是在副本/仿真库上做的，**面板 UI 本身（真机、真进程、真 env）尚未在非空数据下留证**。
- 纯技能路·**第三方平台真调用**：只有"副本里跑命令"，没有 OpenCode/Codex 会话里真跑一次 HELP→cmd_read→envelope→HTML 的会话记录。
- 附带：注册表最新 `dsh-calorie@0.1.6` 与 master `6b0c1e7` 差一个 `inject` 修复（0.1.7 待发），所以今天真机面板无论空库与否都还是"无限加载/落字不定"的旧物。

→ 按 #64「任一缺失按阻断记」：**双用制今天未过**，卡在"技能目录可查"与"非空数据真机对数"两处。

## 3 取证步骤（可复用，非空数据）

### 3.0 判定口径（先冻结，避免事后挪门）

- **同键**：`calorie.view.home`（`packages/plugin-calorie/src/contract.ts` 的 `DEFAULT_READ_KEY`，面板两个页面都只用它）。
- **同参数**：`{"date":"<YYYY-MM-DD>"}`——面板写死 `todayString()`（本机本地日），所以取证日 = 被比较日 = **今天**。不带 `windowDays`（默认 7）。
- **同 DB**：面板进程的 `SKILLS_DB_PATH` 与直读进程的 `SKILLS_DB_PATH` 必须指向同一个目录。
- **比什么**（逐字段，不是只比 total）：
  - 面板路拿到的是 `readViaCli` 返回的 `data`（host 侧 `ok(data)` 包一层 RPC 信封）；
  - 直读路拿到的是 CLI 的一行 envelope：`{version, skill, shape, key, data}`；
  - **判等对象 = `panel.data` vs `direct.data`**：先比顶层键集合（当前唯一键 `metrics`），再比 `metrics` 内**每个字段**（当前 13~16 个有限数值键，如 `intakeCal`/`entryCount`/`proteinG`/`deficitToday`/`streakDays`/`loggedDays`）。
  - `key`/`shape`/`skill`/`version` 也要核（`key=calorie.view.home`、`shape=stat`、`skill=calorie`）——防"读错键但数碰巧相同"。
  - **注**：面板 `extractTotal` 只认 `data.total`；`view.home` 无 `total` 键，于是面板把 `data` 整体 `JSON.stringify` 当一行字显示。所以**面板截图上的字就是 `{"metrics":{…}}` 全文**，不是单个数字；精确比对仍以直读/日志为准，截图只作"真机确实落字"的旁证。
- **过/挂**：
  - **过**：`panel.data` 与 `direct.data` 逐字段全等（数值 `Object.is`/JSON 全等），且 `entryCount > 0`（或至少 `loggedDays > 0`），且 `key/shape` 相符，且直读 `exit=0`。
  - **挂（记缺陷，不记阻断）**：两路都成功但字段有差异 → 说明面板路/桥/渲染有 bug，按缺陷开修复票。
  - **阻断（不记缺陷，记缺证据）**：任一路 `exit≠0` 或缺参数/缺 env/缺 DB → 本次**没有取得对数证据**，按 #64 记阻断，不得以"空库同文"顶替。
  - 面板 `total` 与直读 `metrics` 不可直接比大小（一个是 JSON 文本，一个是对象）——禁止用"数字看起来差不多"充当通过。

### 3.1 选数据（两条路线，都不碰真库）

**路线甲（首选）真库副本 + 今日哨兵**

```powershell
# A1 只读真值（禁编造）
$RealDir = $env:SKILLS_DB_PATH           # 期望 D:\2Study\StudyNotes\.db
$RealDb  = Join-Path $RealDir 'calorie_data.db'
Get-FileHash $RealDb -Algorithm SHA256   # 记 preHash

# A2 复制到临时目录（副本即取证库，真库此后只读）
$T = Join-Path $env:TEMP ('t69-evidence-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $T | Out-Null
Copy-Item $RealDb (Join-Path $T 'calorie_data.db') -Force
```

```powershell
# A3 在【副本】里造今日非空窗口（路径在 %TEMP% 下，写守卫天然放行；真库零写）
$env:SKILLS_DB_PATH = $T
$today = (Get-Date).ToString('yyyy-MM-dd')
node D:\ilife\packages\skill-calorie\dist\cli\cmd_read.js calorie.diet.add --params ('{"foodName":"T69Sentinel_321","calories":321,"protein":9,"carbs":40,"fat":11,"grams":100,"date":"' + $today + '"}')
echo $LASTEXITCODE     # 期望 0，shape=receipt，recordId 为整数
```

**路线乙（备选）全新隔离仿真库**：不复制真库，直接 `New-Item` 一个空目录当 `SKILLS_DB_PATH`，同样用 A3 的写键造哨兵。真库零风险，但"真实 schema/目标值"的说服力弱于路线甲（本次演示 A 即此路线）。

> **为什么必须造数**：真库 `food_log` 最新 2026-08-19，今日窗口空；面板写死读今天。不造今日数据，两路只能同报 `ERR4`。
> **为什么不改系统时钟**：会波及全机其他程序与日志，不可逆风险高于收益，禁用。
> **真库出现真实今日数据的替代路径（更优）**：用户正常"记一餐"后再跑本流程，即可全程零合成数据（HITL 项 0）。

### 3.2 纯技能路（第三方平台隔离装 + 真调用）— 与双路对数无关但需同时留证

```sh
# B1 发现（只列不装）
npx skills@latest add FeatherHunter/ilife -l

# B2 隔离安装（项目级、--copy 规避 Windows symlink）
npx skills@latest add FeatherHunter/ilife -s skill-calorie -a opencode --copy -y
npx skills@latest list -a opencode --json

# B3 真调用（会话内或按落点目录直执行；SKILLS_DB_PATH 指向 3.1 的副本 $T）
node <落点>/.agents/skills/skill-calorie/dist/cli/cmd_read.js calorie.help.lookup --params '{"q":"看今日主页"}'
```

- 记录：`-l` 输出行数、`list --json` 原文、落点目录树（含 SKILL.md 头 4 行）、真调用 exit/shape。
- 注：线上 URL 装**不含 dist**（`packages/*/dist` 被 gitignore），运行时走 npm 包；本地路径装会把工作区 `dist/node_modules` 一起拷走（#47 未决）。

### 3.3 DSH 路（面板对直读，非空数据）

**HITL-1 装齐版本**（今天必须先做，否则面板是旧物）

```powershell
dsh plugin --profile web add dsh-calorie@0.1.7 dsh-life-pack@0.2.0 --config.minimumReleaseAge=0 --registry=https://registry.npmjs.org
# 只装双包；装完先验落盘版本再重启
node -e "console.log(require('<profile>/node_modules/dsh-calorie/package.json').version, require('<profile>/node_modules/skill-calorie/package.json').version)"
```

**HITL-2 把面板指到副本**

```powershell
# 只读当前值备查，然后改 User 层（持久，Desktop 下次启动继承）
[Environment]::GetEnvironmentVariable('SKILLS_DB_PATH','User')      # 记 oldValue（正常为 D:\2Study\StudyNotes\.db）
[Environment]::SetEnvironmentVariable('SKILLS_DB_PATH', $T, 'User') # $T = 3.1 的副本目录
```

**HITL-3 彻底重启 DSH**：托盘 Quit（不是关窗口）→ 重进 → 等 30 秒。
（依据：`SKILLS_DB_PATH` 在 Desktop 进程启动时读入；#48 handoff 第 6 条：正常重启即可继承 User 层 env。）

**HITL-4 取两侧读数（同一分钟、同一日）**

```powershell
# 直读（与面板同 DB、同键、同参数）
$env:SKILLS_DB_PATH = $T
$today = (Get-Date).ToString('yyyy-MM-dd')
node D:\ilife\packages\skill-calorie\dist\cli\cmd_read.js calorie.view.home --params ('{"date":"' + $today + '"}')
echo $LASTEXITCODE      # 期望 0；记整行 envelope JSON
```

```text
# 面板：设置 → 爱生活 → 卡路里页签（技能设置页）；边栏 → 卡路里页签（技能功能页）
# 两处都应显示：`卡路里 · <today>` + `total {"metrics":{…}}` + 版本行 `dsh-calorie <ver> · skill-calorie <ver>`
# 截图两张（技能设置页 / 技能功能页），文件名带日期与版本号
```

**比对**：把截图里的 `{"metrics":{…}}` 文本与直读 stdout 的 `data` 做逐字段核对（脚本化见 3.4）。

**HITL-5 复原（无论过挂都要做）**

```powershell
[Environment]::SetEnvironmentVariable('SKILLS_DB_PATH', $oldValue, 'User')
# 托盘 Quit → 重进（让面板回到真库）
Get-FileHash $RealDb -Algorithm SHA256      # 必须等于 preHash，否则立即停手排查
```

### 3.4 机器可复现的对数（今天即可跑，不需要面板）

```powershell
# 复用本票留下的脚本：面板路 = dsh-calorie 的 readViaCli（面板取数的实际实现，spawn CLI）
node D:\ilife\.scratch\t69\demo-panel-vs-direct.mjs --source $RealDb --date <today>
# 或纯仿真：node D:\ilife\.scratch\t69\demo-panel-vs-direct.mjs
```

输出四段：造数回执、面板路 `data`、直读 envelope、逐字段判定（差异键列表 + `entryCount`）。exit 0 = 过，exit 1 = 挂。
本次三份归档日志：`.scratch/research/t69-evidence/demo-log-fresh-tempdb.txt`（全新临时库，13 键过）、`demo-log-realcopy-sentinel-20260908.txt`（真库副本+哨兵，16 键过）、`demo-log-realcopy-realday-20260819.txt`（真库副本真实日，16 键过）。
**边界（必须写进证据）**：它走的是 host 侧 `readViaCli` + 真 spawn，**不经过浏览器 RPC 传输与 React 渲染**，所以它替代不了"真机面板截图"，只能替代"人肉比 JSON"。

### 3.5 记录与归档

| 项 | 内容 | 落点 |
| --- | --- | --- |
| 对数记录 | 直读 envelope 原文 + 面板截图（或 harness 日志）+ 逐字段判定 | `.scratch/research/t69-evidence/evidence-<YYYYMMDD>-<版本>.md` |
| 脚本日志 | `demo-panel-vs-direct.mjs` 自落的 `demo-log.txt` | 临时库目录内；已归档三份为 `.scratch/research/t69-evidence/demo-log-*.txt` |
| 截图 | 技能设置页 / 技能功能页各一张（含版本行与 `卡路里 · <date>`） | `.scratch/research/t69-evidence/` 或 `assets/`（`assets/skill_install_calorie_success.png` 是既有先例，但 `assets/` 未进 git） |
| 零触碰自检 | pre/post 真库 SHA256 + 复原后的 User 层 env 值 | 同上 |
| 版本钉死 | `dsh --version`、`node --version`、`git rev-parse --short HEAD`、`dsh-calorie@x`、`skill-calorie@y` | 同上 |

## 4 阻断与风险登记

| # | 项 | 定性 | 处置 |
| --- | --- | --- | --- |
| 1 | 真库今日窗口空 → 面板必然 `ERR4` | 取证前提，非缺陷 | 走 3.1 副本造数；或等用户真实记录后取证 |
| 2 | 面板读不到历史日（写死今天） | 取证限制 | 不得用"改时钟"绕过；如需按日取证，另开面板功能票（属"面板功能全面化"，本图 out of scope） |
| 3 | `skill-calorie@0.1.1` 包内无 SKILL.md；#56 未提交未发版 | **阻断**（双用制缺腿） | 提交 #56 → 发 skill-calorie 0.1.2 / dsh-calorie 0.1.7 → 真机 agent 会话一句话确认 |
| 4 | `dsh-calorie@0.1.6` 仍 `inject=["slots"]`（缺 connection） | **阻断**（面板落字前提） | 随 0.1.7 发版；HITL-1 显式版本安装 |
| 5 | 安装命令未 @SHA 钉死 | 残余（#47 未决） | 记为已知残余，不阻塞本票 |
| 6 | 本地路径源会拷走 `dist/node_modules`，线上 URL 装无 `dist` | 残余（#47 未决） | 同上 |
| 7 | harness 不过浏览器传输/渲染 | 证据边界 | 真机面板截图仍为必做 HITL |

## 5 下一步（按序）

1. **HITL-0（更优）**：用户正常记一餐（今日有真实数据）→ 直接跑 3.3，全程零合成数据。
2. **HITL-1/2/3**：发版 dsh-calorie 0.1.7 + skill-calorie 0.1.2（2FA wizard）→ 显式版本重装双包 → 把 `SKILLS_DB_PATH` 指到真库副本（含今日哨兵）→ 托盘 Quit 重进。
3. **HITL-4/5**：面板截图 + 直读同键同参 → 逐字段对数 → 复原 env 与真库哈希复核。
4. 回贴 #69 证据表 + 截图路径；#56 真机一句话确认后，双用制才具备"双过"候选资格。

## 6 复现命令清单（本次实际执行过的）

```powershell
# 真库零触碰核验
Get-FileHash 'D:\2Study\StudyNotes\.db\calorie_data.db' -Algorithm SHA256
# 真库数据分布（在副本上只读查询）
node $env:TEMP\t69-dbprobe\probe.cjs (Join-Path $env:TEMP 't69-dbprobe\calorie_data.db')
# 双路对数（仿真库）
node D:\ilife\.scratch\t69\demo-panel-vs-direct.mjs
# 双路对数（真库副本 + 今日哨兵 / 真库副本真实日）
node D:\ilife\.scratch\t69\demo-panel-vs-direct.mjs --source 'D:\2Study\StudyNotes\.db\calorie_data.db' --date 2026-09-08
node D:\ilife\.scratch\t69\demo-panel-vs-direct.mjs --source 'D:\2Study\StudyNotes\.db\calorie_data.db' --date 2026-08-19
# 注册表侧事实
npm pack skill-calorie@latest --silent   # 解包：仅 dist + package.json，无 SKILL.md
npm pack dsh-calorie@latest --silent     # 解包：dist/client.js 内 inject=["slots"]
```
