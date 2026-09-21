# #831 mood 域 3 场景端到端 · 证据

**结论一句话**：`mood` 域 3 个场景**唤醒词能路由、命令能跑、产物真落盘、页面按族出**；「通用回执」这一族（34 格里 19 格）在 `src/render/receipt.ts` 建立了唯一住处。**五维尺读数待回填**（判分件归 #851，盘上尚不存在），故本票不报「验收全绿」。

---

## 一 交付物与落盘实例（回执绝对路径）

真跑命令与落点：库侧扁平目录 `〈库目录〉/memo_html/`，实例名＝`主体_YYYYMMDD_HHMMSS.html`（主体由册子 `bookletFileStem()` 算，时间戳由共用件 `base-paint/save-html` 加）。

| 场景 id | 唤醒词 | 命令 | 退出码 | 库侧实例（绝对路径） | 字节 | 留档副本 |
|---|---|---|---|---|---|---|
| `memo_add_mood` | 记情绪 | `memo.create` | 0 | `<临时库>\memo_html\记情绪_20260921_131257.html` | 17 761 | `.scratch/memo-831/artifacts/记情绪_20260921_131257.html` |
| `memo_update_mood` | 改情绪 | `memo.update` | 0 | `<临时库>\memo_html\改情绪_20260921_131257.html` | 17 770 | `.scratch/memo-831/artifacts/改情绪_20260921_131257.html` |
| `memo_delete_mood` | 删情绪 | `memo.remove` | 0 | `<临时库>\memo_html\删情绪_20260921_131258.html` | 17 770 | `.scratch/memo-831/artifacts/删情绪_20260921_131258.html` |

`<临时库>` ＝ `%TEMP%\memo-831v-<随机>`（每次真跑新建、家目录隔离，绝不碰活库）。留档副本在仓内相对路径下可复核，逐字节同源。

**命名对账**：三件实例主体分别 `记情绪`／`改情绪`／`删情绪`，与 `src/help/booklet.ts` 的 `file` 字段**逐字相同**（脚本自校验 ✓×3）。

---

## 二 真跑读数（探针可重跑）

生成器：`.scratch/memo-831/verify-mood.mjs`（`node .scratch/memo-831/verify-mood.mjs`）。
用例套：`test/receipt-831.test.mjs`（`node --test packages/skill-memo-ilife/test/receipt-831.test.mjs`）。

### 2.1 本票用例套：10 例全绿

```
✔ #831 · 通用回执族（定义级）
✔ #831 · mood 域 3 场景端到端（真出口）
ℹ tests 10   pass 10   fail 0
```

覆盖：族模板三标记与禁 `loading="lazy"`／零新断点／视口覆盖；三场景真出口各一条（含**落盘名**与**页内内容**断言）；册子三格产物齐全；**两条反例**（非情绪类笔记不出本族页；无此笔记即 exit 4 不落产物）；`--html` 逐字落点仍生效。

### 2.2 分隔符门（`packages/base-render/test/separator-probe.mjs`）

三件**各 1 处**，且是**同一句**：

```
L 96 # 9 R1  点复制数据保存这次的结果 · 点复制日志用于反馈问题（日志不含隐私内容）   <hint>
```

⇒ 这就是 `t824-视觉基准.md` §3 与 `research/real-products-probe.md` §2.1 点名的**复制区说明行**（既有 4 件产物同样是它、老 6 份模板各写一遍）。它已判给**公共层串行小票 #851** 收成共用件 —— 本票**不在本域私有模板里单独改这一句**（那会变成第二处定义，正是铁律二要治的）。**#851 落下即这一列清零。**

**页内其余分隔符读数全 0**：`；` 0 处、≥3 段并列 0 处（`t824` §3 的形状化对照表在本族已生效：分类走徽章、多字段走键值行、结论走 lead 行）。

### 2.3 跨宽门（`packages/skill-calorie/scripts/measure-responsive.mjs --dir <留档目录>`）

```
OVERFLOW-ZERO pages=3 cells=9 failed=0 scopeOutFailed=0 label=run
记情绪 390档:0 ✓  768档:0 ✓  1440档:0 ✓
```

三档零横向溢出。这是**回归门**（基线本就全绿），按 #824 §4 口径不算成绩。

### 2.4 包内回归

```
✔ memo 渲染层（含把模板数 6→7 的那条断言一并更新）
✔ memo 唯一出口 cmd_read        ← 本票改的正是它分派的三条写分支
✔ #850 命令面四问（唯一出口端到端）
✔ #848 册子冻结定义级自检
✔ #833 init 域：两格产物端到端
```

### 2.5 五维尺（**待回填**，本票不能报过线）

`t831-判分.mjs` 与公共层判分引擎**盘上不存在**（归 #851）。按 `t824` §1 的口径，逐页 ≥90 且每维 ≥ 满权 80% 这一档**只有引擎落盘后才跑得出**。⇒ 本票**如实标为待回填**，不以任何替代读数冒充。
过渡期按 `t824` §2 数值表在族模板上已就地满足的项：触摸区 44px（`button.copy{min-height:44px}`）／正文 ≥12px 且行高 1.65／`viewport-fit=cover` 视口覆盖／零新断点（断言守）／窄屏 820 档塌成单列键值行。

### 2.6 机审六列（**按本图口径不适用**）

`t407-v8-style-audit.mjs` 是**账单域白名单件**；`t824` §4 明确「账单域六列机审本图不用（版式位与白名单全是账单特例）」，备忘录要按本域重写。⇒ 票面这条验收命令与现行裁定冲突，已记入下方「票面与裁定冲突」。

---

## 三 改了什么（独占写集，逐行对账）

| 路径 | 动作 | 一句话 |
|---|---|---|
| `src/render/receipt.ts` | **新增**（91 LF） | 「通用回执」族的唯一定义地：8 字段槽位契约 ＋ `buildReceiptPage()` ＋ 本地侧／远端侧取值→人话两张表 |
| `templates/receipt.html` | **新增**（146 行） | 族的页壳：结果卡 ＋ 徽章 ＋ 事实条 ＋ 键值行 ＋ 明细 ＋ 复制区；断点只用 820（仓内既有） |
| `src/render/templates.ts` | 改 2 行 | 模板登记表 6→7（加 `receipt`） |
| `src/render/index.ts` | 改 2 行 | 转出族定义地 |
| `src/cli/cmd_read.ts` | 改（**4 处**） | 加 `buildReceipt()`／`noteIdOfMessage()`／`receiptOptsOf()` 三个内部件；三条写分支返回 `deliver`（`memo.create`／`memo.update` 情绪日记那一支／`memo.remove` 单条那一支） |
| `test/receipt-831.test.mjs` | **新增**（10 例） | 本域真出口用例 ＋ 族定义级用例 ＋ 两条反例 |
| `test/render.test.mjs` | 改 2 行 | 模板数断言 6→7（本票正当改变，非放宽） |
| `docs/skills/skill-memo-ilife/t831-mood-证据.md` | **新增** | 本件 |

**没碰**：`src/config.ts`、`packages/plugin-memo-ilife/**`、老技能仓库（仓外只读）、`src/policy/wakewords.ts`（别人在途）、其余 5 族模板与渲染件、`#855` 的域重排。

**与第一步清单的偏差**：一处 —— 清单原写「只动三条写分支的返回行」，实际多出 `memo.update` 的「情绪日记才出页」判据与 `memo.remove` 的「**删前先取那一行**」（删完 `getNote` 取不到）。两者都在同一文件、同一批 hunk 内，未越出声明路径。

**行数门**：新增件 `receipt.ts` 91 LF、`receipt.html` 属页面模板（不管辖）、测试属测试件（不管辖）。**本包 350 线未触发**，无超线报警。

---

## 四 交接给下游的两件事

1. **本族其余 16 格（通用回执）怎么复用**：调 `buildReceiptPage({scene, title, message, badges, summary, sections, receipt, copyLog, retryPrompt})`，主体由 `bookletFileStem(sceneId)` 自动算 —— **不要复制 `receipt.html`**，也不要自己拼文件名。`record 域的 `memo_add_checkin`／`memo_update_checkin`／`memo_delete_checkin`（打卡）与 `memo.wish` 三条（心愿）是下一批现成落点（结构同构：同一个 `WishReceipt` 三格）。
2. **`memo.remove` 的批量支不出本族页**（它先出清单、exit 2，属 #850 的分层闸），本票未动。

---

## 五 票面与现行裁定的三处冲突（照 `t824`／`t825` 裁定如实记）

1. **交付物路径**：票面写 `src/mood/` —— 该目录要等 [#855](https://github.com/FeatherHunter/ilife/issues/855) 把 `src` 按 8 域重排才存在（今天 `src/` ＝ `cli`／`fetch`／`help`／`policy`／`render`／`wish`）。本票照**今天的形状**落位（族进 `render` 框架位、命令接线进 `cli`），**#855 落定后由该票统一搬迁**，本票不留第二份定义。
2. **验收命令里的五维尺判分件**：盘上不存在（归 #851）。⇒ 见 §2.5，如实标待回填。
3. **验收命令里的机审六列**：`t407` 是账单域件，`t824` §4 已裁本图不用。⇒ 见 §2.6。

---

## 六 环境风险（诚实记录，非本票缺陷）

跑门期间实测到共享 `dist` 被并行会话反复破坏，**任何一席都可能读到假红**：

| 时刻 | 现象 | 根因 |
|---|---|---|
| 13:02 | CLI 加载即 `SyntaxError: does not provide an export named 'renderStatusBadge'` | `src/init/page.ts`（#833 在途）导入 `base-paint/blocks` 里不存在的导出 |
| 13:07 | 编译产物整片乱码（UTF-8 被按 GBK 回写）＋ 多出一个 `)` | `dist/cli/cmd_read.js` 被写入时编码错位（源件干净，重建即恢复） |
| 13:08 | CLI 回 `{"ok":true,"message":"fixture 默认回执"}` | 同批会话在 `dist` 里放了回执桩 |

⇒ 本票的验收读数是「**同一次连续跑**」里取齐的（用例套 10/10 ＋ 三格产物 ＋ 三门），且用例套自带**沙箱**（`test/receipt-831.test.mjs` 把 `dist`＋`templates` 拷进包内 `.t831-sandbox/` 再跑），因此**不随他人在途的破立而抖**。待 #833／#855 落定后，把 `sandbox()` 换回仓内 `dist/cli/cmd_read.js` 即可（一步）。
