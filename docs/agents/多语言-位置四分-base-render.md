# 位置四分清单 · base-render 组件层（#1202 两处硬缝）

- 日期：2026-10-08；归属：地图 #1197／票 #1202；规则正本：`docs/agents/多语言-位置四分规则.md`（#1233）。
- 本件是**按规则实际动手**的那一半：本票范围内**逐字**清点每个中文串的处置（进词条／留常量／不动），
  一条一行，行号按当刻工作区文件（基线 5cb95a72）。范围＝两处硬缝：
  ① `src/components/progress-list/`（有逐字节门与词常量）② `src/spec/controls.ts` 的状态徽章契约。
- 处置口径（#1233 §1）：标题位＋载荷位 → 整句化→词条；数据位 → 数据常量化；拼接串 → 只标红（本票把它**做掉**）；
  标识符位／版式位／派生件／命令关键字 → 不动。

## ① progress-list（多目标进度）

| 位置（文件:行） | 逐字原值 | 四分归类 | 处置（本票实际动作） |
| --- | --- | --- | --- |
| `src/components/progress-list/attrs.ts:66-71` | 未记录／进行中／已达标／已超（`PROGRESS_LIST_STATE_WORDS` 四格） | 标题位／载荷位 | 整句化→词条：key `progress-list.state.blank／on-track／done／over`（值住 `src/entries/zh.ts`）；常量改**派生视图**（`ZH[...]`），导出名与取值口不变 |
| `attrs.ts:78` | `—`（`PROGRESS_LIST_MISSING`） | **版式位** | 不动（缺值符是排印记号，全仓同一条地板） |
| `attrs.ts:81` | `还差`（`PROGRESS_LIST_REMAIN_WORD`） | 拼接串成分 | 整句化→词条 `progress-list.remain = 还差 {value}{unit}`；常量改派生视图（取模板 `{` 之前那段） |
| `attrs.ts:83` | `刚好达标`（`PROGRESS_LIST_EXACT_WORD`） | 载荷位（独立句） | 整句化→词条 `progress-list.exact`；常量改派生视图 |
| `attrs.ts:85` | `已超`（`PROGRESS_LIST_OVER_WORD`） | 拼接串成分 | 整句化→词条 `progress-list.over = 已超 {value}{unit}`；常量改派生视图 |
| `model.ts:127-129` | 三句现拼：`'刚好达标'`／`'已超 ' + fmt + unitTail`／`'还差 ' + fmt + unitTail` | **拼接串** | 三处全改 `resolve(BASE_RENDER_CATALOG, language, id, {value, unit})`——**唯一行为改动点**；zh 那份模板逐字等于改造前拼出来的字符串，故中文列逐字节不变 |
| `model.ts:68,76,83,93,108,142,158,162` | `badInput(...)` 里的中文（开发者报错句） | 不上屏（异常面） | 不动（ADR §6 范围外；登记为后续轮次） |
| `render.ts` 注释与 `index.ts` 注释 | 中文注释 | 注释（不进产物） | 不动 |
| 标识符位 | `PROGRESS_LIST_STATES`／类名根／槽名／`data-ilife-progress-state` | 标识符位 | 不动 |
| 数据位 | 数字（`formatProgressNumber` 自算）、单位（调用方给的 `unit`） | 数据位 | 不动（**不改判据**：本次不引 `Intl`，逐字节门口径不变） |

## ② 状态徽章契约（`src/spec/controls.ts`，冻结面）

| 位置（文件:行） | 逐字原值 | 四分归类 | 处置 |
| --- | --- | --- | --- |
| `spec/controls.ts:329` | `STATUS_KINDS = ['ok','warn','danger','empty']` | 标识符位（机器键） | 不动（契约上留的就是机器键） |
| `spec/controls.ts:333-338` | `STATUS_DEFAULT_TEXT`：成功／警告／失败／无数据 | **载荷位**（徽章默认字） | key 化：key 表住 `src/components/controls/status.ts`（`status-badge.text.*`），词住 `src/entries/zh.ts`；`STATUS_DEFAULT_TEXT` **原样保留**（契约签名逐值锁死，见下） |
| `spec/controls.ts:340-343` | `StatusBadgeInput`（status／text） | 契约入参 | **加一个可选位** `language?: string`（不给＝既有形状） |
| `spec/controls.ts:78-81` | `COPY_TEXT_DEFAULTS`：已复制／粘贴给 AI／复制失败／长按选择文本手动复制 | 载荷位 | **本票不动**（同族契约词，登记为后续；它与本票两处硬缝不同族，动它＝扩大范围） |
| `spec/controls.ts:307-308` | `ACTION_BAR_DEFAULTS`：复制数据／复制日志 | 载荷位 | 本票不动（同上） |
| `spec/controls.ts` 其余中文 | 行注释与 `badInput` 报错句 | 注释／异常面 | 不动 |

## 派生件与生成物（本席一行未改）

| 文件 | 为什么不动 |
| --- | --- |
| `src/components/清单.ts` | 生成物（`scripts/gen-components.mjs`）：本票**导出面一个名字都没增删**，故不需要重生成 |
| `scripts/gen-help-shell.cjs`／`src/helpShell.ts` | HELP 壳模板；本票未改（帮助段的话由调用方给） |
| `package.json` 的 `version` | 不动（不发版） |

## 已知边界（如实登记）

- `progress-list` 的状态字/整句模板进词条后，**调用方覆盖位**（`rows[].state`／`remainText`／`display`）照旧优先——
  语言只改**本件自己产的那几个词**，不改调用方给的话。
- `unit`（卡／毫升／千克）是**调用方给的数据**，不随语言变（三条不译：用户数据不译）；故英文列是 `611 卡 to go`。
- 本清单只覆盖本票范围；base-render 其余 93 件组件的四分类账由 #1226／#1227／#1232 承接。
