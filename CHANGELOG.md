# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v3.0.0.html).

## [4.0.0] - 2026-04-30

### 🙏 Apology

- v3.0.0 的早期文件曾暗示 `getActiveRollcalls()` 能直接取得 4 位數點名 PIN，這是錯誤資訊。實際上 TronClass 並未在任何已知 list 端點暴露 PIN 碼，特此致歉。

### 🔥 Added

- **`AttendanceApi.bruteForceNumberRollcall(rollcallId, options?)`** — 高併發暴力嘗試 4 位 PIN
  - 共享工作佇列 + worker pool + AbortController 設計
  - 命中正確 PIN 後立即中止其他 in-flight 請求
  - 支援 `concurrency`、`shuffle`、`delayMs`、`onProgress`、`isMatch`、`signal` 等選項
  - 全部 10000 組組合嘗試完仍未命中時丟出 `NumberCodeNotFoundError`
- **`AttendanceApi.tryNumberRollcall(rollcallId, code, options?)`** — 嘗試送出單一 PIN（不丟錯，回傳 `{ ok, statusCode, ... }`）
- **`NumberCodeNotFoundError`** — 暴力破解失敗時丟出的錯誤類型
- **`HttpClient.request()` 第三個 `RequestOptions` 參數** — 支援 `skipRateLimit`、`maxRetries` 覆寫
- 9 個新 vitest 測試（含 fast-check property test 驗證任意 PIN 可被找到）

### ⚠️ Disclaimer

- **目前僅通過 TypeScript 編譯與 24 個單元測試，尚未在實際 TronClass 環境驗證點名是否會成功。**
- 預設的 `defaultIsMatch` 判定為保守猜測，可能與實際回應格式不一致；建議第一次使用降低 `concurrency` 並用 `onProgress` 觀察伺服器回應。
- 本套件**僅作學習用途**，不保證可用性、穩定性，亦不保證任何使用情境下的合法性。
- 過度高併發請求可能違反 TronClass 或學校的服務條款，使用者自行承擔後果。

### 📝 Documentation

- 全面改寫 README 的 v4.0.0 章節：道歉、新做法說明、警告、Migration Guide
- 新增 `bruteForceNumberRollcall` 完整選項表與自訂 `isMatch` 範例
- 範例檔 `examples/attendance.ts` 改寫為展示完整暴力破解流程

## [2.0.0] - 2026-04-17

### 🔧 Updated

- **Attendance API behavior**: `getActiveRollcalls()` detects active attendance tasks, but does not retrieve PIN codes
  - TronClass does not expose numeric PIN codes through the known rollcall/activity list endpoints
  - `number_code` is returned as `undefined`
  - Maintains global scanning behavior by querying all enrolled courses in parallel

### ✨ Changed

- **Attendance API Implementation**:
  - Uses `/api/training/activities?course_id={id}` to discover active attendance tasks per course
  - Implemented parallel course scanning using `Promise.all` for performance
  - Added robust error handling - continues processing even if individual course requests fail
  - Flattens results from all courses to maintain original API behavior

### 🧪 Added

- Comprehensive test suite using Vitest and fast-check
- Property-based testing for attendance API methods
- Preservation tests to ensure no regressions in existing functionality
- Tests documenting that PIN codes are not exposed by active attendance discovery

### 📝 Documentation

- Updated README with v3.0.0 changes and migration guide
- Documented PIN code retrieval limitations
- Added example usage for active attendance discovery
- Added technical implementation details

### 🔄 Migration Guide

No breaking changes! The API signature remains the same:

```ts
// Before: callers expected number_code to contain the PIN
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls[0].number_code); // "1234"

// Now: active rollcalls are detected, but the PIN is not exposed by TronClass
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls[0].number_code); // undefined
```

## [1.2.1] - 2024-XX-XX

### Initial Release

- Keycloak CAS authentication with automatic captcha OCR
- Full API coverage for courses, todos, assignments, materials, grades, announcements
- Attendance (rollcall) API support
- Multi-school support with preconfigured schools
- Rate limiting and auto-retry mechanisms
- Discord and LINE bot adapters
- TypeScript type definitions

[4.0.0]: https://github.com/seven-317/TronClass-API/compare/v3.0.0...v4.0.0
[2.0.0]: https://github.com/seven-317/TronClass-API/compare/v1.2.1...v3.0.0
[1.2.1]: https://github.com/seven-317/TronClass-API/releases/tag/v1.2.1
