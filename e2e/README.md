# VGfriend E2E Test Framework

Framework kiểm thử End-to-End cho VGfriend sử dụng **Playwright** với pattern **Page Object Model (POM)**.

## 📁 Cấu trúc thư mục

```
e2e/
├── api/                    # API Client cho test API
│   ├── ApiClient.ts       # Class xử lý tất cả API calls
│   └── index.ts
├── fixtures/               # Playwright fixtures
│   ├── test-fixtures.ts   # Custom fixtures với page objects
│   └── index.ts
├── pages/                  # Page Object Model
│   ├── BasePage.ts        # Abstract base class
│   ├── LoginPage.ts       # Trang login
│   ├── RegisterPage.ts    # Trang đăng ký
│   ├── DashboardPage.ts   # Trang dashboard
│   ├── ChatPage.ts        # Trang chat
│   ├── OnboardingPage.ts  # Trang tạo nhân vật
│   ├── PasswordResetPages.ts  # Password reset flow
│   └── index.ts
├── tests/                  # Test specs
│   ├── fixtures.ts        # Test fixtures export
│   ├── api/               # API tests
│   │   ├── auth.spec.ts
│   │   ├── character.spec.ts
│   │   ├── chat.spec.ts
│   │   └── features.spec.ts
│   └── ui/                # UI tests
│       ├── auth/
│       │   ├── login.spec.ts
│       │   ├── register.spec.ts
│       │   └── password-reset.spec.ts
│       ├── chat/
│       │   └── chat.spec.ts
│       ├── dashboard/
│       │   └── dashboard.spec.ts
│       └── onboarding/
│           └── onboarding.spec.ts
├── utils/                  # Utilities
│   ├── test-data.ts       # Test data generators
│   ├── helpers.ts         # Helper functions
│   └── index.ts
├── .env.example           # Environment template
├── global-setup.ts        # Global setup
├── global-teardown.ts     # Global teardown
├── package.json           # Dependencies
├── playwright.config.ts   # Playwright config
├── tsconfig.json          # TypeScript config
└── README.md              # This file
```

## 🚀 Cài đặt

```bash
cd e2e

# Cài dependencies
npm install

# Cài Playwright browsers
npx playwright install

# Copy và cấu hình env
cp .env.example .env
```

## ⚙️ Cấu hình

Tạo file `.env` trong thư mục `e2e`:

```env
# Base URLs
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

# Test User Credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123456

# Options
HEADLESS=true
CI=false
```

## 🧪 Chạy Tests

### UI Tests

```bash
# Chạy tất cả UI tests (headless)
npm test

# Chạy với browser UI (headed mode)
npm run test:headed

# Mở Playwright UI
npm run test:ui

# Chạy trên mobile
npm run test:mobile

# Chạy trên tất cả browsers
npm run test:all-browsers
```

### API Tests

```bash
# Chạy API tests
npm run test:api
```

### Test theo tags

```bash
# Smoke tests (quick sanity check)
npm run test:smoke

# Regression tests (full suite)
npm run test:regression

# Chạy tests với tag cụ thể
npx playwright test --grep @smoke
npx playwright test --grep @api
npx playwright test --grep @regression
```

### Chạy test cụ thể

```bash
# Chạy một file test
npx playwright test tests/ui/auth/login.spec.ts

# Chạy tests trong folder
npx playwright test tests/ui/auth/

# Chạy test với tên cụ thể
npx playwright test -g "should login successfully"
```

### Debug

```bash
# Debug mode
npx playwright test --debug

# Xem test report
npx playwright show-report
```

## 📝 Viết Test mới

### 1. Tạo Page Object (nếu cần)

```typescript
// pages/NewPage.ts
import { BasePage } from './BasePage';

export class NewPage extends BasePage {
  readonly url = '/new-page';
  
  // Locators
  readonly someElement = this.page.locator('#element-id');
  
  // Actions
  async doSomething(): Promise<void> {
    await this.someElement.click();
  }
}
```

### 2. Thêm vào fixtures

```typescript
// fixtures/test-fixtures.ts
import { NewPage } from '../pages';

export interface TestFixtures {
  // ... existing
  newPage: NewPage;
}

export const test = base.extend<TestFixtures>({
  // ... existing
  newPage: async ({ page }, use) => {
    await use(new NewPage(page));
  },
});
```

### 3. Viết Test

```typescript
// tests/ui/new-feature/new.spec.ts
import { test, expect } from '../../fixtures';

test.describe('New Feature @smoke', () => {
  test('should work correctly', async ({ newPage }) => {
    await newPage.goto();
    await newPage.doSomething();
    await expect(newPage.someElement).toBeVisible();
  });
});
```

## 🏷️ Tags

- `@smoke` - Quick sanity tests, chạy trước mỗi deploy
- `@regression` - Full regression suite
- `@api` - API tests only
- `@mobile` - Mobile-specific tests

## 📊 Reports

Sau khi chạy tests, reports sẽ được tạo trong:

- `playwright-report/` - HTML report
- `test-results/` - Test artifacts (screenshots, videos)

Xem report:
```bash
npx playwright show-report
```

## 🔧 Troubleshooting

### Lỗi timeout
- Tăng timeout trong `playwright.config.ts`
- Kiểm tra servers đang chạy

### Lỗi không tìm thấy element
- Kiểm tra selectors trong Page Objects
- Thêm wait states

### Lỗi authentication
- Kiểm tra `TEST_USER_EMAIL` và `TEST_USER_PASSWORD` trong `.env`
- Đảm bảo user tồn tại trong database

## 🤝 Best Practices

1. **Luôn dùng Page Objects** - Không hardcode selectors trong tests
2. **Independent tests** - Mỗi test có thể chạy độc lập
3. **Meaningful assertions** - Test đúng behavior, không test implementation
4. **Clean up** - Dọn dẹp test data sau khi test
5. **Tags** - Sử dụng tags để phân loại tests
6. **Parallel safe** - Tests phải chạy được parallel

## 📚 Tài liệu tham khảo

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
