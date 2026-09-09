# #120 取代 #101 的软删「仍计入历史统计」口径（登记）

> 依据：`docs/research/t120-ruling-softdelete.md` §冲突 B-2（编排者裁定：**禁止改写** #101 历史证据脚本，
> 改为新增本文件说明取代关系；先查该脚本是否被 `package.json`／CI 调用）。
> 日期：2026-09-09。

## 1. 取代关系

| 项 | #101（被取代） | #120（取代方） |
| --- | --- | --- |
| 口径 | 软删运动**仍计入**历史统计（`analysis/**` 11 处查询未过滤 `is_deleted`），回执如实写「仍计入历史统计」 | 软删运动**不计入**任何用户可见统计（11 处统一 `analysis/utils.ts:EX_ALIVE`），回执写「已从查询与统计中排除」 |
| 性质 | **当时的事实快照**：读层确实未过滤，回执只能如实描述 | 读层修复后的口径收敛 |
| 依据 | `gh issue view 101`（返修 H1：文案不得承诺「可恢复」，按读层实测分两档） | `gh issue view 120`（验收条「口径一致且文案与之一致」）＋ `t120-ruling-softdelete.md` §冲突A「维持方向 1，文案一并改」 |
| 落地 | `4306d71`／`873d175` | `aaf494d`（11 处查询）＋ `4d98e5f`（文案 ＋ #101 用例同步） |

**取代的是「口径与文案」，不是「历史记录」**：`docs/research/t101-softdelete-still-counted.mjs`
是 #101 当时实测的**事实快照**，其内容一字不改（协议 §3 精神：历史结论只追加不改写）。

## 2. 该脚本现状（必然变红，且是**反向证据**）

`node docs/research/t101-softdelete-still-counted.mjs` 在 #120 落地后**会 exit 1**：

- 事实 A（软删后 `home.deficitToday`／`deficit.avgExerciseBurn`／`buildSeries.exerciseKcal` **不变**）——现在会变；
- 事实 E（词条落点计数 = 14）——文案常量删除后计数变化。

该脚本自身已预登记这一用法（`docs/research/t101-write-persist-and-delete-wording.md:305`：
「回归：`node docs/research/t101-softdelete-still-counted.mjs` 事实 A 变红即证明读层已修」），
故其变红**正是 #120 读层已修的独立证据**。

## 3. 调用点核查（结论：未被任何门禁调用 → 保持原样）

`git grep -n "t101-softdelete-still-counted"`（排除脚本自身）命中：

| 命中处 | 性质 | 处置 |
| --- | --- | --- |
| `.changeset/t101-delete-wording-persist.md:5` | #101 changeset 正文（描述当时口径） | 不改（历史文件） |
| `docs/research/t101-mutation.mjs:107` | 变异脚本的 `extra` 字段（说明文字） | 不改（非执行路径） |
| `docs/research/t101-write-persist-and-delete-wording.md:16,26,40,54,163,258,305,335,374` | #101 证据正文（复跑记录） | 不改（历史文件） |
| `docs/research/t120-ruling-softdelete.md:28` | 本次裁定 | 引用本文件 |

- `package.json` scripts：**0 命中**；`.github/workflows/*.yml`：**0 命中**；`tooling/**`：**0 命中**。
- 结论：**未被调用** → 按裁定「保持原样」，只新增本取代说明。

## 4. 遗留（供编排者处置）

`.changeset/t101-delete-wording-persist.md` 与 `docs/research/t101-write-persist-and-delete-wording.md`
中关于「软删运动仍计入历史统计」的描述已**过时**（指向被取代口径）。二者属 #101 历史文件，
#120 未改；如需订正，建议另开小票或在 #101 票面追加一行指向本文件。
