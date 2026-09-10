# #140 base-* 三包联动发布 0.3.0 —— 取证留档

- 票据：[base-* 三包联动发布 0.3.0：base-link-core／base-combos 首次上架](https://github.com/FeatherHunter/ilife/issues/140)
- 执行时间：2026-09-10（本地 20:15）
- 执行人：维护者（浏览器登录 ＋ 两次 2FA 审批）＋ DSH agent（脚本、门禁、取证）
- 版本归位提交：`7a114b3`（工作区三包 0.3.0，已推送 `origin/master`）

## 结果

| 包 | registry 版本 | 0.3.0 发布时间（UTC） | 本次动作 |
| --- | --- | --- | --- |
| `base-paint` | **0.3.0** | 2026-09-10T06:02:46Z | 已在位（当天热修所发），未重发 |
| `base-link-core` | **0.3.0** | 2026-09-10T12:15:48Z | 首次上架 0.3.0 |
| `base-combos` | **0.3.0** | 2026-09-10T12:15:51Z | 首次上架 0.3.0 |

三包同版本线 **0.3.0** ⇒ `packages/base-render/test/base-version-lockstep.test.mjs` 的「三包 version 逐字相等」由其自我转绿。

## 验收逐条

1. `npm view` 三包版本 = 0.3.0 → 见 `registry-versions.txt` ✅
2. 已发布 manifest 零 `workspace:` → 见 `registry-dependencies.txt`（`base-combos@0.3.0` 声明 `base-link-core: ^0.3.0`）✅
3. 仓外隔离安装 `exit 0`，两包 ESM 导入成功、无 `EUNSUPPORTEDPROTOCOL` → 见 `isolated-install.log` ✅
4. 本地 `pnpm test` 相对治理名单（34 条）：新增 **4 → 2**（版本线那两条转绿；残下两条为 P10 那对：测试仍按旧规则要求 `^0.2.0`，与 #129 冲突，与本票无关）✅
5. `publish:pre`／`publish:tarball`（`--only base-link-core,base-combos,base-paint`）exit 0 ✅
6. 四门 `build`／`boundaries`／`snapshot:check`／`publish:pre` exit 0 ✅

## 执行方式（可复跑）

本次走交互式 wizard（副本随本目录入仓）：`wizard-publish-base-030.sh`——5 个 stage：
预检 → 登录（网页授权）→ 发 `base-link-core` → 发 `base-combos` → 验证。运行（必须 Git Bash）：

```
"C:\Program Files\Git\bin\bash.exe" D:/ilife/.scratch/t140/wizard-publish-base-030.sh
```

两条硬规矩：① 发布命令**不得重定向输出**（stdout 非 TTY 时 npm 报 `EOTP` 且不打印授权链接）；
② 登录与 2FA 审批由维护者本人在浏览器完成，agent 不代跑 `npm publish`。

## 本次发现并登记的环境事实

- **重解析路线的 `pnpm install` 在本仓不可用**：pnpm 11.8.0 对 plugin-calorie／plugin-bill-ilife 的直接依赖抛
  `pnpm: Invalid time value`（`detectMinReleaseAgeViolation` 内 `Date.toISOString`）；加 `--config.minimumReleaseAge=0`、
  换 `--registry=https://registry.npmjs.org/` 均复现。本次锁文件改为**手工同步 specifier ＋
  `pnpm install --frozen-lockfile --lockfile-only` 反向校验**（exit 0）。
- 本机 npm 登录状态由本次 wizard 的 Stage 2 现场建立（此前 `npm whoami` 为 `ENEEDAUTH`）。
