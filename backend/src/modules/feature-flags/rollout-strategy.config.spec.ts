import {
  RolloutPhase,
  ROLLOUT_STRATEGY,
  PHASE_ORDER,
  getNextPhase,
  getPreviousPhase,
  getPhaseConfig,
  canAdvancePhase,
} from './rollout-strategy.config';

describe('RolloutStrategyConfig', () => {
  describe('ROLLOUT_STRATEGY', () => {
    it('should have all three phases defined', () => {
      expect(ROLLOUT_STRATEGY.alpha).toBeDefined();
      expect(ROLLOUT_STRATEGY.beta).toBeDefined();
      expect(ROLLOUT_STRATEGY.ga).toBeDefined();
    });

    it('should have correct percentages for each phase', () => {
      expect(ROLLOUT_STRATEGY.alpha.percentage).toBe(5);
      expect(ROLLOUT_STRATEGY.beta.percentage).toBe(25);
      expect(ROLLOUT_STRATEGY.ga.percentage).toBe(100);
    });

    it('should have metrics thresholds that decrease as phases progress', () => {
      expect(ROLLOUT_STRATEGY.alpha.metrics.errorRateThreshold).toBeGreaterThan(
        ROLLOUT_STRATEGY.beta.metrics.errorRateThreshold,
      );
      expect(ROLLOUT_STRATEGY.beta.metrics.errorRateThreshold).toBeGreaterThan(
        ROLLOUT_STRATEGY.ga.metrics.errorRateThreshold,
      );
    });

    it('should have increasing duration requirements for earlier phases', () => {
      expect(ROLLOUT_STRATEGY.alpha.metrics.minDurationHours).toBeLessThan(
        ROLLOUT_STRATEGY.beta.metrics.minDurationHours,
      );
    });
  });

  describe('PHASE_ORDER', () => {
    it('should have phases in correct order', () => {
      expect(PHASE_ORDER).toEqual([
        RolloutPhase.ALPHA,
        RolloutPhase.BETA,
        RolloutPhase.GA,
      ]);
    });
  });

  describe('getNextPhase', () => {
    it('should return beta for alpha', () => {
      expect(getNextPhase(RolloutPhase.ALPHA)).toBe(RolloutPhase.BETA);
    });

    it('should return ga for beta', () => {
      expect(getNextPhase(RolloutPhase.BETA)).toBe(RolloutPhase.GA);
    });

    it('should return null for ga', () => {
      expect(getNextPhase(RolloutPhase.GA)).toBeNull();
    });
  });

  describe('getPreviousPhase', () => {
    it('should return null for alpha', () => {
      expect(getPreviousPhase(RolloutPhase.ALPHA)).toBeNull();
    });

    it('should return alpha for beta', () => {
      expect(getPreviousPhase(RolloutPhase.BETA)).toBe(RolloutPhase.ALPHA);
    });

    it('should return beta for ga', () => {
      expect(getPreviousPhase(RolloutPhase.GA)).toBe(RolloutPhase.BETA);
    });
  });

  describe('getPhaseConfig', () => {
    it('should return alpha config for alpha phase', () => {
      const config = getPhaseConfig(RolloutPhase.ALPHA);
      expect(config.percentage).toBe(5);
      expect(config.criteria).toContain('internal_testers');
    });

    it('should return beta config for beta phase', () => {
      const config = getPhaseConfig(RolloutPhase.BETA);
      expect(config.percentage).toBe(25);
      expect(config.criteria).toContain('early_adopters');
    });

    it('should return ga config for ga phase', () => {
      const config = getPhaseConfig(RolloutPhase.GA);
      expect(config.percentage).toBe(100);
      expect(config.criteria).toContain('all_users');
    });
  });

  describe('canAdvancePhase', () => {
    it('should return true when all metrics are met for alpha', () => {
      const result = canAdvancePhase(RolloutPhase.ALPHA, {
        errorRateThreshold: 2, // Below 5% threshold
        minDurationHours: 30, // Above 24h minimum
        minActiveUsers: 15, // Above 10 minimum
      });
      expect(result).toBe(true);
    });

    it('should return false when error rate exceeds threshold', () => {
      const result = canAdvancePhase(RolloutPhase.ALPHA, {
        errorRateThreshold: 10, // Above 5% threshold
        minDurationHours: 30,
        minActiveUsers: 15,
      });
      expect(result).toBe(false);
    });

    it('should return false when duration is insufficient', () => {
      const result = canAdvancePhase(RolloutPhase.ALPHA, {
        errorRateThreshold: 2,
        minDurationHours: 12, // Below 24h minimum
        minActiveUsers: 15,
      });
      expect(result).toBe(false);
    });

    it('should return false when active users are insufficient', () => {
      const result = canAdvancePhase(RolloutPhase.ALPHA, {
        errorRateThreshold: 2,
        minDurationHours: 30,
        minActiveUsers: 5, // Below 10 minimum
      });
      expect(result).toBe(false);
    });

    it('should return true when partial metrics provided and met', () => {
      const result = canAdvancePhase(RolloutPhase.ALPHA, {
        errorRateThreshold: 2,
      });
      expect(result).toBe(true);
    });

    it('should handle beta phase requirements', () => {
      const result = canAdvancePhase(RolloutPhase.BETA, {
        errorRateThreshold: 1, // Below 2% threshold
        minDurationHours: 80, // Above 72h minimum
        minActiveUsers: 60, // Above 50 minimum
      });
      expect(result).toBe(true);
    });
  });
});
