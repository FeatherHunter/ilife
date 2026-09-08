---
"dsh-calorie": patch
---

#48 真机 hang 根因修复：Desktop 宿主 process.execPath 是 Electron 二进制，直 spawn 起 GUI 子进程永不退出（POST /ilife-calorie/read 15s 超时实证、netstat 定到 DSH Desktop.exe）。桥加 resolveNodeBin（node 直用 / Electron 加 ELECTRON_RUN_AS_NODE）+ 20s spawn 超时杀；双 client 加 AbortSignal.timeout，UI 最多转 20s 圈即报超时错。memo 同构（未发版）。
