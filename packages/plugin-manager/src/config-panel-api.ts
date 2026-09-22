/** 共用配置面板的公开门（**六家只 import 这一个子路径**：`dsh-life-pack/config-panel`）。
 *
 * 为什么需要它：卡片／行渲染／样式表／状态机分几份写（契约／取值与填值／视图／组件本体），
 * 而 `package.json` 的 exports 一条子路径只能指一个文件。故设这一个门，把六家真要用的那几个名字
 * 转出去；**不另开第二个出口**（没有第二消费方——将来真长出第二个用法再开）。
 *
 * 对外给的名字就是下面这几个，数得出来：
 *   ① `ConfigPanel`——面板组件本体（六家把它注册进爱生活页签槽）；
 *   ② `Row`——一行怎么画（跨包锁要拿它当函数调）；
 *   ③④ `ConfigControl`／`ConfigTier`——行表里两格的字面表；
 *   ⑤ `ConfigItem`——行表每一行的形状。
 *
 * **取值与填值的路径读写是内部实现**（`config-panel-value.ts`），不在这里出门：
 * 它只经「取值／填值」两条被验，外面不需要自己拆一份配置取值。
 *
 * 本件不含实现、也不含判断，只做转出。
 */

export { ConfigPanel } from './config-panel.js';

export { Row } from './config-panel-view.js';

export type { ConfigItem, ConfigControl, ConfigTier } from './config-panel-contract.js';
