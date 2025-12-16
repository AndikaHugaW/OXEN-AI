# 🔒 Panduan Autentikasi Supabase

Dokumen ini menjelaskan implementasi autentikasi untuk membatasi akses model AI hanya kepada pengguna yang sudah login.

## 📋 Daftar Isi

1. [Setup Awal](#setup-awal)
2. [Struktur Database](#struktur-database)
3. [Implementasi di API Routes](#implementasi-di-api-routes)
4. [Menyimpan Riwayat Query](#menyimpan-riwayat-query)
5. [Row-Level Security (RLS)](#row-level-security-rls)

## 🚀 Setup Awal

### 1. Install Dependencies

```bash
npm install @supabase/ssr @supabase/supabase-js
```

### 2. Konfigurasi Environment Variables

Tambahkan ke file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Jalankan Migration Database

Jalankan file migration SQL di Supabase Dashboard:

```bash
# File: supabase/migrations/001_create_profiles_and_ai_queries.sql
```

Atau gunakan Supabase CLI:

```bash
supabase db push
```

## 🗄️ Struktur Database

### Tabel `profiles`

Menyimpan data profil pengguna yang terhubung dengan `auth.users`.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary Key, Foreign Key ke `auth.users.id` |
| `username` | TEXT | Username unik pengguna |
| `full_name` | TEXT | Nama lengkap pengguna |
| `avatar_url` | TEXT | URL avatar pengguna |
| `created_at` | TIMESTAMP | Waktu pembuatan profil |
| `updated_at` | TIMESTAMP | Waktu terakhir update |

### Tabel `ai_queries`

Menyimpan riwayat interaksi pengguna dengan model AI.

| Kolom | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | Foreign Key ke `auth.users.id` |
| `prompt` | TEXT | Pertanyaan/prompt dari pengguna |
| `response` | TEXT | Respons dari AI |
| `mode` | TEXT | Mode AI yang digunakan ('chat', 'letter', 'market_analysis') |
| `metadata` | JSONB | Data tambahan (chart info, structured output, dll) |
| `created_at` | TIMESTAMP | Waktu query dibuat |

## 🔐 Implementasi di API Routes

### Contoh: `/app/api/chat/route.ts`

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  // 🔒 VERIFIKASI SESI PENGGUNA
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Unauthorized',
        message: 'Please login to access the AI model.'
      },
      { status: 401 }
    );
  }

  // Lanjutkan dengan logika AI...
}
```

## 💾 Menyimpan Riwayat Query

Setelah verifikasi berhasil, Anda bisa menyimpan query ke database:

```typescript
// Setelah mendapatkan response dari AI
const { data: response } = await llmProvider.generateResponse(messages);

// Simpan ke database
await supabase.from('ai_queries').insert({
  user_id: user.id,
  prompt: message,
  response: response,
  mode: 'chat',
  metadata: {
    conversation_length: conversationHistory.length,
    model: 'llama3',
    // ... data tambahan lainnya
  }
});
```

## 🛡️ Row-Level Security (RLS)

RLS sudah dikonfigurasi di migration SQL. Kebijakan yang diterapkan:

### Profiles Table

- ✅ Users dapat melihat profil mereka sendiri
- ✅ Users dapat insert profil mereka sendiri
- ✅ Users dapat update profil mereka sendiri

### AI Queries Table

- ✅ Users dapat melihat query mereka sendiri
- ✅ Users dapat insert query dengan `user_id` mereka sendiri
- ✅ Users dapat update query mereka sendiri

### SQL Policies

```sql
-- Contoh policy untuk SELECT
CREATE POLICY "Users can view their own queries"
  ON public.ai_queries
  FOR SELECT
  USING (auth.uid() = user_id);
```

## 🔄 Auto-Create Profile

Sistem secara otomatis membuat profil ketika user baru mendaftar melalui trigger:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 📝 Catatan Penting

1. **Security**: Semua API routes yang mengakses model AI harus memiliki verifikasi sesi
2. **RLS**: Pastikan RLS sudah diaktifkan di Supabase Dashboard
3. **Error Handling**: Selalu handle error autentikasi dengan response 401
4. **Performance**: Gunakan index untuk query yang sering digunakan

## 🧪 Testing

Untuk menguji autentikasi:

1. Coba akses `/api/chat` tanpa login → Harus return 401
2. Login melalui Supabase Auth
3. Akses `/api/chat` dengan session cookie → Harus berhasil
4. Cek database `ai_queries` → Harus hanya menampilkan query user yang login

## 🔗 Referensi

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

