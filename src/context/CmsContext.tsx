import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createDefaultCmsConfig, type CmsConfig } from '../domain/cmsEngine';
import { fetchPublicCmsConfig, trackPublicAnalyticsEvent } from '../services/cmsApi';

interface CmsContextValue {
  config: CmsConfig;
  isLoaded: boolean;
  refreshPublicCms: () => Promise<void>;
  applyPublishedConfig: (next: CmsConfig) => void;
  trackEvent: (
    eventType: string,
    metadata?: Record<string, string | number | boolean>
  ) => void;
}

const CmsContext = createContext<CmsContextValue | null>(null);

function upsertMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  if (typeof document === 'undefined' || !content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function syncDocumentSeo(config: CmsConfig): void {
  if (typeof document === 'undefined') return;
  const { seo, settings } = config;
  document.title = seo.metaTitle || `${settings.brandName} — Stop Studying English. Start Speaking It.`;
  upsertMetaTag('name', 'description', seo.metaDescription);
  upsertMetaTag('property', 'og:title', seo.ogTitle || seo.metaTitle);
  upsertMetaTag('property', 'og:description', seo.ogDescription || seo.metaDescription);
  upsertMetaTag('name', 'twitter:card', seo.twitterCard || 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', seo.ogTitle || seo.metaTitle);
  upsertMetaTag('name', 'twitter:description', seo.ogDescription || seo.metaDescription);
  if (seo.ogImageUrl) {
    upsertMetaTag('property', 'og:image', seo.ogImageUrl);
    upsertMetaTag('name', 'twitter:image', seo.ogImageUrl);
  }
  if (seo.canonicalUrl) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', seo.canonicalUrl);
  }

  // Keep Schema.org WebApplication JSON-LD synced with CMS
  const ldId = 'linguaverse-schema-ld';
  let script = document.getElementById(ldId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = ldId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  const freePlan = config.pricingPlans.find((p) => p.slug === 'free');
  const premiumPlan = config.pricingPlans.find((p) => p.slug === 'premium');
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: settings.brandName,
    description: seo.metaDescription,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: seo.canonicalUrl || 'https://linguaverse.ai/',
    offers: [
      ...(freePlan
        ? [
            {
              '@type': 'Offer',
              name: freePlan.nameEn,
              price: String(freePlan.monthlyPrice),
              priceCurrency: 'USD',
            },
          ]
        : []),
      ...(premiumPlan
        ? [
            {
              '@type': 'Offer',
              name: premiumPlan.nameEn,
              price: String(premiumPlan.monthlyPrice),
              priceCurrency: 'USD',
            },
          ]
        : []),
    ],
  });
}

export function CmsProvider({
  children,
  skipDocumentSeo = false,
}: {
  children: React.ReactNode;
  skipDocumentSeo?: boolean;
}) {
  const [config, setConfig] = useState<CmsConfig>(() => createDefaultCmsConfig());
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshPublicCms = useCallback(async () => {
    try {
      const live = await fetchPublicCmsConfig();
      setConfig(live);
    } catch {
      // Keep default CMS config gracefully if server is unavailable
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshPublicCms();
  }, [refreshPublicCms]);

  useEffect(() => {
    if (!skipDocumentSeo) {
      syncDocumentSeo(config);
    }
  }, [config, skipDocumentSeo]);

  const applyPublishedConfig = useCallback((next: CmsConfig) => {
    setConfig(next);
  }, []);

  const trackEvent = useCallback(
    (eventType: string, metadata?: Record<string, string | number | boolean>) => {
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '/';
      void trackPublicAnalyticsEvent(eventType, currentPath, metadata);
    },
    []
  );

  return (
    <CmsContext.Provider
      value={{
        config,
        isLoaded,
        refreshPublicCms,
        applyPublishedConfig,
        trackEvent,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) {
    throw new Error('useCms must be used within a CmsProvider');
  }
  return ctx;
}
