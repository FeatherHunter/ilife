---
"base-link-core": patch
---

fix(763): 测试护栏换判据 —— 不再挂 `ILIFE_CONFIG_DIR`，改看「是不是要落到**真实**家目录」

- `resolveConfigDir()` 的测试护栏（`CONFIG_TEST_ISOLATION_MISSING`）**判据换了**：
  原＝「跑在 `node --test` 里却没设 `ILIFE_CONFIG_DIR`」；新＝「跑在 `node --test` 里**却要落到真实家目录的 `.life`**」。
  真实家目录取自**账号**（`os.userInfo().homedir`，win32 兜 `HOMEDRIVE`＋`HOMEPATH`），不读任何我们定义的环境变量 ⇒
  家目录注入（测试把 `USERPROFILE`／`HOME` 指到临时目录）时不触发，**忘了注入即响亮失败、零写**。
- 影响：在测试运行器里读配置的调用方现在按「落点」判，不再按「有没有设某个变量」判；
  测试侧改走**家目录注入**（Windows `USERPROFILE`／POSIX `HOME`），落点关系不变（配置＝`~/.ilife/<技能>.yaml`）。
- 本包的读取点仍在（`ILIFE_CONFIG_DIR` 的覆盖分支与常量归 #754 删）。
