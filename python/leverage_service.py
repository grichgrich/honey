import asyncio
import json
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from dotenv import load_dotenv
import os
import time
import logging
import random
from typing import Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("leverage_service")

# Reduce uvicorn access log noise
uvicorn_access = logging.getLogger("uvicorn.access")
uvicorn_access.setLevel(logging.WARNING)

load_dotenv()
app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5002",
    "ws://localhost:8000",
    "ws://localhost:5001",
    "*"  # For development only - remove in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Leverage Service is running"}

@app.get("/")
async def root():
    return {"message": "Honey Comb Protocol Leverage Service", "status": "active"}

RESOURCE_TYPES = ["energy", "minerals", "crystals", "gas"]
TERRITORY_NAMES = [
    "Alpha Sector", "Beta Quadrant", "Gamma Zone", "Delta Region",
    "Epsilon Field", "Zeta Plains", "Eta Valley", "Theta Mountains"
]

class GameState(BaseModel):
    player: dict = {}
    factions: list = []
    territories: list = []
    missions: list = []
    leverageAnalysis: dict = None
    defenseStats: dict = None
    combatLog: list = []
    achievements: list = []
    research: dict = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[WebSocket, dict] = {}  # WebSocket -> connection info
        self.connection_count = 0
        self.characters: Dict[str, dict] = {}
        self.territories: List[dict] = self._generate_territories()
        self.resources: Dict[str, List[dict]] = {}
        self.missions: Dict[str, List[dict]] = {}
        self.leverage_data: Dict[str, dict] = {}
        self.defense_data: Dict[str, dict] = {}
        self.combat_logs: Dict[str, List[dict]] = {}
        self.achievements: Dict[str, List[dict]] = {}
        # Rate limiting for game state updates
        self.last_game_state_send = {}  # Track last send time per wallet
        self.game_state_throttle_seconds = 300.0  # Minimum 5 minutes between sends - EMERGENCY MODE
        self.research_data: Dict[str, dict] = {}
        self.ping_interval = 45  # seconds
        self.ping_timeout = 15  # seconds
        # Simple disk persistence path
        self._persist_path = os.path.join(os.path.dirname(__file__), 'server_state.json')

        # Universe state (galaxy -> systems -> planets)
        self.universe = self._generate_universe()
        self._init_bots()
        # Attempt to load persisted state (optional)
        try:
            self._load_state()
        except Exception:
            pass
        self.active_battles: Dict[str, asyncio.Task] = {}
        
        # Initialize research tree
        self.research_tree = {
            "resource_efficiency": {
                "levels": 5,
                "cost": lambda level: 100 * (level + 1) ** 2,
                "bonus": lambda level: 0.1 * (level + 1)
            },
            "defense_systems": {
                "levels": 5,
                "cost": lambda level: 150 * (level + 1) ** 2,
                "bonus": lambda level: 0.15 * (level + 1)
            },
            "energy_manipulation": {
                "levels": 5,
                "cost": lambda level: 200 * (level + 1) ** 2,
                "bonus": lambda level: 0.2 * (level + 1)
            },
            "territory_control": {
                "levels": 5,
                "cost": lambda level: 250 * (level + 1) ** 2,
                "bonus": lambda level: 0.25 * (level + 1)
            }
        }
        
        # Initialize achievement system
        self.achievement_types = {
            "resource_master": {
                "levels": [1000, 5000, 10000, 50000, 100000],
                "description": "Total resources harvested"
            },
            "territory_expander": {
                "levels": [1, 3, 5, 10, 15],
                "description": "Territories controlled simultaneously"
            },
            "combat_expert": {
                "levels": [10, 50, 100, 500, 1000],
                "description": "Enemies defeated"
            },
            "mission_specialist": {
                "levels": [10, 50, 100, 500, 1000],
                "description": "Missions completed"
            }
        }

    async def _emit_leverage_changed(self, websocket: WebSocket, wallet: str) -> None:
        try:
            data = self.calculate_leverage_multiplier(wallet)
            await websocket.send_json({
                "type": "leverage_changed",
                "payload": data
            })
        except Exception as _:
            pass

    def _save_state(self) -> None:
        try:
            data = {
                'universe': self.universe,
                'characters': self.characters,
                'territories': self.territories,
                'missions': self.missions,
                'leverage_data': self.leverage_data,
            }
            with open(self._persist_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
        except Exception as e:
            logger.debug(f"Persistence save failed: {e}")

    def _load_state(self) -> bool:
        try:
            if not os.path.exists(self._persist_path):
                return False
            with open(self._persist_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.universe = data.get('universe', self.universe)
            self.characters.update(data.get('characters', {}))
            self.territories = data.get('territories', self.territories)
            self.missions.update(data.get('missions', {}))
            self.leverage_data.update(data.get('leverage_data', {}))
            return True
        except Exception as e:
            logger.debug(f"Persistence load failed: {e}")
            return False

    def _find_planet(self, planet_id: str) -> dict | None:
        try:
            for g in self.universe["galaxies"]:
                for s in g["systems"]:
                    for p in s["planets"]:
                        if p.get("id") == planet_id:
                            return p
        except Exception:
            return None
        return None

    def _ensure_player_home_planet(self, wallet: str) -> None:
        """Ensure the player owns at least one planet in the universe and mirror it to territories."""
        try:
            # Check if player already owns a planet
            for g in self.universe["galaxies"]:
                for s in g["systems"]:
                    if any(p.get("controlledBy") == wallet for p in s["planets"]):
                        return
            # Assign first unclaimed planet as home
            for g in self.universe["galaxies"]:
                for s in g["systems"]:
                    for p in s["planets"]:
                        if not p.get("controlledBy"):
                            p["controlledBy"] = wallet
                            p["defense"] = max(3, int(p.get("defense") or 0))
                            # Mirror into territories
                            exists = next((t for t in self.territories if t.get("id") == p["id"]), None)
                            if exists:
                                exists["controlledBy"] = wallet
                            else:
                                self.territories.append({
                                    "id": p["id"],
                                    "name": p.get("name", p["id"]),
                                    "controlledBy": wallet,
                                    "resources": p.get("resources", []),
                                    "position": p.get("position", {"x": 0, "y": 0, "z": 0})
                                })
                            return
        except Exception as _:
            return

    def _generate_territories(self) -> List[dict]:
        territories = []
        for i, name in enumerate(TERRITORY_NAMES):
            resources = []
            for _ in range(random.randint(1, 3)):
                resources.append({
                    "type": random.choice(RESOURCE_TYPES),
                    "amount": random.randint(100, 1000)
                })
            
            territories.append({
                "id": f"territory-{i}",
                "name": name,
                "controlledBy": None,
                "resources": resources,
                "position": {
                    "x": random.uniform(-20, 20),
                    "y": random.uniform(-20, 20),
                    "z": random.uniform(-20, 20)
                }
            })
        return territories

    def _generate_universe(self) -> dict:
        # Single galaxy with a few systems, each system with a sun and planets
        systems = []
        num_systems = 3
        for s in range(num_systems):
            sys_id = f"system-{s}"
            sun_color = random.choice(["#ffff66", "#66aaff", "#ff8866"])  # yellow, blue, orange
            system_pos = {
                "x": random.uniform(-40, 40),
                "y": random.uniform(-10, 10),
                "z": random.uniform(-40, 40)
            }
            planets = []
            planet_count = random.randint(4, 6)
            for p in range(planet_count):
                orbit_radius = 2.5 + p * 1.5 + random.uniform(-0.2, 0.4)
                angle = random.uniform(0, 2 * np.pi)
                px = system_pos["x"] + np.cos(angle) * orbit_radius
                pz = system_pos["z"] + np.sin(angle) * orbit_radius
                py = system_pos["y"] + random.uniform(-0.5, 0.5)
                resources = []
                for _ in range(random.randint(1, 3)):
                    resources.append({
                        "type": random.choice(RESOURCE_TYPES),
                        "amount": random.randint(80, 600)
                    })
                planets.append({
                    "id": f"planet-{sys_id}-{p}",
                    "name": f"P{p+1} of {sys_id.upper()}",
                    "controlledBy": None,
                    "defense": random.randint(0, 4),
                    "population": random.randint(20, 100),
                    "resources": resources,
                    "systemId": sys_id,
                    "position": {"x": px, "y": py, "z": pz},
                    "orbit": {"radius": orbit_radius, "angle": angle}
                })
            systems.append({
                "id": sys_id,
                "position": system_pos,
                "sun": {"color": sun_color, "intensity": round(random.uniform(0.8, 1.6), 2)},
                "planets": planets
            })

        galaxy = {"id": "galaxy-0", "systems": systems}
        return {"galaxies": [galaxy]}

    def _init_bots(self) -> None:
        # Create a couple of AI factions and assign random planets
        self.bots: List[str] = []
        for i in range(2):
            wallet = f"bot_{i+1}"
            self.bots.append(wallet)
            self.characters[wallet] = {
                "name": f"AI Swarm {i+1}",
                "faction": "Eufloria Swarm",
                "level": 1,
                "experience": 0,
                "resources": {rt: 0 for rt in RESOURCE_TYPES}
            }
        # Assign a few planets to bots
        all_planets = [p for g in self.universe["galaxies"] for s in g["systems"] for p in s["planets"]]
        random.shuffle(all_planets)
        for idx, planet in enumerate(all_planets[:min(4, len(all_planets))]):
            bot_wallet = self.bots[idx % len(self.bots)]
            planet["controlledBy"] = bot_wallet
        # Also mirror planets into the flat territories list for compatibility
        for g in self.universe["galaxies"]:
            for s in g["systems"]:
                for p in s["planets"]:
                    # If not already present, add/update in territories
                    exists = next((t for t in self.territories if t.get("id") == p["id"]), None)
                    if exists:
                        exists.update({
                            "controlledBy": p["controlledBy"],
                            "resources": p.get("resources", []),
                            "position": p.get("position", exists.get("position"))
                        })
                    else:
                        self.territories.append({
                            "id": p["id"],
                            "name": p["name"],
                            "controlledBy": p["controlledBy"],
                            "resources": p.get("resources", []),
                            "position": p.get("position", {"x": 0, "y": 0, "z": 0})
                        })

    async def get_world(self, websocket: WebSocket, message: dict) -> None:
        try:
            wallet = self.active_connections[websocket]["client_id"]
            # Guarantee the player has a home planet before sending world
            self._ensure_player_home_planet(wallet)
            # For now, return full universe snapshot
            await websocket.send_json({
                "type": "world_state",
                "payload": self.universe
            })
            # Also send current game state
            await self.send_game_state(websocket, wallet)
        except Exception as e:
            logger.error(f"Error sending world state: {e}")
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def explore_system(self, websocket: WebSocket, message: dict) -> None:
        try:
            system_id = message.get("system_id")
            for g in self.universe["galaxies"]:
                for s in g["systems"]:
                    if s["id"] == system_id:
                        await websocket.send_json({"type": "explore_result", "payload": s})
                        return
            raise ValueError("System not found")
        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def move_units(self, websocket: WebSocket, message: dict) -> None:
        try:
            wallet = self.active_connections[websocket]["client_id"]
            source_id = message.get("from_id")
            target_id = message.get("to_id")
            amount = int(message.get("amount", 10))
            # Lookup positions
            def find_planet(pid: str):
                for g in self.universe["galaxies"]:
                    for s in g["systems"]:
                        for p in s["planets"]:
                            if p["id"] == pid:
                                return p
                return None
            sp = find_planet(source_id)
            tp = find_planet(target_id)
            if not sp or not tp:
                raise ValueError("Invalid source or target planet")
            await websocket.send_json({
                "type": "units_moved",
                "payload": {
                    "from_id": source_id,
                    "to_id": target_id,
                    "amount": amount,
                    "from_position": sp["position"],
                    "to_position": tp["position"],
                    "eta_ms": 12000,
                    "owner": wallet
                }
            })
        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def harvest_planet(self, websocket: WebSocket, message: dict) -> None:
        """Harvest resources from a specific planet the player controls."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            planet_id = message.get("planet_id")
            planet = self._find_planet(planet_id)
            if not planet:
                raise ValueError("Planet not found")
            if planet.get("controlledBy") != wallet:
                raise ValueError("You do not control this planet")

            # Calculate harvest using leverage
            mult_data = self.calculate_leverage_multiplier(wallet)
            total_mult = mult_data["total"] if isinstance(mult_data, dict) else 1.0
            gain_energy = int(random.randint(8, 18) * total_mult)
            gain_minerals = int(random.randint(5, 12) * total_mult)

            # Update character resources
            self.characters[wallet]["resources"]["energy"] += gain_energy
            self.characters[wallet]["resources"]["minerals"] += gain_minerals

            await websocket.send_json({
                "type": "harvest_planet_result",
                "payload": {
                    "planet_id": planet_id,
                    "energy": gain_energy,
                    "minerals": gain_minerals,
                    "message": f"Harvested {gain_energy} energy and {gain_minerals} minerals from {planet.get('name', planet_id)}"
                }
            })

            # Send updated game state
            await self.send_game_state(websocket, wallet)
            # Leverage may change due to resource diversity; notify
            await self._emit_leverage_changed(websocket, wallet)
            self._save_state()
        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def build_satellite(self, websocket: WebSocket, message: dict) -> None:
        """Spend minerals to increase a planet's defense if owned by the player."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            planet_id = message.get("planet_id")
            cost = int(message.get("cost", 25))
            planet = self._find_planet(planet_id)
            if not planet:
                raise ValueError("Planet not found")
            if planet.get("controlledBy") != wallet:
                raise ValueError("You do not control this planet")
            if self.characters[wallet]["resources"]["minerals"] < cost:
                raise ValueError("Not enough minerals")

            self.characters[wallet]["resources"]["minerals"] -= cost
            planet["defense"] = int(planet.get("defense", 0)) + 1

            # Mirror into territories if exists
            for t in self.territories:
                if t.get("id") == planet_id:
                    t["defense"] = planet["defense"]
                    break

            await websocket.send_json({
                "type": "planet_updated",
                "payload": {
                    "planet_id": planet_id,
                    "defense": planet["defense"],
                    "owner": planet.get("controlledBy"),
                    "position": planet.get("position"),
                    "message": "Defense increased via satellite deployment"
                }
            })

            await self.send_game_state(websocket, wallet)
            # Satellites don't change leverage directly; skip emit
            self._save_state()
        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def deploy_research(self, websocket: WebSocket, message: dict) -> None:
        """Spend energy to apply a temporary/global research boost, with 60s expiry for temp buffs."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            tech = message.get("tech", "attack_boost")
            cost = int(message.get("cost", 20))
            if self.characters[wallet]["resources"]["energy"] < cost:
                raise ValueError("Not enough energy")

            self.characters[wallet]["resources"]["energy"] -= cost
            if "research" not in self.leverage_data[wallet]:
                self.leverage_data[wallet]["research"] = {}
            # persistent research
            self.leverage_data[wallet]["research"][tech] = self.leverage_data[wallet]["research"].get(tech, 0) + 0.05
            # temp buff
            now_ts = int(time.time())
            tbuffs = self.leverage_data[wallet].get('temp_buffs', {})
            level = float(tbuffs.get(tech, {}).get('level', 0.0)) + 0.05
            tbuffs[tech] = { 'level': level, 'expires_at': now_ts + 60 }
            self.leverage_data[wallet]['temp_buffs'] = tbuffs

            await websocket.send_json({
                "type": "research_result",
                "payload": {
                    "tech": tech,
                    "level": self.leverage_data[wallet]["research"][tech],
                    "bonus": self.leverage_data[wallet]["research"][tech],
                    "temp_level": level,
                    "message": f"Research deployed: {tech} now {self.leverage_data[wallet]['research'][tech]:.2f}"
                }
            })

            await self.send_game_state(websocket, wallet)
            await self._emit_leverage_changed(websocket, wallet)
            self._save_state()
        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def attack_planet(self, websocket: WebSocket, message: dict) -> None:
        try:
            wallet = self.active_connections[websocket]["client_id"]
            source_id = message.get("from_id")
            target_id = message.get("planet_id")
            amount = int(message.get("amount", 20))

            # Find planets
            source = None
            target = None
            for g in self.universe["galaxies"]:
                for s in g["systems"]:
                    for p in s["planets"]:
                        if p["id"] == source_id:
                            source = p
                        if p["id"] == target_id:
                            target = p
            
            if not source or not target:
                raise ValueError("Source or target planet not found")

            # Instead of instant resolution, start a battle simulation
            if target_id in self.active_battles and not self.active_battles[target_id].done():
                await websocket.send_json({"type": "error", "payload": "Battle already in progress at this planet."})
                return

            battle_task = asyncio.create_task(self._simulate_battle(websocket, wallet, source, target, amount, [source_id]))
            self.active_battles[target_id] = battle_task

        except Exception as e:
            await websocket.send_json({"type": "error", "payload": str(e)})

    async def _simulate_battle(self, websocket: WebSocket, attacker_wallet: str, source: dict, target: dict, attacker_count: int, source_ids: list = None):
        target_id = target["id"]
        try:
            defender_wallet = target.get("controlledBy")
            defender_count = target.get("defense", 0) * 40
            
            # Store initial values for battle report
            initial_attackers = attacker_count
            initial_defenders = defender_count
            initial_defense = target.get("defense", 0)
            source_ids = source_ids or [source.get("id")]

            await websocket.send_json({
                "type": "battle_started",
                "payload": {
                    "from_id": source["id"],
                    "to_id": target_id,
                    "from_position": source["position"],
                    "to_position": target["position"],
                    "attackers": {"owner": attacker_wallet, "count": attacker_count},
                    "defenders": {"owner": defender_wallet, "count": defender_count},
                    "message": f"Attack on {target.get('name')} has begun!"
                }
            })

            # Apply leverage scaling to attacker strength and attrition bias
            a_total = 1.0  # Default leverage
            try:
                a_mult = self.calculate_leverage_multiplier(attacker_wallet)
                a_total = a_mult["total"] if isinstance(a_mult, dict) else 1.0
            except Exception:
                pass

            # Calculate true combat power
            effective_attack_power = attacker_count * a_total
            effective_defense_power = defender_count
            
            # Simple power ratio determines outcome
            power_ratio = effective_attack_power / max(1, effective_defense_power)
            
            # Much more deterministic outcome based on power advantage
            if power_ratio >= 2.0:
                # Overwhelming attack - guaranteed victory
                success = True
                attacker_survivors = max(1, int(attacker_count * 0.7))  # 70% survive
                defender_survivors = 0
            elif power_ratio >= 1.5:
                # Strong attack - likely victory
                success = random.random() < 0.85  # 85% chance
                attacker_survivors = max(1, int(attacker_count * 0.5)) if success else max(0, int(attacker_count * 0.2))
                defender_survivors = 0 if success else max(1, int(defender_count * 0.6))
            elif power_ratio >= 1.0:
                # Even match - 50/50 with small defender advantage
                success = random.random() < 0.45  # 45% attacker wins
                attacker_survivors = max(1, int(attacker_count * 0.3)) if success else max(0, int(attacker_count * 0.1))
                defender_survivors = 0 if success else max(1, int(defender_count * 0.4))
            else:
                # Weak attack - defenders likely win
                success = random.random() < 0.15  # 15% chance
                attacker_survivors = max(1, int(attacker_count * 0.2)) if success else 0
                defender_survivors = 0 if success else max(1, int(defender_count * 0.8))

            # Simulate battle duration for visual effect
            duration = min(5, max(2, int(10 * (1 / max(0.1, power_ratio)))))  # Shorter battles for overwhelming force
            for i in range(duration):
                await asyncio.sleep(0.5)  # Faster simulation
                
                # Gradually reduce counts toward final result
                progress = (i + 1) / duration
                current_attackers = int(attacker_count * (1 - progress) + attacker_survivors * progress)
                current_defenders = int(defender_count * (1 - progress) + defender_survivors * progress)

                await websocket.send_json({
                    "type": "battle_update",
                    "payload": {
                        "planet_id": target_id,
                        "attackers": {"owner": attacker_wallet, "count": current_attackers},
                        "defenders": {"owner": defender_wallet, "count": current_defenders}
                    }
                })

            # Set final counts
            attacker_count = attacker_survivors
            defender_count = defender_survivors
            final_owner = target.get("controlledBy")  # Keep original owner by default
            final_defense = target.get("defense", 1)
            
            if success:
                # Attack succeeded - change ownership
                final_owner = attacker_wallet
                target["controlledBy"] = attacker_wallet
                # Update defense to reflect remaining attackers
                final_defense = max(1, int(attacker_count / 20))
                target["defense"] = final_defense
                for t in self.territories:
                    if t.get("id") == target_id:
                        t["controlledBy"] = attacker_wallet
                        t["defense"] = final_defense
                        break
            else:
                # Defense held - keep original owner, reduce defense slightly
                final_defense = max(1, target.get("defense", 1) - 1)
                target["defense"] = final_defense
                for t in self.territories:
                    if t.get("id") == target_id:
                        t["defense"] = final_defense
                        break
            
            # Debug log the values before sending
            attack_power_val = int(a_total * 100)
            defense_power_val = initial_defense
            
            logger.info(f"🎯 Battle complete - Success: {success}, Attack Power: {attack_power_val}, Defense Power: {defense_power_val}")
            
            await websocket.send_json({
                "type": "attack_result",
                "payload": {
                    "planet_id": target_id,
                    "success": success,
                    "new_owner": final_owner if success else None,  # Only send new owner if attack succeeded
                    "current_owner": final_owner,  # Always send current owner
                    "defense": final_defense,
                    "position": target.get("position"),
                    "attack_power": attack_power_val,
                    "defense_power": defense_power_val,
                    "leverage_used": a_total,
                    "attacking_units": initial_attackers,
                    "defending_units": initial_defenders,
                    "source_planets": source_ids,  # Add source planet info
                    "attacker_id": attacker_wallet,
                    "defender_id": defender_wallet,
                    "battle_duration": duration,
                    "final_attacker_count": attacker_count,
                    "final_defender_count": defender_count,
                    "message": f"{'🏆 Victory!' if success else '🛡️ Defense Held'} {target.get('name', target_id)} battle completed"
                }
            })
            await self.send_game_state(websocket, attacker_wallet)
            # Also persist world changes
            try: self._save_state()
            except Exception: pass
        except Exception as e:
            logger.error(f"Error in battle simulation for {target_id}: {e}")
        finally:
            if target_id in self.active_battles:
                del self.active_battles[target_id]

    def _generate_missions(self, character_level: int) -> List[dict]:
        missions = []
        mission_types = {
            "Explore territory": {
                "descriptions": [
                    "Scout the outer reaches of {territory} for valuable resources",
                    "Map uncharted regions of {territory} for strategic advantage",
                    "Investigate anomalous energy signatures in {territory}"
                ],
                "reward_types": ["energy", "minerals"],
                "base_reward": 150,
                "progress_rate": 1.2
            },
            "Gather resources": {
                "descriptions": [
                    "Extract vital {resource} deposits from {territory}",
                    "Harvest rare {resource} from unstable formations in {territory}",
                    "Collect valuable {resource} from deep within {territory}"
                ],
                "reward_types": ["crystals", "gas"],
                "base_reward": 100,
                "progress_rate": 1.0
            },
            "Defend position": {
                "descriptions": [
                    "Protect {territory} mining operations from raiders",
                    "Secure strategic resource points in {territory}",
                    "Guard {territory} supply lines from hostile forces"
                ],
                "reward_types": ["energy", "minerals"],
                "base_reward": 200,
                "progress_rate": 0.8
            },
            "Research technology": {
                "descriptions": [
                    "Study advanced {resource} extraction methods",
                    "Analyze alien technology artifacts found in {territory}",
                    "Develop improved {resource} conversion systems"
                ],
                "reward_types": ["crystals", "gas"],
                "base_reward": 250,
                "progress_rate": 0.6
            }
        }
        
        for i in range(3):  # Generate 3 missions
            mission_type = random.choice(list(mission_types.keys()))
            mission_info = mission_types[mission_type]
            territory = random.choice(TERRITORY_NAMES)
            reward_type = random.choice(mission_info["reward_types"])
            
            # Calculate reward with level scaling and random variation
            base_reward = mission_info["base_reward"]
            level_multiplier = 1 + (character_level - 1) * 0.5
            variation = random.uniform(0.8, 1.2)
            reward_amount = int(base_reward * level_multiplier * variation)
            
            # Format description with random territory and resource
            description = random.choice(mission_info["descriptions"]).format(
                territory=territory,
                resource=reward_type.title()
            )
            
            missions.append({
                "id": f"mission-{int(time.time())}-{i}",
                "title": f"Level {character_level} {mission_type}",
                "description": description,
                "type": mission_type,
                "territory": territory,
                "reward": {
                    "type": reward_type,
                    "amount": reward_amount
                },
                "progress": 0,
                "progress_rate": mission_info["progress_rate"],
                "time_started": None,
                "bonus_conditions": {
                    "territory_control": random.randint(1, 3),
                    "resource_threshold": reward_amount * 2
                }
            })
        return missions

    async def connect(self, websocket: WebSocket):
        try:
            # Get client ID and check for existing connections
            client_id = f"{websocket.client.host}:{websocket.client.port}"
            
            # Find existing connections from this client
            existing_connections = [ws for ws in self.active_connections.keys() 
                                 if self.active_connections[ws].get("client_id") == client_id]
            
            # Close existing connections
            for existing_ws in existing_connections:
                if existing_ws != websocket:  # Don't close the new connection
                    logger.info(f"Closing existing connection from {client_id}")
                    await self.disconnect(existing_ws)
            
            # If this websocket is already connected, don't reconnect
            if websocket in self.active_connections:
                if self.active_connections[websocket].get("is_connected"):
                    logger.info(f"Connection {client_id} already active")
                    return True
                else:
                    await self.disconnect(websocket)
            
            # Accept new connection with a small delay to prevent rapid reconnects
            await asyncio.sleep(0.1)
            await websocket.accept()
            
            # Initialize connection state
            self.active_connections[websocket] = {
                "is_connected": True,
                "last_ping": time.time(),
                "last_pong": time.time(),
                "client_id": client_id,
                "connect_time": time.time()
            }
            self.connection_count += 1
            logger.info(f"WebSocket connected (total: {self.connection_count})")
            
            # Start ping/pong cycle in a separate task
            keep_alive_task = asyncio.create_task(self._keep_alive(websocket))
            self.active_connections[websocket]["keep_alive_task"] = keep_alive_task
            
            # Send initial connection confirmation
            if self.active_connections.get(websocket, {}).get("is_connected"):
                await websocket.send_json({
                    "type": "connection_status",
                    "payload": {"status": "connected", "client_id": client_id}
                })
                
            # Auto-create character if it doesn't exist
            if client_id not in self.characters:
                logger.info(f"🎮 Auto-creating character for {client_id}")
                default_character = {
                    "name": f"Commander {len(self.characters) + 1}",
                    "level": 1,
                    "faction": "United Earth Forces",
                    "experience": 0,
                    "resources": {
                        "energy": 1000,
                        "minerals": 500,
                        "crystals": 250,
                        "gas": 100
                    }
                }
                
                # Create character and initialize data
                self.characters[client_id] = default_character
                self.missions[client_id] = self._generate_missions(1)
                self.leverage_data[client_id] = {
                    "territory_bonus": 0.0,
                    "resource_bonus": 0.0,
                    "mission_bonus": 0.0,
                    "level_bonus": 0.0,
                    "research": {}
                }
                
                # Give new players starter territories
                starter_territories = [
                    {
                        "id": f"territory-starter-alpha-{client_id}",
                        "name": "Alpha Outpost",
                        "controlled": True,
                        "defense": 1,
                        "position": {"x": 0, "y": 0, "z": 0},
                        "resources": [
                            {"type": "energy", "amount": 50, "max_capacity": 200},
                            {"type": "minerals", "amount": 25, "max_capacity": 100}
                        ]
                    },
                    {
                        "id": f"territory-starter-beta-{client_id}",
                        "name": "Beta Research Station",
                        "controlled": True,
                        "defense": 1,
                        "position": {"x": 5, "y": 2, "z": -3},
                        "resources": [
                            {"type": "crystals", "amount": 10, "max_capacity": 50},
                            {"type": "energy", "amount": 30, "max_capacity": 150}
                        ]
                    }
                ]
                
                # Add starter territories to the global territories list
                for territory in starter_territories:
                    territory["controlledBy"] = client_id
                    self.territories.append(territory)

                # Ensure player owns a home planet in the universe
                self._ensure_player_home_planet(client_id)

                # Send initial game state
                logger.info(f"🚀 Sending initial game state to {client_id}")
                await self.send_game_state(websocket, client_id)
                logger.info(f"✅ Character creation and setup complete for {client_id}")
            
            return True
            
        except WebSocketDisconnect:
            client_id = f"{websocket.client.host}:{websocket.client.port}"
            logger.warning(f"Client {client_id} disconnected during connection setup. This is often normal in dev environments.")
            await self.disconnect(websocket)
            return False
        except Exception as e:
            logger.error(f"❌ Error in connect: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            await self.disconnect(websocket)
            return False

    async def _keep_alive(self, websocket: WebSocket):
        """Keep the connection alive with ping/pong messages."""
        try:
            while self.active_connections.get(websocket, {}).get("is_connected"):
                await asyncio.sleep(self.ping_interval)
                try:
                    if not self.active_connections.get(websocket, {}).get("is_connected"):
                        break
                        
                    # Send ping
                    self.active_connections[websocket]["last_ping"] = time.time()
                    await websocket.send_json({"type": "ping"})
                    
                    # Wait for pong
                    await asyncio.sleep(self.ping_timeout)
                    
                    # Check if pong was received
                    if (time.time() - self.active_connections[websocket]["last_pong"]) > self.ping_timeout:
                        logger.warning(f"Ping timeout for websocket")
                        await self.disconnect(websocket)
                        break
                        
                except Exception as e:
                    logger.error(f"Error in keep_alive: {e}")
                    await self.disconnect(websocket)
                    break
        except Exception as e:
            logger.error(f"Error in keep_alive loop: {e}")
            await self.disconnect(websocket)

    async def disconnect(self, websocket: WebSocket):
        try:
            if websocket in self.active_connections:
                # Cancel keep-alive task if it exists
                keep_alive_task = self.active_connections[websocket].get("keep_alive_task")
                if keep_alive_task:
                    try:
                        keep_alive_task.cancel()
                        await keep_alive_task
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(f"Error cancelling keep-alive task: {e}")
                
                # Mark as disconnected and update count
                self.active_connections[websocket]["is_connected"] = False
                self.connection_count = max(0, self.connection_count - 1)
                client_id = self.active_connections[websocket].get("client_id", "unknown")
                logger.info(f"WebSocket disconnected - Client: {client_id} (remaining: {self.connection_count})")
                
                # Close the connection
                try:
                    await websocket.close(code=1000, reason="Normal closure")
                except Exception as e:
                    logger.debug(f"Error closing websocket: {e}")  # Likely already closed
                
                # Remove from active connections
                del self.active_connections[websocket]
                
        except Exception as e:
            logger.error(f"Error in disconnect: {e}")
            try:
                await websocket.close(code=1000, reason="Server error")
            except:
                pass  # Already closed

    async def create_character(self, websocket: WebSocket, data: dict) -> None:
        try:
            character = data["payload"]
            wallet = character["wallet"]
            
            if wallet in self.characters:
                await websocket.send_json({
                    "type": "error",
                    "payload": "Character already exists for this wallet"
                })
                return

            # Initialize character data
            self.characters[wallet] = {
                "name": character["name"],
                "faction": character["faction"],
                "level": character["level"],
                "experience": 0,
                "resources": {rt: 0 for rt in RESOURCE_TYPES}
            }

            # Generate initial missions
            self.missions[wallet] = self._generate_missions(character["level"])

            # Initialize leverage multiplier
            self.leverage_data[wallet] = {
                "multiplier": 1.2,
                "base_rate": 1.2,
                "territory_bonus": 0,
                "mission_bonus": 0,
                "level_bonus": 0
            }

            # Send initial game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Character created for wallet {wallet}")

        except Exception as e:
            logger.error(f"Error creating character: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def claim_territory(self, websocket: WebSocket, data: dict) -> None:
        try:
            wallet = data["payload"]["wallet"]
            territory_id = data["payload"]["territoryId"]
            
            if wallet not in self.characters:
                raise ValueError("Character not found")

            territory = next((t for t in self.territories if t["id"] == territory_id), None)
            if not territory:
                raise ValueError("Territory not found")

            if territory["controlledBy"]:
                raise ValueError("Territory already controlled")

            # Claim territory
            territory["controlledBy"] = wallet

            # Update leverage multiplier
            controlled_territories = len([t for t in self.territories if t["controlledBy"] == wallet])
            self.leverage_data[wallet]["territory_bonus"] = controlled_territories * 0.05

            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Territory {territory_id} claimed by {wallet}")

        except Exception as e:
            logger.error(f"Error claiming territory: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def harvest_resource(self, websocket: WebSocket, data: dict) -> None:
        try:
            wallet = data["payload"]["wallet"]
            territory_id = data["payload"]["territoryId"]
            
            if wallet not in self.characters:
                raise ValueError("Character not found")

            territory = next((t for t in self.territories if t["id"] == territory_id), None)
            if not territory:
                raise ValueError("Territory not found")

            if territory["controlledBy"] != wallet:
                raise ValueError("Territory not controlled by player")

            # Calculate harvest amount with leverage multiplier
            multiplier = self.calculate_leverage_multiplier(wallet)
            harvest_results = []
            total_value = 0
            
            for resource in territory["resources"]:
                base_amount = random.randint(10, 30)
                bonus_amount = int(base_amount * (multiplier - 1))
                total_amount = base_amount + bonus_amount
                
                self.characters[wallet]["resources"][resource["type"]] += total_amount
                total_value += total_amount
                
                harvest_results.append({
                    "type": resource["type"],
                    "base_amount": base_amount,
                    "bonus_amount": bonus_amount,
                    "total_amount": total_amount
                })

            # Update mission progress based on mission type and conditions
            mission_updates = []
            for mission in self.missions[wallet]:
                if mission["progress"] > 0 and mission["progress"] < 100:
                    original_progress = mission["progress"]
                    progress_increase = 0
                    
                    if mission["type"] == "Gather resources":
                        # More progress if harvesting the mission's target resource
                        if mission["reward"]["type"] in [r["type"] for r in territory["resources"]]:
                            progress_increase = random.randint(20, 35)
                        else:
                            progress_increase = random.randint(10, 20)
                            
                    elif mission["type"] == "Explore territory":
                        # More progress if exploring the mission's target territory
                        if mission["territory"] == territory["name"]:
                            progress_increase = random.randint(25, 40)
                        else:
                            progress_increase = random.randint(15, 25)
                            
                    elif mission["type"] == "Defend position":
                        # Progress based on successful resource collection
                        if territory["controlledBy"] == wallet:
                            progress_increase = random.randint(15, 30)
                            
                    elif mission["type"] == "Research technology":
                        # Progress based on resource variety
                        unique_resources = len(set(r["type"] for r in territory["resources"]))
                        progress_increase = random.randint(5, 15) * unique_resources

                    # Apply mission's progress rate
                    progress_increase = int(progress_increase * mission["progress_rate"])
                    
                    # Check bonus conditions
                    if (len([t for t in self.territories if t["controlledBy"] == wallet]) 
                        >= mission["bonus_conditions"]["territory_control"]):
                        progress_increase = int(progress_increase * 1.5)
                        
                    total_resources = sum(self.characters[wallet]["resources"].values())
                    if total_resources >= mission["bonus_conditions"]["resource_threshold"]:
                        progress_increase = int(progress_increase * 1.3)

                    mission["progress"] = min(100, mission["progress"] + progress_increase)
                    
                    if mission["progress"] > original_progress:
                        mission_updates.append({
                            "id": mission["id"],
                            "type": mission["type"],
                            "previous_progress": original_progress,
                            "new_progress": mission["progress"],
                            "increase": progress_increase
                        })

            # Send harvest results and mission updates
            await websocket.send_json({
                "type": "harvest_result",
                "payload": {
                    "territory_id": territory_id,
                    "territory_name": territory["name"],
                    "multiplier": multiplier,
                    "resources": harvest_results,
                    "total_value": total_value,
                    "mission_updates": mission_updates
                }
            })

            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Resources harvested from {territory_id} by {wallet}")

        except Exception as e:
            logger.error(f"Error harvesting resources: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def accept_mission(self, websocket: WebSocket, data: dict) -> None:
        try:
            # Handle different data structures
            if "payload" in data:
                wallet = data["payload"].get("wallet")
                mission_id = data["payload"].get("missionId") or data["payload"].get("mission_id")
            else:
                wallet = data.get("wallet")
                mission_id = data.get("mission_id")
            
            # Get wallet from connection if not in data
            if not wallet:
                wallet = self.active_connections[websocket]["client_id"]
            
            if wallet not in self.characters:
                raise ValueError("Character not found")

            mission = next((m for m in self.missions[wallet] if m["id"] == mission_id), None)
            if not mission:
                raise ValueError("Mission not found")

            if mission["progress"] > 0:
                raise ValueError("Mission already in progress")

            # Start mission progress
            mission["progress"] = 10  # Initial progress
            mission["time_started"] = int(time.time() * 1000)  # Current time in milliseconds
            
            # Update mission bonus in leverage data
            active_missions = len([m for m in self.missions[wallet] if m["progress"] > 0])
            self.leverage_data[wallet]["mission_bonus"] = min(active_missions * 0.02, 0.2)  # Cap at 20%

            # Emit mission accepted with a suggested target (pick a controlled or first territory)
            target_territory = None
            for t in self.territories:
                if t.get("controlledBy") == wallet:
                    target_territory = t
                    break
            if not target_territory and self.territories:
                target_territory = self.territories[0]

            await websocket.send_json({
                "type": "mission_accepted",
                "payload": {
                    "mission": mission,
                    "target": {
                        "territory_id": target_territory.get("id") if target_territory else None,
                        "position": target_territory.get("position") if target_territory else None
                    }
                }
            })

            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Mission {mission_id} accepted by {wallet}")
            await self._emit_leverage_changed(websocket, wallet)

        except Exception as e:
            logger.error(f"Error accepting mission: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def complete_mission(self, websocket: WebSocket, data: dict) -> None:
        try:
            # Support both nested payload and flat structure
            if "payload" in data:
                wallet = data["payload"].get("wallet")
                mission_id = data["payload"].get("missionId") or data["payload"].get("mission_id")
            else:
                wallet = data.get("wallet")
                mission_id = data.get("mission_id")

            if not wallet:
                wallet = self.active_connections[websocket]["wallet"] if websocket in self.active_connections else None
            if not wallet:
                raise ValueError("Wallet not found for mission completion")
            
            if wallet not in self.characters:
                raise ValueError("Character not found")

            mission = next((m for m in self.missions[wallet] if m["id"] == mission_id), None)
            if not mission:
                raise ValueError("Mission not found")

            if mission["progress"] < 100:
                raise ValueError("Mission not completed")

            # Award mission rewards
            reward_type = mission["reward"]["type"]
            reward_amount = mission["reward"]["amount"]
            self.characters[wallet]["resources"][reward_type] += reward_amount

            # Update character experience and level
            self.characters[wallet]["experience"] += reward_amount
            if self.characters[wallet]["experience"] >= 1000 * self.characters[wallet]["level"]:
                self.characters[wallet]["level"] += 1
                self.characters[wallet]["experience"] = 0
                self.leverage_data[wallet]["level_bonus"] = (self.characters[wallet]["level"] - 1) * 0.1

            # Generate new mission
            self.missions[wallet].remove(mission)
            self.missions[wallet].extend(self._generate_missions(self.characters[wallet]["level"]))

            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Mission {mission_id} completed by {wallet}")
            await self._emit_leverage_changed(websocket, wallet)

        except Exception as e:
            logger.error(f"Error completing mission: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    def calculate_leverage_multiplier(self, wallet: str) -> dict:
        try:
            data = self.leverage_data[wallet]
            character = self.characters.get(wallet)
            if not character:
                return {"total": 1.0, "bonuses": {}}

            # Base rate starts at 1.0
            base_rate = 1.0
            bonuses = {}

            # Territory Control Bonus (max 30%)
            controlled_territories = [t for t in self.territories if t["controlledBy"] == wallet]
            territory_count = len(controlled_territories)
            territory_bonus = min(territory_count * 0.05, 0.3)
            data["territory_bonus"] = territory_bonus
            if territory_bonus > 0:
                bonuses["territory"] = {
                    "value": territory_bonus,
                    "description": f"Controlling {territory_count} territories",
                    "max": 0.3,
                    "progress": territory_bonus / 0.3
                }

            # Resource Diversity Bonus (max 20%)
            if character["resources"]:
                unique_resources = len([r for r, amount in character["resources"].items() if amount > 0])
                resource_bonus = min(unique_resources * 0.05, 0.2)
                data["resource_bonus"] = resource_bonus
                if resource_bonus > 0:
                    bonuses["resources"] = {
                        "value": resource_bonus,
                        "description": f"Diversified {unique_resources} resource types",
                        "max": 0.2,
                        "progress": resource_bonus / 0.2
                    }

            # Mission Completion Bonus (max 25%)
            if wallet in self.missions:
                completed_missions = len([m for m in self.missions[wallet] if m["progress"] == 100])
                active_missions = len([m for m in self.missions[wallet] if 0 < m["progress"] < 100])
                mission_bonus = min(completed_missions * 0.025 + active_missions * 0.01, 0.25)
                data["mission_bonus"] = mission_bonus
                if mission_bonus > 0:
                    bonuses["missions"] = {
                        "value": mission_bonus,
                        "description": f"{completed_missions} completed, {active_missions} active missions",
                        "max": 0.25,
                        "progress": mission_bonus / 0.25
                    }

            # Level Progression Bonus (max 25%)
            level_bonus = min((character["level"] - 1) * 0.05, 0.25)
            data["level_bonus"] = level_bonus
            if level_bonus > 0:
                bonuses["level"] = {
                    "value": level_bonus,
                    "description": f"Level {character['level']} progression",
                    "max": 0.25,
                    "progress": level_bonus / 0.25
                }

            # Special Achievements Bonus (max 20%)
            achievement_count = len(self.achievements.get(wallet, []))
            achievement_bonus = min(achievement_count * 0.02, 0.2)
            data["achievement_bonus"] = achievement_bonus
            if achievement_bonus > 0:
                bonuses["achievements"] = {
                    "value": achievement_bonus,
                    "description": f"{achievement_count} achievements unlocked",
                    "max": 0.2,
                    "progress": achievement_bonus / 0.2
                }

            # Research bonuses (persistent) (max 30%)
            research_total = 0.0
            try:
                for _, v in (data.get('research') or {}).items():
                    research_total += float(v or 0)
            except Exception:
                pass
            research_total = min(research_total, 0.3)
            if research_total > 0:
                bonuses["research"] = {
                    "value": research_total,
                    "description": "Technology advancements",
                    "max": 0.3,
                    "progress": research_total / 0.3
                }

            # Temporary buffs with expiry (max 20%)
            now_ts = int(time.time())
            temp_total = 0.0
            cleaned = {}
            for k, buff in (data.get('temp_buffs') or {}).items():
                try:
                    lvl = float(buff.get('level', 0.0))
                    exp = int(buff.get('expires_at', 0))
                    if exp > now_ts and lvl > 0:
                        temp_total += lvl
                        cleaned[k] = buff
                except Exception:
                    continue
            temp_total = min(temp_total, 0.2)
            data['temp_buffs'] = cleaned
            if temp_total > 0:
                bonuses["temp_buffs"] = {
                    "value": temp_total,
                    "description": "Recent research deployments",
                    "max": 0.2,
                    "progress": temp_total / 0.2
                }

            # Calculate total multiplier with all bonuses
            total_multiplier = base_rate + sum(bonus["value"] for bonus in bonuses.values())
            
            # Apply dynamic scaling based on game balance
            scaled_multiplier = min(max(total_multiplier, 1.0), 2.0)

            # Calculate efficiency rating (how close to maximum potential)
            max_possible = 2.0  # Maximum possible multiplier
            efficiency = (scaled_multiplier - 1.0) / (max_possible - 1.0)

            return {
                "total": scaled_multiplier,
                "base_rate": base_rate,
                "bonuses": bonuses,
                "efficiency": efficiency,
                "potential_increase": max_possible - scaled_multiplier,
                # Include temp buff details with expiry for client timers
                "temp_buffs_detail": cleaned
            }
            
        except Exception as e:
            logger.error(f"Error calculating leverage multiplier: {e}")
            return 1.0  # Default multiplier on error

    async def send_game_state(self, websocket: WebSocket, wallet: str) -> None:
        try:
            # Rate limiting - check if we need to throttle
            import time
            current_time = time.time()
            if wallet in self.last_game_state_send:
                time_since_last = current_time - self.last_game_state_send[wallet]
                if time_since_last < self.game_state_throttle_seconds:
                    logger.info(f"🔄 THROTTLING game state for {wallet} (last sent {time_since_last:.2f}s ago)")
                    return
            
            logger.info(f"📊 Preparing game state for {wallet}")
            
            if not self.active_connections.get(websocket):
                logger.warning(f"⚠️ No active connection for websocket")
                return
                
            if wallet not in self.characters:
                logger.warning(f"⚠️ Character not found for {wallet}")
                return

            character = self.characters[wallet]
            player_territories = [t for t in self.territories if t.get("controlledBy") == wallet]
            player_missions = self.missions.get(wallet, [])
            leverage_multiplier = 1.0  # Default value to avoid errors
            
            try:
                leverage_multiplier = self.calculate_leverage_multiplier(wallet)
            except Exception as leverage_error:
                logger.warning(f"⚠️ Error calculating leverage, using default: {leverage_error}")
            
            state = {
                "type": "game_state_update",
                "payload": {
                    "character": character,
                    "territories": player_territories,
                    "missions": player_missions,
                    "leverageMultiplier": leverage_multiplier
                }
            }
            
            logger.info(f"📤 Sending game state: {len(player_territories)} territories, {len(player_missions)} missions")
            
            if self.active_connections.get(websocket) and self.active_connections[websocket].get("is_connected"):
                await websocket.send_json(state)
                # Update last send time for rate limiting
                self.last_game_state_send[wallet] = current_time
                logger.info(f"✅ Game state sent successfully to {wallet}")
            else:
                logger.warning(f"⚠️ Connection not active for {wallet}")
                
        except Exception as e:
            logger.error(f"❌ Error sending game state to {wallet}: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            # Don't raise the exception - just log it and continue

    async def calculate_leverage(self, websocket: WebSocket, message: dict) -> None:
        """Handle calculate_leverage message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            leverage_data = self.calculate_leverage_multiplier(wallet)
            
            await websocket.send_json({
                "type": "leverage_calculated",
                "payload": leverage_data
            })
            logger.info(f"Leverage calculated for {wallet}")
            
        except Exception as e:
            logger.error(f"Error calculating leverage: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def auto_harvest(self, websocket: WebSocket, message: dict) -> None:
        """Handle auto_harvest message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            enabled = message.get("enabled", True)
            # Get territories for this player
            player_territories = [t for t in self.territories if t.get("controlledBy") == wallet]
            controlled_territories = [t for t in player_territories if t.get("controlled", False)]
            
            if not controlled_territories:
                raise ValueError("No territories to harvest from")
            
            total_harvested = {"energy": 0, "minerals": 0, "crystals": 0, "gas": 0}
            
            for territory in controlled_territories:
                if territory.get("resources"):
                    for resource in territory["resources"]:
                        amount = resource["amount"] * 0.1  # 10% harvest rate
                        resource_type = resource["type"].lower()
                        total_harvested[resource_type] += amount
                        self.characters[wallet]["resources"][resource_type] += amount
            
            await websocket.send_json({
                "type": "auto_harvest_result",
                "payload": {
                    "enabled": enabled,
                    "harvested": total_harvested,
                    "message": f"Auto-harvested from {len(controlled_territories)} territories"
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Auto-harvest completed for {wallet}")
            
        except Exception as e:
            logger.error(f"Error in auto harvest: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def explore_new_sectors(self, websocket: WebSocket, message: dict) -> None:
        """Handle explore_new_sectors message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            # Generate new territories to explore
            new_territories = []
            existing_count = len([t for t in self.territories if t.get("controlledBy") == wallet])
            
            for i in range(2):  # Add 2 new territories
                territory_id = f"sector-{wallet}-{existing_count + i + 1}"
                new_territory = {
                    "id": territory_id,
                    "name": f"Gamma Sector {existing_count + i + 1}",
                    "controlled": False,  # Player needs to claim them
                    "defense": 0,
                    "position": {
                        "x": random.randint(-10, 10),
                        "y": random.randint(-5, 5), 
                        "z": random.randint(-8, 8)
                    },
                    "resources": [
                        {"type": "energy", "amount": random.randint(50, 200), "max_capacity": 300},
                        {"type": "minerals", "amount": random.randint(30, 150), "max_capacity": 200}
                    ]
                }
                new_territories.append(new_territory)
            
            # Add new territories to the global territories list
            for territory in new_territories:
                territory["controlledBy"] = wallet
                self.territories.append(territory)
            
            await websocket.send_json({
                "type": "exploration_result",
                "payload": {
                    "discovered": len(new_territories),
                    "territories": new_territories,
                    "message": f"Discovered {len(new_territories)} new sectors!"
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Exploration completed for {wallet}: {len(new_territories)} new territories")
            
        except Exception as e:
            logger.error(f"Error in exploration: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def defend_all(self, websocket: WebSocket, message: dict) -> None:
        """Handle defend_all message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            controlled_territories = [t for t in self.territories if t["controlledBy"] == wallet]
            
            if not controlled_territories:
                raise ValueError("No territories to defend")
            
            # Upgrade defense for all territories
            defense_cost = 50  # Cost per territory
            total_cost = defense_cost * len(controlled_territories)
            
            if self.characters[wallet]["resources"]["energy"] < total_cost:
                raise ValueError(f"Not enough energy. Need {total_cost}, have {self.characters[wallet]['resources']['energy']}")
            
            # Deduct cost and upgrade defenses
            self.characters[wallet]["resources"]["energy"] -= total_cost
            upgraded_count = 0
            
            for territory in controlled_territories:
                if "defense" not in territory:
                    territory["defense"] = 0
                territory["defense"] += 1
                upgraded_count += 1
            
            await websocket.send_json({
                "type": "defense_result",
                "payload": {
                    "upgraded": upgraded_count,
                    "cost": total_cost,
                    "message": f"Upgraded defenses on {upgraded_count} territories"
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Defense upgrade completed for {wallet}: {upgraded_count} territories")
            
        except Exception as e:
            logger.error(f"Error in defense upgrade: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def research(self, websocket: WebSocket, message: dict) -> None:
        """Handle research message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            tech = message.get("tech", "efficiency")
            research_cost = 100
            
            if self.characters[wallet]["resources"]["crystals"] < research_cost:
                raise ValueError(f"Not enough crystals. Need {research_cost}, have {self.characters[wallet]['resources']['crystals']}")
            
            # Deduct cost and apply research bonus
            self.characters[wallet]["resources"]["crystals"] -= research_cost
            
            # Initialize research bonuses if not exists
            if "research" not in self.leverage_data[wallet]:
                self.leverage_data[wallet]["research"] = {}
            
            if tech not in self.leverage_data[wallet]["research"]:
                self.leverage_data[wallet]["research"][tech] = 0
            
            self.leverage_data[wallet]["research"][tech] += 0.05  # 5% bonus per research level
            
            await websocket.send_json({
                "type": "research_result",
                "payload": {
                    "tech": tech,
                    "level": self.leverage_data[wallet]["research"][tech],
                    "cost": research_cost,
                    "message": f"Research completed: {tech} level {self.leverage_data[wallet]['research'][tech]:.2f}"
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Research completed for {wallet}: {tech}")
            
        except Exception as e:
            logger.error(f"Error in research: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def request_new_missions(self, websocket: WebSocket, message: dict) -> None:
        """Handle request_new_missions message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            character_level = self.characters[wallet]["level"]
            new_missions = self._generate_missions(character_level)
            
            # Add new missions to existing ones (max 5 total)
            if wallet not in self.missions:
                self.missions[wallet] = []
            
            self.missions[wallet].extend(new_missions)
            
            # Keep only the latest 5 missions
            self.missions[wallet] = self.missions[wallet][-5:]
            
            await websocket.send_json({
                "type": "new_missions_result",
                "payload": {
                    "missions": new_missions,
                    "total_missions": len(self.missions[wallet]),
                    "message": f"Generated {len(new_missions)} new missions"
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"New missions generated for {wallet}: {len(new_missions)} missions")
            
        except Exception as e:
            logger.error(f"Error generating new missions: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

    async def execute_strategy(self, websocket: WebSocket, message: dict) -> None:
        """Handle execute_strategy message."""
        try:
            wallet = self.active_connections[websocket]["client_id"]
            if wallet not in self.characters:
                raise ValueError("Character not found")
            
            strategy = message.get("strategy", "territorial_expansion")
            
            # Execute different strategies
            result_message = ""
            if strategy == "territorial_expansion":
                # Simulate territorial expansion
                player_territories = [t for t in self.territories if t.get("controlledBy") == wallet]
                expansion_count = min(2, len(player_territories))
                result_message = f"Expanded control over {expansion_count} additional sectors"
                
            elif strategy == "resource_diversification":
                # Simulate resource diversification
                result_message = "Diversified resource extraction operations across all territories"
                
            elif strategy == "mission_completion":
                # Auto-complete a mission if available
                if wallet in self.missions and self.missions[wallet]:
                    active_missions = [m for m in self.missions[wallet] if m["progress"] > 0]
                    if active_missions:
                        mission = active_missions[0]
                        mission["progress"] = 100
                        result_message = f"Completed mission: {mission['type']}"
                    else:
                        result_message = "No active missions to complete"
                else:
                    result_message = "No missions available"
            else:
                result_message = f"Executed strategy: {strategy}"
            
            await websocket.send_json({
                "type": "strategy_result",
                "payload": {
                    "strategy": strategy,
                    "message": result_message,
                    "success": True
                }
            })
            
            # Send updated game state
            await self.send_game_state(websocket, wallet)
            logger.info(f"Strategy executed for {wallet}: {strategy}")
            
        except Exception as e:
            logger.error(f"Error executing strategy: {e}")
            await websocket.send_json({
                "type": "error",
                "payload": str(e)
            })

manager = ConnectionManager()

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    connection_id = f"{websocket.client.host}:{websocket.client.port}"
    logger.info(f"New connection attempt from {connection_id}")
    
    try:
        logger.info(f"🔗 Attempting to connect {connection_id}")
        connect_result = await manager.connect(websocket)
        logger.info(f"🔗 Connect result for {connection_id}: {connect_result}")
        if not connect_result:
            logger.warning(f"❌ Connect failed for {connection_id}")
            return
        logger.info(f"✅ Connection established for {connection_id}")
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                message_type = message.get("type")
                
                if not message_type:
                    raise ValueError("Message type not provided")
                
                logger.debug(f"Received {message_type} from {connection_id}")
                
                if message_type == "ping":
                    if websocket in manager.active_connections:
                        manager.active_connections[websocket]["last_pong"] = time.time()
                    await websocket.send_json({"type": "pong"})
                    continue
                
                if message_type == "pong":
                    if websocket in manager.active_connections:
                        manager.active_connections[websocket]["last_pong"] = time.time()
                    continue
                
                if not manager.active_connections.get(websocket, {}).get("is_connected"):
                    logger.warning(f"Received message from inactive connection {connection_id}")
                    await manager.disconnect(websocket)
                    return
                
                if message_type == "create_character":
                    await manager.create_character(websocket, message)
                elif message_type == "claim_territory":
                    await manager.claim_territory(websocket, message)
                elif message_type == "harvest_resource":
                    await manager.harvest_resource(websocket, message)
                elif message_type == "accept_mission":
                    await manager.accept_mission(websocket, message)
                elif message_type == "complete_mission":
                    await manager.complete_mission(websocket, message)
                elif message_type == "analyze_game_state":
                    try:
                        payload = message["payload"]
                        wallet = payload.get("wallet")
                        
                        if not wallet or wallet not in manager.characters:
                            raise ValueError("Invalid wallet or character not found")
                        
                        # Analyze current game state
                        character = manager.characters[wallet]
                        controlled_territories = [t for t in manager.territories if t["controlledBy"] == wallet]
                        active_missions = manager.missions.get(wallet, [])
                        leverage_data = manager.leverage_data.get(wallet, {})
                        
                        # Calculate resource efficiency
                        total_resources = sum(character["resources"].values())
                        territory_count = len(controlled_territories)
                        resource_per_territory = total_resources / max(territory_count, 1)
                        
                        # Calculate mission efficiency
                        completed_missions = len([m for m in active_missions if m["progress"] == 100])
                        mission_completion_rate = completed_missions / max(len(active_missions), 1)
                        
                        # Calculate leverage efficiency
                        current_multiplier = manager.calculate_leverage_multiplier(wallet)
                        max_possible_multiplier = 2.0
                        leverage_efficiency = current_multiplier / max_possible_multiplier
                        
                        analysis = {
                            "resource_efficiency": resource_per_territory,
                            "mission_efficiency": mission_completion_rate,
                            "leverage_efficiency": leverage_efficiency,
                            "recommendations": []
                        }
                        
                        # Generate recommendations
                        if territory_count < 3:
                            analysis["recommendations"].append("Claim more territories to increase resource generation")
                        
                        if mission_completion_rate < 0.5:
                            analysis["recommendations"].append("Focus on completing active missions to boost leverage multiplier")
                        
                        if leverage_efficiency < 0.6:
                            analysis["recommendations"].append("Increase your leverage multiplier by balancing territory control and mission completion")
                        
                        await websocket.send_json({
                            "type": "analysis_result",
                            "payload": analysis
                        })
                        
                    except Exception as e:
                        logger.error(f"Error analyzing game state: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "payload": f"Failed to analyze game state: {str(e)}"
                        })
                elif message_type == "territory_action":
                    try:
                        wallet = manager.active_connections[websocket]["client_id"]
                        territory_id = message.get("territory_id")
                        action = message.get("action")
                        # find territory position from global list if available
                        tpos = None
                        for t in manager.territories:
                            if t.get("id") == territory_id:
                                tpos = t.get("position")
                                break
                        await websocket.send_json({
                            "type": "territory_action_result",
                            "payload": {
                                "territory_id": territory_id,
                                "action": action,
                                "position": tpos,
                                "message": f"Action '{action}' received for {territory_id}",
                                "success": True
                            }
                        })
                        await manager.send_game_state(websocket, wallet)
                    except Exception as e:
                        await websocket.send_json({"type": "error", "payload": str(e)})
                elif message_type == "calculate_leverage":
                    await manager.calculate_leverage(websocket, message)
                elif message_type == "auto_harvest":
                    await manager.auto_harvest(websocket, message)
                elif message_type == "explore_new_sectors":
                    await manager.explore_new_sectors(websocket, message)
                elif message_type == "defend_all":
                    await manager.defend_all(websocket, message)
                elif message_type == "research":
                    await manager.research(websocket, message)
                elif message_type == "get_world":
                    await manager.get_world(websocket, message)
                elif message_type == "explore_system":
                    await manager.explore_system(websocket, message)
                elif message_type == "move_units":
                    await manager.move_units(websocket, message)
                elif message_type == "attack_planet":
                    await manager.attack_planet(websocket, message)
                elif message_type == "harvest_planet":
                    await manager.harvest_planet(websocket, message)
                elif message_type == "build_satellite":
                    await manager.build_satellite(websocket, message)
                elif message_type == "deploy_research":
                    await manager.deploy_research(websocket, message)
                elif message_type == "request_new_missions":
                    await manager.request_new_missions(websocket, message)
                elif message_type == "territory_action":
                    # Lightweight handler to acknowledge UI actions
                    try:
                        wallet = manager.active_connections[websocket]["client_id"]
                        territory_id = message.get("territory_id")
                        action = message.get("action")
                        # find territory position from global list if available
                        tpos = None
                        for t in manager.territories:
                            if t.get("id") == territory_id:
                                tpos = t.get("position")
                                break
                        await websocket.send_json({
                            "type": "territory_action_result",
                            "payload": {
                                "territory_id": territory_id,
                                "action": action,
                                "position": tpos,
                                "message": f"Action '{action}' received for {territory_id}",
                                "success": True
                            }
                        })
                        # Optionally trigger real effects later
                        await manager.send_game_state(websocket, wallet)
                    except Exception as e:
                        await websocket.send_json({"type": "error", "payload": str(e)})
                elif message_type == "accept_mission":
                    await manager.accept_mission(websocket, message)
                elif message_type == "calculate_leverage":
                    await manager.calculate_leverage(websocket, message)
                elif message_type == "execute_strategy":
                    await manager.execute_strategy(websocket, message)
                elif message_type == "tutorial_skipped":
                    # Handle tutorial skip - just acknowledge
                    wallet = manager.active_connections[websocket]["client_id"]
                    logger.info(f"Tutorial skipped by {wallet}")
                    await websocket.send_json({
                        "type": "tutorial_skipped_ack",
                        "payload": {"success": True, "message": "Tutorial skipped successfully"}
                    })
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    await websocket.send_json({
                        "type": "error",
                        "payload": f"Unknown message type: {message_type}"
                    })

            except json.JSONDecodeError as e:
                logger.error(f"Error decoding message from {connection_id}: {e}")
                if manager.active_connections.get(websocket):
                    await websocket.send_json({
                        "type": "error",
                        "payload": "Invalid JSON message"
                    })
            except KeyError as e:
                logger.error(f"Missing key in message from {connection_id}: {e}")
                if manager.active_connections.get(websocket):
                    await websocket.send_json({
                        "type": "error",
                        "payload": f"Missing required field: {str(e)}"
                    })
            except WebSocketDisconnect:
                logger.info(f"Client {connection_id} disconnected during message processing")
                await manager.disconnect(websocket)
                return
            except Exception as e:
                logger.error(f"Error processing message from {connection_id}: {e}")
                if manager.active_connections.get(websocket):
                    await websocket.send_json({
                        "type": "error",
                        "payload": str(e)
                    })

    except WebSocketDisconnect:
        logger.info(f"Client {connection_id} disconnected normally")
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Unexpected error for {connection_id}: {e}")
        await manager.disconnect(websocket)

if __name__ == "__main__":
    print("Starting Python Leverage Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)