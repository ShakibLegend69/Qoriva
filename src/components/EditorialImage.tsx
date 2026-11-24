import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface EditorialImageProps {
  src: string;
  alt: string;
  caption?: string;
  aspectClass?: string;
  className?: string;
  priority?: boolean;
}

export function EditorialImage({
  src,
  alt,
  caption,
  aspectClass = 'aspect-[4/3]',
  className = '',
  priority = false,
}: EditorialImageProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <figure className={`m-0 ${className}`}>
      <div
        className={`relative overflow-hidden bg-[#F5F4EF] dark:bg-[#162033] border border-black/10 dark:border-white/10 ${aspectClass}`}
      >
        {!hasError && src ? (
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F5F4EF] to-[#E8E6DF] dark:from-[#162033] dark:to-[#101827]">
            <ImageIcon className="w-7 h-7 text-black/40 dark:text-white/40 mb-2" aria-hidden="true" />
            <span className="text-xs font-medium text-black/60 dark:text-white/60 max-w-xs line-clamp-2">
              {alt}
            </span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2.5 text-xs italic text-black/60 dark:text-[#A5AAB4] leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
