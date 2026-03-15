import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import UpdatePasswordScreen from '../../app/update-password';
import { supabase } from '../../lib/supabase';
import {
  consumeSupabaseAuthRedirect,
  parseSupabaseAuthRedirect,
} from '../../lib/authRedirect';

const mockReplace = jest.fn();

jest.setTimeout(20000);

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../lib/authRedirect', () => ({
  consumeSupabaseAuthRedirect: jest.fn(),
  parseSupabaseAuthRedirect: jest.fn(),
}));

describe('UpdatePasswordScreen', () => {
  const mockedParseRedirect = parseSupabaseAuthRedirect as jest.Mock;
  const mockedConsumeRedirect = consumeSupabaseAuthRedirect as jest.Mock;
  const updateUser = jest.fn();

  async function flushAsyncWork() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('fueliq://update-password');
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() } as any);
    (supabase.auth as Record<string, unknown>).updateUser = updateUser;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows an invalid-state message for non-recovery auth links', async () => {
    mockedParseRedirect.mockReturnValue({
      code: null,
      accessToken: null,
      refreshToken: null,
      type: 'magiclink',
      errorCode: null,
      errorDescription: null,
    });

    const { getByTestId } = render(<UpdatePasswordScreen />);

    await flushAsyncWork();

    expect(getByTestId('password-reset-invalid-state')).toBeTruthy();
    expect(mockedConsumeRedirect).not.toHaveBeenCalled();
  });

  it('updates the password after a valid recovery link is verified', async () => {
    mockedParseRedirect.mockReturnValue({
      code: 'recovery-code',
      accessToken: null,
      refreshToken: null,
      type: 'recovery',
      errorCode: null,
      errorDescription: null,
    });
    mockedConsumeRedirect.mockResolvedValue({
      recovered: true,
      type: 'recovery',
      error: null,
    });
    updateUser.mockResolvedValue({ error: null });

    const { getByTestId } = render(<UpdatePasswordScreen />);

    await flushAsyncWork();

    expect(getByTestId('update-password-input')).toBeTruthy();

    await act(async () => {
      fireEvent.changeText(getByTestId('update-password-input'), 'NewPass123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'NewPass123');
    });

    await flushAsyncWork();

    await act(async () => {
      fireEvent.press(getByTestId('update-password-submit'));
    });

    await flushAsyncWork();

    expect(updateUser).toHaveBeenCalledWith({ password: 'NewPass123' });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Password Updated',
      'Your password has been updated.',
      expect.any(Array),
    );

    const continueAction = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2]?.[0];
    continueAction.onPress();

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
