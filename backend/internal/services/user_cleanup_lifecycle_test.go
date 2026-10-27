package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// fakeLifecycleRepo records lifecycle mutations for assertions.
type fakeLifecycleRepo struct {
	stage1Candidates []*models.User
	stage2Candidates []*models.User
	stage3Candidates []*models.User
	blockCandidates  []*models.User
	deleteCandidates []*models.User

	updateStageCalls []int
	blockedCalls     []uuid.UUID
	anonymizeCalls   []uuid.UUID
}

func (f *fakeLifecycleRepo) FindStage1WarningCandidates(context.Context, time.Time) ([]*models.User, error) {
	return f.stage1Candidates, nil
}

func (f *fakeLifecycleRepo) FindStage2WarningCandidates(context.Context, time.Time, time.Time) ([]*models.User, error) {
	return f.stage2Candidates, nil
}

func (f *fakeLifecycleRepo) FindStage3WarningCandidates(context.Context, time.Time, time.Time) ([]*models.User, error) {
	return f.stage3Candidates, nil
}

func (f *fakeLifecycleRepo) FindBlockCandidates(context.Context, time.Time) ([]*models.User, error) {
	return f.blockCandidates, nil
}

func (f *fakeLifecycleRepo) FindHardDeleteCandidates(context.Context, time.Time) ([]*models.User, error) {
	return f.deleteCandidates, nil
}

func (f *fakeLifecycleRepo) UpdateInactivityStage(_ context.Context, _ uuid.UUID, stage int) error {
	f.updateStageCalls = append(f.updateStageCalls, stage)
	return nil
}

func (f *fakeLifecycleRepo) BlockUserForInactivity(_ context.Context, id uuid.UUID) error {
	f.blockedCalls = append(f.blockedCalls, id)
	return nil
}

func (f *fakeLifecycleRepo) AnonymizeUserForRetention(_ context.Context, id uuid.UUID) error {
	f.anonymizeCalls = append(f.anonymizeCalls, id)
	return nil
}

// fakeLifecycleEmailer simulates warning-email delivery.
type fakeLifecycleEmailer struct {
	err   error
	calls int
}

func (f *fakeLifecycleEmailer) SendInactivityWarningLocalized(_, _, _ string, _ int) error {
	f.calls++
	return f.err
}

func inactiveLifecycleUser() *models.User {
	return &models.User{ID: uuid.New(), Email: "inactive@test.dev", Name: "Inactive", PreferredLanguage: "es"}
}

// S3 (audit): the inactivity lifecycle must never advance a warning stage
// when the warning email was not delivered — otherwise a persistent email
// outage silently walks every inactive user toward block+deletion without
// any notice.
func TestRunLifecycleCleanup_EmailFailureDoesNotAdvanceStage(t *testing.T) {
	repo := &fakeLifecycleRepo{stage1Candidates: []*models.User{inactiveLifecycleUser()}}
	emailer := &fakeLifecycleEmailer{err: errors.New("resend unavailable")}

	svc := NewUserCleanupService(repo, emailer)
	res, err := svc.RunLifecycleCleanup(context.Background())
	if err != nil {
		t.Fatalf("RunLifecycleCleanup() error = %v", err)
	}
	if emailer.calls != 1 {
		t.Fatalf("warning email attempts = %d, want 1", emailer.calls)
	}
	if len(repo.updateStageCalls) != 0 {
		t.Fatalf("stage must not advance when the warning email fails; got stage updates %v", repo.updateStageCalls)
	}
	if res.Stage1Count != 0 {
		t.Fatalf("Stage1Count = %d, want 0 on email failure", res.Stage1Count)
	}
}

func TestRunLifecycleCleanup_EmailSuccessAdvancesStage(t *testing.T) {
	repo := &fakeLifecycleRepo{stage1Candidates: []*models.User{inactiveLifecycleUser()}}
	emailer := &fakeLifecycleEmailer{}

	svc := NewUserCleanupService(repo, emailer)
	res, err := svc.RunLifecycleCleanup(context.Background())
	if err != nil {
		t.Fatalf("RunLifecycleCleanup() error = %v", err)
	}
	if len(repo.updateStageCalls) != 1 || repo.updateStageCalls[0] != 1 {
		t.Fatalf("expected stage 1 advance on delivered email, got %v", repo.updateStageCalls)
	}
	if res.Stage1Count != 1 {
		t.Fatalf("Stage1Count = %d, want 1", res.Stage1Count)
	}
}

// S3 (audit): the delivery gate applies to every warning stage — a full
// outage must freeze the whole lifecycle, and recovery must advance each
// stage exactly once.
func TestRunLifecycleCleanup_GateAppliesToAllStages(t *testing.T) {
	repo := &fakeLifecycleRepo{
		stage1Candidates: []*models.User{inactiveLifecycleUser()},
		stage2Candidates: []*models.User{inactiveLifecycleUser()},
		stage3Candidates: []*models.User{inactiveLifecycleUser()},
	}

	// Outage: no stage advances at all.
	emailer := &fakeLifecycleEmailer{err: errors.New("resend down")}
	svc := NewUserCleanupService(repo, emailer)
	res, err := svc.RunLifecycleCleanup(context.Background())
	if err != nil {
		t.Fatalf("RunLifecycleCleanup() error = %v", err)
	}
	if len(repo.updateStageCalls) != 0 {
		t.Fatalf("outage must freeze all stages; got advances %v", repo.updateStageCalls)
	}
	if res.Stage1Count+res.Stage2Count+res.Stage3Count != 0 {
		t.Fatalf("counts must stay zero during outage, got %+v", res)
	}
	if emailer.calls != 3 {
		t.Fatalf("each candidate must get one delivery attempt, got %d", emailer.calls)
	}

	// Recovery: every stage advances exactly once.
	repo.updateStageCalls = nil
	svc = NewUserCleanupService(repo, &fakeLifecycleEmailer{})
	if _, err := svc.RunLifecycleCleanup(context.Background()); err != nil {
		t.Fatalf("RunLifecycleCleanup() error = %v", err)
	}
	if len(repo.updateStageCalls) != 3 || repo.updateStageCalls[0] != 1 || repo.updateStageCalls[1] != 2 || repo.updateStageCalls[2] != 3 {
		t.Fatalf("expected advances [1 2 3] after recovery, got %v", repo.updateStageCalls)
	}
}

// Without an emailer configured (embedded/test setups) the lifecycle keeps
// moving; only delivery failures gate stage advancement.
func TestRunLifecycleCleanup_NilEmailerAdvancesStage(t *testing.T) {
	repo := &fakeLifecycleRepo{stage1Candidates: []*models.User{inactiveLifecycleUser()}}

	svc := NewUserCleanupService(repo, nil)
	if _, err := svc.RunLifecycleCleanup(context.Background()); err != nil {
		t.Fatalf("RunLifecycleCleanup() error = %v", err)
	}
	if len(repo.updateStageCalls) != 1 || repo.updateStageCalls[0] != 1 {
		t.Fatalf("expected stage 1 advance with nil emailer, got %v", repo.updateStageCalls)
	}
}
