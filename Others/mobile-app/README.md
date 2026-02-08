# Trackeep Mobile App

React Native mobile application for Trackeep - productivity and knowledge management platform.

## Features

### ✅ Core Features Implemented
- **🔐 Authentication**: Login with email/password and GitHub OAuth
- **📱 Offline Support**: Full offline functionality with sync when online
- **📝 Content Management**: Bookmarks, Tasks, Notes, and Time Tracking
- **🔍 Search**: Unified search across all content types
- **⏱️ Time Tracking**: Built-in timer with task association
- **🎨 Modern UI**: Material Design with React Native Paper
- **📊 Dashboard**: Overview with stats and recent activity

### ✅ Mobile-Specific Features
- **Gesture Navigation**: Intuitive mobile navigation patterns
- **Push Notifications**: Task reminders and updates with permission management
- **Camera Integration**: Document scanning capability with permission handling
- **Voice Notes**: Audio recording for quick notes with speech-to-text
- **Background Sync**: Automatic data synchronization
- **Responsive Design**: Optimized for various screen sizes

## Tech Stack

- **React Native** 0.72.6
- **TypeScript** for type safety
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **AsyncStorage** for local data persistence
- **Axios** for API communication
- **Vector Icons** for iconography

## Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── DashboardScreen.tsx
│   │   ├── BookmarksScreen.tsx
│   │   ├── TasksScreen.tsx
│   │   ├── NotesScreen.tsx
│   │   ├── TimeTrackingScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/           # Business logic and API
│   │   ├── AuthContext.tsx
│   │   ├── OfflineContext.tsx
│   │   └── api.ts
│   ├── navigation/         # Navigation configuration
│   ├── utils/              # Utility functions
│   │   ├── storage.ts
│   │   └── offlineSync.ts
│   └── types/             # TypeScript type definitions
├── android/               # Android-specific code
├── ios/                   # iOS-specific code
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 16+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Trackeep/mobile-app
```

2. Install dependencies:
```bash
npm install
```

3. For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

### Running the App

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

#### Start Metro Bundler
```bash
npm start
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
API_BASE_URL=http://localhost:8080/api
```

### API Configuration

Update the API base URL in `src/services/api.ts` to match your backend server.

## Features Status

### ✅ Completed
- [x] Project setup and configuration
- [x] Authentication flow (email/password, GitHub)
- [x] Navigation structure
- [x] Core screens (Dashboard, Bookmarks, Tasks, Notes, Time Tracking, Search, Settings)
- [x] Offline data storage and sync
- [x] Modern UI with Material Design
- [x] TypeScript integration
- [x] API service layer
- [x] Push notification implementation with permission management
- [x] Camera integration for document scanning
- [x] Voice recording for notes with speech-to-text
- [x] Enhanced settings screen with mobile features

### 📋 Planned
- [ ] Biometric authentication
- [ ] Dark mode theme
- [ ] Widget support
- [ ] Apple Watch companion app
- [ ] Advanced analytics

## Development

### Code Style

The project uses TypeScript and follows React Native best practices. All components are functional components with hooks.

### State Management

- **Authentication**: React Context (AuthContext)
- **Offline Sync**: React Context (OfflineContext)
- **Local Data**: AsyncStorage with SQLite for complex queries

### API Integration

All API calls are centralized in `src/services/api.ts` with automatic token management and error handling.

## Testing

```bash
npm test
```

## Building

### Android Release Build
```bash
npm run build:android
```

### iOS Release Build
```bash
npm run build:ios
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
