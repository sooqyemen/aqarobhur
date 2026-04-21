import { fetchListings } from '@/lib/listings';
import { NEIGHBORHOODS } from '@/lib/taxonomy';

export default async function sitemap() {
  const baseUrl = 'https://aqarobhur.com'; // 
  // 1. الصفحات الثابتة (Static Routes)
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
    priority: route === '' ? 1.0 : 0.8, // الصفحة الرئيسية لها الأولوية القصوى
  }));

  // 2. صفحات الإعلانات الديناميكية (Dynamic Listing Pages)
  // جلب كافة العقارات المتاحة من Firestore
  let listingRoutes = [];
  try {
    const listings = await fetchListings({ onlyPublic: true, max: 1000 });
    listingRoutes = listings.map((item) => ({
      url: `${baseUrl}/listing/${item.id || item.docId}`,
      lastModified: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Error fetching listings for sitemap:', error);
  }

  // 3. صفحات الأحياء (Neighborhood Pages)
  const neighborhoodRoutes = NEIGHBORHOODS.map((name) => ({
    url: `${baseUrl}/listings?neighborhood=${encodeURIComponent(name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticRoutes, ...listingRoutes, ...neighborhoodRoutes];
}
