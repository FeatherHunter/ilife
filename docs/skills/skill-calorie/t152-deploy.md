# #152 技能装机现状与 5 条真产物落地

> 执行：2026-09-13 01:58–02:02（本机）。照 `.scratch/t152-recon/deploy-and-accept-handoff.md` 执行，未重新调查。
> 证据与可复跑脚本：`.scratch/t152-deploy/`（工作草稿，不入仓）。
> 关联：#178（技能装机前提）／#131（读旧拷贝跑旧包的教训）／#239（两颗按钮＋三格式菜单）。

---

## 一、装机现状（实测，非推测）

### 1.1 agent 读技能的位置

DSH 认技能的入口是 **`%USERPROFILE%\.agents\skills\`**（技能发现根，rank 500）。
依据：本仓 `docs/skills/skill-memo-ilife/t232-review-F.md` §作业 7 实测（由 agent preset 挂的 `skill-filesystem` 扫该根找 `SKILL.md`），且**同名技能跨层「最近者赢」、无条件盖掉仓库插件提供方那份**（`collectFresh` 的 `layers=[global, ...chainLayers]` ＋ `merged.set` 覆盖，rank 在其中不起作用、且覆盖不打日志）。
实机佐证：维护者说「备忘录 HELP」时 DSH 列出的可用技能恰是该目录当时的内容（bill／calorie／chef）。

### 1.2 各安装位实测（改动前）

| 位置 | 形态 | 版本 |
|---|---|---|
| `C:\Users\辰辰洋洋\.agents\skills\skill-calorie` | **真目录＝拷贝**（陈旧） | **0.2.2** |
| `…\.dsh\profiles\web\node_modules\skill-calorie` | Junction → `.dsh-module-fallback\node_modules\skill-calorie` | 0.2.3 |
| `…\.dsh\profiles\web\.dsh-module-fallback\node_modules\skill-calorie` | Junction → `packages\plugin-calorie\node_modules\skill-calorie` | 0.2.3 |
| `D:\ilife\packages\plugin-calorie\node_modules\skill-calorie` | Junction → `packages\skill-calorie` | 0.2.3 |
| `D:\2Study\nodejs\node_modules\skill-calorie` | Junction → `packages\skill-calorie` | 0.2.3 |
| `D:\ilife\packages\skill-calorie` | 仓库本体 | 0.2.3 |

**结论**：除 agent 发现根那一条外，其余全部是 Junction、全部指向仓库本体、全部 0.2.3 —— **没有「读旧拷贝跑旧包」问题**。唯一陈旧点是 `~\.agents\skills\skill-calorie`：**真拷贝、0.2.2**。

改动前哈希对照：

| 项 | agent 根那份（0.2.2 拷贝） | 本仓 `dist/`（0.2.3） |
|---|---|---|
| `SKILL.md` | 30,559 B · `903325B1C7F1A6A2…` | 31,807 B · `C962CBF1905AA187…` |
| `dist/cli/cmd_read.js` | 67,432 B · `80DE69F3CEF02580…` | 68,629 B · `4A81C6D4D89D291B…` |

本仓 `dist/` 是 0.2.2 的**演进超集**：新增 `profile/*`（setup／update／view）与 `shared/*`（copyArea／docPage）共 20 个文件，仅少了已被取代的 `render/profilePlate.*` 4 个文件（旧拷贝 456 个 dist 文件，本仓 472 个）。`node --check dist/cli/cmd_read.js` exit 0。

### 1.3 运行时命令入口

`calorie-cmd-read` 在 PATH 上由 `D:\2Study\nodejs\` 下的 `.cmd`／`.ps1` shim 提供，shim 内含 `%dp0%\node_modules\skill-calorie\dist\cli\cmd_read.js` —— 该 `node_modules\skill-calorie` 是 **Junction → 仓库本体**，故**运行时命令一直是 0.2.3 新代码**。这正是 #131 教训里「读旧拷贝跑旧包」的**反例**：包是新的，只有 agent 读的那份 `SKILL.md` 正文是旧的。

---

## 二、要做的事与已做的事

**目标路径（仓外）**：`C:\Users\辰辰洋洋\.agents\skills\skill-calorie`
**理由**：这是 agent 读技能的根；那份陈旧拷贝会**无条件覆盖**仓库插件提供方的新内容，导致 agent 按旧正文行事（旧正文没有 #179／#177 收口后的预检页描述）。改法是把它换成 Junction —— 与兄弟技能 `skill-bill`／`skill-chef`／`skill-memo-ilife` 已成形状一致，且从此「仓改即真机改」，再无新旧之分（#178 的三件事里「技能拷贝／运行时接线／已发布包体版本」一次对齐）。

**实际动作（全部可回滚）**：

1. 守卫：断言目标是**真目录非链接**、且 `version=0.2.2`（不是陈旧拷贝就停下）。
2. 先把陈旧拷贝**改名留存**（不删除）：`skill-calorie` → `skill-calorie.bak-0.2.2-t152`。
3. 建 Junction：`cmd /c mklink /J "…\.agents\skills\skill-calorie" "D:\ilife\packages\skill-calorie"`。
4. 复核（见下）。

**未做**：没有跑 `pnpm build`（`dist/` 当前可用；且此刻 #180 正在改写 `src/triggers/scene-*.ts`，build 会踩并发）。**未**动 profile 侧任何 Junction（本来就对）。

**回滚**：`cmd /c rmdir "…\.agents\skills\skill-calorie"` 然后 `Rename-Item "…\.agents\skills\skill-calorie.bak-0.2.2-t152" "skill-calorie"`。

### 装机后复核（实测）

| 检查 | 结果 |
|---|---|
| `LinkType` | **Junction** → `D:\ilife\packages\skill-calorie` |
| 版本（经链接读） | **0.2.3** |
| `SKILL.md` | 31,807 B · `C962CBF1905AA187…`（与仓库本体逐字节相同） |
| `dist/cli/cmd_read.js` | 68,629 B · `4A81C6D4D89D291B…` |
| 经 Junction 真跑命令 | 三条唤醒词 `设置档案`／`改档案`／`设活动量` 各 exit 0、各落一份产物 |

> 一份旧拷贝仍在技能根旁（`skill-calorie.bak-0.2.2-t152`）。它是回滚锚点，**不在发现路径**（无 `SKILL.md` 于根名下），不参与技能发现；确认无需回滚后可删。

---

## 三、5 条真产物落地

### 3.1 选了甲案，理由

**选甲**：以 `SKILLS_DB_PATH=D:\2Study\StudyNotes\.db` 真跑，三条写入命令**用与现值相同的值**（`heightCm=175`／`activityLevel=moderate`／`age=30`／`gender=male`）。

理由：① 用户要「先看一眼生成的 HTML」，甲案产物是**真库位置、由当前构建真跑出来**的，不是从副本搬来的，验收时看到的就是实际运行结果；② 乙案要搬运的副本产物本身比甲案更早（探针 01:56–01:57），且「不是真机跑出来的」这一点在验收里是硬伤；③ 甲案的写入风险已被本次实测**收敛为「仅 `updated_at` 时间戳」**（见 §3.3），且该字段已精确还原。

### 3.2 5 条产物（真机位置，五项断言 5/5 PASS）

| 唤醒词 | 绝对路径 | 字节数 | ①`<!doctype html>` | ②charset | ③`<style>` | ④复制数据 | ⑤复制日志 |
|---|---|---|---|---|---|---|---|
| 设置档案（预检确认页） | `D:\2Study\StudyNotes\.db\calorie_html\档案预检_20260913_020058.html` | 65,438 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 设置档案（写后回执） | `D:\2Study\StudyNotes\.db\calorie_html\设置档案_回执_20260913_015932.html` | 60,426 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 改档案（写后回执） | `D:\2Study\StudyNotes\.db\calorie_html\改档案_回执_20260913_015932.html` | 59,209 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 设活动量（写后回执） | `D:\2Study\StudyNotes\.db\calorie_html\设活动量_回执_20260913_015932.html` | 60,169 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 查档案（结果页） | `D:\2Study\StudyNotes\.db\calorie_html\档案视图_20260913_015932.html` | 63,838 | ✅ | ✅ | ✅ | ✅ | ✅ |

**RESULT: 5/5 PASS, fail=0**（复核器 `.scratch/t152-deploy/final-verify.mjs`，可复跑）

顺带核到 **#239**：每页两颗按钮 —— `复制数据 ▾`（`data-fmt-open="1"`）与 `复制日志`（`data-action-id="ilife-copy-log"`）；点开是三格式三选一菜单，`copy-menu-item` 各 8 处、`data-fmt` 取 `text`／`json`／`csv`。**09-13 实跑实物确实含 ▾ 三格式菜单**，与交接文档对 `.scratch/t239/shots/` 那批旧图的说明一致。

### 3.3 真库前后对照（甲案必给）

**跑前**（`db-before.json`）：

- `calorie_data.db` bytes=3,072,000 · sha256=`4C2E5C448B00F9CEAF0694453F7873F8645A48C9D7F98DD7DCDA5380AB7BCE62`
- `user_profile` 行：`id=1, age=30, gender=male, height_cm=175, note=减脂期, created_at=2026-07-16T09:44:34, updated_at=2026-09-12 12:15:41, activity_level=moderate`

跑写命令**前**已用 `VACUUM INTO` 做独立备份：`.scratch\t152-deploy\calorie_data.bak.db`（2,633,728 B · sha256=`B42D61B736272E84315E4E0DDCD4D864CC13B53C634FFE622F9C0D3483EFBC6B`），并验证备份可读、`user_profile` 行内容一致。

**跑后**（`db-after.json`）：**`updated_at` 变了** —— `12:15:41` → `17:59:32`（UTC 存储，＝本地 01:59:32）。**其余 7 个字段逐字段 SAME=true**（`age`／`gender`／`height_cm`／`note`／`created_at`／`activity_level`／`id`），12 张表行数全等，`food_log`／`exercise_log`／`weight_log`／`nutrition_products` 等**全部未被触碰**。

**处置（如实报告后已改回）**：按派单「若变了，立刻如实报告并把值改回去」的要求，用定向 `UPDATE user_profile SET updated_at = ?` 把该字段**精确还原**为 `2026-09-12 12:15:41`。

**还原后**：

- `user_profile` 行：**与跑前逐字段相同**（`updated_at` 已回到 `2026-09-12 12:15:41`）
- **全库逻辑转储比对**（`prove-logical-identity.mjs`）：4,453,599 字符，跑前备份与当前库 **sha256 完全相同**（`A04F2FB719183FBE…`），`LOGICAL_IDENTICAL=true`
- **逐表物件审计**（`audit-table-integrity.mjs`）：12 张表、**11,044 行**、15 个索引、29 个 schema 对象，**PER_TABLE_ALL_EQUAL=true**（行数＋最大 rowid＋主键集合全等）
- `PRAGMA integrity_check` = `ok`；`foreign_key_check` 无输出；字节数 3,072,000 与跑前一致

**一处未能做到字节级一致（如实记）**：文件 sha256 由 `4C2E5C44…` 变为 `6DC4615F…`。原因**不是数据** —— 逻辑转储已证完全相同，而是 **SQLite 写入会重排页布局**：实测把 `PRAGMA user_version` 0→1→0 这种「净零改动」跑一遍，文件 sha256 也会再变一次（`A4A1CA86…` → `6DC4615F…`，每次写入都换布局）。故「写入之后」字节级还原不可达；净效果以**逻辑内容零变化**为准（已用上述三重对账证明）。另：`schema_version` 由 82 落到 81、页数 643→750、freelist 0→34，均为布局量，不承载数据。

### 3.4 产物其余事实

- 我另跑了 3 份 `档案预检_*`（`020058`／`020058_2`／`020059`，来自经 Junction 的装机复核），属同一预检页的正常产物，非多余脏数据。
- 真库 `calorie_html/` 在我到达时已有 6 份**非我产生**的新文件（`唤醒词HELP_20260913_015312.html`、`今日总览_…015317`、`体重盘_…015317`、`查食品_…015317`、`档案视图_…015852`×2，mtime 01:53–01:58）—— 早于本席开工（01:58:37），来自别的在飞 session；本席未删改。落地前该目录为 **327** 个 HTML（交接文档写 328，差 1，未能确证原因）。
- 场景 07 的**旧片段** `档案视图_20260911_211158.html`（1,358 B，以 `<section>` 起头）仍在目录里、**未删**（不在本票写集内）；用户若在目录里翻到它是预期的历史残留。

---

## 四、怎么复核

```powershell
$N='D:\2Study\nodejs\node.exe'; $S='D:\ilife\.scratch\t152-deploy'
& $N "$S\check-install.mjs"          # 装机：链接/拷贝、版本、哈希
& $N "$S\final-verify.mjs"           # 5 条产物五项断言 + 真库现值
& $N "$S\audit-table-integrity.mjs"  # 逐表行数/主键 vs 跑前备份
& $N "$S\prove-logical-identity.mjs" # 全库逻辑转储比对
& $N "$S\db-forensics.mjs" diff "$S\db-before.json" "$S\db-final.json"
```

若并发的 #180 改写了 `dist/`，产物是**旧渲染代码**的产物；要刷新请重跑 §3.2 对应命令（写入命令继续用现值即可）。

---

## 五、未确证 / 未做

1. **未跑 build**：`dist/` 取自现有构建（编排者 2026-09-13 跑过 `run-locked --ticket 152 -- pnpm build` exit 0）。本席到达时 `src/triggers/scene-*.ts` mtime 01:58:14 已晚于部分 `dist` 文件（01:57:19），`dist/` **处于 #180 改写的半改态**；因页面渲染验证全绿且 build 有踩并发之险，未重建。
2. **未做用户实机验收**：本席只能证明产物在位且断言全绿，**「用户在全新空白 session 里念 4 条唤醒词」尚未执行**（交接文档 §四）。
3. **未验证 DSH 进程当场热读到新 Junction**：协议说该根为运行时热读（#220 裁决 25 实测「建完立刻生效、无需重载」），但本席**未重启、未在 DSH 技能表里亲眼看到** 0.2.3 的 `description`。这是一条**引用前例、非本席亲测**的结论。
4. **未核对** `calorie_html` 落地前总数 327 与交接文档 328 的 1 个差额。
5. **未清理** `skill-calorie.bak-0.2.2-t152`（有意留作回滚锚点）。

---

## 六、风险 top3

1. **真库被并发写入**：`D:\2Study\StudyNotes\.db\calorie_data.db` 是用户活库。本次已实测到「三条写命令必定改写 `updated_at`」。若其他在飞 session 同时对它跑命令，本席的前后对照会失真。**现有备份**：`.scratch\t152-deploy\calorie_data.bak.db`（跑前态）。
2. **`dist/` 半改态**：`src/triggers/scene-*.ts` 正被 #180 改写，`dist/` 与之不同步。若 #180 后续 build 出问题，重新刷新产物会受影响；且本票 5 条产物是**当前 dist** 的产物，日后重建需重跑命令。
3. **agent 读技能的老机制残留**：Junction 解决了陈旧拷贝，但「`~\.agents\skills` 跨层无条件覆盖、且不打日志」这一机制仍在（他人往该根放拷贝仍会静默盖掉新内容，本机已有 `skill-calorie.bak-0.2.2-t152` 这个历史标本）。无护栏，只能靠约定（只许 Junction、建前后双验）。
