"""
Seed helpers for Doenet load tests.

Each public function ensures a specific set of test data exists before virtual
users start spawning. Functions are idempotent — safe to call multiple times.

`seeded_data` is a shared dict that seed functions populate with runtime values
(e.g. class codes) that test files can read in on_start.

Usage in a Locust file:
    from locust import events
    from seed import seed_student_assignments, seed_instructor_content, seed_public_content, seeded_data

    @events.test_start.add_listener
    def on_test_start(environment, **kwargs):
        host = environment.host
        seed_student_assignments(host)
        seed_instructor_content(host)
"""

import logging
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Set

logger = logging.getLogger(__name__)

# Guards so each seed runs at most once per process even when multiple
# Locust files are loaded together.
_seeded: Set[str] = set()

# Runtime values populated by seed functions and consumed by test files.
seeded_data: dict = {}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _login(session: requests.Session, host: str, email: str) -> bool:
    r = session.post(
        f"{host}/api/login/createOrLoginAsTest",
        json={"email": email},
        headers={"Content-Type": "application/json"},
    )
    if r.status_code != 200:
        logger.warning("Seed: login failed for %s (status %s)", email, r.status_code)
        return False
    return True


def _get_user_id(session: requests.Session, host: str) -> Optional[str]:
    r = session.get(f"{host}/api/user/getMyUserInfo")
    if r.status_code != 200:
        return None
    data = r.json()
    return data.get("userId") or data.get("user", {}).get("userId")


def _create_content(session: requests.Session, host: str, name: str) -> Optional[str]:
    r = session.post(
        f"{host}/api/updateContent/createContent",
        json={"contentType": "singleDoc", "parentId": None},
        headers={"Content-Type": "application/json"},
    )
    if r.status_code != 200:
        logger.warning("Seed: createContent failed (status %s)", r.status_code)
        return None
    data = r.json()
    content_id = data.get("contentId") or data.get("id")
    if not content_id:
        return None

    session.post(
        f"{host}/api/updateContent/saveDoenetML",
        json={"contentId": content_id, "doenetML": "<p>Seeded load-test content</p>", "numVariants": 1},
        headers={"Content-Type": "application/json"},
    )
    session.post(
        f"{host}/api/updateContent/updateContentSettings",
        json={"contentId": content_id, "name": name},
        headers={"Content-Type": "application/json"},
    )
    return content_id


# ---------------------------------------------------------------------------
# Seed: student assignments
# ---------------------------------------------------------------------------

def seed_student_assignments(host: str, n: int = 3) -> None:
    """
    Ensures student@abc.org has at least `n` assignments available.

    Enrollment flow:
      1. Log in as seed-teacher@abc.org and create content.
      2. Create an assignment — the server returns a numeric classCode.
      3. Log in as the student and call GET /api/code/:classCode to resolve
         the classCode to the assignment's contentId.
      4. Call POST /api/score/createNewAttempt with that contentId, which
         creates the contentState record that makes the assignment appear
         in the student's GET /api/assign/getAssigned list.

    If the student already has assignments this function exits immediately.
    """
    if "student_assignments" in _seeded:
        return

    # Check whether the student already has assignments so we don't create
    # duplicates on repeated runs against the same environment.
    student_session = requests.Session()
    if not _login(student_session, host, "student@abc.org"):
        return
    r = student_session.get(f"{host}/api/assign/getAssigned")
    if r.status_code == 200:
        existing = r.json().get("assignments", [])
        if len(existing) >= n:
            logger.info("Seed: student already has %d assignment(s), skipping", len(existing))
            _seeded.add("student_assignments")
            # Ensure existing assignments allow multiple attempts (patch maxAttempts=0)
            teacher_session2 = requests.Session()
            if _login(teacher_session2, host, "seed-teacher@abc.org"):
                for a in existing:
                    cid = a.get("contentId") or a.get("id")
                    if cid:
                        teacher_session2.post(
                            f"{host}/api/assign/updateAssignmentMaxAttempts",
                            json={"contentId": cid, "maxAttempts": 0},
                            headers={"Content-Type": "application/json"},
                        )
            return

    # Create content and assignments as the seed teacher
    teacher_session = requests.Session()
    if not _login(teacher_session, host, "seed-teacher@abc.org"):
        return
    teacher_session.post(
        f"{host}/api/user/setIsAuthor",
        json={"isAuthor": True},
        headers={"Content-Type": "application/json"},
    )

    created = 0
    for i in range(n):
        content_id = _create_content(teacher_session, host, f"Seeded Assignment {i + 1}")
        if not content_id:
            continue

        # Create the assignment — returns classCode (a plain integer) that
        # students use to join, plus an assignmentId (UUID of the copy).
        closed_on = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        r = teacher_session.post(
            f"{host}/api/assign/createAssignment",
            json={"contentId": content_id, "closedOn": closed_on, "destinationParentId": None},
            headers={"Content-Type": "application/json"},
        )
        if r.status_code != 200:
            logger.warning("Seed: createAssignment failed for content %s", content_id)
            continue

        class_code = r.json().get("classCode")
        if not class_code:
            logger.warning("Seed: no classCode in createAssignment response")
            continue

        # Student enrollment flow:
        #   1. Resolve the classCode to an assignmentId via GET /api/code/:code
        #   2. Call createNewAttempt to create the contentState record that
        #      causes the assignment to appear in the student's getAssigned list.
        r = student_session.get(f"{host}/api/code/{class_code}")
        if r.status_code != 200:
            logger.warning("Seed: code lookup failed for classCode %s", class_code)
            continue

        # Allow unlimited attempts so StudentUser's new_attempt task is valid
        assignment_content_id = r.json().get("contentId")
        if not assignment_content_id:
            continue

        teacher_session.post(
            f"{host}/api/assign/updateAssignmentMaxAttempts",
            json={"contentId": assignment_content_id, "maxAttempts": 0},
            headers={"Content-Type": "application/json"},
        )

        student_session.post(
            f"{host}/api/score/createNewAttempt",
            json={"contentId": assignment_content_id, "variant": 1, "state": None},
            headers={"Content-Type": "application/json"},
        )
        created += 1

    logger.info("Seed: created %d assignment(s) for student@abc.org", created)
    _seeded.add("student_assignments")


# ---------------------------------------------------------------------------
# Seed: instructor content library
# ---------------------------------------------------------------------------

def seed_instructor_content(host: str, n: int = 5) -> None:
    """
    Ensures instructor@abc.org has at least `n` activities in their content
    library so that assignment-creation and grade-review tasks have data to
    work with.

    If the instructor already has content this function exits immediately.
    """
    if "instructor_content" in _seeded:
        return

    session = requests.Session()
    if not _login(session, host, "instructor@abc.org"):
        return

    user_id = _get_user_id(session, host)
    if not user_id:
        logger.warning("Seed: could not resolve instructor user ID")
        return

    # Check existing content
    r = session.get(f"{host}/api/contentList/getMyContent/{user_id}")
    if r.status_code == 200:
        existing = [i for i in r.json().get("content", []) if i.get("type") != "folder"]
        if len(existing) >= n:
            logger.info("Seed: instructor already has %d item(s), skipping", len(existing))
            _seeded.add("instructor_content")
            return

    session.post(
        f"{host}/api/user/setIsAuthor",
        json={"isAuthor": True},
        headers={"Content-Type": "application/json"},
    )

    created = 0
    for i in range(n):
        content_id = _create_content(session, host, f"Seeded Instructor Activity {i + 1}")
        if content_id:
            # Make public so browse_explore tasks also have results
            session.post(
                f"{host}/api/share/setContentIsPublic",
                json={"contentId": content_id, "isPublic": True},
                headers={"Content-Type": "application/json"},
            )
            created += 1

    logger.info("Seed: created %d activity/activities for instructor@abc.org", created)
    _seeded.add("instructor_content")


# ---------------------------------------------------------------------------
# Seed: public content for guest browsing
# ---------------------------------------------------------------------------

def seed_public_content(host: str, n: int = 10) -> None:
    """
    Ensures at least `n` public activities exist so that GuestUser's
    browse_explore and view_activity tasks have data to work with.

    Checks the explore endpoint first — if enough public content is already
    present the function exits immediately without creating anything.
    """
    if "public_content" in _seeded:
        return

    # Check whether sufficient public content already exists
    r = requests.post(
        f"{host}/api/explore/browseExplore",
        json={"categories": [], "isUnclassified": False},
        headers={"Content-Type": "application/json"},
    )
    if r.status_code == 200:
        data = r.json()
        total_count = data.get("totalCount", {})
        total = total_count.get("numCommunity", 0) + total_count.get("numCurated", 0)
        if total >= n:
            logger.info("Seed: %d public item(s) already exist, skipping", total)
            _seeded.add("public_content")
            return

    session = requests.Session()
    if not _login(session, host, "seed-author@abc.org"):
        return

    session.post(
        f"{host}/api/user/setIsAuthor",
        json={"isAuthor": True},
        headers={"Content-Type": "application/json"},
    )

    created = 0
    for i in range(n):
        content_id = _create_content(session, host, f"Seeded Public Activity {i + 1}")
        if content_id:
            session.post(
                f"{host}/api/share/setContentIsPublic",
                json={"contentId": content_id, "isPublic": True},
                headers={"Content-Type": "application/json"},
            )
            created += 1

    logger.info("Seed: created %d public activity/activities", created)
    _seeded.add("public_content")


# ---------------------------------------------------------------------------
# Seed: anonymous student assignment
# ---------------------------------------------------------------------------

def seed_anonymous_assignment(host: str) -> None:
    """
    Creates one assignment and stores its classCode in seeded_data["anonymous_class_code"]
    so AnonymousStudentUser.on_start can resolve it via GET /api/code/:code.

    Uses seed-teacher@abc.org so the assignment is separate from the student
    and instructor seed accounts.
    """
    if "anonymous_assignment" in _seeded:
        return

    session = requests.Session()
    if not _login(session, host, "seed-teacher@abc.org"):
        return

    session.post(
        f"{host}/api/user/setIsAuthor",
        json={"isAuthor": True},
        headers={"Content-Type": "application/json"},
    )

    content_id = _create_content(session, host, "Seeded Anonymous Student Assignment")
    if not content_id:
        logger.warning("Seed: could not create content for anonymous assignment")
        return

    closed_on = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    r = session.post(
        f"{host}/api/assign/createAssignment",
        json={"contentId": content_id, "closedOn": closed_on, "destinationParentId": None},
        headers={"Content-Type": "application/json"},
    )
    if r.status_code != 200:
        logger.warning("Seed: createAssignment failed for anonymous seed (status %s)", r.status_code)
        return

    class_code = r.json().get("classCode")
    if not class_code:
        logger.warning("Seed: no classCode in createAssignment response")
        return

    seeded_data["anonymous_class_code"] = class_code
    logger.info("Seed: anonymous assignment ready with classCode %s", class_code)
    _seeded.add("anonymous_assignment")
