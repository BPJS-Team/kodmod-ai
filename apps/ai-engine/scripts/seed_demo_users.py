"""Create or reset local demo accounts to the documented demo password.

Contract:
- This script runs only when explicitly invoked; application startup never seeds users.
- It creates siswa.demo (student), guru.demo (teacher), and admin.demo (admin).
- It sets those three demo accounts to the shared password "password"; a role conflict aborts.
- Passwords are hashed before storage. Existing demo accounts have only their password reset.
- Other accounts, including baysatriow, are never updated.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from api.security import hash_password
from config.settings import settings
from database.models import User
from database.session import async_session, close_db, init_db

DEMO_USERS = (
    ("siswa.demo", "Demo Siswa", "student"),
    ("guru.demo", "Demo Guru", "teacher"),
    ("admin.demo", "Demo Admin", "admin"),
)
DEFAULT_DEMO_PASSWORD = "password"  # noqa: S105 - opt-in local demo accounts only


async def _seed() -> int:
    # SQL echo includes inserted password_hash values when DEBUG is enabled.
    settings.DEBUG = False
    await init_db()
    try:
        async with async_session() as session:
            usernames = [username for username, _, _ in DEMO_USERS]
            result = await session.execute(select(User).where(User.username.in_(usernames)))
            existing = {user.username: user for user in result.scalars().all()}

            conflicts = [
                f"{username} already has role {existing[username].role}; expected {role}"
                for username, _, role in DEMO_USERS
                if username in existing and existing[username].role != role
            ]
            if conflicts:
                raise RuntimeError("Demo account role conflict: " + "; ".join(conflicts))

            for username, full_name, role in DEMO_USERS:
                user = existing.get(username)
                if user is None:
                    user = User(
                        username=username,
                        full_name=full_name,
                        role=role,
                        is_active=True,
                    )
                    session.add(user)
                user.password_hash = hash_password(DEFAULT_DEMO_PASSWORD)
    finally:
        await close_db()

    print('Demo accounts created or reset. Shared password: "password".')
    for username, _, role in DEMO_USERS:
        print(f"{username} ({role})")
    return 0


def main() -> int:
    return asyncio.run(_seed())


if __name__ == "__main__":
    raise SystemExit(main())
