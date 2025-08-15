export enum TraitType {
  COMBAT = "COMBAT",
  HARVESTING = "HARVESTING",
  EXPLORATION = "EXPLORATION",
  RESEARCH = "RESEARCH"
}

export interface Character {
  id: string;
  name: string;
  publicKey: string;
  faction: string;
  level: number;
  experience: number;
  resources: Record<string, number>;
  traits: Array<{
    type: TraitType;
    level?: number;
    experience?: number;
  }>;
  position: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  requiredLevel?: number;
  status: "AVAILABLE" | "LOCKED" | "COMPLETED";
  rewards: Array<{
    type: string;
    amount: number;
    traitType?: TraitType;
    name?: string;
  }>;
  targetProgress: number;
  chain?: string;
  chainStep?: number;
}

export interface Resource {
  type: string;
  amount: number;
}