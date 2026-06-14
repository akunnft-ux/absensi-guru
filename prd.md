# PRD — Aplikasi Absensi Guru (Web + Mobile Friendly)

## Informasi Dokumen

| Item          | Detail                                                              |
| ------------- | ------------------------------------------------------------------- |
| Nama Aplikasi | Absensi Guru                                                        |
| Versi         | 1.1 (Revised)                                                       |
| Tanggal       | Juni 2026                                                           |
| Tech Stack    | Next.js 15 (App Router), Tailwind CSS, shadcn/ui, Supabase, Vercel |
| Platform      | Web Responsive + Mobile Friendly                                    |
| Status        | Draft Implementasi                                                  |

---

# 1. Latar Belakang

Sekolah membutuhkan sistem absensi guru yang terpusat, mudah digunakan melalui perangkat mobile maupun desktop, serta mampu mengelola jadwal piket, pengganti guru, dan rekap kehadiran secara otomatis.

Aplikasi ini dirancang untuk mendukung ratusan guru dan ribuan data kegiatan setiap tahunnya dengan tetap menjaga keamanan dan performa sistem.

---

# 2. Tujuan Bisnis

## Business Goals

- Mencatat kehadiran guru secara akurat dan real-time.
- Mengelola pengganti guru maupun penggantian hari tugas.
- Menghasilkan rekap mingguan dan bulanan secara otomatis.
- Mendukung multi-admin dengan hak akses berbeda.
- Menjadi sistem yang scalable untuk penggunaan jangka panjang.

## User Goals

### Grand Admin

- Mengelola seluruh unit/sekolah.
- Mengelola admin sekolah.
- Melihat seluruh data absensi.
- Mengakses seluruh laporan dan export data.

### Admin Unit

- Mengelola guru pada unitnya.
- Mengelola kegiatan dan jadwal.
- Menginput absensi.
- Melihat laporan unit.

### Guru (Future Feature — Phase 4)

- Melihat jadwal tugas.
- Melihat riwayat absensi pribadi.

---

# 3. User Roles & Permissions (RBAC)

| Role        | Hak Akses                  |
| ----------- | -------------------------- |
| grand_admin | Akses penuh seluruh sistem |
| admin       | Akses data sesuai unit     |
| guru        | Melihat data pribadi       |

## Implementasi RBAC

Menggunakan:

- Supabase Auth
- JWT Claims
- Row Level Security (RLS)

Penyimpanan role: `profiles.role` (single source of truth — tidak menggunakan `app_metadata.role` untuk menghindari konflik)

### Rules

#### Grand Admin

- Bypass hampir seluruh RLS.
- Dapat melihat seluruh data lintas unit.

#### Admin

- Hanya dapat mengakses data unit yang dimiliki.

#### Guru

- Hanya dapat melihat datanya sendiri.

---

# 4. Database Design

## 4.1 Profiles

Menyimpan data pengguna sistem (grand_admin, admin, dan guru yang sudah punya akun).

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text unique,
  -- [REVISI] Tambahkan 'guru' agar Portal Guru (Phase 4) tidak perlu migrasi breaking
  role text check (role in ('grand_admin', 'admin', 'guru')) not null default 'admin',
  unit_id uuid references units(id),
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4.2 Units

Menyimpan data sekolah/unit.

```sql
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  -- [REVISI] Tambahkan timezone untuk konversi waktu yang benar (WIB/WITA/WIT)
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4.3 Teachers

Menyimpan data guru.

```sql
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete cascade,
  -- [REVISI] Link opsional ke auth.users untuk mendukung Portal Guru (Phase 4)
  -- Nullable agar guru tanpa akun tetap bisa dikelola
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  nip text unique,
  email text,
  phone text,
  status text default 'aktif'
    check (status in ('aktif', 'nonaktif', 'cuti')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4.4 Activities

Menyimpan kegiatan (single maupun recurring).

```sql
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  name text not null,
  description text,
  activity_date date not null,
  start_time time,
  end_time time,
  location text,
  is_recurring boolean default false,
  -- [REVISI] Tambahkan kolom recurring pattern agar implementasi tidak ambigu
  recurrence_pattern text check (recurrence_pattern in ('daily', 'weekly', 'monthly')),
  recurrence_days text[],        -- Contoh: ['monday', 'wednesday'] untuk weekly
  recurrence_end_date date,      -- Batas akhir recurring
  parent_activity_id uuid references activities(id) on delete set null, -- Link ke induk
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4.5 Piket Schedules

Menyimpan jadwal tugas guru.

```sql
create table public.piket_schedules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  teacher_id uuid references teachers(id),
  duty_date date not null,
  shift text check (shift in ('pagi', 'siang', 'malam', 'full')),
  status text default 'assigned'
    check (status in ('assigned', 'completed', 'cancelled')),
  -- [REVISI] Tambahkan audit trail — wajib sesuai NFR Section 8
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4.6 Attendances

Menyimpan data absensi.

```sql
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references piket_schedules(id),
  teacher_id uuid references teachers(id),
  status text not null
    check (status in ('hadir', 'tidak_hadir', 'izin', 'sakit')),
  check_in_time timestamptz,
  note text,
  -- [REVISI] Tambahkan link ke substitutes untuk traceability absensi pengganti
  substitute_id uuid references substitutes(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- [REVISI] Unique constraint untuk mencegah double-entry absensi
alter table public.attendances
  add constraint uq_attendance_schedule_teacher
  unique (schedule_id, teacher_id);
```

---

## 4.7 Substitutes

Menyimpan data pengganti.

```sql
create table public.substitutes (
  id uuid primary key default gen_random_uuid(),
  original_schedule_id uuid references piket_schedules(id),
  original_teacher_id uuid references teachers(id),
  substitute_teacher_id uuid references teachers(id) not null,
  substitute_date date not null,
  reason text,
  type text check (type in ('person', 'day')),
  -- [REVISI] Tambahkan status agar alur approval bisa diimplementasikan
  status text default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

# 5. Indexing & Performance

## Index Rekomendasi

```sql
-- Index yang sudah ada di versi sebelumnya
create index idx_attendances_teacher_created
  on attendances(teacher_id, created_at);

create index idx_schedule_date_teacher
  on piket_schedules(duty_date, teacher_id);

create index idx_activities_date_unit
  on activities(activity_date, unit_id);

-- [REVISI] Index tambahan untuk query utama yang sering dipakai
create index idx_attendances_schedule
  on attendances(schedule_id);

create index idx_piket_schedules_activity
  on piket_schedules(activity_id, duty_date);

create index idx_substitutes_original_schedule
  on substitutes(original_schedule_id);

create index idx_teachers_unit
  on teachers(unit_id);

create index idx_teachers_user
  on teachers(user_id);
```

## Future Optimization

- Attendance partitioning per tahun
- Materialized View untuk laporan rekap
- Query caching
- Supabase Edge Functions

---

# 6. Fitur Sistem

## 6.1 Authentication

### Login

- Email + Password
- Magic Link

### Session

- Next.js Middleware
- Protected Route

### Authorization

- Role-based Access Control (RBAC)

---

## 6.2 Master Data

### Unit

- Tambah Unit
- Edit Unit
- Hapus Unit

### Guru

- Tambah Guru
- Edit Guru
- Nonaktifkan Guru

### Admin

- Tambah Admin
- Edit Admin
- Assign Unit

---

## 6.3 Kegiatan & Jadwal

### Kegiatan

- Tambah kegiatan (single / recurring)
- Edit kegiatan
- Hapus kegiatan

### Jenis Jadwal

#### Single Activity

Kegiatan satu kali. `is_recurring = false`, kolom `recurrence_*` dibiarkan null.

#### Recurring Activity

Kegiatan berulang. `is_recurring = true`, wajib isi `recurrence_pattern`, `recurrence_days` (jika weekly), dan `recurrence_end_date`.

Sistem akan generate instance `activities` per tanggal berdasarkan pattern, dihubungkan melalui `parent_activity_id`.

### Penjadwalan

- Manual assignment
- Auto rotate guru

---

## 6.4 Absensi

### Flow

Pilih kegiatan → tampilkan guru yang bertugas → input absensi.

### Status Absensi

- Hadir
- Tidak Hadir
- Izin
- Sakit

### Fitur

- Bulk Check-in
- Catatan absensi
- Timestamp otomatis (disimpan dalam UTC, ditampilkan dalam timezone unit)
- QR Code Scan (opsional — Phase 3)

---

## 6.5 Pengganti

### Pengganti Orang (`type = 'person'`)

Guru lain menggantikan pada hari yang sama.

**Rules:**
- Jadwal asli tetap aktif (`status = 'assigned'`).
- Record `substitutes` dibuat dengan `status = 'pending'` → `'approved'`.
- Absensi dicatat atas nama guru pengganti dengan `substitute_id` terisi.
- Guru asli tetap tercatat tidak hadir (dengan catatan "digantikan").

### Pengganti Hari (`type = 'day'`)

Guru yang sama bertugas pada hari berbeda.

**Rules:**
- Jadwal lama di-set `status = 'cancelled'`.
- Sistem membuat jadwal baru (`piket_schedules`) pada `substitute_date`.
- Record `substitutes` tetap disimpan untuk audit trail.

---

# 7. Rekap & Reporting

## Filter

- Unit
- Guru
- Kegiatan
- Rentang tanggal

## Rekap Mingguan

Periode: Senin–Minggu.

## Rekap Bulanan

Periode: Tanggal 1 – akhir bulan.

## Metrik

### Kehadiran

- Total Hadir
- Persentase Kehadiran

### Ketidakhadiran

- Total Izin
- Total Sakit
- Total Tidak Hadir

### Ranking

**Formula Ranking:**

```
Persentase Kehadiran = (total_hadir / total_jadwal_ditugaskan) * 100
```

- Minimum 3 jadwal untuk masuk ranking (menghindari bias data kecil).
- Guru pengganti yang berhasil hadir dihitung sebagai "hadir" di rekap mereka.
- Guru asli yang digantikan dihitung sebagai "tidak hadir" di rekap mereka.

## Export

- CSV
- Excel (.xlsx)

---

# 8. Non Functional Requirements

## Mobile Friendly

- Responsive Design
- PWA Installable

## Performance

Target: < 2 detik (time to interactive).

Menggunakan:

- Server Components
- Data Caching
- Lazy Loading

## Security

- Row Level Security (RLS) aktif di semua tabel utama
- Rate Limiting
- Zod Validation (schema di `lib/validations/`)
- CSRF Protection

## Scalability

- Supabase Edge Functions
- Query Optimization
- Indexing Strategy

## Timezone

Semua data waktu disimpan dalam **UTC** (`timestamptz`). Tampilan di frontend dikonversi ke timezone unit (`units.timezone`) menggunakan library `date-fns-tz` atau `Intl.DateTimeFormat`.

## Audit Trail

Semua tabel utama wajib memiliki: `created_by`, `created_at`, `updated_at`.

| Tabel             | created_by | created_at | updated_at |
|-------------------|------------|------------|------------|
| profiles          | —          | ✅          | ✅          |
| units             | —          | ✅          | ✅          |
| teachers          | —          | ✅          | ✅          |
| activities        | ✅          | ✅          | ✅          |
| piket_schedules   | ✅          | ✅          | ✅          |
| attendances       | ✅          | ✅          | ✅          |
| substitutes       | —          | ✅          | ✅          |

## Logging

- Error Tracking
- Activity Logging
- Authentication Logging

---

# 9. Struktur Folder

```
app/
├── (auth)/
│   ├── login/
│   └── logout/
│
├── (dashboard)/
│   ├── grand-admin/
│   └── admin/
│
└── api/

components/
├── ui/                      ← shadcn/ui primitives
└── features/
    ├── AttendanceTable/
    ├── ScheduleCalendar/
    ├── TeacherForm/
    └── Reports/

lib/
├── supabase.ts              ← Supabase client (server & browser)
├── rbac.ts                  ← Helper cek role & permission
├── utils.ts
└── validations/             ← Zod schemas per entitas
    ├── teacher.ts
    ├── attendance.ts
    └── activity.ts

types/
├── database.ts              ← Generated types dari Supabase CLI
└── app.ts                   ← Custom app-level types

hooks/
├── useAuth.ts
├── useAttendance.ts
└── useSchedule.ts

supabase/
├── migrations/
└── seed.sql
```

---

# 10. Row Level Security (RLS)

## Prinsip Dasar

- Semua tabel utama wajib aktif RLS.
- Grand Admin bypass seluruh policy.
- Admin hanya akses data di unit-nya.
- Guru hanya akses data pribadinya.

## Contoh Policy

```sql
-- Attendances: Admin hanya bisa lihat absensi di unitnya
create policy "Admin can view own unit attendances"
on public.attendances
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and (
      p.role = 'grand_admin'
      or p.unit_id = (
        select t.unit_id from teachers t
        where t.id = attendances.teacher_id
      )
    )
  )
);

-- Guru hanya bisa lihat absensi dirinya sendiri
create policy "Guru can view own attendances"
on public.attendances
for select
using (
  exists (
    select 1 from public.teachers t
    where t.user_id = auth.uid()
    and t.id = attendances.teacher_id
  )
);
```

---

# 11. Dashboard KPI

## Grand Admin Dashboard

- Total Unit
- Total Guru
- Total Kegiatan
- Kehadiran Bulan Ini (%)
- Ranking Unit (berdasarkan rata-rata % kehadiran guru per unit)

## Admin Dashboard

- Total Guru Unit
- Jadwal Hari Ini
- Absensi yang Belum Diinput Hari Ini
- Kehadiran Hari Ini
- Persentase Kehadiran Bulan Ini

---

# 12. Roadmap Pengembangan

## Phase 1 — MVP

- Authentication (email + password, magic link)
- Master Unit & Guru
- Kegiatan (single & recurring dasar)
- Jadwal Piket (manual assignment)
- Absensi (input manual, bulk check-in)
- Rekap Dasar (mingguan & bulanan)

## Phase 2

- Pengganti Guru (person & day)
- Export Excel & CSV
- Dashboard Statistik & Ranking

## Phase 3

- QR Code Attendance
- PWA Offline Mode
- Notifikasi WhatsApp
- Auto Scheduling (rotate guru)

## Phase 4

- Portal Guru (login, lihat jadwal & riwayat absensi)
- Approval Workflow (pengganti, cuti)
- AI Attendance Analytics

---

# 13. Definition of Done

Aplikasi dianggap selesai (per phase) apabila:

- Semua role berjalan sesuai RBAC.
- RLS aktif dan tervalidasi di semua tabel utama.
- CRUD master data berjalan dengan validasi Zod.
- Absensi dapat dicatat dan direkap dengan benar.
- Double-entry absensi dicegah oleh unique constraint.
- Export Excel/CSV berfungsi.
- Mobile responsive (tested di viewport 375px+).
- Deploy sukses di Vercel.
- Terintegrasi penuh dengan Supabase.
- Mendukung minimal 100+ guru dan 10.000+ data absensi.
- Semua waktu ditampilkan dalam timezone yang benar per unit.

---

# 14. Catatan Revisi (v1.0 → v1.1)

| # | Perubahan | Alasan |
|---|-----------|--------|
| 1 | Role `guru` ditambahkan ke `profiles.role` | Agar Phase 4 tidak butuh breaking migration |
| 2 | `teachers.user_id` ditambahkan (nullable) | Menghubungkan guru ke auth untuk Portal Guru |
| 3 | Unique constraint `attendances(schedule_id, teacher_id)` | Mencegah double-entry absensi |
| 4 | `piket_schedules` ditambah `created_by` & `updated_at` | Audit trail wajib sesuai NFR |
| 5 | `substitutes.status` ditambahkan | Mendukung approval workflow |
| 6 | Kolom `recurrence_*` ditambahkan ke `activities` | Implementasi recurring tidak ambigu |
| 7 | `attendances.substitute_id` ditambahkan | Traceability absensi hasil penggantian |
| 8 | Formula ranking didefinisikan secara eksplisit | Menghindari asumsi berbeda antar developer |
| 9 | Index tambahan untuk query utama | Performa query absensi & jadwal |
| 10 | Folder `types/`, `hooks/`, `lib/validations/` ditambahkan | Struktur Next.js 15 yang proper |
| 11 | `units.timezone` ditambahkan | Penanganan WIB/WITA/WIT yang benar |
| 12 | Source of truth RBAC diperjelas ke `profiles.role` | Menghindari konflik dual storage role |
