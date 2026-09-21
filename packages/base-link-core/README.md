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
| 一个技能读写自己的配置文件 | `loadConfig`／`saveConfig`／`resetConfig`（`src/config/`；定位见下节） |
| 想知道配置与数据落在哪 | `configPaths(stem)` → `{ configDir, configFile, dataDir }` |
| 配置件报错 | `ConfigError`（带 `code` 与 `line`） |

## 成员

- 信封（`src/envelope.ts`）：`ENVELOPE_VERSION` 版本常量；`ENVELOPE_SHAPES` 6 形状（`list`／`detail`／`stat`／`receipt`／`analysis`／`fallback`）；`Envelope`／`EnvelopeShape`／`EnvelopeDataByShape` 类型；`createEnvelope` 造封、`parseEnvelope` 验封、`isEnvelope` 判定。
- 注册（`src/registry.ts`）：`RegistryKey`／`ParsedKey`／`Registry` 类型；`parseRegistryKey` 拆命令三段；`createRegistry(knownKeys)` 建表。
- 执行（`src/runner.ts`）：`RunRequest` 请求形（命令＋形状＋参数）、`Fetcher` 取数器类型、`runCombo(registry, req, fetchData)` 跑一次联动（key 先过注册表、载荷再过信封全字段）。
- 错误（`src/errors.ts`）：`LinkCoreError` 基类下分 `EnvelopeError`／`RegistryError`／`RunnerError`／`ConfigError` 四域。
- 配置（`src/config/`）：`dirs.ts` 决定配置文件与数据目录在哪；`yaml.ts` 是手写的受限子集解析器与生成器（不出这个目录）；`store.ts` 管读、写、校验、重置为默认；`index.ts` 是这一小面的门，对外只给 `configPaths`／`loadConfig`／`saveConfig`／`resetConfig` 四件。

## 配置文件（`src/config/`）

一个技能自己的可配置项住在一份 YAML 文件里，**这份文件是唯一真相**（环境变量不参与配置）。
落点只有一处：`~/.ilife/<技能>.yaml`（由 `os.homedir()` 派生），数据目录默认 `~/.ilife/data/`（首次读时自动建）。测试隔离改走家目录注入，不开覆盖口子。

```js
import { loadConfig } from 'base-link-core';

// 默认值由技能自己传，逐项等于现有代码常量。
const DEFAULTS = { db: { dir: '~/.ilife/data', name: 'calorie_data.db' }, html: { dir: 'calorie_html' } };
const { values, path, dataDir, created } = loadConfig('calorie', DEFAULTS);
```

- 文件不存在 → 用默认值并落一份（`created: true`）；文件存在 → **先校验再取值**（不认识的键、类型不符一律抛错），文件里缺的项回落默认值。
- 写（`saveConfig(stem, defaults, values)`）落盘的是**一份完整的**：给的项写进去，没给的按默认值补齐 ⇒ 盘上永远只有默认值表那组键。
- 重置（`resetConfig(stem, defaults)`）先另存 `<技能>.yaml.bak`（已有即覆盖）再按默认值重写；备份失败即不写盘，原文件保持不动。
- 出错误一律抛 `ConfigError`：`code` 是 `CONFIG_PARSE_FAILED`／`CONFIG_UNKNOWN_KEY`／`CONFIG_TYPE_MISMATCH`／`CONFIG_SHAPE_INVALID`／`CONFIG_IO_FAILED`／`CONFIG_STEM_INVALID`／`CONFIG_TEST_ISOLATION_MISSING`，`line` 是配置件里的行号（对不上行号时为 `null`），报文里已经带了行号与文件名。

### 支持范围（冻结）

这份子集只认我们写得出去、也读得回来的那点语法：

| 支持 | 写法 |
|---|---|
| 键值 | `name: calorie_data.db`（键限 `[A-Za-z_][A-Za-z0-9_-]*`） |
| 一层嵌套 | 顶层键后跟缩进**恰好 2 个空格**的子项；只有一层 |
| 标量 | 字符串、十进制数字（含负数与小数）、布尔 `true`／`false` |
| 带引号的字符串 | `"双引号"`（认 `\n`／`\t`／`\"`／`\\`）、`'单引号'`（`''` 表示一个单引号） |
| 注释 | 整行注释（行首可有空白 ＋ `#`）；值后注释（`#` 前面是空白才开始注释） |
| 换行 | `\n` 与 `\r\n` 都认；文件开头的 BOM 自动剥掉 |
| 空文件与空行 | 空文件读成空配置；空行跳过 |

解析器与生成器互为逆：`parseConfigYaml(formatConfigYaml(x))` 等于 `x`（有测试钉死）。
写出去时分「裸值」与「加引号」两种：字符串里含空白／`#`／`:`／引号、或长得像数字与布尔时，一律加双引号。

### 不支持（遇到就报错，不猜、不静默）

- **列表**（`- x` 开头的行）——存储时也不要数组，报 `CONFIG_SHAPE_INVALID`。
- **两层以上嵌套**（缩进超过 2 个空格）。
- **制表符缩进**。
- **多行字符串**（`|`／`>` 块）。
- **锚点、别名、标签、`null`／`~`、日期时间、科学计数法**（`1e3` 当字符串读，不转数字）。
- **重复键**（同一层里同名键出现两次即报错，带两处的行号）。
- **空组**（`key:` 底下没有子项：写出去会解析不回来，故写入侧就拒）。
- **文件里出现默认值表以外的键**（报 `CONFIG_UNKNOWN_KEY`，带行号）——不做老配置兼容，也没有「未知键先留着」。

> 遗留出口：这份子集若在实际使用中不够（多行字符串、列表嵌套等），先记进这份不支持清单，攒到本图收尾再裁要不要扩子集。

### 测试隔离（护栏，不许绕过）

删掉五个写库开关（`*_FORCE_PROD`）之后，「跑测试误写真实数据」靠三道门挡住（三层都不读我们定义的变量）：

1. 门 A（生产守卫）：跑在 node 测试运行器里（`NODE_TEST_CONTEXT` 非空）却要落到真实家目录的 `.ilife` 时，`resolveConfigDir()` 抛 `CONFIG_TEST_ISOLATION_MISSING`——判据取自账号（`os.userInfo().homedir`），绝不静默落到真实家目录。
2. 门 B（基座自证）：测试一律把家目录指到临时目录（Windows 设 `USERPROFILE`／POSIX 设 `HOME`）；基座是 `test/helpers/home-test-base.mjs`（建完当场验不是真实家目录，坏了即抛）。
3. 门 C（快照门禁）：跑全量前后，真实 `~/.ilife` 的树快照逐字不变（`tooling/check-real-home-untouched.mjs`，接进 `pnpm test`）。

## 消费者

包内唯一消费者是 `base-combos`（`comboEnvelope` 先过注册表、载荷走信封）；各技能经命令调用，不直调本包亦可。
配置面（`src/config/`）的消费者是六个技能与设置面（改配置、重置为默认），见地图 #671。

## 测试

- 单测：`node --test ../../test/scaffold.test.mjs`（包内无单测目录）。
- 信封形状断言示例见上游 `base-paint` 的 `test/assert-shape-data-79.test.mjs`。
- 配置件验收：`node --test test/config-694.test.mjs`（需先 `tsc -b packages/base-link-core`）。
