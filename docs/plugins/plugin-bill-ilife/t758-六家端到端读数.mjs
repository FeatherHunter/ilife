#!/usr/bin/env node
/** #758 · 六家端到端读数：真技能回执（临时家目录）→ 真桥 → 真行表 → 真 Row，一家一行 PASS。
 *
 * 链路（无 mock）：`setupConfigTestBase()` 把当刻进程的家目录指到临时目录 →
 * 各家 `dist/bridge.js` 的 `readConfigSurface()` 经 spawn 调真技能 `*.config.read`
 * （首次落默认 yaml）→ `toDraft(values, surface)`（真产物）→ 逐行 `Row`（真产物）
 * 按定稿表验：行数／标题／可改只读／控件／显示值（只读行＝回执 resolved 格的绝对路径，
 * 可改目录行＝生效绝对路径）／按钮（只读目录行保留且不可点）／文案零省略号。
 *
 * 定稿出处：记账 #747／卡路里 #748／备忘 #759／作息 #761／居家 #793／大厨 #795。
 * 隔离：真实 `~/.ilife` 一行不碰（基座自证＋用后清理）。用法：
 *   node tooling/run-locked.mjs --ticket 758 -- node docs/plugins/plugin-bill-ilife/t758-六家端到端读数.mjs
 */
import { isAbsolute } from 'node:path';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { loadClientBundle, nodesOfType, textOf } from '../../../test/helpers/client-bundle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');

/** 六家定稿行表：键／标题／可改只读／控件／显示值来源。 */
const EXPECTED = {
  'plugin-bill-ilife': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'db.goals', title: '预算／账户文件名', editable: false, control: 'text', show: 'goalsFile' },
    { key: 'html.dir', title: 'HELP 产物目录名', editable: false, control: 'text', show: 'htmlDir' },
    { key: 'backup.dir', title: '备份目录', editable: false, control: 'directory', show: 'backupDir' },
    { key: 'backup.stem', title: '备份文件名前缀', editable: false, control: 'text', show: 'backupSample' },
  ],
  'plugin-calorie': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'html.dir', title: 'HTML 产物目录名', editable: false, control: 'text', show: 'htmlDir' },
    { key: 'photos.dir', title: '照片目录', editable: true, control: 'directory', show: 'photosDir' },
    { key: 'xunji.key', title: '训记 KEY', editable: true, control: 'text', show: 'raw' },
    { key: 'photos.gifs', title: '照片 GIF 子目录', editable: false, control: 'text', show: 'gifsDir' },
    { key: 'xunji.stateDir', title: '训记状态文件目录', editable: false, control: 'directory', show: 'stateDir' },
    { key: 'xunji.catalog', title: '训记动作库路径', editable: false, control: 'text', show: 'catalog' },
    { key: 'xunji.backfillDays', title: '回写默认天数', editable: false, control: 'number', show: 'raw' },
    { key: 'land.xunjiSeconds', title: '训记调用限时（秒）', editable: false, control: 'number', show: 'raw' },
    { key: 'land.landSeconds', title: '落地调用限时（秒）', editable: false, control: 'number', show: 'raw' },
  ],
  'plugin-memo-ilife': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'html.dir', title: 'HTML 产物目录名', editable: false, control: 'text', show: 'htmlDir' },
    { key: 'media.dir', title: '附件目录', editable: true, control: 'directory', show: 'mediaDir' },
  ],
  'plugin-schedule-ilife': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'html.dir', title: 'HELP 产物目录', editable: false, control: 'text', show: 'htmlDir' },
  ],
  'plugin-home-ilife': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'html.dir', title: 'HTML 产物目录', editable: false, control: 'text', show: 'htmlDir' },
    { key: 'backup.dir', title: '备份目录', editable: false, control: 'directory', show: 'backupDir' },
    { key: 'key.file', title: '主密钥文件', editable: false, control: 'text', show: 'keyFile' },
  ],
  'plugin-chef': [
    { key: 'db.dir', title: '数据目录', editable: true, control: 'directory', show: 'dataDir' },
    { key: 'db.name', title: '库文件名', editable: false, control: 'text', show: 'dbFile' },
    { key: 'html.dir', title: 'HELP 产物目录', editable: false, control: 'text', show: 'htmlDir' },
    { key: 'html.sceneDir', title: '场景产物目录', editable: false, control: 'text', show: 'sceneDir' },
  ],
};

const fail = (msg) => { console.error('FAIL ' + msg); process.exit(1); };

const base = setupConfigTestBase();
try {
  for (const [pkg, rows] of Object.entries(EXPECTED)) {
    const pkgDir = join(REPO, 'packages', pkg);
    const bridge = await import(new URL(`../../../packages/${pkg}/dist/bridge.js`, import.meta.url).href);
    const index = await import(new URL(`../../../packages/${pkg}/dist/index.js`, import.meta.url).href);
    const items = index.CONFIG_ITEMS;
    if (items.length !== rows.length) fail(`${pkg} 行数须 ${rows.length}，实为 ${items.length}`);
    for (let n = 0; n < rows.length; n += 1) {
      const want = rows[n];
      const got = items[n];
      if (got.key !== want.key) fail(`${pkg} 第 ${n} 行键须 ${want.key}，实为 ${got.key}`);
      if (got.title !== want.title) fail(`${pkg} ${got.key} 标题须「${want.title}」，实为「${got.title}」`);
      if (got.control !== want.control) fail(`${pkg} ${got.key} 控件须 ${want.control}，实为 ${got.control}`);
      const editable = got.readonly !== true;
      if (editable !== want.editable) fail(`${pkg} ${got.key} 须${want.editable ? '可改' : '只读'}`);
      for (const text of [got.title, got.hint]) {
        if (text.includes('…') || text.includes('...')) fail(`${pkg} ${got.key} 文案带省略号：${text}`);
      }
    }
    const surface = bridge.readConfigSurface();
    if (!isAbsolute(surface.dataDir)) fail(`${pkg} dataDir 须绝对路径，实为 ${surface.dataDir}`);
    const { Row, toDraft } = loadClientBundle(pkgDir).exports;
    const draft = toDraft(surface.values, surface);
    const shown = [];
    for (const want of rows) {
      const item = items.find((i) => i.key === want.key);
      const value = draft[want.key] ?? '';
      if (want.show === 'raw') {
        shown.push(`${want.key}=${JSON.stringify(value)}`);
      } else if (want.show === 'dataDir') {
        if (value !== surface.dataDir) fail(`${pkg} ${want.key} 须显示生效数据目录`);
        shown.push(`${want.key}=<dataDir>`);
      } else {
        const cell = surface.resolved?.[want.show];
        if (typeof cell !== 'string' || cell.length === 0) fail(`${pkg} 回执缺 resolved.${want.show}`);
        if (want.show !== 'backupSample' && !isAbsolute(cell)) fail(`${pkg} resolved.${want.show} 须绝对路径`);
        if (value !== cell) fail(`${pkg} ${want.key} 须显示 resolved.${want.show}`);
        shown.push(`${want.key}=<resolved.${want.show}>`);
      }
      const node = Row({
        item, value, disabled: false, onChange: () => {},
        ...(item.control === 'directory' ? { browser: { mode: 'browse', onOpen: () => {} } } : {}),
      });
      const inputs = nodesOfType(node, 'input');
      if (inputs.length !== 1) fail(`${pkg} ${want.key} 须一格输入框`);
      if ((inputs[0].props.disabled === true) !== (!want.editable)) {
        fail(`${pkg} ${want.key} 输入框 disabled 须为 ${String(!want.editable)}`);
      }
      if (!want.editable && inputs[0].props.onChange !== undefined) fail(`${pkg} ${want.key} 只读行不接 onChange`);
      const buttons = nodesOfType(node, 'button');
      if (item.control === 'directory') {
        if (buttons.length !== 1) fail(`${pkg} ${want.key} 目录行须一枚浏览按钮`);
        const label = textOf(buttons[0]);
        if (label !== '浏览') fail(`${pkg} ${want.key} 按钮文案须「浏览」，实为「${label}」`);
        if ((buttons[0].props.disabled === true) !== (!want.editable)) {
          fail(`${pkg} ${want.key} 浏览按钮 disabled 须为 ${String(!want.editable)}`);
        }
      } else if (buttons.length !== 0) {
        fail(`${pkg} ${want.key} 非目录行不该画按钮`);
      }
    }
    const editableKeys = rows.filter((r) => r.editable).map((r) => r.key).join('、');
    console.log(`PASS ${pkg} 行=${rows.length} 可改=[${editableKeys}] ${shown.join(' ')}`);
  }
  console.log('六家端到端读数：6 家全绿（exit 0）');
} finally {
  base.cleanup();
}
