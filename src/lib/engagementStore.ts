export interface ArticleEngagementEntry {
  articleId: string;
  locale: 'en' | 'bn';
  views: number;
  reads: number;
  scoreDelta: number;
  lastActivityAt: string;
}

export interface NewsletterSubscriber {
  email: string;
  locale: 'en' | 'bn';
  subscribedAt: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  locale: 'en' | 'bn';
  createdAt: string;
}

export interface RuntimeInsightsSnapshot {
  metrics: Record<string, ArticleEngagementEntry>;
  subscribers: NewsletterSubscriber[];
  inquiries: ContactInquiry[];
}

const VALID_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class EngagementStore {
  private metrics = new Map<string, ArticleEngagementEntry>();
  private subscribers = new Map<string, NewsletterSubscriber>();
  private inquiries: ContactInquiry[] = [];
  private dedupeTimestamps = new Map<string, number>();

  constructor(initial?: Partial<RuntimeInsightsSnapshot>) {
    if (initial?.metrics) {
      Object.entries(initial.metrics).forEach(([id, entry]) => {
        if (VALID_ID_RE.test(id)) {
          this.metrics.set(id, entry);
        }
      });
    }
    if (Array.isArray(initial?.subscribers)) {
      initial.subscribers.forEach((sub) => {
        if (sub.email) this.subscribers.set(sub.email.toLowerCase(), sub);
      });
    }
    if (Array.isArray(initial?.inquiries)) {
      this.inquiries = initial.inquiries.slice(0, 200);
    }
  }

  recordEngagement(params: {
    articleId: string;
    locale: 'en' | 'bn';
    event: 'view' | 'read';
    visitorFingerprint: string;
    nowMs?: number;
  }): { ok: boolean; counted: boolean; entry?: ArticleEngagementEntry; error?: string } {
    const cleanId = params.articleId.trim();
    if (!VALID_ID_RE.test(cleanId)) {
      return { ok: false, counted: false, error: 'Invalid article identifier.' };
    }
    if (params.event !== 'view' && params.event !== 'read') {
      return { ok: false, counted: false, error: 'Invalid engagement event.' };
    }

    const nowMs = params.nowMs ?? Date.now();
    const dedupeKey = `${params.visitorFingerprint}:${cleanId}:${params.event}`;
    const lastSeen = this.dedupeTimestamps.get(dedupeKey) ?? 0;

    // 10-minute deduplication window per visitor/article/event prevents refresh spamming
    const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
    const existing = this.metrics.get(cleanId) ?? {
      articleId: cleanId,
      locale: params.locale === 'bn' ? 'bn' : 'en',
      views: 0,
      reads: 0,
      scoreDelta: 0,
      lastActivityAt: new Date(nowMs).toISOString(),
    };

    if (nowMs - lastSeen < DEDUPE_WINDOW_MS) {
      return { ok: true, counted: false, entry: existing };
    }

    this.dedupeTimestamps.set(dedupeKey, nowMs);
    if (this.dedupeTimestamps.size > 5000) {
      const oldestKey = this.dedupeTimestamps.keys().next().value;
      if (oldestKey) this.dedupeTimestamps.delete(oldestKey);
    }

    const updated: ArticleEngagementEntry = {
      articleId: cleanId,
      locale: params.locale === 'bn' ? 'bn' : 'en',
      views: existing.views + (params.event === 'view' ? 1 : 0),
      reads: existing.reads + (params.event === 'read' ? 1 : 0),
      scoreDelta: existing.scoreDelta + (params.event === 'read' ? 3 : 1),
      lastActivityAt: new Date(nowMs).toISOString(),
    };

    this.metrics.set(cleanId, updated);
    return { ok: true, counted: true, entry: updated };
  }

  getPublicScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    this.metrics.forEach((entry, id) => {
      scores[id] = entry.scoreDelta;
    });
    return scores;
  }

  subscribeNewsletter(params: {
    email: string;
    locale: 'en' | 'bn';
  }): { ok: boolean; error?: string; alreadySubscribed?: boolean } {
    const cleanEmail = params.email.trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(cleanEmail)) {
      return { ok: false, error: 'Please provide a valid email address.' };
    }
    const alreadySubscribed = this.subscribers.has(cleanEmail);
    this.subscribers.set(cleanEmail, {
      email: cleanEmail,
      locale: params.locale === 'bn' ? 'bn' : 'en',
      subscribedAt: new Date().toISOString(),
    });
    return { ok: true, alreadySubscribed };
  }

  submitContactInquiry(params: {
    name: string;
    email: string;
    message: string;
    locale: 'en' | 'bn';
  }): { ok: boolean; error?: string; inquiry?: ContactInquiry } {
    const cleanName = params.name.trim().slice(0, 120);
    const cleanEmail = params.email.trim().toLowerCase().slice(0, 254);
    const cleanMessage = params.message.trim().slice(0, 2000);

    if (cleanName.length < 2) {
      return { ok: false, error: 'Please provide your full name.' };
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      return { ok: false, error: 'Please provide a valid email address.' };
    }
    if (cleanMessage.length < 10) {
      return { ok: false, error: 'Message must be at least 10 characters.' };
    }

    const inquiry: ContactInquiry = {
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
      locale: params.locale === 'bn' ? 'bn' : 'en',
      createdAt: new Date().toISOString(),
    };
    this.inquiries.unshift(inquiry);
    if (this.inquiries.length > 200) {
      this.inquiries = this.inquiries.slice(0, 200);
    }
    return { ok: true, inquiry };
  }

  exportSnapshot(): RuntimeInsightsSnapshot {
    const metricsObj: Record<string, ArticleEngagementEntry> = {};
    this.metrics.forEach((v, k) => {
      metricsObj[k] = v;
    });
    return {
      metrics: metricsObj,
      subscribers: Array.from(this.subscribers.values()).slice(-200),
      inquiries: this.inquiries.slice(0, 100),
    };
  }

  getAdminInsights() {
    const sortedMetrics = Array.from(this.metrics.values()).sort(
      (a, b) => b.scoreDelta - a.scoreDelta
    );
    return {
      articleMetrics: sortedMetrics,
      totalTrackedViews: sortedMetrics.reduce((acc, m) => acc + m.views, 0),
      totalTrackedReads: sortedMetrics.reduce((acc, m) => acc + m.reads, 0),
      newsletterCount: this.subscribers.size,
      recentSubscribers: Array.from(this.subscribers.values()).slice(-30).reverse(),
      contactInquiries: this.inquiries.slice(0, 30),
    };
  }
}
