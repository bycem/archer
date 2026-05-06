# Task 05 — Profil & Kayıt Tamamlama

## Amaç
Google ile ilk girişten sonra zorunlu profil tamamlama ekranı ve daha sonra düzenlenebilen profil ayarları ekranı.

## Onboarding Form Alanları

| Alan | Tip | Zorunlu | Validation |
|---|---|---|---|
| Ad | text | ✅ | min 2 karakter |
| Soyad | text | ✅ | min 2 karakter |
| Yaş | number | ✅ | 5–100 |
| Cinsiyet | select | ✅ | male / female / other |
| Kulüp | text | ❌ | max 100 karakter |
| Yay Tipi | select | ✅ | recurve / compound / barebow / traditional_turkish |
| Dil | select | ✅ | tr / en (default tarayıcıdan) |

## UI

`src/pages/onboarding/CompleteProfile.tsx`

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(2),
  surname: z.string().min(2),
  age: z.number().int().min(5).max(100),
  gender: z.enum(['male','female','other']),
  club: z.string().max(100).optional().or(z.literal('')),
  bow_type: z.enum(['recurve','compound','barebow','traditional_turkish']),
  language: z.enum(['tr','en']),
});

export default function CompleteProfile() {
  const { profile, refreshProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { language: profile?.language ?? 'tr' },
  });

  const onSubmit = async (values) => {
    await supabase.from('users').update({
      ...values, club: values.club || null, profile_completed: true,
    }).eq('id', profile!.id);
    await i18n.changeLanguage(values.language);
    await refreshProfile();
    navigate('/home');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t('onboarding.title')}</h1>

      <Field label={t('profile.name')} error={errors.name}>
        <input {...register('name')} className="input" />
      </Field>
      {/* surname, age, gender, club, bow_type, language */}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {t('common.save')}
      </button>
    </form>
  );
}
```

## Profil Ayarları (Sonradan Düzenleme)

`src/pages/Settings.tsx` — aynı form ama `profile_completed` zaten true. Çıkış yap butonu da burada.

Ayrı sekme/bölümler:
- **Profil Bilgileri** (ad, soyad, yaş, cinsiyet)
- **Okçuluk Tercihleri** (kulüp, yay tipi)
- **Uygulama** (dil)
- **Hesap** (email görüntüleme, çıkış)

## Yaş Hesaplama Notu

Yaş alanı "doğum yılı" yerine "yaş" olarak alınıyor. Yaş grubu eşleştirmesi otomatik:

```ts
// src/lib/archery/ageGroup.ts
export function ageToGroup(age: number): AgeGroup {
  if (age <= 11) return 'U11';
  if (age <= 13) return 'U13';
  if (age <= 15) return 'U15';
  if (age <= 18) return 'U18';
  if (age <= 21) return 'U21';
  return 'seniors';
}
```

> **NOT:** Resmi okçuluk turnuvalarında yaş grubu o yılın 31 Aralık tarihindeki yaşına göre belirlenir. İleride doğum tarihi alıp dinamik hesaplamaya geçilebilir. Şimdilik basit yaklaşım yeterli.

## Kabul Kriterleri

- [x] İlk girişten sonra `/onboarding/profile` zorunlu
- [x] Form validation çalışıyor (Zod)
- [x] Tamamlandığında `profile_completed = true` set ediliyor
- [x] Dil değişince `i18n.changeLanguage` tetikleniyor
- [x] Settings sayfası tekrar açılıyor ve düzenleme yapılabiliyor
- [x] Yaş 0 / negatif girilince hata gösteriliyor

## Bağımlılık
- Task 04, Task 06 (i18n)
