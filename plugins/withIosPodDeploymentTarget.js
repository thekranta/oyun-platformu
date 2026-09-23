// Yerel Expo config eklentisi.
//
// SORUN: expo-build-properties'in ios.deploymentTarget ayarı yalnız uygulama hedefini ve
// Podfile'ın üstündeki `platform :ios, X` satırını günceller (bkz. node_modules/expo-build-properties
// /build/ios.js). Bu satır CocoaPods'a bir "varsayılan" verir ama bazı üçüncü parti pod'lar (örn.
// RNCAsyncStorage, RNSVGFilters, SDWebImage) kendi podspec'lerinde daha düşük bir hedef bildirdiğinde
// CocoaPods bunu yükseltmiyor. React Native'in kendi react_native_post_install yardımcısı da yalnız
// RN'nin kendi dahili minimumunu bilir, bizim istediğimiz sürümü değil. Sonuç: Xcode "IPHONEOS_
// DEPLOYMENT_TARGET ... desteklenen aralığın altında" hatası verir (yeni Xcode sürümleri eski
// hedefleri artık desteklemiyor).
//
// ÇÖZÜM: `expo prebuild` sırasında Podfile'a, TÜM pod hedeflerinin IPHONEOS_DEPLOYMENT_TARGET'ını
// zorla yükselten bir post_install bloğu ekle (react-native'in kendi yardımcısıyla AYNI teknik,
// yalnız bizim sürümümüzü kullanır). `--clean` prebuild her seferinde Podfile'ı yeniden ürettiği
// için bu ekleme kalıcı olarak her build'de tekrar uygulanır.
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# @generated begin withIosPodDeploymentTarget';
const MARKER_END = '# @generated end withIosPodDeploymentTarget';

function withIosPodDeploymentTarget(config, { deploymentTarget }) {
  if (!deploymentTarget) {
    throw new Error('withIosPodDeploymentTarget: deploymentTarget parametresi zorunlu (ör. "15.1")');
  }
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) {
        return config; // zaten eklenmiş (yeniden çalıştırmada tekrarlamasın)
      }
      const hook = [
        '',
        MARKER,
        '  installer.pods_project.targets.each do |target|',
        '    target.build_configurations.each do |bc|',
        `      if Gem::Version.new(bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '0') < Gem::Version.new('${deploymentTarget}')`,
        `        bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'`,
        '      end',
        '    end',
        '  end',
        MARKER_END,
        '',
      ].join('\n');
      const withHook = contents.replace(/post_install do \|installer\|/, (m) => m + hook);
      if (withHook === contents) {
        throw new Error(
          "withIosPodDeploymentTarget: Podfile içinde 'post_install do |installer|' satırı bulunamadı; " +
          'Expo şablonu değişmiş olabilir, eklenti güncellenmeli.'
        );
      }
      fs.writeFileSync(podfilePath, withHook);
      return config;
    },
  ]);
}

module.exports = withIosPodDeploymentTarget;
