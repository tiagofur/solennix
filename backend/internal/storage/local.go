package storage

import (
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/image/draw"
)

// LocalProvider stores files on the local filesystem.
type LocalProvider struct {
	uploadDir string // Base directory (e.g. "./uploads")
	urlPrefix string // URL prefix (e.g. "/api/uploads")
}

// NewLocalProvider creates a local storage provider.
func NewLocalProvider(uploadDir, urlPrefix string) *LocalProvider {
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("Failed to create upload directory", "dir", uploadDir, "error", err)
	}
	return &LocalProvider{uploadDir: uploadDir, urlPrefix: urlPrefix}
}

func (p *LocalProvider) Save(userID, originalFilename string, data io.Reader) (*FileResult, error) {
	ext := strings.ToLower(filepath.Ext(originalFilename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Create user-specific directories
	userDir := filepath.Join(p.uploadDir, userID)
	userThumbDir := filepath.Join(userDir, "thumbnails")
	for _, dir := range []string{userDir, userThumbDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("create directory %s: %w", dir, err)
		}
	}

	// Save original file
	dstPath := filepath.Join(userDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		return nil, fmt.Errorf("create file: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, data); err != nil {
		return nil, fmt.Errorf("write file: %w", err)
	}

	// Generate thumbnail
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", strings.TrimSuffix(filename, ext))
	GenerateThumbnail(dstPath, userThumbDir, thumbFilename)

	return &FileResult{
		URL:                fmt.Sprintf("%s/%s/%s", p.urlPrefix, userID, filename),
		ThumbnailURL:       fmt.Sprintf("%s/%s/thumbnails/%s", p.urlPrefix, userID, thumbFilename),
		Filename:           filename,
		ObjectKey:          fmt.Sprintf("%s/%s", userID, filename),
		ThumbnailObjectKey: fmt.Sprintf("%s/thumbnails/%s", userID, thumbFilename),
		ContentType:        detectContentTypeFromExt(ext),
	}, nil
}

func (p *LocalProvider) Delete(path string) error {
	fullPath := filepath.Join(p.uploadDir, path)
	return os.Remove(fullPath)
}

func (p *LocalProvider) URL(path string) string {
	return fmt.Sprintf("%s/%s", p.urlPrefix, path)
}

func detectContentTypeFromExt(ext string) string {
	switch ext {
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "image/jpeg"
	}
}

// GenerateThumbnail creates a 200x200 max JPEG thumbnail maintaining aspect ratio.
func GenerateThumbnail(srcPath, thumbDir, thumbFilename string) {
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

	thumbPath := filepath.Join(thumbDir, thumbFilename)
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
