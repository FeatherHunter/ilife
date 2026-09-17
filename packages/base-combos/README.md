# base-combos 联动包：组件目录

一句话：本包不画页面，只管“哪条命令走哪条取数通道、长什么样”——`combos.yaml` 是唯一真相源。

## 速查

| 我要 | 调谁／看哪 |
|---|---|
| 发起一条联动取数 | `comboEnvelope(key)`（先过注册表校验，对不上即抛错） |
| 查有哪些命令可用 | `PRESENT_KEYS`（生成物，147 条，以 `combos.yaml` 重核为准） |
| 加一条联动 | `combos.yaml` 加一行＋过 `tooling/check-combos.mjs`，不改代码 |
| 看唤醒词与呈现 | `HELP.md` 互联区（构建期注入的静态投影） |
| 看场景语义与降级 | `combos.yaml` 的 `scenarios`／`fallbacks` 段 |

## 成员

- `comboEnvelope(key)`：按注册表校验命令后造 `list` 信封（骨架占位；真实载荷各技能实施）。源：`src/index.ts`。
- `PRESENT_KEYS`：命令表（`src/present.ts`，由 `scripts/gen-present.mjs` 从 `combos.yaml` 生成，手改无效）。
- 注册表实现来自 `base-link-core`（`createRegistry`）：命令先过注册表，载荷走信封全字段。

## 配置即契约（`combos.yaml` 头注释铁律）

- 本文件只有声明式联动描述，无库定义语句；以后每加一条只加配置。
- `scenarios` 30 条联动场景＋`l6_slots` 6 个空位（一期不实现，内容不记录）。
- 取数通道 `channels` 15 对（命令 × 形状 × 背书）；降级 `fallbacks` 6 条（显式标记，不编造）。
- `HELP.md` 是真相源的静态投影：构建期注入，运行时不计算。

## 红线

`present` 层只许 string 字面量引注册表命令，禁 import 页面交付层（`src/present.ts` 首行注释）。

## 测试与校验

- 单测：`node --test ../../test/scaffold.test.mjs`（包内无单测目录）。
- 加命令校验：`tooling/check-combos.mjs`。
