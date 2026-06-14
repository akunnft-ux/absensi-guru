-- 4.2 Units (no dependencies)
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  address text,
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4.1 Profiles (depends on units)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text unique,
  role text check (role in ('grand_admin', 'admin', 'guru')) not null default 'admin',
  unit_id uuid references units(id),
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4.3 Teachers (depends on units)
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete cascade,
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

-- 4.4 Activities (depends on units, self-referential)
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
  recurrence_pattern text check (recurrence_pattern in ('daily', 'weekly', 'monthly')),
  recurrence_days text[],
  recurrence_end_date date,
  parent_activity_id uuid references activities(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4.5 Piket Schedules (depends on activities, teachers)
create table public.piket_schedules (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  teacher_id uuid references teachers(id),
  duty_date date not null,
  shift text check (shift in ('pagi', 'siang', 'malam', 'full')),
  status text default 'assigned'
    check (status in ('assigned', 'completed', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4.7 Substitutes (depends on piket_schedules, teachers, profiles)
create table public.substitutes (
  id uuid primary key default gen_random_uuid(),
  original_schedule_id uuid references piket_schedules(id),
  original_teacher_id uuid references teachers(id),
  substitute_teacher_id uuid references teachers(id) not null,
  substitute_date date not null,
  reason text,
  type text check (type in ('person', 'day')),
  status text default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4.6 Attendances (depends on piket_schedules, teachers, substitutes)
create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references piket_schedules(id),
  teacher_id uuid references teachers(id),
  status text not null
    check (status in ('hadir', 'tidak_hadir', 'izin', 'sakit')),
  check_in_time timestamptz,
  note text,
  substitute_id uuid references substitutes(id) on delete set null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.attendances
  add constraint uq_attendance_schedule_teacher
  unique (schedule_id, teacher_id);
