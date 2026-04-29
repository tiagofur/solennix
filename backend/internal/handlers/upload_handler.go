package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/storage"
)

// UploadHandler handles image uploads, organizing files by user ID.
type UploadHandler struct {
	uploadDir string
	userRepo  UserRepository
	storage   storage.Provider // optional, falls back to legacy disk write
}

type presignImageRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type completePresignedUploadRequest struct {
	ObjectKey string `json:"object_key"`
}

func NewUploadHandler(uploadDir string, userRepo UserRepository) *UploadHandler {
	// Ensure base upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("Failed to create upload directory", "dir", uploadDir, "error", err)
	}
	return &UploadHandler{
		uploadDir: uploadDir,
		userRepo:  userRepo,
		storage:   storage.NewLocalProvider(uploadDir, "/api/uploads"),
	}
}

// SetStorageProvider configures the file storage backend.
func (h *UploadHandler) SetStorageProvider(p storage.Provider) {
	h.storage = p
}

// maxUploadsForPlan returns the maximum number of uploads allowed per user based on plan.
func maxUploadsForPlan(plan string) int {
	switch plan {
	case "pro":
		return 200
	default: // basic
		return 50
	}
}

// countUserUploads counts the number of files in a user's upload directory.
func countUserUploads(userDir string) int {
	entries, err := os.ReadDir(userDir)
	if err != nil {
		return 0 // Directory doesn't exist yet, 0 uploads
	}
	count := 0
	for _, e := range entries {
		if !e.IsDir() {
			count++
		}
	}
	return count
}

// UploadImage handles POST /api/uploads/image
// Accepts multipart/form-data with a "file" field.
// Files are stored via the configured StorageProvider.
// Returns JSON with the image URL and thumbnail URL.
func (h *UploadHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	// Check upload limits per user plan
	if h.userRepo != nil {
		user, err := h.userRepo.GetByID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "User not found")
			return
		}
		userDir := filepath.Join(h.uploadDir, userID.String())
		currentCount := countUserUploads(userDir)
		maxUploads := maxUploadsForPlan(user.Plan)
		if currentCount >= maxUploads {
			writeError(w, http.StatusForbidden, fmt.Sprintf(
				"Upload limit reached (%d/%d). Upgrade your plan for more uploads.", currentCount, maxUploads))
			return
		}
	}

	// Limit upload size to 10MB
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		if err.Error() == "http: request body too large" {
			writeError(w, http.StatusBadRequest, "File too large (max 10MB)")
		} else {
			writeError(w, http.StatusBadRequest, "Invalid multipart form data")
		}
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing file field")
		return
	}
	defer file.Close()

	// Validate declared Content-Type header (defense in depth — magic bytes still authoritative)
	if ct := header.Header.Get("Content-Type"); ct != "" && !strings.HasPrefix(ct, "image/") {
		writeError(w, http.StatusBadRequest, "Only image content types are allowed")
		return
	}

	// Validate file content by reading magic bytes (don't trust client Content-Type header)
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && err != io.EOF {
		writeError(w, http.StatusBadRequest, "Failed to read file")
		return
	}
	detectedType := http.DetectContentType(buf[:n])
	if !strings.HasPrefix(detectedType, "image/") {
		writeError(w, http.StatusBadRequest, "Only image files are allowed")
		return
	}
	// Reset file reader position after sniffing
	if seeker, ok := file.(io.Seeker); ok {
		seeker.Seek(0, io.SeekStart)
	}

	// Use StorageProvider if configured
	if h.storage != nil {
		result, err := h.storage.Save(userID.String(), header.Filename, file)
		if err != nil {
			slog.Error("Storage save failed", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to save file")
			return
		}
		slog.Info("Image uploaded", "user_id", userID, "filename", result.Filename)
		writeJSON(w, http.StatusOK, map[string]string{
			"url":                  result.URL,
			"thumbnail_url":        result.ThumbnailURL,
			"filename":             result.Filename,
			"object_key":           result.ObjectKey,
			"thumbnail_object_key": result.ThumbnailObjectKey,
			"content_type":         result.ContentType,
		})
		return
	}

	// Legacy fallback: direct disk write (should not reach here in production)
	slog.Warn("No storage provider configured, using legacy disk write")
	writeError(w, http.StatusInternalServerError, "Storage not configured")
}

// PresignImage handles POST /api/uploads/presign
// Returns a signed URL and object key for direct-to-storage uploads.
func (h *UploadHandler) PresignImage(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req presignImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(req.Filename) == "" {
		writeError(w, http.StatusBadRequest, "filename is required")
		return
	}
	if !strings.HasPrefix(strings.ToLower(strings.TrimSpace(req.ContentType)), "image/") {
		writeError(w, http.StatusBadRequest, "content_type must be an image MIME type")
		return
	}

	presignProvider, ok := h.storage.(storage.PresignCapableProvider)
	if !ok {
		writeError(w, http.StatusBadRequest, "Presigned uploads are available only with S3 storage provider")
		return
	}

	result, err := presignProvider.PresignUpload(userID.String(), req.Filename, req.ContentType)
	if err != nil {
		slog.Error("Failed to create presigned upload", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create presigned upload")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"upload_url":         result.UploadURL,
		"method":             result.Method,
		"headers":            result.Headers,
		"object_key":         result.ObjectKey,
		"expires_in_seconds": result.ExpiresInSeconds,
		"content_type":       result.ContentType,
	})
}

// CompletePresignedUpload handles POST /api/uploads/complete
// Finalizes a previously uploaded object and returns standard media payload.
func (h *UploadHandler) CompletePresignedUpload(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req completePresignedUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(req.ObjectKey) == "" {
		writeError(w, http.StatusBadRequest, "object_key is required")
		return
	}

	presignProvider, ok := h.storage.(storage.PresignCapableProvider)
	if !ok {
		writeError(w, http.StatusBadRequest, "Presigned uploads are available only with S3 storage provider")
		return
	}

	result, err := presignProvider.CompletePresignedUpload(userID.String(), req.ObjectKey)
	if err != nil {
		slog.Error("Failed to finalize presigned upload", "error", err)
		writeError(w, http.StatusBadRequest, "Failed to finalize upload")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url":                  result.URL,
		"thumbnail_url":        result.ThumbnailURL,
		"filename":             result.Filename,
		"object_key":           result.ObjectKey,
		"thumbnail_object_key": result.ThumbnailObjectKey,
		"content_type":         result.ContentType,
	})
}
