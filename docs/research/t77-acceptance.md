# #77 复制文本序列化 · 验收自证（S-1…S-6）

票：`#77`《base- 复制文本序列化：buildDataText／buildLogText》（map `#63`）。
契约：`docs/base-paint-contract.md` §3.4（含 §3.4.1–§3.4.6 行为补遗）／§6.4／§8.10。
机读真相源：`packages/base-render/src/spec/text.ts`（本票**未改其任何值**）。

## S-1 status 翻转 ＋ 三处同步 ＋ 签名值零改动

| 处 | 落点 | 证据 |
|---|---|---|
| 清单 | `packages/base-render/src/spec/index.ts:148-151` | 4 条 `status` `pending` → `implemented`（`git diff` 逐行：**只有 `status` 字段变动**，`signature` 字符串逐字未动） |
| 文档标记区 | `docs/base-paint-contract.md` §3.4 标记区（4 行） | 与清单逐字一致（签名测试「标记区表格与清单逐字一致」绿） |
| 编译期 | `packages/base-render/test-d/contract-signatures.ts` | `_X10`／`_X11` `Absent<>` → `Present<>`；`_X10b`／`_X11b` 锁出口类型；`_X10c`／`_X11c` 锁类型出口仍 type-only；`_X10d` 锁 `TextError` **不导出**；`_X11d` 锁 `TextErrorShape` 非运行时出口 |

- 实测：`SPEC_FROZEN_SURFACE` **130 条**（implemented **123**／pending **7**；runtime 88／type 42）；`ticket '#77'` 共 24 条**全部** `implemented`。
- 出口面：`src/index.ts` 只追加 2 个运行时出口（`buildDataText`／`buildLogText`）；`TextError` **不导出**（R-2）。
- 复核命令：`git diff -- packages/base-render/src/spec/index.ts`（仅 4 行 status 变动）＋ `node -e` 统计清单分布。

## S-2 5 个 shape × 3 个 format 的样例产出（逐条对应投影表）

实际产出文本见 `docs/research/t77-serialization-evidence.md` §1（逐 shape 三 format 各一段围栏块）。
对应关系逐条：

| shape | 投影表（`DATA_TEXT_PROJECTIONS`） | text 行序 | json `data` 键 | csv `section` 列 |
|---|---|---|---|---|
| `stat` | `body:'metrics'`／`tail:null`／`csvSections:['metrics']` | 输出头 ＋ `键: 值` × 3 | `metrics` | `metrics`（逐键一行） |
| `list` | `body:'items'`／`tail:'total'`／`csvSections:['items','total']` | 输出头 ＋ 逐项行 × 4 ＋ `total: 4` | `items`／`total` | `items` × 4 ＋ `total` |
| `detail` | `body:'item'`／`tail:null`／`csvSections:['item']` | 输出头 ＋ `键: 值` × 5 | `item` | `item` |
| `receipt` | `body:'ok'`／`tail:'message'`／`csvSections:['status','message']` | 输出头 ＋ `ok: false` ＋ `message: …` | `ok`／`message` | `status`／`message` |
| `analysis` | `body:'summary'`／`tail:null`／`csvSections:['summary']` | 输出头 ＋ `summary: …` | `summary` | `summary` |

- `fallback` → `shape-unsupported`（三个 format ＋ `buildLogText` 各断言一次）。
- 反向鉴别：投影表之外的 `data` 字段**不进** text／csv（用例「投影表之外的 data 字段不进 text／csv」）。

## S-3 6 段日志样例 ＋ `(未知)`／`未填写` 口径实证

- 6 段 × 3 format 的实际产出见 `docs/research/t77-serialization-evidence.md` §2（`copyLog` 齐全／缺省两组）。
- 段序恒按 `LOG_SECTIONS`；数据源恒按 `LOG_SECTION_SOURCES`（`scene` ← envelope 派生 `{skill}.{key}（{shape}）`；
  `timestampVersion` ← `copyLog.timestamp`，**不是**同名字段）；`text` 口径 = 标题行 ＋ 内容行共 12 行，段间无空行。
- 口径实证（同页 §2 末表）：

| format | 数据空值（`item.空值 = null`） | 日志缺段（`exception` 缺省） |
|---|---|---|
| `text` | `空值: 未填写` | `(未知)` |
| `json` | `null` | `null` |
| `csv` | `item,空值: `（空串） | `exception,`（空串） |

- 两个占位符**只作用于 text**：用例断言「数据面不得出现 `(未知)`」「日志面不得出现 `未填写`」。
- `list.total` 缺省 → 省略收尾行（三 format 一致，U1）；显式 `total: null` → 按空值口径渲染。

## S-4 敏感行判定与掩码实证

- 判定只认**字面** `SENSITIVE_ROW_RULE.flagValue`：`sensitive: 1`／`"yes"`／`"true"`／`{}`／`[]`／`null`
  **一律不脱敏**（与旧侧真值判定不同，FX-30）；逐值表见证据 §3。
- 掩码：三 format **一律** `SENSITIVE_ROW_RULE.mask`（= `TEXT_SENSITIVE_MASK` = `****`）；
  `text` 口径掩码行**紧随一行** `textNotice`（`（敏感字段已脱敏）`）；`json`／`csv` **不夹**中文提示。
- `csv` 口径 `section` 列保留投影分组名（U7）；`json` 口径该键值写 `mask`（不写 `null`）。
- 原文一律不出现（每个 format 各断言一次）；投影值三处位置（`metrics` 值／`item` 值／`items` 元素）各有用例。

## S-5 证据脚本 ＋ 快照（可复跑、确定性）

```text
pnpm build
node docs/research/t77-serialization-evidence.mjs --out docs/research/t77-serialization-evidence.md
```

- 脚本：`docs/research/t77-serialization-evidence.mjs`（只从 `dist` 读冻结常量，**不自带副本**；缺 `dist` 显式报错）。
- 快照：`docs/research/t77-serialization-evidence.md`（5 shape × 3 format 实际文本 ＋ §1.5 `undefined` 归一与空产出恒非空 ＋
  6 段日志 × 3 format ＋ 空值分层 ＋ 敏感行判定表 ＋ 三错误码逐码表 ＋ **215 条断言**）。
- 确定性实测（返修后重跑）：`node docs/research/t77-serialization-evidence.mjs --out …` 连续两次 ＋ 仓内快照
  **三者 SHA256 全等** `BAF27B44E53B13597AC3A4E6A1D704DDBDB3AD9F3A99B709B92ADA8911BF5D27`（逐字节相同）；
  快照首字节 `#`（无 BOM）、CR 计数 0；不读时钟／环境变量／文件系统。
- 失败即 exit 1（断言不成立绝不静默变绿）。

## S-6 五命令退出码 ＋ 新增失败数（多重集）

| 命令 | 退出码 | 结果 |
|---|---|---|
| `pnpm build` | **0** | `tsc -b` 无错 |
| `pnpm boundaries` | **0** | `boundaries: PASS`（7 条断言全 OK） |
| `pnpm test:types` | **0** | `tsc -b`（含 `test-d` 编译期断言） |
| `pnpm test` | 1（**既有台账态**） | tests **654**／pass **632**／fail **22** |
| `node docs/research/t77-serialization-evidence.mjs` | **0** | **215 条断言全绿** |

- 基线（本票施工前实测）：tests **571**／pass **549**／fail **22**（判据 `docs/research/t92-baseline-failures.md`）。
- **新增失败数 = 0**：返修后重跑，失败用例名**多重集逐条相同**（22 条，唯一名 19 条；脚本逐名逐次比对
  → `NEW_OR_COUNT_MISMATCH=[]`、`VANISHED_OR_COUNT_MISMATCH=[]`、`MULTISET_IDENTICAL`）。
  本票新增用例 **83** 条（571 → 654），全部 PASS。
- 单跑复核：`contract-signatures.test.mjs` **47/47**、`text.test.mjs` **83/83**、`controls.test.mjs` **64/64**。
- **抖动记录（如实）**：三次全量并行中有一次出现 **file 级**（非用例级）失败
  `✖ packages\skill-calorie\test\cmd-write-40.test.mjs`＋`PostQueuedCompletionStatus: (6) 句柄无效`，
  该文件单跑 **13/13 绿**；属判据台账 A 组（「Windows 全量并行下 CLI spawn 抖动，不可复现」），
  与本票改动零耦合（本票只改 `base-render/src/text.ts` 与两处测试／文档）。另两次全量均为
  22 条基线失败、多重集逐条相同。

## S-7 返修自证（FX-77-1…8；V1／V2／V3 复验后）

| 自证 | 内容 | 实测 |
|---|---|---|
| **S-1** | 含 `undefined` 的**同一输入** → 三 format **键集／行数一一对应** | `{item:{a:null,b:'',c:undefined,d:0}}`：`json` 键集 `a,b,c,d`（`c:null`）、`text` 主体 4 行、`csv` 主体 4 行；`{metrics:{a:undefined,b:null}}`：json 2 键／text 2 行／csv 2 行；缺 `key`：json 五键集不缩水（`key:null`）；**嵌套** `{item:{嵌套:{b:undefined,c:1}}}`：三 format 均为 `{"b":null,"c":1}`。实际产出见证据快照 §1.5 |
| **S-2** | 空产出三例 → 三 format **均非空** | `metrics:{}`／`item:{}`／`title:''`／`skill:''`＋`key:''` 五种诱因 × 三 format 全部 `length > 0` 且 `copyText` 返回 `ok`（证据快照 §1.5 表；用例 `#77 产出恒非空（FX-77-6）`） |
| **S-3** | 新增断言**能因实现错误而红**（变异自证） | 变异 A（去掉 `undefined` 归一）→ 4 条新用例红；变异 B（空串 `title` 不再视同缺省）→ 2 条新用例红；变异 C（`json` 缩进改 3 空格）→ 证据脚本 12 条断言红（原 `startsWith('  ')` 会 PASS，正是不再保留该写法的理由）。三者改回后**全绿** |
| **S-4** | 证据脚本改后**逐字节可复现** | 连跑两次 ＋ 仓内快照三方 SHA256 全等 `BAF27B44E53B13597AC3A4E6A1D704DDBDB3AD9F3A99B709B92ADA8911BF5D27` |
| **S-5** | 五命令退出码 ＋ 新增失败数 ＋ 冻结面条目数 | 见上表（0／0／0／1（既有）／0）；`SPEC_FROZEN_SURFACE` **130 条**（implemented 123／pending 7） |

## 12 条红线逐条遵守（自证）

| # | 红线 | 证据 |
|---|---|---|
| R1 | 不自造 snapshot 结构接口 | `src/text.ts` 零 `snapshot`／`sections`／`heading`／`copy_log` 引用（实测 grep 无命中）；用例断言 json 输出无 `snapshot`／`sections`／`summary` 键 |
| R2 | 不自造第二套 `format` 语义 | `format` 闭集恒读 `COPY_FORMATS`；三 format 行为逐条对齐契约表 |
| R3 | 不自定空值／转义口径 | 空值恒读 `TEXT_EMPTY_PLACEHOLDER`／`LOG_UNKNOWN_PLACEHOLDER`；引号／**行尾恒读 `CSV_DIALECT`（含 `lineEnding`，FX-77-8 已消费）**；`<` 恒读 `TEXT_JSON_LT_RULE` |
| R4 | 不自定逐 shape 投影 | 字段名恒取 `DATA_TEXT_PROJECTIONS`；实现内无 shape→字段表 |
| R5 | 不给 `scene` 段另找数据源 | 用例「反向鉴别：copyLog 里同名字段不得被当成 scene 源」 |
| R6 | 不自定敏感行判定／掩码 | 判定与掩码恒读 `SENSITIVE_ROW_RULE`（含字面 `true` 反例） |
| R7 | 不自造第二份投影表 | 展开策略由数据形态推导（对象／数组／标量），无第二份表 |
| R8 | 只许 `import type` 消费 base-link-core | `src/text.ts` 完全不引 base-link-core；`src/spec/*.ts` 未改 |
| R9 | `src/spec/*.ts` 只许类型与纯数据 | 本票只改 `spec/index.ts` 的 4 个 `status` 值 |
| R10 | 落地后翻转 status | 4 条已翻转（S-1） |
| R11 | 不自造同义 API／改签名／改名 | 出口恒为 `buildDataText`／`buildLogText`；`git diff` 签名值零改动 |
| R12 | 三处同步／不删不放宽断言 | S-1；返修只**收严**（近恒真断言改行为断言、弱断言改逐行等值），既有断言零删零放宽 |

## 未决／登记

- `envelope` 五字段（`version`／`skill`／`key`）**存在性**不校验（归 #74 `STRICT_ENVELOPE_FIELDS`），见契约 §3.4.4 的 77-7。
- `json` 口径 `data` 的多余键原样透传（77-8）；`text`／`csv` 只输出投影字段。
- `text` 口径行内换行替换为空格 与 `csv` 引号包裹的分工见 §3.4.1 末条（77-11）。
- **返修登记项（不冻结也不排除，owner #77）**：行内 CRLF → 两个空格；`NaN`／`Infinity`／`BigInt`／`Date` 三 format 口径；
  `U+2028`／`U+2029` 未替换；容器级敏感包装（`metrics`／`item` 本身为包装）不脱敏；`buildLogText`（csv）敏感行条款
  因 `CopyLogFields` 类型**不可达**。逐条见契约 §3.4.7「登记项」。
