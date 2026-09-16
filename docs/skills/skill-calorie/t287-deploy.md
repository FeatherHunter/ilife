# t287 · 装机真实性记录（验收前置 ①）

票：`#287 场景 09：真机端到端 ＋ 肉眼终审`（父图 `#159`）。本件答票面的**前置 ①：agent 实际读到的是本仓新构建，不是 npm 上的旧包／陈旧拷贝**。
实测时刻：**2026-09-16 22:1x**（本机）。形状照 `t152-deploy.md` 的同名节。本件只读，未改任何安装位。

## 一、结论（一句话）

**是。** agent 读技能的那一条是 **Junction → `D:\ilife\packages\skill-calorie`**，
命令行那条也是 **Junction → 仓库本体**，两处都**不是拷贝** ⇒ 「仓改即真机改」，
本场景的 16 件产物就是这套代码跑出来的。**唯一一处陈旧拷贝不在 agent 读的那条路上**（见 §三）。

## 二、装机位实测（2026-09-16）

| 位置 | 形态 | 指向／版本 | 判据 |
|---|---|---|---|
| `C:\Users\辰辰洋洋\.agents\skills\skill-calorie` | **Junction** | → `D:\ilife\packages\skill-calorie` | **agent 读技能的那条**（技能发现根）。同目录兄弟技能 `skill-bill`／`skill-chef`／`skill-memo-ilife` 同形状 |
| `D:\2Study\nodejs\node_modules\skill-calorie` | **Junction** | → `D:\ilife\packages\skill-calorie` | 命令行 shim 走的那条 |
| `D:\2Study\nodejs\calorie-cmd-read.cmd` | shim | `"%dp0%\node_modules\skill-calorie\dist\cli\cmd_read.js"` | 逐字读过（§二·2） |
| `D:\ilife\packages\skill-calorie` | 仓库本体 | version **0.2.3** | `dist/cli/cmd_read.js` mtime **2026-09-16 22:03**，dist 共 1,426 件 |

### 1 SKILL.md 逐字比对（票面前置 ① 的判据）

| 项 | 值 |
|---|---|
| 装机位 `…\.agents\skills\skill-calorie\SKILL.md` | 77,337 B · sha256 `F0C9E773AC0FEC32…` |
| 仓库体 `D:\ilife\packages\skill-calorie\SKILL.md` | 77,337 B · sha256 `F0C9E773AC0FEC32…` |
| **逐字一致** | **是**（两者本来就是同一个文件：agent 那条是 Junction，不是拷贝） |

### 2 运行时命令入口

`where.exe calorie-cmd-read` → `D:\2Study\nodejs\calorie-cmd-read`／`.cmd`。
`.cmd` 正文最后一行逐字：

```text
endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\node_modules\skill-calorie\dist\cli\cmd_read.js" %*
```

`%dp0%\node_modules\skill-calorie` 是 Junction → 仓库本体（上表第 2 行）⇒ **命令跑的也是本仓 dist**。

## 三、一处陈旧拷贝（**不在 agent 读的那条路上**，本次验收不依赖它）

| 位置 | 形态 | 内容 |
|---|---|---|
| `C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-calorie` | **真目录（拷贝）** | version 标 0.2.3，但 `SKILL.md` 只有 **31,133 B**（sha `404F266E70A76855…`），与仓库体 **不一致** |

- 这是**插件提供方**那一层；按 `t152-deploy.md` §1.1 实测的解析规则（`collectFresh` 的 `layers=[global, …chainLayers]` ＋ `merged.set` 覆盖），
  **`~\.agents\skills\` 那条同名技能无条件盖掉它**，故 agent 读到的是新内容 ✓。
- 本次验收**不依赖**它；但它是一份会随时间越差越远的第二拷贝，已当场开票（见 §五）。

## 四、回滚（如需）

本件**没有改动任何安装位**（全部只读实测），故无需回滚。
若将来要回退那条 agent 根 Junction：`cmd /c rmdir "…\.agents\skills\skill-calorie"`，
再把遗留备份 `…\.agents\skills\skill-calorie.bak-0.2.2-t152` 改名回 `skill-calorie`（#152 留存的那份）。

## 五、遗留

- [#653](https://github.com/FeatherHunter/ilife/issues/653)（本件当场开）：**`.dsh\profiles\web\node_modules\skill-calorie` 是一份陈旧真拷贝**
  （SKILL.md 31,133 B ≠ 仓库体 77,337 B）。形制与 #152 当年处置的那条同款，只是层级不同；本件只登记读数、不动它。
- 票面另两条前置（验收页带对照物、跑写类先备份真库）在 `t287-用户验收页.html` 与 `t287-验收-runbook.md` 里；本件不重复。
