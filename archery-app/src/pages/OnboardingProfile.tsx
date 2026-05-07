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

export default function OnboardingProfile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      language: (profile?.language as 'tr' | 'en') ?? (navigator.language.startsWith('tr') ? 'tr' : 'en'),
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
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
        profile_completed: true,
      })
      .eq('id', profile!.id);

    if (error) {
      setSubmitError('Profil kaydedilemedi: ' + error.message);
      return;
    }

    await refreshProfile();
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8">
        <h1 className="text-2xl font-bold mb-1">Profilini Tamamla</h1>
        <p className="text-slate-500 text-sm mb-6">
          Yarışmalara katılmadan önce birkaç bilgiye ihtiyacımız var.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Ad</label>
              <input {...register('name')} className="input" placeholder="Ahmet" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Soyad</label>
              <input {...register('surname')} className="input" placeholder="Yılmaz" />
              {errors.surname && <p className="text-red-500 text-xs mt-1">{errors.surname.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Yaş</label>
              <input
                {...register('age')}
                type="number"
                min={5}
                max={100}
                className="input"
                placeholder="25"
              />
              {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cinsiyet</label>
              <select {...register('gender')} className="input">
                <option value="">Seçin...</option>
                {Object.entries(genderLabels).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">Seçim yapın</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Yay Tipi</label>
            <select {...register('bow_type')} className="input">
              <option value="">Seçin...</option>
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

          <div>
            <label className="block text-sm font-medium mb-1">Uygulama Dili</label>
            <select {...register('language')} className="input">
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </div>

          {submitError && (
            <p className="text-red-600 text-sm bg-red-50 rounded-md px-3 py-2">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white rounded-md py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}
          </button>
        </form>
      </div>
    </div>
  );
}
