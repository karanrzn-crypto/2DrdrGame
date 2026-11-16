# PROJECT_ARCHITECTURE.md — معماری پروژه

## تصمیم پشته فناوری (مستند مطابق §69 مستر-دایرکتیو)

1. **مسئله:** موتور ۲بعدی مرورگری برای دنیای باز سیستم‌محور، مقاوم روی سخت‌افزار ضعیف، قابل توسعهٔ چندفازی.
2. **ریشه:** مخزن خالی بود؛ انتخاب باید از فاز ۰ نهایی می‌شد.
3. **راه‌حل انتخابی:** Phaser 4.2.1 + TypeScript strict + Vite + Vitest.
4. **جایگزین‌ها:** (a) Canvas خام + TS — کنترل کامل ولی صرف زمان زیاد برای tilemap/کوادروت/صحنه‌ها؛ (b) Phaser 3 — API قدیمی‌تر و بدون TypeScript بومی؛ (c) JS بدون بیلد — بدون type safety.
5. **مبادله‌ها:** وابستگی ~۳۸۴KB gzip به Phaser؛ در عوض صرفهٔ چشمگیر در زمان و استحکام. WebGL الزامی نیست (AUTO → Canvas fallback).
6. **سیستم‌های تحت‌تأثیر:** همه — همهٔ ماژول‌ها روی این پشته سوارند.
7. **تست:** بیلد پروداکشن + Vitest + راستی‌آزمایی مرورگر واقعی (docs/TESTING.md).

> Phaser 3 در فرم نظرخواهی بود اما طبق توضیح کاربر، نسخهٔ ۴.۲.۱ (آخرین پایدار) ارزیابی و انتخاب شد.

## ماژول‌ها و مسئولیت‌ها

```
main.ts                    نقطهٔ ورود؛ هوک تست __coppergate (عمدی)
config/GameConfig.ts       ثابت‌های تنظیم حس بازی + پیکربندی Phaser
core/EventBus.ts           پیام‌رسانی بین صحنه‌ها (بدون Phaser)
core/GameState.ts          تک‌منبع حقیقت جان/پول (خالص، تست‌پذیر)
core/TimeSystem.ts         ساعت دنیا/فاز روز (خالص، تست‌پذیر)
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
scenes/BootScene.ts        تولید همهٔ textureها + انتظار فونت
scenes/WorldScene.ts       حلقهٔ شبیه‌سازی دنیا (زمان/برخورد/تعامل/جو)
scenes/UIScene.ts          HUD/پرومپت/دیالوگ/مکث/banner
ui/HUD.ts, ui/DialogueBox.ts
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

## درس‌های فاز ۱ (برای ایجنت بعدی)

- Canvas texture → ثبت فریم‌های شماره‌دار الزامی است (CharFactory).
- keyup در Phaser 4 پرچم JustDown را می‌شوید → تست‌ها زمان‌بندی انسانی؛ کلیدهای دوصحنه‌ای با گارد «فریم قبل».
- preserveDrawingBuffer برای اسکرین‌شات تست لازم است (هزینهٔ FPS ناچیز؛ در فاز ۱۰ دوباره سنجیده می‌شود).
