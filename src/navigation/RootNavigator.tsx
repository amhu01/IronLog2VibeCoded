import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Text } from 'react-native';
import { BackupScreen } from '../screens/BackupScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LogScreen } from '../screens/LogScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
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
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <HistoryStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: 'Session' }} />
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

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  Log: '＋',
  History: '≡',
  Progress: '↗',
  Stats: '★',
  Backup: '⇅',
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 18, lineHeight: 22 }}>{TAB_ICONS[route.name]}</Text>
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
