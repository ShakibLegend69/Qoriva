import type { Article, Author, Category } from '../types/qorvia';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'technology',
    slug: 'technology',
    name: {
      en: 'Technology & AI',
      bn: 'প্রযুক্তি ও এআই',
    },
    shortName: {
      en: 'Technology & AI',
      bn: 'প্রযুক্তি ও এআই',
    },
    description: {
      en: 'Deep technical explainers on machine intelligence, software architecture, internet protocols, and digital security.',
      bn: 'কৃত্রিম বুদ্ধিমত্তা, সফটওয়্যার স্থাপত্য, ইন্টারনেট প্রযুক্তি এবং সাইবার নিরাপত্তা বিষয়ক তথ্যনির্ভর বিশ্লেষণ।',
    },
    subcategories: [
      {
        id: 'tech-ai',
        slug: 'artificial-intelligence',
        categorySlug: 'technology',
        name: { en: 'Artificial Intelligence', bn: 'কৃত্রিম বুদ্ধিমত্তা' },
        description: {
          en: 'Model architectures, evaluation benchmarks, and applied reasoning systems.',
          bn: 'মডেল কাঠামো, মূল্যায়ন মানদণ্ড এবং ব্যবহারিক এআই ব্যবস্থা।',
        },
      },
      {
        id: 'tech-software',
        slug: 'software-and-applications',
        categorySlug: 'technology',
        name: { en: 'Software & Applications', bn: 'সফটওয়্যার ও অ্যাপ্লিকেশন' },
        description: {
          en: 'Modern engineering tools, operating systems, and open-source ecosystems.',
          bn: 'আধুনিক প্রকৌশল টুলস, অপারেটিং সিস্টেম এবং ওপেন-সোর্স ইকোসিস্টেম।',
        },
      },
      {
        id: 'tech-internet',
        slug: 'internet-technology',
        categorySlug: 'technology',
        name: { en: 'Internet Technology', bn: 'ইন্টারনেট প্রযুক্তি' },
        description: {
          en: 'Networking infrastructure, DNS, HTTP/3, and distributed web resilience.',
          bn: 'নেটওয়ার্কিং অবকাঠামো, ডিএনএস, এবং আধুনিক ওয়েব প্রোটোকল।',
        },
      },
      {
        id: 'tech-security',
        slug: 'cybersecurity-education',
        categorySlug: 'technology',
        name: { en: 'Cybersecurity Education', bn: 'সাইবার নিরাপত্তা শিক্ষা' },
        description: {
          en: 'Threat modeling, cryptographic hygiene, and safe digital practices.',
          bn: 'হুমকি বিশ্লেষণ, এনক্রিপশন এবং নিরাপদ ডিজিটাল অভ্যাস।',
        },
      },
      {
        id: 'tech-emerging',
        slug: 'emerging-technologies',
        categorySlug: 'technology',
        name: { en: 'Emerging Technologies', bn: 'উদীয়মান প্রযুক্তি' },
        description: {
          en: 'Semiconductors, energy storage, and next-generation compute substrates.',
          bn: 'সেমিকন্ডাক্টর, শক্তি সংরক্ষণ এবং পরবর্তী প্রজন্মের কম্পিউটিং।',
        },
      },
    ],
  },
  {
    id: 'education',
    slug: 'education',
    name: {
      en: 'Education & Learning',
      bn: 'শিক্ষা ও শিখন',
    },
    shortName: {
      en: 'Education',
      bn: 'শিক্ষা',
    },
    description: {
      en: 'Evidence-based study methodologies, structured academic guides, and cross-disciplinary learning tools.',
      bn: 'গবেষণানির্ভর পড়াশোনার পদ্ধতি, একাডেমিক নির্দেশিকা এবং বিজ্ঞান ও ভাষা শিক্ষার কার্যকর কাঠামো।',
    },
    subcategories: [
      {
        id: 'edu-study',
        slug: 'study-guides',
        categorySlug: 'education',
        name: { en: 'Study Guides', bn: 'অধ্যয়ন নির্দেশিকা' },
        description: {
          en: 'Structured examination preparation and syllabus mapping.',
          bn: 'পরীক্ষা প্রস্তুতি ও সিলেবাস পরিকল্পনার সুসংগঠিত রূপরেখা।',
        },
      },
      {
        id: 'edu-techniques',
        slug: 'learning-techniques',
        categorySlug: 'education',
        name: { en: 'Learning Techniques', bn: 'শেখার কৌশল' },
        description: {
          en: 'Spaced repetition, active recall, and cognitive load management.',
          bn: 'স্পেসড রিপিটিশন, অ্যাক্টিভ রিকল এবং স্মৃতিশক্তি বিকাশের বৈজ্ঞানিক পদ্ধতি।',
        },
      },
      {
        id: 'edu-science',
        slug: 'science-education',
        categorySlug: 'education',
        name: { en: 'Science Education', bn: 'বিজ্ঞান শিক্ষা' },
        description: {
          en: 'Core physics, chemistry, and biological reasoning for learners.',
          bn: 'পদার্থবিজ্ঞান, রসায়ন ও জীববিজ্ঞানের মৌলিক ধারণার স্পষ্ট ব্যাখ্যা।',
        },
      },
      {
        id: 'edu-academic',
        slug: 'academic-resources',
        categorySlug: 'education',
        name: { en: 'Academic Resources', bn: 'একাডেমিক রিসোর্স' },
        description: {
          en: 'Research citation standards, open libraries, and scholarship guides.',
          bn: 'গবেষণা তথ্যসূত্র, উন্মুক্ত গ্রন্থাগার এবং বৃত্তি নির্দেশিকা।',
        },
      },
      {
        id: 'edu-language',
        slug: 'language-learning',
        categorySlug: 'education',
        name: { en: 'Language Learning', bn: 'ভাষা শিক্ষা' },
        description: {
          en: 'Bilingual fluency, academic writing, and structured comprehension.',
          bn: 'দ্বিভাষিক দক্ষতা, প্রাতিষ্ঠানিক লিখন এবং পাঠবোধ উন্নয়ন।',
        },
      },
    ],
  },
  {
    id: 'digital-skills',
    slug: 'digital-skills',
    name: {
      en: 'Digital Skills',
      bn: 'ডিজিটাল দক্ষতা',
    },
    shortName: {
      en: 'Digital Skills',
      bn: 'ডিজিটাল দক্ষতা',
    },
    description: {
      en: 'Practical guides for software engineering, modern web systems, independent remote work, and sustainable productivity.',
      bn: 'ওয়েব ডেভেলপমেন্ট, প্রোগ্রামিং, ফ্রিল্যান্সিং ও ডিজিটাল কর্মজীবন গঠনের বাস্তবসম্মত নির্দেশিকা।',
    },
    subcategories: [
      {
        id: 'ds-web',
        slug: 'web-development',
        categorySlug: 'digital-skills',
        name: { en: 'Web Development', bn: 'ওয়েব ডেভেলপমেন্ট' },
        description: {
          en: 'Semantic HTML, TypeScript architecture, and performance engineering.',
          bn: 'আধুনিক ওয়েব আর্কিটেকচার, টাইপস্ক্রিপ্ট ও পারফরম্যান্স অপ্টিমাইজেশন।',
        },
      },
      {
        id: 'ds-prog',
        slug: 'programming',
        categorySlug: 'digital-skills',
        name: { en: 'Programming', bn: 'প্রোগ্রামিং' },
        description: {
          en: 'Algorithmic thinking, debugging practices, and clean code structure.',
          bn: 'অ্যালগরিদমিক চিন্তা, ডিবাগিং এবং পরিচ্ছন্ন কোড লেখার চর্চা।',
        },
      },
      {
        id: 'ds-freelance',
        slug: 'freelancing-education',
        categorySlug: 'digital-skills',
        name: { en: 'Freelancing Education', bn: 'ফ্রিল্যান্সিং শিক্ষা' },
        description: {
          en: 'Client scoping, contract ethics, and global remote collaboration.',
          bn: 'আন্তর্জাতিক ক্লায়েন্ট ব্যবস্থাপনা, চুক্তি ও দূরবর্তী কাজের পেশাদারিত্ব।',
        },
      },
      {
        id: 'ds-prod',
        slug: 'productivity',
        categorySlug: 'digital-skills',
        name: { en: 'Productivity', bn: 'কর্মদক্ষতা' },
        description: {
          en: 'Deep focus workflows, documentation habits, and team systems.',
          bn: 'গভীর মনোযোগের কর্মপ্রবাহ, নথিপত্র সংরক্ষণ এবং সময় ব্যবস্থাপনা।',
        },
      },
      {
        id: 'ds-careers',
        slug: 'digital-careers',
        categorySlug: 'digital-skills',
        name: { en: 'Digital Careers', bn: 'ডিজিটাল ক্যারিয়ার' },
        description: {
          en: 'Portfolio design, technical interviews, and long-term skill growth.',
          bn: 'পোর্টফোলিও নির্মাণ, কারিগরি সাক্ষাৎকার এবং দীর্ঘমেয়াদি দক্ষতা উন্নয়ন।',
        },
      },
    ],
  },
  {
    id: 'general-knowledge',
    slug: 'general-knowledge',
    name: {
      en: 'General Knowledge & How-to',
      bn: 'সাধারণ জ্ঞান ও ব্যবহারিক গাইড',
    },
    shortName: {
      en: 'Knowledge',
      bn: 'সাধারণ জ্ঞান',
    },
    description: {
      en: 'Clear, verified explanations of scientific phenomena, civic systems, everyday mechanics, and practical tutorials.',
      bn: 'বিজ্ঞান, দৈনন্দিন প্রযুক্তি, ইন্টারনেট ব্যবহার এবং গবেষণানির্ভর সাধারণ জ্ঞানের সহজবোধ্য ব্যাখ্যা।',
    },
    subcategories: [
      {
        id: 'gk-science',
        slug: 'science-explained',
        categorySlug: 'general-knowledge',
        name: { en: 'Science Explained', bn: 'বিজ্ঞানের ব্যাখ্যা' },
        description: {
          en: 'Optics, climate physics, and everyday scientific principles.',
          bn: 'আলো, জলবায়ু বিজ্ঞান এবং দৈনন্দিন জীবনের বৈজ্ঞানিক সূত্র।',
        },
      },
      {
        id: 'gk-everyday',
        slug: 'everyday-knowledge',
        categorySlug: 'general-knowledge',
        name: { en: 'Everyday Knowledge', bn: 'দৈনন্দিন জ্ঞান' },
        description: {
          en: 'Financial literacy, health literacy, and civic infrastructure.',
          bn: 'আর্থিক সচেতনতা, স্বাস্থ্যজ্ঞান এবং নাগরিক অবকাঠামো।',
        },
      },
      {
        id: 'gk-tutorials',
        slug: 'practical-tutorials',
        categorySlug: 'general-knowledge',
        name: { en: 'Practical Tutorials', bn: 'ব্যবহারিক টিউটোরিয়াল' },
        description: {
          en: 'Step-by-step guides for common digital and real-world workflows.',
          bn: 'নিত্যপ্রয়োজনীয় ডিজিটাল ও বাস্তব কাজের ধাপে ধাপে নির্দেশিকা।',
        },
      },
      {
        id: 'gk-internet',
        slug: 'internet-guides',
        categorySlug: 'general-knowledge',
        name: { en: 'Internet Guides', bn: 'ইন্টারনেট গাইড' },
        description: {
          en: 'Digital privacy settings, fact verification, and media literacy.',
          bn: 'অনলাইন গোপনীয়তা রক্ষা, তথ্য যাচাই এবং মিডিয়া সাক্ষরতা।',
        },
      },
      {
        id: 'gk-research',
        slug: 'research-based-explainers',
        categorySlug: 'general-knowledge',
        name: { en: 'Research-based Explainers', bn: 'গবেষণানির্ভর বিশ্লেষণ' },
        description: {
          en: 'Long-form contextual breakdowns grounded in primary public records.',
          bn: 'প্রাথমিক তথ্যসূত্রের ওপর ভিত্তি করে গভীর ও প্রাসঙ্গিক ব্যাখ্যা।',
        },
      },
    ],
  },
];

export const SEED_AUTHORS: Author[] = [
  {
    id: 'ananya-rahman',
    name: { en: 'Ananya Rahman', bn: 'অনন্যা রহমান' },
    role: {
      en: 'Senior Technology & AI Editor',
      bn: 'জ্যেষ্ঠ প্রযুক্তি ও এআই সম্পাদক',
    },
    bio: {
      en: 'Covers foundational machine learning architecture, open-source compute infrastructure, and digital literacy across South Asia and Europe.',
      bn: 'মেশিন লার্নিং স্থাপত্য, ওপেন-সোর্স অবকাঠামো এবং দক্ষিণ এশিয়ায় ডিজিটাল সাক্ষরতা নিয়ে নিয়মিত গবেষণা ও সম্পাদনা করেন।',
    },
    avatarUrl: '/src/assets/images/author_editorial_portrait_1795449988682.jpg',
    expertise: {
      en: ['Artificial Intelligence', 'Internet Infrastructure', 'Technical Journalism'],
      bn: ['কৃত্রিম বুদ্ধিমত্তা', 'ইন্টারনেট অবকাঠামো', 'প্রযুক্তি সাংবাদিকতা'],
    },
    location: { en: 'Dhaka & London', bn: 'ঢাকা ও লন্ডন' },
    joinedAt: '2025-02-10T00:00:00Z',
  },
  {
    id: 'tariq-mahmud',
    name: { en: 'Tariq Mahmud', bn: 'তারিক মাহমুদ' },
    role: {
      en: 'Education & Engineering Lead',
      bn: 'শিক্ষা ও প্রকৌশল বিভাগীয় প্রধান',
    },
    bio: {
      en: 'Researches evidence-based cognitive learning frameworks, web performance standards, and curriculum design for university students.',
      bn: 'বৈজ্ঞানিক শিক্ষণ পদ্ধতি, ওয়েব পারফরম্যান্স মানদণ্ড এবং বিশ্ববিদ্যালয় শিক্ষার্থীদের জন্য পাঠ্যক্রম নকশা নিয়ে কাজ করেন।',
    },
    avatarUrl: '/src/assets/images/author_editorial_portrait_1795449988682.jpg',
    expertise: {
      en: ['Learning Science', 'Web Architecture', 'Physics Education'],
      bn: ['শিক্ষণ বিজ্ঞান', 'ওয়েব আর্কিটেকচার', 'পদার্থবিজ্ঞান শিক্ষা'],
    },
    location: { en: 'Dhaka, Bangladesh', bn: 'ঢাকা, বাংলাদেশ' },
    joinedAt: '2025-04-18T00:00:00Z',
  },
];

/**
 * NOTE: Development Seed Catalog for Phase 1 UI/Routing demonstration.
 * In Phase 2, these records migrate to Cloud Firestore with live RBAC publishing.
 */
export const SEED_ARTICLES: Article[] = [
  {
    articleId: 'art-en-01',
    translationGroupId: 'grp-grounded-ai-systems',
    locale: 'en',
    title: 'How Source-Grounded Retrieval Reduces Factual Hallucinations in Modern AI',
    slug: 'how-source-grounded-retrieval-reduces-hallucinations',
    excerpt:
      'An architectural examination of why parametric language models invent citations—and how retrieval-augmented verification grounds claims in primary documents.',
    categoryId: 'technology',
    subcategorySlug: 'artificial-intelligence',
    tags: ['Retrieval', 'AI Verification', 'Language Models', 'Information Quality'],
    featuredImage: {
      src: '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
      alt: 'Researchers collaborating at sunlit oak tables inside an architectural research library',
      caption: 'Fig. 1 — Structured research environments pair human verification with indexed archival repositories.',
    },
    authorId: 'ananya-rahman',
    status: 'published',
    isFeatured: true,
    isRecommended: true,
    engagementScore: 4820,
    readingTimeMinutes: 7,
    publishedAt: '2026-11-18T09:00:00Z',
    updatedAt: '2026-11-20T14:30:00Z',
    seo: {
      metaTitle: 'How Source-Grounded Retrieval Reduces AI Hallucinations | QORVIA',
      metaDescription:
        'Explore how retrieval-augmented generation and structured citation verification lower factual errors in modern AI systems.',
      canonicalPath: '/en/article/how-source-grounded-retrieval-reduces-hallucinations',
    },
    sources: [
      {
        sourceId: 'src-01',
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        publisher: 'Proceedings of NeurIPS (Lewis et al.)',
        url: 'https://arxiv.org/abs/2005.11401',
        publishedAt: '2020-05-22',
        accessedAt: '2026-11-17',
      },
      {
        sourceId: 'src-02',
        title: 'NIST AI Risk Management Framework (AI RMF 1.0)',
        publisher: 'National Institute of Standards and Technology',
        url: 'https://www.nist.gov/itl/ai-risk-management-framework',
        publishedAt: '2023-01-26',
        accessedAt: '2026-11-17',
      },
    ],
    contentBlocks: [
      {
        id: 'sec-why-models-fabricate',
        type: 'heading',
        level: 2,
        text: 'Why Parametric Memory Alone Fails Verification',
      },
      {
        id: 'p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'Large language models encode statistical relationships across billions of tokens during pre-training, but those weights operate as compressed probability distributions rather than an indexed database. When asked for an obscure publication date, legislative clause, or local statistic, an ungrounded model predicts plausible-sounding tokens rather than retrieving an authoritative record.',
      },
      {
        id: 'p-2',
        type: 'paragraph',
        text: 'This distinction explains why fluent prose can still contain fabricated URLs or misattributed findings. Without an explicit retrieval layer and strict provenance rules, linguistic fluency masks evidentiary gaps.',
      },
      {
        id: 'q-1',
        type: 'quote',
        text: 'A URL attached to a generated paragraph is not proof of accuracy; verification requires inspecting the primary document, its publication timestamp, and whether the cited text supports the exact claim.',
        attribution: 'QORVIA Editorial Verification Standard',
      },
      {
        id: 'sec-grounded-pipeline',
        type: 'heading',
        level: 2,
        text: 'The Four Stages of Grounded Knowledge Synthesis',
      },
      {
        id: 'list-1',
        type: 'list',
        ordered: true,
        items: [
          'Query Decomposition: Separating time-sensitive empirical claims from stable conceptual definitions.',
          'Primary Source Retrieval: Fetching primary standards, peer-reviewed papers, or institutional records with recorded access timestamps.',
          'Structured Schema Extraction: Isolating verifiable facts, conflicting claims, and confidence boundaries into typed JSON fields.',
          'Human Editorial Gate: Requiring explicit reviewer approval before any synthesized draft reaches public readers.',
        ],
      },
      {
        id: 'tbl-1',
        type: 'table',
        headers: ['Knowledge Type', 'Verification Requirement', 'Failure Risk'],
        rows: [
          ['Time-Sensitive Policy / Metrics', 'Recent primary source + explicit date', 'Stale figures presented as current'],
          ['Evergreen Scientific Principles', 'Textbooks & peer-reviewed consensus', 'Oversimplified causal claims'],
          ['Regional Infrastructure Guides', 'Local official documentation', 'Unverified assumptions from other regions'],
        ],
      },
      {
        id: 'sec-editorial-boundary',
        type: 'heading',
        level: 2,
        text: 'Separating Assistance From Editorial Authority',
      },
      {
        id: 'callout-1',
        type: 'callout',
        tone: 'verification',
        title: 'Editorial Safeguard',
        text: 'When evidence across primary sources conflicts or remains insufficient, responsible knowledge platforms flag the topic for manual investigation rather than publishing a confident summary.',
      },
    ],
  },
  {
    articleId: 'art-bn-01',
    translationGroupId: 'grp-grounded-ai-systems',
    locale: 'bn',
    title: 'তথ্যসূত্র-ভিত্তিক অনুসন্ধান কীভাবে আধুনিক এআই-এর ভুল তথ্য কমাতে সাহায্য করে',
    slug: 'source-grounded-retrieval-reduces-ai-hallucinations-bn',
    excerpt:
      'ভাষা মডেল কেন অনেক সময় কাল্পনিক তথ্যসূত্র তৈরি করে এবং কীভাবে যাচাইকৃত নথির ওপর ভিত্তি করে নির্ভুল জ্ঞান উপস্থাপন করা যায় তার কারিগরি বিশ্লেষণ।',
    categoryId: 'technology',
    subcategorySlug: 'artificial-intelligence',
    tags: ['কৃত্রিম বুদ্ধিমত্তা', 'তথ্য যাচাই', 'রিট্রিভাল সিস্টেম', 'প্রযুক্তি'],
    featuredImage: {
      src: '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
      alt: 'গবেষণা গ্রন্থাগারে কাঠের টেবিলে গবেষকদের কাজের দৃশ্য',
      caption: 'চিত্র ১ — নির্ভুল জ্ঞানচর্চায় মানবিক যাচাই ও সুশৃঙ্খল তথ্যভান্ডারের সমন্বয় অপরিহার্য।',
    },
    authorId: 'ananya-rahman',
    status: 'published',
    isFeatured: true,
    isRecommended: true,
    engagementScore: 4190,
    readingTimeMinutes: 7,
    publishedAt: '2026-11-18T09:30:00Z',
    updatedAt: '2026-11-20T15:00:00Z',
    seo: {
      metaTitle: 'তথ্যসূত্র-ভিত্তিক অনুসন্ধান ও এআই নির্ভুলতা | QORVIA',
      metaDescription:
        'আধুনিক কৃত্রিম বুদ্ধিমত্তায় রিট্রিভাল-অগমেন্টেড পদ্ধতি এবং তথ্যসূত্র যাচাইয়ের ভূমিকা সম্পর্কে বিস্তারিত বিশ্লেষণ।',
      canonicalPath: '/bn/article/source-grounded-retrieval-reduces-ai-hallucinations-bn',
    },
    sources: [
      {
        sourceId: 'src-01-bn',
        title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
        publisher: 'Proceedings of NeurIPS (Lewis et al.)',
        url: 'https://arxiv.org/abs/2005.11401',
        publishedAt: '2020-05-22',
        accessedAt: '2026-11-17',
      },
      {
        sourceId: 'src-02-bn',
        title: 'NIST AI Risk Management Framework (AI RMF 1.0)',
        publisher: 'National Institute of Standards and Technology',
        url: 'https://www.nist.gov/itl/ai-risk-management-framework',
        publishedAt: '2023-01-26',
        accessedAt: '2026-11-17',
      },
    ],
    contentBlocks: [
      {
        id: 'bn-sec-1',
        type: 'heading',
        level: 2,
        text: 'কেবল প্যারামেট্রিক স্মৃতি কেন তথ্য যাচাইয়ের জন্য যথেষ্ট নয়',
      },
      {
        id: 'bn-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'বৃহৎ ভাষা মডেলগুলো প্রশিক্ষণের সময় বিপুল পরিমাণ লেখার মধ্যকার পরিসংখ্যানগত সম্পর্ক শেখে। তবে এই গাণিতিক ওজন কোনো সূচিবদ্ধ ডেটাবেসের মতো কাজ করে না। ফলে সুনির্দিষ্ট তারিখ, নীতিমালা বা আঞ্চলিক পরিসংখ্যান জানতে চাইলে মডেল অনেক সময় সঠিক নথি খুঁজে বের করার বদলে সম্ভাব্য শব্দের ধারা অনুমান করে বসে।',
      },
      {
        id: 'bn-p-2',
        type: 'paragraph',
        text: 'এই কারণেই সাবলীল ভাষায় লেখা একটি অনুচ্ছেদেও অস্তিত্বহীন ওয়েব ঠিকানা বা ভুল উদ্ধৃতি থাকতে পারে। নির্ভরযোগ্য উৎস থেকে তথ্য সংগ্রহ এবং প্রকাশের আগে তা যাচাই করার কাঠামো ছাড়া কেবল ভাষার প্রাঞ্জলতার ওপর ভরসা করা নিরাপদ নয়।',
      },
      {
        id: 'bn-q-1',
        type: 'quote',
        text: 'কোনো অনুচ্ছেদের শেষে একটি ওয়েব লিঙ্ক যুক্ত থাকাই তথ্যের সত্যতার প্রমাণ নয়; মূল নথি, প্রকাশের তারিখ এবং দাবিটির প্রাসঙ্গিকতা সরাসরি পরীক্ষা করা জরুরি।',
        attribution: 'QORVIA সম্পাদকীয় যাচাই মানদণ্ড',
      },
      {
        id: 'bn-sec-2',
        type: 'heading',
        level: 2,
        text: 'নির্ভরযোগ্য জ্ঞান সংকলনের চারটি ধাপ',
      },
      {
        id: 'bn-list-1',
        type: 'list',
        ordered: true,
        items: [
          'প্রশ্ন বিভাজন: সময়নির্ভর তথ্য ও চিরায়ত বৈজ্ঞানিক ধারণাকে আলাদাভাবে চিহ্নিত করা।',
          'প্রাথমিক উৎস সংগ্রহ: সংগ্রহের তারিখসহ মূল গবেষণাপত্র বা প্রাতিষ্ঠানিক নথি সংরক্ষণ করা।',
          'কাঠামোগত বিন্যাস: যাচাইযোগ্য তথ্য এবং অনিশ্চিত দাবিগুলোকে সুনির্দিষ্ট স্কিমায় আলাদা করা।',
          'সম্পাদকীয় অনুমোদন: মানুষের প্রত্যক্ষ পর্যালোচনা ছাড়া কোনো খসড়া প্রকাশ না করা।',
        ],
      },
    ],
  },
  {
    articleId: 'art-en-02',
    translationGroupId: 'grp-active-recall-study',
    locale: 'en',
    title: 'Spaced Repetition and Active Recall: Designing a Sustainable Study Schedule',
    slug: 'spaced-repetition-and-active-recall-study-schedule',
    excerpt:
      'Cognitive psychology shows why passive re-reading fades quickly—and how structured retrieval intervals improve long-term conceptual retention.',
    categoryId: 'education',
    subcategorySlug: 'learning-techniques',
    tags: ['Study Strategy', 'Cognitive Science', 'Active Recall', 'University'],
    featuredImage: {
      src: '/src/assets/images/article_education_study_1795449988371.jpg',
      alt: 'Open archival notebook with brass fountain pen beside stacked textbooks on a stone table',
      caption: 'Fig. 1 — Handwritten retrieval summaries strengthen memory traces far more effectively than highlighting.',
    },
    authorId: 'tariq-mahmud',
    status: 'published',
    isFeatured: true,
    isRecommended: true,
    engagementScore: 3650,
    readingTimeMinutes: 6,
    publishedAt: '2026-11-15T08:00:00Z',
    updatedAt: '2026-11-16T11:00:00Z',
    seo: {
      metaTitle: 'Spaced Repetition and Active Recall Guide | QORVIA',
      metaDescription:
        'A practical guide to designing a study schedule using spaced repetition and active recall based on cognitive science research.',
      canonicalPath: '/en/article/spaced-repetition-and-active-recall-study-schedule',
    },
    sources: [
      {
        sourceId: 'src-edu-01',
        title: 'Improving Students’ Learning With Effective Learning Techniques',
        publisher: 'Psychological Science in the Public Interest (Dunlosky et al.)',
        url: 'https://journals.sagepub.com/doi/10.1177/1529100612453266',
        publishedAt: '2013-01-08',
        accessedAt: '2026-11-14',
      },
    ],
    contentBlocks: [
      {
        id: 'edu-sec-1',
        type: 'heading',
        level: 2,
        text: 'Why Familiarity Is Not Mastery',
      },
      {
        id: 'edu-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'Students often equate fluent recognition while re-reading a textbook chapter with durable understanding. Yet cognitive research consistently demonstrates that fluency during passive review creates an illusion of competence that collapses under examination conditions.',
      },
      {
        id: 'edu-p-2',
        type: 'paragraph',
        text: 'Replacing passive review with closed-book retrieval—forcing yourself to reconstruct an argument, equation, or historical timeline from memory—creates productive difficulty that strengthens neural retrieval pathways.',
      },
      {
        id: 'edu-sec-2',
        type: 'heading',
        level: 2,
        text: 'A Practical 1–3–7–21 Day Review Cadence',
      },
      {
        id: 'edu-list-1',
        type: 'list',
        ordered: false,
        items: [
          'Day 1: Close the text after reading and write a five-bullet synthesis from memory.',
          'Day 3: Answer three conceptual questions without consulting your notes first.',
          'Day 7: Explain the topic aloud or solve mixed practice problems across chapters.',
          'Day 21: Complete a timed diagnostic set to identify lingering weak spots.',
        ],
      },
    ],
  },
  {
    articleId: 'art-bn-02',
    translationGroupId: 'grp-active-recall-study',
    locale: 'bn',
    title: 'স্পেসড রিপিটিশন ও অ্যাক্টিভ রিকল: দীর্ঘস্থায়ী পড়াশোনার কার্যকর রুটিন',
    slug: 'spaced-repetition-and-active-recall-bn',
    excerpt:
      'শুধু বারবার বই পড়ে যাওয়ার চেয়ে নির্দিষ্ট বিরতিতে স্মৃতি থেকে পুনরুদ্ধারের অনুশীলন কীভাবে দীর্ঘমেয়াদী বোধগম্যতা বাড়ায় তার বৈজ্ঞানিক ব্যাখ্যা।',
    categoryId: 'education',
    subcategorySlug: 'learning-techniques',
    tags: ['পড়াশোনার কৌশল', 'অ্যাক্টিভ রিকল', 'শিক্ষণ বিজ্ঞান'],
    featuredImage: {
      src: '/src/assets/images/article_education_study_1795449988371.jpg',
      alt: 'পাথরের টেবিলে খোলা নোটবুক, কলম এবং একাডেমিক বইয়ের স্তূপ',
      caption: 'চিত্র ১ — বই দেখে দাগানোর চেয়ে না দেখে নিজের ভাষায় সারসংক্ষেপ লেখা অনেক বেশি কার্যকর।',
    },
    authorId: 'tariq-mahmud',
    status: 'published',
    isFeatured: false,
    isRecommended: true,
    engagementScore: 3280,
    readingTimeMinutes: 6,
    publishedAt: '2026-11-15T08:30:00Z',
    updatedAt: '2026-11-16T11:30:00Z',
    seo: {
      metaTitle: 'স্পেসড রিপিটিশন ও অ্যাক্টিভ রিকল গাইড | QORVIA',
      metaDescription:
        'মনোবিজ্ঞান ও শিক্ষণ গবেষণার আলোকে স্পেসড রিপিটিশন এবং অ্যাক্টিভ রিকল ব্যবহারের বাস্তবসম্মত কৌশল।',
      canonicalPath: '/bn/article/spaced-repetition-and-active-recall-bn',
    },
    sources: [
      {
        sourceId: 'src-edu-01-bn',
        title: 'Improving Students’ Learning With Effective Learning Techniques',
        publisher: 'Psychological Science in the Public Interest (Dunlosky et al.)',
        url: 'https://journals.sagepub.com/doi/10.1177/1529100612453266',
        publishedAt: '2013-01-08',
        accessedAt: '2026-11-14',
      },
    ],
    contentBlocks: [
      {
        id: 'bn-edu-sec-1',
        type: 'heading',
        level: 2,
        text: 'পরিচিতি মানেই আয়ত্ত নয়',
      },
      {
        id: 'bn-edu-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'একই অধ্যায় বারবার পড়লে লেখাটি খুব সহজ ও পরিচিত মনে হয়। কিন্তু গবেষণায় দেখা গেছে, এই পরিচিতির অনুভূতি অনেক সময় প্রকৃত দক্ষতার ভ্রম তৈরি করে, যা পরীক্ষার হলে বা বাস্তব প্রয়োগের সময় দ্রুত ভেঙে পড়ে।',
      },
      {
        id: 'bn-edu-sec-2',
        type: 'heading',
        level: 2,
        text: '১–৩–৭–২১ দিনের পুনরাবৃত্তি কাঠামো',
      },
      {
        id: 'bn-edu-list-1',
        type: 'list',
        ordered: false,
        items: [
          '১ম দিন: পড়ার পর বই বন্ধ করে মূল ধারণাগুলো নিজের ভাষায় লিখে ফেলুন।',
          '৩য় দিন: নোট না দেখে তিনটি মূল প্রশ্নের উত্তর দিন এবং ভুলগুলো চিহ্নিত করুন।',
          '৭ম দিন: ভিন্ন অধ্যায়ের সমস্যার সাথে মিলিয়ে অনুশীলন করুন।',
          '২১তম দিন: নির্দিষ্ট সময়ের মধ্যে একটি মূল্যায়ন পরীক্ষা দিন।',
        ],
      },
    ],
  },
  {
    articleId: 'art-en-03',
    translationGroupId: 'grp-web-core-vitals',
    locale: 'en',
    title: 'Core Web Vitals in Practice: Eliminating Layout Shifts and Main-Thread Bottlenecks',
    slug: 'core-web-vitals-eliminating-layout-shifts',
    excerpt:
      'A practical engineering checklist for improving Largest Contentful Paint, Interaction to Next Paint, and visual stability in modern web applications.',
    categoryId: 'digital-skills',
    subcategorySlug: 'web-development',
    tags: ['Web Performance', 'TypeScript', 'Core Web Vitals', 'Frontend'],
    featuredImage: {
      src: '/src/assets/images/article_digital_skills_1795449988507.jpg',
      alt: 'Minimalist developer desk by a tall window with matte black laptop',
      caption: 'Fig. 1 — Predictable layout geometry and disciplined asset sizing keep rendering latency low.',
    },
    authorId: 'tariq-mahmud',
    status: 'published',
    isFeatured: false,
    isRecommended: true,
    engagementScore: 2940,
    readingTimeMinutes: 8,
    publishedAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    seo: {
      metaTitle: 'Core Web Vitals Engineering Checklist | QORVIA',
      metaDescription:
        'Learn how to eliminate Cumulative Layout Shift and improve INP and LCP in production React and TypeScript applications.',
      canonicalPath: '/en/article/core-web-vitals-eliminating-layout-shifts',
    },
    sources: [
      {
        sourceId: 'src-web-01',
        title: 'Web Vitals Overview and Thresholds',
        publisher: 'web.dev / Google Chrome Team',
        url: 'https://web.dev/articles/vitals',
        publishedAt: '2024-03-12',
        accessedAt: '2026-11-11',
      },
    ],
    contentBlocks: [
      {
        id: 'web-sec-1',
        type: 'heading',
        level: 2,
        text: 'Reserving Space Before Media Loads',
      },
      {
        id: 'web-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'Unexpected layout jumps frustrate readers—especially on mobile connections common across emerging markets. Assigning explicit aspect ratios to article thumbnails, embedded charts, and clearly labeled advertisement containers ensures the browser reserves exact geometry before network assets arrive.',
      },
      {
        id: 'web-sec-2',
        type: 'heading',
        level: 2,
        text: 'Keeping Interaction Latency Under 200ms',
      },
      {
        id: 'web-p-2',
        type: 'paragraph',
        text: 'Interaction to Next Paint (INP) measures how quickly the interface responds to clicks, taps, and keyboard input. Deferring non-critical third-party scripts and keeping state updates localized to the active component prevents main-thread stalls.',
      },
    ],
  },
  {
    articleId: 'art-bn-03',
    translationGroupId: 'grp-web-core-vitals',
    locale: 'bn',
    title: 'কোর ওয়েব ভাইটালস: লেআউট শিফট ও ব্রাউজার ধীরগতি দূর করার বাস্তব পদ্ধতি',
    slug: 'core-web-vitals-eliminating-layout-shifts-bn',
    excerpt:
      'আধুনিক ওয়েব অ্যাপ্লিকেশনে পেজ লোডিং গতি, ইন্টারঅ্যাকশন রেসপন্স এবং দৃশ্যমান স্থিতিশীলতা নিশ্চিত করার প্রকৌশলগত চেকলিস্ট।',
    categoryId: 'digital-skills',
    subcategorySlug: 'web-development',
    tags: ['ওয়েব ডেভেলপমেন্ট', 'পারফরম্যান্স', 'ফ্রন্টএন্ড'],
    featuredImage: {
      src: '/src/assets/images/article_digital_skills_1795449988507.jpg',
      alt: 'জানালার পাশে পরিচ্ছন্ন ডেভেলপার ডেস্ক ও ল্যাপটপ',
      caption: 'চিত্র ১ — সুনির্দিষ্ট অ্যাসপেক্ট রেশিও ও পরিমিত স্ক্রিপ্ট ব্যবহারের মাধ্যমে দ্রুতগতির ওয়েবসাইট তৈরি করা যায়।',
    },
    authorId: 'tariq-mahmud',
    status: 'published',
    isFeatured: false,
    isRecommended: false,
    engagementScore: 2410,
    readingTimeMinutes: 7,
    publishedAt: '2026-11-12T10:30:00Z',
    updatedAt: '2026-11-12T10:30:00Z',
    seo: {
      metaTitle: 'কোর ওয়েব ভাইটালস ও ওয়েব পারফরম্যান্স গাইড | QORVIA',
      metaDescription:
        'আধুনিক ওয়েবসাইটে লেআউট শিফট কমানো এবং দ্রুত রেসপন্স নিশ্চিত করার কার্যকর পদ্ধতি।',
      canonicalPath: '/bn/article/core-web-vitals-eliminating-layout-shifts-bn',
    },
    sources: [
      {
        sourceId: 'src-web-01-bn',
        title: 'Web Vitals Overview and Thresholds',
        publisher: 'web.dev / Google Chrome Team',
        url: 'https://web.dev/articles/vitals',
        publishedAt: '2024-03-12',
        accessedAt: '2026-11-11',
      },
    ],
    contentBlocks: [
      {
        id: 'bn-web-sec-1',
        type: 'heading',
        level: 2,
        text: 'ছবি ও বিজ্ঞাপনের জন্য আগে থেকে জায়গা নির্ধারণ',
      },
      {
        id: 'bn-web-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'পড়ার সময় হঠাৎ পৃষ্ঠার লেখা নিচে নেমে যাওয়া পাঠকের জন্য অত্যন্ত বিরক্তিকর। প্রতিটি ছবি, গ্রাফ এবং নির্ধারিত বিজ্ঞাপন স্লটের জন্য আগে থেকেই নির্দিষ্ট উচ্চতা ও অনুপাত (Aspect Ratio) নির্ধারণ করে রাখলে মোবাইল নেটওয়ার্কেও পৃষ্ঠার গঠন স্থিতিশীল থাকে।',
      },
    ],
  },
  {
    articleId: 'art-en-04',
    translationGroupId: 'grp-prism-dispersion-physics',
    locale: 'en',
    title: 'Why Glass Prisms Split White Light: Dispersion, Wavelength, and Refractive Index',
    slug: 'why-glass-prisms-split-white-light-dispersion',
    excerpt:
      'A clear scientific explanation of how wavelength-dependent speed inside optical glass separates sunlight into a continuous visible spectrum.',
    categoryId: 'general-knowledge',
    subcategorySlug: 'science-explained',
    tags: ['Optics', 'Physics', 'Light Spectrum', 'Science Explained'],
    featuredImage: {
      src: '/src/assets/images/article_science_knowledge_1795449988615.jpg',
      alt: 'Optical glass prisms refracting a crisp spectrum of light across a paper-white surface',
      caption: 'Fig. 1 — Shorter blue wavelengths refract at a steeper angle than longer red wavelengths inside crown glass.',
    },
    authorId: 'ananya-rahman',
    status: 'published',
    isFeatured: false,
    isRecommended: true,
    engagementScore: 3110,
    readingTimeMinutes: 5,
    publishedAt: '2026-11-08T12:00:00Z',
    updatedAt: '2026-11-08T12:00:00Z',
    seo: {
      metaTitle: 'Why Glass Prisms Split White Light | QORVIA',
      metaDescription:
        'Understand optical dispersion, refractive index, and why white light separates into colors through a glass prism.',
      canonicalPath: '/en/article/why-glass-prisms-split-white-light-dispersion',
    },
    sources: [
      {
        sourceId: 'src-sci-01',
        title: 'Optics (5th Edition) — Dispersion and Refractive Index',
        publisher: 'Addison-Wesley / Eugene Hecht',
        url: 'https://www.britannica.com/science/dispersion-physics',
        publishedAt: '2024-01-10',
        accessedAt: '2026-11-07',
      },
    ],
    contentBlocks: [
      {
        id: 'sci-sec-1',
        type: 'heading',
        level: 2,
        text: 'Refraction Depends on Frequency',
      },
      {
        id: 'sci-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'In a vacuum, every color of visible light travels at the exact same speed. Inside optical glass, however, electromagnetic waves interact with bound electrons in the material. Higher-frequency violet and blue light interacts more strongly and slows down more than lower-frequency red light.',
      },
      {
        id: 'sci-p-2',
        type: 'paragraph',
        text: 'Because the refractive index increases for shorter wavelengths—a phenomenon called chromatic dispersion—each color bends by a slightly different angle at both faces of a triangular prism, fanning out into a clean spectrum.',
      },
    ],
  },
  {
    articleId: 'art-bn-04',
    translationGroupId: 'grp-prism-dispersion-physics',
    locale: 'bn',
    title: 'কাঁচের প্রিজম কীভাবে সাদা আলোকে সাতটি রঙে বিভক্ত করে: প্রতিসরণ ও বিচ্ছুরণের বিজ্ঞান',
    slug: 'why-glass-prisms-split-white-light-bn',
    excerpt:
      'শূন্য মাধ্যমে আলোর বেগ সমান হলেও কাঁচের ভেতরে ভিন্ন তরঙ্গদৈর্ঘ্যের আলো কেন ভিন্ন কোণে বেঁকে যায় তার সহজ বৈজ্ঞানিক ব্যাখ্যা।',
    categoryId: 'general-knowledge',
    subcategorySlug: 'science-explained',
    tags: ['আলোকবিজ্ঞান', 'পদার্থবিজ্ঞান', 'বিজ্ঞান', 'সাধারণ জ্ঞান'],
    featuredImage: {
      src: '/src/assets/images/article_science_knowledge_1795449988615.jpg',
      alt: 'সাদা পৃষ্ঠের ওপর কাঁচের প্রিজমের মধ্য দিয়ে আলোর বর্ণালী বিচ্ছুরণ',
      caption: 'চিত্র ১ — ক্ষুদ্র তরঙ্গদৈর্ঘ্যের নীল আলো দীর্ঘ তরঙ্গদৈর্ঘ্যের লাল আলোর চেয়ে বেশি কোণে বেঁকে যায়।',
    },
    authorId: 'ananya-rahman',
    status: 'published',
    isFeatured: false,
    isRecommended: true,
    engagementScore: 2875,
    readingTimeMinutes: 5,
    publishedAt: '2026-11-08T12:30:00Z',
    updatedAt: '2026-11-08T12:30:00Z',
    seo: {
      metaTitle: 'প্রিজমে আলোর বিচ্ছুরণের বিজ্ঞান | QORVIA',
      metaDescription:
        'কাঁচের প্রিজমে সাদা আলো কীভাবে বর্ণালীতে বিভক্ত হয়—তরঙ্গদৈর্ঘ্য ও প্রতিসরাঙ্কের সহজ ব্যাখ্যা।',
      canonicalPath: '/bn/article/why-glass-prisms-split-white-light-bn',
    },
    sources: [
      {
        sourceId: 'src-sci-01-bn',
        title: 'Dispersion in Optical Media',
        publisher: 'Encyclopaedia Britannica',
        url: 'https://www.britannica.com/science/dispersion-physics',
        publishedAt: '2024-01-10',
        accessedAt: '2026-11-07',
      },
    ],
    contentBlocks: [
      {
        id: 'bn-sci-sec-1',
        type: 'heading',
        level: 2,
        text: 'কম্পাঙ্কের ওপর নির্ভরশীল প্রতিসরণ',
      },
      {
        id: 'bn-sci-p-1',
        type: 'paragraph',
        dropCap: true,
        text: 'শূন্য মাধ্যমে দৃশ্যমান আলোর প্রতিটি রঙ একই বেগে চলে। কিন্তু কাঁচের মতো স্বচ্ছ মাধ্যমের ভেতর দিয়ে যাওয়ার সময় আলোক তরঙ্গ পদার্থের ইলেকট্রনের সাথে মিথস্ক্রিয়া করে। ফলে উচ্চ কম্পাঙ্কের বেগুনি ও নীল আলো লাল আলোর তুলনায় বেশি ধীর হয়ে যায় এবং বেশি কোণে বেঁকে যায়।',
      },
    ],
  },
];
