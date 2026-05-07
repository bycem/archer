import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { supabase } from '../lib/supabase';

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter'),
  surname: z.string().min(2, 'En az 2 karakter'),
  age: z.coerce.number().int().min(5, 'En az 5 olmalı').max(100, 'En fazla 100 olmalı'),
  gender: z.enum(['male', 'female', 'other']),
  club: z.string().max(100, 'En fazla 100 karakter').optional().or(z.literal('')),
  bow_type: z.enum(['recurve', 'compound', 'barebow', 'traditional_turkish']),
  language: z.enum(['tr', 'en']),
});

type FormValues = z.infer<typeof schema>;

const genderLabels = { male: 'Erkek', female: 'Kadın', other: 'Diğer' };
const bowLabels = {
  recurve: 'Recurve',
  compound: 'Compound',
  barebow: 'Barebow',
  traditional_turkish: 'Geleneksel Türk',
};

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: profile?.name ?? '',
      surname: profile?.surname ?? '',
      age: profile?.age ?? undefined,
      gender: (profile?.gender as 'male' | 'female' | 'other') ?? undefined,
      club: profile?.club ?? '',
      bow_type: (profile?.bow_type as FormValues['bow_type']) ?? undefined,
      language: (profile?.language as 'tr' | 'en') ?? 'tr',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setSaved(false);
    const { error } = await supabase
      .from('users')
      .update({
        name: values.name,
        surname: values.surname,
        age: values.age,
        gender: values.gender,
        club: values.club || null,
        bow_type: values.bow_type,
        language: values.language,
      })
      .eq('id', profile!.id);

    if (error) {
      setSubmitError('Kaydedilemedi: ' + error.message);
      return;
    }

    await refreshProfile();
    setSaved(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Geri
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Profil Bilgileri */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-700">Profil Bilgileri</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Ad</label>
                <input {...register('name')} className="input" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Soyad</label>
                <input {...register('surname')} className="input" />
                {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Yaş</label>
                <input {...register('age')} type="number" min={5} max={100} className="input" />
                {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cinsiyet</label>
                <select {...register('gender')} className="input">
                  {Object.entries(genderLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">Seçim yapın</p>}
              </div>
            </div>
          </section>

          {/* Okçuluk Tercihleri */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-700">Okçuluk Tercihleri</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Yay Tipi</label>
              <select {...register('bow_type')} className="input">
                {Object.entries(bowLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.bow_type && <p className="text-red-500 text-xs mt-1">Seçim yapın</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Kulüp <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <input {...register('club')} className="input" placeholder="Kulüp adı" />
              {errors.club && <p className="text-red-500 text-xs mt-1">{errors.club.message}</p>}
            </div>
          </section>

          {/* Uygulama */}
          <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <h2 className="font-semibold text-slate-700">Uygulama</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Dil</label>
              <select {...register('language')} className="input">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>

          {submitError && (
            <p className="text-red-600 text-sm bg-red-50 rounded-md px-3 py-2">{submitError}</p>
          )}
          {saved && (
            <p className="text-green-600 text-sm bg-green-50 rounded-md px-3 py-2">Değişiklikler kaydedildi.</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>

        {/* Hesap */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-700">Hesap</h2>
          <p className="text-sm text-slate-500">{profile?.email}</p>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Çıkış Yap
          </button>
        </section>
      </div>
    </div>
  );
}
