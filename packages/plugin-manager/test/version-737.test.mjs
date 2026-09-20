// 票 #737 自证回路：总管自述版本 ≡ 包描述文件的 version。
//
// 现象（2026-09-20 实测）：面板总设置区印着「总管 dsh-life-pack · 0.2.6」，而这台机器上那份包
// 的 package.json 已是 0.2.7（装机拷贝的产物里那行同样是 0.2.6）。
// 根因：版本行的唯一来源是 `src/nav.ts` 的手写常量 `MANAGER_VERSION`，定版只 bump `package.json`
// 时它会无声漂开，且当时没有任何门把两者钉在一起。
//
// 本回路咬两条，都不咬写法，也不从源码文本里抠字符串（取值只从**构建产物**与**包描述文件**读）：
//   ① 产物里的常量（`dist/nav.js` 导出）与包描述文件 `package.json` 的 `version` 逐字相等；
//   ② 产物里那行屏幕文案（`dist/client.js` 画的「总管 dsh-life-pack · x.y.z」）带着同一个版本号
//      —— 常量改对了但 client 束没重出，屏上仍是旧版号，这条必须红。
//
// 前提：本回路读的是**构建产物**，所以要先出产物（CI 的顺序正是先 `pnpm build` 再 `pnpm test`）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-manager
//   cmd /c "cd /d <仓根>\packages\plugin-manager && node node_modules\tsdown\dist\run.mjs"
//
// 边界（不在这里假装，写进证据件）：只改 `src` 不重出产物时 ① 不会红——它钉的是**产物**；
// 「源码改了没出产物」由「先 build 后 test」这条链路兜住，不由本回路兜。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANAGER_PLUGIN, MANAGER_VERSION } from '../dist/nav.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(join(HERE, '..', 'package.json'), 'utf8'));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');

/** 屏幕文案那行的字形（与 `src/client.ts` 画的一致；改文案须同步改这里，这是有意的）。 */
const versionLine = (v) => '总管 ' + MANAGER_PLUGIN + ' · ' + v;

describe('票 #737 面板版本行与包版本', () => {
  it('产物里的常量与包描述文件 version 逐字相等（定版只 bump package.json 即红）', () => {
    assert.equal(PKG.name, MANAGER_PLUGIN, '包描述文件的 name 与产物里的包名常量对不上');
    assert.equal(
      MANAGER_VERSION,
      PKG.version,
      '产物 dist/nav.js 的 MANAGER_VERSION（' + MANAGER_VERSION + '）与包描述文件 version（'
        + PKG.version + '）漂开了：定版时两者必须一起走',
    );
  });

  it('产物里那行屏幕文案带着同一个版本号（client 束没重出即红）', () => {
    assert.ok(
      CLIENT.includes(versionLine(PKG.version)),
      '产物 dist/client.js 里没有「' + versionLine(PKG.version) + '」这行：client 束与包版本对不上（没重出产物？）',
    );
  });
});
