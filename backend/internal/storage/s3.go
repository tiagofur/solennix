package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// S3Provider stores files in AWS S3 or S3-compatible storage (MinIO, DigitalOcean Spaces, etc.).
type S3Provider struct {
	client   *s3.Client
	bucket   string
	prefix   string // Key prefix (e.g. "uploads/")
	cdnURL   string // CDN/public URL base (e.g. "https://cdn.solennix.com")
}

// S3Config holds S3 provider configuration.
type S3Config struct {
	Bucket   string
	Region   string
	Prefix   string // Optional key prefix
	Endpoint string // Custom endpoint for MinIO/DO Spaces (empty for AWS)
	CDNURL   string // Public URL base for serving files
}

// NewS3Provider creates an S3 storage provider.
func NewS3Provider(ctx context.Context, cfg S3Config) (*S3Provider, error) {
	var opts []func(*config.LoadOptions) error
	opts = append(opts, config.WithRegion(cfg.Region))

	awsCfg, err := config.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("load AWS config: %w", err)
	}

	var clientOpts []func(*s3.Options)
	if cfg.Endpoint != "" {
		clientOpts = append(clientOpts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.UsePathStyle = true // Required for MinIO
		})
	}

	client := s3.NewFromConfig(awsCfg, clientOpts...)

	prefix := cfg.Prefix
	if prefix != "" && !strings.HasSuffix(prefix, "/") {
		prefix += "/"
	}

	cdnURL := cfg.CDNURL
	if cdnURL == "" {
		cdnURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.Bucket, cfg.Region)
	}

	slog.Info("S3 storage provider initialized", "bucket", cfg.Bucket, "region", cfg.Region)
	return &S3Provider{
		client: client,
		bucket: cfg.Bucket,
		prefix: prefix,
		cdnURL: cdnURL,
	}, nil
}

func (p *S3Provider) Save(userID, originalFilename string, data io.Reader) (*FileResult, error) {
	ext := strings.ToLower(filepath.Ext(originalFilename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	key := fmt.Sprintf("%s%s/%s", p.prefix, userID, filename)

	// Read all data into memory for S3 upload
	buf, err := io.ReadAll(data)
	if err != nil {
		return nil, fmt.Errorf("read file data: %w", err)
	}

	contentType := "image/jpeg"
	switch ext {
	case ".png":
		contentType = "image/png"
	case ".gif":
		contentType = "image/gif"
	case ".webp":
		contentType = "image/webp"
	}

	_, err = p.client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(buf),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return nil, fmt.Errorf("upload to S3: %w", err)
	}

	// TODO: Generate thumbnail via Lambda or server-side processing
	// For now, return the same URL for both
	url := fmt.Sprintf("%s/%s", p.cdnURL, key)

	return &FileResult{
		URL:          url,
		ThumbnailURL: url, // Placeholder until thumbnail pipeline is set up
		Filename:     filename,
	}, nil
}

func (p *S3Provider) Delete(path string) error {
	key := p.prefix + path
	_, err := p.client.DeleteObject(context.Background(), &s3.DeleteObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (p *S3Provider) URL(path string) string {
	return fmt.Sprintf("%s/%s%s", p.cdnURL, p.prefix, path)
}
