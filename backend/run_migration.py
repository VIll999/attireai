#!/usr/bin/env python3
"""
Run database migration script
Usage: python run_migration.py migrations/002_update_color_profiles.sql
"""

import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration(sql_file_path: str):
    """Run a SQL migration file."""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        sys.exit(1)

    # Create engine
    engine = create_engine(database_url, echo=True)

    # Read SQL file
    if not os.path.exists(sql_file_path):
        print(f"❌ Migration file not found: {sql_file_path}")
        sys.exit(1)

    with open(sql_file_path, 'r') as f:
        sql_content = f.read()

    # Split by semicolons to execute each statement separately
    statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

    print(f"\n🚀 Running migration: {sql_file_path}\n")

    # Execute each statement
    with engine.connect() as conn:
        for i, statement in enumerate(statements, 1):
            if statement:
                try:
                    print(f"📝 Executing statement {i}/{len(statements)}...")
                    conn.execute(text(statement))
                    conn.commit()
                    print(f"✅ Statement {i} executed successfully\n")
                except Exception as e:
                    print(f"❌ Error executing statement {i}:")
                    print(f"   {statement[:100]}...")
                    print(f"   Error: {e}\n")
                    conn.rollback()
                    raise

    print("✅ Migration completed successfully!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_migration.py <migration_file.sql>")
        print("Example: python run_migration.py migrations/002_update_color_profiles.sql")
        sys.exit(1)

    migration_file = sys.argv[1]
    run_migration(migration_file)
do