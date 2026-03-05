package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
)

func TestNewUploadHandler(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir)
	if h == nil {
		t.Fatal("NewUploadHandler returned nil")
	}
	// Verify directories were created
	if _, err := os.Stat(filepath.Join(dir, "thumbnails")); os.IsNotExist(err) {
		t.Fatal("thumbnails directory was not created")
	}
}

func TestUploadImage(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir)
	userID := uuid.New()

	t.Run("MissingFileField", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		h.UploadImage(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d, body = %s", rr.Code, http.StatusBadRequest, rr.Body.String())
		}
		if !strings.Contains(rr.Body.String(), "Missing file") {
			t.Fatalf("body = %q, expected missing file error", rr.Body.String())
		}
	})

	t.Run("NonImageContentType", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, _ := writer.CreateFormFile("file", "test.txt")
		part.Write([]byte("not an image"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		h.UploadImage(rr, req)
		// CreateFormFile defaults to application/octet-stream, which is not image/*
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d, body = %s", rr.Code, http.StatusBadRequest, rr.Body.String())
		}
	})

	t.Run("SuccessfulUpload", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		// Create a proper multipart file with image content type
		partHeader := make(textproto.MIMEHeader)
		partHeader.Set("Content-Disposition", `form-data; name="file"; filename="test.png"`)
		partHeader.Set("Content-Type", "image/png")
		part, _ := writer.CreatePart(partHeader)

		// Create a small valid PNG image
		img := image.NewRGBA(image.Rect(0, 0, 10, 10))
		for x := 0; x < 10; x++ {
			for y := 0; y < 10; y++ {
				img.Set(x, y, color.RGBA{255, 0, 0, 255})
			}
		}
		png.Encode(part, img)
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		h.UploadImage(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d, body = %s", rr.Code, http.StatusOK, rr.Body.String())
		}
		if !strings.Contains(rr.Body.String(), "url") {
			t.Fatalf("body = %q, expected url field", rr.Body.String())
		}
	})

	t.Run("FileWithoutExtension", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)

		partHeader := make(textproto.MIMEHeader)
		partHeader.Set("Content-Disposition", `form-data; name="file"; filename="noext"`)
		partHeader.Set("Content-Type", "image/jpeg")
		part, _ := writer.CreatePart(partHeader)

		img := image.NewRGBA(image.Rect(0, 0, 2, 2))
		png.Encode(part, img)
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		h.UploadImage(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d, body = %s", rr.Code, http.StatusOK, rr.Body.String())
		}
		if !strings.Contains(rr.Body.String(), ".jpg") {
			t.Fatalf("body = %q, expected .jpg extension for file without ext", rr.Body.String())
		}
	})

	t.Run("InvalidMultipartForm", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", strings.NewReader("not multipart"))
		req.Header.Set("Content-Type", "text/plain")
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()

		h.UploadImage(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}

func TestGenerateThumbnail(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir)

	t.Run("ValidImage", func(t *testing.T) {
		// Create a test image file
		imgPath := filepath.Join(dir, "test_thumb.png")
		img := image.NewRGBA(image.Rect(0, 0, 400, 300))
		for x := 0; x < 400; x++ {
			for y := 0; y < 300; y++ {
				img.Set(x, y, color.RGBA{0, 255, 0, 255})
			}
		}
		f, _ := os.Create(imgPath)
		png.Encode(f, img)
		f.Close()

		h.generateThumbnail(imgPath, "thumb_test.jpg")

		thumbPath := filepath.Join(dir, "thumbnails", "thumb_test.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("thumbnail was not generated")
		}
	})

	t.Run("PortraitImage", func(t *testing.T) {
		imgPath := filepath.Join(dir, "portrait.png")
		img := image.NewRGBA(image.Rect(0, 0, 100, 400))
		f, _ := os.Create(imgPath)
		png.Encode(f, img)
		f.Close()

		h.generateThumbnail(imgPath, "thumb_portrait.jpg")
		thumbPath := filepath.Join(dir, "thumbnails", "thumb_portrait.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("portrait thumbnail was not generated")
		}
	})

	t.Run("NonExistentFile", func(t *testing.T) {
		// Should not panic, just log error
		h.generateThumbnail("/nonexistent/file.png", "thumb.jpg")
	})

	t.Run("InvalidImageFile", func(t *testing.T) {
		invalidPath := filepath.Join(dir, "invalid.png")
		os.WriteFile(invalidPath, []byte("not an image"), 0644)
		// Should not panic
		h.generateThumbnail(invalidPath, "thumb_invalid.jpg")
	})
}
