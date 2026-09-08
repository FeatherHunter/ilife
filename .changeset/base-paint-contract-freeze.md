---
'base-paint': minor
---

#92（79a）base-* 共享层契约冻结：新增 `docs/base-paint-contract.md`（冻结契约正本）＋ `packages/base-render/src/spec/*`（type-only 契约类型与纯数据常量）＋ 签名测试（编译期类型断言 ＋ 运行时出口面锁）。base-paint 只**追加**导出，既有 18 个运行时出口与 12 个类型出口零改动。

冻结面覆盖 #74 占位符填充器／#75 共享样式资产／#76 控件层（`copyText` 双通道）／#77 复制文本序列化／#78 图表与 HELP 壳；`base-paint/injector.ts`（sidebar 槽位装配）与 HTML 填充器 `fillTemplate` 明确为同名不同物。

版本口径（B8）：本 changeset 只声明 base-paint 的契约新增；base-* 三包**统一版本**由 #79 的 changesets `fixed` 组落地，本票不单独升 `base-link-core`／`base-combos`。

返修补录（Phase 2b，FX-1…FX-16）：按三份对抗式验收（V1／V2／V3）逐条返修，**新增 10 条冻结签名**（`DATA_TEXT_PROJECTIONS`／`DataProjectionSpec`／`LOG_SECTION_SOURCES`／`HELP_COPY_ACTIONS`／`CopyActionHostPort`／`BindCopyAction`／`bindCopyAction`／`SharedHelpersInput`／`BuildSharedHelpersJs`／`buildSharedHelpersJs`），**改 2 条已冻结签名**（`CopyPorts` 增可选 `toast?: ToastHostPort`；`TEMPLATE_ERROR_CODES` 增 `container-missing`）。仍为**追加型**变更，取 `minor`；清单／文档 §3 标记区表格／`test-d` 三处同步，`SPEC_FROZEN_SURFACE` 由 102 条增至 112 条。`delivery`（#83）／输出命名（#87）／HELP 回补（#106）／死模板（#107）／门面示例门（#99）**登记但不冻结也不排除**（契约 §4.4）。

第二轮返修补录（Phase 2b，FX-17…FX-25 / V4 新洞 N-1…N-9）：**新增 8 条冻结签名**（`ACTION_ID_ATTR`／`COPY_ACTION_IDS`／`DEFAULT_DATA_ATTR`／`SHARED_HELPERS_JS_RULE`／`SENSITIVE_ROW_RULE`／`ChartsHelpersInput`／`BuildChartsHelpersJs`／`buildChartsHelpersJs`），**改 3 条已冻结签名**（`CopyActionHostPort` 增 `listActionIds()` 发现机制；`ErrorReceiptInput` 增可选 `dataActionId?`／`logActionId?`；`CopyButtonInput.actionId` 改**必填**，见契约 §0.2 覆盖面口径 ＋ `test-d _C14b`）。`SPEC_FROZEN_SURFACE` 由 112 条增至 **120 条**。要点：① 复制按钮 actionId 来源冻结（#90 仅凭契约可接线，§3.3 端到端示例）；② `buildSharedHelpersJs` 产出内容契约 ＋ dist 纯度扫描收窄为「禁 `node:` ＋ 禁隐式全局赋值，允许 DOM 读取」（#76）；③ calorie 6 死模板的占位符改造面归 **#107**（§6.1）；④ 27 条运行时条目补逐值断言（#92 口径修正）。仍为**追加型**变更，`minor` 不变。
