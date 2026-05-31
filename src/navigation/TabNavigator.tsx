import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { FloatingTabBar } from './FloatingTabBar';
// v25 redesigned post-onboarding screens. The legacy v24 screens
// (HomeScreen, ProductsScreen, AssistantScreen, RoutineScreen,
// ProductDetailScreen) are preserved on disk for backward compatibility
// of the legacy `Plan`/`CategoryView` routes but are no longer mounted
// on the primary tabs.
//
// pura27 — The three nightly screens (Home / Products / Routine) are
// the production destinations. They consume the shared `usePuraSession`
// hook and write back to the existing app store (`routineSessionV26`,
// `tonightCompleteAt`, `userRoutineEvening`) so completion persists
// across navigation and Home/Routine never disagree about whether
// tonight is done. The earlier v25/v26 implementations are preserved on
// disk (and still reachable from sub-routes that import them by their
// exact source path) for archival reference.
import { AssistantV25Screen } from '@/screens/assistant/v25/AssistantV25Screen';
import { ProductDetailV25Screen } from '@/screens/productDetail/v25/ProductDetailV25Screen';
import { CategoryView } from '@/screens/products/CategoryView';
import { PlanScreen } from '@/screens/plan/PlanScreen';
// pura27 hosts the Home production destination.
// Routine is owned by the v26 rebuild (PuraRoutineScreen) — it implements
// the full Today / Progress experience including focused mode, the
// "Tonight, less is better" signature step, scan-evidence map, plan
// insight card, and reminder-aware next-scan CTA.
//
// v29 — The Products tab now mounts the rebuilt Pura Shop (storefront
// destination). The earlier clinical pura27 ProductsScreen is preserved
// on disk for archival reference but no longer mounted; nothing in the
// app navigates to it.
// v32 — the Home tab IS the Pura Assist landing surface. The pura27
// nightly Home (`HomeP27Screen` in '@/screens/pura27') is preserved on
// disk for archival reference but no longer mounted as the primary Home
// destination.
import { PuraAssistHomeScreen } from '@/screens/assistant/PuraAssistHomeScreen';
import { PuraShopScreen, ConcernIndexScreen } from '@/screens/shop';
import { MeScreen } from '@/screens/me';
import { PuraRoutineScreen } from '@/screens/routine/pura/PuraRoutineScreen';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProductsStack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Home stack — Plan, Routine, and Product destinations are all reachable
 * from Home. Routine is no longer a primary tab (v9.1); it lives here as
 * an internal destination linked from the Home command center.
 *
 * The Home / Routine / Products routes mount the pura27 nightly screens.
 * The lower-level Plan / ProductDetail / CategoryView destinations are
 * still served by their existing implementations.
 */
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={PuraAssistHomeScreen} />
      <HomeStack.Screen name="Plan" component={PlanScreen} />
      <HomeStack.Screen name="Routine" component={PuraRoutineScreen} />
      <HomeStack.Screen name="Products" component={PuraShopScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailV25Screen} />
      <HomeStack.Screen name="CategoryView" component={CategoryView} />
      <HomeStack.Screen name="ConcernIndex" component={ConcernIndexScreen} />
    </HomeStack.Navigator>
  );
}

/**
 * Dedicated Products / Shop tab stack — the primary commerce
 * destination. v29 mounts `PuraShopScreen` here (the rebuilt storefront
 * matching the approved screenshot), while the Home stack carries its
 * own deep-link path into the same product detail surface for
 * recommendations flowing out of Home.
 */
function ProductsStackScreen() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="Products" component={PuraShopScreen} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailV25Screen} />
      <ProductsStack.Screen name="CategoryView" component={CategoryView} />
      <ProductsStack.Screen name="ConcernIndex" component={ConcernIndexScreen} />
      <ProductsStack.Screen name="Routine" component={PuraRoutineScreen} />
    </ProductsStack.Navigator>
  );
}

function ScanTabPlaceholder() {
  return <View />;
}

export function TabNavigator() {
  const rootNav = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      {/* Bottom-nav order (v29 rebuild): Home / Shop / Scan / Routine /
          Me. Scan sits in slot 3 — the visually elevated center — so
          it reads as the app's central nightly ritual rather than a
          generic tab. AI Assist (the previous 5th tab) is still
          registered below so existing nav.navigate('AssistantTab')
          call-sites keep working, but the floating dock no longer
          renders a tile for it — it's reached via the Me tab. */}
      <Tab.Screen name="HomeTab" component={HomeStackScreen} />
      <Tab.Screen name="ProductsTab" component={ProductsStackScreen} />

      <Tab.Screen
        name="ScanTab"
        component={ScanTabPlaceholder}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            rootNav.navigate('ScanModal');
          },
        }}
      />

      <Tab.Screen name="RoutineTab" component={PuraRoutineScreen} />
      <Tab.Screen name="MeTab" component={MeScreen} />
      {/* Registered but hidden from the floating dock — see comment above. */}
      <Tab.Screen name="AssistantTab" component={AssistantV25Screen} />
    </Tab.Navigator>
  );
}
