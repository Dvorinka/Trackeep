# Mobile App Sync Testing Guide

## Overview
This guide helps you test the bi-directional synchronization between the Trackeep mobile app and web dashboard.

## Prerequisites

1. **Backend Server**: Ensure your Trackeep backend is running
2. **Web Dashboard**: Access the web dashboard at `http://localhost:3000` (or your configured URL)
3. **Mobile App**: Run the React Native app using:
   ```bash
   npm start
   npm run android  # or npm run ios
   ```

## First Launch Setup

1. **Server Configuration**: On first launch, the mobile app will show the server setup screen:
   - Enter your backend URL (e.g., `http://localhost:8080`)
   - Enter your credentials
   - Test connection before completing setup

2. **Authentication**: After setup, you'll be redirected to login with your existing credentials

## Testing Real-Time Sync

### Test 1: Create Content on Mobile, Verify on Web

1. **On Mobile App**:
   - Open the Dashboard
   - Tap the FAB (+) button
   - Create a new task, bookmark, or note
   - Verify it appears in the mobile dashboard

2. **On Web Dashboard**:
   - Navigate to the corresponding section (Tasks, Bookmarks, or Notes)
   - The new item should appear within seconds (if WebSocket is connected)
   - If not, refresh the page to see the synced item

### Test 2: Create Content on Web, Verify on Mobile

1. **On Web Dashboard**:
   - Create a new task, bookmark, or note
   - Save the item

2. **On Mobile App**:
   - The item should appear automatically if real-time sync is working
   - Pull to refresh on the dashboard to force sync
   - Check the specific section to verify the item appears

### Test 3: Offline Mode Testing

1. **Enable Offline Mode**:
   - Turn off internet connection on your mobile device
   - The app should show "🔴 Offline" status

2. **Create Content Offline**:
   - Create several tasks, bookmarks, or notes
   - Notice the pending changes counter increases

3. **Restore Connection**:
   - Turn internet back on
   - App should show "🟢 Connected" and auto-sync
   - Verify items appear on web dashboard

### Test 4: Conflict Resolution

1. **Simulate Conflict**:
   - Create the same item on both mobile and web while offline
   - Bring both online simultaneously
   - Verify how conflicts are resolved (last write wins or merge)

## Key Features to Test

### Real-Time Updates
- ✅ WebSocket connection status
- ✅ Instant updates across devices
- ✅ Connection recovery after disconnection

### Offline Support
- ✅ Offline data persistence
- ✅ Pending changes tracking
- ✅ Automatic sync when online
- ✅ Manual sync button

### Data Integrity
- ✅ All data types sync correctly (tasks, bookmarks, notes)
- ✅ Timestamps preserved
- ✅ User associations maintained
- ✅ Tags and metadata sync

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**:
   - Check if backend WebSocket endpoint is accessible
   - Verify firewall settings
   - Check browser console for WebSocket errors

2. **Sync Not Working**:
   - Verify server URL in mobile app settings
   - Check authentication tokens
   - Review backend logs for sync errors

3. **Offline Mode Not Detected**:
   - Check network permissions on mobile device
   - Verify NetInfo plugin is working
   - Test with airplane mode

### Debug Tools

1. **Mobile App Debugging**:
   ```bash
   # Enable debug mode
   npx react-native log-android
   npx react-native log-ios
   ```

2. **Backend Logs**:
   - Monitor sync endpoint logs
   - Check WebSocket connection logs
   - Review database transaction logs

3. **Browser Console**:
   - Monitor WebSocket connections
   - Check for real-time update events
   - Verify API responses

## Performance Testing

### Test Scenarios

1. **Large Dataset Sync**:
   - Create 100+ items on one device
   - Measure sync time to other device
   - Verify no data loss

2. **Concurrent Updates**:
   - Multiple users updating same data
   - Test conflict resolution
   - Verify data consistency

3. **Network Conditions**:
   - Test on slow networks (2G/3G)
   - Test with intermittent connectivity
   - Verify sync resilience

## Expected Results

### Successful Sync Indicators

1. **Mobile App**:
   - Status shows "🟢 Connected"
   - Last sync time updates
   - No pending changes counter
   - Real-time updates received

2. **Web Dashboard**:
   - New items appear without refresh
   - WebSocket connection established
   - No sync errors in console

### Performance Benchmarks

- **Small items** (< 1KB): Should sync within 1-2 seconds
- **Large items** (> 100KB): Should sync within 5-10 seconds
- **Batch sync** (50+ items): Should complete within 30 seconds

## Automated Testing

For comprehensive testing, consider implementing:

1. **Unit Tests**:
   - Sync logic validation
   - Offline queue management
   - Conflict resolution

2. **Integration Tests**:
   - End-to-end sync workflows
   - WebSocket connection testing
   - API integration validation

3. **E2E Tests**:
   - Multi-device sync scenarios
   - Offline/online transitions
   - User interaction flows

## Reporting Issues

When reporting sync issues, include:

1. Device information (OS, version)
2. Network conditions
3. Steps to reproduce
4. Screenshots of error messages
5. Backend logs (if available)
6. Browser console errors

## Success Criteria

The sync implementation is considered successful when:

- ✅ All data types sync bi-directionally
- ✅ Real-time updates work within 5 seconds
- ✅ Offline mode functions correctly
- ✅ No data loss during sync
- ✅ Conflicts are handled gracefully
- ✅ Performance meets benchmarks
- ✅ Error recovery works reliably
