---
'base-paint': minor
---

#92（79a）base-* 共享层契约冻结：新增 `docs/base-paint-contract.md`（冻结契约正本）＋ `packages/base-render/src/spec/*`（type-only 契约类型与纯数据常量）＋ 签名测试（编译期类型断言 ＋ 运行时出口面锁）。base-paint 只**追加**导出，既有 18 个运行时出口与 12 个类型出口零改动。

冻结面覆盖 #74 占位符填充器／#75 共享样式资产／#76 控件层（`copyText` 双通道）／#77 复制文本序列化／#78 图表与 HELP 壳；`base-paint/injector.ts`（sidebar 槽位装配）与 HTML 填充器 `fillTemplate` 明确为同名不同物。

版本口径（B8）：本 changeset 只声明 base-paint 的契约新增；base-* 三包**统一版本**由 #79 的 changesets `fixed` 组落地，本票不单独升 `base-link-core`／`base-combos`。
