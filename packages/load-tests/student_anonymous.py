from locust import HttpUser, events, task, between
import random

from seed import seed_anonymous_assignment, seeded_data


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    seed_anonymous_assignment(environment.host or AnonymousStudentUser.host)


class AnonymousStudentUser(HttpUser):
    """
    Simulates a student who has no account but was given a class code by an
    instructor. They log in anonymously, join the assignment via the code, and
    complete the work entirely without creating a registered account.
    """

    host = "https://dev3.doenet.org"
    wait_time = between(1, 3)

    def on_start(self):
        self.assignment_content_id = None

        # Create an anonymous session
        self.client.post(
            "/api/login/anonymous",
            headers={"Content-Type": "application/json"},
        )

        class_code = seeded_data.get("anonymous_class_code")
        if not class_code:
            return

        # Resolve the class code to the assignment's contentId
        r = self.client.get(
            f"/api/code/{class_code}",
            name="/api/code/[classCode]",
        )
        if r.status_code != 200:
            return
        self.assignment_content_id = r.json().get("contentId")
        if not self.assignment_content_id:
            return

        # Start the first attempt — this enrolls the anonymous user in the assignment.
        self.client.post(
            "/api/score/createNewAttempt",
            json={"contentId": self.assignment_content_id, "variant": 1, "state": None},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Doing work (highest weight — the core anonymous student action)
    # ------------------------------------------------------------------

    @task(3)
    def do_work(self):
        if not self.assignment_content_id:
            return
        self.client.get(
            "/api/score/loadState",
            params={"contentId": self.assignment_content_id},
            name="/api/score/loadState",
        )
        self.client.post(
            "/api/score/saveScoreAndState",
            json={
                "contentId": self.assignment_content_id,
                "attemptNumber": 1,
                "score": round(random.uniform(0.5, 1.0), 2),
                "state": "{}",
                "variant": 1,
            },
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Viewing the activity
    # ------------------------------------------------------------------

    @task(2)
    def view_activity(self):
        if not self.assignment_content_id:
            return
        self.client.get(
            f"/api/activityEditView/getActivityViewerData/{self.assignment_content_id}",
            name="/api/activityEditView/getActivityViewerData/[contentId]",
        )

    # ------------------------------------------------------------------
    # Starting a new attempt (only valid if instructor set maxAttempts > 1)
    # ------------------------------------------------------------------

    @task(1)
    def check_assignment_score(self):
        """Check own score on the assignment — what a student does after submitting."""
        if not self.assignment_content_id:
            return
        self.client.get(
            "/api/score/loadState",
            params={"contentId": self.assignment_content_id},
            name="/api/score/loadState",
        )

    # ------------------------------------------------------------------
    # Occasional browsing before or after the assignment
    # ------------------------------------------------------------------

    @task(1)
    def browse_explore(self):
        self.client.post(
            "/api/explore/browseExplore",
            json={"categories": [], "isUnclassified": False},
            headers={"Content-Type": "application/json"},
        )
