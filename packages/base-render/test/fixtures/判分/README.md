# 判分夹具（#868）

这份夹具喂 `packages/base-render/scripts/判分.mjs`（五维尺判分引擎），用途是让引擎的四条判据
在**干净克隆里**就能跑红跑绿 —— 不依赖任何 `.scratch` 现场，也不依赖任何域的真产物。

## 1 目录形状

```
packages/base-render/test/fixtures/判分/
├─ README.md              本件：夹具怎么造、三页读数各是什么、怎么跑
├─ 夹具/                  读数目录（引擎的 --dir 指这里）
│  ├─ sep.json            分隔符读数：节点级命中与 tags（R1–R7）
│  ├─ resp.json           跨宽读数：三档 390／768／1440 的溢价格
│  ├─ fmt.json            版式读数：三档触摸处数、触摸明细、最小字号
│  └─ facts.json          事实列读数：逐页键（tables／imgTags／tdDataLabel／tocEl／aspectRatio／
│                         scrollMargin／dupFacts／english／d1／d2）
├─ 配置/                  两套按域配置（只差路径与名单写法，见 §4）
│  ├─ 域甲.json           对象形态名单（{ file, key }）＋ 读数目录按仓根写
│  └─ 域乙.json           字符串形态名单（文件名）＋ 读数目录按包路径写，页序倒过来
└─ 自检.mjs               正例两条 ＋ 反例四条，逐条判红绿（§5）
```

夹具是**读数**，不是产物：这里没有 HTML 产物本身。产物落盘与否由各域票与收口票（#834）在自己的页群目录上判，
本夹具只回答「同一份读数喂进引擎，算式给出的分对不对」。

## 2 三页读数与意图

页键＝产物名去掉 `.html` 后缀（`facts.json` 的 `pages` 键就按这个写）。

| 页 | 意图 | D1 | D2 | D3 | D4 | D5 | 逐维合计 | 硬扣分 | 页分 | 每维≥80% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `甲-01-记录一览` | 干净页：逐维满分、零硬扣分 | 15 | 20 | 25 | 15 | 25 | 100 | −0 | **100** | 是 |
| `甲-02-待办清单` | 红色页：七条硬扣分各有一处以上 | 11 | 14 | 15 | 10 | 7 | 57 | −20 | **37** | 否 |
| `甲-03-月度小结` | 压线页：页分恰 90 且每维达线 | 12 | 16 | 25 | 15 | 25 | 93 | −3 | **90** | 是 |

逐条对上判据（`docs/skills/skill-memo-ilife/t849-视觉基准.md` §1 的七条硬扣分）：

| 扣分 | 甲-02 手法的落点 | 处数 | 扣 |
|---|---|---:|---:|
| H1 分隔符串并列 | `sep.json` 两条非 R7 命中（`待办清单 · 今天`、`已完成 → 归档`） | 2 | −4 |
| H2 内部标识符或裸代码 | 一条 R7 命中（`todo-list`，点名「蛇形名」） | 1 | −3 |
| H3 同一事实一页重复 | `facts.dupFacts` | 1 | −2 |
| H4 符号顶替文字 | 一条 R6 命中（`→`） | 1 | −1 |
| H5 窄屏溢出 | `resp` 的 390 档 `ok:false`、`why` 非空 | 1 | −5 |
| H6 触摸区 <44px | `fmt` 的 390 档 2 处 ＋ 768 档 1 处 | 3 | −3 |
| H7 露英文或半角标点 | `facts.english` | 2 | −2 |
| | | | **−20** |

甲-03 只吃 H6 的 3 处（−3）：93 − 3 ＝ 90，用来钉住「页分恰好 90」这条边界 ——
判据是「逐页 ≥90 且每维 ≥ 满权 80%」，压线页必须判过。

## 3 夹具怎么造

三个读数器与一份装配器负责产出四件读数，本夹具按它们的形状**手抄**：

| 读件 | 真产出者 | 引擎取用的字段 |
|---|---|---|
| `sep.json` | `packages/skill-calorie/scripts/audit-separators.mjs` | `rows[].name`、`rows[].node.hits[].tags`（节点级为准） |
| `resp.json` | `packages/skill-calorie/scripts/measure-responsive.mjs --widths 390,768,1440` | `widths`、`rows[].widths[w].ok｜why` |
| `fmt.json` | `docs/skills/skill-calorie/t516-判据-版式.mjs --widths 390,768,1440` | `rows[].widths[w].touchSmall｜touchSmallList｜minFontPxNoSvg` |
| `facts.json` | 读数链（#867 的 facts 装配器 ＋ DOM 列探针） | `pages[key]` 的十个人核与探针列 |

抄的时候守三条：

1. **页名逐字**：四件读数的页名（`name`）必须与名单里的 `file` 逐字相同，否则引擎按缺件点名报红。
2. **facts 键**：`pages` 的键＝产物名去掉 `.html`；名单里对象形态另给 `key` 时，键要按它逐字对上。
3. **不许有第二处数字**：夹具里的数字是**读数**（命中处数、字号、触摸尺寸、人核扣分），不是判据阈值；
   判据阈值（44／12／权重／下限／硬扣分）只许住在引擎与公共层，别写进夹具或配置。

要换一批页重造：照上表跑一遍三个读数器拿到 JSON，`facts.json` 的十列按
`docs/skills/skill-memo-ilife/t851-人核档.md` 的口径填（或直接改用真页群目录），
然后把「三页读数与意图」那张表按新数重算一遍贴回来。

## 4 两套按域配置的用意

两套配置指向**同一个读数目录**，只在可配的那三个字段上不同：

| | 域甲 | 域乙 |
|---|---|---|
| `packagePath` | `.`（仓根） | `packages/base-render` |
| `readingsDir` | 按仓根写全路径 | 按包路径写相对路径 |
| 名单形态 | 对象 `{ file, key }` | 字符串（文件名） |
| 页序 | 01 → 02 → 03 | 03 → 01 → 02 |

两套必须给出**逐页逐维差 0** 的分 —— 这是「算式只住引擎、配置只给路径与名单」的结构保证：
配置里没有数字，也就没有第二处定义能把同一页算出第二个结果。

## 5 怎么跑

```powershell
# 正例① 引擎跑夹具（含一致性自证）
node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/scripts/判分.mjs --dir packages/base-render/test/fixtures/判分/夹具 --json .scratch/t868/score.json
# 正例② 同一读数目录换另一套按域配置，再比一次
node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/scripts/判分.mjs --dir packages/base-render/test/fixtures/判分/夹具 --config packages/base-render/test/fixtures/判分/配置/域甲.json --json .scratch/t868/score-甲.json
node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/scripts/判分.mjs --config packages/base-render/test/fixtures/判分/配置/域乙.json --json .scratch/t868/score-乙.json
node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/scripts/判分.mjs --compare .scratch/t868/score-甲.json .scratch/t868/score-乙.json
# 正反例一起跑（正例两条 ＋ 反例四条，11 项逐条 PASS／FAIL）
node tooling/run-locked.mjs --ticket 868 -- node packages/base-render/test/fixtures/判分/自检.mjs
```

引擎要先有构建产物：它从 `packages/base-render/dist/pageUi.js` 取公共层的判据数值（`PAGE_LIMITS`），
干净克隆上先 `node node_modules/typescript/bin/tsc -b packages/base-render`（或 `pnpm build`）。

`自检.mjs` 的反例①会把变异件临时写到 `packages/base-render/scripts/判分-变异-权重.mjs` 跑一次，跑完即删
（`finally` 里删；若脚本被强杀可手工删掉这个文件）。
