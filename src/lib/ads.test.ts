import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCampaignWithinSchedule,
  resolvePlacementAd,
  validateAdSenseSlotInput,
  validateDirectBannerInput,
  validateGlobalAdSettings,
} from './adsStore';
import type { AdSlotConfig, DirectBannerCampaign, MonetagAdEntry } from '../types/qorvia';

test('validateDirectBannerInput blocks unsafe URLs and inverted schedules', () => {
  const unsafeDest = validateDirectBannerInput({
    title: 'Developer Bootcamp',
    imageUrl: 'https://cdn.example.com/banner.webp',
    destinationUrl: 'javascript:alert(1)',
  });
  assert.equal(unsafeDest.valid, false);

  const badImg = validateDirectBannerInput({
    title: 'Developer Bootcamp',
    imageUrl: 'data:text/html,<script>alert(1)</script>',
    destinationUrl: 'https://partner.example.com',
  });
  assert.equal(badImg.valid, false);

  const invertedDates = validateDirectBannerInput({
    title: 'Developer Bootcamp',
    imageUrl: 'https://cdn.example.com/banner.webp',
    destinationUrl: 'https://partner.example.com',
    startAt: '2026-12-10T00:00:00Z',
    endAt: '2026-12-01T00:00:00Z',
  });
  assert.equal(invertedDates.valid, false);

  const valid = validateDirectBannerInput({
    title: 'QORVIA Academic Partner',
    imageUrl: 'https://cdn.example.com/banner.webp',
    destinationUrl: 'https://partner.example.com',
    startAt: '2026-11-01T00:00:00Z',
    endAt: '2026-12-31T00:00:00Z',
  });
  assert.equal(valid.valid, true);
});

test('validateAdSenseSlotInput and validateGlobalAdSettings enforce valid ID formats', () => {
  assert.equal(
    validateAdSenseSlotInput({
      name: 'Sidebar Unit',
      adsenseClient: 'ca-pub-invalid',
      adsenseSlot: '1234567890',
    }).valid,
    false
  );

  assert.equal(
    validateAdSenseSlotInput({
      name: 'Sidebar Unit',
      adsenseClient: 'ca-pub-1234567890123456',
      adsenseSlot: '9876543210',
      format: 'rectangle',
    }).valid,
    true
  );

  assert.equal(
    validateGlobalAdSettings({
      adsEnabled: true,
      adsensePublisherId: 'not-a-pub-id',
      adsenseAutoAds: false,
      monetagGlobalEnabled: true,
    }).valid,
    false
  );
});

test('isCampaignWithinSchedule honors startAt and endAt windows', () => {
  const camp: DirectBannerCampaign = {
    campaignId: 'camp-1',
    title: 'Winter Scholarship',
    provider: 'direct_banner',
    placement: 'header',
    locale: 'bn',
    imageUrl: 'https://cdn.example.com/bn-banner.jpg',
    destinationUrl: 'https://scholar.example.com',
    startAt: '2026-11-10T00:00:00Z',
    endAt: '2026-11-20T00:00:00Z',
    enabled: true,
    createdAt: '2026-11-01T00:00:00Z',
  };

  assert.equal(isCampaignWithinSchedule(camp, Date.parse('2026-11-05T00:00:00Z')), false);
  assert.equal(isCampaignWithinSchedule(camp, Date.parse('2026-11-15T12:00:00Z')), true);
  assert.equal(isCampaignWithinSchedule(camp, Date.parse('2026-11-25T00:00:00Z')), false);
});

test('resolvePlacementAd respects master switch, slot disable, locale precedence, and AdSense', () => {
  const slots: AdSlotConfig[] = [
    {
      slotId: 'slot-sidebar',
      name: 'Sidebar AdSense Unit',
      placement: 'sidebar',
      provider: 'adsense',
      enabled: true,
      locale: 'all',
      adsenseClient: 'ca-pub-1234567890123456',
      adsenseSlot: '4455667788',
      adsenseFormat: 'rectangle',
    },
    {
      slotId: 'slot-header-disabled',
      name: 'Header Disabled',
      placement: 'header',
      provider: 'direct_banner',
      enabled: false,
      locale: 'en',
    },
  ];

  const banners: DirectBannerCampaign[] = [
    {
      campaignId: 'banner-bn-header',
      title: 'Dhaka Tech Conf',
      provider: 'direct_banner',
      placement: 'header',
      locale: 'bn',
      imageUrl: 'https://cdn.example.com/dhaka.jpg',
      destinationUrl: 'https://dhakatech.example.com',
      enabled: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const monetags: MonetagAdEntry[] = [
    {
      id: 'mon-1',
      name: 'Bottom Push',
      zoneId: '8492014',
      format: 'in_page_push',
      placement: 'article_bottom',
      locale: 'all',
      scriptDomain: 'alwingulla.com',
      enabled: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  // Disabled specifically for English header
  const enHeader = resolvePlacementAd({
    placement: 'header',
    locale: 'en',
    adSlots: slots,
    directBanners: banners,
  });
  assert.equal(enHeader.mode, 'disabled');

  // Bengali header still resolves the BN direct banner
  const bnHeader = resolvePlacementAd({
    placement: 'header',
    locale: 'bn',
    adSlots: slots,
    directBanners: banners,
  });
  assert.equal(bnHeader.mode, 'direct_banner');
  if (bnHeader.mode === 'direct_banner') {
    assert.equal(bnHeader.campaign.campaignId, 'banner-bn-header');
  }

  // Sidebar resolves configured AdSense unit
  const sidebar = resolvePlacementAd({
    placement: 'sidebar',
    locale: 'en',
    adSlots: slots,
    monetagAds: monetags,
  });
  assert.equal(sidebar.mode, 'adsense');
  if (sidebar.mode === 'adsense') {
    assert.equal(sidebar.adsenseSlot, '4455667788');
  }

  // Master kill switch turns off all placements
  const killed = resolvePlacementAd({
    placement: 'article_bottom',
    locale: 'en',
    monetagAds: monetags,
    globalAdSettings: {
      adsEnabled: false,
      adsensePublisherId: '',
      adsenseAutoAds: false,
      monetagGlobalEnabled: true,
    },
  });
  assert.equal(killed.mode, 'disabled');
});
