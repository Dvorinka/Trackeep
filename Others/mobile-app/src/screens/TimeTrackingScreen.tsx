import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Title, Paragraph, Button, FAB } from 'react-native-paper';

const TimeTrackingScreen: React.FC = () => {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setCurrentTask('');
  };

  const timeEntries = [
    {
      id: '1',
      description: 'Mobile app development',
      duration: '2:30:00',
      date: 'Today',
    },
    {
      id: '2',
      description: 'Code review',
      duration: '0:45:00',
      date: 'Yesterday',
    },
  ];

  return (
    <View style={styles.container}>
      <Card style={styles.timerCard}>
        <Card.Content>
          <Title style={styles.timerTitle}>Time Tracker</Title>
          <Text style={styles.timeDisplay}>{formatTime(elapsedTime)}</Text>
          
          {currentTask ? (
            <Paragraph style={styles.currentTask}>
              Working on: {currentTask}
            </Paragraph>
          ) : (
            <Paragraph style={styles.noTask}>
              No task selected
            </Paragraph>
          )}

          <View style={styles.timerButtons}>
            <Button
              mode={isTimerRunning ? 'outlined' : 'contained'}
              onPress={toggleTimer}
              style={styles.timerButton}
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </Button>
            <Button
              mode="outlined"
              onPress={resetTimer}
              style={styles.timerButton}
            >
              Reset
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.entriesCard}>
        <Card.Content>
          <Title>Recent Entries</Title>
          {timeEntries.map(entry => (
            <View key={entry.id} style={styles.entryItem}>
              <View style={styles.entryContent}>
                <Text style={styles.entryDescription}>
                  {entry.description}
                </Text>
                <Text style={styles.entryDuration}>
                  {entry.duration}
                </Text>
              </View>
              <Text style={styles.entryDate}>{entry.date}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add time entry')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  timerCard: {
    marginBottom: 16,
    elevation: 4,
  },
  timerTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6200ee',
    marginBottom: 16,
  },
  currentTask: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  noTask: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  timerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  entriesCard: {
    elevation: 2,
  },
  entryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  entryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDescription: {
    flex: 1,
    fontSize: 16,
  },
  entryDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  entryDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default TimeTrackingScreen;
