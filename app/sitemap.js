import { fetchListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

// دالة مساعدة لتحويل تواريخ فايربيس إلى صيغة يقبلها Next.js
function getSafeDate(timestamp) {
  if (!timestamp) return new Date();
  
  // إذا كان كائن Timestamp من فايربيس
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (typeof timestamp.toMillis === 'function') return new Date(timestamp.toMillis());
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  
  // إذا كان نصاً أو رقماً عادياً
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap() {
  const baseUrl = 'https://aqarobhur.com';

  // 1. الصفحات الثابتة
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/listings',
    '/request',
    '/marketing-request',
    '/ejar-request',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. صفحات الإعلانات الديناميكية
  let listingRoutes = [];
  try {
    const listings = await fetchListings({ onlyPublic: true, max: 1000 });
    listingRoutes = listings.map((item) => ({
      url: `${baseUrl}/listing/${item.id || item.docId}`,
      // استخدام الدالة المساعدة لضمان صحة التاريخ
      lastModified: getSafeDate(item.updatedAt || item.createdAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error fetching listings for sitemap:', error);
  }

  // 3. صفحات الأحياء
  const neighborhoodRoutes = NEIGHBORHOODS.map((name) => ({
    url: `${baseUrl}/listings?neighborhood=${encodeURIComponent(name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
