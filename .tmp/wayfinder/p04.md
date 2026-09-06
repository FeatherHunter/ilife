Blocked by: 无

## Question

冻结 render / link-core / combos 最终态 DAG 与装配归一。

边界：link-core 沉底零依赖；render 自含 style（包内目录不跨包），消费 link-core 仅 type-only；combos 强依赖 link-core，present 只许字符串级引用 registry key，禁 import render；装配 owner 归一 render。

验收：依赖方向 CI 可断言，跨包破界即 fail。
