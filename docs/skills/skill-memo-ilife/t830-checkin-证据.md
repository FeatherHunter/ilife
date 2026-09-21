# t830 · checkin 域 3 场景端到端 —— 实施证据

票：[#830](https://github.com/FeatherHunter/ilife/issues/830)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
口径出处：`t822-册子冻结.md`（册子格）／`t824-视觉基准.md`＋`t849-视觉基准.md`（五维尺与四门跑法）／`t856-manifest.json`（清单是唯一权威）／`t855-实施规格-与开工前读数.md`（域形状）／`t837-命令面口径.md`（字段名以 HELP 为准）。

**结论先行**：本域 3 个场景（册子 seq 23／24／25）**唤醒词能路由、命令能跑、产物真落盘**；五道验收命令全绿——真出口用例 **15/15**、分隔符门 3 件**双 0**、响应式门 `OVERFLOW-ZERO pages=3 cells=9 failed=0`、机审六列 **3/3 PASS**、五维尺**逐页 96**（每维 ≥ 满权 80%，一致性自证差 0）。

---

## 一 开工前读数与三条待拍板问题的现行答案

本票正文下的诊断评论（2026-09-21 04:57）报过影响清单与结构设计，并列了三点等负责人点头。**开工前先复核了那三点在世界前进后的现况**，新的实测读数落 `.scratch/t830/now/probe-result.json`（探针 `docs/skills/skill-memo-ilife/t830-probe-checkin.mjs`，本轮只修了它一处失效的 import 路径：`dist/policy/wakewords.js` → `dist/triggers/wakewords.js`，即该票第二条评论给的修法）：

| 诊断时的三点 | 现在的答案（有出处的现况） | 本票怎么做 |
|---|---|---|
| 一 通用回执族 ＋ 缺省落盘接线落哪张票（A／B／C） | **已被走通**：#831 那席按「负责人追认的第四条路」把族建在 `src/render/receipt.ts`＋`templates/receipt.html`，接线走出口的 `deliver` 钩子；#826／#828／#829 三席各追自己那几格。族的 19 格里剩的正是本域 3 格 | 本票**只消费**：族场景名单追加 3 格 ＋ 本域写页装配件（不新造共用位、不改别人的行） |
| 二 HELP 字段名对齐（`content`／`sub_category`／`reminder_id`） | **本票范围内做完**（加法兼容，等价关系一处定义在 `src/memo/crud.ts`）；权威出处＝`t837-命令面口径.md` §实施约束「字段名以 HELP 为准，不自造第二个说法」＋ 老 `memo_cli.py` 的 `p_add.add_argument("content")`／`p_update.add_argument("--content")` | 见 §二·2（照 HELP 填曾 exit 2，现全绿） |
| 三 判据件的过渡形态（判分复制件 ＋ 人核） | **过渡期已作废**（#851 分解出 #867／#868／#869／#870 并全部落地）：六列机审＝`docs/skills/skill-memo-ilife/t869-机审.mjs`，五维尺＝`packages/base-render/scripts/判分.mjs` ＋ 按域配置，读数链＝`docs/skills/skill-memo-ilife/t867-facts.mjs` | 直接用真件跑（§三），不复制任何件 |

**验收命令里两条过时路径照 `t824` §4 与 #851 的收口改**（票面原写的 `t407-v8-style-audit.mjs` 是账单域白名单件；`t<票号>-判分.mjs` 的引擎已直升公共层）：见 §八。

## 二 真跑读数

驱动器 `docs/skills/skill-memo-ilife/t830-产物驱动器.mjs`（可重跑；临时库 ＋ 隔离家目录，**绝不碰活库**），3 格逐条真跑唯一出口，参数一律用 **HELP 的字段名**：

| 册子 seq | 场景 | 命令 | exit | 产物主体（盘上实例） | bytes |
|---|---|---|---|---|---|
| 23 | 记打卡 | `memo.create {content,category,sub_category}` | 0 | `记打卡_20260921_214040.html` | 105 377 |
| 25 | 改打卡 | `memo.update {id,content,category}` | 0 | `改打卡_20260921_214040.html` | 105 377 |
| 24 | 删打卡 | `memo.remove {id,confirm}` | 0 | `删打卡_20260921_214040.html` | 105 353 |

**三条唤醒词真喂 `routeWakeword()`**（同一探针，`t830-probe-checkin.mjs`）：`记打卡`→`memo.create`＋`{category:打卡}`／`改打卡`→`memo.update`＋`{category:打卡,id}`／`删打卡`→`memo.remove`＋`{category:打卡,id}`，本域**路由面 0 改动**。

### 2.1 字段名那笔债的前后对照（本票修掉的正是这条）

同一探针改造前／后的读数（改造前那一版载本票诊断评论「现状读数」表；改造后那一版在 `.scratch/t830/now/probe-result.json`，探针可重跑）：

| 跑法 | 改造前 | 改造后 |
|---|---|---|
| `memo.create {content,category,sub_category}`（照 HELP 填） | **exit 2**「新建须给标题或正文其一」 | **exit 0**，落 `记打卡` |
| `memo.update {id,content}`（照 HELP 填） | **exit 2**「至少需要提供一个更新字段：content/category/sub/media/reminderId/due」（报错文案列着 `content`、实现却不认） | **exit 0**，落 `改打卡` |
| `memo.create {body,category,sub}`（命令面旧名） | exit 0，**但出的是「记情绪」页**（打卡行被情绪域那支认领） | exit 0，落 `记打卡`（本域认领） |

等价映射**只补缺**（实现名给了就以它为准）：`content`→`body`、`sub_category`→`sub`、`reminder_id`→`reminderId`，表住 `src/memo/crud.ts` 一处。`reminder_id` 在建时**大声拒绝**（exit 2）：老 `add` 无 `--reminder-id`，`notes.reminder_id` 由打卡追溯链回填（口径出处 `src/db/readonly.ts:200`）。

## 三 五道验收门（2026-09-21 收尾轮，全绿）

| 门 | 命令 | 读数 | 判 |
|---|---|---|---|
| 真出口用例 | `node --test packages/skill-memo-ilife/test/checkin-pages-830.test.mjs` | **tests 15 ／ pass 15 ／ fail 0**（3 场景落盘 ＋ 路由定义级 ＋ 旧字段名兼容 ＋ 5 条反例 ＋ 3 条产物形状） | ✅ |
| 分隔符门 | `node packages/base-render/test/separator-probe.mjs <产物>` | 3 件**节点级 0／行级 0**（`≥3 段并列` 也 0） | ✅ |
| 响应式门 | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir .scratch/t830/pages` | `OVERFLOW-ZERO pages=3 cells=9 failed=0`（390／768／1440 三档全 0） | ✅ |
| 机审六列 | `node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/t830/pages` | **`RESULT: 3/3 PASS ①0 ②0 ③0 ④0 ⑤0 ⑥0`**（exit 0；名单对册子 0 漂移） | ✅ |
| 五维尺 | `node packages/base-render/scripts/判分.mjs --dir docs/skills/skill-memo-ilife/t830-判分读数 --config …/判分配置.json` | **逐页 96／96／96，均分 96，最低 96**；每维 ≥ 满权 80%（D1 15／D2 20／D3 25／D4 15／D5 21）；**硬扣分 0**；`RECONCILE … 最大绝对差 = 0`（比对 21 项） | ✅ |

读数链四件 ＋ 人核档 ＋ 按域配置 ＋ 判分结果落 `docs/skills/skill-memo-ilife/t830-判分读数/`（可重跑）：

```
node docs/skills/skill-memo-ilife/t867-facts.mjs --dir .scratch/t830/pages \
  --human docs/skills/skill-memo-ilife/t830-判分读数/人核档.md \
  --json docs/skills/skill-memo-ilife/t830-判分读数/facts.json \
  --readings docs/skills/skill-memo-ilife/t830-判分读数
node packages/base-render/scripts/判分.mjs --dir docs/skills/skill-memo-ilife/t830-判分读数 \
  --config docs/skills/skill-memo-ilife/t830-判分读数/判分配置.json --json …/判分结果.json
```

**D5＝21 的构成（满 25）**：`toc` 腿 −4（回执页无页内目录；与 #827／#826／#828 同值，族形状归 #851／#870），仍 ≥ 下限 20。`d1`／`d2` 是**真读数**（不是乐观上界）：本票用 headless Chrome 出 390×844 与 1440×900 两档真截图（各 3 张，落 `.dsh-vision-router/artifacts/`），逐页看过再写 0 分，出处与理由逐页写在人核档 §二。

## 四 改了什么（必报五步第五步 · 交付对账）

| 路径 | 动作 | 与诊断评论第一步清单对账 |
|---|---|---|
| `src/checkin/receipt.ts` | **新增**（82 LF） | 原计划名 `pages.ts`；照兄弟域形状落为 `receipt.ts`（`src/wish/receipt.ts`／`src/memo/receipt.ts` 同名同位），**偏差：改名** |
| `src/checkin/index.ts` | **新增**（7 LF） | 原计划「能力门」；#855 已落域形状，本票按门规落 3 个跨域真要用到的名字 |
| `src/checkin/routes.ts` | 改（36 → 40 LF） | 原计划「本域 0 改动」；**偏差**：只改了三行示例的参数名为 HELP 字段名（键／槽位／预设逐字未动），并补了件头说明 |
| `src/memo/run.ts` | 改（312 → 340 LF） | 原计划「三支补 `deliver` 落点 ＋ 认 HELP 字段名」；实际按现形状落成**三支各加一处打卡分岔**（`deliver` 由各域页装配件给）＋ 两条写路径的字段名归一 |
| `src/memo/crud.ts` | 改（30 → 51 LF） | 原计划住 `src/policy/crud.ts`（**#855 已搬空该目录**）；实际落 `src/memo/crud.ts`（字段政策的同居件），加一张等价表 ＋ 一个 `withHelpFieldNames()` |
| `src/render/receipt.ts` | 改（126 → 129 LF） | 原计划未列（当时族还没建）：族场景名单**逐域追加**本域 3 格，不改别人的行 |
| `src/triggers/routes.generated.ts` | 改（生成物，1 行） | 由 `scripts/gen-cli.mjs` 重导（示例参数名变化），`gen-cli.mjs --check` 绿 |
| `test/checkin-pages-830.test.mjs` | **新增** | 原计划 `test/t830-checkin.test.mjs`；**偏差：改名**（照兄弟域 `<域>-<主题>-<票号>.test.mjs` 的现名法） |
| `docs/skills/skill-memo-ilife/t830-checkin-证据.md` ＋ `t830-判分读数/` | **新增** | 与清单一致（证据件 ＋ 读数目录） |
| `packages/skill-memo-ilife/AGENTS.md` | 改 | 行数台账 `--sync`（只补新行、只刷「当场实测」列，挂号值未动） |

**不动**：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库（仓外只读，全程零写）、`templates/**`（族模板归 #870）、别的域的目录与词面。

**行数账（第四步）**：本包 105 件、**超线（>350）0 件**；本票动过的件里最长的是 `src/memo/run.ts` 340 LF（接手时 312），仍在线内——加进去的是三处各 5 行的分岔与注记，页装配按域拆出，没有把内容堆回分派件。

## 五 测试读数（`run-locked.mjs --ticket 830` 串行）

- 编译 `node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife`：exit 0。
- 本票用例套：**15/15 绿**。
- 包内全量 `node --test packages/skill-memo-ilife/test/*.test.mjs`：**tests 227 ／ pass 226 ／ fail 1**。
  唯一红＝`cli-help-229.test.mjs`「独占写与递补那三个名字不再出现在本包源码里」，命中件 `src/cli/health/probe.ts`（第 51 行的探针写 `flag: 'wx'`）。
  **因果判定**：该件不在本票写集（`git diff --name-only` 无它），且它由 #855 的拆分批 `4b034d72` 引入（`git log -- packages/skill-memo-ilife/src/cli/health/probe.ts` 只有那一条）——是那条禁用词正则的**误伤**（探针用 `wx` 不等于自持命名／递补逻辑）。**非本票引入，留给它的作者**（§七 第 3 条）。
- 生成器门 `node packages/skill-memo-ilife/scripts/gen-cli.mjs --check`：三件生成物逐字一致（域 8 ／命令 13 ／路由 40）。
- 行数门 `node packages/skill-memo-ilife/scripts/check-warning-line.mjs`：**105/105 PASS**（超线 0；新挂 `src/checkin/index.ts` 7 与 `src/checkin/receipt.ts` 82 两行）。
- 单定义地／域间零直引（`test/cmd-registry-855.test.mjs` 13/13）：本域对备忘域**只写 `memo/index.js` 之外的零引用**——本域一件都不引别的域的实现件（页装配只调框架位 `render` 与两个类型）。跨域方向只有一条：`src/memo/run.ts` 经 `src/checkin/index.js`（门）取本域 3 格；**无环**（本域不回头引备忘域）。

## 六 并发记录（同工作区多席，照实记）

- 本票施工期间在途的别席：`#873`（32 页逐页推 ≥90）、`#831`／`#833`（mood／init 域收尾）。现场见到两次别席在跑的痕迹，都按规矩让开：
  1. `packages/skill-memo-ilife/AGENTS.md` 先被动过（`--sync` 刷了 `src/init/page.ts` 的实测列），本票在自己收尾时再 `--sync` 一次（只补行／只刷实测列，挂号值不动——设计如此）。
  2. `src/init/page.ts` 有未提交的在途改动（H3 条款：删行首状态词）——**本票一个字节没碰它，也没把它纳入提交**（提交用 `git add <自己声明的路径>` ＋ `git diff --cached --name-only` 复核）。
- 全部编译／测试／门／git 写操作经 `node tooling/run-locked.mjs --ticket 830`；期间共 4 次 `WAIT-OWNER-ALIVE`（都是等 #873／#831 的活锁释放，累计等约 160 秒），未抢锁。

## 七 遗留出口（本票不夹带，逐条有去处）

1. **判分复制件与过渡期口径作废**：`t824-视觉基准.md` §4 的「先用判分复制件 ＋ 人核顶上」已被 #867–#870 的落地作废；本图其余票若还引旧口径，由收口 [#834](https://github.com/FeatherHunter/ilife/issues/834) 统一改。
2. **整墙与链路总表的重铺归 [#834](https://github.com/FeatherHunter/ilife/issues/834)**：本域 3 格在 `t856-manifest.json` 里**早就在册**（seq 23／24／25，`file` 逐字＝`记打卡.html`／`删打卡.html`／`改打卡.html`），本票产物的主体与它逐字相同（§二），墙按 `file` 就能取到；本票不重铺整批。
3. **`cli-help-229.test.mjs` 的那条红**（§五）是 #855 拆分批 `4b034d72` 引入的禁用词正则误伤（`src/cli/health/probe.ts:51` 的探针写用了 `flag: 'wx'`）。**不是本票的面**：要么把该正则收窄到「命名通式／递补逻辑」（而不是任何 `wx` 字面量），要么让探针换一种独占写法——两条都动别人的件，归 [#855](https://github.com/FeatherHunter/ilife/issues/855) 的后续或另开小票。
4. **`记X` 四条词的 `content` 槽位要不要统一声明**：老 `add` 的 `content` 是**位置参数（必填）**，而 `记备忘`／`记心愿`／`记情绪`／`记打卡` 四条路由今天都没把 `content` 列进 `needs`（缺内容时报的是命令层的「新建须给标题或正文其一」，不是「缺槽位 content」）。改它要同时动四个域的词面 ＋ 手写路由表 `src/triggers/wakewords.ts`（`WAKE_TABLES` 的 `记` 循环）＋ `#855` 的差分回归门，**跨域**，本票不擅自改，登记在此，建议随 [#858](https://github.com/FeatherHunter/ilife/issues/858)（路由表清理）一并裁。
5. **`remind_at`／`repeat_type`／`repeat_rule` 三个 HELP 字段名**在 `memo.create` 上仍是驼峰（`remindAt`／`repeatType`／`repeatRule`，记提醒那条走的就是它们）。本票只归一了自家 3 场景真用到的三个名（`content`／`sub_category`／`reminder_id`），**没有顺手扩大**；要不要统一归一到 HELP 名，与第 4 条同路（跨域 ＋ 动手写路由表 ＋ 动 `#828` 已关票的契约），建议另开小票或并入 #858。

## 八 对抗式自查（逐条验收命令，真／假）

票面「验收命令」逐条对（含两处按现行裁定改过路径的）：

| 票面写的 | 实际跑的 | 读数 | 真／假 |
|---|---|---|---|
| 本域每条命令的真出口用例 | `node --test packages/skill-memo-ilife/test/checkin-pages-830.test.mjs` | 15/15 | **真** |
| 分隔符门：`packages/base-render/test/separator-probe.mjs <本域产物>`，节点级与行级都 0 | 同件，逐件跑 3 产物 | 3 件 0／0 | **真** |
| 响应式门：`packages/skill-calorie/scripts/measure-responsive.mjs` 三档零横向溢出 | 同件 `--dir` | `OVERFLOW-ZERO pages=3 cells=9 failed=0` | **真** |
| 机审六列：`docs/skills/skill-bill/t407-v8-style-audit.mjs <产物>` 退出码 0 | **改**为 `docs/skills/skill-memo-ilife/t869-机审.mjs --dir`（`t824` §4：账单域那件本图不用） | `3/3 PASS`，exit 0 | **真** |
| 五维尺：`t<t4票号>-判分.mjs --dir <读数目录>` 逐页 ≥90 且每维 ≥ 满权 80% | **改**为 `packages/base-render/scripts/判分.mjs --dir <读数目录> --config <按域配置>`（引擎已直升公共层，#868） | 逐页 96，每维 ≥80%，3/3 过线，自证差 0 | **真** |
| 产物落册子声明的目录、回执给绝对路径 | `delivery.path` 三件都在 `〈库目录〉/memo_html/`，主体＝册子 seq 23／24／25 | §二 | **真** |
| 本域几格在册子里、能被墙读到 | `t856-manifest.json` seq 23／24／25 的 `file` 与产物的主体逐字相同 | §七 第 2 条 | **真** |
| 源码只碰声明路径 | `git diff --cached --name-only` 逐行 | §四 | **真** |

**四道门里有没有假绿**：三条门（分隔符／响应式／机审）都读**盘上真产物**（`.scratch/t830/pages/`，由驱动器真跑落盘后逐字节拷贝）；判分引擎另有**一致性自证两腿**（脚本腿 vs 字面公式腿，逐页逐维含硬扣分，差 0 才 exit 0）。判分引擎的退出码只判「读数齐 ＋ 两腿一致」，**不判过线**——过线是逐页读数（3/3 页 96），本票没有拿退出码冒充过线。

## 九 复现清单

```
node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife          # 编译
node packages/skill-memo-ilife/scripts/gen-cli.mjs --check                  # 生成物一致
node docs/skills/skill-memo-ilife/t830-产物驱动器.mjs                          # 3 格真跑 → .scratch/t830/pages/
node --test packages/skill-memo-ilife/test/checkin-pages-830.test.mjs       # 真出口用例 15/15
node docs/skills/skill-memo-ilife/t869-机审.mjs --dir .scratch/t830/pages    # 六列 3/3 PASS
node docs/skills/skill-memo-ilife/t867-facts.mjs --dir .scratch/t830/pages --human <人核档> --json <facts> --readings <读数目录>
node packages/base-render/scripts/判分.mjs --dir <读数目录> --config <按域配置>   # 逐页 96
```
