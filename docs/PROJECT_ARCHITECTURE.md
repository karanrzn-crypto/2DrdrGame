# PROJECT_ARCHITECTURE.md — معماری پروژه

## تصمیم پشته فناوری (مستند مطابق §69 مستر-دایرکتیو)

1. **مسئله:** موتور ۲بعدی مرورگری برای دنیای باز سیستم‌محور، مقاوم روی سخت‌افزار ضعیف، قابل توسعهٔ چندفازی.
2. **ریشه:** مخزن خالی بود؛ انتخاب باید از فاز ۰ نهایی می‌شد.
3. **راه‌حل انتخابی:** Phaser 4.2.1 + TypeScript strict + Vite + Vitest.
4. **جایگزین‌ها:** (a) Canvas خام + TS — کنترل کامل ولی صرف زمان زیاد برای tilemap/کوادروت/صحنه‌ها؛ (b) Phaser 3 — API قدیمی‌تر و بدون TypeScript بومی؛ (c) JS بدون بیلد — بدون type safety.
5. **مبادله‌ها:** وابستگی ~۳۸۴KB gzip به Phaser؛ در عوض صرفهٔ چشمگیر در زمان و استحکام. WebGL الزامی نیست: پروب بوت (`src/boot/RendererProbe.ts`) در شروع، خروجی واقعی WebGL را با readPixels راستی‌آزمایی می‌کند و در صورت «کانتکست سالم اما رندر مرده» (سخت‌افزار/درایور محدود) خودکار به Canvas سوییچ می‌کند (بخش بوت در TESTING.md).
6. **سیستم‌های تحت‌تأثیر:** همه — همهٔ ماژول‌ها روی این پشته سوارند.
7. **تست:** بیلد پروداکشن + Vitest + راستی‌آزمایی مرورگر واقعی (docs/TESTING.md).

> Phaser 3 در فرم نظرخواهی بود اما طبق توضیح کاربر، نسخهٔ ۴.۲.۱ (آخرین پایدار) ارزیابی و انتخاب شد.

## ماژول‌ها و مسئولیت‌ها

```
main.ts                    نقطهٔ ورود؛ پروب رندرر + گارد بوت + چرخهٔ حیات AppLifecycle + هوک تست __coppergate (عمدی)
boot/RendererProbe.ts      خودآزمایی draw+readPixels برای WebGL/Canvas2D (خالص از Phaser)
boot/BootGuard.ts          پنل خطای فارسی + watchdog بوت (فلگ مشترک __cgReady)
config/GameValues.ts       ثابت‌های تنظیم حس بازی — خالص از Phaser (برای تستِ اعتبارسنجی)
config/validateConfig.ts   اعتبارسنجی خالص ثابت‌ها (assertValidGameConfig در BootScene)
config/GameConfig.ts       پیکربندی Phaser + گارد ورودی‌های بوت (صحنه/رندرر)
core/EventBus.ts           پیام‌رسانی بین صحنه‌ها — نسخهٔ سخت‌شدهٔ فاز ۲ (بدون Phaser)
core/GameState.ts          تک‌منبع حقیقت جان/پول — کپسوله + اعتبارسنجی ورودی (خالص، تست‌پذیر)
core/TimeSystem.ts         ساعت دنیا/فاز روز — سخت‌شده + wrap روز O(1) (خالص، تست‌پذیر)
core/SystemCoordinator.ts  مالک ثبت/ترتیب init/update/dispose سیستم‌های دنیا + مرز خطا (خالص)
core/AppLifecycle.ts       ماشین حالت فازهای بوت (idle→probing→booting→verifying→ready/failed/recovering) (خالص)
core/format.ts             اعداد فارسی
assets/TileIds.ts          شمارهٔ تایل‌ها + قاعدهٔ مانع (خالص)
assets/Palette.ts          پالت رنگ واحد کل بازی
assets/PixelPen.ts         ابزار ترسیم پیکسلی روی canvas texture
assets/TileFactory.ts      تایل‌شیت ۱۶تایی پروسیجرال
assets/CharFactory.ts      اسپرایت انسان پارامتری (بازیکن+NPC)، ۴ جهت × ۶ فریم
assets/PropFactory.ts      ساختمان‌ها/پروپ‌ها/آیکون‌ها + تعریف برخورد هرکدام
world/MapData.ts           authored نقشهٔ فاز ۱ + isWalkable (خالص، تست‌پذیر)
entities/Player.ts         کنترل بازیکن + ماشین حالت
entities/Npc.ts            NPC حداقلی: idle/wander
systems/InteractionSystem.ts  انتخاب نزدیک‌ترین تعامل (خالص)
scenes/BootScene.ts        اعتبارسنجی config (fail-fast) + تولید همهٔ textureها + انتظار فونت
scenes/WorldScene.ts       حلقهٔ شبیه‌سازی دنیا — از طریق SystemCoordinator (ترتیب صریح + مرز خطا)
scenes/UIScene.ts          HUD/پرومپت/دیالوگ/مکث/banner + cleanup کامل listenerها
ui/HUD.ts, ui/DialogueBox.ts   DialogueBox مالک listener خودش است (destroy())
data/Dialogues.ts          متن فارسی دیالوگ‌ها
```

## جریان رویداد (EventBus)

```
WorldScene ── INTERACT_PROMPT ──► UIScene (پرومپت)
WorldScene ── DIALOGUE_OPEN  ──► UIScene (بازکردن جعبه دیالوگ)
UIScene    ── DIALOGUE_CLOSE ──► WorldScene (آزادسازی بازیکن)
WorldScene ── PAUSE_STATE    ──► UIScene (overlay مکث)
UIScene    ── PAUSE_STATE    ──► WorldScene (resume)
```

## قواعد حاکم

- **تک‌منبع حقیقت:** جدول مالکیت در `AGENTS.md`.
- **حلقه:** Phaser Arcade `fixedStep: true` (۶۰Hz). دلتاهای دستی ≤ ۵۰ms. هیچ mutation گیم‌پلی در رندر.
- **زمان:** همه‌چیز از `TimeSystem` (دقیقهٔ دنیا؛ ۲ دقیقه بر ثانیه واقعی).
- **asset:** صفر دانلود؛ هر پیکسل از `Palette.ts`.
- **متن بازی:** فارسی؛ دیالوگ بدون اصطلاح مکانیکی (§45).

## تصمیمات معماری فاز ۲ (بنیان فنی)

### مرز خطا (Error Boundaries) — سیاست واحد
- **EventBus:** استثنای هر handler به «سینک استثنا» گزارش می‌شود (پیش‌فرض: `console.error` — قابل‌مشاهده، هرگز بی‌صدا)؛ بقیهٔ handlerهای همان رویداد همچنان اجرا می‌شوند؛ `emit` هرگز خطا را به فراخوان نمی‌رساند. emit بازگشتی هم‌زمان روی همان رویداد → `ReentrantEmitError` (جلوگیری از recursion بی‌نهایت)، از مسیر همان سینک گزارش می‌شود. معناشناسی snapshot: عضویت/لغو حین emit بر emit بعدی اثر دارد نه فعلی.
- **SystemCoordinator:** خطای update یک سیستم → سینک → بقیهٔ سیستم‌های همان فریم ادامه می‌دهند. اما خطای **init** برای کل بوت fail-fast است: سیستم‌های init‌شده به ترتیب معکوس dispose می‌شوند و خطا دوباره پرتاب می‌شود (نیمه‌راهِ مقداردهی ممنوع). dispose همیشه معکوس، idempotent و امن است.
- **قرارداد:** «خطای runtime ایزوله + قابل‌مشاهده»؛ «خطای lifecycle بلند و fail-fast».

### چرخهٔ حیات (Lifecycle)
- **AppLifecycle:** جدول انتقال صریح فازهای بوت؛ انتقال غیرمجاز = throw (ready/failed یک‌بارمصرف‌اند). main.ts هر گذار را از طریق این FSM ثبت می‌کند؛ `window.__coppergate.lifecycle` برای تست مرورگر در دسترس است (تأییدشده: `idle>probing>booting>verifying>ready` و مسیر retry کامل `verifying>recovering>booting>verifying>ready`).
- **SystemCoordinator در WorldScene:** ترتیب صریح clock(10) → player(20) → npcs(30) → atmosphere(40)؛ atmosphere همیشه فازِ پیش‌رفتهٔ ساعت را می‌بیند. InteractionSystem عمداً بیرون coordinator است چون مقدار برگشتی آن منطق پرومپت/کلید E را هدایت می‌کند (سیستمِ fire-and-forget نیست).
- **تخریب:** shutdown صحنهٔ World → disposeAll معکوس + حذف `timeSys` از registry (خواندن بعدی HUD با گارد undefined صادقانه افت می‌کند). UIScene → `DialogueBox.destroy()` در cleanups (نشتی listener مستند KNOWN_ISSUES رفع شد).

### مالکیت state
- فیلدهای `GameState` از فاز ۲ **private**اند؛ تنها مسیر mutation همان متدهای گارددار است — قاعدهٔ «فقط یک مالک» حالا در سطح type اجرا می‌شود نه سنت. پول صحیح است (کسری/NaN/∞ رد می‌شود)؛ جان همیشه در [0, maxHealth].
- ورودی‌های شبیه‌سازی اعتبارسنجی می‌شوند: `TimeSystem.advance` مقدار غیرمتناهی/منفی را نادیده می‌گیرد؛ سازندهٔ آن روی سرعت نامعتبر TypeError می‌دهد؛ wrap روز O(1) است (delta غول‌پیکر ≠ حلقهٔ هزارتایی).

### اعتبارسنجی پیکربندی
- ثابت‌ها در `GameValues.ts` خالص‌اند تا تست، خودِ شیء `GAME` واقعی را اعتبارسنجی کند (نه یک کپیِ رونویسی‌شونده).
- `BootScene.create` با `assertValidGameConfig(GAME)` قبل از هر تولید texture fail-fast می‌کند؛ `createGameConfig` ورودی‌های بوت (صحنه خالی/رندرر ناشناخته) را با خطای شفاف رد می‌کند.

## درس‌های فاز ۱ (برای ایجنت بعدی)

- Canvas texture → ثبت فریم‌های شماره‌دار الزامی است (CharFactory).
- keyup در Phaser 4 پرچم JustDown را می‌شوید → تست‌ها زمان‌بندی انسانی؛ کلیدهای دوصحنه‌ای با گارد «فریم قبل».
- preserveDrawingBuffer برای اسکرین‌شات تست لازم است (هزینهٔ FPS ناچیز؛ در فاز ۱۰ دوباره سنجیده می‌شود).
- **بوت دو لایه گارد دارد:** گارد زودهنگام inline در index.html خطاهای module-evaluation را می‌گیرد (قبل از اجرای bundle)، BootGuard.ts خطاهای بعد از bundle و توقف بوت را. فلگ واحد `window.__cgReady` بین این دو مشترک است — هر گارد جدید باید همان فلگ را بخواند.
- **Phaser فقط وقتی از WebGL به Canvas می‌رود که getContext برابر null باشد**؛ «کانتکست موجود اما بی‌خروجی» را نمی‌بیند — پروب بوت این خلأ را پر می‌کند (ریشهٔ باگ انتشار فاز ۱؛ KNOWN_ISSUES.md #4).
