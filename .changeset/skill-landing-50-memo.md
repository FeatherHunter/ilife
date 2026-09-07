---
"skill-memo-ilife": patch
"dsh-memo-ilife": patch
---

#50 memo 对复制（备忘录，照抄 #48 卡路里样板）：单品追加 skill-memo-ilife ^0.1.0 正式版依赖（dsh-life-pack 同步 workspace:* → ^0.1.0）；skill-memo-ilife 内外依赖去 workspace: 化并补 ./package.json 导出（files 已含 templates/*.html，运行时模板加载器不断链）；桥 cliPath 改按包名解析。联动发布 0.1.1。
