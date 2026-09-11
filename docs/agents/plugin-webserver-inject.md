## 范围与来源

- **来源**：插件侧交接文件 `C:\Users\辰辰洋洋\AppData\Local\Temp\dsh-web-profile-plugin-issues-handoff.md`（未经诊断，按原样归档）。交接原文称这三个插件都要"插件方改"，但不区分仓库归属，正文按实际归属修正如下。
- **本仓库相关面（两个包，同一处声明缺失）**：
  - `packages/plugin-calorie` = **`dsh-calorie@0.2.3`**：源码 `src/index.ts:17`、产物 `dist/index.js:14`，当前声明 `inject = ['connection', 'skills']`。
  - `packages/plugin-memo-ilife` = **`dsh-memo-ilife@0.1.0`**：源码 `src/index.ts:14`、产物 `dist/index.js:11`，当前声明 `inject = ['connection']`。
- **不在本仓库、需另行单独立单（1 个）**：`dsh-im-companion@0.1.6`（`github.com/FeatherHunter/dsh-im-companion`）。

---

## 一句话结论

web profile 之前起不来，由**两件事叠加**造成：

1. ✅ **环境里有一个假包**（别人塞的 `C:\node_modules\@deepseek-ai\dsh-llm`）—— 已清除
2. ⏳ **三个插件缺 `inject: ['webServer']` 声明** —— **需要插件方改代码**

---

## 一、待修：三个插件的 `inject` 声明（本次交接的核心）

三个插件挂载时全部报同一个错：

```
Error: failed to apply loader entry <插件名> (<插件名>):
       cannot get property "webServer" without inject
```

这是 cordis 的**声明检查**：插件（或它调用的代码）访问了 `ctx.webServer`，但没在 `inject` 里声明这个服务，于是被直接拒绝。

| 插件 | 源代码位置 | 当前 `inject` 声明 | 声明所在行 |
|---|---|---|---|
| `dsh-calorie@0.2.3` | `D:\ilife\packages\plugin-calorie`（本仓库） | `['connection', 'skills']` | 源码 `src/index.ts:17`；产物 `dist/index.js:14` |
| `dsh-memo-ilife@0.1.0` | `D:\ilife\packages\plugin-memo-ilife`（本仓库） | `['connection']` | 源码 `src/index.ts:14`；产物 `dist/index.js:11` |
| `dsh-im-companion@0.1.6` | `github.com/FeatherHunter/dsh-im-companion` | `['connection']` | `lib/index.js:7` |

### 已经排除的可能

**三个插件的 host 入口代码里都没有直接出现 `ctx.webServer`。** 已逐行读过：

- `dsh-calorie`：`dist/index.js` 全 63 行、`dist/slot.js` 全 36 行 —— 无 `webServer`
- `dsh-memo-ilife`：`dist/index.js` 前 30 行 —— 无 `webServer`
- `dsh-im-companion`：`lib/index.js` 全 36 行 —— 无 `webServer`

所以**访问点在别处**，需要插件方确认以下候选：

- **候选 A**：注册槽位/页签的公共路径（如 `dsh-calorie` 的 `registerSingle` / `openSingle`），经由 `ctx.connection.rpc` 到宿主侧
- **候选 B**：client 半（`./client`）被宿主侧装配时访问
- **候选 C**：某个尚未排查的共享模块（`settings.js` / `skill-provider.js` / 客户端注册路径）

### 建议修法

把这一个字符串加进各插件 **host 半**的 `inject` 数组：

```js
// 例：dsh-im-companion/lib/index.js:7
export const inject = ['connection', 'webServer'];
```

三个插件形态一致，可以批量修。**修完请自行确认 `webServer` 服务在目标 DSH 版本里可用**（否则插件会从「报错」变成「一直 pending」）。

### 这三个插件目前的状态

已从 `%USERPROFILE%\.dsh\profiles\web\package.json` 的 `dsh.profile.bundles` 中**临时摘除**（`dependencies` 保留，包文件还在），web profile 因此能正常启动。

修好发版后加回来即可 —— 在 `bundles` 数组里补这三行：

```json
"dsh-calorie",
"dsh-memo-ilife",
"dsh-im-companion"
```

---

## 二、已解决：假包陷阱（**不要再排查这个方向**）

这是本次排查耗时最久的原因，记录在此避免重复劳动。

**现象**：所有插件报

```
The requested module '@deepseek-ai/dsh-llm' does not provide an export named 'createUserMessage'
```

**真因**：`C:\node_modules\@deepseek-ai\dsh-llm\` 这个目录里装的**不是 dsh-llm**，而是 `dsh-plugin-desktop@2.0.4` 的代码。它的 `lib/index.js` 全文只有两行：

```js
import { ... desktopRendererUrl, ... DESKTOP_SETTINGS_NAMESPACE ... } from "./src-BXVne9FE.js";
export { Config, DESKTOP_SETTINGS_NAMESPACE, DesktopSettingsSchema, apply, desktopRendererUrl, inject, name };
```

导出里当然没有 `createUserMessage`。而 `C:\node_modules` 位于 **C 盘根目录**，Node 的向上解析最终会落到它 —— 于是所有在 C 盘的插件都被劫持。

- **性质**：旧版 DSH Desktop 卸载残留（目录创建于 2026/08/31）
- **已处理**：`rd /s /q "C:\node_modules"`（该目录下只有这一条，纯垃圾）
- ⚠️ 后续排查若再看到 `createUserMessage` 类报错，**先查有没有同类的假包**，不要再去比对 dsh-llm 的版本

**已排除的干扰项**（都验证过是正常的，不必再查）：`@deepseek-ai/dsh-llm` 从 `0.0.1-rc.1` 到 `0.1.5-rc.1` 所有已发布版本的根导出里**都有** `createUserMessage`。

---

## 三、其他相关但不同的问题（别和上面混淆）

| 插件 | 现象 | 性质 |
|---|---|---|
| `dsh-better-sidebar@0.19.0` | 0.19.0 要求 DSH ≥ **0.1.5-rc.1**，而本机 Desktop 自带运行时是 **0.1.2-alpha.1** | 版本匹配问题；若报 `SessionLogOffset` 缺失，降回 `0.18.x`。兼容矩阵见 [DSH-better-sidebar README](https://github.com/omdsh-dev/DSH-better-sidebar) |
| `dsh-prompt`（`D:\dsh-plugin\dsh-prompt`） | 曾报 `Cannot find package '@deepseek-ai/dsh-storage-domain'` | 本地开发插件；需确认目标 DSH 版本是否提供该包 |
| `dshmarket@1.44.0` | 启动日志报 `profile bundle 缺失（对账后仍存在…）: dshmarket` | 待确认是否已修复 |

---

## 四、环境事实（供排查参考）

| 项 | 值 |
|---|---|
| DSH Desktop 安装位置 | `D:\0Tools\DSH Desktop`（外壳在 `resources\app.asar`） |
| Desktop 实际使用的 harness | `%APPDATA%\DSH Desktop\agent\node_modules\@deepseek-ai\dsh` = **0.1.2-alpha.1** |
| web profile | `%USERPROFILE%\.dsh\profiles\web\package.json` |
| Desktop 日志 | `%APPDATA%\DSH Desktop\logs\desktop.log` |
| npm 全局前缀 | `D:\2Study\nodejs` |

**已清理**：机器上原本有 4 份版本各异的 DSH（`0.1.0-rc.6` / `0.1.1-rc.2` / `0.1.2-alpha.1` / app.asar），以及一个占用端口 3080 的残留 node 进程（已 kill）。

---

## 五、建议技能（suggested skills）

- **`diagnosing-bugs`** —— 定位 `ctx.webServer` 的真实访问点（本次未定位到，是下一步的关键）
- **`tdd`** —— 给这三个插件补一条"`inject` 声明完整性"的回归测试，防止再犯
- **`code-review`** —— 审查修复改动
- **`npm-publish`** —— 修完发版（`dsh-calorie`、`dsh-im-companion` 都是 npm 包）

---

## 六、参考链接

- DSH 主仓库：https://github.com/deepseek-ai/deepseek-harness
- DSH Desktop：https://github.com/anywhere-labs/dsh-desktop
- better-sidebar 兼容矩阵：https://github.com/omdsh-dev/DSH-better-sidebar
- cordis 插件规范（`inject` 语义）：见 DSH 仓库 `docs/cordis-primer.zh.md`
