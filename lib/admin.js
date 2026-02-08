export function getAdminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdminUser(user) {
  const email = String(user?.email || '').toLowerCase();
  if (!email) return false;
  return getAdminEmails().includes(email);
}
