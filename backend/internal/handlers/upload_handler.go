package handlers

import (
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"golang.org/x/image/draw"
)

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	// Ensure upload directories exist
	for _, subdir := range []string{"", "thumbnails"} {
		dir := filepath.Join(uploadDir, subdir)
		if err := os.MkdirAll(dir, 0755); err != nil {
			slog.Error("Failed to create upload directory", "dir", dir, "error", err)
		}
	}
	return &UploadHandler{uploadDir: uploadDir}
}

// UploadImage handles POST /api/uploads/image
// Accepts multipart/form-data with a "file" field.
// Returns JSON with the image URL and thumbnail URL.
func (h *UploadHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	_ = middleware.GetUserID(r.Context()) // ensure authenticated

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

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		writeError(w, http.StatusBadRequest, "Only image files are allowed")
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Save original file
	dstPath := filepath.Join(h.uploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		slog.Error("Failed to create file", "path", dstPath, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		slog.Error("Failed to write file", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to save file")
		return
	}

	// Generate thumbnail (200x200 max)
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", strings.TrimSuffix(filename, ext))
	go h.generateThumbnail(dstPath, thumbFilename)

	writeJSON(w, http.StatusOK, map[string]string{
		"url":           fmt.Sprintf("/api/uploads/%s", filename),
		"thumbnail_url": fmt.Sprintf("/api/uploads/thumbnails/%s", thumbFilename),
		"filename":      filename,
	})
}

func (uh *UploadHandler) generateThumbnail(srcPath, thumbFilename string) {
	srcFile, err := os.Open(srcPath)
	if err != nil {
		slog.Error("Failed to open source for thumbnail", "error", err)
		return
	}
	defer srcFile.Close()

	srcImg, _, err := image.Decode(srcFile)
	if err != nil {
		slog.Error("Failed to decode image for thumbnail", "error", err)
		return
	}

	// Calculate thumbnail dimensions (max 200x200 maintaining aspect ratio)
	bounds := srcImg.Bounds()
	imgW, imgH := bounds.Dx(), bounds.Dy()
	maxDim := 200

	var newW, newH int
	if imgW > imgH {
		newW = maxDim
		newH = int(float64(imgH) * float64(maxDim) / float64(imgW))
	} else {
		newH = maxDim
		newW = int(float64(imgW) * float64(maxDim) / float64(imgH))
	}
	if newW < 1 {
		newW = 1
	}
	if newH < 1 {
		newH = 1
	}

	thumb := image.NewRGBA(image.Rect(0, 0, newW, newH))
	draw.ApproxBiLinear.Scale(thumb, thumb.Bounds(), srcImg, srcImg.Bounds(), draw.Over, nil)

	thumbPath := filepath.Join(uh.uploadDir, "thumbnails", thumbFilename)
	thumbFile, err := os.Create(thumbPath)
	if err != nil {
		slog.Error("Failed to create thumbnail file", "error", err)
		return
	}
	defer thumbFile.Close()

	if err := jpeg.Encode(thumbFile, thumb, &jpeg.Options{Quality: 80}); err != nil {
		slog.Error("Failed to encode thumbnail", "error", err)
	}
}
