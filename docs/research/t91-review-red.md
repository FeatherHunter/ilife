# #91 红队初审（对抗式审查 · 红队席 · 独立复跑）

- 被审：`a245431`（feat 91：`cmd_read.ts` 分支＋helper＋新测 5 用例）／`a544461`（docs 91：证据＋探针＋对账导出＋canonical 日志＋changeset）。
- 审查者：红队 subagent（未采信实施者结论，逐项自跑）；工作区 HEAD＝`a544461`，无他票改动混入本报告路径。
- **verdict：PASS**（五维 91/100；无 S1-交付缺陷／无 S1-过程违规；5 条 S3）。
- 自设探针（派单要求的 a–c ＋ 附加）：`.scratch/orchestrator/red9-probe.mjs`（59 检查）／`red9-run1.mjs`／`red9-mut.mjs`／`red9-rerun112.mjs`（均 gitignored，见 ⑦ S3-5）。

## ① 复跑清单 ＋ exit

| 复跑 | 命令（均经 `tooling/run-locked.mjs --ticket 91`） | 结果 |
|---|---|---|
| 实施者探针 | `node docs/research/t91-probe.mjs` | **28/28 PASS，exit 0**（独立复现） |
| 靶向三测试 | `node --test help-center-91.test.mjs cmd-read-t11.test.mjs render-copy-90.test.mjs` | **exit 0**（23/23 pass、fail 0；两条既有测试**原样**通过） |
| 红队自设探针 | `node .scratch/orchestrator/red9-probe.mjs` | **57/59**；2 条 FAIL＝⑦ S3-1 并发命名（见 ⑥ b） |
| canonical `pnpm test`（1 轮） | `pnpm test` | tests 1102／suites 131／pass 1076／**fail 26**，exit 1（＝冻结基线既有红） |
| delta | `t101-fail-set.mjs …` | `base=34 after=30 新增=1 消失=5`；新增＝`#112 无假数据：4 键空库一律 exit 4` |
| 新增项定类 | 干净 `pnpm build` 后 `node --test nutrition-port-112.test.mjs` ×2 | **各 12/12 pass／exit 0**；签名 `status=3221225501`（`0xC000001D`）＋**stderr 空**；基线两轮（`09b:855`／`09c:853`）均 ✔；文件与 `help.center` 无关 → **B 类，真 delta 0**（与实施者同类但**另一条**测试名，我独立复现同结论） |
| 门禁对账 | `check-gate-audit --evidence t91-help-center-cli.md --ticket 91 --since 14:09:30Z --until 14:13:00Z --log docs/research/t91-gate-runs.log --allow-nonzero --allow-undeclared` | **matched=18/18、undeclared=7、PASS**（复现其自陈；不加两开关则 FAIL，与其 GATE-RELAX 声明一致） |
| 导出保真 | 对比 live `.scratch/locks/gate-runs.log` | `t91-gate-runs.log` 25 条全 `ticket=91`；`t88-gate-runs.log` 6 条全 `ticket=88`（连带提交的是 #88 真产物，非伪造） |

## ② 三态独立复算（自己跑 CLI，不看其证据）

| mode | 产物字节／行 | `data-scene-id` | `data-subgroup-id` | 复制按钮 | `<!DOCTYPE` | stdout |
|---|---|---|---|---|---|---|
| `file`（含无参） | **1,028,317**／4,049 | **436** | **54** | **1,308** | 1 | 1,051 B |
| `inline` | **819,941**／4,038 | 436 | 54 | 1,308 | **0** | **1,052 B**（不含 1 MB 片段：无 `<style>`／`ilife-help-shell`） |
| `text` | **24,391**／513 | —（纯文本 436 行索引） | — | — | 0 | 18,843 B（＝`data.text`，逐字＝落盘） |

- `file`／`inline` 的 436 个 `data-scene-id` **序逐字相同**；`text` 的 436 行 id 序亦逐字相同（`P1-13/14`）；id 两两不同。
- envelope 三态恒 `version/skill/shape/key/data`（**无 `status`**，Q8），`data` 无 `html`；`bytes` ＝ `statSync().size` ＝ `byteLength`；`sceneTotal=436`／`subgroupTotal=54`／`items=10`／分组 `sceneCount` 求和 436。
- 与实施者自陈逐项吻合（唯一差异：`inline` stdout 1,052 vs 其 1,059 B，差 7 B ＝临时目录路径长度，非缺陷）。

## ③ 照片 10 键兼容

- `{"q":"记身材照"}`：exit 0、`total=3`、`data` 键集恒 `items,total,output`、item 键集恒 `wakeWord,key,desc,exec`、产物零 `<!DOCTYPE`、按钮数＝total、含 `data-ilife-helpers`。
- **逐字字节比对**（新做法）：CLI 产物 ＝ `renderPhotoHelpHtml(lookupPhotoHelp('记身材照'),'记身材照')` **逐字节相等**；`{"q":""}` 产物 ＝ `renderPhotoHelpHtml(buildPhotoHelp(), undefined)`（＝**改前无参形态**）**逐字节相等** → 兼容不是"看起来像"，是同一渲染器同一入参。
- `keyword` 别名＝`q`（产物逐字相同）；`{"q":null}` 见 ⑦ S3-3；`{"q":"  "}` → exit 2「查询词必填」（改前同码，非回归）。
- 改前面照片分支的 `items` 映射与 `return` 在现源码**逐字保留**；改前 `help.center` 分支无 `mode`（`P2-8/8b`）。

## ④ F3 parity 抽查（只读 `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`）

- F3 `help-data` payload：分组 **10**／子功能 **54**／场景 **436**；产物 436 卡／54 子功能／10 分组；10 个分组 label **序逐字相同**。
- **prompt 逐字全量比对（不止抽样）**：436 张卡的 `<pre class="prompt">` 与 F3 `prompt_template` **436/436 逐字相同**（414 条按 id 直配、22 条 legacy 按标题回配；`P6-5`），抽样 10 条 10/10。
- `____`：含占位符场景 **130＝130**、逐卡出现总数 **288＝288**（整页 864＝逐卡×3 渲染位）；「三句话」：**436＝436**（逐卡 436＝436）。
- 结论：parity 比实施者自证更强（其证据未做 prompt 文本比对）。

## ⑤ 变异复核（独立重跑，同锁区，逐处红→立即还原→干净重建→绿）

| 变异 | 改动 | 红点（实测） | 还原自证 |
|---|---|---|---|
| **MUT-91-1** | `?? 'file'` → `?? 'inline'` | `test exit 1 / fail 1`：`AssertionError: 缺省交付形态＝file` | 整文件 sha256＝`893D34EB…90469` **逐字相同**；`tsc -b --force` exit 0；5/5 pass |
| **MUT-91-2** | 照片守卫 → `if (false && …)` | `test exit 1 / fail 1`：`AssertionError: 照片路径 data 键集不回归（output 由出口追加）` | 同上 sha256 相同；重建 exit 0；5/5 pass |

`git status --short -- packages/skill-calorie` 无残留（变异脚本 `finally` 兜底还原，运行前后 sha256 一致）。

## ⑥ 新探针 a–c（被审脚本覆盖不到的盲区）

**a. `mode`×`q` 边界**：`{mode:1}`／`{mode:true}`／`{mode:[]}`→exit 2「须为字符串」；`{mode:""}`／`{mode:"FILE"}`→exit 2「非法」；`{q:"记身材照",mode:…}`→exit 2「互斥」；`{q:"  ",mode:"file"}`→exit 2。**未定义格**：`{mode:"file"/"inline"/"text", q:""}`→**exit 0 且 `q` 被静默忽略**；`{mode:null}`→**exit 0、缺省 file**（见 ⑦ S3-2）。

**b. 同秒命名冲突（#87 `_2`/`_3`）**：串行成立（同秒两次调用各自加后缀）；**并发不成立**——3 轮 × 5 并发（file/inline/text/file/inline）实测重名 `dup=5`，其中 **5 次落点内容≠该调用自己的产物**（交叉覆盖，`P4-1/2` FAIL）。根因＝`output.ts` 的探测-写入非原子（本票零改动，范围外）；但本票 1 MB 产物把窗口拉到 ~200–300 ms，显著放大撞名。

**c. `--output` 三态**：`file`／`inline`／`text` 三态 `--output` 均生效且产物与默认落点**逐字相同**；`--html` 别名同效；照片路径同效；同路径重复调用＝覆盖不报错；父目录不存在时自动创建（exit 0）。

## ⑦ 缺陷清单（无 S1／无 S2；均 S3）

1. **S3-1（范围外·转 #87，建议按 S2 处理）** 并发同秒撞名→产物互相覆盖（⑥ b）。用户可见后果：`data.output` 指向的文件可能装的是另一次调用的产物。本票**不引入**该缺陷（`output.ts` 零改动），故按协议 §5.1 记 S3＋转票，不据此否决。
2. **S3-2（本票范围·措辞）** 参数契约两格未定义：`q:""`＋`mode` 时 `q` 静默忽略；`mode:null` 不校验（证据 §2 字面写「非字符串 → exit 2」）。建议改为显式 exit 2，或在证据/`SKILL.md` 写明口径。
3. **S3-3（本票范围·未登记）** `{"q":null}` 改前＝照片 10 键、改后＝全量速查台 `file`（"null＝缺省"约定的自然结果，但偏离台账未列此格）。
4. **S3-4（本票范围·交接，与实施者自陈一致）** 唤醒词入口（`routing.ts:632` 仍指照片现找）／`keys.ts:87` `title='身材照HELP'`（默认落盘名与语义不符）／`SKILL.md:184` 仍写「全量 10 键」（**我复核为真**）——三者均不在本票路径所有权内。
5. **S3-5（审查侧可追溯性）** 按派单路径所有权，红队探针落在 gitignored `.scratch/orchestrator/red9-*`，第三方无法一键复跑本报告数字；建议编排者归并入受跟踪探针。

**过程合规**：`a245431` 连带提交 #88 已 staged 的 `docs/research/t88-gate-runs.log`（内容为 #88 真导出，两票均已如实补注）→ 按 §4.6 不判缺陷。未见裸跑迹象、未见危险 git 命令、未跑 `pnpm install`。

## ⑧ 五维打分 ＋ verdict

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **27** | Q9 默认 file／D6 显式三态／互斥 exit 2／Q8 无 `status`／#88 §7.3 逐条落地；扣 3＝⑦ S3-2／S3-3 两格未定义 |
| 证据真实可复现 25 | **23** | 探针 28/28、靶向 23/23、canonical 计数逐字复现、delta 独立定类、对账 18/18、变异 2/2 复现、字节逐字吻合；扣 2＝「同秒冲突自动加后缀」写成无条件保证（其新测只跑串行） |
| parity 20 | **20** | F3 436/436 prompt 逐字、130/288 `____`、436「三句话」、10/54/436 计数与分组序逐字 |
| 工程红线 15 | **13** | 持锁留痕可对账、无危险 git／无 install、变异零残留、工作区干净；扣 2＝并发命名数据覆盖风险（范围外根因，落在本票 1 MB 交付面） |
| 文档同步 10 | **8** | 证据文档完整、file:line 可核；扣 2＝S3-2／S3-4 待补 |

**均分 91/100；无 S1-交付缺陷、无未处置的 S1-过程违规 → verdict PASS**（S3-1 建议编排者按 S2 转 #87）。

**机械门禁对账（协议 §2.4；对账源＝live `.scratch/locks/gate-runs.log`，本报告未越权导出）**
GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 因冻结基线既有红必然 exit=1；红队自设探针与变异脚本的聚合 exit=1 分别来自「自设 FAIL 结论」与「变异红半」，均非门禁失败
GATE-RELAX flag=--allow-undeclared reason=上述两类过程运行不得充作门禁证据，仅列 runId 追溯
GATE-RUN runId=498850d2-ca5d-4e20-804c-2d1f8f3aa3e0 cmd="pnpm build"
GATE-RUN runId=3fff757e-ef35-4531-bd26-25bf9e5181b0 cmd="node --test packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs"
GATE-RUN runId=21bb8531-4c1d-4672-b6d1-34647d9f388b cmd="node .scratch/orchestrator/red9-rerun112.mjs"
GATE-RUN runId=dd9fb8e1-5e58-4471-ac06-19fd7ce13440 cmd="node .scratch/orchestrator/red9-run1.mjs"
GATE-RUN runId=113701f3-765f-4055-b866-ed3296368bb3 cmd="node .scratch/orchestrator/red9-probe.mjs"
GATE-RUN runId=c2dc6d5b-09f0-4fa6-aaa6-2bf2272bb48a cmd="node .scratch/orchestrator/red9-mut.mjs"
GATE-RUN runId=359fecb7-9f22-4e00-af94-f4a0c3b7585a cmd="pnpm test"
