import { PropertyDetails } from '../../utils/validation.js';
import { logger } from '../../utils/logger.js';

/**
 * Comp (comparable property) interface
 */
export interface Comp {
  address: string;
  salePrice?: number;
  listPrice?: number;
  soldDate?: Date;
  listDate?: Date;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  dataSource: string;
  sourceUrl?: string;
  similarityScore?: number; // Added during ranking (0-1)
}

/**
 * Mock data source for testing CMA functionality
 * Generates realistic mock comparable properties based on target property
 */
export class MockDataSource {
  /**
   * Fetch comparable properties (mock data)
   */
  static async fetchComps(
    address: string,
    propertyDetails?: PropertyDetails
  ): Promise<Comp[]> {
    logger.info('Fetching mock comps', { address, propertyDetails });

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const targetBeds = propertyDetails?.beds || 3;
    const targetBaths = propertyDetails?.baths || 2;
    const targetSqft = propertyDetails?.sqft || 1800;
    const targetYearBuilt = propertyDetails?.yearBuilt || 2010;

    // Generate 10 mock comps with variations around target property
    const comps: Comp[] = [];
    const basePrice = 450000; // Base price for calculations

    for (let i = 0; i < 10; i++) {
      // Vary beds by ±1
      const beds = Math.max(1, targetBeds + Math.floor(Math.random() * 3) - 1);
      
      // Vary baths by ±0.5
      const baths = Math.max(0.5, targetBaths + (Math.random() * 1.5 - 0.75));
      
      // Vary sqft by ±20%
      const sqftVariation = 1 + (Math.random() * 0.4 - 0.2);
      const sqft = Math.floor(targetSqft * sqftVariation);
      
      // Vary year built by ±5 years
      const yearBuilt = targetYearBuilt + Math.floor(Math.random() * 11) - 5;
      
      // Calculate price based on sqft (roughly $200-300 per sqft)
      const pricePerSqft = 200 + Math.random() * 100;
      const salePrice = Math.floor(sqft * pricePerSqft);
      
      // Some comps are sold, some are listed
      const isSold = Math.random() > 0.3; // 70% sold, 30% listed
      
      const comp: Comp = {
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Maple', 'Cedar'][Math.floor(Math.random() * 8)]} St, Denver, CO 8020${Math.floor(Math.random() * 10)}`,
        beds,
        baths: Math.round(baths * 2) / 2, // Round to 0.5
        sqft,
        lotSize: Math.floor(5000 + Math.random() * 5000),
        yearBuilt,
        dataSource: 'mock',
        sourceUrl: `https://mock-mls.example.com/listing/${Math.floor(Math.random() * 10000)}`,
      };

      if (isSold) {
        comp.salePrice = salePrice;
        // Sold within last 6 months
        const daysAgo = Math.floor(Math.random() * 180);
        comp.soldDate = new Date();
        comp.soldDate.setDate(comp.soldDate.getDate() - daysAgo);
      } else {
        comp.listPrice = salePrice;
        // Listed within last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        comp.listDate = new Date();
        comp.listDate.setDate(comp.listDate.getDate() - daysAgo);
      }

      comps.push(comp);
    }

    logger.info(`Generated ${comps.length} mock comps`);
    return comps;
  }
}

