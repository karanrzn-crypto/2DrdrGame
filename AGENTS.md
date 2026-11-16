# AGENTS.md — پایگاه دانش برای ایجنت‌های توسعه‌دهنده

این فایل باید به هر ایجنت/توسعه‌دهنده‌ای که پروژه را ادامه می‌دهد بگوید «چه بایست و چه نرست». قبل از هر تغییر، این فایل و `docs/PROJECT_ARCHITECTURE.md` را بخوان.

## هویت پروژه

- نام: **Coppergate (دروازهٔ مسی)** — بازی ۲بعدی وسترن دنیای باز، مرورگری، اورجینال.
- مخزن: `karanrzn-crypto/2DrdrGame` — شاخهٔ اصلی `main`، انتشار با شاخهٔ `gh-pages`.
- زبان گزارش به کاربر: **فارسی**. نام‌های فنی/فایل/دستورات: انگلیسی.
- زبان متن‌های داخل بازی: **فارسی** (نام‌های مکان‌ها در دیالوگ به فارسی ترجمه می‌شوند: کاپرگیت، راست‌واتر؛ نام لاتین فقط در banner برند و تابلوی COPPERGATE).
- سبک هنری: پیکسل‌آرت پروسیجرال از `src/assets/Palette.ts` — **هرگز رنگ hard-code نکن**.

## دستورهای پروژه

```bash
npm install          # نصب
npm run dev          # توسعه روی :5173
npm test             # Vitest — باید قبل از هر push سبز باشد
npm run build        # tsc + vite build → dist/  (باید بدون خطا باشد)
npm run preview      # تست بیلد روی :4173
```

## قواعد غیرقابل‌مذاکره (خلاصهٔ مستر-دایرکتیو)

1. از صفر ساخته شده — ممنوع: واردکردن کد پروژه‌های قدیمی، کپی asset تجاری، force-push، کامیت توکن/secret.
2. هر state مهم فقط **یک مالک** دارد: `GameState` (جان/پول)، `TimeSystem` (زمان دنیا). رندر هرگز state گیم‌پلی ندارد.
3. شبیه‌سازی به فریم‌ریت وابسته نیست: Arcade `fixedStep: true`، delta clamp ≤ 50ms در کدهای دستی.
4. ماژول‌ها ≤ ~800 خط؛ تفکیک بر اساس مسئولیت، نه تعداد خط.
5. قبل از بهینه‌سازی، اندازه‌گیری (`g.loop.actualFps`، شمارش entity).
6. ادعای «در مرورگر تست شد» فقط با مدرک (اسکرین‌شات/لاگ)؛ روند در `docs/TESTING.md`.
7. هر سیستم بعد از پیاده‌سازی باید در `docs/DEVELOPMENT_ROADMAP.md` وضعیت واقعی بگیرد: Planned / In progress / Implemented / Tested / Verified-in-browser / Complete.

## چگونه تست کنیم (شامل محیط headless)

- تست واحد: فقط ماژول‌های خالص (بدون import Phaser): `src/core/*`, `src/systems/InteractionSystem.ts`, `src/world/MapData.ts`, `src/assets/TileIds.ts`.
- مرورگر: `npm run build && npm run preview` سپس agent-browser روی `http://localhost:4173`.
  - در این محیط، اسکرین‌شات صفحهٔ `agent-browser` برای WebGL سیاه می‌شود؛ از هوک `window.__coppergate` (عمدی و مستند در `main.ts`) + `canvas.toDataURL()` برای شواهد بصری استفاده کن. **این هوک را حذف نکن؛ secret هم ندارد.**
  - کلیدهای مصنوعی باید زمان‌بندی انسانی داشته باشند: `keydown` → صبر ≥ یک فریم → `keyup`. (در Phaser 4، keyup پرچم `_justDown` را صفر می‌کند — برخلاف Phaser 3.)
- اسکرین‌شات‌های مرجع در `docs/screenshots/`.

## دام‌های شناخته‌شده (دوباره گیر نیا)

1. `textures.createCanvas` فقط فریم `__BASE` می‌سازد؛ برای انیمیشن باید فریم‌های شماره‌دار را با `tex.add(name, 0, x, y, w, h)` ثبت کنی — در `CharFactory.buildCharSheet` انجام شده.
2. متن ترکیبی فارسی/لاتین در canvas ترتیب bidi را به‌هم می‌ریزد → در دیالوگ‌ها از معادل فارسی استفاده کن.
3. کلید Esc در دو صحنه است (World: شروع مکث، UI: پایان) — resume فقط وقتی مجاز است که overlay از **فریم قبل** نمایان بوده باشد (`pauseWasVisiblePrevFrame`). همین الگو برای هر کلیدی که دو صحنه می‌شنود لازم است.
4. `staticImage` برای برخورد پروپ‌ها استفاده نکن؛ مستطیل نامرئی + `physics.add.existing(box, true)` ساده‌تر و دقیق‌تر است.
5. مبدأ اسپرایت‌های کاراکتر `(0.5, 1)` است (پایین‌وسط)؛ body پا `setSize(10,7) + setOffset(3,15)`.

## مالکیت state (مرجع سریع)

| داده | مالک | خواننده‌ها |
|---|---|---|
| health, money | `GameState.game` | HUD |
| زمان دنیا/فاز روز | `TimeSystem` (ساخته‌شده در WorldScene، از طریق registry) | WorldScene, HUD |
| تعامل جاری | `InteractionSystem.currentId` | WorldScene |
| باز/بسته بودن دیالوگ و مکث | EventBus events | World ↔ UI |

## قراردادهای ذخیره‌سازی (برای فاز ۸)

- Save نسخه‌دار با فیلد `version`؛ فقط state معتبر (بدون رفرنس‌های runtime).
- مقادیر جدید با مقدار پیش‌فرض load شوند؛ دادهٔ خراب → پیام شفاف، نه crash.
- تا آن زمان `GameState` فقط in-memory است — به localStorage در فازهای ≤۷ اعتماد نکن.

## وضعیت فعلی (پس از فاز ۱)

- پیاده‌سازی‌شده و تأییدشده در مرورگر: حرکت/دویدن/برخورد/دوربین/تعامل/دیالوگ/مکث/ساعت روز-شب/HUD/پیکسل‌آرت پروسیجرال/تست واحد.
- بعدی: فاز ۲ (شهر کامل با مغازه‌های واقعی) طبق `docs/DEVELOPMENT_ROADMAP.md`.
