import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { BackupScreen } from '../screens/BackupScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LogScreen } from '../screens/LogScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { SessionSummaryScreen } from '../screens/SessionSummaryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { colors } from '../theme';
import type { HistoryStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <HistoryStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
      <HistoryStack.Screen name="SessionSummary" component={SessionSummaryScreen} options={{ title: 'Summary' }} />
    </HistoryStack.Navigator>
  );
}

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Log: { active: 'add-circle', inactive: 'add-circle-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Progress: { active: 'trending-up', inactive: 'trending-up-outline' },
  Stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Backup: { active: 'cloud-upload', inactive: 'cloud-upload-outline' },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="History" component={HistoryStackNavigator} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Backup" component={BackupScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
