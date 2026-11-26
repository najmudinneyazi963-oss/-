import type { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';

interface NavbarProps {
  lang: Language;
  activeView: 'store' | 'admin';
  userDisplayName?: string;
  onNavigateView: (view: 'store' | 'admin', sectionId?: string) => void;
  onOpenTracking: () => void;
  onOpenAccount: () => void;
}

export function Navbar({
  lang,
  activeView,
  userDisplayName,
  onNavigateView,
  onOpenTracking,
  onOpenAccount,
}: NavbarProps) {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0C] text-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark + Exclusive Monogram */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateView('store', 'top');
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]"
        >
          <img
            src="/assets/aistudio/file_00000000b4ac81f49523277d654128bd_163e818d.png"
            alt="رادمنش فیشن — Radmanesh Fashion"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full object-cover border border-[#C8A24A]/60 bg-black shrink-0"
          />
          <span className="font-display text-base sm:text-lg font-semibold tracking-wider text-white">
            RADMANESH FASHION
          </span>
        </a>

        {/* Zone 2: 5 Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-300">
          <a
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              onNavigateView('store', 'collection');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b ${
              activeView === 'store'
                ? 'border-transparent hover:border-[#C8A24A]'
                : 'border-transparent hover:border-[#C8A24A]'
            }`}
          >
            {t.navCollection}
          </a>
          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              onNavigateView('store', 'catalog');
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8A24A]"
          >
            {t.navProducts}
          </a>
          <button
            type="button"
            onClick={onOpenTracking}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8A24A] cursor-pointer"
          >
            {t.navTrack}
          </button>
          <button
            type="button"
            onClick={onOpenAccount}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#C8A24A] cursor-pointer truncate max-w-[140px]"
          >
            {userDisplayName || t.navAccount}
          </button>
          <button
            type="button"
            onClick={() => onNavigateView('admin')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b cursor-pointer ${
              activeView === 'admin'
                ? 'text-[#C8A24A] border-[#C8A24A]'
                : 'hover:text-white border-transparent hover:border-[#C8A24A]'
            }`}
          >
            {t.navAdmin}
          </button>
        </nav>
      </div>
      <div className="divider-3d-multi w-full" aria-hidden="true" />
    </header>
  );
}
