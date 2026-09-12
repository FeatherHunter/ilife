# t195 事实提炼：init_banner 与 contact/recommendations、与记账的差异

## 一、init_banner 显隐口径

- 判法：`existsSync(<db 路径>)` 为真即「已初始化」，`init_banner.hidden = true`（`t186-template-contract.md:180`）。
- 键常在、显隐走 `hidden`：不给状态就 `hidden: false`，横幅照显，键集不随状态变（`:181`）；另有环境变量强制口 `HELP_INITIALIZED` 为 `1/true/yes` 即视为已初始化（`:171-173`）。
- 读失败／异常 ⇒ `initialized = false`（照显，fail-open）；误显只多一条提示，误藏会让新用户不知从哪开始（`:182`）。
- 不要建库：**不得调 `openHomeDb`**，它会 `new DatabaseSync` 并跑 `CREATE TABLE IF NOT EXISTS…` 全量 DDL（`skill-home/src/fetch/db.ts:54-70`），等于让「看帮助」这个只读页把 `home.db` 建出来；记账把这条写成硬口径并在开库之前走（`:183`）。不能直接复用的现成函数：`skill-home/src/fetch/paths.ts:20-23` 的 `resolveDbPath()` 内部带 `mkdirSync(dir, { recursive: true })`，光算路径就把 `SKILLS_DB_PATH` 目录建出来（`:184`）。
- 因此判初始化要么在接线层自拼 `join(resolveDbDir(), 'home.db')`，要么给 paths 增一个不建目录的只读取路径出口（归 #187／#189 定，本票只报坑）（`:184`）。
- `SKILLS_DB_PATH` 未设时 `resolveDbDir()` 抛（`paths.ts:9-18`；`cmd_read.ts:40-46`），接线层照其行为 fail-open 即可（`:185`）。
- `init_banner.prompt` 取自内容资产里初始化场景的 `prompt_template`（单源，不抄第二份）；场景缺位即抛，不静默把横幅降级掉（`:192-194`）。
- 文案：`title` 为 `'🚀 第一次用居家管家?'`、`subtitle` 为 `'从「初始化」开始 — …完成初始化后,本区域将不再出现。'`、`button_text` 为 `'📋 复制初始化 prompt'`（`:189-191`）。
- 老居家横幅在 `help_center.html` 里另有 6 步文案，新线**不必搬**；`steps` 想要就传 `{title, desc}` 对象数组，不传就不画步骤卡（`:195`）。

## 二、contact／recommendations

- `contact`：要传，值取老 `居家管家/scripts/help_center.py:31-35` 的三项，**不含手机号**——老注释写明是开源 PII 保护的约束（`:199`）。
- `recommendations`：**建议不传**。理由①老居家 HELP 根本没有「其他技能」段，全页搜「其他技能」零命中，模板只有联系作者段；②它与 `meta_blocks` 一样在 A 路不渲染，传了只有「页面对外载荷多个键」的效果，反而多一个漂移面（`:200`）。
- 若要传，照 A 路的三个名 `name/desc/wake`；`spec/help.ts:86-90` 的 `SceneRecommendation` 与 B 路渲染器读的是 `name/reason/wake_word`，两处不一致（`:201`）。

## 三、跟记账的差异与坑

- 生成物不要手改：`packages/base-render/src/helpShell.ts` 与 `test/help-shell-136.test.mjs` 都是 `gen-help-shell.cjs` 的产物，改模板只改源再 `gen:help-shell`（`t186-template-contract.md:207`）。
- 模板源两条硬门：必须全 CRLF（`gen-help-shell.cjs:28`）、开头必须是 `<!DOCTYPE html>`（`:29`），转 LF 当场抛（`:207`）。
- 居家要动两道边界门：`tooling/check-boundaries.mjs:37` 的 `SKILLS_BASE_FROZEN` 名单里现在还有 `skill-home`（`:208`）。
- 同一脚本 `:45`／`:56-60` 会扫居家 `src/**/*.ts` 与 `templates/*.html`，命中 `import ... base-paint/base-render` 即破界（`:208`）。
- 依赖声明口径：`base-paint: "^0.3.0"` ＋ `linkWorkspacePackages: true`（先例 `packages/skill-bill/package.json:24-26`）（`:209`）。
- 发布态风险：npm 上 `base-paint@0.3.0` 的 `exports` 没有 `./help-shell`，真安装态会 `ERR_PACKAGE_PATH_NOT_EXPORTED`（`:210`）。
- 模板侧四处「读了不用」：`subtitle`／`meta_blocks`／`recommendations` 在 A 路都不渲染，`ABOUT_EXTRA` 连来源都没有（`:211`）。
- 别混两套渲染的落点：B 路真渲染 `meta_blocks`、`subtitle`、`recommendations.name/reason/wake_word`，文档标题拼法也不同（`:212`）。
- `groups` 三处不变量：`groups` 空即抛（`helpShell.ts:149-151`，code `missing-data`／exit 5）；空 `scenes` 分组渲染成空白 `<details>`；场景 `id` 重名会取错场景（`:213`）。
- 产物可复现：`now` 必须显式传，格式 `YYYY-MM-DD HH:MM`（本地时区、零填充），坏 Date 即抛（`:214`）。
- `help-data` 的 JSON 逐字可回读：测试用「抽段 → `JSON.parse`」断言键集与值（`help-file-145.test.mjs:10-16`）（`:215`）。
- 用词：正文写「help 模板」不写「壳」（`docs/agents/wording.md:35`）；`home.help.lookup` 叫「命令」不叫「键」（`:19`）（`:216`）。

## 四、拿不准的

1. 老 yaml 的 `1-1`／`SM8-1` 编号要不要带进新资产；倾向 `id = scenario_id`，归 #188（`:222`）。
2. `subtitle` 要不要传；A 路不渲染，但 `meta_blocks[0].html` 要用它，倾向照传（`:223`）。
3. `version` 该不该取 `'2.0'`；老 yaml 写死 2.0，居家没有记账同款佐证（`:224`）。
4. `init_banner.prompt` 取哪个场景；两边名字不同做法相同，#188 最终 `id` 决定 #189 常量（`:225`）。
5. `types` 切分后的顺序与去重；合并同义原子的顺序规则得先定（`:226`）。
6. `contact.items[].url` 要不要标；照记账标了 `url: true`，两者外观一致无实差（`:227`）。
7. `meta_blocks`／`recommendations` 在 A 路不渲染要不要报给维护者；只报现象，不擅自定调（`:228`）。
8. `home.db` 判初始化要不要看 WAL 边车；只看主库文件即可，残局误判代价可接受（`:229`）。

## 五、对新文件放哪、对外给什么的约束

- 新文件属 `skill-home` 件，落 `docs/skills/skill-home/`，件名＝`packages/` 下目录名逐字（约束来源：`AGENTS.md` 文档归属）。
- 涉及 base-paint／base-render 的改动只改源：模板源必须全 CRLF、首行 `<!DOCTYPE html>`，生成物改后须 `gen:help-shell` 重生成（`t186-template-contract.md:207`）。
- 新增依赖须声明 `base-paint: "^0.3.0"` 且保留 `linkWorkspacePackages: true` 下的 `link:` 锁文件（`:209`）。
- 对外载荷键集不随状态变：`init_banner` 的键常在于给出全部键，显隐只走 `hidden`（`:181`）。
- 对外取值单源：`init_banner.prompt` 必须取自资产内初始化场景的 `prompt_template`，不另抄一份（`:192-194`）。
- 对外不承诺渲染：`subtitle`／`meta_blocks`／`recommendations` 在 A 路不渲染，验收不得以页面可见为准（`:211`）。
- 接线层对未设 `SKILLS_DB_PATH` 与读失败一律 fail-open（横幅照显），不得因此建库或建目录（`:182`、`:185`）。
