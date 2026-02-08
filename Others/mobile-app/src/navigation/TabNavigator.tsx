import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOffline } from '../services/OfflineContext';
import { useTheme } from 'react-native-paper';

import DashboardScreen from '../screens/DashboardScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import TasksScreen from '../screens/TasksScreen';
import NotesScreen from '../screens/NotesScreen';
import TimeTrackingScreen from '../screens/TimeTrackingScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Bookmarks: undefined;
  Tasks: undefined;
  Notes: undefined;
  TimeTracking: undefined;
  Search: undefined;
  AIAssistant: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator: React.FC = () => {
  const { isOnline, pendingChanges } = useOffline();
  const theme = useTheme();

  const getTabBarIcon = (name: string, color: string) => (
    <Icon name={name} size={24} color={color} />
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'view-dashboard';
              break;
            case 'Bookmarks':
              iconName = 'bookmark';
              break;
            case 'Tasks':
              iconName = 'check-circle';
              break;
            case 'Notes':
              iconName = 'note-text';
              break;
            case 'TimeTracking':
              iconName = 'timer';
              break;
            case 'Search':
              iconName = 'magnify';
              break;
            case 'AIAssistant':
              iconName = 'robot';
              break;
            case 'Settings':
              iconName = 'cog';
              break;
            default:
              iconName = 'help-circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarBadge: pendingChanges > 0 ? pendingChanges : undefined,
        }}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{ title: 'Bookmarks' }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: 'Tasks' }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{ title: 'Notes' }}
      />
      <Tab.Screen
        name="TimeTracking"
        component={TimeTrackingScreen}
        options={{ title: 'Time' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{ title: 'AI' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
