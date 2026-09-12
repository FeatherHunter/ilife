# t152 验收探针 · 场景 07 四条唤醒词的产物实测（只测不改）

> 票号 152（探针票）。执行日 2026-09-13（本地时间 01:52–01:57）。
> 定位：**实测**，回答「卡路里场景 07 的 4 条唤醒词今天到底能不能各自跑出符合『完整文档』口径的 HTML 产物」。
> 全程命令入口是仓内既有 `packages/skill-calorie/dist/cli/cmd_read.js`（bin 名 `calorie-cmd-read`）。
> **本票未改任何源码／测试／其它文档；未跑任何 `pnpm build`／`node --test`／`tsc -b`，故不触发 `.scratch/locks/gate-runs.log` 的 §2.4 对账义务。**

## 0. 一句话结论

**4 条唤醒词今天都能各自跑出符合「完整文档」口径的 HTML 产物**（doctype ＋ charset ＋ 样式 ＋ 版面，`delivery.template=doc-shell`），
**没有任何一条命令实跑失败**。命令面**没有被数据清理议题阻塞**（见 §8 的边界说明）。

---

## 1. 安全：真库零接触（sha256 三值）

按派单第二段执行：先查清了 CLI 怎么解析库路径，确认它**支持**把库指到别处，故**没有**改动真库。

**路径解析实测**（`packages/skill-calorie/dist/paths.js`）：

```
export const DB_FILENAME = 'calorie_data.db';
export function resolveDbDir() { const env = process.env.SKILLS_DB_PATH; if (!env) throw ...; return env; }
```

`dist/cli/cmd_read.js:87-90` 的 `preflight()` 只认环境变量 `SKILLS_DB_PATH`，**必设、无默认值**；
`cmd_read.js:1138` 取库＝`join(dbPath, 'calorie_data.db')`，产物落点＝`join(dbPath, 'calorie_html')`（`dist/output.js:106`）。
**库与产物同根**，所以把 `SKILLS_DB_PATH` 指向副本目录，就同时隔离了库与产物。

| 项 | 值 |
|---|---|
| 真库 | `D:\2Study\StudyNotes\.db\calorie_data.db`（3 072 000 字节） |
| 跑前 sha256 | `4C2E5C448B00F9CEAF0694453F7873F8645A48C9D7F98DD7DCDA5380AB7BCE62` |
| 跑后 sha256 | `4C2E5C448B00F9CEAF0694453F7873F8645A48C9D7F98DD7DCDA5380AB7BCE62`（**与跑前逐字相同**） |
| 还原后 sha256 | **不适用——无需还原**（全程未指向真库，未跑任何写命令打真库） |
| 真库 LastWriteTime | 跑前跑后均为 `2026-09-12T20:15:41.5859747+08:00`（未变） |
| 结论 | **真库未接触，0 字节改动** |

**用到的副本（全部在 `.scratch/t152-probe/` 下，互不共用）**：

| 副本 | 怎么造的 | 档案状态 | 用途 |
|---|---|---|---|
| `db\` | 复制真库（sha256 与真库一致，已在 `00-snapshot.txt` 记） | `user_profile` 1 行（age 30／male／175cm／moderate／减脂期） | 主路径（A/B/C 组） |
| `db-empty\` | 由 CLI 自身 `openDb` 建结构，12 张表全 0 行 | 无 | 空库态（D 组） |
| `db-fresh\` | 目录新建后首次跑（跑的那一刻才建结构） | 无 | 「首次跑即建结构」态（E 组） |
| `db-noprofile\` | 复制真库后 `DELETE FROM user_profile`（执行前 1 行 → 执行后 0 行，见 `01-` 与 `make-noprofile-db.mjs` 输出） | 无 | 「档案不存在」态（F 组） |

**反向核对**：真库目录 `D:\2Study\StudyNotes\.db\calorie_html\` 里，与本次 5 个产物名同族（`设置档案|改档案|设活动量|查档案|档案视图|档案预检`）且落在本次时间窗（≥ 01:50）的文件数 = **0**。
该目录里唯一一个 `档案视图_*.html` 是 `档案视图_20260911_211158.html`（9 月 11 日遗留，1358 字节，属 #179 所述的旧「片段」形态），**不是本次产物**。
（附注：该真库目录在 01:53:12–01:53:17 确有 4 个新文件——`唤醒词HELP`／`今日总览`／`查食品`／`体重盘`——但它们**不是本票的 5 条 key 产生的**，且 `今日总览_20260913_015317.html` 首段是 `<section class="ilife-page">`（无 doctype，旧形态），判断是**同在飞的其它 agent／编排者的冒烟**在打真库路径，与本票无关。）

## 2. 命令 key 与调用形态（命令面的正本）

来源：`packages/skill-calorie/dist/cli/keys.js` 的 `CALORIE_COMBOS` 表 ＋ 议题 #175／#176 正文关键事实节（两处逐字一致）。

| 唤醒词 | registry key | 形状 | 是否改库 |
|---|---|---|---|
| `设置档案` | `calorie.profile.set` | receipt | 是 |
| `改档案` | `calorie.profile.update` | receipt | 是 |
| `设活动量` | `calorie.profile.activity` | receipt | 是 |
| `查档案` | `calorie.view.profile` | stat | 否 |
| 预检确认页（三条写入词共用，只读） | `calorie.view.profile-wizard` | stat | 否 |

调用形态：`calorie-cmd-read <registry key> [--params '<JSON>']`。
**入口自证**：`D:\2Study\nodejs\calorie-cmd-read.ps1` 这个全局 shim 的 `LinkType=Junction`、`Target=D:\ilife\packages\skill-calorie`，
即 **`calorie-cmd-read` 与 `node packages/skill-calorie/dist/cli/cmd_read.js` 是同一个文件**（`dist/cli/cmd_read.js`，68629 字节，2026-09-13 01:21:29）——不存在「全局装的是旧版」的隐患。
§7 里用 `calorie-cmd-read` 真跑过 2 条，作交叉确认。

## 3. 四条唤醒词逐条实测

四个断言共用的判据：① `existsSync` ＋ 字节数（并与 envelope 的 `delivery.bytes` 对账）② 首 3 行 ③ charset 行 ④ `<style>…</style>` 区间字节数 ＋ 选择器样例 ⑤ 结构元素计数 ＋ 结尾标签。
每次运行都是真 CLI 进程，`1>` 收 stdout（envelope）、`2>` 收 stderr，退出码追加进 `.scratch/t152-probe/results.tsv`。

### 3.1 `设置档案` → `calorie.profile.set`

- 调用：`--params '{"fields":{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate","note":"t152 probe set"}}'`
- **exit = 0**（`results.tsv` 行 `12-设置档案-profile-set`；stderr 空，见 `12-设置档案-profile-set.err.txt`）
- 产物绝对路径：`D:\ilife\.scratch\t152-probe\db\calorie_html\设置档案_回执_20260913_015639.html`
- 回执给 AI 的文本（envelope `data.message`，与 `data.receipt.summary` 同字）：`已设置档案（身高 175 · 年龄 30 · 活动量 moderate）`
  `writtenFields=["heightCm","age","gender","activityLevel","note"]`、`items=[]`（设置档案没有「改前」概念）
- 逐条断言：
  | # | 断言 | 结果 | 证据 |
  |---|---|---|---|
  | ① | 文件真实存在，报字节数 | **通过** | **60508 字节**；envelope `delivery.bytes=60508` 一致 |
  | ② | 以 `<!doctype html>` 开头 | **通过** | 头 3 行：`<!doctype html>` ／ `<html lang="zh-CN">` ／ `<head>` |
  | ③ | 带 charset | **通过** | `<meta charset="utf-8">` |
  | ④ | 带 `<style>` 样式段 | **通过** | 样式段 **31167 字节**；首个规则选择器 `:root`，另如 `.ilife-toast-stack` |
  | ⑤ | 有版面 | **通过** | h1=1（文案「设置档案 · 回执」）h2=1 section=2 table=2 tr=11 th=6 td=18 button=5 script=1 div=25，结尾 `</html>` |
- envelope 全文：`12-设置档案-profile-set.out.json`

### 3.2 `改档案` → `calorie.profile.update`

- 调用：`--params '{"fields":{"heightCm":176,"age":31,"gender":"male","activityLevel":"active","note":"t152 probe update"}}'`
- **exit = 0**（`results.tsv` 行 `13-改档案-profile-update`）
- 产物绝对路径：`D:\ilife\.scratch\t152-probe\db\calorie_html\改档案_回执_20260913_015639.html`
- 回执给 AI 的文本：`已改档案（身高 176 · 年龄 31 · 活动量 active）`
  `writtenFields` 5 项；`items`（改前→改后对照）＝`heightCm 175 → 176`／`age 30 → 31`／`gender male → male`／`activityLevel moderate → active`／`note t152 probe set → t152 probe update`
- 逐条断言：
  | # | 断言 | 结果 | 证据 |
  |---|---|---|---|
  | ① | 存在 ＋ 字节数 | **通过** | **59905 字节**；`delivery.bytes=59905` 一致 |
  | ② | `<!doctype html>` 起 | **通过** | 头 3 行同上形 |
  | ③ | charset | **通过** | `<meta charset="utf-8">` |
  | ④ | `<style>` | **通过** | **31167 字节** |
  | ⑤ | 版面 | **通过** | h1=1（「改档案 · 回执」）section=2 table=1 tr=6 th=3 td=10 button=5 div=25，结尾 `</html>`（表格行数比设置档案少，因为只出变更对照） |
- 另一形态交叉确认（§7）：`--params '{"field":"heightCm","value":177}'` 也 **exit 0**，产物 59148 字节，`items=[{"status":"heightCm","reason":"176 → 177"}]`。
- envelope 全文：`13-改档案-profile-update.out.json`

### 3.3 `设活动量` → `calorie.profile.activity`

- 调用：`--params '{"activityLevel":"active"}'`
- **exit = 0**（`results.tsv` 行 `14-设活动量-profile-activity`）
- 产物绝对路径：`D:\ilife\.scratch\t152-probe\db\calorie_html\设活动量_回执_20260913_015639.html`
- 回执给 AI 的文本：`已设活动量：active→active`（本次是**空操作**：前一步 `改档案` 已把活动量置为 `active`）
- 逐条断言：①**60146 字节**（`delivery.bytes` 一致）②③④ 同上形（样式段 31167 字节）⑤ h1=1（「设活动量 · 回执」）section=2 table=2 tr=11 th=6 td=18 button=5 div=25，结尾 `</html>`——**5 条全通过**
- **补一次真实变更**（避免只用空操作取证）：`--params '{"activityLevel":"sedentary"}'` → **exit 0**，回执文本 `已设活动量：active→sedentary`，
  产物 `…\db\calorie_html\设活动量_回执_20260913_015640.html`，**60159 字节**，5 条断言同样全通过。
- envelope 全文：`14-设活动量-profile-activity.out.json`、`15-设活动量-真实变更.out.json`

### 3.4 `查档案` → `calorie.view.profile`

- 调用：无参数
- **exit = 0**（`results.tsv` 行 `10-查档案-view-profile`）
- 产物绝对路径：`D:\ilife\.scratch\t152-probe\db\calorie_html\档案视图_20260913_015638.html`
- 回执给 AI 的文本：**这个形状没有文本字段**（诚实记账）：`shape=stat` 的 envelope 只有 `data.metrics` ＋ `data.output`，
  实测 `data.metrics={"age":30,"heightCm":175,"hasGoal":1,"latestWeightKg":87.2,"calorieGoal":1850}`，**没有 `message`／`summary` 字段**（全文见 `10-查档案-view-profile.out.json`，434 字节）。写命令（receipt 形状）才有 `data.message`。
- 逐条断言：
  | # | 断言 | 结果 | 证据 |
  |---|---|---|---|
  | ① | 存在 ＋ 字节数 | **通过** | **63838 字节**；`delivery.bytes=63838` 一致 |
  | ② | `<!doctype html>` 起 | **通过** | `<!doctype html>` ／ `<html lang="zh-CN">` ／ `<head>` |
  | ③ | charset | **通过** | `<meta charset="utf-8">` |
  | ④ | `<style>` | **通过** | **31167 字节** |
  | ⑤ | 版面 | **通过** | h1=1（「档案视图」）h2=1 section=2 table=**3** tr=19 th=10 td=37 button=5 script=1 div=40，结尾 `</html>`——本次 5 条里版面最厚 |
- envelope 全文：`10-查档案-view-profile.out.json`

## 4. 预检确认页 `calorie.view.profile-wizard`（派单第 3 项）

该命令接一个可选的 `wakeWord` 参数（取值＝三条写入词的逐字文本），用来决定页上**展开哪一处配置**；不传＝「三条全列」。

| 运行 | `wakeWord` | exit | 产物绝对路径 | 字节 | 5 条断言 | 页面级证据 |
|---|---|---|---|---|---|---|
| `11` | 不传 | **0** | `…\db\calorie_html\档案预检_20260913_015639.html` | **65439** | 全通过 | h1=1（「档案预检」）section=2 table=2 tr=12 th=9 td=35 button=**6** div=39 |
| `30` | `设置档案` | **0** | `…\db\calorie_html\档案预检_20260913_015639_2.html` | **65439** | 全通过 | 同形 |
| `31` | `改档案` | **0** | `…\db\calorie_html\档案预检_20260913_015640.html` | **65436** | 全通过 | 同形（字节数与另两处差 3 字节＝展开的那一处配置文本长度不同） |
| `32` | `设活动量` | **0** | `…\db\calorie_html\档案预检_20260913_015640_2.html` | **65439** | 全通过 | 同形 |
| `33` | `乱填`（非法） | **2** | **不落盘** | — | — | stderr 逐字 `ERR 2: 参数失败：参数 wakeWord 非法（设置档案/设活动量/改档案）：乱填` |
| `41` | 不传（**空库**） | **0** | `…\db-empty\calorie_html\档案预检_20260913_015640.html` | **64265** | 全通过 | `metrics={"filledCount":0,"hasProfile":0,"activityLevels":5}`——**空库照开页** |
| `43` | 不传（**全新库**） | **0** | `…\db-fresh\calorie_html\档案预检_20260913_015641.html` | **64265** | 全通过 | 同上 |

每条样式段都是 **31167 字节**，选择器样例 `:root`／`.ilife-toast-stack`；所有产物以 `</html>` 收尾。
预检页是唯一多一颗按钮的页：`<button>` 文案序列＝`复制指令 ｜ 复制数据 ▾ ｜ text粘贴给 AI／自… ｜ json结构化存档 ｜ csv表格导入 ｜ 复制日志`——**那颗「复制指令」就是 #175／#176 要的复制 prompt 按钮**。

## 5. 三条写入词回执页的「复制数据」「复制日志」两颗按钮（派单第 3 项）

不是「字符串出现过」，而是**抽出了真实的 `<button>` 标记**（三条写入词产物逐一抽，标记逐字相同）：

```html
<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-fmt-open="1" aria-haspopup="menu" aria-expanded="false">复制数据 ▾</button>
<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" data-action-id="ilife-copy-log" data-t="场景标识 calorie.设置档案（receipt） … 调用链 calorie-cmd-r…">复制日志</button>
```

| 写入词 | 产物 | `复制数据` | `复制日志` | 该产物 `<button>` 总数 |
|---|---|---|---|---|
| `设置档案` | `设置档案_回执_20260913_015639.html` | 有（真 `<button>`） | 有（真 `<button>`） | 5 |
| `改档案` | `改档案_回执_20260913_015639.html` | 有 | 有 | 5 |
| `设活动量` | `设活动量_回执_20260913_015639.html` | 有 | 有 | 5 |

三条写入词产物里 `<button>` 文案序列一致：`复制数据 ▾ ｜ text粘贴给 AI／自… ｜ json结构化存档 ｜ csv表格导入 ｜ 复制日志`。
（`查档案` 结果页同样两颗齐全，见 `26-content-evidence.txt`。）

## 6. `查档案` 的空库态（派单第 4 项）

**已测**。造了两份，都不是真库：

- `db-empty\`：12 张表齐全、全表 0 行（`01-db-inspect.log` 同法核对，`COUNT user_profile=0`）。
- `db-fresh\`：目录新建后**首次**跑命令那一刻才由 CLI 的 `openDb` 建结构。

| 运行 | 库态 | exit | 产物 | stderr（逐字） |
|---|---|---|---|---|
| `40-空库-查档案` | 结构已在、0 行 | **4** | **不落盘**（`db-empty\calorie_html\` 下无任何 `档案视图*`） | `ERR 4: 取数失败（缺失阻断）：未设档案（user_profile#1 缺失，先设置档案）` |
| `42-全新库-查档案` | 首次跑即建结构 | **4** | **不落盘** | `ERR 4: 取数失败（缺失阻断）：未设档案（user_profile#1 缺失，先设置档案）` |

**结论：与议题说的既有「缺失阻断」口径一致——exit 4、不落盘、给逐字原因。**
（stdout 为空，见 `40-空库-查档案.err.txt`／`42-全新库-查档案.err.txt`；每条 raw 输出都在 `.scratch/t152-probe/` 下按 tag 成对落盘。）

同库态下 `预检页` 仍 **exit 0 出完整文档（64265 字节）**——「空库照开页」实测成立（见 §4 的 `41`／`43` 行）。

## 7. `改档案` 在档案不存在时（派单第 5 项）

**只打在副本 `db-noprofile` 上**：复制真库后 `DELETE FROM user_profile`（执行前 1 行 → 执行后 0 行）。

- 运行 `50-无档案-改档案`，`--params '{"fields":{"heightCm":176,"age":31,"gender":"male","activityLevel":"active","note":"t152 probe update"}}'`
  - **exit = 4**（不是 0）
  - stderr **逐字**：`ERR 4: 取数失败：尚无档案（先设置档案，再改）`
  - stdout 为空 → **不落盘**：跑后该副本的 `user_profile` 行数仍为 **0**（`01-db-inspect.log` 同法复查），**没有 `INSERT OR IGNORE` 建行、也不是「静默建行后更新」**
- 交叉确认（同副本、同类词）：`51-无档案-设活动量` → **exit 4**，`ERR 4: 取数失败：尚无档案（先设置档案，再设活动量）`
- 交叉确认（同副本、读命令）：`52-无档案-查档案` → **exit 4**，`ERR 4: 取数失败（缺失阻断）：未设档案（user_profile#1 缺失，先设置档案）`

**明确结论：`改档案` 在档案不存在时是「报错」——符合用户裁定。不是静默建行后更新。**
议题 #175 票面记载的「今天实现与裁定不符（`ensureRow` 先建行）」**在本次实测的构建上已不再复现**；#175 票面末段的收口节自述已交付「空库守卫」，本次实测与之吻合。

## 8. 附带观察（未列入验收口径，实测到的，供编排者记账）

1. **非法 key 的口径**（对照用，`90-非法key`）：`calorie.nope.nope` → **exit 3**，逐字 `ERR 3: 未知 calorie key：calorie.nope.nope`。
   （⚠️ 与派单给的示例文案 `ERR 3: 非法 registry key` **不完全同字**；实测是「未知 calorie key：…」。不算缺陷，只是口径记录。）
2. **`SKILLS_DB_PATH` 指向一个不存在的目录时**：`openDb` 不会自建目录 → **exit 4**，逐字 `ERR 4: 未知失败：unable to open database file`（早期一次对照运行 `run-probe.ps1` 的 empty 组，当时 `db-empty` 还没建）。生产上该目录必然存在，故不是本 4 条词的问题；但「首次使用（目录都不存在）」会给一句不指向 SKILLS_DB_PATH 的泛化错误，属可记账的小口径问题。
3. **`stat` 形状的 envelope 没有给 AI 的文本字段**（只有 `data.metrics` ＋ `data.output`）。若编排者需要「回执文本」口径覆盖读命令，这是个要单独立项的口径差，不是本次命令面的失败。
4. **探针自身的一次失误（如实记账）**：`16-改档案-field形式` 那次 **exit 2** 是我的 pwsh 引号把 `--params` 的 JSON 双引号吃掉了（错误信息 `--params 须为 JSON：Expected property name or '}' at position 1`），**不是 CLI 缺陷**；同一形态随后用 `calorie-cmd-read` 正正经经复跑（`18`）**exit 0**。

## 9. 未做／未确证

- **未跑任何 `pnpm build`／`node --test`／`tsc -b`**——按编排者指令「优先不要重新 build」，全程使用 2026-09-13 01:21:29 既有的 `dist/`。因此本报告只代表**该构建**的行为，不代表当前 `src/` 工作区状态。
- **源码处于并发改写中**：本票取证时另有两个 agent 在改 `packages/skill-calorie/src/triggers/scene-*.ts`。本票**没有**触碰这两个文件，也**没有**因场景数据字段文本变化判红或判绿——判定口径只用「命令入口能否产出完整 HTML」。
- **未做视觉审查**（390px／1440px 截图、对比度、触控目标）——那是 #175／#176 的门槛，不在本票派单内。
- **未做** `file://` 双击的真人肉眼确认——本票只做程序断言（文件对普通人可读、结构完整、以 `</html>` 收尾）。
- **未评测**目录 `calorie_html` 被写保护时的内联回退态（#83 三态交付的②③态）——不在派单内。

## 10. 原始输出清单（全部在 `.scratch/t152-probe/`）

> **仓库政策提醒**：`.gitignore:5` 把 `.scratch/` 整目录忽略，故这些原始文件**在盘上但不受 git 跟踪**（与协议 §2.3／§2.4 把审计日志放 gitignored `.scratch/locks/` 同一惯例）。为了让结论可被独立复核，**本报告正文已把退出码、stderr 逐字、envelope 关键字段、5 条断言读数全部内联**。

| 文件 | 内容 |
|---|---|
| `results.tsv` | **19 条运行的一行机读记录**：`tag / key / dbDir / exit / stderr` |
| `00-snapshot.txt` | 取证时刻、git HEAD、真库 sha256（跑前）、node 版本、原 `SKILLS_DB_PATH` |
| `01-db-inspect.log` | 副本表结构与 `user_profile` 行（`USER_PROFILE_ROWS=1`） |
| `10-…`…`90-…` 各一对 `.out.json`＋`.err.txt` | **每个命令一份**：stdout（envelope 全文）／stderr 逐字 |
| `20-phase-main.log` | 首次主路径那轮的汇总（早期；以 `results.tsv` 为准） |
| `21-check-all.log` / `22-check-wizard3.log` / `24-check-shim.log` | 5 条断言检查器的机读摘要 ＋ 全量 JSON |
| `23-evidence.txt` | 主路径 9 个产物的逐条证据块（含 AI 文本、路径、字节数、按钮标记原文） |
| `25-evidence-negative.txt` | 兜底路径＋bin 形态的逐条证据块 |
| `26-content-evidence.txt` | 每个产物的 h1／h2 文案、样式段前 8 个选择器、`<button>` 文案序列 |
| `inspect-db.mjs` / `make-noprofile-db.mjs` / `check-html.mjs` / `extract-evidence.mjs` / `show-detail.mjs` / `show-content.mjs` / `run-probe.ps1` / `run-shim.ps1` | 可复跑脚本 |

复跑总入口：`pwsh -NoProfile -File .scratch/t152-probe/run-probe.ps1 -Phase all`（自带四个副本的库态先决条件见 §1 表；`db-noprofile` 需先跑 `make-noprofile-db.mjs`）。

---

## 结论

1. **`设置档案`（`calorie.profile.set`）：能。** exit 0，`设置档案_回执_20260913_015639.html` 60508 字节，5 条断言全过，含「复制数据」「复制日志」两颗真按钮。
2. **`改档案`（`calorie.profile.update`）：能。** exit 0，`改档案_回执_20260913_015639.html` 59905 字节，5 条全过，带改前→改后对照；`field/value` 形态另测也 exit 0。
3. **`设活动量`（`calorie.profile.activity`）：能。** exit 0，`设活动量_回执_20260913_015639.html` 60146 字节；真实变更一次（`…015640.html` 60159 字节）同样全过。
4. **`查档案`（`calorie.view.profile`）：能。** exit 0，`档案视图_20260913_015638.html` 63838 字节（本次最厚版面）；空库态按既有口径 **exit 4 且不落盘**。
5. **预检确认页（`calorie.view.profile-wizard`）：能。** 不传参＋三个 `wakeWord` 值共 4 张全过（64265–65439 字节），空库／全新库照开页；非法 `wakeWord` exit 2 不落盘。
6. **有没有哪一条命令实跑失败？没有。** 4 条唤醒词的命令全部 exit 0 且都产出完整文档。
7. 因此「这 4 条被另一个数据清理议题阻塞」**在本构建上不成立**——阻塞点不在命令面（命令能把完整 HTML 跑出来）；若编排者观察到的阻塞在别处（例如场景数据字段文本、routing／HELP 表面），那属于本票口径**之外**的范围（见 §9）。
8. 误差与边界：本报告只代表 2026-09-13 01:21:29 的 `dist/`；未 build、未做视觉审查；`stat` 形状无给 AI 的文本字段（§8-3）。
