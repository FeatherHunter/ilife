# HITL-0 真实记一餐（2026-09-09 · #115 数据口径）

## 数据来源

维护者口述 2026-09-09 午饭：**1000g 肥肠面**。营养值食品库无"肥肠"（`calorie.view.search` 实测 exit 4），维护者裁定按估值记。

## 记录命令（编排者执行，已获维护者明确授权）

`SKILLS_DB_PATH=D:\2Study\StudyNotes\.db`，用**真机落盘的 `skill-calorie@0.2.0`**
（`C:\Users\辰辰洋洋\.dsh\profiles\web\node_modules\skill-calorie\dist\cli\cmd_read.js`）：

`calorie.diet.add --params '{"foodName":"肥肠面","calories":1500,"protein":70,"grams":1000,"meal":"午餐","date":"2026-09-09","note":"HITL0-115"}'`

## 回执（exit 0）

`recordId=3096`；`已记一餐：肥肠面 2026-09-09 15:01:21（午餐） · 今日剩 350 卡`；落 `calorie_html/记一餐_20260909_150121.html`。

## 零触碰（§9 第 6 条）

- 真库 `D:\2Study\StudyNotes\.db\calorie_data.db` SHA256 **前**：`C1C94DBBA3EB575F18AE210E2CF894D0D63BD3E70542011BD0E890142F201D7C`（3,072,000 B，mtime 2026-08-29，11 天未动）。
- SHA256 **后**：`DC6A061B1E0979F40249E6F414070F02FE15A3C70A5C0572239332D2F41BF11C`。
- `SKILLS_DB_PATH` 未改动（复核与进程值一致）。

## 直读复核（`calorie.view.home`，`date=2026-09-09`，exit 0）

`entryCount=1`、`loggedDays=1`、`intakeCal=1500`、`proteinG=70`、`calorieGoal=1850`、`caloriePct=81.08`、`deficitToday=488`；落 `calorie_html/今日总览_20260909_150127.html`。

## 口径说明

- 记餐数值（1500kcal / 70g 蛋白）为**估值**（食品库无肥肠），由维护者拍板；餐别/分量/日期为维护者真实陈述。
- CLI 实测约束：`--params` JSON 字符串值内**不得含空格与 `#`**（含空格即 `ERR 2 未知参数`；见本次两次 exit 2），此为本体图已知行为，不属本图。
- 本文件为 #115 取证的数据底；逐字段对数见 #115 证据（待补）。

## 增补 2026-09-09（对数完成，截图待补）

- 逐字段对数已出：`docs/research/t115-panel-vs-direct.md`（数据侧**过**：16/16 metrics 全等、`entryCount=1`、直读 exit 0、同分钟同秒、真库 SHA 前后一致 `DC6A…41BF11C`）。
- 唯一原文差为 `data.output` 同秒落盘后缀 `_2`（预期命名行为，两 HTML 除时钟串外全等，非缺陷）。
- 整票仍记**阻断（缺证据）**：两处面板截图待维护者 HITL 补拍（本 agent 无 GUI 截图能力）。
