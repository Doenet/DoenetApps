from locust import HttpUser, events, task, between
import random
from datetime import datetime, timezone, timedelta

from seed import seed_instructor_content


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    seed_instructor_content(environment.host or InstructorUser.host)


class InstructorUser(HttpUser):
    """
    Simulates an instructor whose primary activity is deploying existing content
    as assignments, monitoring student progress, and reviewing responses.
    Instructors use content that already exists — they do not author it.

    seed.py populates instructor@abc.org's content library before users spawn.
    """

    host = "https://dev3.doenet.org"
    wait_time = between(1, 3)

    def on_start(self):
        self.user_id = None
        self.content_ids = []
        self.folder_ids = []
        self.assignment_ids = []
        self.student_ids = []

        self.client.post(
            "/api/login/createOrLoginAsTest",
            json={"email": "instructor@abc.org"},
            headers={"Content-Type": "application/json"},
        )
        response = self.client.get("/api/user/getMyUserInfo")
        if response.status_code == 200:
            data = response.json()
            self.user_id = data.get("userId") or data.get("user", {}).get("userId")
        if self.user_id:
            self._refresh_my_content()
        self._refresh_assignments()

    def _refresh_my_content(self):
        response = self.client.get(
            f"/api/contentList/getMyContent/{self.user_id}",
            name="/api/contentList/getMyContent/[userId]",
        )
        if response.status_code == 200:
            items = response.json().get("content", [])
            # Only keep non-folder, non-assignment activities as candidates for createAssignment.
            # Items with `assignmentInfo` are already-assigned copies; passing them to
            # createAssignment would trigger a 404 (filterEditableActivity excludes assignments).
            self.content_ids = [
                i["contentId"]
                for i in items
                if i.get("type") != "folder" and not i.get("assignmentInfo")
            ]
            self.folder_ids = [i["contentId"] for i in items if i.get("type") == "folder"]

    def _refresh_assignments(self):
        if not self.folder_ids:
            return
        folder_id = random.choice(self.folder_ids)
        response = self.client.get(
            f"/api/assign/getAllAssignmentScores/{folder_id}",
            name="/api/assign/getAllAssignmentScores/[folderId]",
        )
        if response.status_code == 200:
            data = response.json()
            self.assignment_ids = [
                a["contentId"] for a in data.get("orderedAssignments", []) if "contentId" in a
            ]
            self.student_ids = [
                s["userId"] for s in data.get("orderedStudents", []) if "userId" in s
            ]

    # ------------------------------------------------------------------
    # Finding content to use
    # ------------------------------------------------------------------

    @task(2)
    def browse_explore(self):
        """Browse public library for content to adopt into a course."""
        response = self.client.post(
            "/api/explore/browseExplore",
            json={"categories": [], "isUnclassified": False},
            headers={"Content-Type": "application/json"},
        )
        if response.status_code == 200:
            data = response.json()
            items = (
                data.get("recentContent", [])
                + data.get("trendingContent", [])
                + data.get("curatedContent", [])
            )
            public_ids = [i["contentId"] for i in items if "contentId" in i]
            if public_ids:
                # Preview one result before deciding to use it
                self.client.get(
                    f"/api/activityEditView/getActivityViewerData/{random.choice(public_ids)}",
                    name="/api/activityEditView/getActivityViewerData/[contentId]",
                )

    @task(1)
    def search_explore(self):
        terms = ["algebra", "calculus", "geometry", "statistics", "functions"]
        self.client.post(
            "/api/explore/searchExplore",
            json={"query": random.choice(terms), "categories": []},
            headers={"Content-Type": "application/json"},
        )

    @task(1)
    def copy_content_to_use(self):
        """Copy a public activity into own library for use as an assignment."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/copyMove/copyContent",
            json={"contentIds": [content_id], "parentId": None},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Setting up assignments — the instructor's primary action
    # ------------------------------------------------------------------

    @task(3)
    def create_assignment(self):
        """Assign an existing activity to students."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        closed_on = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        response = self.client.post(
            "/api/assign/createAssignment",
            json={"contentId": content_id, "closedOn": closed_on, "destinationParentId": None},
            headers={"Content-Type": "application/json"},
        )
        if response.status_code == 200:
            data = response.json()
            assignment_id = data.get("assignmentId") or data.get("id")
            if assignment_id:
                self.assignment_ids.append(assignment_id)

    @task(1)
    def configure_assignment(self):
        """Adjust deadline or attempt limits on an existing assignment."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/assign/updateAssignmentSettings",
            json={"contentId": content_id},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Monitoring student progress — instructors spend a lot of time here
    # ------------------------------------------------------------------

    @task(3)
    def review_class_grades(self):
        """Check overall assignment scores across the class roster."""
        if self.folder_ids:
            folder_id = random.choice(self.folder_ids)
            self.client.get(
                f"/api/assign/getAllAssignmentScores/{folder_id}",
                name="/api/assign/getAllAssignmentScores/[folderId]",
            )

    @task(2)
    def review_assignment_responses(self):
        """Drill into response-level detail for a specific assignment."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.get(
            f"/api/assign/getAssignmentResponseOverview/{content_id}",
            name="/api/assign/getAssignmentResponseOverview/[contentId]",
        )

    @task(1)
    def view_student_scores(self):
        """Look up scores for a specific student."""
        if not self.student_ids:
            return
        student_id = random.choice(self.student_ids)
        self.client.get(
            f"/api/assign/getStudentAssignmentScores/{student_id}",
            name="/api/assign/getStudentAssignmentScores/[userId]",
        )

    # ------------------------------------------------------------------
    # Sharing content with co-instructors or students
    # ------------------------------------------------------------------

    @task(1)
    def share_with_colleague(self):
        """Share content with the seeded student account (guaranteed to exist in DB)."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/share/shareContent",
            json={"contentId": content_id, "email": "student@abc.org"},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Housekeeping
    # ------------------------------------------------------------------

    @task(1)
    def browse_my_content(self):
        if self.user_id:
            self._refresh_my_content()
