# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-17

### 🔧 Fixed

- **Critical Bug Fix**: `getActiveRollcalls()` now properly retrieves attendance PIN codes
  - Previously returned `number_code: null` due to using wrong API endpoint
  - Now correctly extracts PIN codes from `/api/training/activities` endpoint
  - Maintains global scanning behavior by querying all enrolled courses in parallel

### ✨ Changed

- **Attendance API Implementation**:
  - Changed from `/api/radar/rollcalls` (global, but missing PIN codes) to `/api/training/activities?course_id={id}` (per-course, with PIN codes)
  - Implemented parallel course scanning using `Promise.all` for performance
  - Added robust error handling - continues processing even if individual course requests fail
  - Flattens results from all courses to maintain original API behavior

### 🧪 Added

- Comprehensive test suite using Vitest and fast-check
- Property-based testing for attendance API methods
- Preservation tests to ensure no regressions in existing functionality
- Bug condition exploration tests to validate the fix

### 📝 Documentation

- Updated README with v2.0.0 changes and migration guide
- Removed outdated warning about PIN code retrieval limitations
- Added example usage for the fixed attendance API
- Added technical implementation details

### 🔄 Migration Guide

No breaking changes! The API signature remains the same:

```ts
// Before (v1.x): number_code was null
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls[0].number_code); // null ❌

// After (v2.0.0): number_code contains actual PIN
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls[0].number_code); // "1234" ✅
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

[2.0.0]: https://github.com/seven-317/TronClass-API/compare/v1.2.1...v2.0.0
[1.2.1]: https://github.com/seven-317/TronClass-API/releases/tag/v1.2.1
