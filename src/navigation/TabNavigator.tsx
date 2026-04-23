import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { FloatingTabBar } from './FloatingTabBar';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ProductsScreen } from '@/screens/products/ProductsScreen';
import { AssistantScreen } from '@/screens/assistant/AssistantScreen';
import { RoutineScreen } from '@/screens/routine/RoutineScreen';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
import { CategoryView } from '@/screens/products/CategoryView';
import { PlanScreen } from '@/screens/plan/PlanScreen';
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
 */
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Plan" component={PlanScreen} />
      <HomeStack.Screen name="Routine" component={RoutineScreen} />
      <HomeStack.Screen name="Products" component={ProductsScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="CategoryView" component={CategoryView} />
    </HomeStack.Navigator>
  );
}

/**
 * Dedicated Products tab stack (v9.1) — lets catalog browsing live as a
 * primary destination while the Home stack still carries its own Products
 * routes for recommendations flowing out of Home.
 */
function ProductsStackScreen() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="Products" component={ProductsScreen} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductsStack.Screen name="CategoryView" component={CategoryView} />
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
      <Tab.Screen name="HomeTab" component={HomeStackScreen} />

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

      <Tab.Screen name="ProductsTab" component={ProductsStackScreen} />
      {/* v10.11 — RoutineTab replaces the floating ProgressTab. The
          daily action center (morning/evening/saved) now surfaces
          progress as an embedded section inside itself instead of
          each living in its own separate tab. */}
      <Tab.Screen name="RoutineTab" component={RoutineScreen} />
      <Tab.Screen name="AssistantTab" component={AssistantScreen} />
    </Tab.Navigator>
  );
}
