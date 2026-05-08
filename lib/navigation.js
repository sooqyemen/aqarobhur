// lib/navigation.js

export const MAIN_NAV_LINKS = [
  { href: '/', label: 'الرئيسية', icon: 'home', mobileBottom: true, shortLabel: 'الرئيسية' },
  { href: '/listings', label: 'كل العروض', icon: 'grid_view' },
  { href: '/neighborhoods', label: 'دليل الأحياء', icon: 'location_city', mobileBottom: true, shortLabel: 'الأحياء' },
  { href: '/map', label: 'الخريطة العقارية', icon: 'map', mobileBottom: true, shortLabel: 'الخريطة' },
  { href: '/request', label: 'أرسل طلبك العقاري', icon: 'manage_search', primary: true, mobileBottom: true, shortLabel: 'أرسل طلبك' },
  { href: '/marketing-request', label: 'تسويق عقارك', icon: 'handshake' },
  { href: '/ejar-request', label: 'عقود إيجار', icon: 'assignment' },
];
