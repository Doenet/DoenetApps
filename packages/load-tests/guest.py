from locust import HttpUser, events, task, between
import random

from seed import seed_public_content


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    seed_public_content(environment.host or GuestUser.host)


class GuestUser(HttpUser):
    """
    Simulates a fully unauthenticated visitor browsing and discovering public
    content — no account, no login, no class code.
    """

    host = "https://dev3.doenet.org"
    wait_time = between(1, 3)

    def on_start(self):
        self.content_ids = []

    # ------------------------------------------------------------------
    # Visit homepage
    # ------------------------------------------------------------------
    @task(1)
    def get_homepage(self):
        response = self.client.get("/")


    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    @task(3)
    def browse_explore(self):
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
            self.content_ids = [item["contentId"] for item in items if "contentId" in item]

    @task(2)
    def search_explore(self):
        terms = ["algebra", "calculus", "geometry", "statistics", "functions"]
        self.client.post(
            "/api/explore/searchExplore",
            json={"query": random.choice(terms), "categories": []},
            headers={"Content-Type": "application/json"},
        )

    # ------------------------------------------------------------------
    # Content viewing
    # ------------------------------------------------------------------

    @task(3)
    def view_activity(self):
        if self.content_ids:
            content_id = random.choice(self.content_ids)
            self.client.get(
                f"/api/activityEditView/getActivityViewerData/{content_id}",
                name="/api/activityEditView/getActivityViewerData/[contentId]",
            )

    @task(2)
    def get_public_content(self):
        if self.content_ids:
            content_id = random.choice(self.content_ids)
            self.client.get(
                f"/api/activityEditView/getPublicContent/{content_id}",
                name="/api/activityEditView/getPublicContent/[contentId]",
            )

    @task(1)
    def get_content_source(self):
        if self.content_ids:
            content_id = random.choice(self.content_ids)
            self.client.get(
                f"/api/activityEditView/getContentSource/{content_id}",
                name="/api/activityEditView/getContentSource/[contentId]",
            )

    # ------------------------------------------------------------------
    # Metadata / info
    # ------------------------------------------------------------------

    @task(1)
    def get_user_info(self):
        self.client.get("/api/user/getMyUserInfo")

    @task(1)
    def get_classifications(self):
        self.client.get("/api/classifications/getClassificationCategories")
