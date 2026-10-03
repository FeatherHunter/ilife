# ticket-button · 票据纸主按钮

纸面动作区那**一颗**整行实心主按钮（判地 `.btn.btn-primary`）：带复制载荷（`data-t`）与动作号
（`data-action-id`），点一下由公共层 helpers 的委派把载荷复制走。

## 出口

| 名字 | 是什么 |
|---|---|
| `renderTicketButton(input)` | 产一颗按钮的 HTML（纯函数、零 DOM） |
| `ticketButtonCss({prefix})` | 本件的样式段（含**禁用态**那一档） |
| `TICKET_BUTTON_CLASS`／`TICKET_BUTTON_PRIMARY`／`TICKET_BUTTON_FORMS` | 类名根 `ilife-block-ticket-button` ＋ 主按钮修饰类 `is-primary` ＋ 形态闭集 `('primary')` |
| `TICKET_BUTTON_MIN_HEIGHT_PX`／`TICKET_BUTTON_RADIUS_PX`／`TICKET_BUTTON_FONT_PX` | 判地几何常量（48／13／16） |

## 入参

| 字段 | 必填 | 说明 |
|---|---|---|
| `label` | 是 | 按钮上的字 |
| `actionId` | 是 | 动作号，落 `data-action-id` |
| `copyText` | 是 | 复制载荷，落 `data-t` |
| `disabled` | 否 | **#1113 新增的公开形状位**：`true` ⇒ 出裸 `disabled` ＋ `aria-disabled="true"` |

```js
renderTicketButton({ label: '填好后复制这句话去跟助手说', actionId: 'ilife-acct-new',
  copyText: '新增账户\n…', disabled: true })
```

<!-- 示例入参：皮肤矩阵判据拿它渲染本件，必须能直接渲染成功 -->
```json 示例入参
{
  "label": "填好后复制这句话去跟助手说",
  "actionId": "ilife-acct-new",
  "copyText": "新增账户\nok: false\nmessage: 新增账户还差 1 项：账户名"
}
```

## 两档形状（判地 `proto/acct-goal/b01-新增账户-采集-v2.2.html`）

- 可点：暖红渐变 `#d34a35→#b93222` ＋ 白字 ＋ 字面投影与内高光。
- **禁用（#1113 新加）**：底 `#c9c2b4` ／白字／零投影／`opacity:.9`／`cursor:not-allowed` —— 五条逐条照判地
  `.btn-primary:disabled`。**页面侧不许自造这一档**：要禁用就传 `disabled`。

> 记账（与 #525 的读法冲突）：判地禁用档是「白字压浅灰底」≈1.7:1，过不了 #525 立的文本地板。
> 本票判据是像素、口径是「形状照判地」⇒ 照抄不改值；冲突记在 #1113 证据的遗留出口。

## 它不管什么

点击行为（不绑事件、不写库、不复制）、动作号与载荷从哪来、按钮摆在页面哪一格。
