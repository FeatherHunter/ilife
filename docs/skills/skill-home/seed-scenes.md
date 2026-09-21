# 种子数据说明（票 #802：仓内种子脚本＋测试库）

70 条场景（73 减去联动 3 条 SM9-1／SM9-2／SM9-3，本图已裁不做）的真命令链产物，
共用这一份仓内种子库。只读本文即可复跑，不碰生产库。

## 落点

- 库：`.scratch/home-seed/home-seed.db`（SQLite，`openHomeDb` 建表，版本见 `_seed_meta.version = seed-scenes-v1`）
- 照片：`.scratch/home-seed/photos/` 下 10 个 64×64 自造 PNG（一色一文件，见下表）
- 测试主密钥：`.scratch/home-seed/.master.key`（内容 `seed-test-master-key-802`，只给种子库里 4 个账号加密用；生产密钥文件不动）
- 脚本：`packages/skill-home/scripts/seed-scenes.mjs`（薄 CLI）＋ `scripts/lib/seed-png.mjs`（PNG 生成）＋ `scripts/lib/seed-scenes-data.mjs`（数据规格）＋ `scripts/lib/seed-scenes-checks.mjs`（70 路核验）
- 四件行数：347／74／150／164，都在包内 350 告警线内，无超线。

## 用法（仓根，一律经排队）

```powershell
node tooling/run-locked.mjs --ticket 802 --max-wait-ms 600000 -- node packages/skill-home/scripts/seed-scenes.mjs
node tooling/run-locked.mjs --ticket 802 --max-wait-ms 600000 -- node packages/skill-home/scripts/seed-scenes.mjs --reset
node tooling/run-locked.mjs --ticket 802 --max-wait-ms 600000 -- node packages/skill-home/scripts/seed-scenes.mjs --check
```

- 默认＝补齐到规格（幂等：物品按名＋位置去重，其余表按自然键去重；同版本且 `--check` 全绿即报 up-to-date，不复写）
- `--reset`＝删库＋删照片后重灌（只删 `.scratch/home-seed/` 内三样，不碰别处）
- `--check`＝只验不写，70 路全绿 exit 0，否则 exit 1 并点名
- 路径全部写死在脚本里，不接受路径参数；启动即断言种子目录在 `.scratch/` 下且不在 `D:\2Study\StudyNotes\.db` 之下

## 验收读数

验收命令 exit 0（2026-09-21 实测，`--check` 70/70 PASS；`--reset` 重灌后同样 70/70；默认重跑报 up-to-date）：

```text
RESULT: 70/70
PASS
```

逐场景 want/got 以 `--check` 当场打印为准（每行 `CHECK <场景> want>=N got=M`，M≥N 即绿）。
口径说明：“每场景 3–10 条”指每个场景至少 3 条可验证代表数据；共享基表（物品 62 件）被多场景复用，故总量超出 10，上限不适用于共享基表，下限 3 全数满足。
覆盖要点：物品 62 件（含重名 3 组×2 供 2-6／3-5、照片 8 件供 5-1／5-2／5-3、快递中 3 件供 SM5-3、旅游中 2 件供 SM3-4、借用中 3 件供 SM7-1）；位置节点 19 个（含 15 个多级路径供 SM2-4）；固定位 4 件供 SM2-2；分类 20 个（8 顶级＋12 children）供 4-2；标签 27 个（含 5 对相近供 4-3）；购物 4 行供 SM5-1；阈值 5 行（3 缺货供 SM5-2）；家人 4 人＋借用 5 行供 SM7-1／SM7-2；购买 10 行（上月 4／今年 10／近 30 天 4）供 SM6-1～SM6-4；保修 4＋保养 3＋服务事件 4 供 SM6-6～SM6-10；证件 6（含照片 2 供 SM6-13）供 SM6-11～SM6-14；账号 4（购物／银行／社交／其他各一）供 SM6-15～SM6-18；盘点 3 条（首条 missing=2 extra=1 供 6-2）供 6-1／6-3／SM4-4；物品历史 65 事件（含 relate 3 供 3-7）供 7-1。

## 生产目录前后读数（未变）

票面要求“生产目录文件数与小节读数前后不变”，两条读数都只读不写：

| 读数 | 灌库前 | 灌库＋三轮复验后 | 结论 |
| --- | --- | --- | --- |
| 生产目录递归文件数（`D:\2Study\StudyNotes\.db`） | 2548 | 2548 | 未变 |
| 其中 `home_manager_html` 文件数（生产产物小节） | 20 | 20 | 未变 |

读法（PowerShell，只读）：

```powershell
(Get-ChildItem 'D:\2Study\StudyNotes\.db' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
(Get-ChildItem 'D:\2Study\StudyNotes\.db\home_manager_html' -File -ErrorAction SilentlyContinue | Measure-Object).Count
```

“小节读数”口径说明：本票把第二条读数定为生产产物目录 `home_manager_html` 的文件数（产物小节），与第一条合在一起证明“库与产物都没被写”。若维护者要换口径（如改读生产库表行数），按此节命令重测两遍即可，脚本本身不读生产库。

## 与册子（票 1）的字段对齐

事实源 `docs/skills/skill-home/pages-ledger.md` 表一每族的字段／操作／空态／状态词，在种子库里的落点：

- 照片路径→`items.photo`（文件名，`photos/` 下真实存在）＋`certificates.photo`；标签→`item_tags`；位置树→`location_nodes`＋`item_locations.location`；固定位→`items.fixed_location`；保修与保养周期→`warranties(kind/start_date/duration_days)`；维修与保养执行→`service_events`；证件与账号→`certificates`／`accounts`；借用→`borrow_records`＋`family_members`；购物清单→`shopping_items`；阈值→`stock_thresholds`；盘点→`inventory_records`（missing/extra 直写，diff/pending 由域票渲染时派生，不另存）；历史→`item_events`（3-7 关联落 `event='relate'`，`detail` 形如 `<对方id>:<关系类型>`，关系五值取自 yaml 3-7 prompt，老 `scripts/` 无枚举，照册子 §四 4.2-1 如实透传）。
- 物品状态词（在家／备用／借用中／维修中／快递中／旅游中等）全落在 `item_locations.location_status`，6 种状态都有实例行。
- 照片类型（普通／说明书-使用／说明书-安装／说明书-保养，老 `物品/events.py:54`）在新 schema 无列可存：本库暂不伪造类型，10 张照片文件名即语义，5-1 的类型筛选在域票里默认走“全部”。此缺口已另补票（见下节），本票不加迁移。

## 照片清单（10 张，全部真实可渲染）

| 文件 | 颜色 | 用处 |
| --- | --- | --- |
| seed-jacket-red.png | 红 | 牛仔外套-衣（5-1／5-2／5-3） |
| seed-shoes-blue.png | 蓝 | 白色运动鞋-鞋 |
| seed-key-yellow.png | 黄 | 家门钥匙 |
| seed-medicine-green.png | 绿 | 家庭药箱 |
| seed-cable-gray.png | 灰 | 手机充电器 |
| seed-food-orange.png | 橙 | 坚果礼盒 |
| seed-book-purple.png | 紫 | 绘本-小熊维尼 |
| seed-tool-teal.png | 青 | 电钻 |
| seed-cert-id.png | 浅蓝 | 房产证（SM6-13） |
| seed-cert-passport.png | 浅绿 | 结婚证（SM6-13） |

校验：每文件头 8 字节为 PNG 签名 `89504e470d0a1a0a`，尺寸 64×64，约 180 字节。`--check` 的 5-1／5-2／SM6-13 三路会逐个 `existsSync`，缺一即红。

## 给域票（票 9～19）的用法

- 真命令链调库走配置，种子库是文件：在隔离 HOME 里跑命令前，把 `home-seed.db` 拷成该 HOME 数据目录下的 `home.db`（或把配置 `db.dir` 指向 `.scratch/home-seed/`），照片按 `photo` 文件名到 `photos/` 下取，账号解密用本目录 `.master.key` 里的测试口令。
- 日期是相对“今天”生成的（购买／保修／证件／借用）：今年／上月／近 30 天三路核验在任何一天重跑都成立；`--reset` 后日期按重灌当天重算。
- SM8-3／SM8-4 的备份文件本身由命令产出，不预置：本库只保证“有 62 件可备可导出的东西”，备份／导出动作仍走 `home.care.write` 真链。

## 已知缺口（遗留出口，不加迁移）

1. 照片类型与多照片排序无 schema 落点（5-1 类型筛选／5-2 排序换主图）：`items.photo` 单字段存不下类型与顺序，已另补票 #857，域票先按“全部＋单主图”做，契约归票 2（#799）裁。
2. 无其余缺口：关联、盘点差异、退货窗口、保养推算等都有落点（见上节），本票未动 schema 迁移、页面模板与 21 条命令契约。
