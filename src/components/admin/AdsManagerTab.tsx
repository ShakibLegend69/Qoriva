import { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Image as ImageIcon,
  Layers,
  Megaphone,
  Plus,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AdPlacement,
  AdProvider,
  AdSenseFormat,
  AdSlotConfig,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
  MonetagFormat,
} from '../../types/qorvia';
import {
  ALL_AD_PLACEMENTS,
  MONETAG_DIRECT_LINK_URL,
  MONETAG_DIRECT_LINK_ZONE_ID,
  validateAdSenseSlotInput,
  validateDirectBannerInput,
  validateGlobalAdSettings,
  validateMonetagInput,
} from '../../lib/adsStore';
import {
  type MediaAssetRecord,
  createDirectBannerCampaignInFirestore,
  createMonetagCampaignInFirestore,
  deleteAdCampaignInFirestore,
  deleteAdSlotInFirestore,
  saveAdSlotInFirestore,
  saveGlobalAdSettingsInFirestore,
  toggleAdCampaignInFirestore,
  uploadAdBannerImage,
} from '../../lib/firestoreService';

interface AdsManagerTabProps {
  actorUid: string;
  actorEmail?: string | null;
  hasAdsPermission: boolean;
  hasRoleAdminPermission: boolean;
  adSlots: AdSlotConfig[];
  directBanners: DirectBannerCampaign[];
  monetagCampaigns: MonetagAdEntry[];
  globalAdSettings: GlobalAdSettings;
  mediaAssets: MediaAssetRecord[];
}

type AdSubSection = 'slots' | 'banners' | 'monetag' | 'settings';

const PLACEMENT_OPTIONS: Array<{ value: AdPlacement; label: string }> = [
  { value: 'header', label: 'Header Banner' },
  { value: 'homepage_content', label: 'Homepage Content' },
  { value: 'article_top', label: 'Article Top' },
  { value: 'in_article', label: 'In-Article' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'article_bottom', label: 'Article Bottom' },
];

const MONETAG_FORMAT_OPTIONS: Array<{ value: MonetagFormat; label: string }> = [
  { value: 'in_page_push', label: 'In-Page Push' },
  { value: 'vignette', label: 'Vignette Banner' },
  { value: 'popunder', label: 'Popunder / OnClick' },
  { value: 'push_notifications', label: 'Web Push Notifications' },
  { value: 'direct_link', label: 'Direct Link' },
  { value: 'multitag', label: 'MultiTag' },
];

export function AdsManagerTab({
  actorUid,
  actorEmail,
  hasAdsPermission,
  hasRoleAdminPermission,
  adSlots,
  directBanners,
  monetagCampaigns,
  globalAdSettings,
  mediaAssets,
}: AdsManagerTabProps) {
  const [subTab, setSubTab] = useState<AdSubSection>('slots');
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  // Global Ad Settings State
  const [adsEnabled, setAdsEnabled] = useState(globalAdSettings.adsEnabled);
  const [adsensePublisherId, setAdsensePublisherId] = useState(globalAdSettings.adsensePublisherId);
  const [adsenseAutoAds, setAdsenseAutoAds] = useState(globalAdSettings.adsenseAutoAds);
  const [monetagGlobalEnabled, setMonetagGlobalEnabled] = useState(
    globalAdSettings.monetagGlobalEnabled
  );
  const [savingGlobal, setSavingGlobal] = useState(false);

  useEffect(() => {
    setAdsEnabled(globalAdSettings.adsEnabled);
    setAdsensePublisherId(globalAdSettings.adsensePublisherId);
    setAdsenseAutoAds(globalAdSettings.adsenseAutoAds);
    setMonetagGlobalEnabled(globalAdSettings.monetagGlobalEnabled);
  }, [globalAdSettings]);

  // Placement Slot Editor State
  const [slotPlacement, setSlotPlacement] = useState<AdPlacement>('header');
  const [slotLocale, setSlotLocale] = useState<Locale | 'all'>('all');
  const [slotName, setSlotName] = useState('Header Leaderboard Slot');
  const [slotProvider, setSlotProvider] = useState<AdProvider>('adsense');
  const [slotEnabled, setSlotEnabled] = useState(true);
  const [slotAdsenseClient, setSlotAdsenseClient] = useState(globalAdSettings.adsensePublisherId);
  const [slotAdsenseUnitId, setSlotAdsenseUnitId] = useState('');
  const [slotAdsenseFormat, setSlotAdsenseFormat] = useState<AdSenseFormat>('auto');
  const [savingSlot, setSavingSlot] = useState(false);

  // Direct Banner Form State
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerPlacement, setBannerPlacement] = useState<AdPlacement>('header');
  const [bannerLocale, setBannerLocale] = useState<Locale | 'all'>('all');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerDestUrl, setBannerDestUrl] = useState('');
  const [bannerStartAt, setBannerStartAt] = useState('');
  const [bannerEndAt, setBannerEndAt] = useState('');
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Monetag Form State
  const [monetagName, setMonetagName] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [format, setFormat] = useState<MonetagFormat>('in_page_push');
  const [monetagPlacement, setMonetagPlacement] = useState<AdPlacement>('article_bottom');
  const [monetagLocale, setMonetagLocale] = useState<Locale | 'all'>('all');
  const [scriptDomain, setScriptDomain] = useState('alwingulla.com');
  const [directLinkUrl, setDirectLinkUrl] = useState('');
  const [savingMonetag, setSavingMonetag] = useState(false);

  const handleLoadSlotForPlacement = (placement: AdPlacement, loc: Locale | 'all' = slotLocale) => {
    setSlotPlacement(placement);
    setSlotLocale(loc);
    const existing = adSlots.find((s) => s.placement === placement && s.locale === loc);
    if (existing) {
      setSlotName(existing.name);
      setSlotProvider(existing.provider);
      setSlotEnabled(existing.enabled);
      setSlotAdsenseClient(existing.adsenseClient || globalAdSettings.adsensePublisherId);
      setSlotAdsenseUnitId(existing.adsenseSlot || '');
      setSlotAdsenseFormat(existing.adsenseFormat || 'auto');
    } else {
      const meta = ALL_AD_PLACEMENTS.find((p) => p.placement === placement);
      setSlotName(meta ? meta.label : `${placement} Slot`);
      setSlotProvider('adsense');
      setSlotEnabled(true);
      setSlotAdsenseClient(globalAdSettings.adsensePublisherId);
      setSlotAdsenseUnitId('');
      setSlotAdsenseFormat('auto');
    }
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!hasAdsPermission) return;

    if (slotEnabled && slotProvider === 'adsense') {
      const effectiveClient = (slotAdsenseClient || adsensePublisherId).trim();
      const check = validateAdSenseSlotInput({
        name: slotName,
        adsenseClient: effectiveClient,
        adsenseSlot: slotAdsenseUnitId,
        format: slotAdsenseFormat,
      });
      if (!check.valid) {
        setStatusMsg({ type: 'error', text: check.error || 'Invalid AdSense slot configuration.' });
        return;
      }
    } else if (slotName.trim().length < 2) {
      setStatusMsg({ type: 'error', text: 'Slot label must be at least 2 characters.' });
      return;
    }

    setSavingSlot(true);
    try {
      const slotId = `slot-${slotPlacement}-${slotLocale}`;
      await saveAdSlotInFirestore({
        actorUid,
        actorEmail,
        slot: {
          slotId,
          name: slotName.trim(),
          placement: slotPlacement,
          provider: slotProvider,
          enabled: slotEnabled,
          locale: slotLocale,
          adsenseClient: (slotAdsenseClient || adsensePublisherId).trim(),
          adsenseSlot: slotAdsenseUnitId.trim(),
          adsenseFormat: slotAdsenseFormat,
        },
      });
      setStatusMsg({
        type: 'success',
        text: `Saved placement slot "${slotName.trim()}" (${slotPlacement} · ${slotLocale.toUpperCase()}) to Firestore.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save placement slot.',
      });
    } finally {
      setSavingSlot(false);
    }
  };

  const handleUploadBannerCreative = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg(null);
    setUploadingBannerImg(true);
    try {
      const res = await uploadAdBannerImage({ actorUid, actorEmail, file });
      setBannerImageUrl(res.url);
      setStatusMsg({
        type: 'success',
        text: 'Banner creative uploaded to Firebase Storage.',
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Banner image upload failed.',
      });
    } finally {
      setUploadingBannerImg(false);
      e.target.value = '';
    }
  };

  const handleCreateDirectBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!hasAdsPermission) return;

    const check = validateDirectBannerInput({
      title: bannerTitle,
      imageUrl: bannerImageUrl,
      destinationUrl: bannerDestUrl,
      startAt: bannerStartAt || undefined,
      endAt: bannerEndAt || undefined,
    });
    if (!check.valid) {
      setStatusMsg({ type: 'error', text: check.error || 'Invalid Direct Banner input.' });
      return;
    }

    setSavingBanner(true);
    try {
      const campaign: DirectBannerCampaign = {
        campaignId: `banner-${Date.now()}`,
        title: bannerTitle.trim(),
        provider: 'direct_banner',
        placement: bannerPlacement,
        locale: bannerLocale,
        imageUrl: bannerImageUrl.trim(),
        destinationUrl: bannerDestUrl.trim(),
        format: bannerPlacement === 'sidebar' ? 'rectangle' : 'leaderboard',
        startAt: bannerStartAt ? new Date(bannerStartAt).toISOString() : undefined,
        endAt: bannerEndAt ? new Date(bannerEndAt).toISOString() : undefined,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      await createDirectBannerCampaignInFirestore({
        actorUid,
        actorEmail,
        campaign,
      });
      setBannerTitle('');
      setBannerImageUrl('');
      setBannerDestUrl('');
      setBannerStartAt('');
      setBannerEndAt('');
      setStatusMsg({
        type: 'success',
        text: `Direct banner "${campaign.title}" published to Cloud Firestore.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create Direct Banner campaign.',
      });
    } finally {
      setSavingBanner(false);
    }
  };

  const handleAddMonetag = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!hasAdsPermission) return;

    const check = validateMonetagInput({
      name: monetagName,
      zoneId,
      format,
      placement: monetagPlacement,
      scriptDomain,
      directLinkUrl,
    });
    if (!check.valid) {
      setStatusMsg({ type: 'error', text: check.error || 'Invalid Monetag configuration.' });
      return;
    }

    setSavingMonetag(true);
    try {
      const entry: MonetagAdEntry = {
        id: `monetag-${Date.now()}`,
        name: monetagName.trim(),
        zoneId: zoneId.trim(),
        format,
        placement: monetagPlacement,
        locale: monetagLocale,
        scriptDomain: scriptDomain.trim() || 'alwingulla.com',
        directLinkUrl: format === 'direct_link' ? directLinkUrl.trim() : undefined,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      await createMonetagCampaignInFirestore({ actorUid, actorEmail, entry });
      setMonetagName('');
      setZoneId('');
      setDirectLinkUrl('');
      setStatusMsg({
        type: 'success',
        text: `Monetag Zone #${entry.zoneId} saved to Cloud Firestore.`,
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save Monetag campaign.',
      });
    } finally {
      setSavingMonetag(false);
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    if (!hasRoleAdminPermission) return;

    const nextSettings: GlobalAdSettings = {
      adsEnabled,
      adsensePublisherId: adsensePublisherId.trim(),
      adsenseAutoAds,
      monetagGlobalEnabled,
    };
    const check = validateGlobalAdSettings(nextSettings);
    if (!check.valid) {
      setStatusMsg({ type: 'error', text: check.error || 'Invalid AdSense publisher ID.' });
      return;
    }

    setSavingGlobal(true);
    try {
      await saveGlobalAdSettingsInFirestore({
        actorUid,
        actorEmail,
        settings: nextSettings,
      });
      setStatusMsg({
        type: 'success',
        text: 'Global AdSense & Network settings updated in Firestore siteSettings/public.',
      });
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update global ad settings.',
      });
    } finally {
      setSavingGlobal(false);
    }
  };

  if (!hasAdsPermission) {
    return (
      <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] text-xs text-red-700 dark:text-red-400">
        Your current account role does not have permission to manage advertising placements or revenue networks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-black/10 dark:border-white/10 rounded-2xl p-4 bg-[#F5F4EF]/65 dark:bg-[#11192B]">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Advertising management tools">
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'slots'}
            onClick={() => setSubTab('slots')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'slots' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Placement Slots & AdSense ({adSlots.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'banners'}
            onClick={() => setSubTab('banners')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'banners' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Direct Banners ({directBanners.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'monetag'}
            onClick={() => setSubTab('monetag')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'monetag' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Monetag Zones ({monetagCampaigns.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'settings'}
            onClick={() => setSubTab('settings')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'settings' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Global AdSense & Controls</span>
          </button>
        </div>

        <div className="text-xs font-mono-tabular text-black/60 dark:text-[#A5AAB4]">
          Ads Master Switch:{' '}
          <span className={globalAdSettings.adsEnabled ? 'text-[#22A06B] font-semibold' : 'text-red-600'}>
            {globalAdSettings.adsEnabled ? 'ACTIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          role={statusMsg.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            statusMsg.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* SUBTAB 1: PLACEMENT SLOTS & ADSENSE UNITS */}
      {subTab === 'slots' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]">
            <h2 className="font-editorial text-xl font-semibold mb-1">
              Configure Placement Slot
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mb-5">
              Bind Google AdSense units, Monetag zones, or Direct Sponsor Banners to each site placement.
            </p>

            <form onSubmit={handleSaveSlot} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="slot-placement" className="block text-xs font-semibold mb-1.5">
                    Placement Area
                  </label>
                  <select
                    id="slot-placement"
                    value={slotPlacement}
                    onChange={(e) => handleLoadSlotForPlacement(e.target.value as AdPlacement, slotLocale)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="slot-locale" className="block text-xs font-semibold mb-1.5">
                    Edition Target
                  </label>
                  <select
                    id="slot-locale"
                    value={slotLocale}
                    onChange={(e) =>
                      handleLoadSlotForPlacement(slotPlacement, e.target.value as Locale | 'all')
                    }
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    <option value="all">Both (EN + BN)</option>
                    <option value="en">English Only (/en/)</option>
                    <option value="bn">Bengali Only (/bn/)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="slot-name" className="block text-xs font-semibold mb-1.5">
                  Slot Label
                </label>
                <input
                  id="slot-name"
                  type="text"
                  value={slotName}
                  onChange={(e) => setSlotName(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="slot-provider" className="block text-xs font-semibold mb-1.5">
                    Preferred Ad Provider
                  </label>
                  <select
                    id="slot-provider"
                    value={slotProvider}
                    onChange={(e) => setSlotProvider(e.target.value as AdProvider)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    <option value="adsense">Google AdSense</option>
                    <option value="direct_banner">Direct Sponsor Banner</option>
                    <option value="monetag">Monetag Zone</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slotEnabled}
                      onChange={(e) => setSlotEnabled(e.target.checked)}
                    />
                    <span>Slot Enabled</span>
                  </label>
                </div>
              </div>

              {slotProvider === 'adsense' && (
                <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/50 dark:bg-white/[0.02] space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
                    Google AdSense Unit Credentials
                  </div>
                  <div>
                    <label htmlFor="slot-adsense-client" className="block text-xs font-semibold mb-1">
                      Publisher ID (ca-pub-...)
                    </label>
                    <input
                      id="slot-adsense-client"
                      type="text"
                      value={slotAdsenseClient}
                      onChange={(e) => setSlotAdsenseClient(e.target.value)}
                      placeholder="ca-pub-1234567890123456"
                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="slot-adsense-unit" className="block text-xs font-semibold mb-1">
                        Ad Unit Slot ID
                      </label>
                      <input
                        id="slot-adsense-unit"
                        type="text"
                        inputMode="numeric"
                        value={slotAdsenseUnitId}
                        onChange={(e) => setSlotAdsenseUnitId(e.target.value)}
                        placeholder="9876543210"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label htmlFor="slot-adsense-format" className="block text-xs font-semibold mb-1">
                        Responsive Format
                      </label>
                      <select
                        id="slot-adsense-format"
                        value={slotAdsenseFormat}
                        onChange={(e) => setSlotAdsenseFormat(e.target.value as AdSenseFormat)}
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                      >
                        <option value="auto">Auto Responsive</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={savingSlot}
                className="btn-transparent-black-solid w-full inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{savingSlot ? 'Saving Slot...' : 'Save Placement Slot'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-5">
            <div>
              <h2 className="font-editorial text-xl font-semibold">
                6 Editorial Placement Zones & Saved Slots
              </h2>
              <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1">
                Click any zone below to configure or disable it cleanly across EN and BN pages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_AD_PLACEMENTS.map((meta) => {
                const slot = adSlots.find((s) => s.placement === meta.placement);
                return (
                  <button
                    key={meta.placement}
                    type="button"
                    onClick={() => handleLoadSlotForPlacement(meta.placement, slot?.locale || 'all')}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      slotPlacement === meta.placement
                        ? 'border-[#4263EB] bg-[#4263EB]/[0.05]'
                        : 'border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#101827] dark:text-[#F5F4EF]">
                        {meta.label}
                      </span>
                      <span className="font-mono-tabular text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                        {slot ? (slot.enabled ? slot.provider : 'disabled') : 'default'}
                      </span>
                    </div>
                    <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1 leading-relaxed">
                      {meta.description}
                    </p>
                    <div className="text-[11px] font-mono-tabular text-black/50 dark:text-[#A5AAB4] mt-2">
                      {meta.recommendedSize}
                    </div>
                  </button>
                );
              })}
            </div>

            {adSlots.length > 0 && (
              <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-[#A5AAB4]">
                  Active Firestore Slot Overrides ({adSlots.length})
                </h3>
                <div className="divide-y divide-black/10 dark:divide-white/10">
                  {adSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold">{slot.name}</span>
                        <span className="font-mono-tabular text-black/55 dark:text-[#A5AAB4] ml-2">
                          {slot.placement} · {slot.provider} · {slot.locale.toUpperCase()} ·{' '}
                          {slot.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete slot ${slot.name}`}
                        onClick={() =>
                          deleteAdSlotInFirestore({
                            actorUid,
                            actorEmail,
                            slotId: slot.slotId,
                          })
                        }
                        className="btn-transparent-black p-1.5 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUBTAB 2: DIRECT BANNER CAMPAIGNS */}
      {subTab === 'banners' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]">
            <h2 className="font-editorial text-xl font-semibold mb-1">
              Create Direct Sponsor Banner
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mb-5">
              Upload a banner creative to Firebase Storage or paste a verified HTTPS image URL, then set campaign dates.
            </p>

            <form onSubmit={handleCreateDirectBanner} noValidate className="space-y-4">
              <div>
                <label htmlFor="banner-title" className="block text-xs font-semibold mb-1.5">
                  Campaign Title / Sponsor Name
                </label>
                <input
                  id="banner-title"
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. QORVIA Annual STEM Fellowship"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="banner-placement" className="block text-xs font-semibold mb-1.5">
                    Slot Placement
                  </label>
                  <select
                    id="banner-placement"
                    value={bannerPlacement}
                    onChange={(e) => setBannerPlacement(e.target.value as AdPlacement)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="banner-locale" className="block text-xs font-semibold mb-1.5">
                    Edition Target
                  </label>
                  <select
                    id="banner-locale"
                    value={bannerLocale}
                    onChange={(e) => setBannerLocale(e.target.value as Locale | 'all')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    <option value="all">Both (EN + BN)</option>
                    <option value="en">English Only (/en/)</option>
                    <option value="bn">Bengali Only (/bn/)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="banner-image-url" className="block text-xs font-semibold">
                    Banner Creative Image (HTTPS or Upload)
                  </label>
                  <label className="btn-transparent-black inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer">
                    <Upload className="w-3 h-3" aria-hidden="true" />
                    <span>{uploadingBannerImg ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                      onChange={handleUploadBannerCreative}
                      disabled={uploadingBannerImg}
                      className="sr-only"
                    />
                  </label>
                </div>
                <input
                  id="banner-image-url"
                  type="url"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="https://... or choose from uploaded assets"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                />
                {mediaAssets.length > 0 && (
                  <select
                    aria-label="Reuse uploaded media library image"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setBannerImageUrl(e.target.value);
                    }}
                    className="w-full min-h-[36px] px-3 py-1 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    <option value="">Or pick from Media Library ({mediaAssets.length})...</option>
                    {mediaAssets.map((m) => (
                      <option key={m.mediaId} value={m.url}>
                        {m.title || m.alt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {bannerImageUrl && (
                <div className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-h-32">
                  <img
                    src={bannerImageUrl}
                    alt="Banner preview"
                    className="w-full h-32 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div>
                <label htmlFor="banner-dest-url" className="block text-xs font-semibold mb-1.5">
                  Sponsor Landing URL (https://)
                </label>
                <input
                  id="banner-dest-url"
                  type="url"
                  value={bannerDestUrl}
                  onChange={(e) => setBannerDestUrl(e.target.value)}
                  placeholder="https://sponsor.example.com"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="banner-start" className="block text-xs font-semibold mb-1.5">
                    Start Date (Optional)
                  </label>
                  <input
                    id="banner-start"
                    type="datetime-local"
                    value={bannerStartAt}
                    onChange={(e) => setBannerStartAt(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="banner-end" className="block text-xs font-semibold mb-1.5">
                    End Date (Optional)
                  </label>
                  <input
                    id="banner-end"
                    type="datetime-local"
                    value={bannerEndAt}
                    onChange={(e) => setBannerEndAt(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingBanner}
                className="btn-transparent-black-solid w-full inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{savingBanner ? 'Publishing Banner...' : 'Publish Direct Banner'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]">
            <h2 className="font-editorial text-xl font-semibold mb-4">
              Scheduled Direct Banner Campaigns ({directBanners.length})
            </h2>
            {directBanners.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-8 text-center">
                No direct sponsor banner campaigns created yet.
              </p>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {directBanners.map((camp) => (
                  <div
                    key={camp.campaignId}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={camp.imageUrl}
                        alt={camp.title}
                        className="w-20 h-14 object-cover rounded-lg border border-black/10 dark:border-white/10 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-semibold text-sm">{camp.title}</div>
                        <div className="text-xs text-black/60 dark:text-[#A5AAB4] font-mono-tabular mt-0.5">
                          {camp.placement} · {camp.locale.toUpperCase()}
                        </div>
                        {(camp.startAt || camp.endAt) && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-black/55 dark:text-[#A5AAB4] mt-1 font-mono-tabular">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            <span>
                              {camp.startAt ? camp.startAt.slice(0, 10) : 'Now'} →{' '}
                              {camp.endAt ? camp.endAt.slice(0, 10) : 'Ongoing'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAdCampaignInFirestore({
                            actorUid,
                            actorEmail,
                            campaignId: camp.campaignId,
                            nextEnabled: !camp.enabled,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          camp.enabled ? 'btn-transparent-black-solid' : 'btn-transparent-black'
                        }`}
                      >
                        {camp.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete banner ${camp.title}`}
                        onClick={() =>
                          deleteAdCampaignInFirestore({
                            actorUid,
                            actorEmail,
                            campaignId: camp.campaignId,
                          })
                        }
                        className="btn-transparent-black p-2 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUBTAB 3: MONETAG ZONES */}
      {subTab === 'monetag' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]">
            <h2 className="font-editorial text-xl font-semibold mb-1">
              Add Monetag Ad Zone
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mb-3">
              Saved directly to Cloud Firestore <span className="font-mono-tabular">adCampaigns</span>.
            </p>
            <div className="mb-4 p-3 rounded-xl border border-[#4263EB]/30 bg-[#4263EB]/[0.05] flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-[#101827] dark:text-[#F5F4EF]">
                  Active Direct Link ({MONETAG_DIRECT_LINK_ZONE_ID})
                </div>
                <div className="font-mono-tabular text-[11px] text-black/60 dark:text-[#A5AAB4] truncate">
                  {MONETAG_DIRECT_LINK_URL}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMonetagName('Featured Partner Resource');
                  setZoneId(MONETAG_DIRECT_LINK_ZONE_ID);
                  setFormat('direct_link');
                  setMonetagPlacement('article_bottom');
                  setScriptDomain('uplcm.com');
                  setDirectLinkUrl(MONETAG_DIRECT_LINK_URL);
                }}
                className="btn-transparent-black px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Pre-fill Link
              </button>
            </div>

            <form onSubmit={handleAddMonetag} noValidate className="space-y-4">
              <div>
                <label htmlFor="monetag-name" className="block text-xs font-semibold mb-1.5">
                  Placement Label
                </label>
                <input
                  id="monetag-name"
                  type="text"
                  value={monetagName}
                  onChange={(e) => setMonetagName(e.target.value)}
                  placeholder="e.g. Bengali Article In-Page Push"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="monetag-zone" className="block text-xs font-semibold mb-1.5">
                    Monetag Zone ID
                  </label>
                  <input
                    id="monetag-zone"
                    type="text"
                    inputMode="numeric"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    placeholder="8492014"
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="monetag-format" className="block text-xs font-semibold mb-1.5">
                    Ad Format
                  </label>
                  <select
                    id="monetag-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as MonetagFormat)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                  >
                    {MONETAG_FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="monetag-placement" className="block text-xs font-semibold mb-1.5">
                    Slot Placement
                  </label>
                  <select
                    id="monetag-placement"
                    value={monetagPlacement}
                    onChange={(e) => setMonetagPlacement(e.target.value as AdPlacement)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                  >
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="monetag-locale" className="block text-xs font-semibold mb-1.5">
                    Language Edition
                  </label>
                  <select
                    id="monetag-locale"
                    value={monetagLocale}
                    onChange={(e) => setMonetagLocale(e.target.value as Locale | 'all')}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                  >
                    <option value="all">Both (EN + BN)</option>
                    <option value="en">English Only (/en/)</option>
                    <option value="bn">Bengali Only (/bn/)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="monetag-domain" className="block text-xs font-semibold mb-1.5">
                  Monetag Script Host
                </label>
                <input
                  id="monetag-domain"
                  type="text"
                  value={scriptDomain}
                  onChange={(e) => setScriptDomain(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm font-mono-tabular"
                />
              </div>

              {format === 'direct_link' && (
                <div>
                  <label htmlFor="monetag-direct-url" className="block text-xs font-semibold mb-1.5">
                    Direct Link Destination (https://)
                  </label>
                  <input
                    id="monetag-direct-url"
                    type="url"
                    value={directLinkUrl}
                    onChange={(e) => setDirectLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={savingMonetag}
                className="btn-transparent-black-solid w-full inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{savingMonetag ? 'Saving to Firestore...' : 'Add Monetag Ad Zone'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B]">
            <h2 className="font-editorial text-xl font-semibold mb-5">
              Firestore Monetag Campaigns ({monetagCampaigns.length})
            </h2>
            {monetagCampaigns.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-8 text-center">
                No Monetag campaigns saved in Firestore yet.
              </p>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {monetagCampaigns.map((entry) => (
                  <div
                    key={entry.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold text-sm">{entry.name}</div>
                      <div className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1 font-mono-tabular">
                        Zone #{entry.zoneId} · {entry.format.replace(/_/g, ' ')} · {entry.placement} ·{' '}
                        {entry.locale.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAdCampaignInFirestore({
                            actorUid,
                            actorEmail,
                            campaignId: entry.id,
                            nextEnabled: !entry.enabled,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          entry.enabled ? 'btn-transparent-black-solid' : 'btn-transparent-black'
                        }`}
                      >
                        {entry.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteAdCampaignInFirestore({
                            actorUid,
                            actorEmail,
                            campaignId: entry.id,
                          })
                        }
                        aria-label={`Delete ${entry.name}`}
                        className="btn-transparent-black p-2 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUBTAB 4: GLOBAL ADSENSE & NETWORK CONTROLS */}
      {subTab === 'settings' && (
        <section className="max-w-2xl border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-5">
          <div>
            <h2 className="font-editorial text-xl font-semibold">
              Global Google AdSense & Network Kill-Switches
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1">
              Persisted in <span className="font-mono-tabular">siteSettings/public</span>. Controls master ad rendering and Google AdSense Auto Ads script loading site-wide.
            </p>
          </div>

          <form onSubmit={handleSaveGlobalSettings} className="space-y-4">
            <div>
              <label htmlFor="global-adsense-pub" className="block text-xs font-semibold mb-1.5">
                Default Google AdSense Publisher ID
              </label>
              <input
                id="global-adsense-pub"
                type="text"
                disabled={!hasRoleAdminPermission}
                value={adsensePublisherId}
                onChange={(e) => setAdsensePublisherId(e.target.value)}
                placeholder="ca-pub-1234567890123456"
                className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm font-mono-tabular disabled:opacity-60"
              />
            </div>

            <div className="space-y-2.5 text-xs pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasRoleAdminPermission}
                  checked={adsEnabled}
                  onChange={(e) => setAdsEnabled(e.target.checked)}
                />
                <span className="font-semibold">
                  Enable Advertisements Site-Wide (Master Switch)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasRoleAdminPermission}
                  checked={adsenseAutoAds}
                  onChange={(e) => setAdsenseAutoAds(e.target.checked)}
                />
                <span>Load Google AdSense Auto-Ads Script on Public Editions</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasRoleAdminPermission}
                  checked={monetagGlobalEnabled}
                  onChange={(e) => setMonetagGlobalEnabled(e.target.checked)}
                />
                <span>Allow Monetag Ad Placements</span>
              </label>
            </div>

            {hasRoleAdminPermission ? (
              <button
                type="submit"
                disabled={savingGlobal}
                className="btn-transparent-black-solid inline-flex items-center gap-2 min-h-[42px] px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{savingGlobal ? 'Saving Settings...' : 'Save Global Ad Settings'}</span>
              </button>
            ) : (
              <p className="text-xs text-black/55 dark:text-[#A5AAB4]">
                Site-wide settings require Super Admin privileges to modify.
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
