import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FloatingTabBar } from './FloatingTabBar';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ProductsScreen } from '@/screens/products/ProductsScreen';
import { AssistantScreen } from '@/screens/assistant/AssistantScreen';
import { ProgressScreen } from '@/screens/progress/ProgressScreen';
import { ProductDetailScreen } from '@/screens/productDetail/ProductDetailScreen';
import { CategoryView } from '@/screens/products/CategoryView';
import type {
  HomeStackParamList,
  ProductsStackParamList,
  TabParamList,
} from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProductsStack = createNativeStackNavigator<ProductsStackParamList>();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="CategoryView" component={CategoryView} />
    </HomeStack.Navigator>
  );
}

function ProductsStackScreen() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="Products" component={ProductsScreen} />
      <ProductsStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProductsStack.Screen name="CategoryView" component={CategoryView} />
    </ProductsStack.Navigator>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackScreen} />
      <Tab.Screen name="ProductsTab" component={ProductsStackScreen} />
      <Tab.Screen name="AssistantTab" component={AssistantScreen} />
      <Tab.Screen name="ProgressTab" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
