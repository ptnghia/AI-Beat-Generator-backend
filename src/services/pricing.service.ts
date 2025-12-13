import { loggingService } from './logging.service';

/**
 * Pricing Tier Definitions for BeatStars
 */
export interface PricingTier {
  name: string;
  price: number;
  currency: string;
  files: string[];
  streamLimit: number | 'unlimited';
  distributionCopies: number | 'unlimited';
  musicVideos: number | 'unlimited';
  radioStations: number | 'unlimited';
  exclusive: boolean;
  description: string;
}

/**
 * Standard BeatStars Pricing Tiers (Updated 2025)
 * Based on BEATSTARS_GUIDE.md recommendations for AI beats
 */
export const PRICING_TIERS: Record<string, PricingTier> = {
  mp3Lease: {
    name: 'MP3 Lease',
    price: 25,
    currency: 'USD',
    files: ['MP3'],
    streamLimit: 100000,
    distributionCopies: 100000,
    musicVideos: 1,
    radioStations: 2,
    exclusive: false,
    description: 'High-quality MP3 lease for online releases and streaming. AI-assisted generation.'
  },
  wavLease: {
    name: 'WAV Lease',
    price: 49,
    currency: 'USD',
    files: ['MP3', 'WAV'],
    streamLimit: 500000,
    distributionCopies: 500000,
    musicVideos: 2,
    radioStations: 'unlimited',
    exclusive: false,
    description: 'Professional WAV + MP3 files. Perfect for serious artists and distribution.'
  },
  trackout: {
    name: 'Trackout / Stems',
    price: 99,
    currency: 'USD',
    files: ['MP3', 'WAV', 'Stems'],
    streamLimit: 'unlimited',
    distributionCopies: 'unlimited',
    musicVideos: 3,
    radioStations: 'unlimited',
    exclusive: false,
    description: 'Full trackout with stems for complete creative control and mixing.'
  },
  exclusive: {
    name: 'Exclusive Rights (AI)',
    price: 499,
    currency: 'USD',
    files: ['MP3', 'WAV', 'Stems'],
    streamLimit: 'unlimited',
    distributionCopies: 'unlimited',
    musicVideos: 'unlimited',
    radioStations: 'unlimited',
    exclusive: true,
    description: 'Exclusive ownership! Beat removed from store. All files included. AI-assisted generation with full commercial rights.'
  }
};

/**
 * Licensing Terms for Each Tier
 */
export interface LicensingTerms {
  tier: string;
  allowedUses: string[];
  restrictions: string[];
  duration: string;
  territory: string;
  creditRequired: boolean;
}

export const LICENSING_TERMS: Record<string, LicensingTerms> = {
  basic: {
    tier: 'Basic Lease',
    allowedUses: [
      'Audio streaming (Spotify, Apple Music, etc.)',
      'Music video on YouTube/social media',
      'Live performances',
      'Radio broadcasts (up to 2 stations)'
    ],
    restrictions: [
      'Cannot resell or redistribute the beat',
      'Producer credit required',
      'Non-exclusive license'
    ],
    duration: 'Perpetual',
    territory: 'Worldwide',
    creditRequired: true
  },
  premium: {
    tier: 'Premium Lease',
    allowedUses: [
      'Audio streaming (Spotify, Apple Music, etc.)',
      'Up to 2 music videos',
      'Live performances',
      'Unlimited radio broadcasts',
      'Paid performances'
    ],
    restrictions: [
      'Cannot resell or redistribute the beat',
      'Producer credit required',
      'Non-exclusive license'
    ],
    duration: 'Perpetual',
    territory: 'Worldwide',
    creditRequired: true
  },
  unlimited: {
    tier: 'Unlimited Lease',
    allowedUses: [
      'Unlimited audio streaming',
      'Unlimited music videos',
      'Unlimited live performances',
      'Unlimited radio broadcasts',
      'Paid performances',
      'Remix and edit with stems'
    ],
    restrictions: [
      'Cannot resell or redistribute the beat',
      'Producer credit required',
      'Non-exclusive license'
    ],
    duration: 'Perpetual',
    territory: 'Worldwide',
    creditRequired: true
  },
  exclusive: {
    tier: 'Exclusive Rights',
    allowedUses: [
      'Full ownership and copyright',
      'Unlimited distribution',
      'Unlimited music videos',
      'Unlimited performances',
      'Can resell or license to others',
      'Full creative control'
    ],
    restrictions: [
      'Beat removed from store after purchase',
      'Producer credit optional (but appreciated)'
    ],
    duration: 'Perpetual',
    territory: 'Worldwide',
    creditRequired: false
  }
};

export class PricingService {
  /**
   * Get all pricing tiers
   */
  getAllPricingTiers(): PricingTier[] {
    return Object.values(PRICING_TIERS);
  }

  /**
   * Get specific pricing tier
   */
  getPricingTier(tierName: string): PricingTier | null {
    return PRICING_TIERS[tierName] || null;
  }

  /**
   * Get licensing terms for a tier
   */
  getLicensingTerms(tierName: string): LicensingTerms | null {
    return LICENSING_TERMS[tierName] || null;
  }

  /**
   * Generate licensing document text
   */
  generateLicenseDocument(
    tierName: string,
    beatName: string,
    producerName: string,
    purchaserName?: string
  ): string {
    const tier = this.getPricingTier(tierName);
    const terms = this.getLicensingTerms(tierName);

    if (!tier || !terms) {
      throw new Error(`Invalid pricing tier: ${tierName}`);
    }

    const sections: string[] = [];

    // Header
    sections.push('BEAT LICENSE AGREEMENT');
    sections.push('='.repeat(80));
    sections.push('');

    // Beat Information
    sections.push('BEAT INFORMATION:');
    sections.push(`Beat Title: ${beatName}`);
    sections.push(`Producer: ${producerName}`);
    sections.push(`License Type: ${tier.name}`);
    sections.push(`License Price: $${tier.price} ${tier.currency}`);
    if (purchaserName) {
      sections.push(`Licensee: ${purchaserName}`);
    }
    sections.push('');

    // Files Included
    sections.push('FILES INCLUDED:');
    tier.files.forEach(file => sections.push(`• ${file}`));
    sections.push('');

    // Allowed Uses
    sections.push('ALLOWED USES:');
    terms.allowedUses.forEach(use => sections.push(`✓ ${use}`));
    sections.push('');

    // Distribution Limits
    sections.push('DISTRIBUTION LIMITS:');
    sections.push(`• Audio Streams: ${tier.streamLimit === 'unlimited' ? 'Unlimited' : tier.streamLimit.toLocaleString()}`);
    sections.push(`• Distribution Copies: ${tier.distributionCopies === 'unlimited' ? 'Unlimited' : tier.distributionCopies.toLocaleString()}`);
    sections.push(`• Music Videos: ${tier.musicVideos === 'unlimited' ? 'Unlimited' : tier.musicVideos}`);
    sections.push(`• Radio Stations: ${tier.radioStations === 'unlimited' ? 'Unlimited' : tier.radioStations}`);
    sections.push('');

    // Restrictions
    sections.push('RESTRICTIONS:');
    terms.restrictions.forEach(restriction => sections.push(`✗ ${restriction}`));
    sections.push('');

    // License Details
    sections.push('LICENSE DETAILS:');
    sections.push(`• Duration: ${terms.duration}`);
    sections.push(`• Territory: ${terms.territory}`);
    sections.push(`• Exclusive: ${tier.exclusive ? 'Yes' : 'No'}`);
    sections.push(`• Producer Credit Required: ${terms.creditRequired ? 'Yes' : 'No'}`);
    sections.push('');

    // Producer Credit Format
    if (terms.creditRequired) {
      sections.push('PRODUCER CREDIT FORMAT:');
      sections.push(`"Produced by ${producerName}"`);
      sections.push('or');
      sections.push(`"Beat by ${producerName}"`);
      sections.push('');
    }

    // Footer
    sections.push('='.repeat(80));
    sections.push('This license is granted upon full payment and is non-refundable.');
    sections.push('For questions, please contact the producer.');
    sections.push('');
    sections.push(`Generated: ${new Date().toISOString()}`);

    const document = sections.join('\n');

    loggingService.info('Generated license document', {
      service: 'PricingService',
      tier: tierName,
      beatName,
      documentLength: document.length
    });

    return document;
  }

  /**
   * Generate pricing comparison table (for display)
   */
  generatePricingTable(): string {
    const tiers = this.getAllPricingTiers();
    const lines: string[] = [];

    lines.push('PRICING TIERS COMPARISON');
    lines.push('='.repeat(100));
    lines.push('');

    // Header
    lines.push(
      'Tier'.padEnd(20) +
      'Price'.padEnd(15) +
      'Files'.padEnd(25) +
      'Streams'.padEnd(20) +
      'Exclusive'.padEnd(10)
    );
    lines.push('-'.repeat(100));

    // Rows
    tiers.forEach(tier => {
      lines.push(
        tier.name.padEnd(20) +
        `$${tier.price}`.padEnd(15) +
        tier.files.join(', ').padEnd(25) +
        (tier.streamLimit === 'unlimited' ? 'Unlimited' : tier.streamLimit.toString()).padEnd(20) +
        (tier.exclusive ? 'Yes' : 'No').padEnd(10)
      );
    });

    lines.push('='.repeat(100));

    return lines.join('\n');
  }

  /**
   * Get recommended tier based on artist needs
   */
  getRecommendedTier(
    expectedStreams: number,
    needsStems: boolean,
    wantsExclusive: boolean
  ): string {
    if (wantsExclusive) {
      return 'exclusive';
    }

    if (needsStems || expectedStreams > 10000) {
      return 'unlimited';
    }

    if (expectedStreams > 2500) {
      return 'premium';
    }

    return 'basic';
  }

  /**
   * Calculate total revenue for a beat across all tiers
   */
  calculatePotentialRevenue(salesByTier: Record<string, number>): number {
    let total = 0;

    Object.entries(salesByTier).forEach(([tier, count]) => {
      const pricing = this.getPricingTier(tier);
      if (pricing) {
        total += pricing.price * count;
      }
    });

    return total;
  }
}

export const pricingService = new PricingService();
