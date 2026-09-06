# ADR-0001: Node 版本线 engines>=22.13 与 doctor 检查清单（P2 #3 草案）

> 状态：草案（research/P2 分支），待脚手架落盘后执行“应用清单”；修正 02-scheme 的 requires node>=18。
> Issue: FeatherHunter/ilife#3（assignee: FeatherHunter，不 close）。

## 1. 事实基线（一手源）

- `node:sqlite` 官方引入线（nodejs.org/api/sqlite.json）：v22.5.0 引入且需 `--experimental-sqlite`；v22.13.0 / v23.4.0 去 flag（仍 experimental）；v25.7.0 进入 RC。
- 18.x / 20.x 全系无 `node:sqlite`；22.0–22.4 无；22.5–22.12 需 flag；18 已 EOL。
- 本机实测 node v24.19.0 `require('node:sqlite')` 可用。

## 2. 冻结决策

- `engines >= 22.13`（日常用 22.13+ / 24 LTS）；低于此线 doctor 判 fail 并提示升级。
- 22.5–22.12 判 warn（提示加 flag，仅过渡，不承诺）。
- CI 矩阵只跑 22.13+ / 24，不测 18/20。
- 若未来坚持 18 兼容，则禁用 `node:sqlite` 改 better-sqlite3（另议，进 skilllink 项定）。

## 3. doctor 检查项表（缺失阻断，不返空数组冒充正常）

| 项 | 判据 | 失败动作 |
|---|---|---|
| node 版本 | >= 22.13；22.5–22.12 warn | fail + 提示升级 |
| SKILLS_DB_PATH | 目录存在 + 可写（例外：换 DB 重连） | fail + toast |
| lark-cli | 存在 + 登录 + 写权限 + 端到端，四项全绿才取数 | 任一红即阻断 + toast + 一键装 |
| CLI 契约 | argv + JSON(stdout) + exit 码；非 0 走 stderr；超时 terminate + toast 降级 | 违约 fail |
| 各技能 key | skilllink 项逐包登记，面板改即时生效 | 缺 key 阻断对应技能 |
| HTML 双通道 | 路径/编码未定前只 warn（见 §4） | warn，不 fail |

## 4. HTML 待定项（原 T6 = skilllink 登记与 CLI 冻结项，完成后补）

- HTML 走 stdout 内联还是文件路径字段 + 落盘何处；编码定 UTF-8 无 BOM；手机只收 HTML 时体积上限/分页；随 envelope semver 版本化。

## 5. 应用清单（脚手架落盘时执行，diff 要点）

1. 根 `package.json` ＋ `pnpm-workspace.yaml`：加 `engines: { node: ">=22.13" }`（＋ `.npmrc engine-strict=true`）。
2. 每个 `packages/*/package.json`（skill-\* / plugin-\* / base-\* / hunter-skills）：同上 engines 字段。
3. CI（`.github/workflows/*.yml`）：matrix 只留 `22.13.x / 24.x`，删 18/20。
4. doctor 实现：按 §3 表逐项 fail/warn/toast；健康四项缺失阻断取数。
5. 02-scheme 附录 A：SKILLS_DB_PATH 默认值、lark-cli 版本、各 key 在 skilllink 项完成后补。
