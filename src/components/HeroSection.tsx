import { HERO_BANNER_IMAGE } from '../data/seedCatalog';
import { TRANSLATIONS } from '../i18n/translations';
import type { Language } from '../types';

interface HeroSectionProps {
  lang: Language;
}

export function HeroSection({ lang }: HeroSectionProps) {
  const t = TRANSLATIONS[lang];

  return (
    <section id="collection" className="bg-[#0B0B0C] text-white">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
        {/* Editorial Copy Column */}
        <div className="lg:col-span-5 px-6 sm:px-10 py-12 lg:py-20 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/file_00000000b4ac81f49523277d654128bd_163e818d.png"
              alt="لوگوی رادمنش فیشن"
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-[#C8A24A]/60 bg-black shrink-0"
            />
            <div className="text-xs tracking-widest text-[#C8A24A] font-medium">
              RADMANESH FASHION · {t.slogan}
            </div>
          </div>

          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-tight text-white"
            style={{ textWrap: 'balance' }}
          >
            {t.heroHeadline}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-lg">
            {t.heroSubhead}
          </p>
        </div>

        {/* Full-Bleed Editorial Visual Anchor */}
        <div className="lg:col-span-7 relative min-h-[320px] sm:min-h-[420px] lg:min-h-[520px] overflow-hidden">
          <img
            src={HERO_BANNER_IMAGE}
            alt="Radmanesh Fashion Luxury Collection"
            referrerPolicy="no-referrer"
            className="w-full h-full lg:h-full object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C]/70 via-[#0B0B0C]/15 to-transparent pointer-events-none"
            aria-hidden="true"
          />
          <div className="absolute bottom-5 right-6 left-6 flex items-center justify-between text-xs text-neutral-200 border-t border-white/15 pt-3">
            <span>{t.afghanDeliveryTitle}</span>
            <span className="tabular-nums">+98 991 380 9403</span>
          </div>
        </div>
      </div>
    </section>
  );
}
