const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.ogg'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.svg', '.heic', '.heif'];

export const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_MAX_VIDEO_BYTES = 120 * 1024 * 1024;

function getNameLike(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value.name || value.url || value.src || '');
  return '';
}

function getTypeLike(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.type || value.mime || value.mimeType || value.contentType || value.kind || '').toLowerCase();
}

function normalizeMediaUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return '';

  url = url.replace(/\\/g, '/');

  const lower = url.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === '[object object]') return '';

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  const hasKnownScheme = /^[a-z][a-z0-9+.-]*:/i.test(url);
  const isDataUrl = lower.startsWith('data:image/') || lower.startsWith('data:video/');

  if (!hasKnownScheme && !url.startsWith('/') && !isDataUrl) {
    url = `/${url.replace(/^\.?\//, '')}`;
  }

  return url;
}

export function isUsableMediaUrl(raw) {
  const url = normalizeMediaUrl(raw);
  if (!url) return false;

  const lower = url.toLowerCase();

  if (
    lower.startsWith('blob:') ||
    lower.startsWith('gs:') ||
    lower.startsWith('file:') ||
    lower.startsWith('javascript:')
  ) {
    return false;
  }

  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('data:image/') ||
    lower.startsWith('data:video/')
  );
}

export function getMediaKind(value) {
  const type = getTypeLike(value);
  const lower = normalizeMediaUrl(getNameLike(value)).toLowerCase();

  if (type.startsWith('video/') || type === 'video') return 'video';
  if (type.startsWith('image/') || type === 'image') return 'image';
  if (VIDEO_EXTENSIONS.some((ext) => lower.includes(ext))) return 'video';
  if (IMAGE_EXTENSIONS.some((ext) => lower.includes(ext))) return 'image';
  return 'image';
}

export function isVideoLike(value) {
  return getMediaKind(value) === 'video';
}

export function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return '0 بايت';
  const units = ['بايت', 'KB', 'MB', 'GB'];
  let current = size;
  let idx = 0;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  const digits = current >= 10 || idx === 0 ? 0 : 1;
  return `${current.toFixed(digits)} ${units[idx]}`;
}

export function normalizeMediaEntry(entry, forcedKind = '') {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const url = normalizeMediaUrl(entry);
    if (!isUsableMediaUrl(url)) return null;
    const kind = forcedKind || getMediaKind(url);
    return { url, kind, refPath: '', name: '', size: null };
  }

  const url = normalizeMediaUrl(
    entry.url || entry.src || entry.href || entry.downloadURL || entry.secure_url || ''
  );
  if (!isUsableMediaUrl(url)) return null;

  const kind =
    forcedKind ||
    String(entry.kind || entry.mediaType || '').trim().toLowerCase() ||
    getMediaKind({ ...entry, url });

  return {
    url,
    kind: kind === 'video' ? 'video' : 'image',
    refPath: String(entry.refPath || entry.path || entry.storagePath || '').trim(),
    name: String(entry.name || entry.fileName || entry.filename || '').trim(),
    size: Number.isFinite(Number(entry.size)) ? Number(entry.size) : null,
  };
}

export function collectMediaEntries(item = {}) {
  const buckets = [
    ...(Array.isArray(item?.imagesMeta) ? item.imagesMeta : []),
    ...(Array.isArray(item?.mediaMeta) ? item.mediaMeta : []),
    ...(Array.isArray(item?.media) ? item.media : []),
    ...(Array.isArray(item?.gallery) ? item.gallery : []),
    ...(Array.isArray(item?.images) ? item.images.map((url) => ({ url, kind: 'image' })) : []),
    ...(Array.isArray(item?.videos) ? item.videos.map((url) => ({ url, kind: 'video' })) : []),
    ...(item?.image ? [{ url: item.image, kind: 'image' }] : []),
    ...(item?.video ? [{ url: item.video, kind: 'video' }] : []),
  ];

  const seenUrls = new Set();
  const seenRefs = new Set();
  const output = [];

  for (const entry of buckets) {
    const normalized = normalizeMediaEntry(entry);
    if (!normalized?.url) continue;

    const urlKey = normalized.url;
    const refKey = normalized.refPath || '';

    if (seenUrls.has(urlKey) || (refKey && seenRefs.has(refKey))) {
      continue;
    }

    seenUrls.add(urlKey);
    if (refKey) seenRefs.add(refKey);
    output.push(normalized);
  }

  return output;
}

export function getCoverMedia(item = {}) {
  const media = collectMediaEntries(item);
  const firstImage = media.find((entry) => entry.kind !== 'video');
  return firstImage || media[0] || null;
}

export function getMediaCount(item = {}) {
  return collectMediaEntries(item).length;
}

export function validateSelectedFiles(files = [], { maxFiles = 30, maxImageBytes = DEFAULT_MAX_IMAGE_BYTES, maxVideoBytes = DEFAULT_MAX_VIDEO_BYTES } = {}) {
  const source = Array.from(files || []);
  const accepted = [];
  const rejected = [];

  for (const file of source) {
    if (accepted.length >= maxFiles) {
      rejected.push({ file, reason: `الحد الأقصى ${maxFiles} ملف` });
      continue;
    }

    const kind = getMediaKind(file);
    const size = Number(file?.size || 0);
    if (kind === 'video') {
      if (size > maxVideoBytes) {
        rejected.push({ file, reason: `حجم الفيديو أكبر من ${formatFileSize(maxVideoBytes)}` });
        continue;
      }
      accepted.push(file);
      continue;
    }

    if (kind === 'image') {
      if (size > maxImageBytes) {
        rejected.push({ file, reason: `حجم الصورة أكبر من ${formatFileSize(maxImageBytes)}` });
        continue;
      }
      accepted.push(file);
      continue;
    }

    rejected.push({ file, reason: 'نوع الملف غير مدعوم' });
  }

  return { accepted, rejected };
}
