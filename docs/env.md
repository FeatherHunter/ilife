# 附录 env 登记（P9 冻结；逐包 key 由迁移图补）

> 面板改即时生效，例外只留换 DB 重连。doctor 默认 warn（CI 安全）；doctor --strict 升 fail（技能验收用）。
> read 取数期缺失一律阻断（exit 非 0），不返空数组冒充正常。

| 范围 | 变量 | 说明 | doctor 默认 | --strict |
|---|---|---|---|---|
| 全局 | SKILLS_DB_PATH | 数据目录，无默认值，必设 | 缺失 warn | fail |
| 作息/备忘录 | lark-cli | 飞书 CLI：存在+登录+写权限+端到端 | 缺失 warn（仅存在性+版本探测） | fail |
| 卡路里 | TBD | 各家 key，迁移图补 | — | — |
| 居家 | TBD | 各家 key，迁移图补 | — | — |
| 大厨 | TBD | 各家 key，迁移图补 | — | — |
| 饼干 | SKILLS_DB_PATH、BILL_FORCE_PROD | 数据目录（无默认值，必设）；非 tmp 写库须 BILL_FORCE_PROD=1（测试隔离哨兵，opt-in） | 缺失 warn | fail |
| 作息 | TBD | 各家 key，迁移图补 | — | — |
| 备忘录 | TBD | 各家 key，迁移图补 | — | — |
