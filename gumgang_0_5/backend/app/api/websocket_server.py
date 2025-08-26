"""
WebSocket Server for 금강 2.0
실시간 협업 편집을 위한 WebSocket 서버 구현
"""

from fastapi import WebSocket, WebSocketDisconnect, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Set, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
import asyncio
import uuid
import hashlib
import time
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Message Types
class MessageType(str, Enum):
    # Connection
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    PING = "ping"
    PONG = "pong"

    # Authentication
    AUTH = "auth"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILED = "auth_failed"

    # Room Management
    JOIN_ROOM = "join_room"
    LEAVE_ROOM = "leave_room"
    ROOM_JOINED = "room_joined"
    ROOM_LEFT = "room_left"
    ROOM_USERS = "room_users"

    # Document Operations
    DOCUMENT_CHANGE = "document_change"
    DOCUMENT_SAVE = "document_save"
    DOCUMENT_SYNC = "document_sync"
    CURSOR_POSITION = "cursor_position"
    SELECTION_CHANGE = "selection_change"

    # Collaboration
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_TYPING = "user_typing"
    USER_IDLE = "user_idle"

    # AI Operations
    AI_SUGGESTION = "ai_suggestion"
    AI_ANALYSIS = "ai_analysis"
    AI_COMPLETION = "ai_completion"

    # Error
    ERROR = "error"

    # File Operations
    FILE_OPENED = "file_opened"
    FILE_CLOSED = "file_closed"
    FILE_RENAMED = "file_renamed"
    FILE_DELETED = "file_deleted"

# Data Classes
@dataclass
class User:
    id: str
    username: str
    connection_id: str
    websocket: WebSocket
    joined_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    rooms: Set[str] = field(default_factory=set)
    cursor_position: Optional[Dict] = None
    selection: Optional[Dict] = None
    is_typing: bool = False
    color: str = field(default_factory=lambda: f"#{uuid.uuid4().hex[:6]}")

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "username": self.username,
            "joined_at": self.joined_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "cursor_position": self.cursor_position,
            "selection": self.selection,
            "is_typing": self.is_typing,
            "color": self.color,
        }

@dataclass
class Room:
    id: str
    name: str
    created_at: datetime = field(default_factory=datetime.now)
    users: Set[str] = field(default_factory=set)
    document: Optional[Dict] = None
    document_version: int = 0
    last_modified: datetime = field(default_factory=datetime.now)
    settings: Dict = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "users": list(self.users),
            "document_version": self.document_version,
            "last_modified": self.last_modified.isoformat(),
            "settings": self.settings,
        }

@dataclass
class DocumentChange:
    user_id: str
    room_id: str
    version: int
    changes: List[Dict]
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "room_id": self.room_id,
            "version": self.version,
            "changes": self.changes,
            "timestamp": self.timestamp.isoformat(),
        }

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, User] = {}
        self.rooms: Dict[str, Room] = {}
        self.pending_changes: Dict[str, List[DocumentChange]] = defaultdict(list)
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.heartbeat_interval = 30  # seconds
        self.cleanup_interval = 60  # seconds

    async def connect(self, websocket: WebSocket, user_id: str, username: str) -> User:
        """Accept WebSocket connection and create user"""
        await websocket.accept()
        connection_id = str(uuid.uuid4())

        user = User(
            id=user_id,
            username=username,
            connection_id=connection_id,
            websocket=websocket
        )

        self.active_connections[connection_id] = user

        # Send connection success message
        await self.send_personal_message(
            connection_id,
            {
                "type": MessageType.AUTH_SUCCESS,
                "data": {
                    "user": user.to_dict(),
                    "connection_id": connection_id,
                }
            }
        )

        logger.info(f"User {username} (ID: {user_id}) connected with connection {connection_id}")
        return user

    async def disconnect(self, connection_id: str):
        """Handle user disconnection"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]

        # Leave all rooms
        for room_id in list(user.rooms):
            await self.leave_room(connection_id, room_id)

        # Remove from active connections
        del self.active_connections[connection_id]

        logger.info(f"User {user.username} (ID: {user.id}) disconnected")

    async def send_personal_message(self, connection_id: str, message: Dict):
        """Send message to specific user"""
        if connection_id in self.active_connections:
            user = self.active_connections[connection_id]
            try:
                await user.websocket.send_json(message)
                user.last_activity = datetime.now()
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                await self.disconnect(connection_id)

    async def broadcast_to_room(self, room_id: str, message: Dict, exclude_connection: Optional[str] = None):
        """Broadcast message to all users in a room"""
        if room_id not in self.rooms:
            return

        room = self.rooms[room_id]
        disconnected = []

        for user_id in room.users:
            # Find connection by user_id
            for connection_id, user in self.active_connections.items():
                if user.id == user_id and connection_id != exclude_connection:
                    try:
                        await user.websocket.send_json(message)
                        user.last_activity = datetime.now()
                    except Exception as e:
                        logger.error(f"Error broadcasting to {connection_id}: {e}")
                        disconnected.append(connection_id)

        # Clean up disconnected users
        for conn_id in disconnected:
            await self.disconnect(conn_id)

    async def join_room(self, connection_id: str, room_id: str, room_name: Optional[str] = None) -> Room:
        """Join or create a room"""
        if connection_id not in self.active_connections:
            raise ValueError("Invalid connection ID")

        user = self.active_connections[connection_id]

        # Create room if it doesn't exist
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(
                id=room_id,
                name=room_name or f"Room {room_id[:8]}"
            )

        room = self.rooms[room_id]

        # Add user to room
        room.users.add(user.id)
        user.rooms.add(room_id)

        # Notify user of successful join
        await self.send_personal_message(
            connection_id,
            {
                "type": MessageType.ROOM_JOINED,
                "data": {
                    "room": room.to_dict(),
                    "users": [
                        self.get_user_by_id(uid).to_dict()
                        for uid in room.users
                        if self.get_user_by_id(uid)
                    ]
                }
            }
        )

        # Notify others in room
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.USER_JOINED,
                "data": {
                    "user": user.to_dict(),
                    "room_id": room_id,
                }
            },
            exclude_connection=connection_id
        )

        logger.info(f"User {user.username} joined room {room_id}")
        return room

    async def leave_room(self, connection_id: str, room_id: str):
        """Leave a room"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]

        if room_id not in self.rooms:
            return

        room = self.rooms[room_id]

        # Remove user from room
        room.users.discard(user.id)
        user.rooms.discard(room_id)

        # Notify others in room
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.USER_LEFT,
                "data": {
                    "user": user.to_dict(),
                    "room_id": room_id,
                }
            }
        )

        # Clean up empty rooms
        if not room.users:
            del self.rooms[room_id]
            logger.info(f"Room {room_id} deleted (empty)")

        logger.info(f"User {user.username} left room {room_id}")

    async def handle_document_change(self, connection_id: str, room_id: str, changes: List[Dict]):
        """Handle document change from a user"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]

        if room_id not in self.rooms:
            return

        room = self.rooms[room_id]

        # Update document version
        room.document_version += 1
        room.last_modified = datetime.now()

        # Create change record
        change = DocumentChange(
            user_id=user.id,
            room_id=room_id,
            version=room.document_version,
            changes=changes
        )

        # Store pending change
        self.pending_changes[room_id].append(change)

        # Broadcast change to other users
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.DOCUMENT_CHANGE,
                "data": {
                    "user": user.to_dict(),
                    "version": room.document_version,
                    "changes": changes,
                    "timestamp": change.timestamp.isoformat(),
                }
            },
            exclude_connection=connection_id
        )

    async def handle_cursor_position(self, connection_id: str, room_id: str, position: Dict):
        """Handle cursor position update"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]
        user.cursor_position = position
        user.last_activity = datetime.now()

        # Broadcast to others in room
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.CURSOR_POSITION,
                "data": {
                    "user": user.to_dict(),
                    "position": position,
                }
            },
            exclude_connection=connection_id
        )

    async def handle_selection_change(self, connection_id: str, room_id: str, selection: Dict):
        """Handle selection change"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]
        user.selection = selection
        user.last_activity = datetime.now()

        # Broadcast to others in room
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.SELECTION_CHANGE,
                "data": {
                    "user": user.to_dict(),
                    "selection": selection,
                }
            },
            exclude_connection=connection_id
        )

    async def handle_user_typing(self, connection_id: str, room_id: str, is_typing: bool):
        """Handle user typing status"""
        if connection_id not in self.active_connections:
            return

        user = self.active_connections[connection_id]
        user.is_typing = is_typing
        user.last_activity = datetime.now()

        # Broadcast to others in room
        await self.broadcast_to_room(
            room_id,
            {
                "type": MessageType.USER_TYPING if is_typing else MessageType.USER_IDLE,
                "data": {
                    "user": user.to_dict(),
                    "is_typing": is_typing,
                }
            },
            exclude_connection=connection_id
        )

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        for user in self.active_connections.values():
            if user.id == user_id:
                return user
        return None

    def get_room_users(self, room_id: str) -> List[User]:
        """Get all users in a room"""
        if room_id not in self.rooms:
            return []

        room = self.rooms[room_id]
        users = []

        for user_id in room.users:
            user = self.get_user_by_id(user_id)
            if user:
                users.append(user)

        return users

    async def heartbeat(self):
        """Send heartbeat to all connections"""
        while True:
            await asyncio.sleep(self.heartbeat_interval)
            disconnected = []

            for connection_id, user in self.active_connections.items():
                try:
                    await user.websocket.send_json({
                        "type": MessageType.PING,
                        "data": {"timestamp": datetime.now().isoformat()}
                    })
                except:
                    disconnected.append(connection_id)

            for conn_id in disconnected:
                await self.disconnect(conn_id)

    async def cleanup_inactive(self):
        """Clean up inactive connections"""
        while True:
            await asyncio.sleep(self.cleanup_interval)
            now = datetime.now()
            timeout = timedelta(minutes=5)
            disconnected = []

            for connection_id, user in self.active_connections.items():
                if now - user.last_activity > timeout:
                    disconnected.append(connection_id)

            for conn_id in disconnected:
                logger.info(f"Disconnecting inactive user: {conn_id}")
                await self.disconnect(conn_id)

# Global connection manager instance
manager = ConnectionManager()

# WebSocket endpoint
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    token: Optional[str] = None
):
    """Main WebSocket endpoint"""
    connection_id = None

    try:
        # Validate token if provided
        if token:
            # TODO: Implement token validation
            pass

        # Generate user ID if not provided
        if not user_id:
            user_id = str(uuid.uuid4())

        if not username:
            username = f"User_{user_id[:8]}"

        # Connect user
        user = await manager.connect(websocket, user_id, username)
        connection_id = user.connection_id

        # Message handling loop
        while True:
            # Receive message
            data = await websocket.receive_json()

            message_type = data.get("type")
            message_data = data.get("data", {})

            # Handle different message types
            if message_type == MessageType.PONG:
                user.last_activity = datetime.now()

            elif message_type == MessageType.JOIN_ROOM:
                room_id = message_data.get("room_id")
                room_name = message_data.get("room_name")
                if room_id:
                    await manager.join_room(connection_id, room_id, room_name)

            elif message_type == MessageType.LEAVE_ROOM:
                room_id = message_data.get("room_id")
                if room_id:
                    await manager.leave_room(connection_id, room_id)

            elif message_type == MessageType.DOCUMENT_CHANGE:
                room_id = message_data.get("room_id")
                changes = message_data.get("changes", [])
                if room_id:
                    await manager.handle_document_change(connection_id, room_id, changes)

            elif message_type == MessageType.CURSOR_POSITION:
                room_id = message_data.get("room_id")
                position = message_data.get("position")
                if room_id and position:
                    await manager.handle_cursor_position(connection_id, room_id, position)

            elif message_type == MessageType.SELECTION_CHANGE:
                room_id = message_data.get("room_id")
                selection = message_data.get("selection")
                if room_id and selection:
                    await manager.handle_selection_change(connection_id, room_id, selection)

            elif message_type == MessageType.USER_TYPING:
                room_id = message_data.get("room_id")
                is_typing = message_data.get("is_typing", False)
                if room_id:
                    await manager.handle_user_typing(connection_id, room_id, is_typing)

            else:
                # Unknown message type
                await manager.send_personal_message(
                    connection_id,
                    {
                        "type": MessageType.ERROR,
                        "data": {
                            "message": f"Unknown message type: {message_type}"
                        }
                    }
                )

    except WebSocketDisconnect:
        if connection_id:
            await manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if connection_id:
            await manager.send_personal_message(
                connection_id,
                {
                    "type": MessageType.ERROR,
                    "data": {
                        "message": str(e)
                    }
                }
            )
            await manager.disconnect(connection_id)

# Startup tasks
async def start_background_tasks():
    """Start background tasks"""
    asyncio.create_task(manager.heartbeat())
    asyncio.create_task(manager.cleanup_inactive())

# Export for use in FastAPI app
__all__ = [
    'websocket_endpoint',
    'manager',
    'start_background_tasks',
    'MessageType',
    'User',
    'Room',
    'DocumentChange',
]
