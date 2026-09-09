# #115 真机面板对数取证（面板数 = 直读 · 2026-09-09）

- 票：#115（地图 #64 打通图 · 腿1.3，口径 `docs/calorie-dual-path-acceptance.md` §2.3）。
- 数据底：HITL-0 维护者 2026-09-09 真实午饭「1000g 肥肠面」（`recordId=3096`，估值 1500kcal/70g 蛋白），见 `docs/research/t115-hitl0-meal.md`。
- 数据标注：**真机真实数据**（真库直读，非副本、非哨兵、非合成）。

## 1 结论速览

| 项 | 结果 |
| --- | --- |
| 数据对数（`panel.data` vs `direct.data`） | **过**：顶层键一致、16/16 metrics 全等、`key/shape/skill` 正确、`entryCount=1>0`、直读 `exit=0`、同分钟同秒、真库 SHA 不变 |
| 唯一原文差 | `data.output`（落盘 HTML 路径）差同秒冲突后缀 `_2`——预期行为（`packages/skill-calorie/src/output.ts:5` 同秒追加 `_(N+1)`），两 HTML 内容除时钟串外全等，非缺陷 |
| 整票判定（§5 三分） | **阻断（缺证据）**：两处面板截图待维护者 HITL 补拍（本 agent 无 GUI 截图能力，§2 见精确补拍要求）。数据侧已全部就绪，不得用"空库同文"顶替，不适用 |

## 2 面板两处截图（⚠ 缺证据 · 待 HITL 补拍）

| # | 位置 | 须含内容 |
| --- | --- | --- |
| ① | 设置 → 爱生活（`dsh-life-pack` 卡）→ 卡路里页签 | 日期 + 版本行 `dsh-calorie 0.2.0 · skill-calorie 0.2.0`。"有字但字是报错"不算点亮 |
| ② | 边栏（`dsh-better-sidebar` 槽）→ 卡路里页签 | 同上 |

- 落点约定：补拍后存 `.scratch/t115/shot-settings-lifepack.png`、`shot-sidebar.png`（本 agent 路径所有权内），并在本文件登记"可打开"（尺寸/字节/肉眼可读日期+版本行）。
- "可复制/可机器读取的面板侧文本"已用面板生产实现取得（§3 面板路 = `handleHostCall→readViaCli`，与面板同键同参同 DB 同刻），截图仅作真机旁证（§9-2/§9-3）。

## 3 面板路（panel.data · 与面板同实现）

- 方法：`import { readViaCli } from '<profile>/node_modules/dsh-calorie/dist/bridge.js'`（真机落盘 `dsh-calorie@0.2.0`），`readViaCli('calorie.view.home', {date})` 即面板 `handleHostCall` 的生产路径（spawn 真机 `skill-calorie` CLI，argv 数组，无 shell 引号问题）。
- 取数时刻：2026-09-09 15:04:12（与直读同分钟同秒，§2.3 同刻 ✓）。
- 全文：`.scratch/t115/panel-data.json`（`metrics` 16 键 + `output` 路径）。

## 4 直读路（direct envelope 原文 · exit 0）

命令原文（逻辑命令；PowerShell 5.1 原生传参会吞 JSON 内层双引号——实测 `argv` 收到 `{date:2026-09-09}` 报 `ERR 2`，
故用 argv 数组直传的 runner 执行，见 §6）：

```powershell
$env:SKILLS_DB_PATH='D:\2Study\StudyNotes\.db'
node "$env:USERPROFILE\.dsh\profiles\web\node_modules\skill-calorie\dist\cli\cmd_read.js" calorie.view.home --params '{"date":"2026-09-09"}'
# exit=0（`$LASTEXITCODE`，见 .scratch/t115/run-compare.log MARK 行；runner 用同语义 argv 数组）
```

envelope 原文（`.scratch/t115/direct-envelope.json` 全文）：

```json
{"version":"0.1.0","skill":"calorie","shape":"stat","key":"calorie.view.home","data":{"metrics":{"calorieGoal":1850,"waterGoal":4000,"caloriePct":81.08,"proteinPct":51.85,"waterPct":0,"deficitToday":488,"streakDays":1,"intakeCal":1500,"proteinG":70,"carbsG":0,"fatG":0,"waterMl":0,"entryCount":1,"avgIntake":1500,"avgDeficit":488,"loggedDays":1},"output":"D:\\2Study\\StudyNotes\\.db\\calorie_html\\今日总览_20260909_150412_2.html"}}
```

- `key=calorie.view.home` ✓ / `shape=stat` ✓ / `skill=calorie` ✓（防读错键但数碰巧相同）。
- 取数时刻：2026-09-09 15:04:12，直读 `exit=0`。

## 5 逐字段判定表（`panel.data` vs `direct.data`）

顶层键：panel=`[metrics,output]`，direct=`[metrics,output]`，**一致**。

| metrics 字段 | panel | direct | = |
| --- | --- | --- | --- |
| avgDeficit | 488 | 488 | = |
| avgIntake | 1500 | 1500 | = |
| calorieGoal | 1850 | 1850 | = |
| caloriePct | 81.08 | 81.08 | = |
| carbsG | 0 | 0 | = |
| deficitToday | 488 | 488 | = |
| entryCount | 1 | 1 | = |
| fatG | 0 | 0 | = |
| intakeCal | 1500 | 1500 | = |
| loggedDays | 1 | 1 | = |
| proteinG | 70 | 70 | = |
| proteinPct | 51.85 | 51.85 | = |
| streakDays | 1 | 1 | = |
| waterGoal | 4000 | 4000 | = |
| waterMl | 0 | 0 | = |
| waterPct | 0 | 0 | = |

- metrics 差异字段清单：**全等（无差异，16/16）**。
- `data.output` 差异：panel=`…\今日总览_20260909_150412.html` vs direct=`…\今日总览_20260909_150412_2.html`——
  同一秒内先后两次读、第二次触发同秒冲突后缀 `_2`（`output.ts:5`、`cmd_read.ts:12` 明文规则）。
  两 HTML（各 2366B/2490 chars）除 `HH:MM:SS` 时钟串外**全等**（`run-verify.log`）。此为落盘命名预期行为，**非数值缺陷，不开修复票**。
- 机器判定：`.scratch/t115/verify-offline.mjs`（纯 JSON 离线复核，不触 DB）→ `VERDICT: 过`（`run-verify.log` 全 PASS，exit 0）。

## 6 版本元组 + 取证日期 + 命令/exit

- `skill-calorie@0.2.0`（真机落盘，真实目录非 junction）/ `dsh-calorie@0.2.0`（同）/ `dsh-life-pack@0.2.0` / `base-paint@0.2.0` / `dsh-better-sidebar@0.18.0`。
- `git rev-parse --short HEAD` = `7d63b38`。取证日期：2026-09-09（取证日 = 被比较日 = 当天，面板写死读今天 ✓）。
- 命令原文：§3（面板路 runner 调用）+ §4（直读逻辑命令）；`exit code`：面板路 OK（无抛错）、直读 `exit=0`、离线复核 `exit=0`。
- runner：`.scratch/t115/panel-vs-direct.mjs`（学 `demo-panel-vs-direct.mjs` 方法：`spawnSync` argv 数组 + `readViaCli`；差异：用**真机落盘包** + **真库只读**，替代 demo 的工作区包 + 临时库）。
- 既有复现日志：本仓 `.scratch/t69/` 下**只有 `demo-panel-vs-direct.mjs`，无 `demo-log.txt`**（已全仓搜 `demo-log.txt`，零命中）——§7"已归档 3 份"不在本仓可及处，如实记，未确证。

## 7 零触碰（§9-6）

- 真库 `D:\2Study\StudyNotes\.db\calorie_data.db` SHA256 **前**：`DC6A061B1E0979F40249E6F414070F02FE15A3C70A5C0572239332D2F41BF11C`（= HITL-0 记餐后值，无漂移）。
- SHA256 **后**（对数全部完成后）：`DC6A061B1E0979F40249E6F414070F02FE15A3C70A5C0572239332D2F41BF11C`。**前后一致**。
- `SKILLS_DB_PATH`（User 层）未改动。本脚本只调读键 `calorie.view.home`，无任何写键调用。
- 披露：读命令默认落盘副作用（#87 既有行为，HITL-0 同样）在真库 `calorie_html/` 新增 2 个文件：
  `今日总览_20260909_150412.html`（面板路）、`今日总览_20260909_150412_2.html`（直读路）。`calorie_data.db` 本体未动（SHA 为证）。

## 8 §9 七条证据质量清单对照

1. **可复现** ✓：命令原文（§3/§4/§6）+ exit code + 版本元组 + 取证日期齐全；runner 与离线断言脚本均入仓（`.scratch/t115/`）。
2. **可打开** ⚠ 待补：截图缺（§2）；HTML 产物存在（2 文件，2366B，非空，含页面标记——内容已比对全等）。
3. **机器可判** ✓：`verify-offline.mjs` 全 PASS + `VERDICT: 过`，人工只作旁证。
4. **数据标注** ✓：真机真实数据（HITL-0 当天真餐，`entryCount=1`）；无副本/哨兵混用；非空库同文。
5. **版本一致** ✓：全部证据同一元组（0.2.0×4 + HEAD `7d63b38`），单次取证无跨版本。
6. **零触碰** ✓：SHA 前后一致（§7），`SKILLS_DB_PATH` 未变。
7. **无替代品** ✓：两路 `exit=0` 且逐字段全等记过（截图缺记阻断，不顶替）；`output` 后缀差已逐字节定性为预期命名行为，非"看起来差不多"。

## 9 未确证项

- 两处面板截图（§2）：待维护者 HITL 补拍后，本文件增补"可打开性说明"并重新 commit。
- `demo-log.txt` 3 份复现日志：本仓无命中，未确证其落点（§6）。
- 面板进程的 `SKILLS_DB_PATH`：本取证用面板生产实现（`readViaCli` spawn）继承本进程 env（= 真库）；DSH 宿主进程的 env 值未独立读取——面板真机显示值待截图旁证闭环。
