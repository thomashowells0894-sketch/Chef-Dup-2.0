import { logAuditEvent } from './security';

type PaywallEvent =
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'paywall_cta_tapped'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_restored'
  | 'trial_started'
  | 'trial_expired'
  | 'winback_shown'
  | 'winback_accepted'
  | 'winback_dismissed'
  | 'annual_nudge_shown'
  | 'annual_nudge_accepted';

interface ConversionEvent {
  event: PaywallEvent;
  source: string; // Which screen/feature triggered it
  variant?: string; // A/B test variant
  metadata?: Record<string, string | number | boolean>;
}

const eventQueue: ConversionEvent[] = [];

export function trackConversion(event: ConversionEvent): void {
  eventQueue.push({ ...event, timestamp: Date.now() } as any);

  // Fire and forget to audit log
  logAuditEvent?.('conversion_event', {
    event: event.event,
    source: event.source,
    variant: event.variant || 'default',
  });

  // Also log to Sentry as breadcrumb for funnel analysis
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.addBreadcrumb({
      category: 'conversion',
      message: event.event,
      data: { source: event.source, variant: event.variant },
      level: 'info',
    });
  } catch {}
}

export function getConversionEvents(): ConversionEvent[] {
  return [...eventQueue];
}
