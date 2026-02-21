/**
 * FuelIQ Verify Subscription - Supabase Edge Function
 *
 * Server-side subscription verification via RevenueCat REST API.
 * Replaces insecure client-side `profiles.update({ is_premium })` with
 * a trusted server-to-server check that the client cannot forge.
 *
 * Flow:
 * 1. Client calls this function with its JWT (Authorization header)
 * 2. We verify the JWT and extract the user ID
 * 3. We call RevenueCat's REST API to get the user's subscriber info
 * 4. We check for an active "premium" entitlement
 * 5. We update the `profiles` table with the verified result
 * 6. We return the verified status to the client
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers matching the ai-brain pattern
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================================
// RATE LIMITING (in-memory, per-isolate)
// 1 verification per minute per user to prevent abuse
// ============================================================================

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_INTERVAL_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);

  if (lastRequest && now - lastRequest < RATE_LIMIT_INTERVAL_MS) {
    return false;
  }

  rateLimitMap.set(userId, now);
  return true;
}

// Periodic cleanup to prevent memory growth (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of rateLimitMap) {
    if (now - timestamp > RATE_LIMIT_INTERVAL_MS) {
      rateLimitMap.delete(key);
    }
  }
}, 300_000);

// ============================================================================
// REVENUECAT API HELPERS
// ============================================================================

const REVENUECAT_BASE_URL = "https://api.revenuecat.com/v1";
const REVENUECAT_TIMEOUT_MS = 10_000; // 10 second timeout

interface RevenueCatEntitlement {
  expires_date: string | null;
  purchase_date: string;
  product_identifier: string;
}

interface RevenueCatSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RevenueCatEntitlement>;
    subscriptions: Record<
      string,
      {
        expires_date: string | null;
        product_plan_identifier?: string;
        period_type?: string;
        store?: string;
      }
    >;
  };
}

/**
 * Fetch subscriber info from RevenueCat REST API.
 * Returns null if the request fails (network error, timeout, etc.)
 * so the caller can decide whether to revoke premium.
 */
async function fetchRevenueCatSubscriber(
  appUserId: string,
  apiKey: string
): Promise<RevenueCatSubscriberResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REVENUECAT_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${REVENUECAT_BASE_URL}/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.error(
        `[verify-subscription] RevenueCat API returned ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    return data as RevenueCatSubscriberResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[verify-subscription] RevenueCat API request timed out");
    } else {
      console.error(
        "[verify-subscription] RevenueCat API error:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Determine the subscription tier from the RevenueCat subscriber object.
 * Maps product identifiers / plan identifiers to tier names.
 * Falls back to "premium" if we detect an active entitlement but
 * cannot determine a more specific tier.
 */
function determineSubscriptionTier(
  subscriber: RevenueCatSubscriberResponse["subscriber"]
): string {
  const premiumEntitlement = subscriber.entitlements["premium"];
  if (!premiumEntitlement) {
    return "free";
  }

  const productId = premiumEntitlement.product_identifier || "";
  const subscription = subscriber.subscriptions[productId];

  if (subscription) {
    const planId = (
      subscription.product_plan_identifier || productId
    ).toLowerCase();

    if (planId.includes("annual") || planId.includes("yearly")) {
      return "premium_annual";
    }
    if (planId.includes("lifetime")) {
      return "premium_lifetime";
    }
    // Default to monthly if we have an active subscription
    return "premium_monthly";
  }

  // Active entitlement but no matching subscription detail -- generic premium
  return "premium";
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Authenticate the request via JWT
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const revenueCatApiKey = Deno.env.get("REVENUECAT_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error(
        "[verify-subscription] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!revenueCatApiKey) {
      console.error("[verify-subscription] Missing REVENUECAT_API_KEY");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a client with the user's JWT to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Rate limit: max 1 verification per minute per user
    // -----------------------------------------------------------------------
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({
          error: "Verification rate limit exceeded. Please wait a moment.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -----------------------------------------------------------------------
    // 3. Call RevenueCat REST API
    // -----------------------------------------------------------------------
    const subscriberData = await fetchRevenueCatSubscriber(
      user.id,
      revenueCatApiKey
    );

    // If RevenueCat is unreachable, do NOT revoke premium.
    // Return current DB state so the user is not punished for an API outage.
    if (!subscriberData) {
      // Use the service role client for privileged DB reads
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_premium, subscription_tier, subscription_verified_at")
        .eq("user_id", user.id)
        .single();

      return new Response(
        JSON.stringify({
          isPremium: profile?.is_premium ?? false,
          tier: profile?.subscription_tier ?? "free",
          verifiedAt: profile?.subscription_verified_at ?? null,
          source: "cache",
          message:
            "Subscription service temporarily unavailable. Using cached status.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // -----------------------------------------------------------------------
    // 4. Check for active "premium" entitlement
    // -----------------------------------------------------------------------
    const entitlements = subscriberData.subscriber?.entitlements || {};
    const premiumEntitlement = entitlements["premium"];

    let isPremium = false;

    if (premiumEntitlement) {
      // If there is an expiration date, check it is in the future
      if (premiumEntitlement.expires_date) {
        const expiresAt = new Date(premiumEntitlement.expires_date);
        isPremium = expiresAt > new Date();
      } else {
        // No expiration = lifetime / non-expiring entitlement
        isPremium = true;
      }
    }

    const tier = isPremium
      ? determineSubscriptionTier(subscriberData.subscriber)
      : "free";

    // -----------------------------------------------------------------------
    // 5. Update the profiles table with verified status (service role)
    // -----------------------------------------------------------------------
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_premium: isPremium,
        subscription_verified_at: new Date().toISOString(),
        subscription_tier: tier,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error(
        "[verify-subscription] Profile update failed:",
        updateError.message
      );
      // Still return the verification result even if DB update fails;
      // the client can trust the RevenueCat check for this session.
    }

    // -----------------------------------------------------------------------
    // 6. Return verified status
    // -----------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        isPremium,
        tier,
        verifiedAt: new Date().toISOString(),
        source: "revenuecat",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[verify-subscription] Unhandled error:", error);

    // Never expose internal details to the client
    return new Response(
      JSON.stringify({ error: "Verification failed. Please try again later." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
