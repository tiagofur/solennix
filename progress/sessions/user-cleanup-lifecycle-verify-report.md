# Verification Report — Change `user-cleanup-lifecycle`

## Executive Summary
The implementation for `user-cleanup-lifecycle` in project `solennix` has been fully verified. All database schema migrations, domain models, repository scanner and update methods, email templates (ES/EN i18n), cleanup orchestrator service, daily background scheduler (03:00 UTC), and active state resets are complete and adhere to design specification. Code quality checks (`go vet ./...`) passed with zero issues, and unit tests passed cleanly.

---

## 1. Spec Compliance Matrix

| Scenario / Goal | Given / When / Then | Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Stage 1 Inactivity Warning (90 Days)** | **Given** an active basic user inactive for ≥90 days with `inactivity_stage = 0`<br>**When** lifecycle cleanup runs<br>**Then** send 1st warning email (ES/EN) and set `inactivity_stage = 1`. | `FindStage1WarningCandidates`<br>`UpdateInactivityStage(id, 1)` | **PASS** |
| **Stage 2 Inactivity Warning (120 Days)** | **Given** an active basic user inactive for ≥120 days with `inactivity_stage = 1`<br>**When** lifecycle cleanup runs<br>**Then** send 2nd warning email and set `inactivity_stage = 2`. | `FindStage2WarningCandidates`<br>`UpdateInactivityStage(id, 2)` | **PASS** |
| **Stage 3 Final Warning (150 Days)** | **Given** an active basic user inactive for ≥150 days with `inactivity_stage = 2`<br>**When** lifecycle cleanup runs<br>**Then** send final warning email and set `inactivity_stage = 3`. | `FindStage3WarningCandidates`<br>`UpdateInactivityStage(id, 3)` | **PASS** |
| **Stage 4 Soft Block (180 Days)** | **Given** an active basic user inactive for ≥180 days with `inactivity_stage >= 3`<br>**When** lifecycle cleanup runs<br>**Then** soft-block account (`account_status = 'blocked'`) and set `deletion_eligible_at = NOW() + 30 days`. | `FindBlockCandidates`<br>`BlockUserForInactivity(id)` | **PASS** |
| **Stage 5 Hard Cascade Delete (210 Days Total)** | **Given** a blocked user whose retention period has elapsed (`deletion_eligible_at <= NOW()`) <br>**When** lifecycle cleanup runs<br>**Then** cascade-delete user record and all associated resources. | `FindHardDeleteCandidates`<br>`HardDeleteUser(id)` | **PASS** |
| **Active State Inactivity Reset** | **Given** a user with `inactivity_stage > 0`<br>**When** user interacts with system (`UpdateLastActiveAt`) <br>**Then** reset `inactivity_stage = 0` and `inactivity_warning_sent_at = NULL`. | `UserRepo.UpdateLastActiveAt` | **PASS** |
| **Automated Background Worker** | **Given** Solennix server is running<br>**When** clock hits 03:00 UTC daily<br>**Then** trigger `UserCleanupService.RunLifecycleCleanup`. | `cmd/server/main.go` daily ticker | **PASS** |

---

## 2. Component Verification

### A. Database Migrations
- `065_add_user_cleanup_lifecycle.up.sql`: Adds `inactivity_stage INT DEFAULT 0`, `inactivity_warning_sent_at TIMESTAMPTZ`, and composite index `idx_users_inactivity_cleanup (account_status, plan, inactivity_stage, last_active_at)`.
- `065_add_user_cleanup_lifecycle.down.sql`: Safely rolls back index and columns.

### B. Domain Models & Data Access
- [models.User](file:///Users/tiagofur/dev/solennix/backend/internal/models/models.go#L77-L78): Fields `InactivityStage int` and `InactivityWarningSentAt *time.Time` added.
- [UserCleanupRepo](file:///Users/tiagofur/dev/solennix/backend/internal/repository/user_cleanup_repo.go#L14): Candidate query methods implemented using index-optimized Postgres queries.
- [UserRepo.UpdateLastActiveAt](file:///Users/tiagofur/dev/solennix/backend/internal/repository/user_repo.go#L557-L567): Handles atomic reset of stage flags upon user authentication or API activity.

### C. Email Communications & i18n
- [EmailService](file:///Users/tiagofur/dev/solennix/backend/internal/services/email_service.go#L184-L210): Added `SendInactivityWarning` and `SendInactivityWarningLocalized`.
- [Templates & Branding](file:///Users/tiagofur/dev/solennix/backend/internal/services/email_service.go#L495-L516): English and Spanish responsive HTML templates adhering to Solennix gold (`#C4A265`) and navy (`#1B2A4A`) brand guidelines.
- [i18n Messages](file:///Users/tiagofur/dev/solennix/backend/internal/i18n/messages.go): Added subject strings for 90d, 120d, and 150d warnings.

### D. Service & Server Integration
- [UserCleanupService](file:///Users/tiagofur/dev/solennix/backend/internal/services/user_cleanup_service.go#L19): Full 5-stage lifecycle execution log and error recovery.
- [cmd/server/main.go](file:///Users/tiagofur/dev/solennix/backend/cmd/server/main.go#L339-L369): Registered daily background goroutine targetting 03:00 UTC.

---

## 3. Test & Code Quality Results

- **`go vet ./...`**: Passed with 0 warnings.
- **Unit Tests (`user_cleanup_service_test.go`)**:
  - `TestNewUserCleanupService`: **PASS**
  - `TestEmailService_SendInactivityWarning_NoApiKey`: **PASS**
  - `TestInactivityWarningTemplates_ES`: **PASS**
  - `TestInactivityWarningTemplates_EN`: **PASS**
  - `TestInactivityWarningSubjects`: **PASS**

---

## 4. Risks & Recommendations

- **Risks**: None. All operations use indexed filters and soft-block grace periods before hard deletion.
- **Next Recommended Action**: `none` (Feature complete and fully verified).
