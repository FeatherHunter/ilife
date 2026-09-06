# 居家管家迁移拆分确认（一期 #17，P9 已冻）

老家只读对照 `D:\2Study\StudyNotes\SKILLS\居家管家`：py 核心 96（总量 392 含 .scratch/.notes 调试杂项，不迁）约 21.6k 行，SKILL.md 801 行，tests/ 约 71（pre-commit 断言），templates/ 60+ html（含 8 域子目录），scenarios 73（9 域：items 29/receipt 18/outfit 5/space 4/stats 4/express 4/setup 4/link 3/family 2），有 DB（home.db：items/item_locations/item_tags/categories/accounts + D1 域表 purchase_records/warranties/service_events/certificates/family_members/borrow_records/shopping_items/stock_thresholds/item_events/inventory_records/location_nodes），无 lark-cli 同步口径（联动为跨技能 prompt 复制，combos 登记走后续票），联动 21 处（本表）。

## 三层去向（包 packages/skill-home，新建零冲突面，布局对标 skill-memo/schedule）

| 层 | TS 去向 | 老家对照 | 归属 |
|---|---|---|---|
| 取数 | src/fetch/db.ts（sqlite home.db：5 基础表 + D1 9 域表，幂等建表 + 8 顶级种子；SKILLS_DB_PATH 必设，Q6 fallback 链不继承）+ paths.ts（必设 + tmp 隔离哨兵 HOME_FORCE_PROD） | scripts/home_manager/db.py（init_db + 5 表 + D1 ensure_d1_domain_tables）、references/database.md、references/categories.md（277 节点，TS 播 8 顶级种子，余按需增） | 取数 |
| 口径 | src/policy/category.ts（8 顶级 + 位置两级 + 11 状态机 + 食品判定关键词）+ item.ts（add/update/history/photo 校验，op 分流）+ ticket.ts（purchase/warranty/cert/account 校验，kind+op 分流）+ care.ts（family/setup 校验）+ wakewords.ts（88 短语→21 key，最长匹配，废弃词 3 不路由） | references/commands.md、references/statuses.md、features/add.md/search.md/update.md、scripts/票据凭证/cli.py、scripts/快递购物/cli.py、scripts/开始使用/cli.py、scripts/家庭协作/family_ops.py、references/scenarios.yaml（73 场景 + 变体语料储备行为待激活不迁） | 口径 |
| 渲染 | src/render/envelope.ts（21 key×shape）+ views.ts（21 键数据装配）+ html.ts（section+三标记 + 看密码 HTML 脱敏占位）+ templates/21（60+→21 合并，1 键 1 模板） | scripts/render/_shared.py、scripts/物品/cli.py 各 HTML 分支、templates/ 60+（物品 20/位置 7/穿搭 6/联动 4/票据凭证 4/快递购物 5/开始使用 5/stats 4/顶层 12） | 渲染 |
| 出口 | src/cli/cmd_read.ts（argv+JSON+exit，21 键分发，写走 receipt；缺 key 2/未知 3/缺失 4/预检 1；超时 terminate+TOAST） | scripts/home_manager/home_manager.py（17 子命令）+ 票据凭证/cli.py + 快递购物/cli.py + 开始使用/cli.py + 联动/cli.py（sm9 3 场景不迁） | 出口 |
| SKILL | SKILL.md 重写+HELP 互联注入（88 行速查表，构建期静态文本；联动 3 词废弃不进 HELP） | SKILL.md 801 行路由表 95 行（含 3 HTML 变体 + 4 账号重复）、references/scenarios.yaml、居家管家.html 手册镜像（总纲 04 镜像原则不继承，TS 以 templates 快照为准） | SKILL |
| 收尾 | 21 联动对表+tmp 单测+仓内零 py（老家只读不动） | tests/ 71、output/ 产物、.scratch/、.notes/、__pycache__/、.pytest_cache/、HOME_PHOTOS_DIR 二进制、location_nodes 回填数据、item_events 审计链 | 收尾 |

## 联动 key×shape 映射（21 处；key 字符串后续票落表时冻结；analysis/fallback 全 key 可用）

```home-keys
home.item.search | list
home.item.detail | detail
home.item.add | receipt
home.item.update | receipt
home.tag.query | list
home.tag.write | receipt
home.inventory.round | receipt
home.inventory.records | list
home.location.query | list
home.location.write | receipt
home.outfit.pick | list
home.trip.manage | receipt
home.stats.overview | stat
home.stats.alert | list
home.shopping.query | list
home.shopping.write | receipt
home.ticket.query | list
home.ticket.write | receipt
home.care.query | list
home.care.write | receipt
home.help.lookup | list
```

老家联动 21 处对照（消费侧，combos.yaml 已冻结，本票不登记，后续票落表）：items 搜索/详情/录入/更新/标签查/标签改/盘点核对/盘点记录（8）+ space 位置查/位置改（2）+ outfit 穿搭选/出行清单（2）+ stats 总览/闲置过期（2）+ express 购物查/购物改（2）+ receipt 票据查/票据改（2）+ family/setup 协作查/协作改（2）+ HELP 现找（1）。跨 skill 路由（记到卡路里/记到记账/联动总览 3 词）为废弃词，本技能只暴露上表 21 键；历史/照片墙折入 detail（view 分流），管照片折入 update（photo 参数），闲置/过期折入 alert（kind 分流），购物改新增唤醒词“改购物清单”（老家无直接词，补齐写链）。

## 出 scope（不迁）

- 定时任务：老家零定时代码（仅文档废弃声明），外部定时任务以外置为准。
- 面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，P8 已冻结，走后续票；SM9 3 场景 prompt 复制执行不迁，仅废弃词声明）。
- output/（home_manager_html 产物）、居家管家.html 手册镜像、reports/、.scratch/、.notes/、.bak/、.db/、__pycache__/、.pytest_cache/、HOME_PHOTOS_DIR 照片二进制、location_nodes 全量回填数据、item_events 审计链、category_manager import --merge 全量 277 节点（TS 播 8 顶级种子，余按需增）、scenarios.yaml variants 变体语料（储备行为待激活不迁）、lark-cli 二进制、accounts 明文密码（TS 改 AES-256-CBC + master-key 8 位门）。
- 旧版 categories NOT NULL 重建补丁、items.category 老字符串过渡字段（TS 新库 category 可空 + category_id 外键，读时 fallback）、add 硬约束 tags≥10/remark 非空（TS 放宽为可选，口径文档声明）。

## lark-cli 外置口径

无。本技能无飞书同步口径；账号密码走 master-key 本地 AES（8 位门，缺失/过短阻断 exit 2，不返空）；照片路径走 HOME_PHOTOS_DIR 可选（缺失仅告警，不阻断取数）。

## 环境与验收

- SKILLS_DB_PATH（必设，无默认值）+ HOME_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md；真实数据禁迁，测试 tmp 隔离；仓内零 py（本包全 TS，老家只读对照）。
- 验收：按此表开工；test/home-split.test.mjs 钉死映射合法性（key 命名空间+6 形状）与定时/联动出 scope。
