const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for Vercel static export asset path issues
config.resolver.assetExts = [...config.resolver.assetExts, 'mp3', 'wav', 'mp4', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

// REMOVED hashAssetFiles plugin - it causes issues with Vercel builds
// Assets will be served without hash in filename

// ANDROID: `Text` bileşeni lib/EmojiText.tsx'e yönlenir (eski Android'de Emoji 12+ kutu/yarım çıkıyor → yedek Noto resmi; bkz. lib/emojiFallback.ts).
// RN'in `Text` getter'ı, Animated.Text ve RN iç bileşenleri dahil HER import buradan geçer; EmojiText.tsx özgün Text'i yine aynı yoldan
// aldığı için (origin = kendisi) yönlendirilmez. Yalnız android: web ve iOS özgün Text'i kullanır.
const path = require('path');
const EMOJI_TEXT = path.resolve(__dirname, 'lib', 'EmojiText.tsx');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  const resolution = resolve(context, moduleName, platform);
  if (
    platform === 'android' &&
    resolution && resolution.type === 'sourceFile' &&
    /[\\/]react-native[\\/]Libraries[\\/]Text[\\/]Text\.js$/.test(resolution.filePath) &&
    context.originModulePath !== EMOJI_TEXT
  ) {
    return { type: 'sourceFile', filePath: EMOJI_TEXT };
  }
  return resolution;
};

module.exports = config;


