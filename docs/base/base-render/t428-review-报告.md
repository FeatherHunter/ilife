# #428 独立对抗审查报告（评审席）

**判定：PASS。** 五维均分 93（30/25/20/15/10 制），无 S1／S2；两条 S3 记账不构成 FAIL。
被审提交 `8b13cbc`；复查窗口 2026-09-14T12:34Z–12:38Z，逐条命令与读数见下（全部经
`node tooling/run-locked.mjs --ticket 428 -- <命令>`）。

## 1. 复跑门禁（各一次，逐条给 runId）

| 命令 | runId | exit | 摘要 |
| ---- | ----- | ---- | ---- |
| `pnpm build` | `0f484db9-80d7-4faf-9fc8-6f44a444e8ab` | 0 | 全仓构建通过 |
| `node --test …/page-finish-420.test.mjs` | `6c301c0c-a136-4e29-8501-01d0a6f61b92` | 0 | `tests 20／pass 20／fail 0` |
| `node --test …/blocks.test.mjs` | `5bd6da11-afe0-49e8-b153-ede10e9c33c7` | 0 | `46／46／0` |
| `node --test …/style.test.mjs` | `105d8366-97d0-45b5-a8ca-ad162b754250` | 0 | `29／29／0` |

三条判据件合并复跑：`tests 95／pass 95／fail 0`（`042497fc-84c4-49f5-b8ef-65adac4f80c5`，exit=0）。
另 `2f44b263-ccb9-48c6-951c-a27a9676edaa` 为同一条 `page-finish-420` 的重复条目（首次未留全摘要，作废）。

## 2. 鉴别力自证（本票核心，第 2 条）

注入＝在打印段 `.ilife-page-printable .ilife-block-toc {` 前**并列选择器**追加
`'  .' + p + PRINTABLE_SLUG + ', .' + p + ' { font-size: 11px }',`，随后 `pnpm build` 重编真产物。

| 读数 | runId | exit | tests／pass／fail |
| ---- | ----- | ---- | ----------------- |
| 注入 | `75ce018f-5fc3-492c-9df6-56a8826b22bf` | **1** | 20／19／1 |
| 写回原字节 | `35013aa6-828e-47c6-a33a-c5f24ef9beac` | **0** | 20／20／0 |

红的那条断言逐字：`AssertionError [ERR_ASSERTION]: 闭集外（未加打印作用域）的选择器：[".ilife-page"]`。
sha256 同值：变异前＝写回后＝`dba73fb9fd75c11e3f9dea571e994a08631ceb6f61047323eb596779a48f1fb1`。

红断言逐字与证据件 §2 ② 的读数**同值**（都是 `[".ilife-page"]`）。差别只在变异落点：
其 §3 自陈做在**字节同源镜像**上，本席按票面字面要求**直接改共享源码
`packages/base-render/src/blocks.ts`** 并 `pnpm build` 重编真产物 —— 红绿都成立，未见镜像屏蔽。

## 3. 基线可追溯（第 3 条）

夹具记 `baselineCommit=2ef942bf0c844102fafd5f97034f2569fec97b40`、
`sourceBlobSha256=be1affb194ea7b38462d9c635b056438428d4aeeb68f63bc4f7a4d052261cc2b`、
`sourceBlobSha1=1e07526ce11e2cd7c780aaf21f463829d5aec60d`。当刻仓库解 `dc16ba1^`
＝`2ef942bf…`；其 `blocks.ts` 字节（50741 B）sha256＝`be1affb1…`、git blob sha1＝`1e07526c…`
**逐项同值**（探针 `docs/base/base-render/t428-review-probe.mjs`，只读；另给 `PROBE-VERDICT
all-same=true bad=0`）。

夹具值非摆设（自做探针）：把夹具 4 处 `ilife-block ilife-block-page-shell` 改成
`ilife-blockX …` → `3dc22ff8-cec1-4cb6-919e-0c7510d5f485`，exit=**1**，20／16／**4**，四条红
（`新参数缺省必须零变`／`三件套缺省必须零变`／`转义面必须逐字同基线`／`除打印类外逐字同基线`）；
写回原字节 → `1803b929-4174-449f-a737-3411af64d758`，exit=**0**，20／20／0。
夹具 sha256 同值：`395c0ad4fc7e3a1d0c1697748290fa96e21f997e5dd0b4fd284b816749537030`。
`verify` 报 `blocks.ts == saved bytes=true`、`fixture == saved bytes=true`。

## 4. 归属（第 4 条）

`git show --stat 8b13cbc` ＝ 声明三件（`t428-判据硬化.md` 108、夹具 47、判据件 ＋296／−43），
无第四件。全文检索 `isFrozenToken`＝0 处、具名色表标识符＝0 处；`#431`／`#421` 只出现在
**说明句**（引他席在途事实与范围声明），无别票功能内容。

## 5. 缺陷段（五维分）

- **D1（S3／本票引入）**：夹具里 `baselineCommit` 是**记录值**，判据只拿它与当刻仓库解出的
  `dc16ba1^` 相比 —— 基线因此仍可整体改指别的提交（夹具＋该提交的摘要一起换即全绿），
  「取自 `dc16ba1^`」属自证；夹具本身也无摘要在判据件里钉住。判别力：15/15。
- **D2（S3／本票范围）**：夹具的 `html` 真值与源码 blob 之间**无摘要绑定**，值域只由形态断言
  （`<section class="` 起头）与别处既有断言约束；本条已用第 3 条探针证「不是摆设」，故不降分。
- **D3（S3／范围外记账）**：证据件 §2 自陈变异做在字节同源镜像上；票面字面要求改
  `src/blocks.ts`。镜像＋产物同值核对是稳妥折中，但该条验收未按字面执行 —— 本席已在真源码上
  补做并仍红绿成立。
- **D4（说明性）**：票面「交付物路径」写的是 `docs/base/base-render/t427-判据硬化.md`（427），
  实际落 `t428-判据硬化.md`；文件在、内容对，仅票面路径笔误，不扣分。

五维：正确性 28/30（D1）｜基线可复跑 23/25（D2）｜测试质量 20/20｜记账与证据 13/15（D1／D3）
｜范围纪律 15/15（0 越界）。**合计 93，无 S1，判 PASS。**

## 6. 本件自指说明

上列 `runId` 逐条抄自 `.scratch/locks/gate-runs.log` 的 `RUN ticket=428` 行；本报告自身的
`git add`／`git commit`／`git push` 三条按单笔提交口径落在尾部窗口外，不列入 §1 表。
