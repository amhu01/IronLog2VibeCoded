import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { t } from '../i18n';
import { BackupScreen } from '../screens/BackupScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { LogScreen } from '../screens/LogScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import { SessionSummaryScreen } from '../screens/SessionSummaryScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { colors } from '../theme';
import type { HistoryStackParamList, ProgressStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();

// Built per render (not module constants) so a theme change picks up the new colours.
const stackScreenOptions = () => ({
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
});

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={stackScreenOptions()}>
      <HistoryStack.Screen name="HistoryList" component={HistoryScreen} options={{ headerShown: false }} />
      <HistoryStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: t('Session') }} />
      <HistoryStack.Screen name="SessionSummary" component={SessionSummaryScreen} options={{ title: t('Summary') }} />
    </HistoryStack.Navigator>
  );
}

// Progress rows open the session they came from; a stack of its own means Back returns to the chart.
function ProgressStackNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={stackScreenOptions()}>
      <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} options={{ headerShown: false }} />
      <ProgressStack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: t('Session') }} />
      <ProgressStack.Screen name="SessionSummary" component={SessionSummaryScreen} options={{ title: t('Summary') }} />
    </ProgressStack.Navigator>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Log: { active: 'add-circle', inactive: 'add-circle-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Progress: { active: 'trending-up', inactive: 'trending-up-outline' },
  Stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Backup: { active: 'settings', inactive: 'settings-outline' },
};

// The Backup route also hosts settings now; its name stays for navigation, only the label changed.
const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  Log: 'Log',
  History: 'History',
  Progress: 'Progress',
  Stats: 'Stats',
  Backup: 'Settings',
};

interface RootNavigatorProps {
  /** Restores the screen you were on when the app redraws after a settings change. */
  initialState?: NavigationState;
  onStateChange?: (state: NavigationState | undefined) => void;
}

export function RootNavigator({ initialState, onStateChange }: RootNavigatorProps) {
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
  return (
    <NavigationContainer theme={theme} initialState={initialState} onStateChange={onStateChange}>
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
          tabBarLabel: t(TAB_LABELS[route.name]),
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="History" component={HistoryStackNavigator} />
        <Tab.Screen name="Progress" component={ProgressStackNavigator} />
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Backup" component={BackupScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
