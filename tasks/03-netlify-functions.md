# Task 03 — Netlify Functions Altyapısı

## Amaç
Tüm sunucu tarafı işlemleri (admin override, yetki kontrolü, hassas veri yazma) Netlify Functions ile sağlamak. Frontend'den doğrudan Supabase'e gidilebilen yerler RLS ile, hassas işlemler `service_role` key ile function üzerinden yapılır.

## Klasör Yapısı

```
netlify/functions/
├── _shared/
│   ├── supabase.ts          # Service role client
│   ├── auth.ts              # JWT doğrulama, role kontrolü
│   ├── response.ts          # Standart response helper'ları
│   └── validation.ts        # Zod schema'lar
├── tournaments/
│   ├── create.ts            # POST /api/tournaments/create
│   ├── list.ts              # GET /api/tournaments?status=&q=&page=
│   ├── get.ts               # GET /api/tournaments/:id
│   ├── end.ts               # POST /api/tournaments/:id/end
│   └── scoreboard.ts        # GET /api/tournaments/:id/scoreboard
├── participants/
│   ├── join.ts              # POST /api/participants/join
│   ├── approve.ts           # POST /api/participants/:id/approve
│   ├── reject.ts            # POST /api/participants/:id/reject
│   └── pending.ts           # GET /api/tournaments/:id/pending
├── scores/
│   ├── commit-set.ts        # POST /api/scores/commit-set
│   └── admin-edit.ts        # POST /api/scores/admin-edit
├── qr/
│   ├── generate.ts          # POST /api/qr/generate
│   └── verify.ts            # GET /api/qr/verify?token=
├── exports/
│   ├── tournament-xlsx.ts   # GET /api/exports/tournament/:id.xlsx
│   └── my-scores-xlsx.ts    # GET /api/exports/my-scores/:tournamentId.xlsx
└── profile/
    ├── update.ts
    └── analytics.ts          # Heatmap + progress data
```

## Ortak Yapı

### `_shared/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const supabaseFromToken = (jwt: string) =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
```

### `_shared/auth.ts`
```ts
import type { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase';

export type UserRole = 'admin' | 'competitor';

export interface AuthContext {
  userId: string;
  role: UserRole;
  email: string;
}

export async function authenticate(event): Promise<AuthContext> {
  const auth = event.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/, '');
  if (!token) throw new HttpError(401, 'Missing token');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new HttpError(401, 'Invalid token');

  const { data: profile } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).single();

  return { userId: user.id, role: profile?.role ?? 'competitor', email: user.email! };
}

export function requireAdmin(ctx: AuthContext) {
  if (ctx.role !== 'admin') throw new HttpError(403, 'Admin only');
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
```

### `_shared/response.ts`
```ts
export const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const error = (status: number, message: string) => json(status, { error: message });
```

## Örnek Function — `tournaments/create.ts`

```ts
import type { Handler } from '@netlify/functions';
import { z } from 'zod';
import { authenticate, requireAdmin, HttpError } from '../_shared/auth';
import { supabaseAdmin } from '../_shared/supabase';
import { ok, error } from '../_shared/response';

const schema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bow_type: z.enum(['recurve','compound','barebow','traditional_turkish']),
  age_group: z.enum(['U11','U13','U15','U18','U21','seniors']),
  set_count: z.number().int().min(3).max(30),
  arrows_per_set: z.number().int().refine(v => [3,4,5,6].includes(v)),
  target_type: z.enum(['wa_122','wa_80','wa_60','wa_40','three_d','puta','meydan']),
  distance_meters: z.number().positive(),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');
  try {
    const ctx = await authenticate(event);
    requireAdmin(ctx);
    const body = schema.parse(JSON.parse(event.body || '{}'));

    const { data: tournament, error: e1 } = await supabaseAdmin
      .from('tournaments').insert({ ...body, created_by: ctx.userId }).select().single();
    if (e1) throw new HttpError(500, e1.message);

    // QR token üretimi
    const { nanoid } = await import('nanoid');
    await supabaseAdmin.from('tournament_qr_tokens').insert([
      { tournament_id: tournament.id, kind: 'competitor', token: nanoid(32) },
      { tournament_id: tournament.id, kind: 'spectator', token: nanoid(32) },
    ]);

    return ok({ tournament });
  } catch (e: any) {
    return error(e.status ?? 500, e.message ?? 'Internal');
  }
};
```

## Endpoint Özeti

| Method | Path | Yetki | Açıklama |
|---|---|---|---|
| POST | /api/tournaments/create | admin | Turnuva + 2 QR token oluştur |
| GET | /api/tournaments | public/auth | Liste + filtre + pagination |
| GET | /api/tournaments/:id | public | Detay |
| POST | /api/tournaments/:id/end | admin | Turnuvayı kilitle |
| GET | /api/tournaments/:id/scoreboard | public | Sıralı liste |
| POST | /api/participants/join | competitor | QR token + hedef no + kulüp |
| GET | /api/tournaments/:id/pending | admin | Bekleyen talepler |
| POST | /api/participants/:id/approve | admin | Onayla |
| POST | /api/participants/:id/reject | admin | Reddet |
| POST | /api/scores/commit-set | competitor | Set commit |
| POST | /api/scores/admin-edit | admin | Atış düzelt + audit |
| GET | /api/qr/verify | public | Token doğrula |
| GET | /api/exports/tournament/:id.xlsx | admin | Tüm sporcular xlsx |
| GET | /api/exports/my-scores/:id.xlsx | competitor | Kendi xlsx |
| GET | /api/profile/analytics | competitor | Heatmap + progress |

## Hata İşleme Standardı

```json
// Başarılı
{ "data": { ... } }

// Hata
{ "error": "Açıklama", "code": "VALIDATION_ERROR" }
```

## CORS

`netlify.toml`'da redirect yapısı kullanıldığı için aynı origin — CORS sorunu olmaz. Yine de yanıtlarda:
```
access-control-allow-origin: *
access-control-allow-headers: authorization, content-type
```

## Rate Limiting

İlk sürümde yok. İleride Netlify Edge Functions ile eklenebilir.

## Kabul Kriterleri

- [x] `_shared` modülleri çalışıyor
- [x] `authenticate` middleware JWT doğruluyor
- [x] `requireAdmin` rol kontrolü 403 dönüyor
- [x] Zod validation hataları 400 ile dönüyor
- [x] `netlify dev` ile lokal test edilebiliyor
- [x] Her function ortak hata formatına uyuyor

## Bağımlılık
- Task 01, Task 02
