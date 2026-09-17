# base-link-core 联动沉底包：组件目录

一句话：零依赖沉底包，只管三件事——信封、命令注册、执行契约。本包不画页面、不取数。

本包不含画图组件；画图去 `base-paint`（`packages/base-render/README.md` 的组件目录）。

## 速查

| 我要 | 调谁 |
|---|---|
| 造／验／判定数据信封 | `createEnvelope`／`parseEnvelope`／`isEnvelope`（`src/envelope.ts`） |
| 按形状验载荷 | `assertShapeData` |
| 注册并校验命令 | `createRegistry`（对不上即抛错）／`parseRegistryKey`（拆出 `skill`／`combo`／`key`） |
| 跑一次联动 | `runCombo`（注册表＋请求＋取数器；失败抛错，永不合成空数组） |
| 分域接错 | `EnvelopeError`／`RegistryError`／`RunnerError`（皆继承 `LinkCoreError`） |

## 成员

- 信封（`src/envelope.ts`）：`ENVELOPE_VERSION` 版本常量；`ENVELOPE_SHAPES` 6 形状（`list`／`detail`／`stat`／`receipt`／`analysis`／`fallback`）；`Envelope`／`EnvelopeShape`／`EnvelopeDataByShape` 类型；`createEnvelope` 造封、`parseEnvelope` 验封、`isEnvelope` 判定。
- 注册（`src/registry.ts`）：`RegistryKey`／`ParsedKey`／`Registry` 类型；`parseRegistryKey` 拆命令三段；`createRegistry(knownKeys)` 建表。
- 执行（`src/runner.ts`）：`RunRequest` 请求形（命令＋形状＋参数）、`Fetcher` 取数器类型、`runCombo(registry, req, fetchData)` 跑一次联动（key 先过注册表、载荷再过信封全字段）。
- 错误（`src/errors.ts`）：`LinkCoreError` 基类下分 `EnvelopeError`／`RegistryError`／`RunnerError` 三域。

## 消费者

包内唯一消费者是 `base-combos`（`comboEnvelope` 先过注册表、载荷走信封）；各技能经命令调用，不直调本包亦可。

## 测试

- 单测：`node --test ../../test/scaffold.test.mjs`（包内无单测目录）。
- 信封形状断言示例见上游 `base-paint` 的 `test/assert-shape-data-79.test.mjs`。
