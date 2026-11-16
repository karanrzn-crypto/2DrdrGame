/**
 * Dialogues.ts — Persian dialogue data (Phase 1: flavor + world building).
 * In-world text only; dialogues never explain game mechanics
 * (master directive §45).
 */
export interface DialogueEntry {
  name: string;
  lines: string[];
}

export const DIALOGUES: Record<string, DialogueEntry> = {
  pete: {
    name: 'پیت پیر',
    lines: [
      'سلام پسر… اسب‌های امروز بی‌قرارن. بوی توفان می‌آد.',
      'از وقتی شرکت سد رو بالای رودخونه بسته، Rustwater پایین دست چیزی نمی‌بینن جز گِلِ ترک‌خورده.',
      'این شهر هنوز خیلی چیزهای دست‌نیافتی داره، ولی اگه دنبال راهی، اول جادهٔ غربی رو یاد بگیر.',
    ],
  },
  traveler: {
    name: 'مسافر',
    lines: [
      'به کاپرگیت خوش اومدی، کلانتر.',
      'جاده از اینجا به سمت Badlands ادامه پیدا می‌کنه. شب‌های بی‌ماه اونجا حواست باشه؛ چیزهایی جابه‌جا می‌شن که باید تو تاریکی بمونن.',
      'می‌گن سنگ‌معدنِ دزدی از اون مسیر رد می‌شه… و یه نفر داخل شرکت راهش باز نگه می‌داره.',
    ],
  },
  saloonDoor: {
    name: 'در سالون',
    lines: [
      'سالون هنوز باز نشده؛ تا عصر بیا.',
      'از پشت در، صدای پیانوی کوک‌ناشده میاد…',
    ],
  },
  sign: {
    name: 'تابلوی راه',
    lines: [
      '«COPPERGATE — شهر مس»',
      'جمعیت: ۱۸۷ نفر… تقریباً.',
      'شرکت معدن مسِ تاج: مالکِ معدن، آب و نصفِ شب‌های این دره.',
    ],
  },
};
