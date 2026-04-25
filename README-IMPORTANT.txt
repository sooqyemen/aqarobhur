هذه الحزمة شاملة، لكنها مبنية على حفظ الأكواد الحالية كما هي، مع إضافة نظام المشاهدات فقط.

الملفات المعدلة بالكامل:
- app/layout.js
  الإضافة الوحيدة: استيراد SiteViewTracker ووضعه داخل body قبل Header.

- app/admin/page.js
  الإضافة الوحيدة: استيراد AnalyticsDashboardCard ووضعه داخل AdminShell فوق قسم الإحصائيات الحالي.
  لم يتم حذف قسم العروض، الطلبات، الوارد الذكي، أو الستايلات الموجودة.

- firebase/firestore.rules
  تم حفظ القواعد الحالية كما هي، وإضافة قواعد عدادات المشاهدات فقط.

الملفات الجديدة:
- lib/analytics.js
- components/analytics/SiteViewTracker.jsx
- components/admin/AnalyticsDashboardCard.jsx

مهم:
بعد رفع firebase/firestore.rules إلى GitHub، لازم تنشر قواعد Firestore من Firebase Console أو Firebase CLI.
Vercel لا ينشر قواعد Firestore تلقائياً.
