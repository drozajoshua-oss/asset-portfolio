import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';

/**
 * App Store rating prompt.
 *
 * Asked ONLY at a moment of delight — right after a scan returns a real
 * valuation — never on launch. Someone who just found out their coin is worth
 * $300 is the person who leaves five stars; someone who just opened the app
 * has been given nothing yet.
 *
 * iOS caps the native prompt at 3 per user per 365 days and may silently
 * decline to show it at all, so every trigger is a scarce resource. The
 * guards below exist to spend them well:
 *
 *   • never on the user's first success — they haven't formed an opinion yet
 *   • only when the scan produced an actual value (a $0 result is a bad moment)
 *   • at most once per app version
 *   • at most once every 120 days
 *
 * There is deliberately NO "do you like the app?" pre-prompt. Filtering out
 * unhappy users before showing the real dialog is against App Store review
 * guidelines, and it poisons the signal we actually want.
 */

const KEY_SUCCESSES   = 'review_success_count';   // successful, valued scans
const KEY_LAST_ASKED  = 'review_last_asked_at';   // ISO date
const KEY_ASKED_BUILD = 'review_asked_version';   // app version we asked on

const MIN_SUCCESSES = 2;              // ask on the 2nd good scan, not the 1st
const COOLDOWN_DAYS = 120;

function appVersion() {
  return Constants.expoConfig?.version ?? 'unknown';
}

/**
 * Call after a scan finishes successfully. Records the success and, if all
 * the guards pass, asks for a review. Never throws and never blocks the UI —
 * a failure here must not affect the scan result.
 *
 * @param {{minValue?: number, maxValue?: number}} result the scan result
 */
export async function maybeAskForReview(result) {
  try {
    // A valuation of zero isn't a win — don't ask on a disappointing result.
    const value = (result?.maxValue ?? 0) || (result?.minValue ?? 0);
    if (!value || value <= 0) return;

    const raw = await AsyncStorage.getItem(KEY_SUCCESSES);
    const successes = (parseInt(raw, 10) || 0) + 1;
    await AsyncStorage.setItem(KEY_SUCCESSES, String(successes));
    if (successes < MIN_SUCCESSES) return;

    // Once per version.
    const askedVersion = await AsyncStorage.getItem(KEY_ASKED_BUILD);
    if (askedVersion === appVersion()) return;

    // And not too often across versions.
    const lastAsked = await AsyncStorage.getItem(KEY_LAST_ASKED);
    if (lastAsked) {
      const days = (Date.now() - new Date(lastAsked).getTime()) / 86400000;
      if (days < COOLDOWN_DAYS) return;
    }

    // isAvailableAsync is false on simulators and where the API is unsupported.
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;

    // Let the result animation settle before the system sheet appears.
    await new Promise(r => setTimeout(r, 1200));

    await StoreReview.requestReview();
    await AsyncStorage.multiSet([
      [KEY_LAST_ASKED, new Date().toISOString()],
      [KEY_ASKED_BUILD, appVersion()],
    ]);
  } catch (_) {
    // Never let a rating prompt break a scan.
  }
}
