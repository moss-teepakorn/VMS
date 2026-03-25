# Greenfield VMS

ระบบจัดการหมู่บ้าน The Greenfield — v2.2

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel

## วิธีตั้งค่า

### 1. Copy .env
```bash
cp .env.example .env
```

### 2. ใส่ค่า Supabase
เปิด `.env` แล้วใส่ค่าจาก Supabase Dashboard → Project Settings → API:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. ติดตั้ง dependencies (ถ้ารันในเครื่อง)
```bash
npm install
npm run dev
```

## Vercel Environment Variables
ใน Vercel Dashboard → Settings → Environment Variables ใส่:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## โครงสร้างโปรเจกต์
```
src/
├── lib/
│   └── supabase.js        # Supabase client
├── contexts/
│   └── AuthContext.jsx    # Auth state (user, profile, role)
├── pages/
│   ├── LoginPage.jsx
│   ├── admin/
│   │   └── AdminLayout.jsx
│   └── resident/
│       └── ResidentLayout.jsx
├── App.jsx                # Router + Auth provider
└── main.jsx
```
