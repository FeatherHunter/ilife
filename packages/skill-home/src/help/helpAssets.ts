// 本文件由 packages/skill-home/scripts/gen-help-assets.mjs 生成 —— 禁止手工修改。
// 改动一律走生成器（手改会被 --check 判漂移、被 test/help-assets.test.mjs 的摘要锁打红）。
//
// 事实源（仓内唯一）：src/help/scenarios.yaml · 46267 字节 · sha256 f80184ce9a0a7b345404941dfdd21e2e0b56cc1577dc059c536df5d9bf7e665a
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
export interface HelpSceneAsset {
  id: string;
  title: string;
  wake_word: string;
  status: string;
  prompt_template: string;
  types: readonly HelpSceneType[];
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
              "prompt_template": "请加载「居家管家」技能,帮我录入一件新物品(唤醒词:录物品):\n\n  名  称: _____________\n  分  类: _____________\n  数  量: _____________ (默认 1)\n  位  置: _____________ (选填,如:客厅/电视柜)\n  价  格: _____________ (选填)\n  标  签: _____________ (选填)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "add_photo",
              "title": "拍照识别录入物品",
              "wake_word": "拍物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我拍照录入一件物品(唤醒词:拍物品):\n\n【照片即将发送:】\n补充说明: _____________ (选填)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "add_batch",
              "title": "批量录入多件物品",
              "wake_word": "批量录入",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我批量录入多件物品(唤醒词:批量录入):\n\n  清  单: _____________ (文字逐行描述,或用照片/文件)\n  【资源即将发送:】 (如用照片)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "add_backfill",
              "title": "补录历史物品(指定日期)",
              "wake_word": "补录",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我补录一件历史物品(唤醒词:补录):\n\n  名  称: _____________\n  分  类: _____________\n  录入日期: _____________ (YYYY-MM-DD)\n  购买日期: _____________ (选填)\n  其余字段: _____________ (同录物品,选填)",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我搜索一件物品(唤醒词:查物品):\n\n  描  述: _____________ (名字/颜色/特征/位置/时间,记得什么说什么)",
              "types": [
                "查看"
              ]
            },
            {
              "id": "detail_by_id",
              "title": "查看物品详情",
              "wake_word": "看物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查看物品详情(唤醒词:看物品):\n\n  物  品: ___ (名称或描述)",
              "types": [
                "查看"
              ]
            },
            {
              "id": "locate_urgent",
              "title": "紧急查找物品位置",
              "wake_word": "紧急定位",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我紧急定位物品(唤醒词:紧急定位):\n\n  物  品: _____________ (名称/描述,如:钥匙)\n",
              "types": [
                "查看"
              ]
            },
            {
              "id": "browse_filter",
              "title": "按条件筛选浏览物品",
              "wake_word": "筛选浏览",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我按条件浏览物品(唤醒词:筛选浏览):\n\n  分  类: _____________ (选填)\n  位  置: _____________ (选填)\n  标  签: _____________ (选填)\n  价格区间: _____________ (选填)\n  含已废弃: _____________ (选填,是/否)",
              "types": [
                "查看"
              ]
            },
            {
              "id": "search_photo",
              "title": "拍照反向查找物品",
              "wake_word": "拍照找物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我拍照找一件物品(唤醒词:拍照找物品):\n\n【照片即将发送:】",
              "types": [
                "查看"
              ]
            },
            {
              "id": "find_dupes",
              "title": "检查重复物品",
              "wake_word": "查重复",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我检查重复物品(唤醒词:查重复):",
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
              "prompt_template": "请加载「居家管家」技能,帮我修改物品信息(唤醒词:改物品):\n\n  物  品: ___\n  修改项: _____________ (一行一条:名称/分类/备注/价格/标签…)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "move_variant",
              "title": "移动物品位置",
              "wake_word": "移物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我移动物品位置(唤醒词:移物品):\n\n  物  品: ___ (可多件)\n  新位置: _____________ (如:卧室/衣柜)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "quantity_change",
              "title": "变更物品数量",
              "wake_word": "数量变更",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我变更物品数量(唤醒词:数量变更):\n\n  物  品: ___\n  数  量: _____________ (绝对数量或 +N/-N)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "status_change",
              "title": "变更物品状态",
              "wake_word": "状态变更",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我变更物品状态(唤醒词:状态变更):\n\n  物  品: _____________\n  状  态: _____________ (如:在家/备用/借用中/维修中/已用完/快递中/找不到/已废弃,废弃=软删除可恢复)\n",
              "types": [
                "选择",
                "回执"
              ]
            },
            {
              "id": "merge_items",
              "title": "合并重复物品",
              "wake_word": "合并物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我合并重复物品(唤醒词:合并物品):\n\n  保  留: _____________ (主条物品)\n  并  入: _____________ (一条或多条)",
              "types": [
                "选择",
                "回执"
              ]
            },
            {
              "id": "undo_operation",
              "title": "撤销最近操作",
              "wake_word": "撤销操作",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我撤销最近操作(唤醒词:撤销操作):\n\n  撤  销: _____________ (指定某次操作,如:刚才的录入)",
              "types": [
                "选择",
                "回执"
              ]
            },
            {
              "id": "link_items",
              "title": "设置物品关联",
              "wake_word": "物品关联",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我设置物品关联(唤醒词:物品关联):\n\n  主物品: _____________\n  关联物品: _____________\n  关  系: _____________ (配件/配套/替代/同捆/常用搭配)\n",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "tags_variant",
              "title": "修改物品标签",
              "wake_word": "标物品",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我修改物品标签(唤醒词:标物品):\n\n  物  品: ___ (可多件)\n  加标签: _____________ (选填,可多个)\n  去标签: _____________ (选填,可多个)",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我管理标签(唤醒词:管标签):\n\n  操  作: _____________ (查看/合并/重命名/清理)\n  详  情: ___ (如:把「擦手巾」合并进「毛巾」)",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            },
            {
              "id": "category_manage",
              "title": "管理分类(查看/新建/改名/合并/移动)",
              "wake_word": "管分类",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我管理分类(唤醒词:管分类):\n\n  操  作: _____________ (新建/改名/合并/移动)\n  详  情: ___ (如:新建二级分类「露营装备」)",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            },
            {
              "id": "tag_tidy_suggest",
              "title": "标签分类整理建议(AI 检测)",
              "wake_word": "整理建议",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我做标签分类整理(唤醒词:整理建议):",
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
              "prompt_template": "请加载「居家管家」技能,帮我查看物品照片(唤醒词:查看照片):\n\n  物  品: ___\n  只看说明书: _____________ (选填,是/否)",
              "types": [
                "查看"
              ]
            },
            {
              "id": "photo_manage",
              "title": "管理物品照片(排序/换主图/加图/标记类型)",
              "wake_word": "管照片",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我管理物品照片(唤醒词:管照片):\n\n  物  品: ___\n  操  作: _____________ (如:新顺序 图3→图2→图1,主图变更为图3 / 加图 / 删图 / 标记类型)\n  【照片即将发送:】 (如补拍/加图)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "photo_wall",
              "title": "浏览物品照片墙(分类/位置/类型)",
              "wake_word": "照片墙",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我浏览照片墙(唤醒词:照片墙):\n\n  分  组: _____________ (分类/位置,选填)\n  只看说明书: _____________ (选填,是/否)",
              "types": [
                "查看"
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
              "prompt_template": "请加载「居家管家」技能,帮我盘点核对(唤醒词:盘点):\n\n  范  围: _____________ (全屋 / 某个位置 / 某个分类)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "inventory_diff",
              "title": "处理盘点差异(缺/多/异/待确认)",
              "wake_word": "差异处理",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我处理盘点差异(唤醒词:差异处理):\n\n  记  录: _____________ (选填,指定某次盘点,默认最近一次)\n",
              "types": [
                "选择",
                "回执"
              ]
            },
            {
              "id": "inventory_records",
              "title": "查看盘点记录(含复查)",
              "wake_word": "盘点记录",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查看盘点记录(唤醒词:盘点记录):",
              "types": [
                "查看"
              ]
            },
            {
              "id": "inventory_move_house",
              "title": "搬家打包盘点(带走/不带走)",
              "wake_word": "搬家盘点",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我做搬家盘点(唤醒词:搬家盘点):",
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
              "prompt_template": "请加载「居家管家」技能,帮我查看物品历史(唤醒词:历史):\n\n  物  品: ___",
              "types": [
                "查看"
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
              "prompt_template": "请加载「居家管家」技能,帮我管理位置体系(唤醒词:管位置):\n\n  操  作: _____________ (查看/新建/改名/合并/删除/规范化)\n  详  情: _____________ (如:合并「卧室/东南角」和「卧室东南角」)",
              "types": [
                "查看",
                "选择",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我设置固定位(唤醒词:固定位):\n\n  物  品: _____________\n  固定位: _____________ (如:玄关抽屉)\n  操  作: _____________ (设置/解除)",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我推荐收纳位置(唤醒词:收纳建议):\n\n  物  品: _____________ (可多件,选填;不填则找没有固定位的常用件)",
              "types": [
                "查看",
                "选择"
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
              "prompt_template": "请加载「居家管家」技能,帮我浏览空间视图(唤醒词:空间视图):\n\n  位  置: _____________ (从哪层开始,选填;不填则从顶层)",
              "types": [
                "查看"
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
              "prompt_template": "请加载「居家管家」技能,帮我推荐今日穿搭(唤醒词:穿什么):\n\n  场  合: _____________ (选填:上班/约会/运动/家居/正式/自定义)\n  天气: _____________ (选填,或让 AI 自己获取)\n",
              "types": [
                "查看",
                "选择"
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
              "prompt_template": "请加载「居家管家」技能,帮我做衣橱分析(唤醒词:衣橱分析):",
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
              "prompt_template": "请加载「居家管家」技能,帮我做换季收纳(唤醒词:换季):\n\n  季  节: _____________ (夏季/冬季)\n  操  作: _____________ (收纳/拿出)",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我做出行带物清单(唤醒词:带物品):\n\n  行程类型: _____________ (健身/出差/旅行/超市/游泳/爬山/滑雪/自定义)\n  天  数: _____________\n  操  作: _____________ (带出 / 归位)\n",
              "types": [
                "查看",
                "选择",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我做旅行穿搭计划(唤醒词:旅行穿搭):\n\n  目的地: _____________\n  天  数: _____________\n",
              "types": [
                "查看",
                "选择"
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
              "prompt_template": "请加载「居家管家」技能,帮我查看物品总览(唤醒词:统物品):",
              "types": [
                "查看"
              ]
            },
            {
              "id": "stats_idle",
              "title": "闲置物品检测(AI 断舍离建议)",
              "wake_word": "查闲置",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我检测闲置物品(唤醒词:查闲置):\n\n  闲置标准(如 90 天未使用,选填): ______",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            },
            {
              "id": "stats_expiring",
              "title": "过期检查与预告",
              "wake_word": "查过期",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我检查过期物品(唤醒词:查过期):\n\n  预告参数(提前 N 天算临期,选填): ______",
              "types": [
                "查看",
                "选择",
                "回执"
              ]
            },
            {
              "id": "stats_inventory",
              "title": "盘点统计与建议",
              "wake_word": "盘点统计",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查看盘点统计(唤醒词:盘点统计):",
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
              "prompt_template": "请加载「居家管家」技能,帮我列购物清单(唤醒词:购物清单):\n\n  条  目: _____________ (物品名+数量,一行一条;可留空查看现有清单)",
              "types": [
                "查看",
                "选择",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我检测缺货(唤醒词:缺货检测):\n\n  范  围: _____________ (全屋/某个分类,选填)",
              "types": [
                "查看",
                "选择"
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
              "prompt_template": "请加载「居家管家」技能,帮我查在途快递(唤醒词:查快递):",
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
              "prompt_template": "请加载「居家管家」技能,帮我盘点囤货(唤醒词:囤货盘点):",
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
              "prompt_template": "请加载「居家管家」技能,帮我查购买记录(唤醒词:查购买记录):\n\n  物  品: _____________ (选填,不填按时间浏览)\n  时  间: _____________ (选填,如:上个月)",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "purchase_last_month",
              "title": "查上月购买(时间预填)",
              "wake_word": "查上月购买",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查上个月的购买记录(唤醒词:查上月购买):\n\n  月  份(预填上个月,可改): 2026-07",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "purchase_year_stats",
              "title": "查今年花费(年度统计)",
              "wake_word": "查今年花费",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查今年的消费统计(唤醒词:查今年花费):\n\n  年  份(预填今年,可改): 2026",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "purchase_return_window",
              "title": "查退货窗口(物品必填)",
              "wake_word": "查退货窗口",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查退货窗口(唤醒词:查退货窗口):\n\n  物  品: _____________",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "purchase_add",
              "title": "登记购买记录(录入)",
              "wake_word": "登记购买记录",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我登记一条购买记录(唤醒词:登记购买记录):\n\n  物  品: _____________\n  购买日期(YYYY-MM-DD): _____________\n  价  格(选填): _____________\n  渠  道(选填,如:京东): _____________\n  商家客服(选填): _____________\n  退货窗口(天,选填,默认 7): _____________\n  【票据照片即将发送:】",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我查保修状态(唤醒词:查保修状态):\n\n  状  态(选填,全部/在保/即将到期/已过): _____________",
              "types": [
                "查看",
                "回执"
              ]
            },
            {
              "id": "warranty_register",
              "title": "登记保修(录入保修期)",
              "wake_word": "登记保修",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我登记保修(唤醒词:登记保修):\n\n  物  品: _____________\n  保修起始日(YYYY-MM-DD): _____________\n  保修时长(月): _____________\n  保修卡照片(选填,即将发送): _____________",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "warranty_repair",
              "title": "记录维修(维修历史)",
              "wake_word": "记录维修",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我记录一条维修(唤醒词:记录维修):\n\n  保修记录 ID: _____________\n  维修日期(YYYY-MM-DD): _____________\n  花费(选填): _____________\n  备  注(选填): _____________",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "warranty_maintain_cycle",
              "title": "设置保养周期(定期保养)",
              "wake_word": "设置保养周期",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我设置保养周期(唤醒词:设置保养周期):\n\n  物  品: _____________\n  周期(月): _____________\n  上次保养日(选填,YYYY-MM-DD): _____________",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "warranty_maintain_exec",
              "title": "执行保养(刷新下次日)",
              "wake_word": "执行保养",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我执行一次保养(唤醒词:执行保养):\n\n  保养记录 ID: _____________\n  执行日期(YYYY-MM-DD): _____________\n  备  注(选填): _____________",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我查证件到期(唤醒词:查证件到期):",
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
              "prompt_template": "请加载「居家管家」技能,帮我登记一张证件(唤醒词:登记证件):\n\n  类  型(护照/身份证/驾照/签证/保险单/其他): _____________\n  持有人(选填): _____________\n  号  码(选填,将脱敏显示): _____________\n  签发日(选填,YYYY-MM-DD): _____________\n  到期日(YYYY-MM-DD): _____________",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "cert_archive",
              "title": "证件归档(照片)",
              "wake_word": "证件归档",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我归档一张证件照片(唤醒词:证件归档):\n\n  证  件(选填,如:护照): _____________\n  【证件照片即将发送:】",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "cert_update",
              "title": "更新证件(改到期/持有人/号码)",
              "wake_word": "更新证件",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我更新证件(唤醒词:更新证件):\n\n  证件 ID: _____________\n  到期日(选填,YYYY-MM-DD): _____________\n  持有人(选填): _____________\n  号  码(选填,将脱敏显示): _____________\n  备  注(选填): _____________\n  (只填要改的,其余留空)",
              "types": [
                "采集",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我查账号(唤醒词:查账号):",
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
              "prompt_template": "请加载「居家管家」技能,帮我存一个账号(唤醒词:存账号):\n\n  平  台(如:淘宝/微信): _____________\n  用户名: _____________\n  密  码: _____________\n  类  型(购物/银行/社交/其他,选填): _____________\n  主密钥: _____________ (验证用)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "account_update",
              "title": "改账号(更新录入)",
              "wake_word": "改账号",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我改账号(唤醒词:改账号):\n\n  平  台: _____________\n  用户名(选填,改时填): _____________\n  密  码(选填,改时填): _____________\n  类  型(选填): _____________\n  主密钥: _____________ (验证用)\n  (只填要改的,其余留空)",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "account_show",
              "title": "看密码(敏感回显)",
              "wake_word": "看密码",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我查看密码(唤醒词:看密码):\n\n  平  台: _____________\n  主密钥: _____________ (验证用)",
              "types": [
                "查看",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我管理借用(唤醒词:借用):\n\n  操  作(借出/借入/归还/催还): ___\n  物  品: _____________\n  对  象(家人或外部联系人,借出/借入时填): ___",
              "types": [
                "查看",
                "选择",
                "回执"
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
              "prompt_template": "请加载「居家管家」技能,帮我管理家人档案(唤醒词:家人档案):\n\n  操  作(查看/添加成员/移除成员/标记归属): ___\n  详  情: ___",
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
              "prompt_template": "请加载「居家管家」技能,帮我完成首次使用初始化(唤醒词:首次使用):",
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
              "prompt_template": "请加载「居家管家」技能,帮我做数据健康检查(唤醒词:查异常):",
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
              "prompt_template": "请加载「居家管家」技能,帮我备份导出数据(唤醒词:备份导出):\n\n  操  作(备份/导出): ______\n  格  式(导出时:JSON/CSV,选填): ______",
              "types": [
                "采集",
                "回执"
              ]
            },
            {
              "id": "import_restore",
              "title": "导入与恢复(迁移)",
              "wake_word": "导入恢复",
              "status": "",
              "prompt_template": "请加载「居家管家」技能,帮我导入恢复数据(唤醒词:导入恢复):\n\n【导入文件即将发送:】",
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
