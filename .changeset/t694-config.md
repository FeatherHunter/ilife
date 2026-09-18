---
'base-link-core': minor
---

feat(694)：公共层配置件 —— `base-link-core` 新增 `src/config/`（定位、读写、校验、重置）

一个技能要读写自己那份配置文件，需要的那套公共件先是空的。这次把它做出来，并证明形状走得通：

- **定位**：默认 `~/.ilife/<技能>.yaml`，由 `os.homedir()` 派生、**平台无关**（不读 `$DSH_HOME`，技能要能在没有 DSH 的平台上单独跑）；`ILIFE_CONFIG_DIR` 设定且非空即整体接管；数据目录默认 `~/.ilife/data/`，首次读时自动建（`mkdir -p` 语义）。
- **读写与默认值**：文件不存在 → 用调用方传的默认值并落一份；文件存在 → **先校验再取值**（不认识的键、类型不符一律抛错）；文件里缺的项回落默认值；写出去的是完整一份（盘上永远只有默认值表那组键）。默认值由各技能自己传，写法上支持「逐项等于现有代码常量」。
- **解析**：手写受限子集解析器（照 `base-combos` 读 `combos.yaml` 的先例，**零新增依赖**）——键值、一层嵌套（缩进恰好 2 空格）、字符串／数字／布尔、单双引号字符串、整行与值后注释；解析器与生成器互为逆；失败给人话报错 ＋ 行号（`ConfigError.line`）。支持面与**不支持清单**冻结在本包 README。
- **重置为默认**：`resetConfig()` 先把现有文件另存 `<技能>.yaml.bak` 再按默认值重写；备份失败即不写盘。
- **测试隔离**（删掉五个写库开关后的替代护栏）：跑在 node 测试运行器里却没设 `ILIFE_CONFIG_DIR` 即抛 `CONFIG_TEST_ISOLATION_MISSING`；测试基座 `test/helpers/config-test-base.mjs` 强制设置它、缺了直接报错。

对外只给 4 个值：`configPaths`／`loadConfig`／`saveConfig`／`resetConfig`（`ConfigError` 走包根 errors 面）。
判据：24 条验收用例全绿、三种情形读数 3/3、变异自证红（fail 2）绿（fail 0）各一行、`pnpm boundaries` 与 `pnpm gen:check`、`pnpm doctor` 全绿。证据见 `docs/base/base-link-core/t694-证据.md`。
