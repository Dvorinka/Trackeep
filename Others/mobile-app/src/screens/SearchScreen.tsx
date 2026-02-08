import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Title, Paragraph, Searchbar, Chip } from 'react-native-paper';

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'notes', label: 'Notes' },
  ];

  const searchResults = [
    {
      id: '1',
      type: 'bookmark',
      title: 'React Native Documentation',
      description: 'Official React Native documentation and guides',
      url: 'https://reactnative.dev',
    },
    {
      id: '2',
      type: 'task',
      title: 'Complete mobile app setup',
      description: 'Finish React Native project structure and navigation',
      status: 'in_progress',
    },
    {
      id: '3',
      type: 'note',
      title: 'Mobile App Architecture',
      content: 'React Native with TypeScript, navigation patterns...',
      tags: ['architecture', 'mobile'],
    },
  ];

  const onChangeSearch = (query: string) => setSearchQuery(query);

  const renderResult = ({ item }: any) => {
    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'bookmark': return '🔖';
        case 'task': return '✅';
        case 'note': return '📝';
        default: return '📄';
      }
    };

    const getTypeColor = (type: string) => {
      switch (type) {
        case 'bookmark': return '#1976d2';
        case 'task': return '#f44336';
        case 'note': return '#4caf50';
        default: return '#666';
      }
    };

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <View style={styles.resultHeader}>
            <Text style={styles.typeIcon}>{getTypeIcon(item.type)}</Text>
            <Text style={[styles.typeLabel, { color: getTypeColor(item.type) }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          
          <Title numberOfLines={1} style={styles.resultTitle}>
            {item.title}
          </Title>
          
          <Paragraph numberOfLines={2} style={styles.resultDescription}>
            {item.description || item.content}
          </Paragraph>
          
          {item.url && (
            <Text style={styles.resultUrl} numberOfLines={1}>
              {item.url}
            </Text>
          )}
          
          {item.tags && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag: string, index: number) => (
                <Chip key={index} style={styles.tag}>
                  {tag}
                </Chip>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search everything..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <View style={styles.filtersContainer}>
        {filters.map(filter => (
          <Chip
            key={filter.id}
            selected={selectedFilter === filter.id}
            onPress={() => setSelectedFilter(filter.id)}
            style={styles.filterChip}
          >
            {filter.label}
          </Chip>
        ))}
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.resultsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No results found' : 'Start typing to search'}
            </Text>
          </View>
        }
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
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resultCard: {
    marginBottom: 12,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  resultTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultUrl: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default SearchScreen;
