# 饼干记账（bill）SKILL

本地记账：记支出/收入、查今天/区间/分类/标签、看月度/对比/趋势、预算目标、账户转账、买东西/吃饭联动、初始化备份导入。唯一出口 `bill-cmd-read <bill.key>`，argv+JSON(stdout)+exit，非 0 走 stderr。写走 receipt（直通即真相）。

## 快速开始

```sh
bill-cmd-read bill.help.lookup                      # 说「饼干记账help」就这一条：落一份 HELP 文件
bill-cmd-read bill.record.today --params '{"date":"2026-09-06"}'
bill-cmd-read bill.record.add --params '{"category":"餐饮/外卖/午餐","amount":-35,"note":"午饭"}'
```

## 口径

- 分类：支出 L1 10 个 + 收入 L1 6 个（餐饮/居家/穿着/出行/玩乐/学习/健康/社交/宠物/其他）+ 借贷/分期/转账隔离；amount 符号即分类依据（支出负/收入正），不单设 type 列；至多 L1/L2/L3 三级，旧数据无 / 视为 L1。
- 时间：YYYY-MM-DD HH:mm:ss（日期缺时分补 12:00:00）；查区间须 start/end 同给；搜备注空查询不返全量；#tag 精确匹配（#旅行计划不命中 #旅行）。
- 软删：撤销=deleted_at 置 now，恢复=置 NULL（G7 契约）；转账=双笔 #转账（转出支出 + 转入收入，账本 转账，不入收支统计，余额含转账）。
- 预算覆盖：同月同分类已存在默认拒绝（conflict），确认后加 --force 重跑；导入列映射 dry-run 先行；拍账单图片识别以外置为准。
- 坏输入与缺失一律阻断（exit 2/4），不返空数组冒充正常；账单为 record.add 子功能（receipt 回执带复制 prompt）。

## 联动速查（构建期注入，勿手改）

<!-- HELP-AUTO-START -->
| 唤醒词 | key | shape | 例 |
|---|---|---|---|
| 饼干记账 HELP | bill.help.lookup | list | `bill-cmd-read bill.help.lookup` |
| 饼干记账帮助 | bill.help.lookup | list | `bill-cmd-read bill.help.lookup` |
| 查帮助 | bill.help.lookup | list | `bill-cmd-read bill.help.lookup` |
| 能做什么 | bill.help.lookup | list | `bill-cmd-read bill.help.lookup` |
| 记支出 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"expense","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记收入 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"income","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 拍账单 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"photo","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 批量录入 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"batch","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记退款 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"refund","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记报销 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"reimburse","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 报销到账 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"reimburse-done","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记借出 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"lend","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记借入 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"borrow","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记收回 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"collect","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记偿还 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"repay","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记分期 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"kind":"installment","category":"餐饮","amount":-35,"note":"午饭"}'` |
| 记一笔 | bill.record.add | receipt | `bill-cmd-read bill.record.add --params '{"category":"餐饮","amount":-35,"note":"午饭"}'` |
| 改记录 | bill.record.update | receipt | `bill-cmd-read bill.record.update --params '{"id":1}'` |
| 撤销 | bill.record.update | receipt | `bill-cmd-read bill.record.update --params '{"op":"undo","id":1}'` |
| 恢复 | bill.record.update | receipt | `bill-cmd-read bill.record.update --params '{"op":"restore","id":1}'` |
| 查今天 | bill.record.today | list | `bill-cmd-read bill.record.today` |
| 查昨天 | bill.record.today | list | `bill-cmd-read bill.record.today --params '{"date":"yesterday"}'` |
| 查某天 | bill.record.today | list | `bill-cmd-read bill.record.today --params '{"date":"2026-09-06"}'` |
| 查最近 | bill.record.today | list | `bill-cmd-read bill.record.today --params '{"recent":true}'` |
| 查账单 | bill.record.today | list | `bill-cmd-read bill.record.today` |
| 查周 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"range":"week"}'` |
| 查月 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"range":"month"}'` |
| 查区间 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"start":"2026-09-01","end":"2026-09-01"}'` |
| 查分类 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"category":"餐饮"}'` |
| 查账户 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"account":"支付宝"}'` |
| 查账本 | bill.record.range | list | `bill-cmd-read bill.record.range --params '{"ledger":"生活"}'` |
| 搜备注 | bill.record.search | list | `bill-cmd-read bill.record.search --params '{"q":"午饭"}'` |
| 查标签 | bill.record.search | list | `bill-cmd-read bill.record.search --params '{"kind":"tag","tag":"旅行"}'` |
| 查欠款 | bill.record.search | list | `bill-cmd-read bill.record.search --params '{"kind":"debt"}'` |
| 查待报销 | bill.record.search | list | `bill-cmd-read bill.record.search --params '{"kind":"reimburse"}'` |
| 查分期 | bill.record.search | list | `bill-cmd-read bill.record.search --params '{"kind":"installment"}'` |
| 查账单详情 | bill.record.detail | detail | `bill-cmd-read bill.record.detail --params '{"id":1}'` |
| 看月度 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"monthly"}'` |
| 看年度 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"yearly"}'` |
| 看总览 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"overview"}'` |
| 看周报 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"week"}'` |
| 看分类 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"category"}'` |
| 看账户 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"account"}'` |
| 看账本 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"ledger"}'` |
| 看结构 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"structure"}'` |
| 做统计 | bill.analysis.overview | stat | `bill-cmd-read bill.analysis.overview --params '{"kind":"stats"}'` |
| 看对比 | bill.analysis.compare | analysis | `bill-cmd-read bill.analysis.compare --params '{"kind":"period"}'` |
| 看双区间 | bill.analysis.compare | analysis | `bill-cmd-read bill.analysis.compare --params '{"kind":"range"}'` |
| 看同比 | bill.analysis.compare | analysis | `bill-cmd-read bill.analysis.compare --params '{"kind":"yoy"}'` |
| 看分类对比 | bill.analysis.compare | analysis | `bill-cmd-read bill.analysis.compare --params '{"kind":"category"}'` |
| 看趋势 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"trend"}'` |
| 看分类趋势 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"category"}'` |
| 看大额 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"top"}'` |
| 看高频 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"frequent"}'` |
| 看分布 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"distribution"}'` |
| 看活跃 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"activity"}'` |
| 看洞察 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"insight"}'` |
| 看异常 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"anomaly"}'` |
| 看借贷 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"debt"}'` |
| 看报销 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"reimburse"}'` |
| 看分期 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"installment"}'` |
| 看退款 | bill.analysis.trend | analysis | `bill-cmd-read bill.analysis.trend --params '{"kind":"refund"}'` |
| 设定预算 | bill.goal.write | receipt | `bill-cmd-read bill.goal.write --params '{"op":"set-budget","amount":35}'` |
| 设定目标 | bill.goal.write | receipt | `bill-cmd-read bill.goal.write --params '{"op":"set-saving","name":"招行卡","amount":35}'` |
| 看预算 | bill.goal.query | list | `bill-cmd-read bill.goal.query --params '{"op":"budget"}'` |
| 看目标 | bill.goal.query | list | `bill-cmd-read bill.goal.query --params '{"op":"saving"}'` |
| 新增账户 | bill.account.write | receipt | `bill-cmd-read bill.account.write --params '{"op":"add","name":"招行卡"}'` |
| 改账户 | bill.account.write | receipt | `bill-cmd-read bill.account.write --params '{"op":"update","name":"招行卡"}'` |
| 账户转账 | bill.account.write | receipt | `bill-cmd-read bill.account.write --params '{"op":"transfer","amount":35,"from":"支付宝","to":"招行卡"}'` |
| 看账户汇总 | bill.account.query | list | `bill-cmd-read bill.account.query` |
| 买东西 | bill.link.submit | receipt | `bill-cmd-read bill.link.submit --params '{"scene":"purchase"}'` |
| 吃饭 | bill.link.submit | receipt | `bill-cmd-read bill.link.submit --params '{"scene":"meal"}'` |
| 初始化 | bill.setup.run | receipt | `bill-cmd-read bill.setup.run --params '{"op":"init"}'` |
| 初始化状态 | bill.setup.run | receipt | `bill-cmd-read bill.setup.run --params '{"op":"init-status"}'` |
| 备份 | bill.setup.run | receipt | `bill-cmd-read bill.setup.run --params '{"op":"backup-create"}'` |
| 恢复备份 | bill.setup.run | receipt | `bill-cmd-read bill.setup.run --params '{"op":"restore"}'` |
| 导入 | bill.setup.run | receipt | `bill-cmd-read bill.setup.run --params '{"op":"import","file":"bills.csv"}'` |

相关场景：bill.account.query、bill.account.write、bill.analysis.compare、bill.analysis.overview、bill.analysis.trend、bill.goal.query、bill.goal.write、bill.help.lookup、bill.link.submit、bill.record.add、bill.record.detail、bill.record.range、bill.record.search、bill.record.today、bill.record.update、bill.setup.run（16 联动，key 字符串后续票落表时冻结）。
<!-- HELP-AUTO-END -->

## HELP 交付（说「饼干记账help」或「查帮助」走这里）

- **缺省就是交付物**：`bill-cmd-read bill.help.lookup` **原样调用**即落一份能打开的 HELP 文件——`<SKILLS_DB_PATH>/biscuit_accountant_html/饼干记账_HELP_<YYYYMMDD_HHMMSS>.html`（7 域／74 场景，与卡路里同一套共享 help 模板）。stdout 的 `delivery.path` 是**绝对路径**，`delivery.bytes` 是文件字节数；回话就把这个路径给用户（回执即真相）。
  **完成标准**：`delivery.path` 指向的文件真的存在，且大小＝`delivery.bytes`。
- **要全量速查表才加参数**：`--params '{"mode":"lookup"}'` 出 77 条唤醒词速查表，落同目录 `饼干记账_速查表_<时间戳>.html`（与 HELP 文件分名，两份产物不撞车）。
- **要现找才加参数**：`--params '{"q":"查今天"}'` 回命中条目（只出 JSON，不落盘；要落盘就给 `--html`）。`q` 与 `mode` 互斥、`mode` 只认 `lookup`，违反即 exit 2。
- **`--html <路径>`＝显式落点**：逐字使用、覆盖写、缺父目录自动建（不参与同秒 `_N` 递补）；其它 15 条命令的 `--html` 语义不变（仍写收据页）。
- **边界**：面板／侧栏的 HELP 入口不在本技能范围（属插件的桥／面板那条线）；不写固定名镜像（用户 Q10=A）。
- 触发词总表见上「联动速查」构建期注入块（`<!-- HELP-AUTO-START/END -->`，由 `scripts/build-help.mjs` 重写，勿手改）。

## 环境与出 scope

- SKILLS_DB_PATH（必设，无默认值）+ BILL_FORCE_PROD 哨兵（非 tmp 写库须 opt-in），见 docs/env.md。
- --html 套模板输出完整收据页（section 片段经 CONTENT 注入对应模板，非片段直写；超体积阻断）；`bill.help.lookup` 的 `--html` 改写到该键的产物（HELP 全页／速查页），语义见上「HELP 交付」节。
- 出 scope：定时任务（老家零定时代码）、面板（二期单 MAP）、本技能外联动登记（combos.yaml 一律不碰，走后续票；link 跨技能仅复制 prompt）；真实数据禁迁，测试 tmp 隔离；Python 老家只读对照。
