import { redirect } from 'next/navigation';

export default function ListingsIdRedirect({ params }) {
  const raw = params?.id ? String(params.id) : '';
  let id = raw;
  try {
    id = raw ? decodeURIComponent(raw) : '';
  } catch (_) {}

  if (!id) {
    redirect('/listings');
  }

  redirect(`/listing/${encodeURIComponent(id)}`);
}
