import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../components/UI';
import { FilesScreen } from './FilesScreen';
import { NotesScreen } from './NotesScreen';
import { SettingsScreen } from './SettingsScreen';
import { TasksScreen } from './TasksScreen';
import { TimeEntriesScreen } from './TimeEntriesScreen';

type TabKey = 'tasks' | 'notes' | 'files' | 'time' | 'settings';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'notes', label: 'Notes' },
  { key: 'files', label: 'Files' },
  { key: 'time', label: 'Time' },
  { key: 'settings', label: 'Settings' },
];

interface MainTabsProps {
  instanceUrl: string;
  token: string;
}

export function MainTabs({ instanceUrl, token }: MainTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');

  const content = useMemo(() => {
    switch (activeTab) {
      case 'tasks':
        return <TasksScreen instanceUrl={instanceUrl} token={token} isActive />;
      case 'notes':
        return <NotesScreen instanceUrl={instanceUrl} token={token} isActive />;
      case 'files':
        return <FilesScreen instanceUrl={instanceUrl} token={token} isActive />;
      case 'time':
        return <TimeEntriesScreen instanceUrl={instanceUrl} token={token} isActive />;
      case 'settings':
        return <SettingsScreen isActive />;
      default:
        return null;
    }
  }, [activeTab, instanceUrl, token]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>{content}</View>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.tabButton,
                isActive ? styles.tabButtonActive : undefined,
                pressed ? styles.tabPressed : undefined,
              ]}
            >
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : undefined]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: '#E6F6FB',
  },
  tabPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primaryDark,
  },
});
