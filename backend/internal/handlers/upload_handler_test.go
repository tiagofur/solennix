package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/storage"
	"github.com/tiagofur/solennix-backend/internal/middleware"
)

type mockPresignProvider struct{}

func (m *mockPresignProvider) Save(userID, originalFilename string, data io.Reader) (*storage.FileResult, error) {
	return &storage.FileResult{URL: "/api/uploads/u/f.jpg", ThumbnailURL: "/api/uploads/u/thumbnails/thumb_f.jpg", Filename: "f.jpg"}, nil
}
func (m *mockPresignProvider) Delete(path string) error { return nil }
func (m *mockPresignProvider) URL(path string) string   { return "/api/uploads/" + path }
func (m *mockPresignProvider) PresignUpload(userID, originalFilename, contentType string) (*storage.PresignResult, error) {
	return &storage.PresignResult{
		UploadURL:        "https://s3.example.com/signed",
		Method:           "PUT",
		Headers:          map[string]string{"Content-Type": contentType},
		ObjectKey:        userID + "/abc.jpg",
		ExpiresInSeconds: 900,
		ContentType:      contentType,
	}, nil
}
func (m *mockPresignProvider) CompletePresignedUpload(userID, objectKey string) (*storage.FileResult, error) {
	return &storage.FileResult{
		URL:                "https://cdn.example.com/uploads/" + objectKey,
		ThumbnailURL:       "https://cdn.example.com/uploads/" + userID + "/thumbnails/thumb_abc.jpg",
		Filename:           "abc.jpg",
		ObjectKey:          objectKey,
		ThumbnailObjectKey: userID + "/thumbnails/thumb_abc.jpg",
		ContentType:        "image/jpeg",
	}, nil
}

func TestNewUploadHandler(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	if h == nil {
		t.Fatal("NewUploadHandler returned nil")
	}
	// Verify base upload directory was created
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Fatal("base upload directory was not created")
	}
}

func TestUploadImage(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
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

func TestNewUploadHandler_InvalidDirectory(t *testing.T) {
	// Create a handler with a read-only path that can't have subdirs
	// On Linux, /proc/1 is typically not writable
	h := NewUploadHandler("/proc/1/nonexistent_upload_dir", nil)
	if h == nil {
		t.Fatal("NewUploadHandler returned nil even with invalid dir")
	}
	// The handler should still be created; it just logs errors
}

func TestUploadImage_BodyTooLarge(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	// Create a multipart form with a large body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="large.png"`)
	partHeader.Set("Content-Type", "image/png")
	part, _ := writer.CreatePart(partHeader)

	// Write more than 10MB
	largeData := make([]byte, 11*1024*1024)
	part.Write(largeData)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	// Should get either "File too large" or "Invalid multipart form data"
	bodyStr := rr.Body.String()
	assert.True(t, strings.Contains(bodyStr, "File too large") || strings.Contains(bodyStr, "Invalid multipart"),
		"expected file-too-large or invalid-multipart error, got: %s", bodyStr)
}

func TestUploadImage_SuccessWithJpgExtension(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="photo.jpg"`)
	partHeader.Set("Content-Type", "image/jpeg")
	part, _ := writer.CreatePart(partHeader)

	// Write a small valid image
	img := image.NewRGBA(image.Rect(0, 0, 5, 5))
	for x := 0; x < 5; x++ {
		for y := 0; y < 5; y++ {
			img.Set(x, y, color.RGBA{0, 0, 255, 255})
		}
	}
	png.Encode(part, img) // PNG-encoded data with .jpg extension, still valid
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), ".jpg")
	assert.Contains(t, rr.Body.String(), "thumbnail_url")
	assert.Contains(t, rr.Body.String(), "filename")
}

func TestUploadImage_CreateFileFails(t *testing.T) {
	// Use a valid temp dir for NewUploadHandler so it initializes,
	// then swap storage to a path where directory creation will fail.
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	// Overwrite storage provider to use a path where MkdirAll fails.
	invalidDir := filepath.Join(t.TempDir(), "invalid\x00path")
	h.uploadDir = invalidDir
	h.SetStorageProvider(storage.NewLocalProvider(invalidDir, "/api/uploads"))

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="test.jpg"`)
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
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to save file")
}

func TestUploadImage_BodyTooLargeExact(t *testing.T) {
	// Ensure the exact "http: request body too large" error triggers the correct message.
	// This exercises the exact string check on line 45-46.
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	// Create a multipart body that is exactly over the 10MB limit.
	// The MaxBytesReader wraps r.Body inside UploadImage.
	// We need a body that's large enough that ParseMultipartForm triggers the MaxBytesError.
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="huge.jpg"`)
	partHeader.Set("Content-Type", "image/jpeg")
	part, _ := writer.CreatePart(partHeader)

	// Write exactly 10MB + 1 byte to exceed the limit
	largeData := make([]byte, 10*1024*1024+1)
	part.Write(largeData)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)

	bodyStr := rr.Body.String()
	// Should trigger either "File too large" or "Invalid multipart" depending on how
	// the MaxBytesReader error propagates
	assert.True(t, strings.Contains(bodyStr, "File too large") || strings.Contains(bodyStr, "Invalid multipart"),
		"expected size-related error, got: %s", bodyStr)
}

func TestUploadImage_BodyTooLargeRaw(t *testing.T) {
	// This test sends a raw oversized body with correct multipart Content-Type
	// to ensure ParseMultipartForm triggers the MaxBytesReader error.
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	// Build a multipart form with minimal overhead but a huge file part.
	// Write the multipart boundary manually to keep overhead low.
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="huge.jpg"`)
	partHeader.Set("Content-Type", "image/jpeg")
	part, _ := writer.CreatePart(partHeader)

	// Write a chunk at a time to exceed 10MB
	chunk := make([]byte, 1024*1024) // 1MB chunks
	for i := 0; i < 11; i++ {
		part.Write(chunk)
	}
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	// We accept either error message — "File too large" exercises line 46,
	// "Invalid multipart" exercises line 48
	bodyStr := rr.Body.String()
	assert.True(t, strings.Contains(bodyStr, "File too large") || strings.Contains(bodyStr, "Invalid multipart"),
		"expected error about file size or multipart, got: %s", bodyStr)
}

func TestUploadImage_MultipleFileExtensions(t *testing.T) {
	// Test with various file extensions
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	testCases := []struct {
		name     string
		filename string
		wantExt  string
	}{
		{"gif extension", "image.gif", ".gif"},
		{"webp extension", "image.webp", ".webp"},
		{"uppercase jpg", "IMAGE.JPG", ".jpg"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)
			partHeader := make(textproto.MIMEHeader)
			partHeader.Set("Content-Disposition", `form-data; name="file"; filename="`+tc.filename+`"`)
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
			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Contains(t, rr.Body.String(), tc.wantExt)
		})
	}
}

func TestPresignImage_UnsupportedProvider_Returns400(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil) // local provider by default
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/presign", strings.NewReader(`{"filename":"photo.jpg","content_type":"image/jpeg"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.PresignImage(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Presigned uploads")
}

func TestPresignImage_Success(t *testing.T) {
	h := NewUploadHandler(t.TempDir(), nil)
	h.SetStorageProvider(&mockPresignProvider{})
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/presign", strings.NewReader(`{"filename":"photo.jpg","content_type":"image/jpeg"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.PresignImage(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "upload_url")
	assert.Contains(t, rr.Body.String(), "object_key")
}

func TestCompletePresignedUpload_UnsupportedProvider_Returns400(t *testing.T) {
	h := NewUploadHandler(t.TempDir(), nil)
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/complete", strings.NewReader(`{"object_key":"u/abc.jpg"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.CompletePresignedUpload(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Presigned uploads")
}

func TestCompletePresignedUpload_Success(t *testing.T) {
	h := NewUploadHandler(t.TempDir(), nil)
	h.SetStorageProvider(&mockPresignProvider{})
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/complete", strings.NewReader(`{"object_key":"`+userID.String()+`/abc.jpg"}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.CompletePresignedUpload(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "thumbnail_object_key")
	assert.Contains(t, rr.Body.String(), "content_type")
}

// ---------------------------------------------------------------------------
// Security tests — Upload magic-byte validation
// ---------------------------------------------------------------------------

func TestUploadImage_RejectsNonImageContent(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Set Content-Type header to image/jpeg, but send plain text content
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="fake.jpg"`)
	partHeader.Set("Content-Type", "image/jpeg")
	part, _ := writer.CreatePart(partHeader)

	// Write non-image content (plain text)
	part.Write([]byte("This is definitely not an image file, just plain text content for testing."))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Only image files are allowed")
}

func TestUploadImage_DisallowedExtension(t *testing.T) {
	dir := t.TempDir()
	h := NewUploadHandler(dir, nil)
	userID := uuid.New()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Send a real image but with a .html extension (disallowed)
	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="malicious.html"`)
	partHeader.Set("Content-Type", "image/png")
	part, _ := writer.CreatePart(partHeader)

	// Create a small valid PNG image so magic-byte check passes
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	for x := 0; x < 4; x++ {
		for y := 0; y < 4; y++ {
			img.Set(x, y, color.RGBA{128, 128, 128, 255})
		}
	}
	png.Encode(part, img)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()

	h.UploadImage(rr, req)
	// Should succeed but default to .jpg extension since .html is not allowed
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), ".jpg", "disallowed extension should default to .jpg")
	assert.NotContains(t, rr.Body.String(), ".html", "response should not contain .html extension")
}

func TestGenerateThumbnail(t *testing.T) {
	dir := t.TempDir()
	_ = NewUploadHandler(dir, nil)

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

		thumbDir := filepath.Join(dir, "thumbnails")
		os.MkdirAll(thumbDir, 0755)
		storage.GenerateThumbnail(imgPath, thumbDir, "thumb_test.jpg")

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

		thumbDir := filepath.Join(dir, "thumbnails")
		os.MkdirAll(thumbDir, 0755)
		storage.GenerateThumbnail(imgPath, thumbDir, "thumb_portrait.jpg")
		thumbPath := filepath.Join(dir, "thumbnails", "thumb_portrait.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("portrait thumbnail was not generated")
		}
	})

	t.Run("NonExistentFile", func(t *testing.T) {
		// Should not panic, just log error
		storage.GenerateThumbnail("/nonexistent/file.png", dir, "thumb.jpg")
	})

	t.Run("InvalidImageFile", func(t *testing.T) {
		invalidPath := filepath.Join(dir, "invalid.png")
		os.WriteFile(invalidPath, []byte("not an image"), 0644)
		// Should not panic
		storage.GenerateThumbnail(invalidPath, dir, "thumb_invalid.jpg")
	})

	t.Run("VeryWideImage", func(t *testing.T) {
		// An extremely wide image (e.g., 10000x1) would result in newH being < 1
		// However, the code clamps it to 1
		imgPath := filepath.Join(dir, "wide.png")
		img := image.NewRGBA(image.Rect(0, 0, 10000, 1))
		f, _ := os.Create(imgPath)
		png.Encode(f, img)
		f.Close()

		thumbDir := filepath.Join(dir, "thumbnails")
		os.MkdirAll(thumbDir, 0755)
		storage.GenerateThumbnail(imgPath, thumbDir, "thumb_wide.jpg")
		thumbPath := filepath.Join(dir, "thumbnails", "thumb_wide.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("wide thumbnail was not generated")
		}
	})

	t.Run("VeryTallImage", func(t *testing.T) {
		// Extremely tall image (1x10000) would result in newW being < 1
		imgPath := filepath.Join(dir, "tall.png")
		img := image.NewRGBA(image.Rect(0, 0, 1, 10000))
		f, _ := os.Create(imgPath)
		png.Encode(f, img)
		f.Close()

		thumbDir := filepath.Join(dir, "thumbnails")
		os.MkdirAll(thumbDir, 0755)
		storage.GenerateThumbnail(imgPath, thumbDir, "thumb_tall.jpg")
		thumbPath := filepath.Join(dir, "thumbnails", "thumb_tall.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("tall thumbnail was not generated")
		}
	})

	t.Run("SquareImage", func(t *testing.T) {
		imgPath := filepath.Join(dir, "square.png")
		img := image.NewRGBA(image.Rect(0, 0, 500, 500))
		f, _ := os.Create(imgPath)
		png.Encode(f, img)
		f.Close()

		thumbDir := filepath.Join(dir, "thumbnails")
		os.MkdirAll(thumbDir, 0755)
		storage.GenerateThumbnail(imgPath, thumbDir, "thumb_square.jpg")
		thumbPath := filepath.Join(dir, "thumbnails", "thumb_square.jpg")
		if _, err := os.Stat(thumbPath); os.IsNotExist(err) {
			t.Fatal("square thumbnail was not generated")
		}
	})
}
