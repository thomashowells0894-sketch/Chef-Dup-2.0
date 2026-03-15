export const PASSWORD_RESET_REDIRECT_URL = 'fueliq://update-password';

export interface ParsedAuthRedirect {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

interface SupabaseAuthLike {
  exchangeCodeForSession: (code: string) => Promise<{ error?: { message?: string } | null }>;
  setSession: (session: {
    access_token: string;
    refresh_token: string;
  }) => Promise<{ error?: { message?: string } | null }>;
}

function getUrlParameter(url: URL, key: string): string | null {
  const queryValue = url.searchParams.get(key);
  if (queryValue) {
    return queryValue;
  }

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (!hash) {
    return null;
  }

  return new URLSearchParams(hash).get(key);
}

export function parseSupabaseAuthRedirect(url: string): ParsedAuthRedirect {
  const parsedUrl = new URL(url);

  return {
    code: getUrlParameter(parsedUrl, 'code'),
    accessToken: getUrlParameter(parsedUrl, 'access_token'),
    refreshToken: getUrlParameter(parsedUrl, 'refresh_token'),
    type: getUrlParameter(parsedUrl, 'type'),
    errorCode: getUrlParameter(parsedUrl, 'error_code') || getUrlParameter(parsedUrl, 'error'),
    errorDescription: getUrlParameter(parsedUrl, 'error_description'),
  };
}

export async function consumeSupabaseAuthRedirect(
  url: string,
  auth: SupabaseAuthLike,
): Promise<{ recovered: boolean; type: string | null; error: string | null }> {
  try {
    const parsed = parseSupabaseAuthRedirect(url);

    if (parsed.errorCode || parsed.errorDescription) {
      return {
        recovered: false,
        type: parsed.type,
        error: parsed.errorDescription || 'Unable to open this authentication link.',
      };
    }

    if (parsed.code) {
      const { error } = await auth.exchangeCodeForSession(parsed.code);
      if (error) {
        return {
          recovered: false,
          type: parsed.type,
          error: error.message || 'Unable to verify this authentication link.',
        };
      }

      return { recovered: true, type: parsed.type, error: null };
    }

    if (parsed.accessToken && parsed.refreshToken) {
      const { error } = await auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });

      if (error) {
        return {
          recovered: false,
          type: parsed.type,
          error: error.message || 'Unable to restore your session from this link.',
        };
      }

      return { recovered: true, type: parsed.type, error: null };
    }

    return {
      recovered: false,
      type: parsed.type,
      error: 'This authentication link is incomplete or invalid.',
    };
  } catch {
    return {
      recovered: false,
      type: null,
      error: 'This authentication link could not be parsed.',
    };
  }
}
