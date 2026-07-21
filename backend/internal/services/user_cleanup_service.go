package services

import (
	"context"
	"log/slog"
	"time"

	"github.com/tiagofur/solennix-backend/internal/repository"
)

type CleanupResult struct {
	Stage1Count  int `json:"stage1_count"`
	Stage2Count  int `json:"stage2_count"`
	Stage3Count  int `json:"stage3_count"`
	BlockedCount int `json:"blocked_count"`
	DeletedCount int `json:"deleted_count"`
}

type UserCleanupService struct {
	cleanupRepo *repository.UserCleanupRepo
	emailSvc    *EmailService
}

func NewUserCleanupService(cleanupRepo *repository.UserCleanupRepo, emailSvc *EmailService) *UserCleanupService {
	return &UserCleanupService{
		cleanupRepo: cleanupRepo,
		emailSvc:    emailSvc,
	}
}

// RunLifecycleCleanup executes the 5 stages of inactive user account cleanup:
// 1. Stage 1 (90 days inactive): send 1st warning email -> set stage = 1
// 2. Stage 2 (120 days inactive): send 2nd warning email -> set stage = 2
// 3. Stage 3 (150 days inactive): send final warning email -> set stage = 3
// 4. Soft Block (180 days inactive): set account_status = 'blocked', blocked_at = NOW(), deletion_eligible_at = NOW() + 30 days
// 5. Hard Delete (after retention period / 210 days total): DELETE FROM users
func (s *UserCleanupService) RunLifecycleCleanup(ctx context.Context) (*CleanupResult, error) {
	now := time.Now().UTC()
	res := &CleanupResult{}

	// Stage 1: 90 days inactive
	stage1Cutoff := now.AddDate(0, 0, -90)
	c1, err := s.cleanupRepo.FindStage1WarningCandidates(ctx, stage1Cutoff)
	if err != nil {
		slog.Error("Failed to query stage 1 warning candidates", "error", err)
	} else {
		for _, u := range c1 {
			if s.emailSvc != nil {
				if err := s.emailSvc.SendInactivityWarningLocalized(u.Email, u.Name, u.PreferredLanguage, 1); err != nil {
					slog.Error("Failed to send stage 1 inactivity warning email", "userID", u.ID, "error", err)
				}
			}
			if err := s.cleanupRepo.UpdateInactivityStage(ctx, u.ID, 1); err != nil {
				slog.Error("Failed to update inactivity stage 1", "userID", u.ID, "error", err)
			} else {
				res.Stage1Count++
			}
		}
	}

	// Stage 2: 120 days inactive
	stage2Cutoff := now.AddDate(0, 0, -120)
	minWarningAge := now.AddDate(0, 0, -25)
	c2, err := s.cleanupRepo.FindStage2WarningCandidates(ctx, stage2Cutoff, minWarningAge)
	if err != nil {
		slog.Error("Failed to query stage 2 warning candidates", "error", err)
	} else {
		for _, u := range c2 {
			if s.emailSvc != nil {
				if err := s.emailSvc.SendInactivityWarningLocalized(u.Email, u.Name, u.PreferredLanguage, 2); err != nil {
					slog.Error("Failed to send stage 2 inactivity warning email", "userID", u.ID, "error", err)
				}
			}
			if err := s.cleanupRepo.UpdateInactivityStage(ctx, u.ID, 2); err != nil {
				slog.Error("Failed to update inactivity stage 2", "userID", u.ID, "error", err)
			} else {
				res.Stage2Count++
			}
		}
	}

	// Stage 3: 150 days inactive
	stage3Cutoff := now.AddDate(0, 0, -150)
	c3, err := s.cleanupRepo.FindStage3WarningCandidates(ctx, stage3Cutoff, minWarningAge)
	if err != nil {
		slog.Error("Failed to query stage 3 warning candidates", "error", err)
	} else {
		for _, u := range c3 {
			if s.emailSvc != nil {
				if err := s.emailSvc.SendInactivityWarningLocalized(u.Email, u.Name, u.PreferredLanguage, 3); err != nil {
					slog.Error("Failed to send stage 3 inactivity warning email", "userID", u.ID, "error", err)
				}
			}
			if err := s.cleanupRepo.UpdateInactivityStage(ctx, u.ID, 3); err != nil {
				slog.Error("Failed to update inactivity stage 3", "userID", u.ID, "error", err)
			} else {
				res.Stage3Count++
			}
		}
	}

	// Stage 4: Soft block (180 days inactive)
	blockCutoff := now.AddDate(0, 0, -180)
	cBlock, err := s.cleanupRepo.FindBlockCandidates(ctx, blockCutoff)
	if err != nil {
		slog.Error("Failed to query block candidates", "error", err)
	} else {
		for _, u := range cBlock {
			if err := s.cleanupRepo.BlockUserForInactivity(ctx, u.ID); err != nil {
				slog.Error("Failed to soft-block inactive user", "userID", u.ID, "error", err)
			} else {
				slog.Info("User soft-blocked due to 180 days inactivity", "userID", u.ID, "email", u.Email)
				res.BlockedCount++
			}
		}
	}

	// Stage 5: Hard delete (retention period elapsed)
	cDelete, err := s.cleanupRepo.FindHardDeleteCandidates(ctx, now)
	if err != nil {
		slog.Error("Failed to query hard delete candidates", "error", err)
	} else {
		for _, u := range cDelete {
			if err := s.cleanupRepo.HardDeleteUser(ctx, u.ID); err != nil {
				slog.Error("Failed to hard delete user", "userID", u.ID, "error", err)
			} else {
				slog.Info("User hard deleted after retention period elapsed", "userID", u.ID, "email", u.Email)
				res.DeletedCount++
			}
		}
	}

	return res, nil
}
