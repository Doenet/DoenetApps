from locust import HttpUser, task, between
import random


class AuthorUser(HttpUser):
    """
    Simulates a content author whose primary activity is creating and refining
    educational activities: writing DoenetML, iterating on revisions, classifying
    content, and publishing it for others to use.

    Uses the test login endpoint so a stable user account exists in the DB.
    Content created during the run is real DB state — keep create_content weight
    moderate to avoid excessive DB growth in short runs.
    """

    host = "https://dev3.doenet.org"
    wait_time = between(1, 3)


    def on_start(self):
        self.user_id = None
        self.content_ids = []

        self.client.post(
            "/api/login/createOrLoginAsTest",
            json={"email": "author@abc.org"},
            headers={"Content-Type": "application/json"},
        )
        self.client.post(
            "/api/user/setIsAuthor",
            json={"isAuthor": True},
            headers={"Content-Type": "application/json"},
        )
        response = self.client.get("/api/user/getMyUserInfo")
        if response.status_code == 200:
            data = response.json()
            self.user_id = data.get("userId") or data.get("user", {}).get("userId")
        if self.user_id:
            self._refresh_my_content()

    def _refresh_my_content(self):
        response = self.client.get(
            f"/api/contentList/getMyContent/{self.user_id}",
            name="/api/contentList/getMyContent/[userId]",
        )
        if response.status_code == 200:
            items = response.json().get("content", [])
            self.content_ids = [
                i["contentId"]
                for i in items
                if i.get("type") != "folder" and not i.get("assignmentInfo")
            ]

    # ------------------------------------------------------------------
    # Creating new content — the author's primary action
    # ------------------------------------------------------------------

    @task(3)
    def create_content(self):
        """Create a new activity and immediately start editing it."""
        response = self.client.post(
            "/api/updateContent/createContent",
            json={"contentType": "singleDoc", "parentId": None},
            headers={"Content-Type": "application/json"},
        )
        if response.status_code != 200:
            return
        data = response.json()
        content_id = data.get("contentId") or data.get("id")
        if not content_id:
            return
        self.content_ids.append(content_id)

        # Open the editor immediately after creating
        self.client.get(
            f"/api/editor/getEditor/{content_id}",
            name="/api/editor/getEditor/[contentId]",
        )
        self.client.post(
            "/api/updateContent/saveDoenetML",
            json={"contentId": content_id, "doenetML": "<p>Load test content</p>", "numVariants": 1},
            headers={"Content-Type": "application/json"},
        )
        self.client.post(
            "/api/updateContent/updateContentSettings",
            json={"contentId": content_id, "name": "Load Test Activity"},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Iterating on existing content
    # ------------------------------------------------------------------

    @task(3)
    def edit_existing_content(self):
        """Open an existing activity in the editor and save updated markup."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.get(
            f"/api/editor/getEditor/{content_id}",
            name="/api/editor/getEditor/[contentId]",
        )
        self.client.get(
            f"/api/editor/getDocEditorDoenetML/{content_id}",
            name="/api/editor/getDocEditorDoenetML/[contentId]",
        )
        self.client.post(
            "/api/updateContent/saveDoenetML",
            json={"contentId": content_id, "doenetML": "<p>Updated load test content</p>", "numVariants": 1},
            headers={"Content-Type": "application/json"},
        )

    @task(2)
    def save_revision(self):
        """Checkpoint work as a named revision."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/updateContent/createContentRevision",
            json={"contentId": content_id, "revisionName": "Load test checkpoint", "note": "Load test revision"},
            headers={"Content-Type": "application/json"},
        )

    @task(1)
    def view_revision_history(self):
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.get(
            f"/api/editor/getDocEditorHistory/{content_id}",
            name="/api/editor/getDocEditorHistory/[contentId]",
        )

    # ------------------------------------------------------------------
    # Classifying and publishing
    # ------------------------------------------------------------------

    @task(2)
    def classify_content(self):
        """Search for and apply a classification tag to content."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        terms = ["algebra", "calculus", "geometry", "statistics"]
        response = self.client.get(
            "/api/classifications/searchPossibleClassifications",
            params={"query": random.choice(terms)},
        )
        if response.status_code == 200:
            results = response.json()
            if isinstance(results, list) and results:
                classification_id = results[0].get("id")
                if classification_id:
                    self.client.post(
                        "/api/classifications/addClassification",
                        json={"contentId": content_id, "classificationId": classification_id},
                        headers={"Content-Type": "application/json"},
                    )

    @task(1)
    def publish_content(self):
        """Make a finished activity publicly visible."""
        if not self.content_ids:
            return
        content_id = random.choice(self.content_ids)
        self.client.post(
            "/api/share/setContentIsPublic",
            json={"contentId": content_id, "isPublic": True},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Browsing for inspiration and remixing
    # ------------------------------------------------------------------

    @task(2)
    def browse_explore(self):
        """Browse public content for inspiration or remixable material."""
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
                # Drill into one result to evaluate it for remixing
                self.client.get(
                    f"/api/activityEditView/getActivityViewerData/{random.choice(public_ids)}",
                    name="/api/activityEditView/getActivityViewerData/[contentId]",
                )

    @task(1)
    def browse_my_content(self):
        if self.user_id:
            self._refresh_my_content()
