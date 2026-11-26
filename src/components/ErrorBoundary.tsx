import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'خطای غیرمنتظره رخ داد.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-[#0B0B0C] flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full border border-neutral-200 p-8 text-center space-y-4">
            <h2 className="font-display text-2xl font-semibold">RADMANESH FASHION</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              در بارگذاری بخش فروشگاه مشکلی پیش آمد. لطفاً صفحه را تازه کنید یا دوباره تلاش نمایید.
            </p>
            <p className="text-xs text-neutral-400 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-[#C8A24A] text-[#0B0B0C] text-sm font-semibold hover:bg-[#b5913d] transition-colors"
            >
              تازه‌سازی صفحه
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
