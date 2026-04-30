[![BuyMeACoffee](https://raw.githubusercontent.com/pachadotdev/buymeacoffee-badges/main/bmc-yellow.svg)](https://buymeacoffee.com/seven317)

# TronClass API

[![npm version](https://img.shields.io/npm/v/tronclass-api.svg)](https://www.npmjs.com/package/tronclass-api)
[![npm downloads](https://img.shields.io/npm/dm/tronclass-api.svg)](https://www.npmjs.com/package/tronclass-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> 非官方的 [TronClass](https://www.tronclass.com/) Node.js / TypeScript 函式庫。

透過 Keycloak CAS SSO 自動登入（含驗證碼自動 OCR 辨識），並查詢課程、待辦、作業、教材、成績、公告、點名等所有資源 — 全部透過一個帶完整型別的 API。

> ⛔ **npm 上版本暫時下架中**（無法 publish v4.0.0），請見下方 [npm 套件暫時下架公告](#-npm-套件暫時下架公告)。要安裝請從 GitHub 取得 → [安裝方式](#安裝)。

## ⚠️ 免責聲明（v4.0.0）

> **此專案僅作為學習用途製作，不保證可用性、穩定性，亦不保證任何使用情境下的合法性。**
> 使用者應自行承擔使用本套件所造成的一切後果。請勿將本套件用於違反學校或 TronClass 服務條款的場景。

## ⛔ npm 套件暫時下架公告

> **目前本套件的 npm 上版本已暫時下架，不會更新到 v4.0.0。**
>
> 原因：我目前無法正常使用 npm 帳號的 2FA（雙重認證）功能，所以無法 publish 新版本。
>
> 在 npm 重新可用前，**請不要透過 `npm install tronclass-api` 安裝**（即使裝得到也是舊的 v3 / v2 版本，且 v3 中關於 PIN 取得的說明是錯誤資訊）。請改用下方的「替代安裝方式」直接從 GitHub 取得最新的 v4.0.0 程式碼。
>
> 等 2FA 問題解決後會盡快恢復 npm publish。造成不便敬請見諒。

## 🎉 v4.0.0 更新內容

### 🙏 對 v3.0.0 文件錯誤的道歉

v3.0.0 的早期版本/文件曾暗示 `getActiveRollcalls()` 能直接取得 4 位數點名 PIN — 這是**錯誤資訊**，特此致歉。實際上 TronClass 並未在 `/api/training/activities` 或任何已知 list 端點暴露 PIN 碼，`number_code` 永遠是 `undefined`。

### v4.0.0 新做法：高併發暴力嘗試 PIN

既然伺服器不會主動給 PIN，v4.0.0 採用**完全不同的實作策略** — 對 `0000`–`9999` 共 10000 組組合進行高併發測試，命中正確 PIN 即停止：

- ✅ **`bruteForceNumberRollcall()`** — 共享工作佇列 + worker pool + AbortController 設計
- ✅ **可組態併發數** — 預設 50，可依網路與伺服器情況調整
- ✅ **找到即終止** — 任一 worker 命中後，立刻 `abort()` 中止其他 in-flight 請求
- ✅ **進度回呼** — `onProgress` 即時回報嘗試進度
- ✅ **支援取消** — 接受外部 `AbortSignal`(逾時 / UI 取消)
- ✅ **打亂順序** — `shuffle: true` 用 Fisher–Yates 演算法避免從 0000 開始
- ✅ **可覆寫命中判定** — `isMatch` 讓你根據實際 TronClass 回應特徵自訂

### ⚠️ 重要：尚未實際點名測試

> **目前 v4.0.0 僅通過 TypeScript 編譯與 24 個 vitest 單元測試（含 fast-check property test）；尚未在實際 TronClass 環境驗證過點名是否會成功。**
>
> 也就是說：
> - 預設的「命中判定」規則(`defaultIsMatch`)是**保守猜測**，可能與實際 TronClass 回應格式不一致
> - 實際 TronClass 後端可能會：
>   - 對連續錯誤 PIN 觸發伺服器端 rate limit / 帳號鎖定
>   - 在第一次錯誤後直接鎖定該次 rollcall 不再接受嘗試
>   - 記錄異常請求 log 給管理者
> - 真實環境的 PIN 命中速度也取決於伺服器處理能力
>
> **第一次使用時請務必：**
> 1. 把 `concurrency` 調低（例如 5–10）
> 2. 用 `onProgress` 觀察伺服器回應狀態碼與訊息
> 3. 若 `defaultIsMatch` 判定有誤，傳入自訂 `isMatch` 覆寫
>
> 本套件**不保證可用性**，亦**不保證合法性**。

### 從 v3.0.0 升級指引

`getActiveRollcalls()` 與 `submitNumberRollcall()` 行為不變，原有程式碼可繼續使用。
新增 `bruteForceNumberRollcall()` 與 `tryNumberRollcall()` 兩個方法：

```ts
// v3.0.0 — 只能偵測，無法取得 PIN
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls[0].number_code); // undefined（無法解決）

// v4.0.0 — 透過併發嘗試找到 PIN
const result = await tc.attendance.bruteForceNumberRollcall(rollcalls[0].id, {
  concurrency: 50,
  onProgress: ({ tested, total, current }) =>
    console.log(`[${tested}/${total}] 嘗試 ${current}`),
});
console.log(`找到 PIN：${result.numberCode}，共嘗試 ${result.attempts} 次`);
```

## 主要特色

- 🔐 **Keycloak CAS 認證** — 自動偵測 Keycloak 與傳統 CAS 流程，內建 [Tesseract.js](https://github.com/naptha/tesseract.js/) 驗證碼 OCR
- 📚 **完整 API 覆蓋** — 課程、待辦、作業、教材、成績、公告、通知、點名（rollcall）
- 🏫 **多校支援** — 內建學校設定，亦可自定義
- ⚡ **內建速率限制** — 可調整 RPM 上限
- 🔄 **自動重試** — 指數退避（exponential backoff）
- 🍪 **Cookie 持久化** — 透過 `tough-cookie` + `fetch-cookie` 維持登入 session
- 🛡️ **型別化錯誤** — `RateLimitError`、`AuthenticationError`、`NetworkError`、`ApiError`、`NumberCodeNotFoundError`
- 🤖 **Bot 介接** — 內建 Discord 與 LINE bot 訊息格式器（Embeds / Flex Messages）
- 📝 **完整型別定義** — 所有 API 回應皆有 TypeScript 型別

## 安裝

> **注意：** 本套件為 ESM-only，需要 Node.js 18 以上版本。
>
> ⛔ **目前 npm 上版本已暫停發布**（詳見上方公告），請使用以下任一替代方式取得 v4.0.0。

### 方式 A：直接從 GitHub 安裝（推薦）

最簡單的方式，npm/yarn/pnpm 都支援直接從 GitHub repo 安裝：

```bash
# npm
npm install github:seven-317/Tronclass-API

# 指定特定 branch / tag / commit
npm install github:seven-317/Tronclass-API#main
npm install github:seven-317/Tronclass-API#v4.0.0

# yarn
yarn add github:seven-317/Tronclass-API

# pnpm
pnpm add github:seven-317/Tronclass-API
```

安裝完成後在 `package.json` 的 `dependencies` 會看到：

```json
{
  "dependencies": {
    "tronclass-api": "github:seven-317/Tronclass-API"
  }
}
```

之後就能像普通的 npm 套件一樣 import 使用：

```ts
import { TronClass, Schools, solveCaptcha } from 'tronclass-api';
```

> ⚠️ 從 GitHub 安裝時 npm 會自動執行 `npm install` 與 build。若你的環境沒有 TypeScript / `tsc`，可能需要在你的專案內執行：
> ```bash
> cd node_modules/tronclass-api
> npm install
> npm run build
> ```

### 方式 B：Clone repo 後用 `npm link` 連結

適合想同時修改本套件原始碼、邊改邊用的人：

```bash
# 1. clone 本 repo 到你習慣的位置
git clone https://github.com/seven-317/Tronclass-API.git
cd Tronclass-API

# 2. 安裝相依套件 + 編譯
npm install
npm run build

# 3. 把這個資料夾註冊成全域可連結
npm link

# 4. 切到你的專案資料夾，把它連進來
cd /path/to/your-project
npm link tronclass-api
```

之後就可以一樣 `import { TronClass } from 'tronclass-api'`。
若想取消連結：在你的專案執行 `npm unlink tronclass-api`，在 repo 執行 `npm unlink -g tronclass-api`。

### 方式 C：Clone 後用相對路徑安裝

不想用 `npm link` 的話，也可以把 repo clone 到任何位置，然後在你的專案 `package.json` 用 `file:` 協議引用：

```bash
# 1. clone 並 build
git clone https://github.com/seven-317/Tronclass-API.git
cd Tronclass-API
npm install
npm run build

# 2. 在你的專案資料夾安裝
cd /path/to/your-project
npm install /path/to/Tronclass-API
```

或在 `package.json` 直接寫：

```json
{
  "dependencies": {
    "tronclass-api": "file:../Tronclass-API"
  }
}
```

然後跑 `npm install`。

### 方式 D：直接複製原始碼進你的專案

如果你只想用其中一兩個功能（例如只想用 `bruteForceNumberRollcall`），也可以直接把 `src/` 整個資料夾複製到你的專案裡，並把以下相依套件加到自己 `package.json`：

```bash
npm install fetch-cookie tough-cookie tesseract.js jsdom canvas dotenv
```

然後在你的程式裡用相對路徑 import：

```ts
import { TronClass } from './tronclass-src/index.js';
```

> 注意：本套件 `src/` 內所有 import 路徑都是 `.js` 結尾（ESM 規範），即使檔案是 `.ts`。請保留 TypeScript 的 ESM 設定（`"module": "ESNext"`、`"moduleResolution": "Bundler"` 或 `"NodeNext"`）。

## 快速開始

### 1. 設定環境變數

```bash
cp .env.example .env
```

```env
TRON_USER=你的學號
TRON_PASS=你的密碼
TRON_SCHOOL=EXAMPLE_UNIVERSITY
```

### 2. 開始使用

```ts
import { TronClass, Schools, solveCaptcha } from 'tronclass-api';

const tc = new TronClass(Schools.ASIA_UNIVERSITY);

// 自動處理驗證碼登入
await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: solveCaptcha,
});

// 取得目前進行中的課程
const courses = await tc.courses.getActiveCourses();
console.log(courses);

// 取得待辦事項
const todos = await tc.todos.getTodos();
console.log(todos);

// 取得公告
const announcements = await tc.announcements.getAnnouncements();
console.log(announcements);

// 偵測目前進行中的點名
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls);
```

### 使用自定義學校

```ts
import { TronClass, createSchoolConfig } from 'tronclass-api';

// 方式 1：直接傳 base URL 字串
const tc = new TronClass('https://tronclass.your-school.edu');

// 方式 2：完整設定
const tc2 = new TronClass(
  createSchoolConfig({
    name: 'Your University',
    baseUrl: 'https://tronclass.your-school.edu.tw',
    hasCaptcha: true,
  })
);
```

## API 參考

### `new TronClass(config, options?)`

建立一個新的 TronClass 客戶端實例。

| 參數 | 型別 | 說明 |
|---|---|---|
| `config` | `SchoolConfig \| string` | 預設學校或 base URL 字串 |
| `options.maxRetries` | `number` | 最大重試次數（預設：`3`） |
| `options.rpm` | `number` | 每分鐘最多請求數（預設：`60`） |

### 認證

| 方法 | 回傳 | 說明 |
|---|---|---|
| `tc.login({ username, password, ocrFunction? })` | `Promise<LoginResponse>` | 透過 CAS SSO 登入；可傳 `ocrFunction` 處理驗證碼 |
| `tc.isLoggedIn` | `boolean` | session 是否仍有效 |

### 課程 (Courses)

| 方法 | 說明 |
|---|---|
| `.getMyCourses(conditions?)` | 列出已選課程（預設包含所有學期） |
| `.getActiveCourses()` | 列出目前進行中的課程 |
| `.getRecentCourses()` | 列出最近瀏覽過的課程 |
| `.getCourseById(courseId)` | 依 ID 取得單一課程 |
| `.getCourseModules(courseId)` | 取得課程模組/章節 |
| `.getMySemesters()` | 列出所有學期 |
| `.getMyAcademicYears()` | 列出所有學年度 |

### 待辦 (Todos)

| 方法 | 說明 |
|---|---|
| `.getTodos()` | 列出待辦事項（作業、測驗等） |

### 作業 (Assignments)

| 方法 | 說明 |
|---|---|
| `.getHomeworkActivities(courseId)` | 列出某課程的所有作業 |
| `.getHomeworkDetail(courseId, activityId)` | 取得作業詳細資訊 |
| `.submitHomework(courseId, activityId, content)` | 繳交作業 |

### 教材 (Materials)

| 方法 | 說明 |
|---|---|
| `.getCourseMaterials(courseId)` | 列出課程教材/活動 |
| `.downloadFile(fileUrl)` | 下載教材檔案 |

### 成績 (Grades)

| 方法 | 說明 |
|---|---|
| `.getCourseGrades(courseId)` | 取得課程考試成績 |
| `.getExamList(courseId)` | 取得課程考試清單 |

### 公告與通知 (Announcements & Notifications)

| 方法 | 說明 |
|---|---|
| `.getAnnouncements(page?, pageSize?)` | 列出全校公告（含分頁） |
| `.getLatestBulletins()` | 取得最新公告（dashboard 顯示用） |
| `.getClassifications()` | 取得公告分類 |
| `.getCourseAnnouncements(courseId)` | 列出某課程的公告 |
| `.getNotifications()` | 列出通知訊息 |

### 點名 (Attendance / Rollcall)

> **🔥 v4.0.0 新增：** `bruteForceNumberRollcall()` 高併發暴力嘗試 PIN（10000 組組合 + worker pool + AbortController 短路），詳見上方 [v4.0.0 更新內容](#-v400-更新內容)。
>
> ⚠️ **本功能尚未在真實 TronClass 環境測試過，僅通過編譯與單元測試；僅作學習用途，不保證可用性與合法性。**

| 方法 | 說明 |
|---|---|
| `.getActiveRollcalls()` | 列出所有進行中的點名（不含 PIN） |
| `.tryNumberRollcall(rollcallId, code, options?)` | 嘗試送出單一 PIN（不丟錯，回傳 ok 與否） |
| `.submitNumberRollcall(rollcallId, code)` | 送出已知正確的 PIN（失敗會丟錯） |
| `.bruteForceNumberRollcall(rollcallId, options?)` | **🔥 高併發暴力嘗試 4 位 PIN，命中即回傳** |

**`bruteForceNumberRollcall` 選項：**

| 選項 | 型別 | 預設值 | 說明 |
|---|---|---|---|
| `concurrency` | `number` | `50` | 同時並發的 worker 數量 |
| `startFrom` | `number` | `0` | 起始 PIN（含） |
| `endAt` | `number` | `10000` | 結束 PIN（不含） |
| `shuffle` | `boolean` | `false` | 是否打亂測試順序（Fisher–Yates） |
| `delayMs` | `number` | `0` | 每個 worker 兩次嘗試之間的延遲 |
| `onProgress` | `(info) => void` | — | 進度回呼，每次嘗試完成都會呼叫 |
| `isMatch` | `(result, code) => boolean` | 預設判定 | 自訂「PIN 命中」邏輯 |
| `signal` | `AbortSignal` | — | 外部中止訊號 |

**使用範例：**

```ts
import { TronClass, Schools, solveCaptcha, NumberCodeNotFoundError } from 'tronclass-api';

const tc = new TronClass(Schools.ASIA_UNIVERSITY);
await tc.login({ username, password, ocrFunction: solveCaptcha });

// 1. 偵測目前開放的點名
const rollcalls = await tc.attendance.getActiveRollcalls();
if (rollcalls.length === 0) return console.log('目前沒有進行中的點名。');

// 2. 對每個 rollcall 暴力嘗試 PIN
for (const r of rollcalls) {
  try {
    const result = await tc.attendance.bruteForceNumberRollcall(r.id, {
      concurrency: 50,
      shuffle: true,
      onProgress: ({ tested, total, current, elapsedMs }) => {
        process.stdout.write(`\r[${tested}/${total}] 嘗試 ${current}（${elapsedMs}ms）`);
      },
    });
    console.log(`\n✓ 找到 PIN ${result.numberCode}，共嘗試 ${result.attempts} 次（${result.durationMs}ms）`);
  } catch (err) {
    if (err instanceof NumberCodeNotFoundError) {
      console.error(`✗ 已嘗試 ${err.attempts} 次但都未命中。`);
    } else {
      throw err;
    }
  }
}
```

**自訂命中判定（建議第一次使用先這樣做以觀察伺服器回應）：**

```ts
await tc.attendance.bruteForceNumberRollcall(rollcallId, {
  concurrency: 5, // 第一次先用低併發觀察行為
  isMatch: (result, code) => {
    console.log(`[${code}] ok=${result.ok} statusCode=${result.statusCode}`,
      result.ok ? result.result : result.body);
    // 根據觀察到的 TronClass 實際回應修改判定條件
    return result.ok && result.result.status === 'success';
  },
});
```

### 通用請求

對於本套件未涵蓋的 API 端點：

```ts
// 原始 Response
const res = await tc.call('/api/some/endpoint');

// 已解析的 JSON
const data = await tc.callJson<MyType>('/api/some/endpoint');
```

### 速率限制

內建的速率限制可避免過度請求 API。可在執行時讀取或調整上限：

```ts
// 讀取目前上限
console.log(tc.rpm); // 60

// 執行時動態調整
tc.rpm = 120;
```

## 錯誤處理

所有錯誤皆繼承 `TronClassError`，方便進行型別安全的錯誤處理：

```ts
import {
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ApiError,
  NumberCodeNotFoundError,
} from 'tronclass-api';

try {
  await tc.courses.getMyCourses();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`請等待 ${error.waitTime}ms 後再重試`);
  } else if (error instanceof AuthenticationError) {
    console.log('Session 已過期，請重新登入');
  } else if (error instanceof NumberCodeNotFoundError) {
    console.log(`暴力嘗試 ${error.attempts} 次（共 ${error.durationMs}ms）皆未命中`);
  } else if (error instanceof ApiError) {
    console.log(`API 錯誤 ${error.statusCode}: ${error.responseBody}`);
  } else if (error instanceof NetworkError) {
    console.log('網路連線異常');
  }
}
```

## 驗證碼支援

部分學校（例如亞洲大學）會在 Keycloak CAS 登入頁加入驗證碼。內建的 `solveCaptcha` 使用 Tesseract.js 加上影像前處理（灰階化、降噪、形態學濾波）做自動辨識：

```ts
import { solveCaptcha } from 'tronclass-api';

await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: solveCaptcha, // 內建 Tesseract.js OCR
});
```

也可以提供自訂的 OCR 函式：

```ts
await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: async (dataUrl: string) => {
    // dataUrl 是 base64 編碼圖片（例如 "data:image/png;base64,..."）
    // 可以接 OCR 服務或自訂模型，回傳辨識出的字串
    return myCustomOcr(dataUrl);
  },
});
```

## 內建學校

| Key | 名稱 |
|---|---|
| `ASIA_UNIVERSITY` | 亞洲大學 |
| `SHIH_CHIEN_UNIVERSITY` | 實踐大學 |

> **想新增學校？** 使用 `createSchoolConfig()`，或直接送 PR 到 `src/config/schools.ts`。

## Bot 整合（Discord / LINE）

本套件附帶高階的 `TronClassService` 與平台專屬訊息格式器，bot 只要幾行程式碼就能產生完整的 UI 元件：

```ts
import { TronClass, Schools, TronClassService, DiscordFormatter } from 'tronclass-api';

const tc = new TronClass(Schools.ASIA_UNIVERSITY);
await tc.login({ username, password });

const service = new TronClassService(tc);
const data = await service.getUpcomingDeadlines(7);
const embed = DiscordFormatter.formatDeadlines(data);

// → 把 embed 傳給 channel.send({ embeds: [embed] }) 即可
```

### TronClassService

高階聚合層，把多個底層 API 合併成方便的單一方法：

| 方法 | 說明 |
|---|---|
| `getDashboard()` | 進行中課程 + 進行中點名 + 最近待辦 + 最新公告 |
| `getCourseOverview(courseId)` | 課程資訊 + 作業 + 教材 |
| `getUpcomingDeadlines(days?)` | 依截止時間排序的近期 deadline |
| `getAnnouncementSummaries(limit?)` | 簡短的近期公告摘要 |
| `getCourseGradeSummary(courseId)` | 某課程的成績明細 |

### 訊息格式器 (Formatters)

把 `TronClassService` 的輸出轉換成各平台的訊息格式：

| 格式器 | 輸出 | 相依套件 |
|---|---|---|
| `DiscordFormatter` | Discord Embed JSON | 無（搭配 `discord.js` 的 `EmbedBuilder` 使用） |
| `LineFormatter` | LINE Flex Message JSON | 無（搭配 `@line/bot-sdk` 使用） |

完整範例請見 [`examples/discord-bot.ts`](examples/discord-bot.ts) 與 [`examples/line-bot.ts`](examples/line-bot.ts)。

## 執行範例

```bash
cp .env.example .env
# 編輯 .env 填入帳密

# 執行基本範例
npm run example

# 執行點名範例
npx tsx examples/attendance.ts
```

## 專案結構

```
src/
├── index.ts              # 主要 TronClass 類別與所有 export
├── auth/
│   └── cas-auth.ts       # Keycloak / 傳統 CAS 認證
├── api/
│   ├── courses.ts        # 課程 API
│   ├── todos.ts          # 待辦 API
│   ├── assignments.ts    # 作業 API
│   ├── materials.ts      # 教材 API
│   ├── grades.ts         # 成績 API
│   ├── announcements.ts  # 公告 / 通知 API
│   └── attendance.ts     # 點名 API（rollcall）
├── adapters/
│   ├── tronclass-service.ts  # 高階聚合服務
│   ├── discord-formatter.ts  # Discord Embed 格式器
│   ├── line-formatter.ts     # LINE Flex Message 格式器
│   └── adapter-types.ts      # adapter 共用型別
├── core/
│   ├── http-client.ts    # 帶 cookie jar 的 HTTP client
│   ├── rate-limiter.ts   # 速率限制（RPM）
│   └── errors.ts         # 錯誤類別
├── config/
│   └── schools.ts        # 內建學校設定
├── utils/
│   └── captcha-ocr.ts    # 驗證碼 OCR（Tesseract.js + 前處理）
└── types/
    └── index.ts          # TypeScript 型別定義

examples/
├── basic.ts              # 基本使用範例
├── attendance.ts         # 點名範例
├── discord-bot.ts        # Discord bot 範例
└── line-bot.ts           # LINE bot 範例
```

## 貢獻

歡迎各種貢獻！可以這樣參與：

1. **新增學校** — 送 PR 到 `src/config/schools.ts`
2. **回報 bug** — 在 [GitHub](https://github.com/seven-317/TronClass-API/issues) 開 issue
3. **新增 API 端點** — TronClass 還有許多端點尚未涵蓋

## 授權

[MIT](LICENSE)

若你在商業專案中使用本套件，懇請在文件中註明出處或來訊告知，我會非常感激！

## Star History

<a href="https://www.star-history.com/#seven-317/Tronclass-API&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&legend=top-left" />
 </picture>
</a>
