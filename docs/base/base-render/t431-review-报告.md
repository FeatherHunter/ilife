# t431 独立对抗审查报告（被审交付：提交 3e2a9b7 ＋ 8ed9863）

**判定：PASS（五维均分 95／100，无 S1）**；1 条本票范围·S3 未全落（F1），不影响任何判据成立。

## 一、机器证据

复跑各一次 `node tooling/run-locked.mjs --ticket 431 -- <命令>`；读数时 `blocks.ts` sha256 `DBA73FB9…`＝`git show HEAD:…`（交付字节）。窗口 `12:34:05–12:34:30Z` 内五条：

| 命令 | exit | 摘要 |
| --- | --- | --- |
| `pnpm build` | 0 | — |
| `…/page-viz-421.test.mjs` | 0 | pass 27／fail 0 |
| `…/blocks.test.mjs` | 0 | pass 46／fail 0 |
| `…/style.test.mjs` | 0 | pass 29／fail 0 |
| `…/page-finish-420.test.mjs` | 0 | pass 20／fail 0 |

```
GATE-RUN runId=39f936cb-87bb-4499-a829-fcdf156d94a2 cmd="pnpm build"
GATE-RUN runId=b17552ca-8551-4cfb-8f58-87f8a21dd24c cmd="node --test packages/base-render/test/page-viz-421.test.mjs"
GATE-RUN runId=633c1f5e-11a4-41d0-bd4d-28060bd48abb cmd="node --test packages/base-render/test/blocks.test.mjs"
GATE-RUN runId=eba5f8f4-8383-4d7a-8725-e79b60502a10 cmd="node --test packages/base-render/test/style.test.mjs"
GATE-RUN runId=d5575ac4-df51-4cb3-98e1-7bc53ee01a88 cmd="node --test packages/base-render/test/page-finish-420.test.mjs"
```

对账复跑（以上表为证据，窗口同上）→ matched=5/5、undeclared=0。窗口外另两条本席条目：变异两行整轮 `c7abc33c-6f62-4f11-b89b-b2c8ce9c2913`（exit=0）、首跑中止 `d350b760-576c-4fd3-87a6-f473632ea677`（exit=1，pwsh 7.6 解析多行括号失败，未落变异、未改字节）。交付件自报窗口（`12:23–12:30Z`）本席复跑：matched=13/13、undeclared=0。逐字节对照复算：`blocksCss()` sha256 `c794e19b…`、长 10603，8 件产物与另存侧差异 0 条。

**第 3 条（允许清单）红绿两行**——改坏：`optColor` 尾部 `badInput(…)` → `return raw`（命中 1 处，变异件 sha256 `1AF82A98…`）→ exit=1、`pass 26／fail 1`，红在「清单外色值一律 bad-input（`;`／`expression(`／`url(`／未定义 token 名）」；改回：写回本席另存原字节 → src sha256 `DBA73FB9…` 同值 → exit=0、`pass 27／fail 0`。
**第 4 条（样式快照）红绿两行**——改坏：删迷你条规则体 `'  width: 72px;',`（78835→78813 字节）→ exit=1、`pass 26／fail 1`，红在「四件样式鉴别力…关键属性快照」；改回：src sha256 同原字节 → exit=0、`pass 27／fail 0`，dist sha256 回基线 `BE8F1806…`。两次写回只用另存字节，未用 `git checkout --`。

## 二、逐条路径

1. **门禁**：上表五条全绿，`page-viz-421` 27 条。
2. **甲法自洽**：三处同口径——`blocks.ts:1155`、判据名 `page-viz-421.test.mjs:144`（判据 3 在 `:8`）、证据件 `t431-四件判据补硬.md:9`／`:32`。判据真钉住：缺省产物色值字面量 `[[],[],[],[]]`、两条 `-fill` 规则 `background`＝`var(--blue)`、缺省填充内联恰 `width:42%`。
3. **允许清单**：六种写法逐字透传（`#f00／#ff0000／rgb(1,2,3)／rgba(1,2,3,.5)／var(--blue)／tomato`），裸冻结名 `--blue`→`var(--blue)`；清单外九例（`;` 注入／`expression(`／`url(`／`--nope`／`var(--nope)`／`tomato/*`／`#ff000080`／`7`／空串）全 `bad-input`；放宽探针见上。
4. **样式快照**：13 类声明数 `7／4／6／4／5／4／4／10／6／3／2／4／3`（＝表列实测值）＋17 条关键属性快照值＝当刻产物值＋13 类规则体零色值字面量；删一条即红。
5. **归属与纪律**：`git show --stat 3e2a9b7` 只三件（`blocks.ts` +67／−8、测试 +158／−16、证据件 101 行）；`8ed9863` 只改证据件一句。既有 22 条（`3e2a9b7^` 计数）一条未删、现 27；删行仅判据名改写、口径重写与夹具 token 换名（`--accent`／`--accent2`→`--ok`／`--blue2`），无断言删减。11 冻结 token 与 12 区名单未动，样式段 `var()` 引用名全在冻结集内。a11y 读数：迷你条 `role="img"`＋`aria-label="42%"`（夹取后 `100%`）、箭头三态 `aria-hidden="true"`、分布行／徽章 `[]`。空态读数：`[]`→空串、`undefined`→`bad-input`。只读探针 `t431-review-probe.mjs` 27 条读数全对。

## 三、缺陷

- **F1｜本票范围·S3**：S3-5 要「写进契约与断言」；断言在 `:433`、口径进了判据头与证据件，但实现契约注释仍只写 `rows: []`／`items: []`＝空串（`blocks.ts:410／447／479`），缺「缺失（`undefined`）→ `bad-input`」一句。不构成假读数。
- **F2｜本票范围·S3**：允许清单把 `--accent` 这类未冻结 token 名由收改拒（夹具随之换名）是契约收紧；全仓除定义与测试外无调用点，无调用被破坏，但证据件未写这句迁移提示。
- **F3｜范围外·观察**：`colorLiterals()` 只认 `#hex`／`rgb(`／`rgba(`，`hsl(`／具名色字面量不在其内（现表实测为空，无漏网）；该口径非本票新增。
- **F4｜文档同步·S3**：证据件 §0「本席实现一行未改」易被读成整票零实现改动，而提交里允许清单与新函数共 +67 行，且未给做实现那一席的 runId。

## 四、五维分（摘要）

| 维度 | 分 | 依据 |
| --- | --- | --- |
| 契约一致 30 | 28 | 五条整改逐条有断言且真钉住；S3-5 契约面缺一句 |
| 证据真实可复现 25 | 24 | 门禁与两轮变异本席复跑同结果、写回 sha256 同值 |
| 新旧对照 20 | 20 | 22→27、删行仅改写换名；样式段与 8 件产物差异 0 |
| 工程红线 15 | 15 | 提交恰三件＋pathspec；11 token／12 区未动 |
| 文档同步 10 | 8 | 证据件读数齐、复算得出；§0 一句易误读＋迁移提示缺 |

均分 **95／100**，无 S1 ⇒ **PASS**。
