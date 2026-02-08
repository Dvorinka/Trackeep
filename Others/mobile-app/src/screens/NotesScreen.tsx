import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, FAB } from 'react-native-paper';

const NotesScreen: React.FC = () => {
  const [notes] = React.useState([
    {
      id: '1',
      title: 'Mobile App Architecture',
      content: 'React Native with TypeScript, navigation, offline support...',
      tags: ['architecture', 'mobile', 'react-native'],
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Meeting Notes - Product Review',
      content: 'Discussed new features, timeline, and user feedback...',
      tags: ['meeting', 'product', 'review'],
      createdAt: new Date(),
    },
  ]);

  const renderNote = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title numberOfLines={1}>{item.title}</Title>
        <Paragraph numberOfLines={3}>{item.content}</Paragraph>
        <View style={styles.tagsContainer}>
          {item.tags.map((tag: string, index: number) => (
            <Text key={index} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
        <Text style={styles.date}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => console.log('Add note')}
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e8f5e8',
    color: '#2e7d32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default NotesScreen;
