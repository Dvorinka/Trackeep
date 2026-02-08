import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, Title, Paragraph, Button, FAB, Avatar, Chip, ProgressBar } from 'react-native-paper';
import { useAuth } from '../services/AuthContext';
import { useOffline } from '../services/OfflineContext';
import { useRealtimeSync, useRealtimeUpdates } from '../services/RealtimeSyncContext';
import { bookmarksAPI, tasksAPI, notesAPI } from '../services/api';

interface QuickStats {
  totalBookmarks: number;
  totalTasks: number;
  totalNotes: number;
  completedTasks: number;
  recentActivity: number;
}

interface RecentActivity {
  id: string;
  type: 'bookmark' | 'task' | 'note';
  action: string;
  title: string;
  timestamp: string;
}

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, pendingChanges, syncNow } = useOffline();
  const { isSyncing, lastSyncTime } = useRealtimeSync();
  
  const [stats, setStats] = useState<QuickStats>({
    totalBookmarks: 0,
    totalTasks: 0,
    totalNotes: 0,
    completedTasks: 0,
    recentActivity: 0,
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Listen for real-time updates
  useRealtimeUpdates((data) => {
    console.log('Dashboard received real-time update:', data);
    loadDashboardData();
  });

  const loadDashboardData = async () => {
    try {
      const [bookmarksRes, tasksRes, notesRes] = await Promise.all([
        bookmarksAPI.getBookmarks(),
        tasksAPI.getTasks(),
        notesAPI.getNotes(),
      ]);

      if (bookmarksRes.success && tasksRes.success && notesRes.success) {
        const bookmarks = bookmarksRes.data || [];
        const tasks = tasksRes.data || [];
        const notes = notesRes.data || [];
        
        const completedTasks = tasks.filter(task => (task as any).completed).length;

        setStats({
          totalBookmarks: bookmarks.length,
          totalTasks: tasks.length,
          totalNotes: notes.length,
          completedTasks,
          recentActivity: 5, // Mock recent activity count
        });

        // Generate mock recent activity
        const activity: RecentActivity[] = [
          {
            id: '1',
            type: 'bookmark',
            action: 'Added',
            title: bookmarks[0]?.title || 'New bookmark',
            timestamp: '2 hours ago',
          },
          {
            id: '2',
            type: 'task',
            action: 'Completed',
            title: tasks[0]?.title || 'New task',
            timestamp: '3 hours ago',
          },
          {
            id: '3',
            type: 'note',
            action: 'Created',
            title: notes[0]?.title || 'New note',
            timestamp: '5 hours ago',
          },
        ];

        setRecentActivity(activity);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    if (isOnline && pendingChanges > 0) {
      await syncNow();
    }
    setRefreshing(false);
  };

  const getTaskCompletionPercentage = () => {
    if (stats.totalTasks === 0) return 0;
    return Math.round((stats.completedTasks / stats.totalTasks) * 100);
  };

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.userSection}>
            <Avatar.Text 
              size={60} 
              label={user?.name?.charAt(0).toUpperCase() || 'U'} 
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Title style={styles.welcomeText}>
                Welcome back, {user?.name || 'User'}!
              </Title>
              <Paragraph style={styles.subtitle}>
                {isOnline ? '🟢 Connected' : '🔴 Offline'} • 
                {isSyncing ? ' Syncing...' : ` Last sync: ${formatLastSync()}`}
              </Paragraph>
            </View>
          </View>
        </View>

        {/* Quick Stats Cards */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Card.Content style={styles.statContent}>
              <Text style={[styles.statNumber, { color: '#1976d2' }]}>
                {stats.totalBookmarks}
              </Text>
              <Text style={styles.statLabel}>Bookmarks</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#e8f5e8' }]}>
            <Card.Content style={styles.statContent}>
              <Text style={[styles.statNumber, { color: '#388e3c' }]}>
                {stats.totalTasks}
              </Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: '#fff3e0' }]}>
            <Card.Content style={styles.statContent}>
              <Text style={[styles.statNumber, { color: '#f57c00' }]}>
                {stats.totalNotes}
              </Text>
              <Text style={styles.statLabel}>Notes</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Task Progress */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Task Progress</Title>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </Text>
              <ProgressBar
                progress={getTaskCompletionPercentage() / 100}
                color="#4caf50"
                style={styles.progressBar}
              />
              <Text style={styles.progressPercentage}>
                {getTaskCompletionPercentage()}%
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Activity */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Recent Activity</Title>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityEmoji}>
                      {activity.type === 'bookmark' ? '🔖' : 
                       activity.type === 'task' ? '✅' : '📝'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.action} {activity.title}
                    </Text>
                    <Text style={styles.activityTime}>
                      {activity.timestamp}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Paragraph style={styles.emptyText}>No recent activity</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Sync Status */}
        {!isOnline && pendingChanges > 0 && (
          <Card style={[styles.card, styles.offlineCard]}>
            <Card.Content>
              <Title style={styles.cardTitle}>Offline Mode</Title>
              <Paragraph>
                You have {pendingChanges} changes pending sync
              </Paragraph>
              <Button
                mode="outlined"
                onPress={syncNow}
                style={styles.syncButton}
                disabled={!isOnline || isSyncing}
                loading={isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Chip
                icon="bookmark-plus"
                onPress={() => console.log('Add bookmark')}
                style={styles.actionChip}
              >
                Add Bookmark
              </Chip>
              <Chip
                icon="plus"
                onPress={() => console.log('Add task')}
                style={styles.actionChip}
              >
                Add Task
              </Chip>
              <Chip
                icon="note-plus"
                onPress={() => console.log('Add note')}
                style={styles.actionChip}
              >
                Add Note
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add new item')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#6200ee',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: (width - 48) / 3,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#333',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  offlineCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
  },
  syncButton: {
    marginTop: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default DashboardScreen;
