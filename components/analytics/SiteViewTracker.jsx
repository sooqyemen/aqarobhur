'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

const SKIPPED_PREFIXES = [
  '/admin',
  '/add',
  '/login',
  '/api',
];

function shouldSkipPath(pathname) {
  const path = String(pathname || '/');
  return SKIPPED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function getStorageNumber(key) {
  try {
    return Number(sessionStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}

function setStorageValue(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {}
}

export default function SiteViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || shouldSkipPath(pathname)) return;
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const search = window.location.search || '';
    const fullPath = `${pathname}${search}`;
    const pathKey = `abhur_page_view_${encodeURIComponent(fullPath)}`;
    const visitKey = 'abhur_current_visit';
    const cooldownMs = 10 * 60 * 1000;

    const lastTrackedAt = getStorageNumber(pathKey);
    if (lastTrackedAt && now - lastTrackedAt < cooldownMs) return;

    const hadVisit = !!getStorageNumber(visitKey);
    const isNewVisit = !hadVisit;

    setStorageValue(pathKey, now);
    if (isNewVisit) setStorageValue(visitKey, now);

    trackPageView({
      path: fullPath,
      title: document.title || '',
      referrer: document.referrer || '',
      isNewVisit,
    }).catch((error) => {
      console.warn('[Analytics] tracking failed:', error?.message || error);
    });
  }, [pathname]);

  return null;
}
