// 票 #744 · 共用件「目录浏览器」的产物回路：**视图必须真的打进 client 束**。
//
// 咬两件事：
//   ① 六家要用的那几个名字（`DirectoryBrowser`／`createDirectoryRowBrowser`／`pickerModeOf`／`readPickAnswer`／
//      `createBrowseController`）真的出现在 `dist/client.js` 里——「源码在、没打进束」必须变红；
//   ② 束里三条跨包 `require` 只许 `react`／`react/jsx-runtime`／`react-dom`／`cordis`／
//      `@deepseek-ai/dsh-client-ui-slots`（本包既成清单）——多出来一条就是偷偷引了宿主实现。
//
// 先构建再跑：`pnpm --filter dsh-life-pack run build:client`。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');

describe('#744 目录浏览器打进了 client 束', () => {
  it('六家要用的几个名字都在束里', () => {
    for (const name of [
      'DirectoryBrowserFromRow',
      'createDirectoryRowBrowser',
      'createBrowseController',
      'pickerModeOf',
      'readPickAnswer',
      'createRootsSource',
      'readRootsAnswer',
    ]) {
      assert.match(CLIENT, new RegExp(`\\b${name}\\b`), `束里找不到 ${name}（视图没被打进产物）`);
    }
  });

  it('图上那几句自带文案也在（组件真的被画出来，不是只留了函数名）', () => {
    // 只咬本件**自带**的那两句：「显示隐藏目录」是开关的固定说法、「新建文件夹」是那枚按钮；
    // 「将选定：」「其他磁盘：」由调用方按行给，不在本件里，故不咬（它们在各家的束里）。
    for (const text of ['显示隐藏', '新建文件夹']) {
      assert.ok(CLIENT.includes(text), `束里找不到文案「${text}」`);
    }
  });

  it('宿主半的东西没漏进浏览器束（取盘符那条路只许住宿主）', () => {
    for (const forbidden of ['child_process', 'powershell', 'DriveInfo']) {
      assert.ok(!CLIENT.includes(forbidden), `client 束里出现了宿主半的东西：${forbidden}`);
    }
  });

  it('跨包 require 只有本包既成那一串（多一条就是偷偷引了宿主实现）', () => {
    const allowed = new Set([
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'cordis',
      '@deepseek-ai/dsh-client-ui-slots',
    ]);
    const found = new Set();
    for (const match of CLIENT.matchAll(/require\("([^"]+)"\)/g)) found.add(match[1]);
    const unexpected = [...found].filter((id) => !allowed.has(id));
    assert.deepEqual(unexpected, [], `束里出现了计划外的跨包依赖：${unexpected.join(', ')}`);
  });
});
