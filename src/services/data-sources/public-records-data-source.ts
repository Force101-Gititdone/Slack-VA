import { PropertyDetails } from '../../utils/validation.js';
import { Comp } from './mock-data-source.js';
import { logger } from '../../utils/logger.js';

/**
 * Public Records Data Source
 * Fetches property data from county assessor databases
 * This is a safe, legal data source for CMA generation
 */
export class PublicRecordsDataSource {
  /**
   * Fetch comparable properties from public records
   * 
   * Note: This is a placeholder implementation. In production, you would:
   * 1. Parse the property address to extract county/state
   * 2. Query the appropriate county assessor API or database
   * 3. Filter properties by ZIP code and similar characteristics
   * 4. Return structured comp data
   * 
   * For now, this returns mock data but is structured to be easily
   * replaced with real API calls to county assessor systems.
   */
  static async fetchComps(
    address: string,
    propertyDetails?: PropertyDetails
  ): Promise<Comp[]> {
    logger.info('Fetching comps from public records', { address, propertyDetails });

    // Extract ZIP code from address
    const zipMatch = address.match(/\b\d{5}\b/);
    const zip = zipMatch ? zipMatch[0] : null;

    if (!zip) {
      logger.warn('Could not extract ZIP code from address', { address });
      // Fallback: return empty array or use a default ZIP
      return [];
    }

    // TODO: Implement actual public records API integration
    // For now, return enhanced mock data that simulates public records
    
    // Simulate API delay (public records APIs can be slow)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const targetBeds = propertyDetails?.beds || 3;
    const targetBaths = propertyDetails?.baths || 2;
    const targetSqft = propertyDetails?.sqft || 1800;
    const targetYearBuilt = propertyDetails?.yearBuilt || 2010;

    // Generate comps that simulate public records data
    // Public records typically have:
    // - Sale prices (from recorded deeds)
    // - Property characteristics (from assessor records)
    // - Sale dates (from recorded transactions)
    // - Less frequent updates (30-90 day delay)

    const comps: Comp[] = [];
    const basePrice = 450000;

    // Generate 10-15 comps (public records may have more data)
    const numComps = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < numComps; i++) {
      // Vary beds by ±1
      const beds = Math.max(1, targetBeds + Math.floor(Math.random() * 3) - 1);
      
      // Vary baths by ±0.5
      const baths = Math.max(0.5, targetBaths + (Math.random() * 1.5 - 0.75));
      
      // Vary sqft by ±20%
      const sqftVariation = 1 + (Math.random() * 0.4 - 0.2);
      const sqft = Math.floor(targetSqft * sqftVariation);
      
      // Vary year built by ±10 years (public records may have older data)
      const yearBuilt = targetYearBuilt + Math.floor(Math.random() * 21) - 10;
      
      // Calculate price based on sqft (roughly $200-300 per sqft)
      const pricePerSqft = 200 + Math.random() * 100;
      const salePrice = Math.floor(sqft * pricePerSqft);
      
      // Public records typically show sold properties (recorded deeds)
      // 80% sold, 20% listed (if assessor tracks listings)
      const isSold = Math.random() > 0.2;
      
      // Public records sales are typically 30-180 days old (recording delay)
      const daysAgo = 30 + Math.floor(Math.random() * 150);

      const comp: Comp = {
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Maple', 'Cedar'][Math.floor(Math.random() * 8)]} St, ${this.extractCity(address)}, ${this.extractState(address)} ${zip}`,
        beds,
        baths: Math.round(baths * 2) / 2,
        sqft,
        lotSize: Math.floor(5000 + Math.random() * 5000),
        yearBuilt,
        dataSource: 'public_records',
        sourceUrl: this.generateSourceUrl(zip, i),
      };

      if (isSold) {
        comp.salePrice = salePrice;
        const soldDate = new Date();
        soldDate.setDate(soldDate.getDate() - daysAgo);
        comp.soldDate = soldDate;
      } else {
        comp.listPrice = salePrice;
        const listDate = new Date();
        listDate.setDate(listDate.getDate() - Math.floor(Math.random() * 30));
        comp.listDate = listDate;
      }

      comps.push(comp);
    }

    logger.info(`Generated ${comps.length} comps from public records`);
    return comps;
  }

  /**
   * Extract city from address string
   */
  private static extractCity(address: string): string {
    // Try to extract city (usually before state/ZIP)
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return 'Denver'; // Default
  }

  /**
   * Extract state from address string
   */
  private static extractState(address: string): string {
    // Try to extract state (usually 2-letter code before ZIP)
    const stateMatch = address.match(/\b([A-Z]{2})\s+\d{5}\b/);
    return stateMatch ? stateMatch[1] : 'CO'; // Default to Colorado
  }

  /**
   * Generate a source URL for the comp
   * In production, this would link to the actual county assessor record
   */
  private static generateSourceUrl(zip: string, index: number): string {
    // This is a placeholder - in production, you'd generate actual assessor URLs
    return `https://assessor.example.com/property/${zip}/${index}`;
  }

  /**
   * Validate that we can access public records for a given address
   */
  static async validateAccess(address: string): Promise<{ available: boolean; source?: string; error?: string }> {
    const zipMatch = address.match(/\b\d{5}\b/);
    if (!zipMatch) {
      return {
        available: false,
        error: 'Could not extract ZIP code from address',
      };
    }

    // TODO: In production, check if we have API access or scraper configured
    // for the county that contains this ZIP code

    return {
      available: true,
      source: 'public_records',
    };
  }
}

