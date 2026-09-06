## Destination

爱生活全 TS 重构一期框架跑通：纯 SKILL 全正常 + DSH 框架正确 6 条（02§9），为二期每技能单 MAP 打底。

一期结束时必须是这样：单仓 D:\ilife 即 FeatherHunter/ilife，全 TS，无 Python 运行时残留（遗产只读对照已删）；3 base 包边界冻结（link-core 沉底零依赖，render 自含 style 且装配归一，combos 单向依赖 link-core 且只许字符串级引用）；6 SKILL 包可用（SKILL.md+dist+模板，requires node>=22.13）；7 DSH 插件可用（6 单品+总管 dsh-life-pack，设置页住单品包，总管只导航）；1 SKILL 整包可用（latest+snapshot 跟包，CI 断言快照==实际版）。

联动真相唯一 B（combos.yaml+envelope+registry+AI 合并，不写 36 函数）；暴露唯一纯 CLI（cmd_read，argv+JSON+exit，面板只经 host.call→spawn，不 import 实现）；安装口径：任何单品落地时总管必须已在位导航。实现为单命令双包（dsh plugin add dsh-life-pack dsh-calorie，两者皆直接依赖，由 reconcile 按序激活）；单品 package 内保留对总管的 dependencies 只作本地开发兜底，不作为单 add 即激活的依据；不许单卸总管，缺席时总管对应 tab 显示推荐安装并提示补装；安装验收以 bundles 双含为准，另加单 add 单品后 bundles 无总管的负向断言。

6 条验收是唯一标尺：1 装得上（单品/全装不报错，bundles 双含）；2 叫得动（6 技能各一句 HELP 现找 prompt，AI 可执行回 HTML）；3 点得开（better-sidebar 6 最小 UI 真可用，slot 分配表按 P3 定案验收）；4 配得通（改 DB 即生效，缺 lark-cli/缺 key 阻断取数并强提示，不返空数组）；5 测得过（pnpm -r test 全绿+三端冒烟+Win 细验）；6 分得清（一期不验二期场景数）。

偏离时按此排序做决策：真相唯一 > 缺失阻断不返空 > 维护耦合最低 > 一步到位无过渡 > 一次成本不计。凡要加过渡态、加第二真相、静默降级返空、跨包 import 的方案一律否决。非目标：二期每技能单 MAP、定时任务（商标检索归发布前，不占本期）。

## Notes

- 只读冻结：00/01/02/03-phase1-scope + 04 补丁。百问级约数（93 编号有效 + 8 命名收口）。老 T2/T6 编号作废，T2 读脚手架项，T6 读 skilllink 项。
- 前提锁定：联动 B、纯 CLI 单轨、直接 3 包、一步到位禁过渡。Node 线按 engines>=22.13（22.13+/24），HTML 未定前只 warn。
- 执行覆盖：本图含执行任务票，一期就是要跑通框架。
- 每 session 必调：按票 label 调 research / prototype / grilling / domain-modeling；术语以 02 为准，iLife 只准标题。
- 交付物目录：C:\Users\辰辰洋洋\AppData\Local\Temp\ilife-deliverables 下 00-04。

## Decisions so far

- [P4 验三包边界冻结](https://github.com/FeatherHunter/ilife/issues/5)：DAG 四断言 + CI 五断言点冻结
- [P2 定Node版本线与doctor清单](https://github.com/FeatherHunter/ilife/issues/3)：engines>=22.13，doctor 表，见 research/P2
- [P5 搭脚手架与三端CI](https://github.com/FeatherHunter/ilife/issues/6)：research/P5 已合 master，CI 绿，P6/P7 解阻塞
- [P1 查dsh add跟装与激活验收](https://github.com/FeatherHunter/ilife/issues/2)：真机全过，口径锁定单命令双包
- [P6 做link-core](https://github.com/FeatherHunter/ilife/issues/7)：feat/P6-link-core 已合 master
- [P7 做render](https://github.com/FeatherHunter/ilife/issues/8)：research/P7 去重合入 master
- [卡路里 T1 schema](https://github.com/FeatherHunter/ilife/issues/20)：11 表终态 + 迁移单线已合 master，两偏离确认
- [卡路里 T2 triggers](https://github.com/FeatherHunter/ilife/issues/21)：436 条转 10 场景已合 master
- [P9 冻skilllink与CLI契约](https://github.com/FeatherHunter/ilife/issues/10)：feat/P9-skilllink 已合 master，备忘录 M1 与串行四图契约依赖就绪

## Not yet specified

- skilllink 项完成后补：HTML 路径/编码、env 各家 key 逐包登记、手机体积/分页。
- hunter-skills 改名待定，不默认已改名；Python 遗产以“只读对照当天删”为准。
- 6 技能迁移已毕业为子图：#14 卡路里（并发组，与 #16 并行）、#16 备忘录（并发组）、#15 作息管家、#17 居家管家、#18 私家大厨、#19 饼干记账（串行组，等 #14 样板）；总装 #11 等六图齐。

## Out of scope

- 二期按实际场景每技能单 MAP（原 100 种泛指作废）；定时任务单列；商标检索归发布前；5 审查全文缺失留指针，需逐行复核回原会话取。