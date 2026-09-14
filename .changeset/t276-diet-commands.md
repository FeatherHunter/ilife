---
'skill-calorie': minor
---

#276（map #155）饮食命令面：6 条没有命令可执行的唤醒词补到有命令可跑。

新增一条会改数据库的命令 `calorie.product.import`（批量导入食品，`items` 同步写库；查询命令 `calorie.view.batch-import-preview` 只预览不写库，读写分开）；`calorie.today` 加 `hasNote`／`withNote` 备注筛选参数（取数已含 note 列）；拍营养表 2 条写库并到 `calorie.diet.add`（补记带 `date`／`time`），映射说明见 `docs/skills/skill-calorie/t276-营养表映射.md`；校验批量导入路由接回现成命令。6 条路由声明 `order` 原值照抄进 `src/diet/routes.ts`，`src/cli/legacy/routes/scene-02.ts` 对应 6 行定点删除。
