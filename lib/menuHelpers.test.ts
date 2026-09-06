import { calculateAgeInMonths, getCatalogGames } from './menuHelpers';
import { GAME_CATALOG } from '../constants/gameCatalog';

describe('menuHelpers', () => {
  describe('calculateAgeInMonths', () => {
    it('should correctly calculate age in months for a given birth year and month', () => {
      // Mock the current date to ensure tests are deterministic
      jest.useFakeTimers().setSystemTime(new Date('2026-09-01'));
      
      // Born in 2023-03-01 => 3 years (36 months) + 6 months = 42 months
      expect(calculateAgeInMonths('01/03/2023')).toBe(42);
      
      // Born in 2026-08-01 => 1 month
      expect(calculateAgeInMonths('01/08/2026')).toBe(1);
    });
  });

  describe('getCatalogGames', () => {
    it('should filter games by status correctly', () => {
      const coreGames = getCatalogGames('core');
      expect(coreGames.length).toBeGreaterThan(0);
      expect(coreGames.every(game => game.status === 'core')).toBe(true);

      const secondaryGames = getCatalogGames('secondary');
      expect(secondaryGames.length).toBeGreaterThan(0);
      expect(secondaryGames.every(game => game.status === 'secondary')).toBe(true);
    });
  });
});
