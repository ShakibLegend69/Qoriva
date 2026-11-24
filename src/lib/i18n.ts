import type { Locale } from '../types/qorvia';

export interface UiCopy {
  brandName: string;
  tagline: string;
  attributionBanner: string;
  nav: {
    technology: string;
    education: string;
    digitalSkills: string;
    generalKnowledge: string;
    latest: string;
    featured: string;
    trending: string;
    archive: string;
    about: string;
    admin: string;
    searchPlaceholder: string;
    searchButton: string;
    menuLabel: string;
    closeMenu: string;
  };
  hero: {
    kicker: string;
    headline: string;
    subheadline: string;
    primaryCta: string;
    secondaryCta: string;
    leadStoryLabel: string;
  };
  sections: {
    featuredHeading: string;
    latestHeading: string;
    categoriesHeading: string;
    trendingHeading: string;
    recommendedHeading: string;
    viewAll: string;
    readArticle: string;
    minRead: string;
    viewsLabel: string;
    publishedLabel: string;
    updatedLabel: string;
    tableOfContents: string;
    sourcesHeading: string;
    sourcesNote: string;
    accessedLabel: string;
    relatedHeading: string;
    shareHeading: string;
    copyLink: string;
    copied: string;
    readInOtherLang: string;
    subcategoriesLabel: string;
    allSubcategories: string;
    noArticlesFound: string;
    resetFilters: string;
    advertisementLabel: string;
    adSlotUnconfigured: string;
  };
  newsletter: {
    heading: string;
    description: string;
    emailPlaceholder: string;
    submit: string;
    successMessage: string;
    invalidEmail: string;
  };
  footer: {
    mission: string;
    sectionsHeading: string;
    publicationHeading: string;
    legalHeading: string;
    links: {
      about: string;
      contact: string;
      editorialPolicy: string;
      correctionsPolicy: string;
      advertise: string;
      privacy: string;
      terms: string;
      sitemap: string;
    };
    copyright: string;
  };
  pages: {
    searchTitle: string;
    searchSubtitle: string;
    latestTitle: string;
    featuredTitle: string;
    trendingTitle: string;
    archiveTitle: string;
    notFoundTitle: string;
    notFoundBody: string;
    backHome: string;
  };
}

export const UI_COPY: Record<Locale, UiCopy> = {
  en: {
    brandName: 'QORVIA',
    tagline: 'Discover More. Understand Better.',
    attributionBanner: 'THIS WEBSITE IS CREATED BY SHAKIB',
    nav: {
      technology: 'Technology & AI',
      education: 'Education',
      digitalSkills: 'Digital Skills',
      generalKnowledge: 'Knowledge',
      latest: 'Latest',
      featured: 'Featured',
      trending: 'Trending',
      archive: 'Archive',
      about: 'About',
      admin: 'Sign In',
      searchPlaceholder: 'Search articles, topics, or guides...',
      searchButton: 'Search',
      menuLabel: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
    },
    hero: {
      kicker: 'Bilingual Editorial Knowledge Platform',
      headline: 'Discover More. Understand Better.',
      subheadline:
        'Rigorous explainers, verified study guides, and practical technology research crafted separately for international and Bangladeshi readers.',
      primaryCta: 'Explore Latest Editions',
      secondaryCta: 'Read Bengali Edition',
      leadStoryLabel: 'Lead Feature',
    },
    sections: {
      featuredHeading: 'Featured Analysis',
      latestHeading: 'Latest Publications',
      categoriesHeading: 'Editorial Departments',
      trendingHeading: 'Most Read Across QORVIA',
      recommendedHeading: 'Recommended Reading',
      viewAll: 'View all',
      readArticle: 'Read article',
      minRead: 'min read',
      viewsLabel: 'reads',
      publishedLabel: 'Published',
      updatedLabel: 'Updated',
      tableOfContents: 'In This Article',
      sourcesHeading: 'Verified Source References',
      sourcesNote:
        'Every factual claim is traced to primary documentation or peer-reviewed material with recorded access dates.',
      accessedLabel: 'Accessed',
      relatedHeading: 'Related Reading',
      shareHeading: 'Share This Piece',
      copyLink: 'Copy link',
      copied: 'Link copied',
      readInOtherLang: 'বাংলায় পড়ুন',
      subcategoriesLabel: 'Topics',
      allSubcategories: 'All topics',
      noArticlesFound: 'No articles matched your current filters.',
      resetFilters: 'Reset filters',
      advertisementLabel: 'Advertisement',
      adSlotUnconfigured: 'Sponsored placement reserved for QORVIA publishing partners.',
    },
    newsletter: {
      heading: 'The QORVIA Weekly Brief',
      description:
        'Receive curated technology explainers, study frameworks, and practical research every Friday. Separate English and Bengali editions.',
      emailPlaceholder: 'Enter your email address',
      submit: 'Subscribe',
      successMessage: 'You are subscribed to the English weekly briefing.',
      invalidEmail: 'Please enter a valid email address.',
    },
    footer: {
      mission:
        'QORVIA is an independent bilingual knowledge publication delivering verified, accessible journalism and learning frameworks in English and Bengali.',
      sectionsHeading: 'Departments',
      publicationHeading: 'Publication',
      legalHeading: 'Standards & Legal',
      links: {
        about: 'About Us',
        contact: 'Contact',
        editorialPolicy: 'Editorial Policy',
        correctionsPolicy: 'Corrections Policy',
        advertise: 'Advertise With Us',
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions',
        sitemap: 'Sitemap',
      },
      copyright: 'QORVIA Knowledge Platform. Editorial Edition.',
    },
    pages: {
      searchTitle: 'Search QORVIA Archive',
      searchSubtitle: 'Filter verified explainers, study guides, and technical deep dives.',
      latestTitle: 'Latest Articles',
      featuredTitle: 'Featured Reports',
      trendingTitle: 'Trending by Reader Engagement',
      archiveTitle: 'Editorial Archive',
      notFoundTitle: 'Page Not Found',
      notFoundBody: 'The requested article or route does not exist in this edition.',
      backHome: 'Return to Homepage',
    },
  },
  bn: {
    brandName: 'QORVIA',
    tagline: 'আরও জানুন। আরও ভালোভাবে বুঝুন।',
    attributionBanner: 'THIS WEBSITE IS CREATED BY SHAKIB',
    nav: {
      technology: 'প্রযুক্তি ও এআই',
      education: 'শিক্ষা',
      digitalSkills: 'ডিজিটাল দক্ষতা',
      generalKnowledge: 'সাধারণ জ্ঞান',
      latest: 'সর্বশেষ',
      featured: 'বিশেষ প্রতিবেদন',
      trending: 'জনপ্রিয়',
      archive: 'আর্কাইভ',
      about: 'আমাদের সম্পর্কে',
      admin: 'লগইন',
      searchPlaceholder: 'নিবন্ধ, বিষয় বা গাইড খুঁজুন...',
      searchButton: 'অনুসন্ধান',
      menuLabel: 'নেভিগেশন মেনু খুলুন',
      closeMenu: 'নেভিগেশন মেনু বন্ধ করুন',
    },
    hero: {
      kicker: 'দ্বিভাষিক জ্ঞান ও তথ্য প্ল্যাটফর্ম',
      headline: 'আরও জানুন। আরও ভালোভাবে বুঝুন।',
      subheadline:
        'আন্তর্জাতিক ও বাংলাদেশি পাঠকদের জন্য স্বতন্ত্রভাবে প্রস্তুতকৃত তথ্যনির্ভর বিশ্লেষণ, শিক্ষণ নির্দেশিকা এবং ব্যবহারিক প্রযুক্তি গবেষণা।',
      primaryCta: 'সর্বশেষ প্রকাশনা দেখুন',
      secondaryCta: 'ইংরেজি সংস্করণ পড়ুন',
      leadStoryLabel: 'প্রধান নিবন্ধ',
    },
    sections: {
      featuredHeading: 'বিশেষ বিশ্লেষণ',
      latestHeading: 'সর্বশেষ প্রকাশিত নিবন্ধ',
      categoriesHeading: 'সম্পাদকীয় বিভাগসমূহ',
      trendingHeading: 'সর্বাধিক পঠিত নিবন্ধ',
      recommendedHeading: 'পাঠকের জন্য সুপারিশকৃত',
      viewAll: 'সব দেখুন',
      readArticle: 'নিবন্ধ পড়ুন',
      minRead: 'মিনিট পাঠ',
      viewsLabel: 'পাঠক',
      publishedLabel: 'প্রকাশিত',
      updatedLabel: 'হালনাগাদ',
      tableOfContents: 'নিবন্ধের সূচিপত্র',
      sourcesHeading: 'যাচাইকৃত তথ্যসূত্র',
      sourcesNote:
        'প্রতিটি তথ্যমূলক বক্তব্য প্রাথমিক নথি বা নির্ভরযোগ্য গবেষণাপত্রের সঙ্গে সংযুক্ত এবং সংগ্রহের তারিখ সংরক্ষিত।',
      accessedLabel: 'সংগ্রহের তারিখ',
      relatedHeading: 'সম্পর্কিত নিবন্ধ',
      shareHeading: 'শেয়ার করুন',
      copyLink: 'লিঙ্ক কপি করুন',
      copied: 'লিঙ্ক কপি হয়েছে',
      readInOtherLang: 'Read in English',
      subcategoriesLabel: 'উপ-বিভাগ',
      allSubcategories: 'সকল বিষয়',
      noArticlesFound: 'আপনার নির্বাচিত ফিল্টারের সঙ্গে কোনো নিবন্ধ মেলেনি।',
      resetFilters: 'ফিল্টার রিসেট করুন',
      advertisementLabel: 'বিজ্ঞাপন',
      adSlotUnconfigured: 'QORVIA প্রকাশনা অংশীদারদের জন্য সংরক্ষিত বিজ্ঞাপন স্থান।',
    },
    newsletter: {
      heading: 'QORVIA সাপ্তাহিক সংকলন',
      description:
        'প্রতি শুক্রবার প্রযুক্তি বিশ্লেষণ, কার্যকর পড়াশোনার কৌশল এবং নির্ভরযোগ্য গবেষণা সারসংক্ষেপ সরাসরি আপনার ইমেইলে পান।',
      emailPlaceholder: 'আপনার ইমেইল ঠিকানা লিখুন',
      submit: 'সাবস্ক্রাইব করুন',
      successMessage: 'বাংলা সাপ্তাহিক সংস্করণে আপনার নিবন্ধন সম্পন্ন হয়েছে।',
      invalidEmail: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।',
    },
    footer: {
      mission:
        'QORVIA একটি স্বাধীন দ্বিভাষিক জ্ঞান প্ল্যাটফর্ম, যা ইংরেজি এবং বাংলা ভাষায় যাচাইকৃত ও বোধগম্য বিশ্লেষণ প্রকাশ করে।',
      sectionsHeading: 'বিভাগসমূহ',
      publicationHeading: 'প্রকাশনা',
      legalHeading: 'নীতিমালা ও আইনি তথ্য',
      links: {
        about: 'আমাদের সম্পর্কে',
        contact: 'যোগাযোগ',
        editorialPolicy: 'সম্পাদকীয় নীতিমালা',
        correctionsPolicy: 'সংশোধন নীতিমালা',
        advertise: 'বিজ্ঞাপন দিন',
        privacy: 'গোপনীয়তা নীতি',
        terms: 'শর্তাবলী',
        sitemap: 'সাইটম্যাপ',
      },
      copyright: 'QORVIA জ্ঞান প্ল্যাটফর্ম। সম্পাদকীয় সংস্করণ।',
    },
    pages: {
      searchTitle: 'QORVIA আর্কাইভ অনুসন্ধান',
      searchSubtitle: 'যাচাইকৃত বিশ্লেষণ, শিক্ষণ নির্দেশিকা এবং প্রযুক্তি নিবন্ধ খুঁজুন।',
      latestTitle: 'সর্বশেষ নিবন্ধসমূহ',
      featuredTitle: 'নির্বাচিত প্রতিবেদন',
      trendingTitle: 'পাঠকের আগ্রহে শীর্ষ নিবন্ধ',
      archiveTitle: 'সম্পাদকীয় আর্কাইভ',
      notFoundTitle: 'পৃষ্ঠাটি পাওয়া যায়নি',
      notFoundBody: 'অনুরোধকৃত নিবন্ধ বা ঠিকানাটি এই সংস্করণে খুঁজে পাওয়া যায়নি।',
      backHome: 'প্রথম পাতায় ফিরে যান',
    },
  },
};

export function formatLocalizedDate(isoDate: string, locale: Locale): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
