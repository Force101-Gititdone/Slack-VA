import { db } from '../db/client.js';
import { cmaRequests, cmaComps } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { PropertyDetails, validatePropertyAddress, validatePropertyDetails } from '../utils/validation.js';
import { MockDataSource, Comp } from './data-sources/mock-data-source.js';
import { PublicRecordsDataSource } from './data-sources/public-records-data-source.js';
import { CMAPDFService } from './cma-pdf.js';
import { logger } from '../utils/logger.js';

/**
 * CMA Service - Handles CMA generation logic
 */
export class CMAService {
  /**
   * Generate a CMA for a property
   */
  static async generateCMA(
    slackUserId: string,
    address: string,
    propertyDetails?: PropertyDetails
  ): Promise<string> {
    // Validate inputs
    const validatedAddress = validatePropertyAddress(address);
    const validatedDetails = propertyDetails ? validatePropertyDetails(propertyDetails) : undefined;

    logger.info('Generating CMA', { slackUserId, address: validatedAddress, propertyDetails: validatedDetails });

    // Create CMA request record
    const [cmaRequest] = await db
      .insert(cmaRequests)
      .values({
        slackUserId,
        propertyAddress: validatedAddress,
        propertyZip: this.extractZip(validatedAddress),
        propertyDetails: validatedDetails || null,
        status: 'processing',
        dataSource: 'public_records', // Will be updated if fallback to mock
      })
      .returning();

    try {
      // Try public records first (safest, legal data source)
      let comps: Comp[] = [];
      let dataSource = 'public_records';

      try {
        const accessCheck = await PublicRecordsDataSource.validateAccess(validatedAddress);
        if (accessCheck.available) {
          comps = await PublicRecordsDataSource.fetchComps(validatedAddress, validatedDetails);
          logger.info('Fetched comps from public records', { count: comps.length });
        } else {
          logger.warn('Public records not available, falling back to mock', { error: accessCheck.error });
          comps = await MockDataSource.fetchComps(validatedAddress, validatedDetails);
          dataSource = 'mock';
        }
      } catch (error) {
        logger.warn('Public records fetch failed, falling back to mock', {}, error instanceof Error ? error : undefined);
        comps = await MockDataSource.fetchComps(validatedAddress, validatedDetails);
        dataSource = 'mock';
      }

      // Filter and rank comps
      const rankedComps = this.filterAndRankComps(comps, validatedDetails);

      // Calculate estimated value
      const estimatedValue = this.calculateEstimatedValue(rankedComps);

      // Store comps in database
      await db.insert(cmaComps).values(
        rankedComps.map((comp) => ({
          cmaRequestId: cmaRequest.id,
          address: comp.address,
          salePrice: comp.salePrice?.toString(),
          listPrice: comp.listPrice?.toString(),
          soldDate: comp.soldDate,
          listDate: comp.listDate,
          beds: comp.beds,
          baths: comp.baths?.toString(),
          sqft: comp.sqft,
          lotSize: comp.lotSize?.toString(),
          yearBuilt: comp.yearBuilt,
          dataSource: comp.dataSource,
          sourceUrl: comp.sourceUrl,
          similarityScore: comp.similarityScore?.toString(),
        }))
      );

      // Generate PDF report
      let pdfUrl: string | null = null;
      try {
        const pdfPath = await CMAPDFService.generatePDF(cmaRequest.id, slackUserId);
        pdfUrl = pdfPath; // In production, upload to S3/storage and return URL
        logger.info('CMA PDF generated', { cmaId: cmaRequest.id, pdfPath });
      } catch (error) {
        logger.warn('PDF generation failed, continuing without PDF', { cmaId: cmaRequest.id }, error instanceof Error ? error : undefined);
        // Don't fail the whole CMA if PDF generation fails
      }

      // Update CMA request with results
      await db
        .update(cmaRequests)
        .set({
          status: 'completed',
          compsCount: rankedComps.length,
          estimatedValue: {
            low: estimatedValue.low,
            mid: estimatedValue.mid,
            high: estimatedValue.high,
          },
          dataSource,
          pdfUrl,
          generatedAt: new Date(),
        })
        .where(eq(cmaRequests.id, cmaRequest.id));

      logger.info('CMA generated successfully', { cmaId: cmaRequest.id, compsCount: rankedComps.length, pdfUrl });

      return cmaRequest.id;
    } catch (error) {
      // Update request with error
      await db
        .update(cmaRequests)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(cmaRequests.id, cmaRequest.id));

      logger.error('CMA generation failed', { cmaId: cmaRequest.id }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get CMA request by ID
   */
  static async getCMARequest(cmaId: string, slackUserId: string) {
    const [cmaRequest] = await db
      .select()
      .from(cmaRequests)
      .where(eq(cmaRequests.id, cmaId))
      .limit(1);

    if (!cmaRequest || cmaRequest.slackUserId !== slackUserId) {
      return null;
    }

    const comps = await db
      .select()
      .from(cmaComps)
      .where(eq(cmaComps.cmaRequestId, cmaId))
      .orderBy(desc(cmaComps.similarityScore));

    return {
      ...cmaRequest,
      comps,
    };
  }

  /**
   * Get user's CMA history
   */
  static async getCMAHistory(slackUserId: string, limit: number = 10) {
    return await db
      .select()
      .from(cmaRequests)
      .where(eq(cmaRequests.slackUserId, slackUserId))
      .orderBy(desc(cmaRequests.requestedAt))
      .limit(limit);
  }

  /**
   * Filter and rank comps by similarity to target property
   */
  private static filterAndRankComps(comps: Comp[], targetDetails?: PropertyDetails): Comp[] {
    if (!targetDetails) {
      // If no target details, just return comps sorted by date
      return comps
        .map((comp) => ({
          ...comp,
          similarityScore: 0.5, // Default score
        }))
        .sort((a, b) => {
          const aDate = a.soldDate || a.listDate || new Date(0);
          const bDate = b.soldDate || b.listDate || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
    }

    // Calculate similarity score for each comp
    const compsWithScores = comps.map((comp) => {
      let score = 0;
      let factors = 0;

      // Beds similarity (0-1)
      if (comp.beds !== undefined && targetDetails.beds !== undefined) {
        const bedDiff = Math.abs(comp.beds - targetDetails.beds);
        score += Math.max(0, 1 - bedDiff / 3) * 0.3; // Within 3 beds = good match
        factors += 0.3;
      }

      // Baths similarity (0-1)
      if (comp.baths !== undefined && targetDetails.baths !== undefined) {
        const bathDiff = Math.abs(comp.baths - targetDetails.baths);
        score += Math.max(0, 1 - bathDiff / 2) * 0.25; // Within 2 baths = good match
        factors += 0.25;
      }

      // Sqft similarity (0-1)
      if (comp.sqft !== undefined && targetDetails.sqft !== undefined) {
        const sqftDiff = Math.abs(comp.sqft - targetDetails.sqft);
        const sqftPercentDiff = sqftDiff / targetDetails.sqft;
        score += Math.max(0, 1 - sqftPercentDiff) * 0.3; // Closer to target sqft = better
        factors += 0.3;
      }

      // Year built similarity (0-1)
      if (comp.yearBuilt !== undefined && targetDetails.yearBuilt !== undefined) {
        const yearDiff = Math.abs(comp.yearBuilt - targetDetails.yearBuilt);
        score += Math.max(0, 1 - yearDiff / 20) * 0.15; // Within 20 years = good match
        factors += 0.15;
      }

      // Normalize score
      const similarityScore = factors > 0 ? score / factors : 0.5;

      return {
        ...comp,
        similarityScore,
      };
    });

    // Sort by similarity score (highest first), then by date (most recent first)
    return compsWithScores.sort((a, b) => {
      const scoreDiff = (b.similarityScore || 0) - (a.similarityScore || 0);
      if (Math.abs(scoreDiff) > 0.1) {
        return scoreDiff;
      }
      // If scores are close, prefer more recent
      const aDate = a.soldDate || a.listDate || new Date(0);
      const bDate = b.soldDate || b.listDate || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  }

  /**
   * Calculate estimated value range from comps
   */
  private static calculateEstimatedValue(comps: Comp[]): { low: number; mid: number; high: number } {
    if (comps.length === 0) {
      return { low: 0, mid: 0, high: 0 };
    }

    // Get prices from comps (sale price preferred, fallback to list price)
    const prices = comps
      .map((comp) => comp.salePrice || comp.listPrice)
      .filter((price): price is number => price !== undefined);

    if (prices.length === 0) {
      return { low: 0, mid: 0, high: 0 };
    }

    // Sort prices
    prices.sort((a, b) => a - b);

    // Calculate percentiles
    const low = prices[Math.floor(prices.length * 0.25)]; // 25th percentile
    const mid = prices[Math.floor(prices.length * 0.5)]; // Median
    const high = prices[Math.floor(prices.length * 0.75)]; // 75th percentile

    return {
      low: Math.round(low),
      mid: Math.round(mid),
      high: Math.round(high),
    };
  }

  /**
   * Extract ZIP code from address string
   */
  private static extractZip(address: string): string | null {
    // Try to find 5-digit ZIP code
    const zipMatch = address.match(/\b\d{5}\b/);
    return zipMatch ? zipMatch[0] : null;
  }
}

