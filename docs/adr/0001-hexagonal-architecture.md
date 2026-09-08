# ADR-0001：本项目采用六边形架构（Ports & Adapters）

- 状态：已决定（2026-09-08，用户原话：之后用这个架构）
- 语境：插件跨 host（node）/ client（browser）两侧，#48 证明两侧直引实现会炸整批加载。

## 决定

- 端口（port）：纯契约模块，零 node 导入，浏览器安全。放 RPC 通道/方法/键、参数与回执形状、slots 能力描述。
- 适配器（adapter）：host 侧 node 实现（spawn CLI、注册 RPC 通道），client 侧 browser 实现（loader 工厂包、slots 注册、React 组件、RPC 调用）。
- 铁律：
  1. client 产物必须是通过 loader 校验的工厂包（browser 平台），传递闭包无 `node:`、无 ESM 顶层 import/export。
  2. 两侧只经端口对话：client 不 import host 实现，host 不 import client 实现。
  3. 不虚构 host API：slots/RPC 只用 DSH 真实契约（见 test/client-bundle-48.test.mjs 回路）。

## 后果

- #48 按此分层重写 dsh-calorie / dsh-life-pack 的 client 与 host 接线。
- 新增回归回路 test/client-bundle-48.test.mjs 长期看门。
