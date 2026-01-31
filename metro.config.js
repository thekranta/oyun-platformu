const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Vercel static export asset path issues
config.resolver.assetExts = [...config.resolver.assetExts, 'mp3', 'mp4', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

// Ensure proper asset handling for web builds
config.transformer = {
    ...config.transformer,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

module.exports = config;
