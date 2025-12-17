import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Secara default, arahkan root /admin ke halaman login
  // Middleware atau auth check di halaman login akan menangani sisanya
  redirect('/admin/login');
}
