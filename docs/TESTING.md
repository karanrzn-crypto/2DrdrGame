# TESTING.md — تست و راستی‌آزمایی

## تست واحد (Vitest، بدون مرورگر)

```bash
npm test   # ۲۸ تست، همه سبز
```

| فایل | پوشش |
|---|---|
| `tests/time.test.ts` | ساعت دنیا: نرخ پیشروی، wrap روز، مرزهای فاز، فرمت فارسی، visual config |
| `tests/gamestate.test.ts` | پول (منفی/ناکافی)، clamp جان/درمان، مرگ |
| `tests/mapdata.test.ts` | ابعاد، ایندکس‌های معتبر، انطباق مانع با COLLIDER_TILES، مهر مرز دنیا، walkable بودن spawn ها، گاز سیکارا، برکه، تابلوها، عدم هم‌پوشانی پروپ روی مانع |
| `tests/interaction.test.ts` | انتخاب نزدیک‌ترین هدف، range شخصی، فاصله قطری، لیست خالی |

قاعده: فقط ماژول‌های خالص test می‌شوند (بدون import Phaser) — لیست در `AGENTS.md`.

## راستی‌آزمایی مرورگر واقعی (فاز ۱) — اجرا شد

محیط: Chrome headless + `npm run build` + `npm run preview` (:4173).
شواهد بصری: `docs/screenshots/*.png` — از باگ #7 به بعد **اسکرین‌شات واقعی صفحه** (بوم داخل viewport است)؛ در نسل‌های قبل از آن، از `canvas.toDataURL` بوم واقعی استفاده می‌شد. روش در AGENTS.md.

| سناریو | نتیجه | شاهد |
|---|---|---|
| بوت: textureهای پروسیجرال + انتظار فونت + دو صحنه فعال | ✅ | console: banner Phaser 4.2.1، صفر error |
| رندر دنیا (پیکسل مرکز بوم = رنگ جاده) | ✅ | readPixels = (184,156,114) |
| حرکت W (~۰.۹s) | ✅ | y: 400→343 ≈ ۶۸px/s |
| دویدن Shift+W (۱s) | ✅ | Δy≈۹۸px/s (شتاب‌دار تا ۱۱۲) |
| برخورد مرز صخره‌ای (۴s W) | ✅ | توقف دقیق: بدنهٔ پا y=32..39 مقابل صخره تا y=32 |
| پرومپت تعامل | ✅ | «E — گفتگو با مسافر» (فاصله ۹px) |
| باز شدن دیالوگ با E | ✅ | پنل + گویندهٔ «مسافر» + تایپ‌رایتر تدریجی (۴۵/۵۰) |
| پیشروی با Enter تا پایان | ✅ | lineIdx 0→1→2 → open:false |
| freeze/unfreeze بازیکن | ✅ | velocity=0 هنگام دیالوگ |
| مکث Esc | ✅ | worldActive:false + overlay:true |
| ادامهٔ مکث (ESC دوم) | ✅ | worldActive:true + overlay:false |
| شب (۲۱:۴۰) | ✅ | phase=night، overlay alpha=0.45، HUD «· شب» |
| FPS headless (SwiftShader) | ~۴۴-۵۸ | روی سخت‌افزار واقعی بالاتر است |

## کنسول نهایی

پس از رفع سه باگ واقعی (فریم‌های انیمیشن، تایپ‌رایتر، مکث هم‌فریمی): **صفر error، صفر warning**.
نکتهٔ بعد از باگ #4: در مسیر fallback، یک `console.warn` صادقانه با مشخصات GL عمداً ثبت می‌شود (مستند §54)؛ روی GPU سالم کنسول همچنان صفر هشدار است.

## ماتریس بوت (پس از باگ #4 در KNOWN_ISSUES) — اجرا شد، همه سبز

شبیه‌سازی‌ها با هوک `getContext` (بیلد پروداکشن :4181/:4182)؛ ارزیابی با `canvas.toDataURL` + کنسول:

| سناریو | مکانیزم | نتیجهٔ قابل‌مشاهده | وضعیت |
|---|---|---|---|
| GPU سالم | بدون شبیه‌سازی | choice=auto، WebGL، خروجی کامل (~۷۶KB)، صفر هشدار | ✅ |
| GPU مرده (کانتکست هست، رندر هیچ — علائم کاربر) | پروکسی: draw/clear بی‌اثر + readPixels صفر | choice=canvas، هشدار صادقانه با مشخصات GL، خروجی کامل (~۷۷KB)، حرکت بازیکن ✓ | ✅ |
| هیچ رندرری (webgl و 2d هر دو null) | stub: getContext → null | پنل خطای فارسی + راهنما + جزئیات فنی، loading پنهان | ✅ |
| bundle اجرا نشود (src → 404) | stub: bundle src خراب + انتظار ۱۳s | پنل «بازی بارگذاری نشد» بعد از ~۱۲s | ✅ |
| تست واحد تصمیم رندرر | tests/renderer.test.ts | ۴ حالت ماتریس | ✅ |

پس از رفع: خروجی GPU مرده از ۱۶,۴۲۶ کاراکتر (خالی) به ~۷۷,۲۷۴ (رندر کامل) رسید؛ FPS fallback روی SwiftShader ≈ ۵۷-۶۰.

## ماتریس بوت — نسخهٔ ۲ (پس از باگ #5 در KNOWN_ISSUES) — اجرا شد، همه سبز

سناریوی پنجم همان باگ گزارش کاربر بود: پروب پاس می‌شود ولی Phaser در لحظهٔ ساخت کانتکست خودش شکست می‌خورد (مثل کرش GPU-process بین پروب و بوت). شبیه‌سازی: سه فراخوان اول webgl موفق (Features در import + probeWebGL + describeGL)، از چهارمی به بعد null — بیلد پروداکشن :4183.

| سناریو | مکانیزم | نتیجهٔ قابل‌مشاهده | وضعیت |
|---|---|---|---|
| **WebGL از نظر پروب سالم ولی بوت WebGL خطای sync می‌دهد (گزارش کاربر)** | stub: webgl فقط ۳ بار اول موفق، بعدی null؛ 2d واقعی | قبل از رفع: پنل «خطا در راه‌اندازی بازی» + `Uncaught Error: WebGL unsupported` و هیچ retry. بعد از رفع: هشدار صادقانه در کنسول، Phaser v4.2.1 (Canvas) بوت می‌شود، World+UI فعال، خروجی کامل (~۷۵KB)، رنگ جاده (184,156,114)، حرکت با W ✓، صفر خطا، یک canvas در DOM | ✅ |
| GPU سالم (بدون تغییر) | بدون شبیه‌سازی | choice=auto، WebGL، صفر خطا | ✅ |
| GPU مرده (بدون تغییر) | همان پروکسی قبلی | choice=canvas از مسیر پروب، صفر خطا | ✅ |
| هیچ رندرری | getContext → null برای همه | Phaser در خود CanvasFeatures هنگام import خطا می‌دهد (بالادستی؛ باگ #5) → پنل inline گارد با متن واقعی خطا می‌ماند و دیگر با پیام عمومی watchdog ۱۲s بازنویسی نمی‌شود | ✅ (سطح قابل‌مشاهده) |
| تست واحد سیاست retry | tests/renderer.test.ts | ۴ حالت retryRenderer + ۴ حالت chooseRenderer | ✅ |

ابزار بازتولید آن نسل: `scripts/make_boot_scenario_fixtures.mjs` (نسل قبلی، در مخزن نبود) — جانشینِ در مخزن: `scripts/make_boot_fixture.mjs` (ماتریس نسخهٔ ۳).


## ماتریس بوت — نسخهٔ ۳ (پس از باگ #7 در KNOWN_ISSUES: بوت خارج از viewport) — اجرا شد، همه سبز

این نسخه دو چیز را به ارزیابی اضافه می‌کند: (۱) معیارِ «روی صفحه بودن» — بوم باید داخل viewport باشد (`canvasInViewport`)، نه فقط محتوا داشته باشد؛ (۲) اسکرین‌شاتِ واقعی صفحه به‌عنوان مدرک بصری (پس از کالیبراسیون باگ #7 معلوم شد این محیط محتوای بومِ داخل viewport را کامل ضبط می‌کند؛ تشخیص قبلیِ «برای WebGL سیاه است» ناشی از همین باگ بود).

| سناریو | مکانیزم | نتیجهٔ قابل‌مشاهده | وضعیت |
|---|---|---|---|
| GPU سالم + بوم روی صفحه (رفع #7) | بدون شبیه‌سازی، بیلد پروداکشن :4173 | parent=game، rect=[127,0,1026×577]، inViewport=true، ready=true، **اسکرین‌شات صفحه: دنیای کامل با بوتیِر، تابلوی COPPERGATE، HUD فارسی**، صفر خطا | ✅ |
| کانتکستِ بوت بین پروب و World بمیرد (contextdied) | fixture: کانتکست واقعی + `loseContext` در +۱۵۰ms (`scripts/make_boot_fixture.mjs`) | هشدار صادقانه «World scene is running but its canvas presents no visible output (visible 0/5184 ×۳)» → تخریب و بوت Canvas → ready=true، parent=game، روی صفحه، محتوا 5184/5184، صفر error | ✅ |
| GPU از نظر پروب سبز ولی پایپ‌لاین بی‌صدا مرده (deadpipeline) | fixture: پروکسی draw/clear بی‌اثر + readPixels صفر + expandos (همان اسکریپت) | همان مسیر: تشخیص بی‌خروجی → retry Canvas → بازی روی صفحه، صفر error | ✅ |
| حرکت بازیکن بعد از رفع | keydown مصنوعی `KeyW` (۱s) | y: 400→329 ≈ ۶۸px/s (سرعت پیاده‌روی) | ✅ |
| تست واحد دروازهٔ viewport | tests/visiblecheck.test.ts | `rectInViewport` شش حالت، از جمله امضای دقیق سایت منتشرشده [254,577,1026×577] | ✅ |

ابزار بازتولید: `scripts/make_boot_fixture.mjs` (این بار **در مخزن** کامیت شد؛ دو سناریو contextdied/deadpipeline روی کپی dist).

## پروسیجر تست هر فاز (الگوی تکرار)

1. `npm test` سبز → 2. `npm run build` بدون خطا → 3. `npm run preview` + agent-browser → 4. سناریوهای فاز در مرورگر واقعی → 5. اسکرین‌شات/لاگ به‌عنوان مدرک → 6. ثبت در این فایل و KNOWN_ISSUES.


## QA بازسازی بصری v3

- `scripts/qa_screens.cjs` — ۱۲ اسکرین‌شات از موقعیت‌ها/ساعت‌ها/آب‌وهواهای مختلف روی بیلد پروداکشن (Chromium headless + خواندن بوم).
- `scripts/gameplay_smoke.cjs` — ورودی واقعی کیبورد: حرکت، برخورد با آب، تعامل و دیالوگ، مکث/ادامه؛ همه PASS.
- `scripts/baseline_before.cjs` — اسکرین‌شات‌های «قبل» برای مقایسه؛ جدول مقایسه: `docs/screenshots/v3/comparison-before-after.png`.
- `tests/ground.test.ts` — قطعیت نویز و سازگاری نقشهٔ زمین/برخورد.
