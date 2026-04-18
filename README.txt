الملفات المعدلة لهذا الإصلاح:

1) lib/firebaseClient.js
- جعل Firebase آمنًا عند الاستدعاء من السيرفر حتى لا يحاول تهيئة auth/storage في route.js.

2) lib/listings.js
- إزالة use client من الملف المشترك.
- إصلاح حفظ الطلبات عبر createRequest.
- إصلاح حفظ الوسائط في الإعلانات بشكل صحيح (imagesMeta + images + videos).
- حفظ licenseNumber و contactPhone أثناء إنشاء الإعلان.
- مزامنة الوسائط عند التعديل.

3) firebase/storage.rules
- قواعد مقترحة لـ Firebase Storage حتى تعمل الصور والفيديوهات (بعد نشر القواعد في Firebase Console أو عبر Firebase CLI).

مهم:
- إذا كان رفع الصور/الفيديوهات ما زال لا يعمل بعد رفع الملفات، فالغالب أن السبب من قواعد Firebase Storage أو من قيمة NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET في Vercel/Firebase.
