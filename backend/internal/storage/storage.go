package storage

import (
	"io"
)

// FileResult holds the URLs returned after a file is saved.
type FileResult struct {
	URL                string // Public URL for the full-size file
	ThumbnailURL       string // Public URL for the thumbnail (empty if not applicable)
	Filename           string // Generated filename
	ObjectKey          string // Storage object key/path for original file (relative to provider root)
	ThumbnailObjectKey string // Storage object key/path for thumbnail (relative to provider root)
	ContentType        string // MIME type for original file
}

// PresignResult is returned when clients initiate a direct-to-storage upload.
type PresignResult struct {
	UploadURL        string            // Signed URL for direct upload
	Method           string            // HTTP method (usually PUT)
	Headers          map[string]string // Required headers (e.g. Content-Type)
	ObjectKey        string            // Storage key/path to later finalize
	ExpiresInSeconds int               // URL expiry in seconds
	ContentType      string            // MIME type expected by storage
}

// Provider abstracts file storage operations.
// Implementations: LocalProvider (disk), S3Provider (AWS S3 / MinIO).
type Provider interface {
	// Save stores a file and returns its public URLs.
	Save(userID, originalFilename string, data io.Reader) (*FileResult, error)

	// Delete removes a file by its storage path.
	Delete(path string) error

	// URL returns the public URL for a given storage path.
	URL(path string) string
}

// PresignCapableProvider adds optional direct-upload capabilities.
// S3/compatible providers may implement this; local disk provider does not.
type PresignCapableProvider interface {
	Provider
	PresignUpload(userID, originalFilename, contentType string) (*PresignResult, error)
	CompletePresignedUpload(userID, objectKey string) (*FileResult, error)
}
