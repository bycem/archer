import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  ARROWS_PER_SET_OPTIONS,
  BOW_LABELS,
  BOW_TYPES,
  SET_PRESETS,
  TARGET_DEFAULT_DISTANCE,
  TARGET_LABELS,
  TARGET_TYPES,
  type TargetType,
} from '../../lib/archery/constants';

const schema = z.object({
  name: z.string().min(3, 'En az 3 karakter').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir tarih girin'),
  bow_type: z.enum(['recurve', 'compound', 'barebow', 'traditional_turkish']),
  age_group: z.enum(['U11', 'U13', 'U15', 'U18', 'U21', 'seniors']),
  set_count: z.number().int().min(3).max(30),
  arrows_per_set: z.number().int().refine((v) => [3, 4, 5, 6].includes(v), {
    message: 'Set başına atış 3, 4, 5 veya 6 olmalı',
  }),
  target_type: z.enum(['wa_122', 'wa_80', 'wa_60', 'wa_40', 'three_d', 'puta', 'meydan']),
  distance_meters: z.number().positive().max(200),
});

type FormValues = z.infer<typeof schema>;

interface CreatedTournament {
  tournament: { id: string };
}

export default function CreateTournament() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      date: today,
      bow_type: 'recurve',
      age_group: 'seniors',
      set_count: 10,
      arrows_per_set: 6,
      target_type: 'wa_122',
      distance_meters: 70,
    },
  });

  const targetType = watch('target_type') as TargetType;
  useEffect(() => {
    const def = TARGET_DEFAULT_DISTANCE[targetType];
    if (def != null) setValue('distance_meters', def);
  }, [targetType, setValue]);

  const applyPreset = (i: number) => {
    const p = SET_PRESETS[i];
    setValue('set_count', p.set_count);
    setValue('arrows_per_set', p.arrows_per_set);
    if (p.target_type) setValue('target_type', p.target_type);
    if (p.distance_meters != null) setValue('distance_meters', p.distance_meters);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const data = await api.post<CreatedTournament>('/api/tournaments-create', values);
      navigate(`/admin/tournaments/${data.tournament.id}`);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/admin" className="text-sm text-slate-600 underline">
            ← Yönetici Paneli
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-2">Turnuva Oluştur</h1>
        <p className="text-sm text-slate-500 mb-6">
          Tüm okçuluk standartlarına uygun bir turnuva tanımlayın.
        </p>

        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Hızlı Şablon
          </div>
          <div className="flex flex-wrap gap-2">
            {SET_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(i)}
                className="px-3 py-1.5 text-xs rounded-full border border-slate-300 bg-white hover:bg-slate-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 bg-white rounded-lg shadow-sm p-6"
        >
          <Field label="Turnuva Adı" error={errors.name?.message}>
            <input
              {...register('name')}
              type="text"
              className="input"
              placeholder="Bahar Kupası 2026"
              autoFocus
            />
          </Field>

          <Field label="Tarih" error={errors.date?.message}>
            <input {...register('date')} type="date" min={today} className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Yay Tipi" error={errors.bow_type?.message}>
              <select {...register('bow_type')} className="input">
                {BOW_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {BOW_LABELS[b]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Yaş Grubu" error={errors.age_group?.message}>
              <select {...register('age_group')} className="input">
                {AGE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {AGE_GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Set Sayısı" error={errors.set_count?.message}>
              <input
                {...register('set_count', { valueAsNumber: true })}
                type="number"
                min={3}
                max={30}
                className="input"
              />
            </Field>

            <Field label="Set Başına Atış" error={errors.arrows_per_set?.message}>
              <select
                {...register('arrows_per_set', { valueAsNumber: true })}
                className="input"
              >
                {ARROWS_PER_SET_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Hedef Tipi" error={errors.target_type?.message}>
              <select {...register('target_type')} className="input">
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TARGET_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mesafe (m)" error={errors.distance_meters?.message}>
              <input
                {...register('distance_meters', { valueAsNumber: true })}
                type="number"
                step="0.1"
                min={0.1}
                max={200}
                className="input"
              />
            </Field>
          </div>

          {submitError && (
            <div className="rounded-md bg-red-50 text-red-700 text-sm p-3">
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 text-white py-2.5 rounded-md font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Oluşturuluyor…' : 'Turnuvayı Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
