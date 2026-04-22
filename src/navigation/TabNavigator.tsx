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
import { ProgressScreen } from '@/screens/progress/ProgressScreen';
import { RoutineScreen } from '@/screens/routine/RoutineScreen';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
import { CategoryView } from '@/screens/products/CategoryView';
import type {
  HomeStackParamList,
  RootStackParamList,
  TabParamList,
} from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Home stack owns everything reachable from Home — including the demoted
 * Products catalog screens. A user enters Products via the Home rec module
 * or a deep-link, not a dedicated tab.
 */
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Products" component={ProductsScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="CategoryView" component={CategoryView} />
    </HomeStack.Navigator>
  );
}

/**
 * The ScanTab renders nothing — its job is to occupy a slot in the tab bar
 * so the user can aim at it. The tabPress listener below intercepts the
 * gesture and opens the scan modal at the root level. This preserves the
 * modal UX (cancel = close, not pop) while putting Scan where thumbs
 * actually reach.
 */
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

      <Tab.Screen name="RoutineTab" component={RoutineScreen} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} />
      <Tab.Screen name="AssistantTab" component={AssistantScreen} />
    </Tab.Navigator>
  );
}
