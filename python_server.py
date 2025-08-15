#!/usr/bin/env python3
"""
Honey Comb Protocol - Python Backend Server
Handles leverage calculations and game analytics
"""

import asyncio
import json
import logging
import uvicorn
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# import numpy as np  # Removed for compatibility

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Honey Comb Protocol Backend",
    description="High-performance backend for leverage calculations and game analytics",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class Character(BaseModel):
    name: str
    level: int
    experience: int
    faction: str
    resources: Dict[str, float] = {}
    traits: List[Dict[str, Any]] = []

class LeverageRequest(BaseModel):
    character: Character
    action: Dict[str, Any]

class LeverageResponse(BaseModel):
    leverageMultiplier: float
    efficiency: float
    recommendations: List[str]
    analysis: Dict[str, Any]

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_data: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_data[websocket] = {
            "connected_at": datetime.now(),
            "message_count": 0
        }
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.client_data:
            del self.client_data[websocket]
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Leverage calculation engine
class LeverageEngine:
    def __init__(self):
        self.base_multiplier = 1.0
        self.trait_weights = {
            "Strength": 0.8,
            "Wisdom": 1.2,
            "Charisma": 1.0,
            "Agility": 0.9,
            "Intelligence": 1.1
        }
        self.action_weights = {
            "gather": 1.0,
            "craft": 1.2,
            "combat": 0.9,
            "explore": 1.1,
            "trade": 1.3
        }

    def calculate_leverage(self, character: Character, action: Dict[str, Any]) -> LeverageResponse:
        """Calculate leverage multiplier based on character stats and action type"""
        
        # Base calculations
        level_bonus = character.level * 0.05
        experience_bonus = min(character.experience / 10000, 1.0) * 0.3
        
        # Trait analysis
        trait_bonus = 0
        trait_analysis = {}
        
        for trait in character.traits:
            trait_type = trait.get("type", "")
            trait_level = trait.get("level", 1)
            
            if trait_type in self.trait_weights:
                weight = self.trait_weights[trait_type]
                bonus = (trait_level * 0.1) * weight
                trait_bonus += bonus
                trait_analysis[trait_type] = {
                    "level": trait_level,
                    "bonus": bonus,
                    "weight": weight
                }

        # Action type bonus
        action_type = action.get("action", "gather")
        action_bonus = self.action_weights.get(action_type, 1.0) - 1.0
        
        # Resource availability bonus
        resource_bonus = 0
        if "resources" in action and character.resources:
            available_resources = len([r for r in action["resources"] if r in character.resources])
            total_resources = len(action["resources"])
            if total_resources > 0:
                resource_bonus = (available_resources / total_resources) * 0.2

        # Faction synergy bonus
        faction_bonus = self.calculate_faction_bonus(character.faction, action)
        
        # Calculate final multiplier
        final_multiplier = (
            self.base_multiplier + 
            level_bonus + 
            experience_bonus + 
            trait_bonus + 
            action_bonus + 
            resource_bonus + 
            faction_bonus
        )
        
        # Efficiency calculation
        efficiency = min(final_multiplier / 2.0, 1.0)
        
        # Generate recommendations
        recommendations = self.generate_recommendations(character, action, trait_analysis)
        
        # Detailed analysis
        analysis = {
            "base_multiplier": self.base_multiplier,
            "level_bonus": level_bonus,
            "experience_bonus": experience_bonus,
            "trait_bonus": trait_bonus,
            "action_bonus": action_bonus,
            "resource_bonus": resource_bonus,
            "faction_bonus": faction_bonus,
            "trait_analysis": trait_analysis,
            "character_level": character.level,
            "character_experience": character.experience,
            "action_type": action_type
        }
        
        return LeverageResponse(
            leverageMultiplier=round(final_multiplier, 4),
            efficiency=round(efficiency, 4),
            recommendations=recommendations,
            analysis=analysis
        )

    def calculate_faction_bonus(self, faction: str, action: Dict[str, Any]) -> float:
        """Calculate faction-specific bonuses"""
        faction_bonuses = {
            "Sun": {"gather": 0.1, "combat": 0.15},
            "Ocean": {"explore": 0.15, "trade": 0.1},
            "Forest": {"craft": 0.15, "gather": 0.1},
            "Red": {"combat": 0.2},
            "Blue": {"explore": 0.15},
            "Green": {"gather": 0.15}
        }
        
        action_type = action.get("action", "gather")
        return faction_bonuses.get(faction, {}).get(action_type, 0.0)

    def generate_recommendations(self, character: Character, action: Dict[str, Any], trait_analysis: Dict) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Level recommendations
        if character.level < 10:
            recommendations.append("Consider focusing on gaining experience to unlock higher leverage multipliers")
        
        # Trait recommendations
        action_type = action.get("action", "gather")
        optimal_traits = {
            "gather": ["Wisdom", "Strength"],
            "craft": ["Intelligence", "Wisdom"],
            "combat": ["Strength", "Agility"],
            "explore": ["Agility", "Intelligence"],
            "trade": ["Charisma", "Intelligence"]
        }
        
        if action_type in optimal_traits:
            for trait in optimal_traits[action_type]:
                if trait not in trait_analysis or trait_analysis[trait]["level"] < 5:
                    recommendations.append(f"Improve {trait} trait for better {action_type} performance")
        
        # Resource recommendations
        if "resources" in action:
            missing_resources = [r for r in action["resources"] if r not in character.resources]
            if missing_resources:
                recommendations.append(f"Acquire these resources for optimal performance: {', '.join(missing_resources)}")
        
        # Faction recommendations
        faction_bonus = self.calculate_faction_bonus(character.faction, action)
        if faction_bonus == 0:
            recommendations.append(f"Consider actions that synergize with your {character.faction} faction")
        
        return recommendations[:5]  # Limit to 5 recommendations

leverage_engine = LeverageEngine()

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_connections": len(manager.active_connections),
        "service": "Honey Comb Protocol Backend"
    }

@app.post("/calculate-leverage")
async def calculate_leverage(request: LeverageRequest) -> LeverageResponse:
    """Calculate leverage for a given character and action"""
    try:
        result = leverage_engine.calculate_leverage(request.character, request.action)
        logger.info(f"Leverage calculated for {request.character.name}: {result.leverageMultiplier}")
        return result
    except Exception as e:
        logger.error(f"Error calculating leverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/character/{character_name}")
async def get_character_analytics(character_name: str):
    """Get analytics for a specific character"""
    # In a real implementation, this would query a database
    return {
        "character_name": character_name,
        "total_actions": 0,
        "average_leverage": 1.0,
        "optimization_score": 75.5,
        "recommendations": [
            "Focus on improving Wisdom trait",
            "Consider diversifying action types"
        ]
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type", "unknown")
                
                if message_type == "leverage_request":
                    # Handle leverage calculation request
                    character_data = message.get("character", {})
                    action_data = message.get("action", {})
                    
                    character = Character(**character_data)
                    result = leverage_engine.calculate_leverage(character, action_data)
                    
                    response = {
                        "type": "leverage_response",
                        "id": message.get("id"),
                        "data": result.dict()
                    }
                    
                    await manager.send_personal_message(json.dumps(response), websocket)
                
                elif message_type == "ping":
                    # Handle ping
                    response = {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }
                    await manager.send_personal_message(json.dumps(response), websocket)
                
                else:
                    # Echo unknown messages
                    await manager.send_personal_message(data, websocket)
                
                # Update client stats
                if websocket in manager.client_data:
                    manager.client_data[websocket]["message_count"] += 1
                    
            except json.JSONDecodeError:
                error_response = {
                    "type": "error",
                    "message": "Invalid JSON format"
                }
                await manager.send_personal_message(json.dumps(error_response), websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

@app.get("/stats")
async def get_server_stats():
    """Get server statistics"""
    return {
        "active_connections": len(manager.active_connections),
        "total_calculations": 0,  # Would track this in a real implementation
        "uptime": "0:00:00",  # Would calculate actual uptime
        "memory_usage": "N/A",
        "cpu_usage": "N/A"
    }

if __name__ == "__main__":
    print("🚀 Starting Honey Comb Protocol Backend Server...")
    print("📊 Leverage calculation engine initialized")
    print("🔌 WebSocket support enabled")
    print("🌐 CORS configured for frontend integration")
    
    uvicorn.run(
        "python_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
