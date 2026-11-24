import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import type { Locale } from '../types/qorvia';
import { UI_COPY } from '../lib/i18n';

interface NewsletterSectionProps {
  locale: Locale;
}

export function NewsletterSection({ locale }: NewsletterSectionProps) {
  const copy = UI_COPY[locale].newsletter;
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, locale }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="border border-black/10 dark:border-white/10 bg-[#F5F4EF] dark:bg-[#11192B] rounded-2xl p-7 sm:p-10"
    >
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-[#4263EB] dark:text-[#748FFC] mb-2">
          <Mail className="w-4 h-4" aria-hidden="true" />
          <span>QORVIA</span>
        </div>
        <h2
          id="newsletter-heading"
          className="font-editorial text-2xl sm:text-3xl font-semibold text-[#101827] dark:text-[#F5F4EF] mb-3"
        >
          {copy.heading}
        </h2>
        <p className="text-sm sm:text-base text-black/70 dark:text-white/75 leading-relaxed mb-6">
          {copy.description}
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col sm:flex-row gap-3">
          <label htmlFor={`newsletter-email-${locale}`} className="sr-only">
            {copy.emailPlaceholder}
          </label>
          <input
            id={`newsletter-email-${locale}`}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
            placeholder={copy.emailPlaceholder}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm text-[#101827] dark:text-[#F5F4EF] placeholder:text-black/45 dark:placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4263EB]"
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="btn-transparent-black-solid min-h-[44px] px-6 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {status === 'submitting' ? (locale === 'bn' ? 'অপেক্ষা করুন...' : 'Subscribing...') : copy.submit}
          </button>
        </form>

        {status === 'error' && (
          <p role="alert" className="mt-3 text-xs font-medium text-red-700 dark:text-red-400">
            {copy.invalidEmail}
          </p>
        )}
        {status === 'success' && (
          <p
            role="status"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#22A06B]"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{copy.successMessage}</span>
          </p>
        )}
      </div>
    </section>
  );
}
