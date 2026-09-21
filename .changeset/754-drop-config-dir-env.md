---
"base-link-core": patch
---

fix(754): 删掉配置根的位置覆盖口子 —— 配置目录只落 `os.homedir()/.ilife`

- `resolveConfigDir()` 删掉位置覆盖变量的读取分支与 `CONFIG_DIR_ENV` 常量：配置目录只有一个来源（`os.homedir()/.ilife`），不再读我们定义的任何环境变量。
- 测试护栏保留但换判据（#763）：跑在测试运行器里却要落到真实家目录即抛 `CONFIG_TEST_ISOLATION_MISSING`，判据取自账号，与家目录注入同源。
