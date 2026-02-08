import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, Checkbox } from 'react-native-paper';

const TasksScreen: React.FC = () => {
  const [tasks, setTasks] = React.useState([
    {
      id: '1',
      title: 'Complete mobile app setup',
      description: 'Finish React Native project structure',
      status: 'in_progress' as const,
      priority: 'high' as const,
      completed: false,
    },
    {
      id: '2',
      title: 'Review pull requests',
      description: 'Check and merge pending PRs',
      status: 'todo' as const,
      priority: 'medium' as const,
      completed: false,
    },
  ]);

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#666';
    }
  };

  const renderTask = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.taskHeader}>
          <Checkbox
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => toggleTask(item.id)}
          />
          <View style={styles.taskContent}>
            <Title style={[styles.taskTitle, item.completed && styles.completedTitle]}>
              {item.title}
            </Title>
            <Paragraph style={styles.taskDescription}>
              {item.description}
            </Paragraph>
            <Text style={[styles.priority, { color: getPriorityColor(item.priority) }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add task')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskContent: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 16,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  taskDescription: {
    marginTop: 4,
    fontSize: 14,
  },
  priority: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default TasksScreen;
