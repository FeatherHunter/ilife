// 备忘录测试 helper（#695）：**配置文件隔离口**。
//
// 口径出处（「配置的存与生效口径裁定」#675 的解决评论，本票 #695 落地）：配置的承载方式是每个技能一份
// YAML 配置文件（默认 `~/.ilife/<技能>.yaml`），**配置文件是唯一真相，环境变量读取全部删除**；
// `ILIFE_CONFIG_DIR` 设定且非空即整体接管配置目录——**它同时是测试隔离的唯一口子**。
// 故本 helper 只做两件事：造一个临时配置目录、往里写 `memo.yaml`（`memo` 是备忘录的配置件主体名）。
//
// 铁律（同 `memo-sqlite.mjs`）：测试一律把 `ILIFE_CONFIG_DIR` 指向临时目录，绝不落到真实家目录
// ——缺了它时 `base-link-core` 的 `resolveConfigDir()` 在测试运行器里直接抛
// `CONFIG_TEST_ISOLATION_MISSING`（响亮失败，不是静默写家目录）；测试库仍只在 `%TEMP%` 下，
// 绝不碰活库 `D:\2Study\StudyNotes\.db`。
//
// 写出去的正文照 base-link-core 的**受限 YAML 子集**（冻结）：一层嵌套、缩进恰好 2 个空格、
// 标量可以是裸串或带引号（带引号的字符串里 `\\` 表示一个反斜杠）、**不支持数组**。
// 本 helper 一律用 `JSON.stringify` 写标量：带引号、反斜杠转义正确（Windows 路径必过这一关）。
// **缺项自动补默认值**，所以只写要改的那几项即可；写错的键名会被读侧抛「不认识的配置项」。
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** 配置文件主体名：`<配置目录>/memo.yaml`（＝ `src/config.ts` 的 `MEMO_CONFIG_STEM`）。 */
export const MEMO_CONFIG_FILE = 'memo.yaml';

/**
 * 把一层嵌套的取值写成受限子集正文。数组不在子集里，故不认。
 * 键序即落盘序；标量走 `JSON.stringify`（字符串带双引号、反斜杠写成 `\\`；数字与布尔裸写）。
 */
export function memoYamlText(values) {
  const out = [];
  for (const [key, entry] of Object.entries(values)) {
    if (Array.isArray(entry)) throw new Error('受限 YAML 子集不支持数组：' + key);
    if (entry !== null && typeof entry === 'object') {
      out.push(key + ':');
      for (const [child, inner] of Object.entries(entry)) out.push('  ' + child + ': ' + JSON.stringify(inner));
      continue;
    }
    out.push(key + ': ' + JSON.stringify(entry));
  }
  return out.length === 0 ? '' : out.join('\n') + '\n';
}

/** 造一个临时**配置目录**（`ILIFE_CONFIG_DIR` 的落点）。 */
export function mkConfigDir(prefix = 'memo-cfg-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** 往配置目录写 `memo.yaml`（只写要改的项，缺项由读侧按默认值补齐），返回该配置目录。 */
export function writeMemoConfig(cfgDir, values) {
  writeFileSync(join(cfgDir, MEMO_CONFIG_FILE), memoYamlText(values), 'utf8');
  return cfgDir;
}

/** 一步到位：造配置目录 ＋ 写 `memo.yaml`，返回配置目录。 */
export function mkMemoConfig(values = {}, prefix = 'memo-cfg-') {
  return writeMemoConfig(mkConfigDir(prefix), values);
}

/** 子进程 env 的那一格：`ILIFE_CONFIG_DIR` 指过去（其余继承当前进程），可再叠 `extra`。 */
export function configEnv(cfgDir, extra = {}) {
  return { ...process.env, ILIFE_CONFIG_DIR: cfgDir, ...extra };
}
