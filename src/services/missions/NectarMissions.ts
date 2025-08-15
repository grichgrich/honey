/**
 * Nectar Missions Service
 * Handles time-based challenges and quests
 * @see https://docs.honeycombprotocol.com/
 */

import { Mission, MissionProgress, MissionReward } from '../../types/game';

export class NectarMissions {
  private missions: Map<string, Mission> = new Map();
  private activeMissions: Map<string, {
    playerId: string;
    missionId: string;
    startTime: number;
    endTime: number;
    progress: number;
  }[]> = new Map();
  private missionProgress: Map<string, Map<string, number>> = new Map(); // player -> {mission -> progress}

  async defineMission(mission: Mission): Promise<void> {
    this.missions.set(mission.id, mission);
  }

  async startMission(params: {
    playerId: string;
    missionId: string;
    characterId: string;
  }): Promise<{ startTime: number; endTime: number }> {
    const mission = this.missions.get(params.missionId);
    if (!mission) throw new Error('Mission not found');

    const now = Date.now();
    const missionInstance = {
      playerId: params.playerId,
      missionId: params.missionId,
      startTime: now,
      endTime: now + mission.duration,
      progress: 0
    };

    let playerMissions = this.activeMissions.get(params.playerId);
    if (!playerMissions) {
      playerMissions = [];
      this.activeMissions.set(params.playerId, playerMissions);
    }

    // Check for mission chain prerequisites
    if (mission.chainId && mission.chainStep > 1) {
      const previousStep = mission.chainStep - 1;
      const previousMission = Array.from(this.missions.values())
        .find(m => m.chainId === mission.chainId && m.chainStep === previousStep);
      
      if (previousMission) {
        const previousProgress = await this.getMissionProgress(params.playerId, previousMission.id);
        if (previousProgress < (previousMission.targetProgress || 1)) {
          throw new Error('Previous mission in chain not completed');
        }
      }
    }

    playerMissions.push(missionInstance);

    return {
      startTime: missionInstance.startTime,
      endTime: missionInstance.endTime
    };
  }

  async updateProgress(params: {
    playerId: string;
    missionId: string;
    progress: number;
  }): Promise<MissionProgress> {
    const mission = this.missions.get(params.missionId);
    if (!mission) throw new Error('Mission not found');

    let playerProgress = this.missionProgress.get(params.playerId);
    if (!playerProgress) {
      playerProgress = new Map();
      this.missionProgress.set(params.playerId, playerProgress);
    }

    const currentProgress = playerProgress.get(params.missionId) || 0;
    const newProgress = currentProgress + params.progress;
    playerProgress.set(params.missionId, newProgress);

    const activeMission = (this.activeMissions.get(params.playerId) || [])
      .find(m => m.missionId === params.missionId);

    if (activeMission) {
      activeMission.progress = newProgress;
    }

    return {
      missionId: params.missionId,
      progress: newProgress,
      targetProgress: mission.targetProgress,
      completed: newProgress >= (mission.targetProgress || 1),
      timeRemaining: activeMission ? Math.max(0, activeMission.endTime - Date.now()) : 0
    };
  }

  async claimRewards(params: {
    playerId: string;
    missionId: string;
  }): Promise<MissionReward[]> {
    const mission = this.missions.get(params.missionId);
    if (!mission) throw new Error('Mission not found');

    const progress = await this.getMissionProgress(params.playerId, params.missionId);
    if (progress < (mission.targetProgress || 1)) {
      throw new Error('Mission not completed');
    }

    const activeMission = (this.activeMissions.get(params.playerId) || [])
      .find(m => m.missionId === params.missionId);

    if (!activeMission) throw new Error('Mission not active');

    // Calculate time bonus
    const timeBonus = Math.max(0, (activeMission.endTime - Date.now()) / 
      (activeMission.endTime - activeMission.startTime));

    // Apply bonus to rewards
    const rewards = mission.rewards.map(reward => ({
      ...reward,
      amount: Math.floor(reward.amount * (1 + timeBonus))
    }));

    // Remove from active missions
    const playerMissions = this.activeMissions.get(params.playerId) || [];
    const index = playerMissions.findIndex(m => m.missionId === params.missionId);
    if (index !== -1) {
      playerMissions.splice(index, 1);
    }

    // Unlock next mission in chain if exists
    if (mission.chainId && mission.chainStep) {
      const nextMission = Array.from(this.missions.values())
        .find(m => m.chainId === mission.chainId && m.chainStep === mission.chainStep + 1);
      
      if (nextMission) {
        nextMission.status = "AVAILABLE";
      }
    }

    return rewards;
  }

  async getActiveMissions(playerId: string): Promise<{
    missionId: string;
    progress: number;
    timeRemaining: number;
  }[]> {
    const missions = this.activeMissions.get(playerId) || [];
    return missions.map(m => ({
      missionId: m.missionId,
      progress: m.progress,
      timeRemaining: Math.max(0, m.endTime - Date.now())
    }));
  }

  async getMissionProgress(playerId: string, missionId: string): Promise<number> {
    const progress = this.missionProgress.get(playerId);
    if (!progress) return 0;
    return progress.get(missionId) || 0;
  }
}
