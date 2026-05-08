'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const HOME_NEIGHBORHOODS = [
  'أبحر الشمالية', 'الفردوس', 'الشراع', 'الأمواج', 'الصواري', 'الياقوت', 'اللؤلؤ', 'الزمرد', 'المنارات', 'الفنار', 'البحيرات', 'النور', 'المروج', 'الخليج',
  'النجمة', 'الزهور', 'الغربية', 'الشويضي', 'الغدير', 'الربيع', 'الدرة', 'العبير', 'العقيق', 'المجامع', 'الفرقان', 'اليسر', 'الجزيرة',
  'الوداد', 'التوفيق', 'الندى', 'البيان', 'المجد', 'رضوى', 'البوادر', 'أم سدرة', 'العويجاء', 'الشرائع',
];

const REAL_FAQS = [
  'كيف أصدر ضريبة التصرفات العقارية؟',
  'كيف أعمل إفراغ عبر البورصة العقارية؟',
  'كيف أقبل عرض بيع في البورصة العقارية؟',
  'كيف أوثق عقد إيجار؟',
];

function addIcon(parent, name) {
  const icon = document.createElement('span');
  icon.className = 'material-icons-outlined';
  icon.textContent = name;
  parent.appendChild(icon);
}

function replaceNeighborhoodChips() {
  const scroller = document.querySelector('.premiumHome .chipsScroller');
  if (!scroller || scroller.dataset.fixedNeighborhoods === '1') return;

  scroller.replaceChildren();
  HOME_NEIGHBORHOODS.forEach((name) => {
    const link = document.createElement('a');
    link.className = 'neighborhoodChip';
    link.href = `/listings?neighborhood=${encodeURIComponent(name)}`;
    addIcon(link, 'park');
    link.appendChild(document.createTextNode(name));
    scroller.appendChild(link);
  });
  scroller.dataset.fixedNeighborhoods = '1';
}

function replaceNeighborhoodSelect() {
  const select = document.querySelector('.premiumHome .heroSearch select');
  if (!select || select.dataset.fixedNeighborhoods === '1') return;

  const currentValue = select.value;
  select.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'اختر الحي';
  select.appendChild(placeholder);
  HOME_NEIGHBORHOODS.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  });
  if (HOME_NEIGHBORHOODS.includes(currentValue)) select.value = currentValue;
  select.dataset.fixedNeighborhoods = '1';
}

function replaceFaqs() {
  const faqRow = document.querySelector('.premiumHome .faqRow');
  if (!faqRow || faqRow.dataset.fixedFaqs === '1') return;

  faqRow.replaceChildren();
  REAL_FAQS.forEach((question) => {
    const link = document.createElement('a');
    link.className = 'faqPill';
    link.href = '/faq';
    link.appendChild(document.createTextNode(question));
    addIcon(link, 'expand_more');
    faqRow.appendChild(link);
  });
  faqRow.dataset.fixedFaqs = '1';
}

function replaceMapPreview() {
  const map = document.querySelector('.premiumHome .mapMock');
  if (!map || map.dataset.realMap === '1') return;

  map.setAttribute('aria-hidden', 'false');
  map.replaceChildren();
  const iframe = document.createElement('iframe');
  iframe.title = 'خريطة عقارات أبحر الشمالية';
  iframe.src = 'https://www.google.com/maps?q=21.7628,39.0994&z=13&output=embed';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.style.border = '0';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.display = 'block';
  iframe.allowFullscreen = true;
  map.appendChild(iframe);
  map.dataset.realMap = '1';

  const paragraph = document.querySelector('.premiumHome .mapPreviewCard .miniHeading p');
  if (paragraph) paragraph.textContent = 'خريطة فعلية لأبحر الشمالية وشمال جدة. اضغط فتح الخريطة لعرض العقارات المتاحة.';
}

export default function HomeRuntimeFixes() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return undefined;

    const apply = () => {
      replaceNeighborhoodChips();
      replaceNeighborhoodSelect();
      replaceFaqs();
      replaceMapPreview();
    };

    apply();
    const timer = window.setTimeout(apply, 450);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
