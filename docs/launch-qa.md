# FuelIQ Launch QA

This is the minimum real-device QA bar for a launch candidate.

## Release Inputs

Required client env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_LEGAL_DOCS_BASE_URL`

Expected auth redirect URIs:

- Google sign-in callback: `fueliq://auth/callback`
- Password recovery callback: `fueliq://update-password`

Before testing, confirm:

1. Supabase auth redirect URLs include both callback URIs above.
2. Google OAuth provider config in Supabase accepts `fueliq://auth/callback`.
3. RevenueCat entitlement is `premium`.
4. RevenueCat offerings expose monthly and annual packages for `com.fueliq.app`.
5. Legal docs load from `EXPO_PUBLIC_LEGAL_DOCS_BASE_URL`.

## Test Matrix

Test on:

1. One recent iPhone running a preview or production build.
2. One recent Android device running a preview or production build.

Use:

1. One clean account that has never finished onboarding.
2. One returning account with existing diary data.
3. One account with an active subscription.
4. One account with lapsed or absent purchases.

## Recommended QA Order

Run the manual checks in this order so failures surface early and do not invalidate later steps.

1. Confirm release inputs and redirect URLs.
2. Install the exact preview or production candidate on one iPhone and one Android device.
3. Run the deep link smoke tests before signing in.
4. Validate auth sign-up, sign-in, and logout on a clean account.
5. Validate password recovery end to end from email link to fresh sign-in.
6. Complete onboarding on the clean account and confirm it lands in the main app.
7. From onboarding completion, verify the MyFitnessPal import path and then the standard logging path.
8. Validate core logging from search, barcode, and repeat/recent meals on both platforms.
9. Validate paywall presentation, purchase, cancellation, and restore using the subscribed and free accounts.
10. Validate trust surfaces and monitoring last so handled test errors and purchase events are visible in Sentry/RevenueCat.

Suggested account order:

1. Clean account: auth, password recovery, onboarding, import, first logging loop.
2. Returning account: repeat logging, diary integrity, recent meals after relaunch.
3. Active subscriber: premium unlock, restore behavior, paywall suppression where expected.
4. Free or lapsed account: paywall exposure, cancellation handling, no-purchases restore state.

## Launch-Critical Flows

### 1. Auth

Pass criteria:

1. Email sign-up creates an account and sends a confirmation email.
2. Email sign-in works with a confirmed account.
3. Invalid credentials show a generic failure message.
4. Google sign-in returns to the app and lands in the signed-in experience.
5. Apple sign-in works on supported iOS hardware and is hidden elsewhere.
6. Logout returns to auth immediately.

### 2. Password Recovery

Pass criteria:

1. Forgot-password accepts a valid email format and always shows the same success copy.
2. Email link opens the app at `fueliq://update-password`.
3. Invalid or expired links show a recovery error state, not a blank screen or auth loop.
4. Valid links allow password update and return to the signed-in app.
5. Updated credentials work on the next fresh sign-in.

### 3. Onboarding

Pass criteria:

1. New users are routed into onboarding after auth.
2. Core profile fields save without blocking on non-critical metadata.
3. Completing onboarding routes into the main app.
4. Returning users do not get bounced back into onboarding incorrectly.

### 4. MyFitnessPal Import

Pass criteria:

1. CSV file picker opens on iPhone, Android, and web if tested there.
2. Import preview loads and shows correct entry/day counts.
3. Quoted CSV values, commas inside food names, and repeated date rows import correctly.
4. Import failure states are recoverable and do not corrupt existing diary data.
5. Imported meals appear in the diary and totals reflect them.

### 5. Core Logging Loop

Pass criteria:

1. Search finds foods and opens detail flow.
2. User can confirm a food and see it in the diary.
3. Dashboard and diary totals update immediately.
4. Repeat logging paths are faster than first log paths.
5. Recent meals survive app restart and relaunch.

### 6. Paywall And Purchases

Pass criteria:

1. Paywall loads monthly and annual pricing from RevenueCat.
2. Missing packages show an error instead of silently failing.
3. Purchase success closes paywall and unlocks premium state.
4. Cancelled purchases do not falsely unlock premium.
5. Restore purchases works for subscribed users.
6. Restore purchases shows a clear no-purchases state for free users.

### 7. Trust Surfaces

Pass criteria:

1. Terms link opens.
2. Privacy link opens.
3. Sentry captures handled runtime errors in preview/production builds.
4. Crash-free sessions and purchase failures are visible in monitoring.

## Deep Link Smoke Tests

Use these to verify routing before full flow testing.

Detox shortcuts:

1. macOS: `npm run test:e2e:ios -- --testNamePattern "Deep Links"`
2. Linux/Windows/Android CI: `npm run test:e2e:android -- --testNamePattern "Deep Links"`
3. If Detox or native projects are missing, the wrapper script now prints the exact setup blockers instead of failing with `command not found`.

iOS simulator:

```bash
xcrun simctl openurl booted "fueliq://auth/callback?code=test-code"
xcrun simctl openurl booted "fueliq://update-password?code=test-code&type=recovery"
```

Android emulator:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "fueliq://auth/callback?code=test-code" com.fueliq.app
adb shell am start -W -a android.intent.action.VIEW -d "fueliq://update-password?code=test-code&type=recovery" com.fueliq.app
```

Expected result:

1. The app opens instead of the browser swallowing the link.
2. Auth callback signs in if the code is valid.
3. Password recovery link routes to the update-password screen.

## Release Sign-Off

Do not ship until all of these are true:

1. `npm run verify:release` passes.
2. Real-device QA passes on iPhone and Android.
3. Password recovery works from email link to successful login.
4. One successful purchase and one successful restore are verified on-device.
5. Sentry is receiving events from the tested build channel.
6. No launch-critical blockers remain open.
