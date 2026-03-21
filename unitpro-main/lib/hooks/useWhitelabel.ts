"use client";
// lib/hooks/useWhitelabel.ts
// Returns whitelabel config for a negocio's agency, cached in localStorage for 1 hour.
//
// SQL (reference only — do NOT execute):
// ALTER TABLE agencies ADD COLUMN IF NOT EXISTS whitelabel_config jsonb DEFAULT '{}';
// -- whitelabel_config structure: { domain, logoUrl, primaryColor, name, favicon }

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export interface WhitelabelConfig {
  primaryColor: string;
  logoUrl: string | null;
  platformName: string;
  faviconUrl: string | null;
  customDomain: string | null;
  isWhitelabel: boolean;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const DEFAULT: WhitelabelConfig = {
  primaryColor: '#577a2c',
  logoUrl: null,
  platformName: 'UnitPro',
  faviconUrl: null,
  customDomain: null,
  isWhitelabel: false,
};

export function useWhitelabel(negocioId: number, agencyId?: number | null): WhitelabelConfig {
  const [config, setConfig] = useState<WhitelabelConfig>(DEFAULT);

  useEffect(() => {
    if (!agencyId) return;

    const cacheKey = `unitpro_wl_${agencyId}`;

    // Check cache first to avoid unnecessary Supabase round-trips
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, expiry } = JSON.parse(cached);
        if (Date.now() < expiry) {
          setConfig(data);
          return;
        }
      }
    } catch {
      // Ignore malformed cache entries
    }

    // Fetch fresh data from Supabase
    const supabase = createClient();
    supabase
      .from('agencies')
      .select('whitelabel_config, nombre_agencia, name')
      .eq('id', agencyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return;
        const wl = data.whitelabel_config as Record<string, any> | null;
        if (!wl || Object.keys(wl).length === 0) return;

        const result: WhitelabelConfig = {
          primaryColor: wl.primaryColor || '#577a2c',
          logoUrl: wl.logoUrl || null,
          platformName: wl.name || data.nombre_agencia || data.name || 'UnitPro',
          faviconUrl: wl.favicon || null,
          customDomain: wl.domain || null,
          isWhitelabel: true,
        };

        setConfig(result);

        // Persist to cache so subsequent renders are instant
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: result,
            expiry: Date.now() + CACHE_TTL_MS,
          }));
        } catch {
          // localStorage may be unavailable (private mode, quota exceeded)
        }
      });
  }, [negocioId, agencyId]);

  return config;
}
