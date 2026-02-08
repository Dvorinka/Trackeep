import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, FAB, Searchbar } from 'react-native-paper';

const BookmarksScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [bookmarks] = React.useState([
    {
      id: '1',
      title: 'React Native Documentation',
      url: 'https://reactnative.dev',
      description: 'Official React Native documentation',
      tags: ['react', 'mobile', 'documentation'],
      isFavorite: true,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'TypeScript Handbook',
      url: 'https://www.typescriptlang.org/docs',
      description: 'Learn TypeScript from the official handbook',
      tags: ['typescript', 'programming', 'tutorial'],
      isFavorite: false,
      createdAt: new Date(),
    },
  ]);

  const onChangeSearch = (query: string) => setSearchQuery(query);

  const renderBookmark = ({ item }: any) => (
    <Card style={styles.card}>
      <Card.Content>
        <Title numberOfLines={1}>{item.title}</Title>
        <Paragraph numberOfLines={2}>{item.description}</Paragraph>
        <Text style={styles.url}>{item.url}</Text>
        <View style={styles.tagsContainer}>
          {item.tags.map((tag: string, index: number) => (
            <Text key={index} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search bookmarks..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={bookmarks}
        renderItem={renderBookmark}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="bookmark-plus"
        style={styles.fab}
        onPress={() => console.log('Add bookmark')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  url: {
    color: '#6200ee',
    fontSize: 12,
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default BookmarksScreen;
