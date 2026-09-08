---
"dsh-calorie": patch
"dsh-life-pack": patch
---

#48 整批 crash 修复（六边形重接线）：client 改打 loader 工厂包（browser/CJS + 注册包裹，传递闭包无 node、无 ESM），host 真注册 RPC 通道（calorie `/ilife-calorie` read），slots 改用真实 interface（settings.section + sidebar.footer.action）+ React 组件 + result 信封拆包；端口契约 contract/dsh-ctx 落定，loader 回路长期看门。
