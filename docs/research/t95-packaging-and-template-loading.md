# #95 打包与模板装载：files／loader／publish 门（实测证据）

票面：GitHub issue #95（wayfinder 地图 #63 子票）「三处漏洞：`files` 不发模板／`WITH_TEMPLATES` 不含
skill-calorie／`templates/*.html` 没有任何产品代码读它」。术语以 `CONTEXT.md` 为准。

**结论**：三处全部闭合。四门（build／boundaries／snapshot:check／publish:pre）exit 0；打包实证走
「npm pack → 安装布局 → loadTemplate 真读 6 件」；变异自证三项（files 口径／loader 清单／G2 逐件点名）。

---

## 1. 三处漏洞的前后对照

| # | 漏洞 | 变更前 | 变更后 | 落点 |
| --- | --- | --- | --- | --- |
| 1 | 模板不发包 | `files: ["dist","SKILL.md"]` | `files: ["dist","SKILL.md","templates/*.html"]` | `packages/skill-calorie/package.json:16-20` |
| 2 | publish 门不覆盖 | `WITH_TEMPLATES` 只有 chef/bill/home/memo/schedule | 收入 `skill-calorie`，并新增 `TEMPLATE_NAMES` 逐件点名 | `tooling/check-publish.mjs:36`、`:38-41`、`:84-93` |
| 3 | 模板无产品代码读 | 只有 `test/skill-t11.test.mjs` 直接 `readFileSync` | 新增 loader `src/render/templates.ts` ＋ 经 `src/render/index.ts` 导出；测试改经 loader 装载 | `packages/skill-calorie/src/render/templates.ts:1-28`、`src/render/index.ts:69-70`、`test/skill-t11.test.mjs:34-48` |

loader 口径对齐同族 5 个 skill（`skill-chef/src/render/templates.ts:34-40` 为范式）：

- `CALORIE_TEMPLATES = ['home','diet','exercise','goal','photo-gallery','help']`（与 `templates/*.html` 双向对齐，测试断言）。
- 错误码复用 `CalorieRenderError` 既有三码：未知模板 → `bad-input`；文件缺失 → `missing-data`。**不新增错误码**
  （`src/render/errors.ts` 不在本票写权限内，且既有码语义已覆盖「坏输入／缺失阻断不返空」）。

## 2. 「`../../templates` 在 dist 下能否解析」——实测而非推理

`tsc` 不复制非 TS 资源，所以 `dist/render/templates.js` 里的 `templatesDir` 解析结果只可能是**包根**：

- 源码态：`packages/skill-calorie/dist/render/templates.js` → 上溯两级 = `packages/skill-calorie/templates`（工作区存在）。
- 安装态：`node_modules/skill-calorie/dist/render/templates.js` → 上溯两级 = `node_modules/skill-calorie/templates`
  （**只有 `files` 发了 templates 才存在**）。

因此「能否解析」等价于「`files` 是否发模板」，实测链见 §3；反证见 §5（变异 1）。

## 3. 打包实证（真跑，非推理）

### 3.1 独立实证脚本 `docs/research/t95-publish-evidence.mjs`

`node docs/research/t95-publish-evidence.mjs`：造包（npm pack）→ `tar -tf` 逐件断言 → `tar -xzf` 到
`<tmp>/node_modules/skill-calorie`（**真实安装布局**）→ 从安装布局 import `dist/render/templates.js`
→ 逐件 `loadTemplate` 断言内容与双标记。实测输出（`.scratch/t95/ev-normal.txt`）：

```
OK: A files 含 templates/*.html（["dist","SKILL.md","templates/*.html"]）
OK: B tarball 含全部 6 件模板
OK: B tarball 含 dist/render/templates.js
OK: B tarball templates/ 条目 6 个，全包条目 400 个
OK: C 安装布局 templates/ = diet,exercise,goal,help,home,photo-gallery
OK: C loadTemplate(diet) → 1798 字节，双标记各 1
OK: C loadTemplate(exercise) → 1735 字节，双标记各 1
OK: C loadTemplate(goal) → 1723 字节，双标记各 1
OK: C loadTemplate(help) → 1810 字节，双标记各 1
OK: C loadTemplate(home) → 1677 字节，双标记各 1
OK: C loadTemplate(photo-gallery) → 1749 字节，双标记各 1
t95 打包实证：PASS
```

> 环境口径：临时根固定仓库内 `.scratch/t95/ev`（ASCII）。实测 Windows 中文用户目录（`%TEMP%` 含非 ASCII）
> 下 `bsdtar` 打不开 tgz（`Error opening archive`），故脚本与 `tooling/check-publish.mjs` 统一走 ASCII 临时根。

### 3.2 publish 门 G2（tarball 清单逐件）

`node tooling/check-publish.mjs --tarball --only skill-calorie`（`.scratch/t95/tarball-only.txt`）：

```
OK: skill-calorie tarball 含 dist/cli/cmd_read.js
OK: skill-calorie tarball 含 templates/
OK: skill-calorie tarball 含全部 6 件模板
check-publish --tarball：PASS
```

### 3.3 publish 门 G3（fresh 安装态真读）

`node tooling/check-publish.mjs --fresh-tmp --only skill-calorie`：npm pack → 临时工程 `npm install`
→ 生成断言脚本从**安装产物内**取 `dist/render/templates.js` 并逐件 `loadTemplate`。实测
（`.scratch/t95/fresh-only.txt`）：

```
OK: skill-calorie 打包 skill-calorie-0.1.1.tgz
OK: fresh-tmp npm install 1 实包成功
OK: skill-calorie 安装态 templates/ 6 件经 loadTemplate 全部装载成功
G3 安装态断言全绿
check-publish --fresh-tmp：PASS
```

> 附带修复（本票范围内，`tooling/check-publish.mjs`）：G3 原来在 Windows 上**空跑**——安装目录
> 落在中文 `%TEMP%` 且无 `package.json` 时 `npm install` 退出码 0 却不落 `node_modules`（实测对照：
> ASCII 路径 + 自带 package.json 绿 / 中文安装目录红 / 缺 package.json 红）。现改为 ASCII 临时根 ＋
> 写入最小 `package.json`。CI（Ubuntu，ASCII）行为不变。

### 3.4 真实 `npm install` 安装态（人工 + 脚本双证）

```
D:\ilife\packages\skill-calorie> npm pack --pack-destination D:\ilife\.scratch\t95\packtest
D:\ilife\.scratch\t95\insttest> npm install <tgz>
node_modules\skill-calorie\  -> dist  templates  package.json  SKILL.md
Test-Path node_modules\skill-calorie\templates -> True
```

## 4. 门禁实测（本票改动后，持锁）

| 门禁 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 构建 | `pnpm build` | exit 0 | `.scratch/t95/final-*.txt` |
| 边界 | `pnpm boundaries` | exit 0 | 同上 |
| 快照 | `pnpm snapshot:check` | exit 0 | 同上 |
| 发布（pre） | `pnpm publish:pre` | exit 0 | 同上 |
| 测试 | `node --test <根 test globs>` | exit 1，失败集见 §6 | `.scratch/t95/test-delta-A.md` |

`packages/skill-calorie/test/skill-t11.test.mjs` 单跑：`tests 5 / pass 5 / fail 0`（exit 0）。

## 5. 变异自证

| # | 变异 | 期望 | 实测（证据文件） |
| --- | --- | --- | --- |
| 1 | 真 `package.json` 的 `files` 摘掉 `templates/*.html` | G2 红 | `FAIL: skill-calorie tarball 缺 templates/` ＋ `缺模板：diet, exercise, goal, help, home, photo-gallery`，`check-publish --tarball：2 处红`（`.scratch/t95/mut-files-break.txt`）；还原后 `PASS`（`mut-files-restored.txt`） |
| 2 | `files` 变异态跑独立实证 | B/C 红且脚本判「被抓住」 | `FAIL(B) 缺模板 ×6`、`FAIL(C) 安装布局无 templates/`、`loadTemplate ×6 抛 missing-data`、`变异被抓住（B红 1 处、C红 7 处）→ PASS`（`.scratch/t95/ev-mutate.txt`） |
| 3 | `CALORIE_TEMPLATES` 摘掉 `photo-gallery` | `skill-t11` 红 | `✖ 模板 6 件经 loader 装载`＋`deepStrictEqual` 差 `'photo-gallery'`，`fail 1`（`.scratch/t95/mut-loader-break.txt`） |
| 4 | 还原后 | 全绿 | `pass 5 / fail 0`（`.scratch/t95/mut-loader-ok.txt`） |

变异用 `.scratch/t95/mutate.mjs`（`loader-break`／`files-break` 及对应 restore），每次变异后立即还原并重跑。

> 变异方法论坑（实测记录）：`fs.copyFileSync` 还原会保留备份文件的 mtime，而 `tsc -b` 增量按 mtime 判定，
> 会出现「源码已还原但 `dist/` 仍是变异产物」的假绿。故本票每次 restore 后 `touch` 源文件再 `pnpm build`，
> 并核对 `dist/render/templates.js` 含 `photo-gallery` 才继续。

## 6. 测试失败集 delta 与归因

冻结基线 21 条（`.scratch/t75/baseline-failing.txt`）。本票改动后实测（`.scratch/t95/test-delta-A.md`，
`node docs/research/t95-test-delta.mjs`）：**13 条失败，基线命中 12/21，新增 1 条，基线中消失 9 条**。
归因（逐条落到文件所有权）：

- **本票贡献 0 条**：`packages/skill-calorie/test/skill-t11.test.mjs` 单跑 `tests 5 / pass 5 / fail 0`；
  本票只新增 `src/render/templates.ts` ＋ 两行导出 ＋ `files` 一项，且不碰 CLI／DB／其它包。
- **新增 1 条**：`口径 · 删除回执可恢复性：文案与库内语义一致（软删行留／硬删行无）`，落在
  `packages/skill-calorie/test/cmd-write-40-persist.test.mjs`（**#101 未提交的在飞新测试**）。
- **消失 9 条**（#48／#50 envelope 契约 7 条 ＋ #93 只读 2 条）：现已单跑全绿
  （`plugin-calorie/test/smoke.test.mjs` 10/10、`skill-calorie/test/db-readonly-93.test.mjs` 8/8），
  系 #87 CLI 出口（`src/cli/cmd_read.ts`／`src/output.ts`）与 #93 的在飞/已提交修复所致。
- **口径提醒**：本工作区同时有 5 个 agent 在飞，失败集本身在移动（同一命令先后跑出 16／17／13 条）；
  上表取本票改动后的最后一次快照。审查者要核的是「本票路径未新增失败」而非「集合冻结」。
- 参考：`--reuse` 重解析时 TAP 会把名字里的 `#` 转义成 `\#`，未反转义会造出 13 条假 delta（脚本已处理）。

## 7. 偏离／未做

1. **`html.ts` 未接线**：`render/pageShell` 仍自建 HTML 壳，未走 loader——该文件不在本票写权限内
   （#87 占 `src/cli/cmd_read.ts`、#101 占 `src/cli/write.ts`／`src/render/photo.ts`）。本票把 loader 做成
   可被出口消费的公开 API ＋ 用 publish 门/测试证明安装态可读，接线留给后续票。
2. **全量 13 包 fresh 未跑**：本票范围是卡路里线；`pnpm publish:fresh`（4 包口径）含 registry 拉取，
   本地中文路径环境曾失败，CI 覆盖。
3. **发现（不在本票范围，需转票）**：安装态 `import('skill-calorie/render')` 会连带加载 `base-paint`，
   而 registry 上的 `base-paint` 落后于工作区（实测缺 `ACTION_ID_ATTR`）——这是**版本偏斜**，会让
   「安装态整包可用」类断言假红；G3 因此改从安装态 `dist/render/templates.js` 取 loader（见 §3.3 注）。

## 8. 复跑

```sh
pnpm build
node docs/research/t95-publish-evidence.mjs          # A/B/C 打包实证（PASS）
node docs/research/t95-publish-evidence.mjs --mutate # files 变异态（B/C 红、D 绿）
node tooling/check-publish.mjs --tarball --only skill-calorie
node tooling/check-publish.mjs --fresh-tmp --only skill-calorie
node docs/research/t95-test-delta.mjs                # 失败集 vs 冻结基线
node --test packages/skill-calorie/test/skill-t11.test.mjs
```
