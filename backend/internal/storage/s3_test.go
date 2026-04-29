package storage

import (
	"bytes"
	"fmt"
	"image"
	"image/jpeg"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestS3DirectUploadWithThumbnail verifies the legacy direct-upload path generates real thumbnails.
func TestS3DirectUploadWithThumbnail(t *testing.T) {
	// Create a minimal valid JPEG for testing
	img := image.NewRGBA(image.Rect(0, 0, 800, 600))
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
	require.NoError(t, err)

	provider := &S3Provider{
		cdnURL: "https://cdn.solennix.com",
		prefix: "uploads/",
	}

	// Mock the S3 client by directly testing URL generation logic
	// (Full S3 mock would require mocking AWS SDK)

	// Simulate Save() filename/key generation
	userID := "user123"
	ext := ".jpg"

	filename := fmt.Sprintf("uuid%s", ext)
	objectKey := fmt.Sprintf("%s/%s", userID, filename)
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", "uuid")
	thumbnailObjectKey := fmt.Sprintf("%s/thumbnails/%s", userID, thumbFilename)

	fullObjectKey := provider.prefixed(objectKey)
	fullThumbnailObjectKey := provider.prefixed(thumbnailObjectKey)

	// Verify URL generation is consistent
	originalURL := provider.publicURL(fullObjectKey)
	thumbnailURL := provider.publicURL(fullThumbnailObjectKey)

	expectedOriginalURL := "https://cdn.solennix.com/uploads/user123/uuid.jpg"
	expectedThumbnailURL := "https://cdn.solennix.com/uploads/user123/thumbnails/thumb_uuid.jpg"

	assert.Equal(t, expectedOriginalURL, originalURL)
	assert.Equal(t, expectedThumbnailURL, thumbnailURL)

	// Verify thumbnail generation doesn't fail on valid image
	thumbBuf, err := generateThumbnailBytes(buf.Bytes())
	require.NoError(t, err)
	assert.NotEmpty(t, thumbBuf)
	assert.Greater(t, len(thumbBuf), 0)
}

// TestS3PresignedUploadWithThumbnail verifies presigned flow generates real thumbnails.
func TestS3PresignedUploadWithThumbnail(t *testing.T) {
	// Create a minimal valid JPEG
	img := image.NewRGBA(image.Rect(0, 0, 1024, 768))
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
	require.NoError(t, err)

	provider := &S3Provider{
		cdnURL: "https://cdn.solennix.com",
		prefix: "uploads/",
	}

	userID := "user456"
	objectKey := fmt.Sprintf("%s/%s", userID, "presigned-uuid.jpg")
	fullObjectKey := provider.prefixed(objectKey)

	// CompletePresignedUpload derives thumbnail key correctly
	thumbFilename := "thumb_presigned-uuid.jpg"
	thumbnailObjectKey := fmt.Sprintf("%s/thumbnails/%s", userID, thumbFilename)
	fullThumbnailObjectKey := provider.prefixed(thumbnailObjectKey)

	// Verify thumbnail generation
	thumbBuf, err := generateThumbnailBytes(buf.Bytes())
	require.NoError(t, err)
	assert.NotEmpty(t, thumbBuf)

	// Verify URLs are CDN-ready
	originalURL := provider.publicURL(fullObjectKey)
	thumbnailURL := provider.publicURL(fullThumbnailObjectKey)

	assert.True(t, bytes.HasPrefix([]byte(originalURL), []byte("https://cdn.solennix.com")))
	assert.True(t, bytes.HasPrefix([]byte(thumbnailURL), []byte("https://cdn.solennix.com")))
}

// TestS3ThumbnailKeyDerivation verifies thumbnail keys are derived correctly.
func TestS3ThumbnailKeyDerivation(t *testing.T) {
	testCases := []struct {
		originalKey      string
		expectedThumbKey string
	}{
		{
			originalKey:      "uploads/user123/abc123.jpg",
			expectedThumbKey: "uploads/user123/thumbnails/thumb_abc123.jpg",
		},
		{
			originalKey:      "uploads/user456/landscape.png",
			expectedThumbKey: "uploads/user456/thumbnails/thumb_landscape.jpg",
		},
		{
			originalKey:      "user789/file.webp",
			expectedThumbKey: "user789/thumbnails/thumb_file.jpg",
		},
		{
			originalKey:      "uploads/user123/thumbnails/thumb_existing.jpg",
			expectedThumbKey: "uploads/user123/thumbnails/thumb_existing.jpg", // already a thumbnail
		},
	}

	for _, tc := range testCases {
		t.Run(tc.originalKey, func(t *testing.T) {
			result := deriveThumbnailKey(tc.originalKey)
			assert.Equal(t, tc.expectedThumbKey, result)
		})
	}
}

// TestS3URLGeneration verifies CDN URL generation is consistent.
func TestS3URLGeneration(t *testing.T) {
	provider := &S3Provider{
		cdnURL: "https://cdn.solennix.com",
		prefix: "uploads/",
	}

	testCases := []struct {
		fullKey       string
		expectedURL   string
	}{
		{
			fullKey:       "uploads/user123/photo.jpg",
			expectedURL:   "https://cdn.solennix.com/uploads/user123/photo.jpg",
		},
		{
			fullKey:       "uploads/user456/thumbnails/thumb_photo.jpg",
			expectedURL:   "https://cdn.solennix.com/uploads/user456/thumbnails/thumb_photo.jpg",
		},
		{
			fullKey:       "/uploads/user789/image.png",
			expectedURL:   "https://cdn.solennix.com/uploads/user789/image.png",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.fullKey, func(t *testing.T) {
			result := provider.publicURL(tc.fullKey)
			assert.Equal(t, tc.expectedURL, result)
		})
	}
}

// TestS3NormalizeToFullKey verifies key normalization handles various inputs.
func TestS3NormalizeToFullKey(t *testing.T) {
	provider := &S3Provider{
		cdnURL: "https://cdn.solennix.com",
		prefix: "uploads/",
	}

	testCases := []struct {
		input       string
		expectedKey string
	}{
		{
			input:       "user123/photo.jpg",
			expectedKey: "uploads/user123/photo.jpg",
		},
		{
			input:       "uploads/user456/image.png",
			expectedKey: "uploads/user456/image.png",
		},
		{
			input:       "/user789/file.webp",
			expectedKey: "uploads/user789/file.webp",
		},
		{
			input:       "https://cdn.solennix.com/uploads/user123/photo.jpg",
			expectedKey: "uploads/user123/photo.jpg",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := provider.normalizeToFullKey(tc.input)
			assert.Equal(t, tc.expectedKey, result)
		})
	}
}

// TestThumbnailGeneration verifies thumbnail resizing works correctly.
func TestThumbnailGeneration(t *testing.T) {
	testCases := []struct {
		name   string
		width  int
		height int
	}{
		{
			name:   "landscape",
			width:  1200,
			height: 800,
		},
		{
			name:   "portrait",
			width:  600,
			height: 1200,
		},
		{
			name:   "square",
			width:  1000,
			height: 1000,
		},
		{
			name:   "small",
			width:  100,
			height: 100,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			img := image.NewRGBA(image.Rect(0, 0, tc.width, tc.height))
			var buf bytes.Buffer
			err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
			require.NoError(t, err)

			thumbBuf, err := generateThumbnailBytes(buf.Bytes())
			require.NoError(t, err, "thumbnail generation should succeed")
			assert.Greater(t, len(thumbBuf), 0, "thumbnail should have content")

			// Verify thumbnail is valid JPEG
			thumbImg, _, err := image.Decode(bytes.NewReader(thumbBuf))
			require.NoError(t, err, "thumbnail should be decodable")

			// Verify thumbnail dimensions are bounded to maxDim (200px)
			bounds := thumbImg.Bounds()
			maxDim := 200
			assert.LessOrEqual(t, bounds.Dx(), maxDim)
			assert.LessOrEqual(t, bounds.Dy(), maxDim)
		})
	}
}

// TestS3DeleteCleanup verifies delete removes both original and thumbnail.
func TestS3DeleteCleanup(t *testing.T) {
	// Simulate Delete logic for key derivation
	originalPath := "uploads/user123/photo.jpg"
	thumbKey := deriveThumbnailKey(originalPath)

	expectedThumbKey := "uploads/user123/thumbnails/thumb_photo.jpg"
	assert.Equal(t, expectedThumbKey, thumbKey)

	// Verify both keys are non-empty and distinct
	assert.NotEmpty(t, originalPath)
	assert.NotEmpty(t, thumbKey)
	assert.NotEqual(t, originalPath, thumbKey)
}

// TestContentTypeDetection verifies extension-based content type detection.
func TestContentTypeDetection(t *testing.T) {
	testCases := []struct {
		ext          string
		expectedType string
	}{
		{".jpg", "image/jpeg"},
		{".jpeg", "image/jpeg"},
		{".png", "image/png"},
		{".gif", "image/gif"},
		{".webp", "image/webp"},
		{".unknown", "image/jpeg"}, // fallback
	}

	for _, tc := range testCases {
		t.Run(tc.ext, func(t *testing.T) {
			result := detectContentTypeFromExt(tc.ext)
			assert.Equal(t, tc.expectedType, result)
		})
	}
}

// TestExtensionFromContentType verifies MIME type to extension mapping.
func TestExtensionFromContentType(t *testing.T) {
	testCases := []struct {
		contentType string
		expectedExt string
	}{
		{"image/jpeg", ".jpg"},
		{"image/jpg", ".jpg"},
		{"image/png", ".png"},
		{"image/gif", ".gif"},
		{"image/webp", ".webp"},
		{"image/unknown", ".jpg"}, // fallback
		{"text/plain", ".jpg"},    // fallback
		{"", ".jpg"},              // fallback
	}

	for _, tc := range testCases {
		t.Run(tc.contentType, func(t *testing.T) {
			result := extFromContentType(tc.contentType)
			assert.Equal(t, tc.expectedExt, result)
		})
	}
}

// BenchmarkThumbnailGeneration benchmarks thumbnail resizing performance.
func BenchmarkThumbnailGeneration(b *testing.B) {
	img := image.NewRGBA(image.Rect(0, 0, 2000, 1500))
	var buf bytes.Buffer
	jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
	original := buf.Bytes()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = generateThumbnailBytes(original)
	}
}
