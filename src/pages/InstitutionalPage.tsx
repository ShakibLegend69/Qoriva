import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Article, Category, Locale } from '../types/qorvia';
import { buildArticlePath, buildCategoryPath } from '../lib/routing';

export type InstitutionalPageType =
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'editorial-policy'
  | 'corrections-policy'
  | 'advertise'
  | 'sitemap';

interface InstitutionalPageProps {
  page: InstitutionalPageType;
  locale: Locale;
  categories: Category[];
  articles: Article[];
  onNavigate: (path: string) => void;
}

export function InstitutionalPage({
  page,
  locale,
  categories,
  articles,
  onNavigate,
}: InstitutionalPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<'idle' | 'submitting' | 'error' | 'sent'>('idle');

  const isBn = locale === 'bn';

  const handleLink = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(path);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || message.trim().length < 10) {
      setFormState('error');
      return;
    }
    setFormState('submitting');
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          locale,
        }),
      });
      if (!res.ok) {
        setFormState('error');
        return;
      }
      setFormState('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setFormState('error');
    }
  };

  if (page === 'sitemap') {
    const localeArticles = articles.filter((a) => a.locale === locale && a.status === 'published');
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <header className="border-b border-black/10 dark:border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF]">
              {isBn ? 'QORVIA সাইটম্যাপ' : 'QORVIA HTML Sitemap'}
            </h1>
            <p className="mt-2 text-sm text-black/65 dark:text-[#A5AAB4]">
              {isBn
                ? 'ইংরেজি ও বাংলা সংস্করণের সকল বিভাগ, প্রাতিষ্ঠানিক পৃষ্ঠা এবং প্রকাশিত নিবন্ধের তালিকা।'
                : 'Complete directory of editorial departments, institutional pages, and published articles.'}
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-transparent-black px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
          >
            XML Sitemap (/sitemap.xml)
          </a>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="space-y-4">
            <h2 className="font-editorial text-xl font-semibold">
              {isBn ? 'সম্পাদকীয় বিভাগসমূহ' : 'Editorial Departments'}
            </h2>
            <ul className="space-y-3 text-sm">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a
                    href={buildCategoryPath(locale, cat.slug)}
                    onClick={handleLink(buildCategoryPath(locale, cat.slug))}
                    className="font-semibold text-[#4263EB] dark:text-[#748FFC] hover:underline"
                  >
                    {cat.name[locale]}
                  </a>
                  <ul className="mt-1 pl-4 space-y-1 text-black/65 dark:text-[#A5AAB4]">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <a
                          href={buildCategoryPath(locale, cat.slug, sub.slug)}
                          onClick={handleLink(buildCategoryPath(locale, cat.slug, sub.slug))}
                          className="hover:underline"
                        >
                          {sub.name[locale]}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-editorial text-xl font-semibold">
              {isBn ? 'প্রকাশিত নিবন্ধসমূহ' : 'Published Articles'}
            </h2>
            <ul className="space-y-2.5 text-sm">
              {localeArticles.map((art) => (
                <li key={art.articleId}>
                  <a
                    href={buildArticlePath(locale, art.slug)}
                    onClick={handleLink(buildArticlePath(locale, art.slug))}
                    className="text-[#101827] dark:text-[#F5F4EF] hover:text-[#4263EB] hover:underline"
                  >
                    {art.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  const contentMap: Record<
    Exclude<InstitutionalPageType, 'sitemap'>,
    { title: string; lead: string; paragraphs: string[] }
  > = {
    about: {
      title: isBn ? 'QORVIA সম্পর্কে' : 'About QORVIA',
      lead: isBn
        ? 'আরও জানুন। আরও ভালোভাবে বুঝুন — আন্তর্জাতিক মানের দ্বিভাষিক জ্ঞান ও তথ্য প্ল্যাটফর্ম।'
        : 'Discover More. Understand Better — an independent bilingual editorial knowledge platform serving global and Bangladeshi readers.',
      paragraphs: isBn
        ? [
            'QORVIA ইংরেজি এবং বাংলা ভাষায় স্বতন্ত্রভাবে সম্পাদিত প্রযুক্তি, শিক্ষা, ডিজিটাল দক্ষতা এবং গবেষণানির্ভর সাধারণ জ্ঞান প্রকাশ করে।',
            'আমাদের প্রতিটি নিবন্ধ প্রাথমিক নথি, শিক্ষণ বিজ্ঞান এবং যাচাইকৃত উৎসের ওপর ভিত্তি করে তৈরি হয় এবং প্রকাশের আগে মানব সম্পাদকের পর্যালোচনা অতিক্রম করে।',
          ]
        : [
            'QORVIA publishes independent, verified explainers across Technology & AI, Education & Learning, Digital Skills, and General Knowledge—crafted separately for English and Bengali readers.',
            'Rather than machine-translating articles blindly, QORVIA maintains linked bilingual editions via translationGroupId so each community receives culturally clear, technically accurate explanations.',
          ],
    },
    contact: {
      title: isBn ? 'যোগাযোগ করুন' : 'Contact QORVIA',
      lead: isBn
        ? 'সম্পাদকীয় প্রশ্ন, সংশোধনী বা প্রাতিষ্ঠানিক অংশীদারিত্বের জন্য আমাদের বার্তা পাঠান।'
        : 'Reach our editorial desk regarding factual queries, corrections, partnerships, or advertising inquiries.',
      paragraphs: isBn
        ? ['সাধারণ যোগাযোগ: editorial@qorvia.org']
        : ['Editorial & General Inquiries: editorial@qorvia.org'],
    },
    privacy: {
      title: isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy',
      lead: isBn
        ? 'পাঠকের তথ্য সুরক্ষা এবং ন্যূনতম ডেটা সংগ্রহের নীতিমালা।'
        : 'How QORVIA handles reader privacy, essential storage, and advertising disclosures.',
      paragraphs: isBn
        ? [
            'QORVIA অপ্রয়োজনীয় ব্যক্তিগত তথ্য সংগ্রহ করে না। নিউজলেটার বা যোগাযোগ ফর্মের তথ্য কেবল অনুরোধকৃত সেবা প্রদানের জন্য ব্যবহৃত হয়।',
            'অনুমোদিত বিজ্ঞাপন নেটওয়ার্ক (যেমন Google AdSense বা Monetag) কেবল প্রাসঙ্গিক বিজ্ঞাপন প্রদর্শনের জন্য নির্ধারিত নীতিমালা অনুযায়ী কাজ করে।',
          ]
        : [
            'QORVIA minimizes personal data collection. Information submitted through newsletter or contact forms is used solely to deliver the requested communication.',
            'Approved advertising integrations (such as Google AdSense, Monetag, or direct sponsorship placements) operate exclusively on public reading pages and never inside editorial administration routes.',
          ],
    },
    terms: {
      title: isBn ? 'ব্যবহারের শর্তাবলী' : 'Terms and Conditions',
      lead: isBn
        ? 'QORVIA প্ল্যাটফর্মের বিষয়বস্তু ব্যবহার ও মেধাস্বত্ব সংক্রান্ত শর্তাবলী।'
        : 'Guidelines governing the use of QORVIA educational articles, citations, and platform services.',
      paragraphs: isBn
        ? [
            'এই প্ল্যাটফর্মের সকল নিবন্ধ শিক্ষামূলক ও তথ্যগত উদ্দেশ্যে প্রকাশিত। উদ্ধৃতির ক্ষেত্রে QORVIA এবং মূল তথ্যসূত্র উল্লেখ করা আবশ্যক।',
          ]
        : [
            'All editorial materials published on QORVIA are provided for educational and informational understanding. Excerpts may be cited with clear attribution to QORVIA and the underlying primary sources.',
          ],
    },
    'editorial-policy': {
      title: isBn ? 'সম্পাদকীয় নীতিমালা' : 'Editorial Policy',
      lead: isBn
        ? 'তথ্য যাচাই, কৃত্রিম বুদ্ধিমত্তা সহায়তার সীমা এবং মানবিক তত্ত্বাবধানের মানদণ্ড।'
        : 'Our standards for primary source grounding, AI-assisted drafting safeguards, and mandatory human editorial review.',
      paragraphs: isBn
        ? [
            'QORVIA কখনোই যাচাই ছাড়া স্বয়ংক্রিয়ভাবে কোনো এআই খসড়া প্রকাশ করে না। প্রতিটি সময়নির্ভর তথ্যের জন্য নির্ভরযোগ্য প্রাথমিক উৎস ও সংগ্রহের তারিখ উল্লেখ করা বাধ্যতামূলক।',
            'যদি পর্যাপ্ত প্রমাণ না থাকে বা তথ্যের মধ্যে অসঙ্গতি দেখা যায়, তবে নিবন্ধটি প্রকাশ না করে মানব গবেষণার জন্য চিহ্নিত করা হয়।',
          ]
        : [
            'QORVIA never auto-publishes AI-assisted drafts. Every draft enters a human review queue where editors verify claims against primary sources, check publication dates, and audit Bengali Unicode clarity.',
            'Conflicting or insufficiently evidenced claims are explicitly flagged for manual research rather than smoothed over with speculative prose.',
          ],
    },
    'corrections-policy': {
      title: isBn ? 'সংশোধন নীতিমালা' : 'Corrections Policy',
      lead: isBn
        ? 'তথ্যগত ত্রুটি দ্রুত চিহ্নিতকরণ এবং স্বচ্ছভাবে সংশোধন করার প্রক্রিয়া।'
        : 'How QORVIA logs, verifies, and publicly documents factual updates and corrections.',
      paragraphs: isBn
        ? [
            'কোনো প্রকাশিত নিবন্ধে তথ্যগত ভুল পাওয়া গেলে তাৎক্ষণিকভাবে যাচাই করে নিবন্ধটি হালনাগাদ করা হয় এবং হালনাগাদের তারিখ প্রদর্শন করা হয়।',
          ]
        : [
            'When an error of fact is brought to our attention, editors verify the correction against primary documentation, update the article body, and record the revised updatedAt timestamp.',
          ],
    },
    advertise: {
      title: isBn ? 'QORVIA-তে বিজ্ঞাপন দিন' : 'Advertise With QORVIA',
      lead: isBn
        ? 'ইংরেজি ও বাংলা সংস্করণের পাঠকদের কাছে পৌঁছানোর স্বচ্ছ ও নিয়ন্ত্রিত বিজ্ঞাপন ব্যবস্থা।'
        : 'Transparent, non-intrusive sponsorship and programmatic placements across our English and Bengali knowledge editions.',
      paragraphs: isBn
        ? [
            'QORVIA হেডার, হোমপেজ, নিবন্ধের ভেতর এবং সাইডবারে নিয়ন্ত্রিত বিজ্ঞাপন স্লট সমর্থন করে। আমরা কখনোই বিভ্রান্তিকর পপআপ বা সম্পাদকীয় লেখার সাথে বিজ্ঞাপন মিশ্রিত করি না।',
            'QORVIA-এর নিয়ন্ত্রিত বিজ্ঞাপন ব্যবস্থায় Google AdSense, সরাসরি স্পনসর ব্যানার এবং প্রাসঙ্গিক পার্টনার প্লেসমেন্ট সমর্থিত।',
          ]
        : [
            'QORVIA offers clearly labeled Header, Homepage, Article Top, In-Article, Sidebar, and Article Bottom placements across separate English (/en/) and Bengali (/bn/) audiences.',
            'We maintain strict separation between editorial journalism and advertising—supporting Google AdSense, Direct Sponsored Campaigns, and Monetag zones without intrusive overlays or fake engagement metrics.',
          ],
    },
  };

  const doc = contentMap[page];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <header className="border-b border-black/10 dark:border-white/10 pb-6">
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#101827] dark:text-[#F5F4EF]">
          {doc.title}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-black/70 dark:text-white/75 leading-relaxed">
          {doc.lead}
        </p>
      </header>

      <div className="space-y-5 text-base leading-[1.8] text-[#101827]/90 dark:text-[#F5F4EF]/90">
        {doc.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {page === 'contact' && (
        <form
          onSubmit={handleContactSubmit}
          noValidate
          className="border border-black/10 dark:border-white/10 bg-[#F5F4EF]/60 dark:bg-white/[0.03] rounded-2xl p-6 sm:p-8 space-y-5"
        >
          <div>
            <label htmlFor="contact-name" className="block text-xs font-semibold mb-1.5">
              {isBn ? 'আপনার নাম' : 'Full Name'}
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formState !== 'idle') setFormState('idle');
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="block text-xs font-semibold mb-1.5">
              {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (formState !== 'idle') setFormState('idle');
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-xs font-semibold mb-1.5">
              {isBn ? 'বার্তা' : 'Message'}
            </label>
            <textarea
              id="contact-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formState !== 'idle') setFormState('idle');
              }}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={formState === 'submitting'}
            className="btn-transparent-black-solid px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            {formState === 'submitting'
              ? isBn
                ? 'পাঠানো হচ্ছে...'
                : 'Sending...'
              : isBn
                ? 'বার্তা পাঠান'
                : 'Send Message'}
          </button>

          {formState === 'error' && (
            <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
              {isBn
                ? 'অনুগ্রহ করে নাম, সঠিক ইমেইল এবং কমপক্ষে ১০ অক্ষরের বার্তা লিখুন।'
                : 'Please provide your name, a valid email address, and a message of at least 10 characters.'}
            </p>
          )}
          {formState === 'sent' && (
            <p
              role="status"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#22A06B]"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>
                {isBn
                  ? 'আপনার বার্তা গৃহীত হয়েছে। ধন্যবাদ।'
                  : 'Your inquiry has been recorded for the editorial team.'}
              </span>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
