# 票据凭证域（一）·购买记录与保修保养 10 条对账（#813）

本域 10 条（SM6-1～SM6-10）各出一份真产物，两族承载：`purchase_records`（SM6-1～SM6-5）与 `warranty`（SM6-6～SM6-10）。信息结构对齐老页面 `票据凭证/purchase_records.html`（购买时间／价格／渠道／退货窗口／分类统计／顺路提醒）与 `票据凭证/warranty.html`（在保／即将到期／维修记录／保养周期），界面走新仓共用件（`SHARED_CSS` 极简表＋`fillTemplate` 三标记）。

## 场景与产物

戳 `20260921_163205`，命名 `<命令中文名>_<场景id>_<戳>.html`（票 2 契约唯一算法）。产物与墙同目录 `.scratch/813/`（工作区内，视觉验收墙 §5）。

| 场景 | 唤醒词 | 命令 | 产物文件 | 该确认什么 |
|---|---|---|---|---|
| SM6-1 | 查购买记录 | `home.ticket.query {"kind":"purchase"}` | `查购买记录_SM6-1_20260921_163205.html`（2498 字节） | 购买时间价格渠道退货窗口是否齐全，分类统计笔数金额是否对得上 |
| SM6-2 | 查上月购买 | `home.ticket.query {"kind":"purchase","range":"last-month"}` | `查上月购买_SM6-2_20260921_163205.html`（2498 字节） | 时间预填为上月且清单仅含上月购买 |
| SM6-3 | 查今年花费 | `home.ticket.query {"kind":"purchase","range":"year"}` | `查今年花费_SM6-3_20260921_163205.html`（2587 字节） | 年度总额与分类聚合是否正确 |
| SM6-4 | 查退货窗口 | `home.ticket.query {"kind":"purchase","range":"return","item_id":1}` | `查退货窗口_SM6-4_20260921_163205.html`（2498 字节） | 指定物品的购买信息加退货截止日是否明确 |
| SM6-5 | 登记购买记录 | `home.ticket.write {"kind":"purchase","op":"add","item_id":1,"date":"2026-09-11","price":88.8,"channel":"山姆"}` | `登记购买记录_SM6-5_20260921_163205.html`（2553 字节） | 回执单号日期价格渠道退货窗口是否落盘，下次可在查购买记录复核 |
| SM6-6 | 查保修状态 | `home.ticket.query {"kind":"warranty"}` | `查保修状态_SM6-6_20260921_163205.html`（2756 字节） | 在保即将到期已过状态徽章与到期日剩余天数是否齐全 |
| SM6-7 | 登记保修 | `home.ticket.write {"kind":"warranty","op":"register","item_id":1,"start_date":"2026-01-01","duration_days":365}` | `登记保修_SM6-7_20260921_163205.html`（2620 字节） | 回执单号起始日时长到期日自动计算是否明确 |
| SM6-8 | 记录维修 | `home.ticket.write {"kind":"warranty","op":"repair","warranty_id":1,"date":"2026-09-15","cost":50}` | `记录维修_SM6-8_20260921_163205.html`（2620 字节） | 维修费用备注是否进服务事件，回执单号是否可查 |
| SM6-9 | 设置保养周期 | `home.ticket.write {"kind":"warranty","op":"cycle","item_id":2,"start_date":"2026-09-01","duration_days":90}` | `设置保养周期_SM6-9_20260921_163205.html`（2626 字节） | 周期时长下次保养日自动推算是否明确 |
| SM6-10 | 执行保养 | `home.ticket.write {"kind":"warranty","op":"maintain","warranty_id":2,"date":"2026-09-16"}` | `执行保养_SM6-10_20260921_163205.html`（2620 字节） | 上次保养日刷新与下次日推算是否明确 |

清单 `manifest.json`（10 行，字节与盘上逐字节对账），双墙 `票据凭证-1-手机墙.html`（390 宽 10 格）与 `票据凭证-1-桌面墙.html`（1280 宽 10 格）加 `总索引.html`（ wall 生成器附带）。

写类 6 条（SM6-5／SM6-7～SM6-10，老技能只打回执不落页）本票各出一份回执页：回执单号（`已登记购买／已登记保修／已记录维修／已设置保养周期／已执行保养`）加派生指引（退货截止按购买日加窗口推算，到期日按起始日加时长推算，下次保养按上次执行加周期推算），复核入口指向查购买记录／查保修状态。

## 页族改动

只改两族装配件（写集内），模板壳不动：

- `src/receipt/pages/purchase_records.ts` 与 `src/receipt/pages/warranty.ts`：`FAMILY`／`PAGE_META`／`REQUIRED_BLOCKS` 一字未动（三方对账仍绿）；`renderFamilyPage` 可见层改中文（族头 `购买记录`／`保修与保养`，必需块转述如编号代替 `ID`、若干代替 `N`、去掉版式位分隔符），原文完整保留在 `li[data-need]` 属性里（结构判据查原文包含，属性即命中）；收据形加一段中文派生指引（不复述回执原文，避免机审重复句进红）。

行数：两件各约 110 行，告警线 350 内，无超线。

## 验收读数（2026-09-21，持锁跑）

① `node tooling/run-locked.mjs --ticket 813 --max-wait-ms 600000 -- node --test packages/skill-home/test/receipt-1.test.mjs`：21／21 绿（10 回执形状＋三方对账＋10 装配含块且可见层无拉丁字母）。

② `node tooling/run-locked.mjs --ticket 813 --max-wait-ms 600000 -- node docs/skills/skill-home/gen-scene-wall.mjs --check .scratch/813 票据凭证-1-手机墙.html` 与桌面墙同：各 `10 格；链接 31 条；缺失 0 -> 可发`，exit 0。

③ 分隔符：10 份产物逐份点名跑 `audit-separators.mjs`，`10／10 PASS`（版式位 0、英文 0、重复 0；`.cmd` 行节点命中 1 属模板原文，不进红）。墙与总索引是墙生成器支架页（含命令原文与族名英文），不在本域产物口径内（见下节）。

④ 结构块：10 份产物 `purchase_records` 族 `21／21`、 `warranty` 族 `25／25`，`10／10 PASS`（`--blocks packages/skill-home/scripts/page-blocks.json`；文件名 `_SM6-N_` 段命中族 pattern）。

## 口径说明（票面 shorthand 与脚本用法的三处差）

- 票面③写 `audit-separators.mjs .scratch/813`，脚本位置参数是文件表（目录须走 `--dir`）；且 `.scratch/813` 含墙与索引支架页（英文必红），故本票按“本域每份产物”口径逐份点名 10 份产物跑，墙由②自检覆盖。
- 票面④写 `audit-page-blocks.mjs .scratch/813`，脚本要求 `--dir` 加 `--blocks`；同理只断 10 份产物（墙支架页无 `.page`／`.cmd` 壳，必红，不属本域产物）。
- 模板壳未动，但页模块已填中文可见层，故 `new-scene-page.mjs --check` 对本两族报 `DIFF`（骨架精确比对）。三方对账（附录／登记表／页模块 `REQUIRED_BLOCKS`）仍绿；`--check` 的精确文本门待收口票（#817）统一裁（11 张域票都会改动各自页模块，精确比对届时必红）。

## 遗留出口

- 无需回写票 2：两族一族一装配件现状可装下查与写（查 list、写 receipt 经 `shape` 分流同一页内），未触发“必须共用／必须拆分”裁决。
- 契约与判据的英文口径（`ID`／占位 `N`／族名蛇形／命令键）在可见层已由本票转述消化；若契约未来把转述收进附录原文，本两件跟进把 `visibleOf` 表删掉（行为不变）。
- 账号密码永不明文进页：本域不涉账号（归 #814），保修保养无敏感列。
