// lib/areaCatalog.js

export const FULL_SERVICE_ABHUR_AREAS = [
  'أبحر الشمالية',
  'الصواري',
  'الفردوس',
  'الأمواج',
  'اللؤلؤ',
  'الزمرد',
  'الشراع',
  'الياقوت',
];

export const LAND_ONLY_NORTH_JEDDAH_PLANS = [
  'جوهرة العروس',
  'طيبة الفرعية',
  'الهجرة',
];

export const SPECIAL_PLAN_SEO_LINKS = [
  {
    label: 'شقق تمليك في مخطط الفال الصواري',
    neighborhood: 'الصواري',
    plan: 'مخطط الفال',
    propertyType: 'شقة',
    dealType: 'sale',
  },
  {
    label: 'شقق للبيع في مخطط الفال الصواري',
    neighborhood: 'الصواري',
    plan: 'مخطط الفال',
    propertyType: 'شقة',
    dealType: 'sale',
  },
  {
    label: 'شقق للإيجار في مخطط الفال الصواري',
    neighborhood: 'الصواري',
    plan: 'مخطط الفال',
    propertyType: 'شقة',
    dealType: 'rent',
  },
];

export const SAWARI_SEO_LINKS = [
  ...SPECIAL_PLAN_SEO_LINKS,
  {
    label: 'شقق للإيجار في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'شقة',
    dealType: 'rent',
  },
  {
    label: 'فلل للبيع في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'فيلا',
    dealType: 'sale',
  },
  {
    label: 'فلل للإيجار في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'فيلا',
    dealType: 'rent',
  },
  {
    label: 'أراضي للبيع في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'أرض',
    dealType: 'sale',
  },
  {
    label: 'أراضي سكنية للبيع في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'أرض',
    propertyClass: 'سكني',
    dealType: 'sale',
  },
  {
    label: 'أراضي تجارية للبيع في الصواري',
    neighborhood: 'الصواري',
    propertyType: 'أرض',
    propertyClass: 'تجاري',
    dealType: 'sale',
  },
  {
    label: 'عقارات للبيع في الصواري أبحر الشمالية',
    neighborhood: 'الصواري',
    dealType: 'sale',
  },
];

export const AREA_CATALOG = [
  ...FULL_SERVICE_ABHUR_AREAS.map((name) => ({
    name,
    kind: 'حي',
    group: 'أحياء أبحر الشمالية',
    marketStage: 'full_service',
    allowedPropertyTypes: ['أرض', 'فيلا', 'شقة', 'عمارة'],
    allowedLandClasses: ['سكني', 'تجاري'],
    allowedDealTypes: ['sale', 'rent'],
  })),

  ...LAND_ONLY_NORTH_JEDDAH_PLANS.map((name) => ({
    name,
    kind: 'مخطط',
    group: 'مخططات شمال جدة',
    marketStage: 'land_only',
    allowedPropertyTypes: ['أرض'],
    allowedLandClasses: ['سكني', 'تجاري'],
    allowedDealTypes: ['sale'],
  })),
];

export function buildListingsHref({
  neighborhood,
  plan,
  propertyType,
  propertyClass,
  dealType,
} = {}) {
  const params = new URLSearchParams();

  if (neighborhood) params.set('neighborhood', neighborhood);
  if (plan) params.set('plan', plan);
  if (propertyType) params.set('propertyType', propertyType);
  if (propertyClass) params.set('propertyClass', propertyClass);
  if (dealType) params.set('dealType', dealType);

  const query = params.toString();
  return query ? `/listings?${query}` : '/listings';
}

export function getAreaConfig(areaName) {
  const name = String(areaName || '').trim();
  if (!name) return null;
  return AREA_CATALOG.find((area) => area.name === name) || null;
}

export function isFullServiceAbhurArea(areaName) {
  return FULL_SERVICE_ABHUR_AREAS.includes(String(areaName || '').trim());
}

export function isLandOnlyPlan(areaName) {
  return LAND_ONLY_NORTH_JEDDAH_PLANS.includes(String(areaName || '').trim());
}

export function getAreaSeoLinks(areaName, limit = 10) {
  const name = String(areaName || '').trim();
  if (!name) return [];

  if (name === 'الصواري') {
    return SAWARI_SEO_LINKS.slice(0, limit).map((link) => ({
      ...link,
      href: buildListingsHref(link),
    }));
  }

  if (isLandOnlyPlan(name)) {
    const links = [
      {
        label: `أراضي للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      },
      {
        label: `أرض سكنية للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        propertyClass: 'سكني',
        dealType: 'sale',
      },
      {
        label: `أرض تجارية للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        propertyClass: 'تجاري',
        dealType: 'sale',
      },
      {
        label: `أراضي استثمارية في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      },
      {
        label: `مخطط ${name} شمال جدة`,
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      },
    ];

    return links.slice(0, limit).map((link) => ({
      ...link,
      href: buildListingsHref(link),
    }));
  }

  if (isFullServiceAbhurArea(name)) {
    const links = [
      {
        label: `عقارات للبيع في ${name}`,
        neighborhood: name,
        dealType: 'sale',
      },
      {
        label: `شقق للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'شقة',
        dealType: 'sale',
      },
      {
        label: `شقق للإيجار في ${name}`,
        neighborhood: name,
        propertyType: 'شقة',
        dealType: 'rent',
      },
      {
        label: `فلل للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'فيلا',
        dealType: 'sale',
      },
      {
        label: `فلل للإيجار في ${name}`,
        neighborhood: name,
        propertyType: 'فيلا',
        dealType: 'rent',
      },
      {
        label: `أراضي للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      },
      {
        label: `أراضي سكنية للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        propertyClass: 'سكني',
        dealType: 'sale',
      },
      {
        label: `أراضي تجارية للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        propertyClass: 'تجاري',
        dealType: 'sale',
      },
    ];

    return links.slice(0, limit).map((link) => ({
      ...link,
      href: buildListingsHref(link),
    }));
  }

  return [
    {
      label: `عقارات للبيع في ${name}`,
      neighborhood: name,
      dealType: 'sale',
      href: buildListingsHref({ neighborhood: name, dealType: 'sale' }),
    },
    {
      label: `أراضي للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      dealType: 'sale',
      href: buildListingsHref({
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      }),
    },
  ].slice(0, limit);
}

export function getFooterSeoGroups() {
  const abhurLinks = FULL_SERVICE_ABHUR_AREAS.flatMap((name) => {
    if (name === 'الصواري') {
      return SAWARI_SEO_LINKS.slice(0, 5);
    }

    return [
      {
        label: `عقارات للبيع في ${name}`,
        neighborhood: name,
        dealType: 'sale',
      },
      {
        label: `شقق للإيجار في ${name}`,
        neighborhood: name,
        propertyType: 'شقة',
        dealType: 'rent',
      },
      {
        label: `فلل للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'فيلا',
        dealType: 'sale',
      },
      {
        label: `أراضي للبيع في ${name}`,
        neighborhood: name,
        propertyType: 'أرض',
        dealType: 'sale',
      },
    ];
  });

  const landOnlyLinks = LAND_ONLY_NORTH_JEDDAH_PLANS.flatMap((name) => [
    {
      label: `أراضي للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      dealType: 'sale',
    },
    {
      label: `أرض سكنية للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      propertyClass: 'سكني',
      dealType: 'sale',
    },
    {
      label: `أرض تجارية للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      propertyClass: 'تجاري',
      dealType: 'sale',
    },
  ]);

  const villasAndApartmentsLinks = [
    ...FULL_SERVICE_ABHUR_AREAS.map((name) => ({
      label: `شقق للإيجار في ${name}`,
      neighborhood: name,
      propertyType: 'شقة',
      dealType: 'rent',
    })),
    ...FULL_SERVICE_ABHUR_AREAS.map((name) => ({
      label: `فلل للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'فيلا',
      dealType: 'sale',
    })),
    ...SPECIAL_PLAN_SEO_LINKS,
  ];

  const landLinks = [
    ...FULL_SERVICE_ABHUR_AREAS.map((name) => ({
      label: `أراضي للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      dealType: 'sale',
    })),
    ...LAND_ONLY_NORTH_JEDDAH_PLANS.map((name) => ({
      label: `أراضي للبيع في ${name}`,
      neighborhood: name,
      propertyType: 'أرض',
      dealType: 'sale',
    })),
  ];

  return [
    {
      title: 'أحياء أبحر الشمالية',
      links: abhurLinks.slice(0, 14),
    },
    {
      title: 'مخططات شمال جدة',
      links: landOnlyLinks.slice(0, 12),
    },
    {
      title: 'شقق وفلل',
      links: villasAndApartmentsLinks.slice(0, 14),
    },
    {
      title: 'أراضي للبيع',
      links: landLinks.slice(0, 14),
    },
  ].map((group) => ({
    ...group,
    links: group.links.map((link) => ({
      ...link,
      href: buildListingsHref(link),
    })),
  }));
}
