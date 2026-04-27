const SITE_URL = 'https://aqarobhur.com';
const SITE_NAME = 'عقار أبحر';
const DEFAULT_IMAGE = '/logo.png';

export default function ListingLayout({ children }) {
  return children;
}

export async function generateMetadata({ params }) {
  const rawId = params?.id ? String(params.id) : '';
  const id = safeDecode(rawId);
  const item = await fetchListingMeta(id);

  const url = `${SITE_URL}/listing/${encodeURIComponent(id)}`;

  if (!item) {
    return {
      title: `${SITE_NAME} | عرض عقاري`,
      description: 'عروض عقارية في أبحر الشمالية وشمال جدة.',
      alternates: { canonical: url },
      openGraph: {
        title: `${SITE_NAME} | عرض عقاري`,
        description: 'عروض عقارية في أبحر الشمالية وشمال جدة.',
        url,
        siteName: SITE_NAME,
        type: 'website',
        images: [{ url: toAbsoluteUrl(DEFAULT_IMAGE), width: 1200, height: 630, alt: SITE_NAME }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${SITE_NAME} | عرض عقاري`,
        description: 'عروض عقارية في أبحر الشمالية وشمال جدة.',
        images: [toAbsoluteUrl(DEFAULT_IMAGE)],
      },
    };
  }

  const title = buildTitle(item);
  const description = buildDescription(item);
  const image = getPrimaryImage(item) || DEFAULT_IMAGE;
  const imageUrl = toAbsoluteUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: 'article',
      locale: 'ar_SA',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
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
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in value) {
    return firestoreFieldsToObject(value.mapValue.fields || {});
  }
  return null;
}

function buildTitle(item = {}) {
  const explicit = clean(item.title);
  if (explicit) return `${explicit} | ${SITE_NAME}`;

  const propertyType = clean(item.propertyType) || 'عقار';
  const deal = String(item.dealType || '').toLowerCase() === 'rent' ? 'للإيجار' : 'للبيع';
  const area = clean(item.neighborhood || item.plan);
  return `${propertyType} ${deal}${area ? ` في ${area}` : ''} | ${SITE_NAME}`;
}

function buildDescription(item = {}) {
  const parts = [];
  const propertyType = clean(item.propertyType);
  const deal = String(item.dealType || '').toLowerCase() === 'rent' ? 'للإيجار' : 'للبيع';
  const area = clean(item.neighborhood || item.plan);
  const price = formatPrice(item.price);
  const size = item.area ? `${Number(item.area).toLocaleString('ar-SA')} م²` : '';

  if (propertyType) parts.push(`${propertyType} ${deal}`);
  if (area) parts.push(`في ${area}`);
  if (price) parts.push(`بسعر ${price}`);
  if (size) parts.push(`مساحة ${size}`);

  const intro = parts.join('، ');
  const desc = clean(item.description);
  const combined = [intro, desc].filter(Boolean).join('. ');

  return truncate(combined || 'عرض عقاري متاح عبر عقار أبحر في أبحر الشمالية وشمال جدة.', 180);
}

function getPrimaryImage(item = {}) {
  const candidates = [];

  if (Array.isArray(item.images)) candidates.push(...item.images);
  if (Array.isArray(item.imagesMeta)) {
    for (const entry of item.imagesMeta) {
      if (typeof entry === 'string') candidates.push(entry);
      else if (entry?.url) candidates.push(entry.url);
    }
  }

  candidates.push(item.image, item.imageUrl, item.cover, item.coverImage, item.thumbnail, item.photo);

  return candidates.map((v) => (typeof v === 'string' ? v.trim() : '')).find(Boolean) || '';
}

function toAbsoluteUrl(url = '') {
  const value = clean(url);
  if (!value) return `${SITE_URL}${DEFAULT_IMAGE}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
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
