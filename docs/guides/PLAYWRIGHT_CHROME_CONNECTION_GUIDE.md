# Playwright Chrome 연결 문제 해결 가이드

## 문제 상황

Playwright로 Chrome 브라우저를 열 때 **격리된 세션(시크릿 모드 같은)**이 열려서 기존 로그인 정보를 사용할 수 없는 문제가 발생했습니다.

### 증상
- Playwright로 연 브라우저에서 새 탭을 열면 시크릿 탭이 열림
- 기존 Chrome 로그인 정보가 유지되지 않음
- 매번 로그인을 새로 해야 함
- 개발 자동화 워크플로우가 중단됨

## 원인 분석

### 1. Playwright의 기본 동작
```javascript
// ❌ 문제가 되는 코드
const browser = await chromium.launch({
  channel: 'chrome',
  headless: false
});
```

Playwright는 기본적으로:
- **격리된 임시 프로필**을 생성 (`/tmp/playwright_chromiumdev_profile-xxxxx`)
- 각 실행마다 **새로운 세션**을 시작
- **쿠키, 로그인 정보, 확장 프로그램 등이 저장되지 않음**

### 2. `launchPersistentContext` 시도 실패
```javascript
// ❌ 실제 Chrome 프로필 사용 시도 - 실패
const context = await chromium.launchPersistentContext(
  '/Users/twins/Library/Application Support/Google/Chrome',
  { channel: 'chrome', headless: false }
);
```

**실패 원인:**
- Chrome이 이미 실행 중이면 같은 프로필을 사용할 수 없음
- "Failed to create a ProcessSingleton" 에러 발생
- Chrome의 프로필 잠금 메커니즘 때문

### 3. `connectOverCDP` 직접 시도 실패
```javascript
// ❌ CDP 연결 시도 - 실패
const browser = await chromium.connectOverCDP('http://localhost:9222');
```

**실패 원인:**
- Chrome 실행 시 `--remote-debugging-port=9222`만으로는 부족
- `--user-data-dir`을 지정하지 않으면 CDP가 활성화되지 않음

## ✅ 해결 방법

### 최종 해결책: 원격 디버깅 모드 + Persistent Profile

#### 1단계: Chrome을 원격 디버깅 모드로 실행

**스크립트: `start-chrome-persistent.sh`**
```bash
#!/bin/bash

CHROME_PROFILE_DIR="$HOME/.chrome-playwright-profile"

# 별도의 프로필 디렉토리로 Chrome 실행
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$CHROME_PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  "https://supabase.com/dashboard/project/eanqmkyvdwmybwxkghev/sql/new" &
```

**핵심 포인트:**
- `--remote-debugging-port=9222`: CDP(Chrome DevTools Protocol) 활성화
- `--user-data-dir="$CHROME_PROFILE_DIR"`: **별도의 프로필 디렉토리 지정**
  - 로그인 정보가 `~/.chrome-playwright-profile`에 저장됨
  - 한 번 로그인하면 계속 유지됨
- 기존 Chrome과 **별도로 실행 가능**

#### 2단계: Playwright로 연결

**스크립트: `supabase-auto.js`**
```javascript
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

// 기존 컨텍스트 사용 (로그인 정보 포함)
const contexts = browser.contexts();
const context = contexts[0];

// 페이지 가져오기 또는 생성
const pages = context.pages();
const page = pages.length > 0 ? pages[0] : await context.newPage();

// 이제 로그인된 상태로 자동화 진행 가능
await page.goto('https://supabase.com/dashboard/...');
```

**핵심 포인트:**
- `connectOverCDP()`: 이미 실행 중인 Chrome에 연결
- `context.pages()`: 기존 탭 재사용
- 로그인 세션 유지됨

## 사용 방법

### 최초 1회 설정

1. **Chrome 실행:**
```bash
cd /Users/twins/Downloads/nvoim-planer-pro/apps/planner-web
./start-chrome-persistent.sh
```

2. **로그인:** 열린 Chrome에서 Supabase/GitHub 로그인

3. **자동화 실행:**
```bash
node supabase-auto.js
```

### 이후 사용

Chrome을 닫았다가 다시 열어도 로그인 정보가 유지됩니다:

```bash
# Chrome 실행 (로그인 유지됨)
./start-chrome-persistent.sh

# 자동화 실행
node supabase-auto.js
```

## 작동 원리 비교

| 방법 | 프로필 | 로그인 유지 | 기존 Chrome과 충돌 |
|------|--------|-------------|-------------------|
| `launch()` | 임시 | ❌ 없음 | ✅ 없음 |
| `launchPersistentContext()` | 실제 | ✅ 유지 | ❌ 충돌 |
| **CDP 연결** | **별도 저장** | **✅ 유지** | **✅ 없음** |

## 디버깅 팁

### Chrome이 제대로 시작되었는지 확인
```bash
# 포트 9222가 열려있는지 확인
lsof -Pi :9222 -sTCP:LISTEN

# Chrome 프로세스 확인
ps aux | grep "remote-debugging-port=9222"
```

### CDP 연결 테스트
```bash
curl http://localhost:9222/json/version
```

정상 출력 예시:
```json
{
  "Browser": "Chrome/144.0.7559.98",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0...",
  "V8-Version": "...",
  "WebKit-Version": "...",
  "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/browser/..."
}
```

### Playwright 연결 테스트
```javascript
const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ 연결 성공!');

    const contexts = browser.contexts();
    console.log('컨텍스트 수:', contexts.length);

    const pages = contexts[0].pages();
    console.log('페이지 수:', pages.length);

    await browser.close();
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
  }
})();
```

## 주의사항

1. **포트 충돌:** 9222 포트가 이미 사용 중이면 다른 포트 사용
```bash
--remote-debugging-port=9223
```

2. **프로필 디렉토리:** 절대경로 사용 권장
```bash
CHROME_PROFILE_DIR="/Users/twins/.chrome-playwright-profile"
```

3. **동시 실행:** 같은 프로필로 여러 Chrome 인스턴스를 실행할 수 없음

4. **보안:** 원격 디버깅 포트는 로컬호스트에서만 접근 가능하도록 설정

## 트러블슈팅

### "ECONNREFUSED" 에러
**원인:** Chrome이 아직 시작되지 않았거나 CDP가 활성화되지 않음

**해결:**
```bash
# Chrome 프로세스 확인
ps aux | grep Chrome | grep 9222

# 없으면 재시작
pkill -9 "Google Chrome"
./start-chrome-persistent.sh
sleep 5
node supabase-auto.js
```

### "Target page, context or browser has been closed"
**원인:** Chrome 창을 수동으로 닫음

**해결:** Chrome을 다시 시작

### 로그인이 유지되지 않음
**원인:** `--user-data-dir`이 올바르게 지정되지 않음

**해결:** 프로필 디렉토리 경로 확인
```bash
ls -la ~/.chrome-playwright-profile/
```

## 참고 자료

- [Playwright - connectOverCDP](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome Command Line Switches](https://peter.sh/experiments/chromium-command-line-switches/)

## 요약

**핵심:** Playwright로 Chrome을 직접 실행하지 말고, **원격 디버깅 모드로 실행된 Chrome에 연결**하라!

```bash
# 1. Chrome 실행 (한 번만)
./start-chrome-persistent.sh

# 2. Playwright 연결 (매번)
node supabase-auto.js
```

이렇게 하면:
- ✅ 로그인 정보 유지
- ✅ 확장 프로그램 사용 가능
- ✅ 북마크, 히스토리 저장
- ✅ 일반 Chrome처럼 사용 가능
- ✅ Playwright 자동화 가능
