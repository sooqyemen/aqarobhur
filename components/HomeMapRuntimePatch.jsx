'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function HomeMapRuntimePatch() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (pathname !== '/') return undefined;
    if (typeof document === 'undefined') return undefined;

    let disposed = false;

    function patchMapCard() {
      if (disposed) return;
      const oldMap = document.querySelector('.premiumHome .mapMock');
      if (!oldMap || oldMap.dataset.cleanMapReady === '1') return;

      const card = oldMap.closest('.mapPreviewCard');
      if (!card) return;

      oldMap.dataset.cleanMapReady = '1';
      oldMap.classList.add('cleanGoogleMapPreview');
      oldMap.setAttribute('aria-hidden', 'false');
      oldMap.innerHTML = `
        <a class="cleanGoogleMapLink" href="/map" aria-label="فتح الخريطة العقارية">
          <iframe
            title="خريطة أبحر الشمالية"
            src="https://www.google.com/maps?q=21.7628,39.0994&z=13&output=embed"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
          <span class="cleanGoogleMapOverlay">
            <strong>الخريطة العقارية</strong>
            <small>اضغط لعرض العقارات على الخريطة</small>
          </span>
        </a>
      `;
    }

    patchMapCard();
    const observer = new MutationObserver(patchMapCard);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
