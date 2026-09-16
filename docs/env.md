# 附录 env 登记（P9 冻结；逐包 key 由迁移图补）

> 面板改即时生效，例外只留换 DB 重连。doctor 默认 warn（CI 安全）；doctor --strict 升 fail（技能验收用）。
> read 取数期缺失一律阻断（exit 非 0），不返空数组冒充正常。
> 测试隔离哨兵名一律取「包名去掉 skill- 前缀、大写」＋_FORCE_PROD（CALORIE_FORCE_PROD／HOME_FORCE_PROD／CHEF_FORCE_PROD／BILL_FORCE_PROD／SCHEDULE_FORCE_PROD）：非 tmp 路径写库须显式置 1（opt-in）；没有该哨兵的包照写「不适用（无该变量）」，不留 TBD。

| 范围 | 变量 | 说明 | doctor 默认 | --strict |
|---|---|---|---|---|
| 全局 | SKILLS_DB_PATH | 数据目录，无默认值，必设 | 缺失 warn | fail |
| 作息/备忘录 | lark-cli | 飞书 CLI：存在+登录+写权限+端到端 | 缺失 warn（仅存在性+版本探测） | fail |
| 卡路里 | SKILLS_DB_PATH、CALORIE_FORCE_PROD、CALORIE_PHOTOS_DIR | 数据目录（无默认值，必设）；非 tmp 写库须 CALORIE_FORCE_PROD=1（测试隔离哨兵，opt-in）；照片目录可选（缺失只挡照片写命令，取数不阻断） | 缺失 warn | fail |
| 居家 | SKILLS_DB_PATH、HOME_FORCE_PROD | 数据目录（无默认值，必设）；非 tmp 写库须 HOME_FORCE_PROD=1（测试隔离哨兵，opt-in）；照片变量不适用（无该变量：本包 src 未读 HOME_PHOTOS_DIR，老家该变量未迁） | 缺失 warn | fail |
| 大厨 | SKILLS_DB_PATH、CHEF_FORCE_PROD | 数据目录（无默认值，必设）；非 tmp 写库须 CHEF_FORCE_PROD=1（测试隔离哨兵，opt-in） | 缺失 warn | fail |
| 饼干 | SKILLS_DB_PATH、BILL_FORCE_PROD | 数据目录（无默认值，必设）；非 tmp 写库须 BILL_FORCE_PROD=1（测试隔离哨兵，opt-in） | 缺失 warn | fail |
| 作息 | SKILLS_DB_PATH、SCHEDULE_FORCE_PROD | 数据目录（无默认值，必设）；非 tmp 写库须 SCHEDULE_FORCE_PROD=1（测试隔离哨兵，opt-in）；飞书 CLI 见上「作息/备忘录」行，路径可被 LARK_CLI_PATH 覆盖 | 缺失 warn | fail |
| 备忘录 | SKILLS_DB_PATH | 数据目录（无默认值，必设）；写库哨兵不适用（无该变量）；飞书 CLI 见上「作息/备忘录」行，路径可被 LARK_CLI_PATH 覆盖 | 缺失 warn | fail |
