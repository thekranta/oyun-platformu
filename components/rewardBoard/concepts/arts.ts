// Tek eşzamansız sınır: PlantArt, SkyArt ve react-native-reanimated TEK parçada iner (bkz. lazyArt.tsx).
// Çizimler ayrı ayrı import() edilseydi Reanimated (~0,7 MB ham) iki parçaya da kopyalanırdı.
export { default as PlantArt } from './PlantArt';
export { default as SkyArt } from './SkyArt';
