# 票据纸原型读法说明（判地目录）

**这是判据（reference），不是模板（template）。** 这里的每一份 HTML 都只用来回答一个问题：
「DSH 真跑出来的产物，在像素上与它一致吗」。**不许**把这里的文件读进生成链、改个名输出出去，
也不许搬进 `packages/`——那是上一轮「95 份独立实现」的另一种形态，同样是病。

- 清单：`manifest.json`（**派生物**，由 `../1073-proto-manifest.mjs` 从各域原型清单生成，禁止手工维护）
- 件数核对：`../1073-proto-check.mjs`
- 结构比对（辅助定位）：`../1073-proto-same.mjs`，规则见 [`归一化规则.md`](./归一化规则.md)
- 视觉基线（像素尺子）：[`视觉基线.md`](./视觉基线.md)

## 一、95 张原型的分解

票面验收的「95 张原型 ＋ 2 份 993 冻结原型」＝ MAP #1070 的 71＋24：

| 域（清单 `domain`） | 件数 | 判地版本 | 目录 | 原型作者的清单（真值来源） |
|---|---|---|---|---|
| `query` | 17 | v2.1 | `query/` | `.scratch/1019-p-query/manifest-p-query-v2.1.json` |
| `analysis` | 25 | v2.1 | `analysis/` | `.scratch/1021-p-analysis/manifest-analysis-v2.1.json`（a04–a25）＋ `.scratch/1031-analysis-head/`（a01–a03） |
| `write-receipt` | 16 | v2 | `write-receipt/` | `.scratch/1020-p-write/manifest-v2.json` 的回执侧 |
| `acct-goal` | 13 | v2.2 | `acct-goal/` | `.scratch/1022-p-acct/manifest-p-acct-v2.2.json` |
| `say-collect` | 16 | v2.3 | `say-collect/` | `.scratch/1030-say/manifest-v2.3.json` |
| `w09` | 1 | v2.2 | `w09/` | `.scratch/1068-no24/compare-manifest-24.json` 的 `breakdown`（24 页判地表） |
| `setup-help` | 7 | v2.4 | `setup-help/` | `.scratch/1023-p-setup/manifest-p-setup-v2.4.json` |
| **小计** | **95** | | | |
| `frozen-993` | 2 | v5 回执／v7 详情 | `frozen-993/` | 仓根 `bill-993-proto-*.html`（已在版本库，取各 `v` 号最大的一份） |
| `style-spec` | 2 | 1005 | `style-spec/` | `.scratch/1005-style/`（34 token ＋ 七段规格页） |
| `superseded/write-collect-v2` | 16 | v2（**已被取代**） | `superseded/write-collect-v2/` | `.scratch/1020-p-write/manifest-v2.json` 的采集侧 |

`superseded/` 里的 16 件**不计入 95**：它们是写入域采集侧在 SAY v2.3 之前的版本，
逐场与 `say-collect/` 的 16 张一一对应（`x01`↔`x01` … `x31`↔`x31`）。留着只为存证，
**判地一律读 `say-collect/`**。

## 二、哪一版是判地、哪一版已被取代

| 域 | 判地 | 已被取代（**不读**） | 依据 |
|---|---|---|---|
| 查询 | `*-v2.1.html` | `*-v2.html` | 1019 清单 `version: v2.1` |
| 分析 | `*-v2.1.html` | `*-v2.html` | 1021／1031 清单 `version: v2.1` |
| 写入·回执 | `*-回执-v2.html` | — | 1020 清单只有 v2 |
| 写入·采集 | `*-v2.3.html`（在 `say-collect/`） | `*-采集-v2.html`（在 `superseded/`） | 1068 判地表 `breakdown.write采集SAYv23 = 16` |
| 账户目标 | `*-v2.2.html` | `*-v2.html`／`*-v2.1.html` | 1022 清单 `version: v2.2` |
| 设置速查 | `*-v2.4.html` | `*-v2.html` … `*-v2.3.html` | 1068 判地表 `breakdown.setup_v24最新 = 7` |
| 查分类 | `w09-查分类-v2.2.html` | `w09-查分类-v2.1.html` | 1068 判地表 `breakdown.w09去注版v22最新 = 1`，`source.w09: 1021-p-analysis v2.1→v2.2去注最新` |

**`w05-查账单` 不单独出纸**：查询域 17 张里没有 w05，这是**有意为之**，不是缺件。
1019 清单的 `merged` 字段自述：

> `w05-查账单-proto.html`：别名并入 `w01-查今天-v2.html`，v2 不单独出纸；唤醒词「查账单」指向 w01。依据 research-query.md R7。

所以查询域是 `w00`–`w04` ＋ `w06`–`w17` 共 17 张，编号跳 w05 是对的。
**判「少了一件」之前先看这一行。**

## 三、`a01`–`a03` 为什么不在 `1021-p-analysis` 目录里

它们在 `.scratch/1031-analysis-head/`。这不是搬漏了，是 1021 清单的 `domain` 字段自己写的：

> `"domain": "分析域a04~a25＋附录w09（a01~a03在1031）"`

生成器 `1073-proto-manifest.mjs` 解析这句话去找那三张，**不手写目录名**。
`1021-p-analysis/` 里的 `a01/a02/a03-v2.html` 是 v2 老版，**不是判地，不入本目录**。

## 四、`w09-查分类` 挂在 `w09/` 而不是 `query/`

`w09-查分类` 在 1021 分析清单里是**附录**（`seq: 109`），它的最新版由 24 页判地表裁定为 v2.2。
它是查询域的唤醒词，但物理件位与分析清单同源，因此单独放在 `w09/`，归 query 侧的 95 账。

## 五、原件仍在 `.scratch/`

本目录是**复制**入仓的。原件一件没删，还在 `.scratch/1019-p-query/` 等席下；
清不清由人决定。`manifest.json` 的 `source` 字段逐件记着它从哪个席的哪个文件来。

## 六、怎么读 sha256

`sha256` 的用途**只有一处**：证明「墙上展示的那份 HTML ＝ 入库的这一份」，即**文件同一性**。
它**不是**「落地还原」的判据——那件事判的是画面，尺子见 [`视觉基线.md`](./视觉基线.md)。
