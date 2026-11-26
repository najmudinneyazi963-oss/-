import { useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { TRANSLATIONS } from '../i18n/translations';
import type { Language } from '../types';

interface SizeGuideModalProps {
  lang: Language;
  initialGender?: 'men' | 'women';
  onClose: () => void;
}

type MeasurementUnit = 'cm' | 'in';

interface MenSizeRow {
  intl: string;
  eu: string;
  us: string;
  chestCm: [number, number];
  waistCm: [number, number];
  shoulderCm: [number, number];
  sleeveCm: number;
}

interface WomenSizeRow {
  intl: string;
  eu: string;
  us: string;
  bustCm: [number, number];
  waistCm: [number, number];
  hipsCm: [number, number];
}

const MEN_SIZE_CHART: MenSizeRow[] = [
  { intl: 'S', eu: '46', us: '36', chestCm: [88, 93], waistCm: [76, 80], shoulderCm: [43, 44], sleeveCm: 62 },
  { intl: 'M', eu: '48', us: '38', chestCm: [94, 99], waistCm: [81, 85], shoulderCm: [45, 46], sleeveCm: 63.5 },
  { intl: 'L', eu: '50', us: '40', chestCm: [100, 105], waistCm: [86, 91], shoulderCm: [47, 48], sleeveCm: 65 },
  { intl: 'XL', eu: '52', us: '42', chestCm: [106, 111], waistCm: [92, 97], shoulderCm: [49, 50], sleeveCm: 66.5 },
  { intl: 'XXL', eu: '54', us: '44', chestCm: [112, 118], waistCm: [98, 104], shoulderCm: [51, 52], sleeveCm: 68 },
];

const WOMEN_SIZE_CHART: WomenSizeRow[] = [
  { intl: 'XS', eu: '34', us: '2', bustCm: [80, 83], waistCm: [62, 65], hipsCm: [88, 91] },
  { intl: 'S', eu: '36', us: '4–6', bustCm: [84, 87], waistCm: [66, 69], hipsCm: [92, 95] },
  { intl: 'M', eu: '38', us: '8–10', bustCm: [88, 93], waistCm: [70, 75], hipsCm: [96, 101] },
  { intl: 'L', eu: '40', us: '12', bustCm: [94, 99], waistCm: [76, 81], hipsCm: [102, 107] },
  { intl: 'XL', eu: '42', us: '14', bustCm: [100, 106], waistCm: [82, 88], hipsCm: [108, 114] },
  { intl: 'XXL', eu: '44', us: '16', bustCm: [107, 113], waistCm: [89, 95], hipsCm: [115, 121] },
];

function formatMeasurement(value: number | [number, number], unit: MeasurementUnit): string {
  const convert = (cm: number) =>
    unit === 'cm' ? String(cm) : (cm / 2.54).toFixed(1).replace(/\.0$/, '');
  if (Array.isArray(value)) {
    return `${convert(value[0])}–${convert(value[1])}`;
  }
  return convert(value);
}

export function SizeGuideModal({
  lang,
  initialGender = 'men',
  onClose,
}: SizeGuideModalProps) {
  const t = TRANSLATIONS[lang];
  const [gender, setGender] = useState<'men' | 'women'>(initialGender);
  const [unit, setUnit] = useState<MeasurementUnit>('cm');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const unitLabel = unit === 'cm' ? (lang === 'fa' ? 'سانتی‌متر' : 'سانتي‌متر') : lang === 'fa' ? 'اینچ' : 'انچ';

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t.sizeGuideTitle}
      onClick={onClose}
    >
      <div
        className="bg-white text-[#0B0B0C] w-full max-w-3xl border border-neutral-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B0B0C] text-white">
          <div className="flex items-center gap-2.5">
            <Ruler className="w-5 h-5 text-[#C8A24A]" />
            <h2 className="text-base font-semibold">{t.sizeGuideTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 text-neutral-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Controls: Men/Women Switch + cm/in Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
            <div className="inline-flex border border-neutral-300 bg-white p-0.5" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={gender === 'men'}
                onClick={() => setGender('men')}
                className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  gender === 'men'
                    ? 'bg-[#0B0B0C] text-white'
                    : 'text-neutral-700 hover:text-[#0B0B0C]'
                }`}
              >
                {t.categories.men}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={gender === 'women'}
                onClick={() => setGender('women')}
                className={`px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  gender === 'women'
                    ? 'bg-[#0B0B0C] text-white'
                    : 'text-neutral-700 hover:text-[#0B0B0C]'
                }`}
              >
                {t.categories.women}
              </button>
            </div>

            <div className="inline-flex border border-neutral-300 bg-white p-0.5" role="group">
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  unit === 'cm'
                    ? 'bg-[#C8A24A] text-[#0B0B0C]'
                    : 'text-neutral-700 hover:text-[#0B0B0C]'
                }`}
              >
                CM · {lang === 'fa' ? 'سانتی‌متر' : 'سانتي‌متر'}
              </button>
              <button
                type="button"
                onClick={() => setUnit('in')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  unit === 'in'
                    ? 'bg-[#C8A24A] text-[#0B0B0C]'
                    : 'text-neutral-700 hover:text-[#0B0B0C]'
                }`}
              >
                IN · {lang === 'fa' ? 'اینچ' : 'انچ'}
              </button>
            </div>
          </div>

          {/* Measurement Conversion Chart */}
          <div className="overflow-x-auto border border-neutral-200">
            {gender === 'men' ? (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-neutral-200 text-xs text-neutral-600">
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? 'سایز بین‌المللی' : 'نړیواله اندازه'}
                    </th>
                    <th className="py-3 px-4 font-semibold">EU / IT</th>
                    <th className="py-3 px-4 font-semibold">US / UK</th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `دور سینه (${unitLabel})` : `د سینې اندازه (${unitLabel})`}
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `دور کمر (${unitLabel})` : `د ملا اندازه (${unitLabel})`}
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `عرض شانه (${unitLabel})` : `د اوږې پلنوالی (${unitLabel})`}
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `قد آستین (${unitLabel})` : `د لستوڼي اوږدوالی (${unitLabel})`}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 tabular-nums">
                  {MEN_SIZE_CHART.map((row) => (
                    <tr key={row.intl} className="hover:bg-[#FAF9F6]/70">
                      <td className="py-3 px-4 font-bold text-[#0B0B0C]" dir="ltr">
                        {row.intl}
                      </td>
                      <td className="py-3 px-4 text-neutral-700" dir="ltr">
                        {row.eu}
                      </td>
                      <td className="py-3 px-4 text-neutral-700" dir="ltr">
                        {row.us}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.chestCm, unit)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.waistCm, unit)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.shoulderCm, unit)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.sleeveCm, unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-neutral-200 text-xs text-neutral-600">
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? 'سایز بین‌المللی' : 'نړیواله اندازه'}
                    </th>
                    <th className="py-3 px-4 font-semibold">EU</th>
                    <th className="py-3 px-4 font-semibold">US</th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `دور سینه (${unitLabel})` : `د سینې اندازه (${unitLabel})`}
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `دور کمر (${unitLabel})` : `د ملا اندازه (${unitLabel})`}
                    </th>
                    <th className="py-3 px-4 font-semibold">
                      {lang === 'fa' ? `دور باسن (${unitLabel})` : `د کمر لاندې اندازه (${unitLabel})`}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 tabular-nums">
                  {WOMEN_SIZE_CHART.map((row) => (
                    <tr key={row.intl} className="hover:bg-[#FAF9F6]/70">
                      <td className="py-3 px-4 font-bold text-[#0B0B0C]" dir="ltr">
                        {row.intl}
                      </td>
                      <td className="py-3 px-4 text-neutral-700" dir="ltr">
                        {row.eu}
                      </td>
                      <td className="py-3 px-4 text-neutral-700" dir="ltr">
                        {row.us}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.bustCm, unit)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.waistCm, unit)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800" dir="ltr">
                        {formatMeasurement(row.hipsCm, unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Measurement Instructions */}
          <div className="border border-neutral-200 bg-[#FAF9F6] p-4 space-y-2 text-xs text-neutral-700 leading-relaxed">
            <div className="font-semibold text-[#0B0B0C]">
              {lang === 'fa' ? 'نکات دقیق اندازه‌گیری:' : 'د دقیقې اندازې اخیستلو لارښوونې:'}
            </div>
            <p>
              {lang === 'fa'
                ? 'برای انتخاب سایز مناسب، متر را به‌صورت افقی و بدون کشش دور پهن‌ترین قسمت سینه، باریک‌ترین بخش کمر و پهن‌ترین بخش باسن قرار دهید. اگر اندازه شما بین دو سایز است، برای تن‌خور راحت‌تر سایز بزرگ‌تر را انتخاب کنید.'
                : 'د سمې اندازې ټاکلو لپاره متر په افقي ډول د سینې پر پراخه برخه، د ملا پر نرۍ برخه او د لاندې برخې پر پراخه ځای کېږدئ. که ستاسو اندازه د دوو اندازو ترمنځ وي، لویه اندازه غوره کړئ.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
