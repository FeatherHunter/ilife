# t195 取证 01：骨架形状（t185-skeleton.json）

源文件：`docs/skills/skill-home/t185-skeleton.json`（27586 字节／169 行）；`schema=skill-home/scene-skeleton@1`；`for_ticket=#188`。
顶层键共 7 个：schema、for_ticket、sources、counts、help_only、deprecated、domains。
counts 共 8 项：domains=9、subs=30、scenes=73、scenes_with_landing=70、scenes_deprecated=3、new_entries=91、new_carried=71、new_compensated=20。
本文件只记骨架里能直接核到的形状与数字，不含设计结论。

## 1. 九个域（id ＋ 中文名 ＋ 英文名）

域记录只有三个字段：key、name_cn、subs——没有独立 id 字段，也没有 name_en 字段；英文名由 key 承担。

- D1：id=items，中文名=物品管理，英文名=items
- D2：id=space，中文名=空间与位置，英文名=space
- D3：id=outfit，中文名=穿搭出行，英文名=outfit
- D4：id=stats，中文名=统计总览，英文名=stats
- D5：id=express，中文名=快递购物，英文名=express
- D6：id=family，中文名=家庭协作，英文名=family
- D7：id=setup，中文名=开始使用，英文名=setup
- D8：id=link，中文名=联动功能，英文名=link
- D9：id=receipt，中文名=票据凭证，英文名=receipt

域数组顺序即 D1..D9；但场景 id 的 SM 编号与数组位置不一致：items 无 SM 前缀，space=SM2、outfit=SM3、stats=SM4、express=SM5、receipt=SM6、family=SM7、setup=SM8、link=SM9。
各域场景数：items 29、receipt 18、outfit 5、space 4、stats 4、express 4、setup 4、link 3、family 2（合计 73）。

## 2. 三十个子功能（按域归组）与 id 通式

子功能记录只有三个字段：sub_cn、name、scenes——**没有自带 id 字段**，所以子功能的身份只能写作「域 key + name」；下面圆括号里是 sub_cn（中文名），方括号里是它承载的场景 id。
id 通式只有两种：items 域＝`<子功能序数>-<该子功能内场景序数>`（如 3-4＝items 第 3 个子功能 update 的第 4 个场景）；其余八域＝`SM<旧域号>-<域内场景序数>`（如 SM6-18＝receipt 域第 18 个场景）。骨架里**没有** `<域id>_<序数>` 形态的 id。

- items／add（录入）：1-1、1-2、1-3、1-4
- items／search（查找）：2-1、2-2、2-3、2-4、2-5、2-6
- items／update（更新）：3-1、3-2、3-3、3-4、3-5、3-6、3-7、3-8
- items／tag（标签与分类）：4-1、4-2、4-3
- items／photo（照片档案）：5-1、5-2、5-3
- items／inventory（盘点）：6-1、6-2、6-3、6-4
- items／history（物品历史）：7-1
- space／locationManage（位置管理）：SM2-1
- space／fixedSpot（固定位）：SM2-2
- space／suggestStorage（收纳建议）：SM2-3
- space／spaceView（空间视图）：SM2-4
- outfit／outfitPick（穿搭推荐）：SM3-1
- outfit／wardrobe（衣橱管理）：SM3-2、SM3-3
- outfit／tripPack（出行清单）：SM3-4
- outfit／tripOutfitPlan（旅行穿搭计划）：SM3-5
- stats／overview（统计总览）：SM4-1、SM4-2、SM4-3、SM4-4
- express／shoppingList（购物清单）：SM5-1
- express／shoppingMissing（缺货检测）：SM5-2
- express／searchExpress（快递跟踪）：SM5-3
- express／stockCheck（囤货盘点）：SM5-4
- family／borrow（借用管理）：SM7-1
- family／member（家人档案）：SM7-2
- setup／firstUse（开始使用）：SM8-1、SM8-2、SM8-3、SM8-4
- link／linkOverview（联动总览）：SM9-1
- link／linkCalorie（食品联动）：SM9-2
- link／linkAccounting（价格联动）：SM9-3
- receipt／purchase（购买记录）：SM6-1、SM6-2、SM6-3、SM6-4、SM6-5
- receipt／warranty（保修与保养）：SM6-6、SM6-7、SM6-8、SM6-9、SM6-10
- receipt／cert（证件管理）：SM6-11、SM6-12、SM6-13、SM6-14
- receipt／account（账号密码）：SM6-15、SM6-16、SM6-17、SM6-18

## 3. 各记录类型的字段（逐条给全）

- 域记录：key、name_cn、subs
- 子功能记录：sub_cn、name、scenes
- 场景记录：id、wake、title、prompt_source、origin、old_template、cli ＋ 可选 status ＋ 可选 extra_wake
- 场景字段实测口径：id＝场景 id（73 条）；wake＝唤醒词字符串数组，全库共 74 条词，仅 SM3-4 一条挂两个词（带物品｜归物品）；title＝中文名称；prompt_source＝旧 yaml 引用（如 `old_yaml:40#prompt`，70 条非空、3 条 null）；origin＝来源（场景层 73 条全为 old_yaml）；old_template＝旧 html 模板路径（49 个不同值）；cli＝出口命令（70 条非空、3 条 null；其中 66 条带 `--params`，命令名共 18 种）；status＝状态位（唯一取值 deprecated，3 条）；extra_wake＝新表唤醒词数组
- extra_wake 记录：phrase、key、cli、in_help、origin ＋ 可选 note（共 17 条，分布在 10 个场景上）
- help_only 记录：phrase、key、in_help、note
- deprecated 记录：phrase、key、in_help、old_scene、note
- counts：domains、subs、scenes、scenes_with_landing、scenes_deprecated、new_entries、new_carried、new_compensated
- sources：old、new、help_auto、reconcile

字段缺席（实测）：场景记录**没有** key（0 条）、**没有** in_help（0 条）、**没有** note（0 条）、**没有** type／kind（0 条）、**没有**名为 deprecated 的字段（0 条）；note 只出现在 extra_wake／help_only／deprecated，in_help 只出现在 extra_wake／help_only。
「废弃登记位」＝场景记录的 `status` 字段，取值 `"deprecated"`（3 条）；顶层 `deprecated` 数组是同一批的对照登记（key 全为 null、in_help 全为 false，带 old_scene 与 note）。
「类型」字段在骨架里不存在；最接近的是 origin（场景层全 old_yaml，extra_wake 全 new_table）。

## 4. 73／3／3 三个数字在数据里的落点

- 73＝场景记录条数，与 counts.scenes 一致；逐域相加 29+18+5+4+4+4+4+3+2＝73。真实条目：
  `{"id":"SM6-18","wake":["看密码"],"title":"看密码(敏感回显)","prompt_source":"old_yaml:1268#prompt","origin":"old_yaml","old_template":"票据凭证/accounts.html","cli":"home-cmd-read home.ticket.write --params '{\"kind\":\"account\",\"op\":\"show\"}'"}`
- 73 同批的另一半口径：scenes_with_landing=70＝cli 非空 70 条，另外 3 条 cli=null 正好是那 3 条 deprecated。
- 3（联动废弃）＝link 域 3 个场景 SM9-1／SM9-2／SM9-3，三条都 `status="deprecated"` 且 `prompt_source=null`、`cli=null`。真实条目：
  `{"id":"SM9-2","wake":["记到卡路里"],"title":"食品联动(记到卡路里/查热量)","prompt_source":null,"origin":"old_yaml","old_template":"联动/link_food.html","cli":null,"status":"deprecated"}`
  顶层 deprecated 数组逐条对应（3 条），例如：`{"phrase":"记到卡路里","key":null,"in_help":false,"old_scene":"SM9-2","note":"不路由；prompt 复制不迁（SKILL.md:125）；combos 登记走后续票"}`
- 3（带 `(HTML)` 的兼容词）＝3 条 extra_wake，全部 `in_help=false`、`origin=new_table`、`note="兼容别名，不进 HELP"`：查物品(HTML) 挂 2-1、看物品(HTML) 挂 2-2、统物品(HTML) 挂 SM4-1；场景自身的 wake 数组里带 (HTML) 的 0 条。真实条目：
  `{"phrase":"查物品(HTML)","key":"home.item.search","cli":"home-cmd-read home.item.search","in_help":false,"origin":"new_table","note":"兼容别名，不进 HELP"}`
- 附带算术事实（算得出，不是标出来的）：唤醒词 74 条 ＋ extra_wake 17 条 ＝ 91 ＝ new_carried 71 ＋ new_compensated 20；help_only 的 3 条不计入 91。

## 5. 骨架里没有的（设计要用、但数据里查不到）

1. 子功能没有 id、没有域内序数、没有除 name/sub_cn 之外的标识位。
2. 域没有 id 字段（只有 key），也没有 name_en 字段；英文名只能借 key／name 顶。
3. 没有任何 `<域id>_<序数>` 形态的 id，也没有以域 key 为前缀的 id。
4. 场景没有路由键（key 字段 0 条）：场景到能力的映射只有 cli 字符串一条线；key 只出现在 extra_wake／help_only／deprecated 三处。
5. 场景没有 in_help（0 条）：某场景是否进 HELP 在骨架里没有登记位。
6. 场景没有 note（0 条）：只有 extra_wake／help_only／deprecated 能带说明文本。
7. 没有 type／kind（0 条）：区分「老场景／新表补词／兼容别名／联动废弃」只能靠 origin＋status＋phrase 后缀拼出来。
8. counts 只有 8 个数字，没有 new_entries／new_carried／new_compensated 的逐条清单，也没有「carried 还是 compensated」的标记位。
9. help_only 的 3 条不进 counts 任何一项（73 与 91 都不含它）。
10. 没有 combos 字段：全文 "combos" 只出现 3 次，全在 3 条 deprecated 的 note 文案里；联动目标件（记账／卡路里）在骨架里没有任何记录。
11. 没有新模板／新落地页字段：只有 old_template（旧 html，49 个不同值）与 cli；scenes_with_landing 里的 landing 只能由「cli 非空」反推。
12. 没有唤醒词归一字段（大小写／空格／别名归一列）：词原样存在 wake 与 extra_wake.phrase 里。
13. 没有「兼容别名」布尔位：只能靠 phrase 尾部的 `(HTML)` 与 note 文本识别。
14. 没有承载待裁结论的字段：SM2-1 两条 extra_wake 的 note 写着「U1 待裁……」，但记录本身没有裁定状态位（in_help 表达不了）。
15. 没有场景顺序号字段（顺序只由数组位置决定），也没有版本／日期／作者字段（只有 schema 与 for_ticket）。
16. 没有第二条来源链：sources 只给 4 个字符串——旧 yaml 绝对路径、`packages/skill-home/src/policy/wakewords.ts`（WAKE_TABLE 91 词／HomeKey 21 命令／DEPRECATED_PHRASES 3 词）、`packages/skill-home/SKILL.md:24-120`、`docs/skills/skill-home/t185-content-reconcile.md`。
