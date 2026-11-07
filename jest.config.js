module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
  // Uygulama disi kopyalar ve derleme ciktilari test olarak toplanmasin (eski calisma agaclari .claude/worktrees
  // altinda ayni testlerin eski surumlerini tasir ve tum takimi kirmizi gosterirdi).
  testPathIgnorePatterns: ['/node_modules/', '/\.claude/', '/dist/', '/\.tmp-room-export/', '/\.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    '^test-renderer$': 'react-test-renderer'
  }
};
