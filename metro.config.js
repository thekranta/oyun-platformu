const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Vercel static export asset path issues
config.resolver.assetExts = [...config.resolver.assetExts, 'mp3', 'mp4', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

// Exclude large assets from Metro bundler - they are served from public folder
config.resolver.blockList = [
    /assets[\/\\]sounds[\/\\].*/,
    /assets[\/\\]images[\/\\]stories[\/\\].*/,
];

// REMOVED hashAssetFiles plugin - it causes issues with Vercel builds
// Assets will be served without hash in filename

module.exports = config;

