# T12 #38 · 迁移回滚说明与三代收敛规则（老库复制件 → 新库一次性）

> 范围：#14 一期内；老家只读对照；面板/定时/外联动 out of scope。
> 真实数据零触碰：src 永远 readOnly 打开（DatabaseSync readOnly，从不写 src，前后 stat 记入报告）；
> dst 写守卫（paths.assertWritablePath：非 tmp 须 CALORIE_FORCE_PROD=1）；测试一律 tmp 隔离、可重跑。
> 老家：D:/2Study/StudyNotes/SKILLS/卡路里/scripts/db.py（只读对照，不跑不动 Python）；
> 新 schema：packages/skill-calorie/src/schema.ts（T1 #20，11 终态表 + applyMigrations 收敛单线）。

## 1. 脚本路径与用法（一行命令）

- 核心（TS，Drizzle 化新 schema 口径）：`packages/skill-calorie/src/migrate/migrate.ts`
  （导出 migrateCalorieDb / formatReportText / MigrateMissingError / MigrateVerifyError）。
- 入口（CLI）：`packages/skill-calorie/scripts/migrate-calorie.mjs`
- 测试：`packages/skill-calorie/test/migrate-t12.test.mjs`（tmp 合成老库复制件，重跑幂等 + 对账断言）
- 一行命令：
  `node packages/skill-calorie/scripts/migrate-calorie.mjs --src <老库复制件.db> --dst <新库.db> [--json <报告.json>]`
- 退出码：0 成功；1 预检（node<22.13）；2 用法（缺参/未知参/src==dst）；3 缺失（src 缺/空库/dst 拒绝写）；
  4 对账不一致（已回滚）；5 IO/其他。成功打人读对账表；失败一律 stderr，不返空报告。

## 2. 三代收敛规则（body_photos / measurements / composition 的 _new / _mig）

老家真相（scripts/db.py 全文已读）：
- 只有 body\_composition 真有过两代重建临时表：body\_composition\_new（2026-08-02 加 gym 重建）、
  body\_composition\_mig（2026-08-03 皮褶去 NOT NULL 重建）；正常结束时已 RENAME 回 body\_composition，
  残留只出现在崩溃中断的复制件里。body\_photos / body\_measurements 在老家从无 \_new/\_mig，
  但复制件若存在同名残留表（一键回归/手工备份），一律同规则收敛（以 T1 schema 为准）。
- 另有两类遗留：entries→food\_log 合并（2026-07-12）；sleep\_records / fitness\_goals 删除（不同步）。

收敛规则（本脚本 COPY\_ORDER 确定序，见 migrate.ts srcCandidates/orderOf）：
1. 来源组：food\_log ← {food\_log, entries}；body\_photos ← {body\_photos, body\_photos\_new, body\_photos\_mig}；
   body\_measurements ← 同模式三表；body\_composition ← {body\_composition, body\_composition\_new, body\_composition\_mig}；
   其余 7 终态表只收基表。sleep\_records / fitness\_goals / body\_composition\_new/\_mig 在新库永不建表。
2. 行序：基表→\_new→\_mig→entries，同表内 id 升序。dst 每表先 DELETE 再重插，保证幂等。
3. 冲突宁可多记不可丢：跨世代同 id 不同行 → 保留全部，\_new/\_mig 碰撞行分配新 id（maxId 递增，确定性），
   记入报告 remapped（表/fromTable/oldId→newId，本次演练见汇报）。
4. 唯一例外 workout\_plans UNIQUE(week\_number, day\_of\_week, session\_index)（T1 schema 唯一约束）：
   同键只保留最小 id 行，其余跳过记入 uniqueConflicts（key/keptId/droppedId/fromTable），差异即回滚说明本节。
5. 列差：按“src∩dst 交集列”复制；exercise.intensity（中文低中高）不建终态列，仅一次性映射
   低→easy / 中→normal / 高→hard（T1 M5 口径，difficulty 非空优先）；缺列走 dst 默认值
   （nutrition\_products.source='未知'/is\_deprecated=0/category='' 等）；复制后跑 applyMigrations 回填
   （food 钠糖纤维 ROUND(…,1)、daily\_goal 增量列、废弃标记等）。
6. CHECK/触发器失败即整库回滚（见 §4），不跳行、不丢错。

## 3. 行数对账表（模板；每次运行 CLI 自动打印）

| 终态表 | src 收敛来源 | src收敛行数 | dst行数 | 结果 |
|---|---|---|---|---|
| nutrition\_products | 基表 | — | — | OK |
| food\_log | food\_log + entries | — | — | OK |
| daily\_goal | 基表 | — | — | OK |
| exercise\_log | 基表（intensity→difficulty） | — | — | OK |
| weight\_log | 基表 | — | — | OK |
| workout\_plan\_config | 基表 | — | — | OK |
| workout\_plans | 基表（UNIQUE 去重数见报告） | — | — | OK |
| body\_photos | 基表+\_new+\_mig | — | — | OK |
| user\_profile | 基表 | — | — | OK |
| body\_composition | 基表+\_new+\_mig | — | — | OK |
| body\_measurements | 基表+\_new+\_mig | — | — | OK |

判定：11 行全 OK 才 COMMIT，否则 ROLLBACK 抛 MigrateVerifyError（exit 4）。

## 4. 关键口径抽查（现行代码为准，事务内对账）

- 总热量（去水）：src/dst 同跑 `SELECT COALESCE(SUM(calories),0) FROM <food系UNION> WHERE food\_name != '💧水'`
 （口径锚点：analysis/series.ts WATER\_NAME + buildSeries diet 聚合、fetch/diet.ts WATER\_NAME、render/diet.ts 去水总量）。
- 体重：COUNT(*) + ROUND2(SUM(weight\_kg))（锚点：fetch/weight.ts weight\_log，kcal 公约 round2 入库前收敛）。
- 照片数：COUNT(*) over body\_photos 系 UNION（锚点：fetch/photos.ts listPhotos 基表计数）。
- 三者全等才 COMMIT；任一 MISMATCH 即 ROLLBACK，dst 恢复打开前状态。

## 5. 幂等重跑证据（复制件上）

- 同一 src/dst 连跑两次：第二次先 DELETE 再同序重插 → 11 表行数与三口径与第一次完全一致（测试断言）。
- 合成复制件覆盖：entries 遗留行、intensity 中/高、无钠列 food、无 source 列 products、composition \_new/\_mig 各 1 行
  （含跨世代同 id 碰撞 1 组）、workout UNIQUE 冲突 1 组、空表若干。见 test/migrate-t12.test.mjs。
- 真实演练命令（tmp 隔离）：
  `node packages/skill-calorie/scripts/migrate-calorie.mjs --src $TMP/old-copy.db --dst $TMP/new.db --json $TMP/report.json`
  连跑两次 diff report.json 的 tables/calibers 一致（id 重映射确定性）。

## 6. 失败回滚说明

- 事务边界：dst 侧 BEGIN IMMEDIATE → DELETE+INSERT 全表 → applyMigrations 回填 → 事务内对账 → COMMIT；
  任何异常/对账 MISMATCH 走 ROLLBACK（二次 ROLLBACK 错误被吞，仅抛原始错误）。
- 回滚后状态：已有 dst 文件恢复到打开前内容（SQLite 原子回滚）；新建 dst 文件仅剩空 11 表 schema（initDb 已提交？
  不——initDb 在事务外先建 schema，事务只包数据；回滚后空表可直接重跑，无部分行）。
- src 从不写入：readOnly 打开 + 前后 stat（size/mtimeMs）比对；若外部进程在迁移窗内改动 src，报 WARN 并标 FAIL
  （dst 已提交但要求重取复制件后重跑，防止“对账时 src 已变”的假一致）。
- 常见失败与动作：
  - exit 3（src 缺/空库/dst 拒绝）：什么都没写，原样重取复制件/换 tmp dst 后重跑。
  - exit 4（对账 MISMATCH/CHECK 违反）：dst 已回滚；看 stderr 对账表定位表/口径；UNIQUE 冲突数在 uniqueConflicts，
    跨世代重映射在 remapped；修复制件（或接受去重语义）后重跑。
  - exit 5（IO/约束）：dst 已回滚；看堆栈首行（多为 CHECK/TRIGGER，如非法 source/activity\_level/空围度）；
    复制件行须先按现行校验（fetch/body.ts、kcal.ts SOURCE\_CHOICES）清洗后重跑，禁手改真实 DB。
- 重跑即恢复：幂等设计下任何失败重跑都是安全的（DELETE+重插确定性），无需手工删 dst（禁 git clean -x 同理，禁手删生产）。
