import { getOfflineData, clearOfflineChanges, addOfflineChange } from './storage';
import { bookmarksAPI, tasksAPI, notesAPI, timeEntriesAPI } from '../services/api';

interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'bookmark' | 'task' | 'note' | 'timeEntry';
  data: any;
  timestamp: string;
}

export const getPendingChangesCount = async (): Promise<number> => {
  try {
    const changes = await getOfflineData('OFFLINE_CHANGES') as OfflineChange[];
    return changes.length;
  } catch (error) {
    console.error('Error getting pending changes count:', error);
    return 0;
  }
};

export const syncOfflineData = async (): Promise<void> => {
  try {
    const changes = await getOfflineData('OFFLINE_CHANGES') as OfflineChange[];
    
    for (const change of changes) {
      try {
        await processChange(change);
      } catch (error) {
        console.error(`Error processing change ${change.id}:`, error);
      }
    }
    
    await clearOfflineChanges();
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};

const processChange = async (change: OfflineChange): Promise<void> => {
  switch (change.entityType) {
    case 'bookmark':
      await processBookmarkChange(change);
      break;
    case 'task':
      await processTaskChange(change);
      break;
    case 'note':
      await processNoteChange(change);
      break;
    case 'timeEntry':
      await processTimeEntryChange(change);
      break;
    default:
      console.warn(`Unknown entity type: ${change.entityType}`);
  }
};

const processBookmarkChange = async (change: OfflineChange): Promise<void> => {
  switch (change.type) {
    case 'create':
      await bookmarksAPI.createBookmark(change.data);
      break;
    case 'update':
      await bookmarksAPI.updateBookmark(change.data.id, change.data);
      break;
    case 'delete':
      await bookmarksAPI.deleteBookmark(change.data.id);
      break;
  }
};

const processTaskChange = async (change: OfflineChange): Promise<void> => {
  switch (change.type) {
    case 'create':
      await tasksAPI.createTask(change.data);
      break;
    case 'update':
      await tasksAPI.updateTask(change.data.id, change.data);
      break;
    case 'delete':
      await tasksAPI.deleteTask(change.data.id);
      break;
  }
};

const processNoteChange = async (change: OfflineChange): Promise<void> => {
  switch (change.type) {
    case 'create':
      await notesAPI.createNote(change.data);
      break;
    case 'update':
      await notesAPI.updateNote(change.data.id, change.data);
      break;
    case 'delete':
      await notesAPI.deleteNote(change.data.id);
      break;
  }
};

const processTimeEntryChange = async (change: OfflineChange): Promise<void> => {
  switch (change.type) {
    case 'create':
      await timeEntriesAPI.createTimeEntry(change.data);
      break;
    case 'update':
      await timeEntriesAPI.updateTimeEntry(change.data.id, change.data);
      break;
    case 'delete':
      await timeEntriesAPI.deleteTimeEntry(change.data.id);
      break;
  }
};

export const queueOfflineChange = async (
  type: 'create' | 'update' | 'delete',
  entityType: 'bookmark' | 'task' | 'note' | 'timeEntry',
  data: any
): Promise<void> => {
  await addOfflineChange({
    type,
    entityType,
    data,
  });
};
