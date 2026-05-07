# Load Testing

[Locust](https://locust.io/) load tests for Doenet. Each file simulates a distinct user persona with realistic endpoint sequences.

## Files

| File                   | Persona                                                                | Auth                              |
| ---------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `guest.py`             | Unauthenticated visitor browsing public content — no account, no login | None                              |
| `student_anonymous.py` | Student with no account who joins an assignment via a class code       | Anonymous login                   |
| `student.py`           | Registered student completing assigned activities and checking scores  | Test login (`student@abc.org`)    |
| `instructor.py`        | Instructor creating assignments and reviewing grades                   | Test login (`instructor@abc.org`) |
| `author.py`            | Author creating and iterating on educational content                   | Test login (`author@abc.org`)     |
| `seed.py`              | Pre-test data seeding (not a test file)                                | Various seed accounts             |

## Prerequisites

Install Locust:

```bash
pip install locust
```

The test login endpoint (`POST /api/login/createOrLoginAsTest`) must be enabled on the target server. This requires the `ENABLE_TEST_AUTH_BYPASS` environment variable to be set.

## Running

**Single persona:**

```bash
locust -f guest.py
```

**All personas together** (recommended for realistic mixed traffic):

```bash
locust
```

A `locust.conf` in this package sets all five files and the default host, so no arguments are needed. You can still override on the command line — e.g. `locust --config locust.conf --host https://staging.doenet.org`.

To run headless (no UI):

```bash
locust -f guest.py --headless -u 50 -r 5 --run-time 2m
```

## Test Data Seeding

Each file registers a `@events.test_start` hook that runs **once before any virtual users spawn**. The hooks call functions in `seed.py` to ensure the required data exists:

| Seed function               | What it creates                                         | Used by                |
| --------------------------- | ------------------------------------------------------- | ---------------------- |
| `seed_public_content`       | Public activities browsable via explore                 | `guest.py`             |
| `seed_anonymous_assignment` | One assignment; stores its `classCode` in `seeded_data` | `student_anonymous.py` |
| `seed_student_assignments`  | Assignments enrolled for `student@abc.org`              | `student.py`           |
| `seed_instructor_content`   | Activities in `instructor@abc.org`'s library            | `instructor.py`        |

Seed functions are **idempotent** — they check for existing data first and skip creation if enough already exists. Running multiple files together is safe; each seed runs at most once per process.

### Student enrollment

The student seed replicates the real enrollment flow:

1. Creates content and an assignment as `seed-teacher@abc.org` → receives a numeric `classCode`
2. Logs in as `student@abc.org` and calls `GET /api/code/:classCode` to resolve the assignment
3. Calls `POST /api/score/createNewAttempt` to create the state record that makes the assignment appear in the student's list

## Seed accounts

| Account                | Role                                     |
| ---------------------- | ---------------------------------------- |
| `seed-teacher@abc.org` | Creates assignments for student seeding  |
| `seed-author@abc.org`  | Creates public content for guest seeding |
| `student@abc.org`      | Student persona                          |
| `instructor@abc.org`   | Instructor persona                       |
| `author@abc.org`       | Author persona                           |
