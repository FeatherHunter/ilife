---
"skill-calorie": patch
---

feat(398): 体成分读侧支持「不按来源过滤」与「按来源分组」（`source=all` 从"静默当来源名用、取空记录"改为**不按来源过滤**并备好**按来源分组**的序列与组数；新增读侧词 `SOURCE_FILTER_ALL`／`SourceFilter`／`assertSourceFilter`、`trendCompositionBySource`、`compositionSourceCount`；`buildBodyCompositionView` 在 `all` 下带出 `sourceSeries`／`sourceCount`；读侧不再静默接受未知来源词）
