import * as THREE from 'three';

export class ProgressionManager {
  constructor() {
    this.completedLevels = [];
    this.unlockedBuildings = {
      'house': { unlocked: true, completed: false, score: 0 },
      'garage': { unlocked: false, completed: false, score: 0 },
      'accelerator': { unlocked: false, completed: false, score: 0 },
      'loft': { unlocked: false, completed: false, score: 0 },
      'conference': { unlocked: false, completed: false, score: 0 },
      'data-center': { unlocked: false, completed: false, score: 0 },
      'board-room': { unlocked: false, completed: false, score: 0 },
      'venture': { unlocked: false, completed: false, score: 0 },
      'law': { unlocked: false, completed: false, score: 0 },
      'nasdaq': { unlocked: false, completed: false, score: 0 }
    };

    this.currentStats = {
      dau: 0,
      mrr: 0,
      funding: 0,
      teamSize: 1,
      morale: 100,
      runway: 12  // 12 months starting runway
    };

    this.buildingOrder = [
      'house', 'garage', 'accelerator', 'loft', 'conference',
      'data-center', 'board-room', 'venture', 'law', 'nasdaq'
    ];
    this.levelRequirements = {
      'house': { levelNumber: 1, requiredLevel: null, stats: {} },
      'garage': {
        levelNumber: 2,
        requiredLevel: 'house',
        stats: { minScore: 75 }
      },
      'accelerator': {
        levelNumber: 3,
        requiredLevel: 'garage',
        stats: { minScore: 80, mrr: 5000, dau: 100 }
      },
      'loft': {
        levelNumber: 4,
        requiredLevel: 'accelerator',
        stats: { minScore: 75, funding: 2000000 }
      },
      'conference': {
        levelNumber: 5,
        requiredLevel: 'loft',
        stats: { minScore: 80, teamSize: 5 }
      },
      'data-center': {
        levelNumber: 6,
        requiredLevel: 'conference',
        stats: { minScore: 75, dau: 1000 }
      },
      'board-room': {
        levelNumber: 7,
        requiredLevel: 'data-center',
        stats: { minScore: 80 }
      },
      'venture': {
        levelNumber: 8,
        requiredLevel: 'board-room',
        stats: { minScore: 75, mrr: 100000 }
      },
      'law': {
        levelNumber: 9,
        requiredLevel: 'venture',
        stats: { minScore: 80, funding: 10000000 }
      },
      'nasdaq': {
        levelNumber: 10,
        requiredLevel: 'law',
        stats: { minScore: 85, mrr: 500000, teamSize: 20 }
      }
    };

    // Load saved progress
    this.loadProgress();
  }

  isLocked(buildingType) {
    return !this.unlockedBuildings[buildingType]?.unlocked;
  }

  checkRequirements(buildingType) {
    const requirements = this.levelRequirements[buildingType];
    if (!requirements) return { met: false, missing: ['Invalid building'] };

    // House is always unlocked
    if (buildingType === 'house') return { met: true, missing: [] };

    const missing = [];

    // Check if previous level is completed
    if (requirements.requiredLevel) {
      const prevBuilding = this.unlockedBuildings[requirements.requiredLevel];
      if (!prevBuilding.completed) {
        missing.push(`Complete ${this.formatBuildingName(requirements.requiredLevel)}`);
      }
      if (prevBuilding.score < (requirements.stats.minScore || 0)) {
        missing.push(`Score ${requirements.stats.minScore}+ in ${this.formatBuildingName(requirements.requiredLevel)}`);
      }
    }

    // Check stat requirements
    if (requirements.stats.mrr && this.currentStats.mrr < requirements.stats.mrr) {
      missing.push(`MRR: $${this.formatNumber(requirements.stats.mrr)} (currently $${this.formatNumber(this.currentStats.mrr)})`);
    }
    if (requirements.stats.dau && this.currentStats.dau < requirements.stats.dau) {
      missing.push(`DAU: ${requirements.stats.dau} (currently ${this.currentStats.dau})`);
    }
    if (requirements.stats.funding && this.currentStats.funding < requirements.stats.funding) {
      missing.push(`Funding: $${this.formatNumber(requirements.stats.funding)} (currently $${this.formatNumber(this.currentStats.funding)})`);
    }
    if (requirements.stats.teamSize && this.currentStats.teamSize < requirements.stats.teamSize) {
      missing.push(`Team: ${requirements.stats.teamSize} people (currently ${this.currentStats.teamSize})`);
    }

    return {
      met: missing.length === 0,
      missing: missing
    };
  }

  unlockBuilding(buildingType) {
    if (this.unlockedBuildings[buildingType]) {
      this.unlockedBuildings[buildingType].unlocked = true;
      this.saveProgress();
      return true;
    }
    return false;
  }

  completeLevel(buildingType, score) {
    if (this.unlockedBuildings[buildingType]) {
      this.unlockedBuildings[buildingType].completed = true;
      this.unlockedBuildings[buildingType].score = Math.max(
        this.unlockedBuildings[buildingType].score,
        score
      );

      const levelNumber = this.levelRequirements[buildingType].levelNumber;
      if (!this.completedLevels.includes(levelNumber)) {
        this.completedLevels.push(levelNumber);
      }

      // Auto-unlock next building if requirements met
      const currentIndex = this.buildingOrder.indexOf(buildingType);
      if (currentIndex >= 0 && currentIndex < this.buildingOrder.length - 1) {
        const nextBuilding = this.buildingOrder[currentIndex + 1];
        const reqCheck = this.checkRequirements(nextBuilding);
        if (reqCheck.met) {
          this.unlockBuilding(nextBuilding);
        }
      }

      this.saveProgress();
      return true;
    }
    return false;
  }

  updateStats(statUpdates) {
    Object.keys(statUpdates).forEach(key => {
      if (key in this.currentStats) {
        this.currentStats[key] = statUpdates[key];
      }
    });
    this.saveProgress();
  }

  modifyRunway(amount) {
    this.currentStats.runway = Math.max(0, Math.min(12, this.currentStats.runway + amount));
    this.saveProgress();
    return this.currentStats.runway;
  }

  isGameOver() {
    return this.currentStats.runway <= 0;
  }

  formatBuildingName(buildingType) {
    const names = {
      'house': 'House',
      'garage': 'Garage',
      'accelerator': 'Accelerator',
      'loft': 'Startup Loft',
      'conference': 'Tech Conference',
      'data-center': 'Data Center',
      'board-room': 'Board Room',
      'venture': 'Venture Capital',
      'law': 'Law Firm',
      'nasdaq': 'NASDAQ'
    };
    return names[buildingType] || buildingType;
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  getRequirementsText(buildingType) {
    const check = this.checkRequirements(buildingType);
    if (check.met) return 'Requirements met!';

    return 'Requirements:\n' + check.missing.join('\n');
  }

  saveProgress() {
    const data = {
      completedLevels: this.completedLevels,
      unlockedBuildings: this.unlockedBuildings,
      currentStats: this.currentStats
    };
    localStorage.setItem('losv_progression', JSON.stringify(data));
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('losv_progression');
      if (saved) {
        const data = JSON.parse(saved);
        this.completedLevels = data.completedLevels || [];
        this.unlockedBuildings = { ...this.unlockedBuildings, ...data.unlockedBuildings };
        this.currentStats = { ...this.currentStats, ...data.currentStats };
      }
    } catch (e) {
      console.error('Failed to load progression:', e);
    }
  }

  resetProgress() {
    localStorage.removeItem('losv_progression');
    this.completedLevels = [];
    this.unlockedBuildings = {
      'house': { unlocked: true, completed: false, score: 0 },
      'garage': { unlocked: false, completed: false, score: 0 },
      'accelerator': { unlocked: false, completed: false, score: 0 },
      'loft': { unlocked: false, completed: false, score: 0 },
      'conference': { unlocked: false, completed: false, score: 0 },
      'data-center': { unlocked: false, completed: false, score: 0 },
      'board-room': { unlocked: false, completed: false, score: 0 },
      'venture': { unlocked: false, completed: false, score: 0 },
      'law': { unlocked: false, completed: false, score: 0 },
      'nasdaq': { unlocked: false, completed: false, score: 0 }
    };
    this.currentStats = {
      dau: 0,
      mrr: 0,
      funding: 0,
      teamSize: 1,
      morale: 100,
      runway: 12
    };
  }
}
