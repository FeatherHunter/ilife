## Destination

六家技能（卡路里／作息／居家／备忘／饼干／大厨）的**交付面**在四格上一致：

1. **交付**：非 HELP 命令**原样调用就落页**（不靠谁去传 `--html`）；
2. **回执**：落页必回 `delivery{mode,path,bytes}`——`path` 是绝对路径、`bytes` 等于磁盘真实字节；
3. **产物**：写出来的是**能直接打开的整页**；
4. **命名与落点**：文件名主体**一处定义**、页面与 HELP **分家**。

走到这一步，用户说任意唤醒词都能拿到一份能打开的 HTML 文件。

现状读数与逐家缺口：`docs/agents/交付面-缺省落点现状与对齐成本.html`（2026-09-22 调查件，含两处已修正）。

## Notes

- **对齐判据**照最近一次做这件事的票〔作息 #843〕五条：缺省落整页／落页回 `delivery` 且字节真实／命名与落点一处定义／不给 `--html` 与给 `--html` 是同一份正文只差落点／改坏落点必红。
- **两家的半边各有其主**：私家大厨的「页 → 命令出口」接线归本体图〔[私家大厨本体图](https://github.com/FeatherHunter/ilife/issues/765)〕——它自己的「已知现状」已记两条 ⚠️（业务命令的 HTML 不是页面／绝对路径回执只有 HELP 有）；本图只指路，不为它另建票。
- **备忘不是缺口**（2026-09-22 复核）：`memo.stats` 随 #858 整条退役（零唤醒词、HELP 无场景），键不在注册表里，属不可达的遗留函数；四家（含备忘）本就缺省落页。
- **第⑤格不做**（agent 工具能不能指定落点）：见 Out of scope。
- 跑读数、编译与 git 写操作按并发纪律走：`node tooling/run-locked.mjs --ticket <票号> -- <命令>`；编译入口写死 `node node_modules/typescript/bin/tsc -b <包>`。
- 不许动页面外观与页内内容（快照／指纹件）；HELP 三支交付口径冻结（饼干 #144、大厨 #215）。

## Decisions so far

- （本图刚立，暂无可回写的已关票。）

## Not yet specified

- 六家 `SKILL.md` 的交付措辞现在各写各的（饼干那段还冻着「其它 15 条命令的 `--html` 语义不变」）——要不要统一措辞，等〔饼干记账页面产物的落点与命名〕定稿后再判。
- 交付面探针的成品形态出来之后，再判它要不要接进常驻门（每次改交付段自动跑），还是只当一次性的对齐判据。

## Out of scope

- **给 agent 工具加 `--html` 参数**（第⑤格）：落点该由技能按通式自己算（一处定义），让模型每次自己编路径会把第④格废掉；且 `--html` 是逐字覆盖写，编重了会互相盖。**2026-09-22 维护者认可分析结论时一并裁为不做。**

<!-- PLAN-ROWS-START -->
| 票 | 名字 | 类型 | 被谁挡 |
|---|---|---|---|
| 1 | [【裁定】饼干记账页面产物的落点与命名：与 HELP 分家、一处定义](https://github.com/FeatherHunter/ilife/issues/903) | grilling | — |
| 2 | [交付面探针：六家技能缺省落点与回执的常驻判据](https://github.com/FeatherHunter/ilife/issues/904) | task | — |
| 3 | [饼干记账：非 HELP 命令缺省落点与回执](https://github.com/FeatherHunter/ilife/issues/905) | task | [票 1](https://github.com/FeatherHunter/ilife/issues/903) ＋ [票 2](https://github.com/FeatherHunter/ilife/issues/904) |
<!-- PLAN-ROWS-END -->
