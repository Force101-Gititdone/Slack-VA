// Input validation utilities

import { ValidationError } from './errors.js';

/**
 * Validate email address format
 */
export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required');
  }

  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError(`Invalid email format: ${email}`);
  }

  return trimmed;
}

/**
 * Validate non-empty string
 */
export function validateNonEmpty(value: string, fieldName: string = 'Field'): string {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  return trimmed;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Field'
): string {
  const trimmed = validateNonEmpty(value, fieldName);
  
  if (trimmed.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters`);
  }
  
  if (trimmed.length > max) {
    throw new ValidationError(`${fieldName} must be at most ${max} characters`);
  }

  return trimmed;
}

/**
 * Validate date range
 */
export function validateDateRange(start: Date, end: Date): void {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    throw new ValidationError('Invalid date range');
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date values');
  }

  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }
}

/**
 * Validate query text for email/calendar queries
 */
export function validateQuery(query: string): string {
  return validateLength(query, 1, 500, 'Query');
}

/**
 * Validate contact identifier (email or name)
 */
export function validateContactIdentifier(identifier: string): string {
  const trimmed = validateNonEmpty(identifier, 'Contact identifier');
  
  // Allow email format or name (at least 2 characters)
  if (trimmed.length < 2) {
    throw new ValidationError('Contact identifier must be at least 2 characters');
  }

  return trimmed;
}

/**
 * Property details interface
 */
export interface PropertyDetails {
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
}

/**
 * Validate property address
 */
export function validatePropertyAddress(address: string): string {
  const trimmed = validateNonEmpty(address, 'Property address');
  
  // Basic address validation - should contain at least street number and name
  if (trimmed.length < 5) {
    throw new ValidationError('Property address must be at least 5 characters');
  }
  
  // Should contain at least one number (street number)
  if (!/\d/.test(trimmed)) {
    throw new ValidationError('Property address should include a street number');
  }

  return trimmed;
}

/**
 * Validate property details
 */
export function validatePropertyDetails(details: PropertyDetails): PropertyDetails {
  const validated: PropertyDetails = {};

  if (details.beds !== undefined) {
    if (typeof details.beds !== 'number' || details.beds < 0 || details.beds > 50) {
      throw new ValidationError('Beds must be a number between 0 and 50');
    }
    validated.beds = Math.floor(details.beds);
  }

  if (details.baths !== undefined) {
    if (typeof details.baths !== 'number' || details.baths < 0 || details.baths > 50) {
      throw new ValidationError('Baths must be a number between 0 and 50');
    }
    validated.baths = details.baths;
  }

  if (details.sqft !== undefined) {
    if (typeof details.sqft !== 'number' || details.sqft < 0 || details.sqft > 100000) {
      throw new ValidationError('Square footage must be a number between 0 and 100,000');
    }
    validated.sqft = Math.floor(details.sqft);
  }

  if (details.lotSize !== undefined) {
    if (typeof details.lotSize !== 'number' || details.lotSize < 0 || details.lotSize > 1000000) {
      throw new ValidationError('Lot size must be a number between 0 and 1,000,000');
    }
    validated.lotSize = details.lotSize;
  }

  if (details.yearBuilt !== undefined) {
    const currentYear = new Date().getFullYear();
    if (typeof details.yearBuilt !== 'number' || details.yearBuilt < 1800 || details.yearBuilt > currentYear + 1) {
      throw new ValidationError(`Year built must be a number between 1800 and ${currentYear + 1}`);
    }
    validated.yearBuilt = Math.floor(details.yearBuilt);
  }

  return validated;
}

