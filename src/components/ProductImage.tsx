import { useEffect, useState } from 'react';
import { Shirt } from 'lucide-react';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-[#F3EFE6] via-[#EAE4D7] to-[#DFD7C4] flex flex-col items-center justify-center p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shirt className="w-8 h-8 text-[#8C6D23] mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium text-neutral-700 line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
