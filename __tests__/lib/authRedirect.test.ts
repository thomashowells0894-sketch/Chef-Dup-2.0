import {
  consumeSupabaseAuthRedirect,
  parseSupabaseAuthRedirect,
} from '../../lib/authRedirect';

function createAuthClient() {
  return {
    exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
    setSession: jest.fn().mockResolvedValue({ error: null }),
  };
}

describe('authRedirect', () => {
  it('parses PKCE code redirects from the query string', () => {
    expect(
      parseSupabaseAuthRedirect(
        'fueliq://update-password?code=pkce-code-123&type=recovery',
      ),
    ).toEqual({
      code: 'pkce-code-123',
      accessToken: null,
      refreshToken: null,
      type: 'recovery',
      errorCode: null,
      errorDescription: null,
    });
  });

  it('parses implicit-flow tokens from the hash fragment', () => {
    expect(
      parseSupabaseAuthRedirect(
        'fueliq://update-password#access_token=token-1&refresh_token=token-2&type=recovery',
      ),
    ).toEqual({
      code: null,
      accessToken: 'token-1',
      refreshToken: 'token-2',
      type: 'recovery',
      errorCode: null,
      errorDescription: null,
    });
  });

  it('exchanges query codes for a session', async () => {
    const auth = createAuthClient();

    const result = await consumeSupabaseAuthRedirect(
      'fueliq://update-password?code=pkce-code-123&type=recovery',
      auth,
    );

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code-123');
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(result).toEqual({
      recovered: true,
      type: 'recovery',
      error: null,
    });
  });

  it('sets a session when the redirect contains access and refresh tokens', async () => {
    const auth = createAuthClient();

    const result = await consumeSupabaseAuthRedirect(
      'fueliq://update-password#access_token=token-1&refresh_token=token-2&type=recovery',
      auth,
    );

    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'token-1',
      refresh_token: 'token-2',
    });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(result).toEqual({
      recovered: true,
      type: 'recovery',
      error: null,
    });
  });

  it('surfaces auth-link errors without attempting session recovery', async () => {
    const auth = createAuthClient();

    const result = await consumeSupabaseAuthRedirect(
      'fueliq://update-password#error=access_denied&error_description=Link%20expired&type=recovery',
      auth,
    );

    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(result).toEqual({
      recovered: false,
      type: 'recovery',
      error: 'Link expired',
    });
  });
});
