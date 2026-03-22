import { redirect } from 'next/navigation';

export default function AddPageRedirect() {
  redirect('/admin/new');
}
