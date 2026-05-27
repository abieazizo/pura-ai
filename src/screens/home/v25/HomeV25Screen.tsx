/**
 * HomeV25Screen — v29 nightly-mirror rebuild.
 *
 * Now re-exports the v29 HomeNightlyMirror screen. The TabNavigator
 * imports `HomeV25Screen` so this shim preserves the route name +
 * import path. The previous v26 PuraNightHome implementation is
 * preserved on disk in version control.
 */

export { HomeNightlyMirror as HomeV25Screen } from '@/screens/home/HomeNightlyMirror';
