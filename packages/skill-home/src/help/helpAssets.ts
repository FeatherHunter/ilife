// 本文件由 packages/skill-home/scripts/gen-help-assets.mjs 生成 —— 禁止手工修改。
// 改动一律走生成器（手改会被 --check 判漂移、被 test/help-assets.test.mjs 的摘要锁打红）。
//
// 事实源（仓内唯一）：src/help/scenarios.yaml · 62527 字节 · sha256 c84d9cfc93e7d76c2bbcbda797b1cd9daee9d4b78398ff858a8acdaa476df088
// 重算摘要：node -e "const f=require('fs'),c=require('crypto');console.log(c.createHash('sha256').update(f.readFileSync('packages/skill-home/src/help/helpAssets.ts')).digest('hex'))"
// icon／label／id：逐字取事实源 domains[].icon/name/key（老骨架自带 9 个域图标，不另立图标表）。
// types 词表：共享 help 模板的配色表 packages/base-render/assets/help-template.html:1698-1709（TYPE_DEFAULT 10 词）。
// link 域＝登记位（deprecated: true）：prompt 不迁、HELP 不列、不建目录；渲染侧按 HELP_GROUPS 过滤。

/** 场景徽章词：共享 help 模板 TYPE_DEFAULT 认得这 10 个（模板实测，非老 yaml 自带）。 */
export type HelpSceneType =
  | '采集'
  | '查看'
  | '结果'
  | '向导'
  | '批量'
  | '校验'
  | '选择'
  | '过程'
  | '回执'
  | '录入';

/** 场景：id 取老骨架 scenario_id；types 由老骨架 type 按 `+` 切开（顺序照原文、去重保留首次出现）。 */
export interface HelpSceneEditableField {
  name: string;
  label: string;
  value: string;
  hint?: string;
  required?: boolean;
  kind?: 'text' | 'number' | 'select' | 'date' | 'week' | 'month' | 'year' | 'time';
  options?: readonly string[];
  min?: string | number;
  max?: string | number;
  step?: string | number;
  placeholder?: string;
}
export interface HelpSceneAsset {
  id: string;
  title: string;
  wake_word: string;
  status: string;
  prompt_template: string;
  types: readonly HelpSceneType[];
  editable_fields?: readonly HelpSceneEditableField[];
}

/** 二级组：id ＝ `<域id>_<序数>`，label 取老骨架 sub。 */
export interface HelpSubgroupAsset { id: string; label: string; scenes: readonly HelpSceneAsset[]; }

/** 一级分组：id ＝ 老骨架 9 个域 key；`deprecated` 为 true 者＝登记位（不列、不建目录）。 */
export interface HelpGroupAsset {
  id: string;
  icon: string;
  label: string;
  deprecated?: true;
  subgroups: readonly HelpSubgroupAsset[];
}

/** 分组 id ↔ 命令前缀：老骨架分组词与新命令命名空间的差异只在这一处。 */
export interface HelpGroupCommands { group: string; prefixes: readonly string[]; }

export const HELP_GROUPS: readonly HelpGroupAsset[] = [
    {
      "id": "items",
      "icon": "🏠",
      "label": "物品管理",
      "subgroups": [
        {
          "id": "items_1",
          "label": "录入",
          "scenes": [
            {
              "id": "add_text",
              "title": "录入一件新物品",
              "wake_word": "录物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「录物品」。\n\n走录入流程,生成预览供确认,确认后写入并回执。\n\n名称:{{item_name}}\n分类:{{category}}\n数量(选填):{{quantity}}\n位置(选填):{{location}}\n价格(选填):{{price}}\n标签(选填):{{tags}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item_name",
                  "label": "名称",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "category",
                  "label": "分类",
                  "value": "",
                  "hint": "如 数码/衣物",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "quantity",
                  "label": "数量(选填)",
                  "value": "",
                  "hint": "空＝1；纯数字，只收整数≥1",
                  "required": false,
                  "kind": "number"
                },
                {
                  "name": "location",
                  "label": "位置(选填)",
                  "value": "",
                  "hint": "如 客厅/电视柜",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "price",
                  "label": "价格(选填)",
                  "value": "",
                  "hint": "纯数字，单位 元",
                  "required": false,
                  "kind": "number"
                },
                {
                  "name": "tags",
                  "label": "标签(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "add_photo",
              "title": "拍照识别录入物品",
              "wake_word": "拍物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「拍物品」。\n\n识别照片字段 → 走录入流程 → 预览确认 → 写入回执。\n\n【照片即将发送:】\n\n补充说明(选填):{{note}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "note",
                  "label": "补充说明(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "add_batch",
              "title": "批量录入多件物品",
              "wake_word": "批量录入",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「批量录入」。\n\n批量清单总览 + 逐条解析预览,勾选确认后批量写入回执。\n\n清单:{{items_text}}\n\n【资源即将发送:】 (如用照片)",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "items_text",
                  "label": "清单",
                  "value": "",
                  "hint": "如 文字逐行描述,或用照片/文件",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "add_backfill",
              "title": "补录历史物品(指定日期)",
              "wake_word": "补录",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「补录」。\n\n按指定日期补录历史物品,带日期回显与到期提醒预埋。\n\n名称:{{item_name}}\n分类:{{category}}\n录入日期:{{record_date}}\n购买日期(选填):{{purchase_date}}\n其余字段(选填):{{extra}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item_name",
                  "label": "名称",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "category",
                  "label": "分类",
                  "value": "",
                  "hint": "如 数码/衣物",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "record_date",
                  "label": "录入日期",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                },
                {
                  "name": "purchase_date",
                  "label": "购买日期(选填)",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD",
                  "required": false,
                  "kind": "date"
                },
                {
                  "name": "extra",
                  "label": "其余字段(选填)",
                  "value": "",
                  "hint": "如 同录物品,",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "items_2",
          "label": "查找",
          "scenes": [
            {
              "id": "search_default",
              "title": "搜索查找物品",
              "wake_word": "查物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查物品」。\n\n命中列表卡片(照片/名称/位置/状态),未命中引导录入。\n\n描述:{{query_text}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "query_text",
                  "label": "描述",
                  "value": "",
                  "hint": "如 名字/颜色/特征/位置/时间,记得什么说什么",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "detail_by_id",
              "title": "查看物品详情",
              "wake_word": "看物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「看物品」。\n\n完整详情(全字段/照片/位置/标签/备注)+ 相关物品 + 快捷操作入口。\n\n物品:{{item}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 名称或描述",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "locate_urgent",
              "title": "紧急查找物品位置",
              "wake_word": "紧急定位",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「紧急定位」。\n\n重要物品置顶卡片(大照片+位置+固定位),一屏直达只要位置。\n\n物品:{{item}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 名称/描述,如:钥匙",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "browse_filter",
              "title": "按条件筛选浏览物品",
              "wake_word": "筛选浏览",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「筛选浏览」。\n\n分组列表(分类/位置/标签/时间/价格),多条件组合 + 排序 + 计数。\n\n分类(选填):{{category}}\n位置(选填):{{location}}\n标签(选填):{{tags}}\n价格区间(选填):{{price_range}}\n含已废弃(选填):{{include_deprecated}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "category",
                  "label": "分类(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "location",
                  "label": "位置(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "tags",
                  "label": "标签(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "price_range",
                  "label": "价格区间(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "include_deprecated",
                  "label": "含已废弃(选填)",
                  "value": "",
                  "hint": "空＝否",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "是",
                    "否"
                  ]
                }
              ]
            },
            {
              "id": "search_photo",
              "title": "拍照反向查找物品",
              "wake_word": "拍照找物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「拍照找物品」。\n\n相似物品匹配列表(匹配度标注),未匹配转录入闭环。\n\n【照片即将发送:】",
              "types": [
                "查看"
              ]
            },
            {
              "id": "find_dupes",
              "title": "检查重复物品",
              "wake_word": "查重复",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查重复」。\n\n重复物品组列表(名称/分类/数量/位置对比),可转合并建议。",
              "types": [
                "查看"
              ]
            }
          ]
        },
        {
          "id": "items_3",
          "label": "更新",
          "scenes": [
            {
              "id": "update_generic",
              "title": "修改物品信息",
              "wake_word": "改物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「改物品」。\n\n字段级 前后对比 对比,预览确认后写入回执。\n\n物品:{{item}}\n修改项:{{changes}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "changes",
                  "label": "修改项",
                  "value": "",
                  "hint": "如 一行一条:名称/分类/备注/价格/标签…",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "move_variant",
              "title": "移动物品位置",
              "wake_word": "移物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「移物品」。\n\n原位置→新位置路径 + 邻居列表,确认移动后写入回执。\n\n物品:{{item}}\n新位置:{{location}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 可多件",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "location",
                  "label": "新位置",
                  "value": "",
                  "hint": "如 卧室/衣柜",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "quantity_change",
              "title": "变更物品数量",
              "wake_word": "数量变更",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「数量变更」。\n\n变更前后数量对比,减到 0 提示已用完 + 补货建议。\n\n物品:{{item}}\n数量:{{quantity}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "quantity",
                  "label": "数量",
                  "value": "",
                  "hint": "如 绝对数量或 +N/-N",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "status_change",
              "title": "变更物品状态",
              "wake_word": "状态变更",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「状态变更」。\n\n状态机流转(废弃=软删除/恢复/非法流转拦截),确认后写入回执。\n\n物品:{{item}}\n状态:{{status}}",
              "types": [
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "status",
                  "label": "状态",
                  "value": "",
                  "hint": "如 在家/备用/借用中/维修中/已用完/快递中/找不到/已废弃,废弃=软删除可恢复",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "merge_items",
              "title": "合并重复物品",
              "wake_word": "合并物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「合并物品」。\n\n合并预览(字段合并规则/数量相加),确认合并后回执。\n\n保留:{{keep_item}}\n并入:{{merge_items}}",
              "types": [
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "keep_item",
                  "label": "保留",
                  "value": "",
                  "hint": "如 主条物品",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "merge_items",
                  "label": "并入",
                  "value": "",
                  "hint": "如 一条或多条",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "undo_operation",
              "title": "撤销最近操作",
              "wake_word": "撤销操作",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「撤销操作」。\n\n可撤销操作列表(勾选),撤销影响范围提示,回滚后回执。\n\n撤销:{{target_op}}",
              "types": [
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "target_op",
                  "label": "撤销",
                  "value": "",
                  "hint": "如 指定某次操作,如:刚才的录入",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "link_items",
              "title": "设置物品关联",
              "wake_word": "物品关联",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「物品关联」。\n\n关联预览(主物品+关联物品+关系类型),确认后写入回执。\n\n主物品:{{item}}\n关联物品:{{item_2}}\n关系:{{relation}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "主物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "item_2",
                  "label": "关联物品",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "relation",
                  "label": "关系",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "配件",
                    "配套",
                    "替代",
                    "同捆",
                    "常用搭配"
                  ]
                }
              ]
            },
            {
              "id": "tags_variant",
              "title": "修改物品标签",
              "wake_word": "标物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「标物品」。\n\n已有标签展示,加/去标签预览,确认后写入回执。\n\n物品:{{item}}\n加标签(选填):{{tags_add}}\n去标签(选填):{{tags_remove}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 可多件",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "tags_add",
                  "label": "加标签(选填)",
                  "value": "",
                  "hint": "如 可多个",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "tags_remove",
                  "label": "去标签(选填)",
                  "value": "",
                  "hint": "如 可多个",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "items_4",
          "label": "标签与分类",
          "scenes": [
            {
              "id": "tag_manage",
              "title": "管理标签(查看/重命名/合并/清理)",
              "wake_word": "管标签",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「管标签」。\n\n标签总览列表 + 合并/重命名/删除影响预览,确认后回执。\n\n操作:{{op}}\n详情:{{detail}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "查看",
                    "合并",
                    "重命名",
                    "清理"
                  ]
                },
                {
                  "name": "detail",
                  "label": "详情",
                  "value": "",
                  "hint": "如 把「擦手巾」合并进「毛巾」",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "category_manage",
              "title": "管理分类(查看/新建/改名/合并/移动)",
              "wake_word": "管分类",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「管分类」。\n\n分类树总览 + 新建/改名/合并影响预览,确认后回执。\n\n操作:{{op}}\n详情:{{detail}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "新建",
                    "改名",
                    "合并",
                    "移动"
                  ]
                },
                {
                  "name": "detail",
                  "label": "详情",
                  "value": "",
                  "hint": "如 新建二级分类「露营装备」",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "tag_tidy_suggest",
              "title": "标签分类整理建议(AI 检测)",
              "wake_word": "整理建议",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「整理建议」。\n\n相近标签/分类检测结果,逐条确认合并,一键批量执行。",
              "types": [
                "选择",
                "回执"
              ]
            }
          ]
        },
        {
          "id": "items_5",
          "label": "照片档案",
          "scenes": [
            {
              "id": "photo_view",
              "title": "查看物品照片(含类型筛选)",
              "wake_word": "查看照片",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查看照片」。\n\n主图大图 + 多图缩略图,类型标记(普通/说明书-使用/安装/保养)。\n\n物品:{{item}}\n只看说明书(选填):{{manual_only}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "manual_only",
                  "label": "只看说明书(选填)",
                  "value": "",
                  "hint": "空＝全部",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "是",
                    "否"
                  ]
                }
              ]
            },
            {
              "id": "photo_manage",
              "title": "管理物品照片(排序/换主图/加图/标记类型)",
              "wake_word": "管照片",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「管照片」。\n\n照片列表 + 本地排序 + 加图/删图/类型标记,确认变更后回执。\n\n物品:{{item}}\n操作:{{op}}\n\n【照片即将发送:】 (如补拍/加图)",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "如 新顺序 图3→图2→图1,主图变更为图3 / 加图 / 删图 / 标记类型",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "photo_wall",
              "title": "浏览物品照片墙(分类/位置/类型)",
              "wake_word": "照片墙",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「照片墙」。\n\n照片网格墙 + 分组 + 类型筛选 + 空态补拍引导。\n\n分组(选填):{{group_by}}\n只看说明书(选填):{{manual_only}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "group_by",
                  "label": "分组(选填)",
                  "value": "",
                  "hint": "空＝不分组",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "分类",
                    "位置"
                  ]
                },
                {
                  "name": "manual_only",
                  "label": "只看说明书(选填)",
                  "value": "",
                  "hint": "空＝全部",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "是",
                    "否"
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "items_6",
          "label": "盘点",
          "scenes": [
            {
              "id": "inventory_spot",
              "title": "盘点核对(按位置/分类/全屋)",
              "wake_word": "盘点",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「盘点」。\n\n核对清单(在/不在/不确定三态 + 数量修正),确认完成产出差异集。\n\n范围:{{scope}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "scope",
                  "label": "范围",
                  "value": "",
                  "hint": "如 全屋 / 某个位置 / 某个分类",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "inventory_diff",
              "title": "处理盘点差异(缺/多/异/待确认)",
              "wake_word": "差异处理",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「差异处理」。\n\n差异分组(缺/多/异/待确认),逐项指定处理,批量确认回执。\n\n记录(选填):{{round_record}}",
              "types": [
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "round_record",
                  "label": "记录(选填)",
                  "value": "",
                  "hint": "空＝最近一次；指定某次盘点,",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "inventory_records",
              "title": "查看盘点记录(含复查)",
              "wake_word": "盘点记录",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「盘点记录」。\n\n盘点记录列表 + 单次详情 + 复查入口(上次缺的置顶)。",
              "types": [
                "查看"
              ]
            },
            {
              "id": "inventory_move_house",
              "title": "搬家打包盘点(带走/不带走)",
              "wake_word": "搬家盘点",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「搬家盘点」。\n\n全屋清单二态标记(带走/不带走),统一确认生成搬家清单。",
              "types": [
                "向导",
                "采集",
                "回执"
              ]
            }
          ]
        },
        {
          "id": "items_7",
          "label": "物品历史",
          "scenes": [
            {
              "id": "item_history",
              "title": "查看物品历史(时间线/轨迹)",
              "wake_word": "历史",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「历史」。\n\n事件时间线(倒序)+ 类型筛选 + 差异 展开 + 位置轨迹。\n\n物品:{{item}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "space",
      "icon": "🗺️",
      "label": "空间与位置",
      "subgroups": [
        {
          "id": "space_1",
          "label": "位置管理",
          "scenes": [
            {
              "id": "location_manage",
              "title": "管理位置体系(查看/新建/改名/合并/规范化)",
              "wake_word": "管位置",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「管位置」。\n\n位置树总览 + 相似位置检测 + 合并/重命名影响预览,确认后回执。\n\n操作:{{op}}\n详情:{{detail}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "查看",
                    "新建",
                    "改名",
                    "合并",
                    "删除",
                    "规范化"
                  ]
                },
                {
                  "name": "detail",
                  "label": "详情",
                  "value": "",
                  "hint": "如 合并「卧室/东南角」和「卧室东南角」",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "space_2",
          "label": "固定位",
          "scenes": [
            {
              "id": "fixed_spot",
              "title": "设置固定位(常用件锚定)",
              "wake_word": "固定位",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「固定位」。\n\n固定位选择 + 现有固定位清单(含位置对比警告),确认后回执。\n\n物品:{{item}}\n固定位:{{fixed_spot}}\n操作:{{op}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "fixed_spot",
                  "label": "固定位",
                  "value": "",
                  "hint": "如 玄关抽屉",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "设置",
                    "解除"
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "space_3",
          "label": "收纳建议",
          "scenes": [
            {
              "id": "suggest_storage",
              "title": "收纳位置建议(AI 推荐)",
              "wake_word": "收纳建议",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「收纳建议」。\n\n推荐位置 + 理由 + 备选,采纳后跳移物品流程。\n\n物品(选填):{{item}}",
              "types": [
                "查看",
                "选择"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品(选填)",
                  "value": "",
                  "hint": "如 可多件,;不填则找没有固定位的常用件",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "space_4",
          "label": "空间视图",
          "scenes": [
            {
              "id": "space_view",
              "title": "空间视图浏览(位置树下钻)",
              "wake_word": "空间视图",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「空间视图」。\n\n位置树逐层下钻 + 面包屑 + 当前层物品卡片。\n\n位置(选填):{{location}}",
              "types": [
                "查看"
              ],
              "editable_fields": [
                {
                  "name": "location",
                  "label": "位置(选填)",
                  "value": "",
                  "hint": "如 从哪层开始,;不填则从顶层",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "outfit",
      "icon": "👕",
      "label": "穿搭出行",
      "subgroups": [
        {
          "id": "outfit_1",
          "label": "穿搭推荐",
          "scenes": [
            {
              "id": "outfit_pick",
              "title": "今日穿搭推荐(拼贴效果)",
              "wake_word": "穿什么",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「穿什么」。\n\n穿搭拼贴卡(多部位槽位 + 风格标签 + 理由),备选组合横滑。\n\n场合(选填):{{occasion}}\n天气(选填):{{weather}}",
              "types": [
                "查看",
                "选择"
              ],
              "editable_fields": [
                {
                  "name": "occasion",
                  "label": "场合(选填)",
                  "value": "",
                  "hint": "如 上班，也可写其他场合",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "weather",
                  "label": "天气(选填)",
                  "value": "",
                  "hint": "如 或让 AI 自己获取",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "outfit_2",
          "label": "衣橱管理",
          "scenes": [
            {
              "id": "wardrobe_analyze",
              "title": "衣橱闲置分析(结构诊断/断舍离建议)",
              "wake_word": "衣橱分析",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「衣橱分析」。\n\n衣橱构成分布 + 闲置清单(诚实标注估算) + AI 建议一句 + 处理闭环。",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            },
            {
              "id": "wardrobe_season",
              "title": "换季收纳(季节衣物批量收纳)",
              "wake_word": "换季",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「换季」。\n\n季节衣物清单 + 收纳目标选择 + 批量勾选,确认后回执。\n\n季节:{{season}}\n操作:{{op}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "season",
                  "label": "季节",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "夏季",
                    "冬季"
                  ]
                },
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "收纳",
                    "拿出"
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "outfit_3",
          "label": "出行清单",
          "scenes": [
            {
              "id": "trip_pack",
              "title": "出行带物清单(带/归,联动健身计划,出发核对)",
              "wake_word": "带物品/归物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「带物品/归物品」。\n\n行程设置 → 清单生成(物品卡片+理由) → 带出标记旅游中 / 回家归位。\n\n行程类型:{{trip_type}}\n天数:{{days}}\n操作:{{op}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "trip_type",
                  "label": "行程类型",
                  "value": "",
                  "hint": "如 出差，也可写其他",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "days",
                  "label": "天数",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": true,
                  "kind": "number"
                },
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "带出",
                    "归位"
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "outfit_4",
          "label": "旅行穿搭计划",
          "scenes": [
            {
              "id": "trip_outfit_plan",
              "title": "旅行穿搭计划(天数+天气)",
              "wake_word": "旅行穿搭",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「旅行穿搭」。\n\n每日穿搭计划(日期+天气+组合)+ 行李汇总 + 冲突提示。\n\n目的地:{{destination}}\n天数:{{days}}",
              "types": [
                "查看",
                "选择"
              ],
              "editable_fields": [
                {
                  "name": "destination",
                  "label": "目的地",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "days",
                  "label": "天数",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": true,
                  "kind": "number"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "stats",
      "icon": "📊",
      "label": "统计总览",
      "subgroups": [
        {
          "id": "stats_1",
          "label": "统计总览",
          "scenes": [
            {
              "id": "stats_summary",
              "title": "物品总览",
              "wake_word": "统物品",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「统物品」。\n\n件数 + 总价/价格覆盖率 + 分类/位置分布 + 价值 TOP + 近 30 天变动。",
              "types": [
                "查看"
              ]
            },
            {
              "id": "stats_idle",
              "title": "闲置物品检测(AI 断舍离建议)",
              "wake_word": "查闲置",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查闲置」。\n\n闲置清单(时长排序,诚实标注估算)+ AI 断舍离建议 + 处理闭环。\n\n闲置标准(选填):{{idle_days}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "idle_days",
                  "label": "闲置标准(选填)",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": false,
                  "kind": "number"
                }
              ]
            },
            {
              "id": "stats_expiring",
              "title": "过期检查与预告",
              "wake_word": "查过期",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查过期」。\n\n已过期 + 未来 N 天预告(默认 30,可调),勾选处理闭环。\n\n预告参数(选填):{{lead_days}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "lead_days",
                  "label": "预告参数(选填)",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": false,
                  "kind": "number"
                }
              ]
            },
            {
              "id": "stats_inventory",
              "title": "盘点统计与建议",
              "wake_word": "盘点统计",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「盘点统计」。\n\n盘点完成率 + 历史趋势 + 差异遗留 + AI 建议优先盘点 X。",
              "types": [
                "查看"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "express",
      "icon": "📦",
      "label": "快递购物",
      "subgroups": [
        {
          "id": "express_1",
          "label": "购物清单",
          "scenes": [
            {
              "id": "shopping_list",
              "title": "购物清单(组织/例行/采购闭环)",
              "wake_word": "购物清单",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「购物清单」。\n\n清单条目(含来源标注)+ 清单内查重 + 采购闭环(销项/录入/补数量)。\n\n条目:{{entries}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "entries",
                  "label": "条目",
                  "value": "",
                  "hint": "如 物品名+数量,一行一条;可留空查看现有清单",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "express_2",
          "label": "缺货检测",
          "scenes": [
            {
              "id": "shopping_missing",
              "title": "缺货检测(自动进清单)",
              "wake_word": "缺货检测",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「缺货检测」。\n\n检测结果(物品+当前数量+阈值+建议量),一键进购物清单。\n\n范围(选填):{{scope}}",
              "types": [
                "查看",
                "选择"
              ],
              "editable_fields": [
                {
                  "name": "scope",
                  "label": "范围(选填)",
                  "value": "",
                  "hint": "如 全屋/某个分类,",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "express_3",
          "label": "快递跟踪",
          "scenes": [
            {
              "id": "search_express",
              "title": "快递跟踪(查/超时/收货确认)",
              "wake_word": "查快递",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查快递」。\n\n快递中物品清单(已等 N 天)+ 超时提醒 + 收货确认闭环。",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            }
          ]
        },
        {
          "id": "express_4",
          "label": "囤货盘点",
          "scenes": [
            {
              "id": "stock_check",
              "title": "囤货盘点(库存/阈值/不足检测)",
              "wake_word": "囤货盘点",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「囤货盘点」。\n\n囤货清单(数量/阈值/库存状态)+ 阈值设置 + 数量修正。",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "receipt",
      "icon": "🧾",
      "label": "票据凭证",
      "subgroups": [
        {
          "id": "receipt_1",
          "label": "购买记录",
          "scenes": [
            {
              "id": "purchase_list_all",
              "title": "查购买记录(全量/按物品/按时间)",
              "wake_word": "查购买记录",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查购买记录」。\n\n购买记录清单(日期/价格/渠道/退货窗口),可按物品或时间筛选。\n\n物品(选填):{{item}}\n时间(选填):{{time_text}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品(选填)",
                  "value": "",
                  "hint": "如 不填按时间浏览",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "time_text",
                  "label": "时间(选填)",
                  "value": "",
                  "hint": "如 上个月",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "purchase_last_month",
              "title": "查上月购买(时间预填)",
              "wake_word": "查上月购买",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查上月购买」。\n\n上月购买清单，月份不填就是上个月。\n\n月份(选填):{{month_ym}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "month_ym",
                  "label": "月份(选填)",
                  "value": "",
                  "hint": "空＝上个月；格式 YYYY-MM，如 2026-07",
                  "required": false,
                  "kind": "month"
                }
              ]
            },
            {
              "id": "purchase_year_stats",
              "title": "查今年花费(年度统计)",
              "wake_word": "查今年花费",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查今年花费」。\n\n今年消费按分类汇总，年份不填就是今年。\n\n年份(选填):{{year_y}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "year_y",
                  "label": "年份(选填)",
                  "value": "",
                  "hint": "空＝今年；格式 YYYY，如 2026",
                  "required": false,
                  "kind": "year"
                }
              ]
            },
            {
              "id": "purchase_return_window",
              "title": "查退货窗口(物品必填)",
              "wake_word": "查退货窗口",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查退货窗口」。\n\n指定物品的购买信息 + 退货截止日(购买日 + 退货窗口天数)。\n\n物品:{{item}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "purchase_add",
              "title": "登记购买记录(录入)",
              "wake_word": "登记购买记录",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「登记购买记录」。\n\n购买记录已登记(日期/价格/渠道/退货窗口)。\n\n物品:{{item}}\n购买日期:{{purchase_date}}\n价格(选填):{{price}}\n渠道(选填):{{channel}}\n商家客服(选填):{{support_contact}}\n退货窗口(选填):{{return_days}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "purchase_date",
                  "label": "购买日期",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                },
                {
                  "name": "price",
                  "label": "价格(选填)",
                  "value": "",
                  "hint": "纯数字，单位 元",
                  "required": false,
                  "kind": "number"
                },
                {
                  "name": "channel",
                  "label": "渠道(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "support_contact",
                  "label": "商家客服(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "return_days",
                  "label": "退货窗口(选填)",
                  "value": "",
                  "hint": "空＝7；纯数字，单位 天",
                  "required": false,
                  "kind": "number"
                }
              ]
            }
          ]
        },
        {
          "id": "receipt_2",
          "label": "保修与保养",
          "scenes": [
            {
              "id": "warranty_list",
              "title": "查保修状态(在保/将到期/已过)",
              "wake_word": "查保修状态",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查保修状态」。\n\n保修清单(在保/即将到期/已过状态徽章)。\n\n状态(选填):{{status}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "status",
                  "label": "状态(选填)",
                  "value": "",
                  "hint": "空＝全部",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "全部",
                    "在保",
                    "即将到期",
                    "已过"
                  ]
                }
              ]
            },
            {
              "id": "warranty_register",
              "title": "登记保修(录入保修期)",
              "wake_word": "登记保修",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「登记保修」。\n\n保修已登记(起始日/时长/到期日自动计算)。\n\n物品:{{item}}\n保修起始日:{{warranty_start}}\n保修时长:{{warranty_months}}\n保修卡照片(选填):{{warranty_photo_note}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "warranty_start",
                  "label": "保修起始日",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                },
                {
                  "name": "warranty_months",
                  "label": "保修时长",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": true,
                  "kind": "number"
                },
                {
                  "name": "warranty_photo_note",
                  "label": "保修卡照片(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "warranty_repair",
              "title": "记录维修(维修历史)",
              "wake_word": "记录维修",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「记录维修」。\n\n维修记录已登记(费用/备注入服务事件)。\n\n保修记录ID:{{warranty_id}}\n维修日期:{{repair_date}}\n花费(选填):{{cost}}\n备注(选填):{{note}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "warranty_id",
                  "label": "保修记录ID",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "repair_date",
                  "label": "维修日期",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                },
                {
                  "name": "cost",
                  "label": "花费(选填)",
                  "value": "",
                  "hint": "纯数字，单位 元",
                  "required": false,
                  "kind": "number"
                },
                {
                  "name": "note",
                  "label": "备注(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "warranty_maintain_cycle",
              "title": "设置保养周期(定期保养)",
              "wake_word": "设置保养周期",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「设置保养周期」。\n\n保养周期已设置(下次保养日自动推算)。\n\n物品:{{item}}\n周期:{{cycle_months}}\n上次保养日(选填):{{last_maintain}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "cycle_months",
                  "label": "周期",
                  "value": "",
                  "hint": "纯数字，单位 天",
                  "required": true,
                  "kind": "number"
                },
                {
                  "name": "last_maintain",
                  "label": "上次保养日(选填)",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD",
                  "required": false,
                  "kind": "date"
                }
              ]
            },
            {
              "id": "warranty_maintain_exec",
              "title": "执行保养(刷新下次日)",
              "wake_word": "执行保养",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「执行保养」。\n\n保养已执行(上次保养日刷新,下次日自动推算)。\n\n保养记录ID:{{maintain_id}}\n执行日期:{{exec_date}}\n备注(选填):{{note}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "maintain_id",
                  "label": "保养记录ID",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "exec_date",
                  "label": "执行日期",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                },
                {
                  "name": "note",
                  "label": "备注(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "receipt_3",
          "label": "证件管理",
          "scenes": [
            {
              "id": "cert_list",
              "title": "查证件到期(按到期排序)",
              "wake_word": "查证件到期",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查证件到期」。\n\n证件清单按到期日排序(号码脱敏 ****后4位),过期/即将到期高亮。",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "cert_add",
              "title": "登记证件(录入)",
              "wake_word": "登记证件",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「登记证件」。\n\n证件已登记(号码脱敏存储,按到期排序)。\n\n类型:{{type}}\n持有人(选填):{{holder}}\n号码(选填):{{number}}\n签发日(选填):{{issue_date}}\n到期日:{{expiry_date}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "type",
                  "label": "类型",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "护照",
                    "身份证",
                    "驾照",
                    "签证",
                    "保险单",
                    "其他"
                  ]
                },
                {
                  "name": "holder",
                  "label": "持有人(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "number",
                  "label": "号码(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "issue_date",
                  "label": "签发日(选填)",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD",
                  "required": false,
                  "kind": "date"
                },
                {
                  "name": "expiry_date",
                  "label": "到期日",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD，如 2026-09-20",
                  "required": true,
                  "kind": "date"
                }
              ]
            },
            {
              "id": "cert_archive",
              "title": "证件归档(照片)",
              "wake_word": "证件归档",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「证件归档」。\n\n证件照片归档(与证件记录关联)。\n\n证件(选填):{{cert_query}}\n\n【证件照片即将发送:】",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "cert_query",
                  "label": "证件(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "cert_update",
              "title": "更新证件(改到期/持有人/号码)",
              "wake_word": "更新证件",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「更新证件」。\n\n证件已更新(重登记语义,只改填写的字段)。\n\n证件ID:{{cert_id}}\n到期日(选填):{{expiry_date}}\n持有人(选填):{{holder}}\n号码(选填):{{number}}\n备注(选填):{{note}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "cert_id",
                  "label": "证件ID",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "expiry_date",
                  "label": "到期日(选填)",
                  "value": "",
                  "hint": "格式 YYYY-MM-DD",
                  "required": false,
                  "kind": "date"
                },
                {
                  "name": "holder",
                  "label": "持有人(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "number",
                  "label": "号码(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "note",
                  "label": "备注(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "receipt_4",
          "label": "账号密码",
          "scenes": [
            {
              "id": "account_list",
              "title": "查账号(密码脱敏)",
              "wake_word": "查账号",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查账号」。\n\n账号清单(平台/用户名/类型,密码 ****** 脱敏)。",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "account_add",
              "title": "存账号(加密存储)",
              "wake_word": "存账号",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「存账号」。\n\n账号已加密存储(密码永不明文入库/展示)。\n\n平台:{{platform}}\n用户名:{{username}}\n密码:{{password}}\n类型(选填):{{type}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "platform",
                  "label": "平台",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "username",
                  "label": "用户名",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "password",
                  "label": "密码",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "类型(选填)",
                  "value": "",
                  "hint": "空＝跳过",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "购物",
                    "银行",
                    "社交",
                    "其他"
                  ]
                }
              ]
            },
            {
              "id": "account_update",
              "title": "改账号(更新录入)",
              "wake_word": "改账号",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「改账号」。\n\n账号已更新(重新录入语义)。\n\n平台:{{platform}}\n用户名(选填):{{username}}\n密码(选填):{{password}}\n类型(选填):{{type}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "platform",
                  "label": "平台",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "username",
                  "label": "用户名(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "password",
                  "label": "密码(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                },
                {
                  "name": "type",
                  "label": "类型(选填)",
                  "value": "",
                  "hint": "",
                  "required": false,
                  "kind": "text"
                }
              ]
            },
            {
              "id": "account_show",
              "title": "看密码(敏感回显)",
              "wake_word": "看密码",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「看密码」。\n\n密码仅在本会话回显(敏感操作,永不进 /复制数据)。\n\n平台:{{platform}}",
              "types": [
                "查看",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "platform",
                  "label": "平台",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "family",
      "icon": "👨‍👩‍👧",
      "label": "家庭协作",
      "subgroups": [
        {
          "id": "family_1",
          "label": "借用管理",
          "scenes": [
            {
              "id": "borrow_manage",
              "title": "借用管理(借出/借入/归还/催还)",
              "wake_word": "借用",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「借用」。\n\n借出/借入分区 + 超期标记 + 催还文案复制,归还确认回执。\n\n操作:{{op}}\n物品:{{item}}\n对象:{{person}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "借出",
                    "借入",
                    "归还",
                    "催还"
                  ]
                },
                {
                  "name": "item",
                  "label": "物品",
                  "value": "",
                  "hint": "如 钥匙",
                  "required": true,
                  "kind": "text"
                },
                {
                  "name": "person",
                  "label": "对象",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        },
        {
          "id": "family_2",
          "label": "家人档案",
          "scenes": [
            {
              "id": "family_members",
              "title": "家人档案(成员/物品归属标记)",
              "wake_word": "家人档案",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「家人档案」。\n\n成员列表 + 增删 + 物品归属批量标记,确认后回执。\n\n操作:{{op}}\n详情:{{detail}}",
              "types": [
                "查看",
                "选择",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "查看",
                    "添加成员",
                    "移除成员",
                    "标记归属"
                  ]
                },
                {
                  "name": "detail",
                  "label": "详情",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "text"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "setup",
      "icon": "🚀",
      "label": "开始使用",
      "subgroups": [
        {
          "id": "setup_1",
          "label": "开始使用",
          "scenes": [
            {
              "id": "first_use",
              "title": "首次使用(初始化工作流)",
              "wake_word": "首次使用",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「首次使用」。\n\n6 步向导(环境检测→配置→建库→建分类→引导→回执),幂等可重试。",
              "types": [
                "向导",
                "回执"
              ]
            },
            {
              "id": "lint_health",
              "title": "数据检查(健康报告)",
              "wake_word": "查异常",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「查异常」。\n\n环境信息 + 8 检查项(标签/位置/状态/照片/价格/日期/相似位置),勾选复制修复引导,只建议不自动改。",
              "types": [
                "查看",
                "选择"
              ]
            },
            {
              "id": "backup_export",
              "title": "备份与导出(数据资产)",
              "wake_word": "备份导出",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「备份导出」。\n\n备份(数据库+照片打包,保留 N 份)+ 导出(JSON/CSV),完成回执 + 备份历史 + 距上次备份天数。\n\n操作:{{op}}\n格式(选填):{{export_format}}",
              "types": [
                "采集",
                "回执"
              ],
              "editable_fields": [
                {
                  "name": "op",
                  "label": "操作",
                  "value": "",
                  "hint": "",
                  "required": true,
                  "kind": "select",
                  "options": [
                    "备份",
                    "导出"
                  ]
                },
                {
                  "name": "export_format",
                  "label": "格式(选填)",
                  "value": "",
                  "hint": "空＝JSON",
                  "required": false,
                  "kind": "select",
                  "options": [
                    "JSON",
                    "CSV"
                  ]
                }
              ]
            },
            {
              "id": "import_restore",
              "title": "导入与恢复(迁移)",
              "wake_word": "导入恢复",
              "status": "",
              "prompt_template": "请你加载技能 居家管家,执行唤醒词「导入恢复」。\n\n文件选择(预告式)→ 校验 → 冲突预览 → 确认导入(导入前自动备份),失败回滚数据不变。",
              "types": [
                "向导",
                "回执"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "link",
      "icon": "🔗",
      "label": "联动功能",
      "subgroups": [
        {
          "id": "link_1",
          "label": "联动总览",
          "scenes": [
            {
              "id": "link_overview",
              "title": "联动功能总览(能力索引)",
              "wake_word": "联动总览",
              "status": "",
              "prompt_template": "",
              "types": [
                "查看",
                "选择"
              ]
            }
          ]
        },
        {
          "id": "link_2",
          "label": "食品联动",
          "scenes": [
            {
              "id": "link_calorie",
              "title": "食品联动(记到卡路里/查热量)",
              "wake_word": "记到卡路里",
              "status": "",
              "prompt_template": "",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            }
          ]
        },
        {
          "id": "link_3",
          "label": "价格联动",
          "scenes": [
            {
              "id": "link_accounting",
              "title": "价格联动(记到记账)",
              "wake_word": "记到记账",
              "status": "",
              "prompt_template": "",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            }
          ]
        }
      ],
      "deprecated": true
    }
  ];

/** 全部场景（含登记位 3 条：渲染侧按组过滤，见 HELP_GROUPS）。 */
export const HELP_ASSETS: readonly HelpSceneAsset[] = HELP_GROUPS.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));

/** 场景 id → 场景（模板把 id 当字典键，重名即后写覆盖前者）。 */
export const HELP_SCENE_BY_ID: Readonly<Record<string, HelpSceneAsset>> = Object.fromEntries(HELP_ASSETS.map((s) => [s.id, s]));

export const HELP_ASSET_TOTAL: number = HELP_ASSETS.length;

export const HELP_GROUP_COMMAND_PREFIXES: readonly HelpGroupCommands[] = [
    {
      "group": "items",
      "prefixes": [
        "home.item",
        "home.tag",
        "home.inventory"
      ]
    },
    {
      "group": "space",
      "prefixes": [
        "home.location"
      ]
    },
    {
      "group": "outfit",
      "prefixes": [
        "home.outfit",
        "home.trip"
      ]
    },
    {
      "group": "stats",
      "prefixes": [
        "home.stats"
      ]
    },
    {
      "group": "express",
      "prefixes": [
        "home.shopping"
      ]
    },
    {
      "group": "receipt",
      "prefixes": [
        "home.ticket"
      ]
    },
    {
      "group": "family",
      "prefixes": [
        "home.care"
      ]
    },
    {
      "group": "setup",
      "prefixes": [
        "home.care"
      ]
    },
    {
      "group": "link",
      "prefixes": []
    }
  ];
