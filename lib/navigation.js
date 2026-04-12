// lib/navigation.js

export const MAIN_NAV_LINKS = [
  { href: '/', label: 'الرئيسية', icon: 'home', mobileBottom: true, shortLabel: 'الرئيسية' },
  { href: '/listings', label: 'كل العروض', icon: 'grid_view' },
  { href: '/marketing-request', label: 'تسويق عقارك', icon: 'handshake', mobileBottom: true, shortLabel: 'تسويق' },
  { href: '/ejar-request', label: 'عقود إيجار', icon: 'assignment', mobileBottom: true, shortLabel: 'إيجار' },
  { href: '/map', label: 'الخريطة العقارية', icon: 'map', mobileBottom: true, shortLabel: 'الخريطة' },
  { href: '/neighborhoods', label: 'دليل الأحياء', icon: 'location_city' },
  { href: '/request', label: 'أرسل طلبك العقاري', icon: 'manage_search', primary: true, mobileBottom: true, shortLabel: 'طلبي' },
];
