import { redirect } from 'next/navigation';

// مسار قديم كان ينتج 404 في بعض الكروت/الروابط
// نحوله للمسار الصحيح: /listing/[id]
export default function LegacyListingRedirect({ params }) {
  const id = params?.id ? encodeURIComponent(String(params.id)) : '';
  redirect(id ? `/listing/${id}` : '/listings');
}
