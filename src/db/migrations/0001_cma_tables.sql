-- Migration: Add CMA tables
-- Created: 2025-01-27

-- CMA Requests table
CREATE TABLE IF NOT EXISTS cma_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_zip TEXT,
  property_details JSONB,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'pending',
  data_source TEXT,
  comps_count INTEGER,
  estimated_value JSONB,
  generated_at TIMESTAMPTZ,
  pdf_url TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMA Comps table
CREATE TABLE IF NOT EXISTS cma_comps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cma_request_id UUID NOT NULL REFERENCES cma_requests(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  sale_price NUMERIC,
  list_price NUMERIC,
  sold_date DATE,
  list_date DATE,
  beds INTEGER,
  baths NUMERIC,
  sqft INTEGER,
  lot_size NUMERIC,
  year_built INTEGER,
  data_source TEXT,
  source_url TEXT,
  similarity_score NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CMA Data Sources table
CREATE TABLE IF NOT EXISTS cma_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  api_key TEXT,
  api_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cma_requests_slack_user_id ON cma_requests(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_cma_requests_status ON cma_requests(status);
CREATE INDEX IF NOT EXISTS idx_cma_requests_requested_at ON cma_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cma_comps_cma_request_id ON cma_comps(cma_request_id);
CREATE INDEX IF NOT EXISTS idx_cma_comps_similarity_score ON cma_comps(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_cma_data_sources_slack_user_id ON cma_data_sources(slack_user_id);
CREATE INDEX IF NOT EXISTS idx_cma_data_sources_is_active ON cma_data_sources(is_active);

