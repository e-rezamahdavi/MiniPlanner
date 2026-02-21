# Mini Planner Mega (v3)

`Mini Planner Mega` یک برنامه‌ریز چندتب (Week / Goals / Habits / Focus / Analytics) با HTML/CSS/JS خالص است که local-first کار می‌کند و برای GitHub Pages آماده است.

## ویژگی‌های اصلی
- جدول هفتگی نیم‌ساعته واقعی (گام 30 دقیقه)
- بازه زمانی پویا:
  - از اولین رویداد تا آخرین رویداد (در داده فیلتر شده)
  - اگر فیلتر خالی بود از کل رویدادها
  - اگر رویدادی نبود: `08:00-20:00`
- حفظ فاصله خالی بین رویدادها (بدون فشرده‌سازی)
- نمایش هدف مرتبط داخل سلول رویداد (badge)
- فیلتر همگام عنوان/روز/دسته
- CRUD کامل برای:
  - رویدادها
  - هدف‌ها
  - عادت‌ها + لاگ روزانه
  - جلسات تمرکز
- تحلیل‌های پایه:
  - KPIها
  - نمودار SVG بدون وابستگی خارجی
- تم دوحالته:
  - `dark-clean`
  - `light-minimal`
- چندزبانه:
  - `fa` (پیش‌فرض)
  - `en`
  - `az`
  - `tr`
- چاپ PDF سه‌حالته:
  - `table-only`
  - `list-only`
  - `table-and-list`
- چاپ A4 landscape با جدول تمام‌عرض و رنگ چاپی روشن (حتی در تم تیره)
- خروجی/ورودی:
  - JSON کامل state v3
  - CSV برای Week / Goals / Habits / Focus
  - TXT برای لیست رویدادهای Week

## ساختار پروژه
- `index.html`
- `assets/css/main.css`
- `assets/js/app.js`
- `assets/js/data.js`
- `assets/js/storage.js`
- `assets/js/i18n.js`
- `assets/js/ui.js`
- `assets/js/exporters.js`
- `assets/js/analytics.js`
- `assets/js/charts.js`
- `assets/js/tabs/week.js`
- `assets/js/tabs/goals.js`
- `assets/js/tabs/habits.js`
- `assets/js/tabs/focus.js`
- `assets/js/tabs/analytics.js`
- `.github/workflows/deploy-pages.yml`

## مدل داده و Storage
State اصلی:
- `PlannerStateV3 = { version, events, categories, goals, habits, habitLogs, focusSessions, settings }`

کلیدهای localStorage:
- `mini_planner.v3.state`
- `mini_planner.v3.migrated`

تنظیمات:
- `lang`, `theme`, `printMode`, `weekStart`, `activeTab`, `widgets`, `focusRuntime`

## Migration
در اولین اجرا اگر v3 موجود نباشد:
1. تلاش برای migration از v2
2. اگر v2 نبود، migration از v1
3. اگر داده‌ای نبود، state پیش‌فرض v3 ساخته می‌شود

نکته: در migration از v1 فقط رویدادهای `type === "class"` نگه داشته می‌شوند.

## رفتار ذخیره‌سازی روی GitHub Pages
این پروژه cloud/account ندارد و local-first است:
- هر کاربر اطلاعات خودش را در مرورگر خودش ذخیره می‌کند.
- داده بین دستگاه‌ها خودکار sync نمی‌شود.
- برای جابه‌جایی داده بین دستگاه‌ها از JSON Export/Import استفاده کنید.

## اجرای محلی
کافی است `index.html` را در مرورگر باز کنید.

## انتشار روی GitHub Pages
Workflow آماده است: `.github/workflows/deploy-pages.yml`

مراحل:
1. کد را روی branch `main` push کنید.
2. در GitHub به `Settings > Pages` بروید.
3. Source را روی `GitHub Actions` بگذارید.
4. با هر push روی `main`، نسخه جدید منتشر می‌شود.
