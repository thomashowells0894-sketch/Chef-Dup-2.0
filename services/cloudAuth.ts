/**
 * Cloud Authentication Service
 * Secure authentication using Supabase Auth
 * Supports Email/Password, Apple Sign In, and Google Sign In
 */

import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js';
import { SecureStorage, isIOS } from './iosNative';

// Environment variables - replace with your Supabase project credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Initialize Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      // Use secure storage on native platforms
      getItem: async (key: string) => {
        try {
          return await SecureStorage.get(key);
        } catch {
          return localStorage.getItem(key);
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await SecureStorage.set(key, value);
        } catch {
          localStorage.setItem(key, value);
        }
      },
      removeItem: async (key: string) => {
        try {
          await SecureStorage.remove(key);
        } catch {
          localStorage.removeItem(key);
        }
      },
    },
  },
});

// Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  requiresVerification?: boolean;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Transform Supabase user to our AuthUser type
 */
const transformUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email || '',
  name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
  avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  provider: user.app_metadata?.provider || 'email',
  emailVerified: user.email_confirmed_at !== null,
  createdAt: user.created_at,
});

/**
 * Handle auth errors with user-friendly messages
 */
const handleAuthError = (error: AuthError): string => {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Incorrect email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists.',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
    'Unable to validate email address': 'Please enter a valid email address.',
    'Email rate limit exceeded': 'Too many attempts. Please try again later.',
    'Invalid email or password': 'Incorrect email or password. Please try again.',
  };

  return errorMap[error.message] || error.message || 'An unexpected error occurred.';
};

// ==========================================
// EMAIL/PASSWORD AUTHENTICATION
// ==========================================

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    if (data.user && !data.user.email_confirmed_at) {
      return {
        success: true,
        user: transformUser(data.user),
        requiresVerification: true,
      };
    }

    if (data.user) {
      return { success: true, user: transformUser(data.user) };
    }

    return { success: false, error: 'Failed to create account.' };
  } catch (e) {
    console.error('SignUp error:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    if (data.user) {
      return { success: true, user: transformUser(data.user) };
    }

    return { success: false, error: 'Failed to sign in.' };
  } catch (e) {
    console.error('SignIn error:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    return { success: true };
  } catch (e) {
    console.error('Password reset error:', e);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

/**
 * Update password (for logged in users or password reset)
 */
export const updatePassword = async (newPassword: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    return { success: true };
  } catch (e) {
    console.error('Update password error:', e);
    return { success: false, error: 'Failed to update password.' };
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    return { success: true };
  } catch (e) {
    console.error('Resend verification error:', e);
    return { success: false, error: 'Failed to send verification email.' };
  }
};

// ==========================================
// OAUTH AUTHENTICATION
// ==========================================

/**
 * Sign in with Apple (iOS)
 */
export const signInWithApple = async (): Promise<AuthResult> => {
  try {
    // For native iOS, use the Capacitor Sign in with Apple plugin
    if (isIOS()) {
      // This would integrate with @capacitor-community/apple-sign-in
      // For now, fall back to web OAuth
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'name email',
      },
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    // OAuth redirects, so we return success
    return { success: true };
  } catch (e) {
    console.error('Apple sign in error:', e);
    return { success: false, error: 'Failed to sign in with Apple.' };
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    return { success: true };
  } catch (e) {
    console.error('Google sign in error:', e);
    return { success: false, error: 'Failed to sign in with Google.' };
  }
};

// ==========================================
// SESSION MANAGEMENT
// ==========================================

/**
 * Get current session
 */
export const getSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      return null;
    }
    return data.session;
  } catch (e) {
    console.error('Session error:', e);
    return null;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    return transformUser(data.user);
  } catch (e) {
    console.error('Get user error:', e);
    return null;
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    // Clear any cached data
    try {
      await SecureStorage.remove('supabase.auth.token');
    } catch {
      localStorage.removeItem('supabase.auth.token');
    }

    return { success: true };
  } catch (e) {
    console.error('Sign out error:', e);
    return { success: false, error: 'Failed to sign out.' };
  }
};

/**
 * Refresh session token
 */
export const refreshSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Refresh session error:', error);
      return null;
    }
    return data.session;
  } catch (e) {
    console.error('Refresh error:', e);
    return null;
  }
};

// ==========================================
// AUTH STATE LISTENER
// ==========================================

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// ==========================================
// PROFILE MANAGEMENT
// ==========================================

/**
 * Update user profile metadata
 */
export const updateUserProfile = async (updates: {
  name?: string;
  avatarUrl?: string;
}): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        name: updates.name,
        full_name: updates.name,
        avatar_url: updates.avatarUrl,
      },
    });

    if (error) {
      return { success: false, error: handleAuthError(error) };
    }

    return { success: true };
  } catch (e) {
    console.error('Update profile error:', e);
    return { success: false, error: 'Failed to update profile.' };
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (): Promise<AuthResult> => {
  try {
    // Note: This requires a server-side function to fully delete user data
    // The client can only sign out
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No user logged in.' };
    }

    // Delete user data from database first
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (deleteError) {
      console.error('Delete profile error:', deleteError);
    }

    // Sign out
    await signOut();

    return { success: true };
  } catch (e) {
    console.error('Delete account error:', e);
    return { success: false, error: 'Failed to delete account.' };
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return session !== null;
};

/**
 * Get auth token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.access_token || null;
};

export default {
  supabase,
  signUpWithEmail,
  signInWithEmail,
  signInWithApple,
  signInWithGoogle,
  sendPasswordReset,
  updatePassword,
  resendVerificationEmail,
  getSession,
  getCurrentUser,
  signOut,
  refreshSession,
  onAuthStateChange,
  updateUserProfile,
  deleteAccount,
  isAuthenticated,
  getAuthToken,
};
