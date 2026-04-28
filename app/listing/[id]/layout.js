const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://aqarobhur.com').replace(/\/$/, '');
const SITE_NAME = 'عقار أبحر';
const DEFAULT_IMAGE = '/logo.png';

export const revalidate = 300;

export default function ListingLayout({ children }) {
  return children;
}

export async function generateMetadata({ params }) {
  const resolvedParams = await resolveParams(params);
  const rawId = resolvedParams?.id ? String(resolvedParams.id) : '';
  const id = safeDecode(rawId);
  const url = `${SITE_URL}/listing/${encodeURIComponent(id)}`;

  const fallbackTitle = `${SITE_NAME} | عرض عقاري`;
  const fallbackDescription = 'عروض عقارية في أبحر الشمالية وشمال جدة.';
  const fallbackImage = toAbsoluteUrl(DEFAULT_IMAGE);

  try {
    const item = await fetchListingMeta(id);

    if (!item) {
      return buildMetadata({
        title: fallbackTitle,
        description: fallbackDescription,
        url,
        imageUrl: fallbackImage,
        type: 'website',
      });
    }

    const title = buildTitle(item);
    const description = buildDescription(item);
    const image = getPrimaryImage(item) || DEFAULT_IMAGE;
    const imageUrl = toAbsoluteUrl(image);

    return buildMetadata({
      title,
      description,
      url,
      imageUrl,
      type: 'article',
    });
  } catch (error) {
    console.error('[Listing metadata] failed:', error?.message || error);
    return buildMetadata({
      title: fallbackTitle,
      description: fallbackDescription,
      url,
      imageUrl: fallbackImage,
      type: 'website',
    });
  }
}

async function resolveParams(params) {
  if (!params) return {};
  if (typeof params.then === 'function') return await params;
  return params;
}

function buildMetadata({ title, description, url, imageUrl, type = 'website' }) {
  const cleanTitle = truncate(title, 95);
  const cleanDescription = truncate(description, 220);
  const cleanImage = toAbsoluteUrl(imageUrl);

  return {
    title: cleanTitle,
    description: cleanDescription,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: cleanTitle,
      description: cleanDescription,
      url,
      siteName: SITE_NAME,
      type,
      locale: 'ar_SA',
      images: [
        {
          url: cleanImage,
          secureUrl: cleanImage,
          width: 1200,
          height: 630,
          alt: cleanTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description: cleanDescription,
      images: [cleanImage],
    },
    other: {
      'og:image:secure_url': cleanImage,
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:locale': 'ar_SA',
    },
  };
}

async function fetchListingMeta(id) {
  if (!id) return null;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId) return null;

  const collections = ['abhur_listings', 'listings'];

  for (const col of collections) {
    const byDoc = await fetchFirestoreDoc(projectId, col, id);
    if (byDoc) return byDoc;
  }

  return null;
}

async function fetchFirestoreDoc(projectId, collectionName, docId) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return firestoreFieldsToObject(json?.fields || {}, docId);
  } catch (_) {
    return null;
  }
}

function firestoreFieldsToObject(fields = {}, id = '') {
  const out = { id };
  for (const [key, value] of Object.entries(fields || {})) {
    out[key] = fromFirestoreValue(value);
  }
  return out;
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in value) return firestoreFieldsToObject(value.mapValue.fields || {});
  return null;
}

function buildTitle(item = {}) {
  const explicit = clean(item.title);
  const propertyType = clean(item.propertyType) || 'عقار';
  const deal = String(item.dealType || '').toLowerCase() === 'rent' ? 'للإيجار' : 'للبيع';
  const area = clean(item.neighborhood || item.plan);
  const size = item.area ? `${Number(item.area).toLocaleString('ar-SA')} م²` : '';

  if (explicit) {
    return [explicit, deal, size, area, SITE_NAME].filter(Boolean).join(' | ');
  }

  return [`${propertyType} ${deal}`, size, area ? `في ${area}` : '', SITE_NAME].filter(Boolean).join(' | ');
}

function buildDescription(item = {}) {
  const parts = [];
  const propertyType = clean(item.propertyType);
  const deal = String(item.dealType || '').toLowerCase() === 'rent' ? 'للإيجار' : 'للبيع';
  const area = clean(item.neighborhood || item.plan);
  const price = formatPrice(item.price);
  const size = item.area ? `${Number(item.area).toLocaleString('ar-SA')} م²` : '';
  const license = clean(item.licenseNumber || item.license || item.adLicenseNumber);

  if (propertyType) parts.push(`${propertyType} ${deal}`);
  if (area) parts.push(`في ${area}`);
  if (price) parts.push(`السعر ${price}`);
  if (size) parts.push(`المساحة ${size}`);
  if (license) parts.push(`ترخيص الإعلان ${license}`);

  const intro = parts.join('، ');
  const desc = clean(item.description);
  const combined = [intro, desc].filter(Boolean).join('. ');

  return truncate(combined || 'عرض عقاري متاح عبر عقار أبحر في أبحر الشمالية وشمال جدة.', 220);
}

function getPrimaryImage(item = {}) {
  const candidates = [];

  if (Array.isArray(item.imagesMeta)) {
    for (const entry of item.imagesMeta) {
      if (typeof entry === 'string') candidates.push(entry);
      else if (entry?.kind !== 'video' && entry?.url) candidates.push(entry.url);
    }
  }

  if (Array.isArray(item.images)) candidates.push(...item.images);
  if (Array.isArray(item.media)) {
    for (const entry of item.media) {
      if (typeof entry === 'string') candidates.push(entry);
      else if (entry?.kind !== 'video' && entry?.url) candidates.push(entry.url);
    }
  }

  candidates.push(item.image, item.imageUrl, item.cover, item.coverImage, item.thumbnail, item.photo);

  return candidates
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find((value) => value && !value.toLowerCase().includes('.mp4') && !value.toLowerCase().includes('.mov')) || '';
}

function toAbsoluteUrl(url = '') {
  const value = clean(url);
  if (!value) return `${SITE_URL}${DEFAULT_IMAGE}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return `${num.toLocaleString('ar-SA')} ريال`;
}

function clean(value) {
  return String(value || '').trim();
}

function truncate(text, max) {
  const value = clean(text).replace(/\s+/g, ' ');
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}
