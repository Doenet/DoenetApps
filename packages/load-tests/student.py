from locust import HttpUser, events, task, between
import random

from seed import seed_student_assignments


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    seed_student_assignments(environment.host or StudentUser.host)


class StudentUser(HttpUser):
    """
    Simulates a student checking their assigned work, completing activities,
    saving progress, and reviewing their scores.

    seed.py ensures assignments exist for student@abc.org before users spawn.
    Tasks that depend on assignment/content data skip gracefully if seeding
    failed or data is genuinely absent.
    """

    host = "https://dev3.doenet.org"
    wait_time = between(1, 3)

    def on_start(self):
        self.user_id = None
        self.content_ids = []
        self.parent_ids = []

        # Authenticate
        self.client.post(
            "/api/login/createOrLoginAsTest",
            json={"email": "student@abc.org"},
            headers={"Content-Type": "application/json"},
        )

        # Load user identity
        response = self.client.get("/api/user/getMyUserInfo")
        if response.status_code == 200:
            data = response.json()
            self.user_id = data.get("userId") or data.get("user", {}).get("userId")

        # Seed assignment and content lists used by tasks below
        self._refresh_assignments()

    def _refresh_assignments(self):
        response = self.client.get("/api/assign/getAssigned")
        if response.status_code == 200:
            data = response.json()
            assignments = data.get("assignments", [])
            self.content_ids = [a["contentId"] for a in assignments if "contentId" in a]
            self.parent_ids = list({a["parentId"] for a in assignments if "parentId" in a})

    # ------------------------------------------------------------------
    # Assignment discovery
    # ------------------------------------------------------------------

    @task(2)
    def check_assignments(self):
        self._refresh_assignments()

    @task(2)
    def open_assignment(self):
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.get(
            f"/api/assign/getAssignmentData/{content_id}",
            name="/api/assign/getAssignmentData/[assignmentId]",
        )
        self.client.get(
            f"/api/activityEditView/getActivityViewerData/{content_id}",
            name="/api/activityEditView/getActivityViewerData/[contentId]",
        )

    # ------------------------------------------------------------------
    # Doing work (highest weight — this is the core student action)
    # ------------------------------------------------------------------

    @task(3)
    def do_work(self):
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        # Load existing state before working; captures current attemptNumber
        response = self.client.get(
            "/api/score/loadState",
            params={"contentId": content_id},
            name="/api/score/loadState",
        )
        attempt_number = 1
        variant = 1
        if response.status_code == 200:
            data = response.json()
            attempt_number = data.get("attemptNumber", 1)
            variant = data.get("variant", 1)
        # Save updated state and score after working
        self.client.post(
            "/api/score/saveScoreAndState",
            json={
                "contentId": content_id,
                "attemptNumber": attempt_number,
                "score": round(random.uniform(0.5, 1.0), 2),
                "state": "{}",
                "variant": variant,
            },
            headers={"Content-Type": "application/json"},
        )

    @task(1)
    def new_attempt(self):
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/score/createNewAttempt",
            json={"contentId": content_id, "variant": 1, "state": None},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Reviewing scores
    # ------------------------------------------------------------------

    @task(2)
    def check_scores(self):
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.get("/api/score/getScore", params={"contentId": content_id}, name="/api/score/getScore?contentId=[contentId]")
        self.client.get("/api/assign/getAssignedScores")

    # ------------------------------------------------------------------
    # Occasional browsing between assignments
    # ------------------------------------------------------------------

    @task(1)
    def browse_explore(self):
        self.client.post(
            "/api/explore/browseExplore",
            json={"categories": [], "isUnclassified": False},
            headers={"Content-Type": "application/json"},
        )
