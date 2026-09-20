## Question

域与卡的划分依据在新仓（`sceneData.ts`，机器生成），场景与唤醒词的权威清单在老仓（`scenes/*.yaml`），两侧今天靠一份一次性生成器的注释互相对账；**50 条唤醒词 ↔ 48 张卡的映射、13 条新表多出词的归属、域目录的中文名与产物 slug 规则，都还没有仓内的单一事实源**。这三件事的唯一事实源该长什么样？

## 目标

1. 把老件 `scenes/*.yaml` 的 48 场景／33 组名抽成仓内 typed 资产（生成器 ＋ `--check` ＋ sha256 摘要锁），与既有 `WAKE_TABLE` 双向对账。
2. 交出**对账表**：50 条唤醒词 ↔ 48 张卡 ↔ 命令 ↔ 域，每条标明来源（老组名／新表多出词／HELP 词）、是否可路由、对应哪张卡。
3. 定下**域目录中文名**（10 个，取自 HELP 的域 label）与**卡产物的发布名规则**（slug），供纵向票与收口票**共用同一套**（禁各算一套）。
4. 裁定 13 条新表多出词的 prompt 示例口径（沿用同域卡的 prompt 还是新写），落表。

## 验收命令

- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- node packages/skill-chef/scripts/gen-chef-scenes.mjs --check` → exit 0
- 正例：`node tooling/run-locked.mjs --ticket <本票号> -- node docs/skills/skill-chef/t2-对账.mjs` → 打印 `词 50／卡 48／差集 0／slug 冲突 0` 且 exit 0
- 反例（必跑）：从 `WAKE_TABLE` 删一条 → 对账脚本 exit 1 并点名；改回即绿
- 反例（必跑）：给两张卡同一个 slug → 对账脚本 exit 1 并点名

## 不许动的东西

- 老件一行不动。
- `sceneData.ts` 的 48 卡内容不许与老件漂移（sha256 锁）；改内容＝改生成器声明表再重跑。
- `WAKE_TABLE` 既有 37 条不改语义；若要补 13 条老组名，逐条在票内列出并说明影响。
- HELP 页契约（`base-paint/help-shell`）不动。

## 交付物路径

- 资产与生成器：`packages/skill-chef/src/triggers/chef-scenes.ts`（或等价的域／组／卡资产）、`packages/skill-chef/scripts/gen-chef-scenes.mjs`
- 对账与命名：`docs/skills/skill-chef/t2-对账表.md`、`docs/skills/skill-chef/t2-对账.mjs`、`docs/skills/skill-chef/t2-命名.md`（域中文名 ＋ 卡 slug 规则）
- 证据：变异红／还原一致两行读数

## 遗留出口

- 待开发卡的实现 → 各域纵向票。
- 老件 20 个模板 → 新页面族的信息架构对照表 → 横向票③。

## 进度：0%

下一步：先读老件 `scenes/*.yaml` 全量 ＋ `WAKE_TABLE`，出对账表草稿，再定命名。
