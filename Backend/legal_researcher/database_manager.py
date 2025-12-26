"""
Database Manager v2.0 - Security Enhanced
==========================================
- User authentication with bcrypt hashing
- User-scoped case access
- PDF document storage
- Chat history linked to cases
"""

import sqlite3
import json
import bcrypt
from datetime import datetime
from typing import Dict, List, Optional

DB_NAME = "legal_system.db"


class DatabaseManager:
    def __init__(self):
        self.create_tables()

    def connect(self):
        conn = sqlite3.connect(DB_NAME, check_same_thread=False)
        conn.row_factory = sqlite3.Row  # Return dict-like rows
        return conn

    def create_tables(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            
            # Table 1: Users (Authentication)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Table 2: Cases (Linked to User for data isolation)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cases (
                    case_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    client_name TEXT,
                    raw_description TEXT,
                    structured_data TEXT,
                    progress INTEGER DEFAULT 0,
                    stage TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(user_id)
                )
            """)
            
            # Table 3: Documents (PDF content storage)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    doc_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id INTEGER NOT NULL,
                    filename TEXT,
                    parsed_text TEXT,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(case_id) REFERENCES cases(case_id)
                )
            """)
            
            # Table 4: Chat Logs (Linked to Cases)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id INTEGER NOT NULL,
                    role TEXT,
                    content TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(case_id) REFERENCES cases(case_id)
                )
            """)
            conn.commit()
            
            # Migration: Add progress and stage columns if they don't exist
            try:
                cursor.execute("ALTER TABLE cases ADD COLUMN progress INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass  # Column already exists
            try:
                cursor.execute("ALTER TABLE cases ADD COLUMN stage TEXT DEFAULT ''")
            except sqlite3.OperationalError:
                pass  # Column already exists
            conn.commit()

    # ==================== AUTH METHODS ====================
    
    def register_user(self, username: str, password: str) -> bool:
        """
        Register a new user with bcrypt password hashing.
        Returns True on success, False if username exists.
        """
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        try:
            with self.connect() as conn:
                conn.execute(
                    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                    (username, hashed)
                )
                return True
        except sqlite3.IntegrityError:
            return False  # Username already exists

    def login_user(self, username: str, password: str) -> Optional[int]:
        """
        Verify credentials and return user_id if valid.
        Returns None if invalid.
        """
        with self.connect() as conn:
            cursor = conn.execute(
                "SELECT user_id, password_hash FROM users WHERE username = ?",
                (username,)
            )
            user = cursor.fetchone()
            
            if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash']):
                return user['user_id']
        return None

    def get_username(self, user_id: int) -> str:
        """Get username by user_id."""
        with self.connect() as conn:
            cursor = conn.execute(
                "SELECT username FROM users WHERE user_id = ?",
                (user_id,)
            )
            user = cursor.fetchone()
            return user['username'] if user else "Unknown"

    # ==================== CASE METHODS (User-Scoped) ====================
    
    def save_case(self, user_id: int, client_name: str, structured_data: dict, raw_desc: str = "") -> int:
        """
        Save a new case for a specific user.
        Returns the new case_id.
        """
        with self.connect() as conn:
            cursor = conn.execute(
                "INSERT INTO cases (user_id, client_name, raw_description, structured_data) VALUES (?, ?, ?, ?)",
                (user_id, client_name, raw_desc, json.dumps(structured_data))
            )
            return cursor.lastrowid

    def get_user_cases(self, user_id: int) -> List:
        """
        Get all cases belonging to a specific user.
        CRITICAL: Ensures data isolation between users.
        """
        with self.connect() as conn:
            return conn.execute(
                "SELECT * FROM cases WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,)
            ).fetchall()

    def get_case(self, case_id: int, user_id: int = None):
        """
        Get a specific case by ID.
        If user_id is provided, verifies ownership.
        """
        with self.connect() as conn:
            if user_id:
                cursor = conn.execute(
                    "SELECT * FROM cases WHERE case_id = ? AND user_id = ?",
                    (case_id, user_id)
                )
            else:
                cursor = conn.execute(
                    "SELECT * FROM cases WHERE case_id = ?",
                    (case_id,)
                )
            return cursor.fetchone()

    def delete_case(self, case_id: int, user_id: int) -> bool:
        """Delete a case (only if owned by user)."""
        with self.connect() as conn:
            cursor = conn.execute(
                "DELETE FROM cases WHERE case_id = ? AND user_id = ?",
                (case_id, user_id)
            )
            return cursor.rowcount > 0

    def update_case_progress(self, case_id: int, user_id: int, progress: int, stage: str) -> bool:
        """
        Update progress and stage for a case.
        Progress: 0-100 integer
        Stage: text like 'filing', 'trial', 'appeal', 'complete'
        Returns True if updated successfully.
        """
        # Clamp progress to 0-100
        progress = max(0, min(100, progress))
        
        with self.connect() as conn:
            cursor = conn.execute(
                "UPDATE cases SET progress = ?, stage = ? WHERE case_id = ? AND user_id = ?",
                (progress, stage, case_id, user_id)
            )
            return cursor.rowcount > 0

    # ==================== DOCUMENT METHODS ====================
    
    def save_document(self, case_id: int, filename: str, parsed_text: str) -> int:
        """Save parsed PDF/document text linked to a case."""
        with self.connect() as conn:
            cursor = conn.execute(
                "INSERT INTO documents (case_id, filename, parsed_text) VALUES (?, ?, ?)",
                (case_id, filename, parsed_text)
            )
            return cursor.lastrowid

    def get_case_documents(self, case_id: int) -> List:
        """Get all documents for a specific case."""
        with self.connect() as conn:
            return conn.execute(
                "SELECT * FROM documents WHERE case_id = ?",
                (case_id,)
            ).fetchall()

    # ==================== CHAT METHODS ====================
    
    def add_chat_log(self, case_id: int, role: str, content: str):
        """Add a chat message to the history."""
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO chat_logs (case_id, role, content) VALUES (?, ?, ?)",
                (case_id, role, content)
            )

    def get_chat_history(self, case_id: int, limit: int = 10) -> List:
        """Get recent chat history for a case."""
        with self.connect() as conn:
            cursor = conn.execute(
                "SELECT role, content FROM chat_logs WHERE case_id = ? ORDER BY timestamp DESC LIMIT ?",
                (case_id, limit)
            )
            rows = cursor.fetchall()
            return rows[::-1]  # Reverse to chronological order

    def clear_chat_history(self, case_id: int):
        """Clear all chat history for a case."""
        with self.connect() as conn:
            conn.execute("DELETE FROM chat_logs WHERE case_id = ?", (case_id,))
