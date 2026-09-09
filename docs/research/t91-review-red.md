# #91 红队初审（对抗式审查 · 红队席 · 独立复跑）

- 被审：`a245431`（feat 91）／`a544461`（docs 91）。审查者：红队 subagent，未采信实施者结论，逐项自跑。
- **verdict：PASS**（五维 91/100；无 S1-交付缺陷／无 S1-过程违规；5 条 S3）。
- 自设探针：`.scratch/orchestrator/red9-probe.mjs`（59 检查）／`red9-run1.mjs`／`red9-mut.mjs`／`red9-rerun112.mjs`。

## ① 复跑清单 ＋ exit（均经 `run-locked.mjs --ticket 91`）

| 复跑 | 结果 |
|---|---|
| 实施者探针 `node docs/research/t91-probe.mjs` | **28/28，exit 0** |
| 靶向 `node --test help-center-91 + cmd-read-t11 + render-copy-90` | **exit 0**（23/23 pass／fail 0；两条既有测试原样通过） |
| 红队自设探针 | **57/59**；2 FAIL＝⑥ b 并发命名（⑦ S3-1） |
| canonical `pnpm test` 1 轮 | tests 1102／suites 131／pass 1076／**fail 26**／exit 1（＝冻结基线既有红） |
| delta `t101-fail-set` | `base=34 after=30 新增=1 消失=5`；新增＝`#112 无假数据：4 键空库一律 exit 4` |
| 新增项定类：干净 `pnpm build` 后 `node --test nutrition-port-112.test.mjs` ×2 | **各 12/12／exit 0**；签名 `status=3221225501`（`0xC000001D`）＋**stderr 空**；基线两轮（`09b:855`／`09c:853`）均 ✔；文件与被测对象均非本票 → **B 类，真 delta 0**（我复现的是**另一条**测试名，结论同类） |
| 门禁对账（`--allow-nonzero --allow-undeclared`＋其两行 GATE-RELAX） | **matched=18/18、undeclared=7、PASS**（不加开关即 FAIL，与其声明一致） |
| 导出保真（对比 live `gate-runs.log`） | `t91-gate-runs.log` 25 条全 `ticket=91`；`t88-gate-runs.log` 6 条全 `ticket=88`（连带提交的是 #88 真导出） |

## ② 三态独立复算（自跑 CLI）

| mode | 字节／行 | `data-scene-id` | `data-subgroup-id` | 复制按钮 | `<!DOCTYPE` | stdout |
|---|---|---|---|---|---|---|
| `file`（含无参） | **1,028,317**／4,049 | **436** | **54** | **1,308** | 1 | 1,051 B |
| `inline` | **819,941**／4,038 | 436 | 54 | 1,308 | **0** | **1,052 B**（无 `<style>`／`ilife-help-shell`，不含 1 MB 片段） |
| `text` | **24,391**／513 | 纯文本 436 行索引 | — | — | 0 | 18,843 B（＝`data.text`，逐字＝落盘） |

- `file`／`inline`／`text` 三态 436 个 id **序逐字相同**、两两不同；envelope 恒 `version/skill/shape/key/data`（**无 `status`**），`data` 无 `html`，`bytes`＝`size`＝`byteLength`，`sceneTotal=436`／`subgroupTotal=54`／`items=10`／`sceneCount` 求和 436。
- 与自陈吻合；唯一差异＝`inline` stdout 1,052 vs 1,059 B（临时路径长度差 7 B，非缺陷）。

## ③ 照片 10 键兼容

- `{q:"记身材照"}`：exit 0、`total=3`、`data` 键集恒 `items,total,output`、item 键集恒 `wakeWord,key,desc,exec`、零 `<!DOCTYPE`、按钮数＝total、含 `data-ilife-helpers`。
- **字节级比对（新做法）**：CLI 产物 ＝ `renderPhotoHelpHtml(lookupPhotoHelp('记身材照'),'记身材照')` 逐字节相等；`{q:""}` 产物 ＝ `renderPhotoHelpHtml(buildPhotoHelp(), undefined)`（**改前无参形态**）逐字节相等 → 兼容＝同一渲染器同一入参。
- `keyword` 别名＝`q`（产物逐字相同）；`{q:"  "}`→exit 2（改前同码）；改前分支的 `items` 映射与 `return` 在现源码逐字保留，改前 `help.center` 分支无 `mode`。

## ④ F3 parity（只读 `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`）

- F3 payload：分组 **10**／子功能 **54**／场景 **436**；产物 436 卡／54／10；10 个分组 label **序逐字相同**。
- **prompt 全量逐字（不止抽样）**：436 张卡的 `<pre class="prompt">` 与 F3 `prompt_template` **436/436 相同**（414 条 id 直配、22 条 legacy 按标题回配）；抽样 10 条 10/10。
- `____` 含占位符场景 **130＝130**、逐卡出现 **288＝288**（整页 864＝×3 渲染位）；「三句话」**436＝436**。→ 比实施者自证更强（其未做文本比对）。

## ⑤ 变异复核（同锁区：变异→build→靶向贴红→立即还原→`tsc -b --force`→贴绿）

| 变异 | 红点（实测） | 还原自证 |
|---|---|---|
| **MUT-91-1** `?? 'file'`→`?? 'inline'` | test exit 1／fail 1：`AssertionError: 缺省交付形态＝file` | 整文件 sha256 `893D34EB…90469` 逐字相同；重建 exit 0；5/5 pass |
| **MUT-91-2** 照片守卫→`if (false && …)` | test exit 1／fail 1：`AssertionError: 照片路径 data 键集不回归（output 由出口追加）` | 同上；重建 exit 0；5/5 pass |

`git status --short -- packages/skill-calorie` 零残留；运行前后 sha256 一致（脚本 `finally` 兜底）。

## ⑥ 新探针 a–c（被审脚本盲区）

**a. `mode`×`q` 边界**：`{mode:1/true/[]}`→exit 2「须为字符串」；`{mode:""/"FILE"}`→exit 2「非法」；非空 `q`＋`mode`→exit 2「互斥」；`{q:"  ",mode:"file"}`→exit 2。**未定义格**：`{mode:"file|inline|text", q:""}`→**exit 0 且 `q` 被静默忽略**；`{mode:null}`→**exit 0、缺省 file**（⑦ S3-2）。

**b. 同秒命名（#87 `_2`/`_3`）**：串行成立；**并发不成立**——3 轮×5 并发实测重名 `dup=5`，其中 **5 次落点内容≠该调用自己的产物**（交叉覆盖）。根因＝`output.ts` 探测-写入非原子（本票零改动，范围外），但 1 MB 产物把窗口拉到 ~200–300 ms，放大撞名。

**c. `--output`**：三态均生效且产物与默认落点逐字相同；`--html` 别名、照片路径同效；同路径重复＝覆盖不报错；父目录缺失自动创建。

## ⑦ 缺陷清单（无 S1／无 S2）

1. **S3-1（范围外·转 #87，建议按 S2 处理）** 并发同秒撞名→产物互相覆盖（⑥ b）：`data.output` 可能指向另一次调用的产物。本票未引入（`output.ts` 零改动）→ 按 §5.1 记 S3，不据此否决。
2. **S3-2（本票·措辞）** 两格未定义：`q:""`＋`mode` 时 `q` 静默忽略；`mode:null` 不校验（证据 §2 字面写「非字符串→exit 2」）。建议显式 exit 2 或写明口径。
3. **S3-3（本票·未登记）** `{q:null}` 改前＝照片 10 键、改后＝全量速查台 `file`（"null＝缺省"的自然结果，台账未列）。
4. **S3-4（本票·交接，与自陈一致）** `routing.ts:632` 唤醒词仍指照片现找／`keys.ts:87` `title='身材照HELP'`／`SKILL.md:184` 仍写「全量 10 键」（**我复核为真**）——均不在本票所有权内。
5. **S3-5（审查侧可追溯性）** 红队探针按派单路径所有权落在 gitignored `.scratch/orchestrator/red9-*`，第三方无法一键复跑；建议归并入受跟踪探针。

**过程合规**：`a245431` 连带提交 #88 已 staged 的 `t88-gate-runs.log`（内容为 #88 真导出，两票均如实补注）→ §4.6 不判缺陷。未见裸跑迹象／危险 git 命令／`pnpm install`。

## ⑧ 五维 ＋ verdict

| 维度 | 分 | 依据 |
|---|---|---|
| 契约一致 30 | **27** | Q9 默认 file／D6 三态／互斥 exit 2／Q8 无 `status`／#88 §7.3 逐条落地；扣 3＝S3-2／S3-3 |
| 证据真实可复现 25 | **23** | 探针 28/28、靶向 23/23、canonical 计数复现、delta 独立定类、对账 18/18、变异 2/2、字节逐字；扣 2＝「同秒冲突自动加后缀」写成无条件保证（其新测只跑串行） |
| parity 20 | **20** | F3 436/436 prompt 逐字、130/288 `____`、436「三句话」、10/54/436 与分组序 |
| 工程红线 15 | **13** | 持锁留痕可对账、无危险 git／无 install、变异零残留；扣 2＝并发命名覆盖风险（范围外根因，落在本票 1 MB 交付面） |
| 文档同步 10 | **8** | 证据完整可核；扣 2＝S3-2／S3-4 待补 |

**均分 91/100；无 S1-交付缺陷、无未处置 S1-过程违规 → PASS**（S3-1 建议编排者按 S2 转 #87）。

**机械门禁对账（§2.4；对账源＝live `.scratch/locks/gate-runs.log`，本报告未越权导出）**
GATE-RELAX flag=--allow-nonzero reason=canonical `pnpm test` 因冻结基线既有红必然 exit=1；红队探针／变异脚本聚合 exit=1 分别来自自设 FAIL 结论与变异红半，非门禁失败
GATE-RELAX flag=--allow-undeclared reason=上述过程运行不得充作门禁证据，仅列 runId 追溯
GATE-RUN runId=498850d2-ca5d-4e20-804c-2d1f8f3aa3e0 cmd="pnpm build"
GATE-RUN runId=3fff757e-ef35-4531-bd26-25bf9e5181b0 cmd="node --test packages/skill-calorie/test/help-center-91.test.mjs packages/skill-calorie/test/cmd-read-t11.test.mjs packages/skill-calorie/test/render-copy-90.test.mjs"
GATE-RUN runId=21bb8531-4c1d-4672-b6d1-34647d9f388b cmd="node .scratch/orchestrator/red9-rerun112.mjs"
GATE-RUN runId=dd9fb8e1-5e58-4471-ac06-19fd7ce13440 cmd="node .scratch/orchestrator/red9-run1.mjs"
GATE-RUN runId=113701f3-765f-4055-b866-ed3296368bb3 cmd="node .scratch/orchestrator/red9-probe.mjs"
GATE-RUN runId=c2dc6d5b-09f0-4fa6-aaa6-2bf2272bb48a cmd="node .scratch/orchestrator/red9-mut.mjs"
GATE-RUN runId=359fecb7-9f22-4e00-af94-f4a0c3b7585a cmd="pnpm test"
