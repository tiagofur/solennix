package storage

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/google/uuid"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
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
	objectKey := fmt.Sprintf("%s/%s", userID, filename)
	fullObjectKey := p.prefixed(objectKey)
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", strings.TrimSuffix(filename, ext))
	thumbnailObjectKey := fmt.Sprintf("%s/thumbnails/%s", userID, thumbFilename)
	fullThumbnailObjectKey := p.prefixed(thumbnailObjectKey)

	// Read all data into memory for S3 upload
	buf, err := io.ReadAll(data)
	if err != nil {
		return nil, fmt.Errorf("read file data: %w", err)
	}

	contentType := detectContentTypeFromExt(ext)

	_, err = p.client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(fullObjectKey),
		Body:        bytes.NewReader(buf),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return nil, fmt.Errorf("upload to S3: %w", err)
	}

	thumbnailUploaded := false
	if thumbBuf, thumbErr := generateThumbnailBytes(buf); thumbErr == nil {
		_, err = p.client.PutObject(context.Background(), &s3.PutObjectInput{
			Bucket:      aws.String(p.bucket),
			Key:         aws.String(fullThumbnailObjectKey),
			Body:        bytes.NewReader(thumbBuf),
			ContentType: aws.String("image/jpeg"),
		})
		if err != nil {
			slog.Warn("S3 thumbnail upload failed, falling back to original URL", "error", err)
		} else {
			thumbnailUploaded = true
		}
	} else {
		slog.Warn("S3 thumbnail generation failed, falling back to original URL", "error", thumbErr)
	}

	thumbnailURL := p.publicURL(fullObjectKey)
	if thumbnailUploaded {
		thumbnailURL = p.publicURL(fullThumbnailObjectKey)
	}

	return &FileResult{
		URL:                p.publicURL(fullObjectKey),
		ThumbnailURL:       thumbnailURL,
		Filename:           filename,
		ObjectKey:          objectKey,
		ThumbnailObjectKey: thumbnailObjectKey,
		ContentType:        contentType,
	}, nil
}

func (p *S3Provider) PresignUpload(userID, originalFilename, contentType string) (*PresignResult, error) {
	if !strings.HasPrefix(strings.ToLower(contentType), "image/") {
		return nil, fmt.Errorf("only image content types are allowed")
	}

	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" {
		ext = extFromContentType(contentType)
	}
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExts[ext] {
		ext = extFromContentType(contentType)
	}

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	objectKey := fmt.Sprintf("%s/%s", userID, filename)
	fullObjectKey := p.prefixed(objectKey)

	presigner := s3.NewPresignClient(p.client)
	expires := 15 * time.Minute
	out, err := presigner.PresignPutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(p.bucket),
		Key:         aws.String(fullObjectKey),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expires
	})
	if err != nil {
		return nil, fmt.Errorf("presign upload: %w", err)
	}

	return &PresignResult{
		UploadURL:        out.URL,
		Method:           "PUT",
		Headers:          map[string]string{"Content-Type": contentType},
		ObjectKey:        objectKey,
		ExpiresInSeconds: int(expires.Seconds()),
		ContentType:      contentType,
	}, nil
}

func (p *S3Provider) CompletePresignedUpload(userID, objectKey string) (*FileResult, error) {
	objectKey = strings.TrimPrefix(strings.TrimSpace(objectKey), "/")
	if objectKey == "" {
		return nil, fmt.Errorf("object key is required")
	}
	if !strings.HasPrefix(objectKey, userID+"/") {
		return nil, fmt.Errorf("object key does not belong to user")
	}

	fullObjectKey := p.prefixed(objectKey)
	obj, err := p.client.GetObject(context.Background(), &s3.GetObjectInput{
		Bucket: aws.String(p.bucket),
		Key:    aws.String(fullObjectKey),
	})
	if err != nil {
		return nil, fmt.Errorf("get uploaded object: %w", err)
	}
	defer obj.Body.Close()

	buf, err := io.ReadAll(obj.Body)
	if err != nil {
		return nil, fmt.Errorf("read uploaded object: %w", err)
	}

	filename := filepath.Base(objectKey)
	ext := strings.ToLower(filepath.Ext(filename))
	thumbFilename := fmt.Sprintf("thumb_%s.jpg", strings.TrimSuffix(filename, ext))
	thumbnailObjectKey := fmt.Sprintf("%s/thumbnails/%s", userID, thumbFilename)
	fullThumbnailObjectKey := p.prefixed(thumbnailObjectKey)

	thumbnailUploaded := false
	if thumbBuf, thumbErr := generateThumbnailBytes(buf); thumbErr == nil {
		_, putErr := p.client.PutObject(context.Background(), &s3.PutObjectInput{
			Bucket:      aws.String(p.bucket),
			Key:         aws.String(fullThumbnailObjectKey),
			Body:        bytes.NewReader(thumbBuf),
			ContentType: aws.String("image/jpeg"),
		})
		if putErr != nil {
			slog.Warn("S3 thumbnail upload failed after presigned completion", "error", putErr)
		} else {
			thumbnailUploaded = true
		}
	} else {
		slog.Warn("S3 thumbnail generation failed after presigned completion", "error", thumbErr)
	}

	thumbnailURL := p.publicURL(fullObjectKey)
	if thumbnailUploaded {
		thumbnailURL = p.publicURL(fullThumbnailObjectKey)
	}

	resolvedContentType := aws.ToString(obj.ContentType)
	if resolvedContentType == "" {
		resolvedContentType = detectContentTypeFromExt(ext)
	}

	return &FileResult{
		URL:                p.publicURL(fullObjectKey),
		ThumbnailURL:       thumbnailURL,
		Filename:           filename,
		ObjectKey:          objectKey,
		ThumbnailObjectKey: thumbnailObjectKey,
		ContentType:        resolvedContentType,
	}, nil
}

func (p *S3Provider) Delete(path string) error {
	originalKey := p.normalizeToFullKey(path)

	deleteKeys := []string{originalKey}
	if thumbKey := deriveThumbnailKey(originalKey); thumbKey != "" {
		deleteKeys = append(deleteKeys, thumbKey)
	}

	objects := make([]types.ObjectIdentifier, 0, len(deleteKeys))
	seen := map[string]bool{}
	for _, k := range deleteKeys {
		k = strings.TrimSpace(k)
		if k == "" || seen[k] {
			continue
		}
		seen[k] = true
		objects = append(objects, types.ObjectIdentifier{Key: aws.String(k)})
	}

	if len(objects) == 0 {
		return nil
	}

	_, err := p.client.DeleteObjects(context.Background(), &s3.DeleteObjectsInput{
		Bucket: aws.String(p.bucket),
		Delete: &types.Delete{Objects: objects, Quiet: aws.Bool(true)},
	})
	if err != nil {
		return fmt.Errorf("delete S3 objects: %w", err)
	}

	return nil
}

func (p *S3Provider) URL(path string) string {
	return p.publicURL(p.normalizeToFullKey(path))
}

func (p *S3Provider) normalizeToFullKey(path string) string {
	if strings.HasPrefix(path, strings.TrimRight(p.cdnURL, "/")+"/") {
		path = strings.TrimPrefix(path, strings.TrimRight(p.cdnURL, "/")+"/")
	}
	path = strings.TrimPrefix(path, "/")
	if strings.HasPrefix(path, p.prefix) {
		return path
	}
	return p.prefixed(path)
}

func (p *S3Provider) prefixed(path string) string {
	path = strings.TrimPrefix(path, "/")
	return p.prefix + path
}

func (p *S3Provider) publicURL(fullKey string) string {
	return fmt.Sprintf("%s/%s", strings.TrimRight(p.cdnURL, "/"), strings.TrimPrefix(fullKey, "/"))
}

func deriveThumbnailKey(originalKey string) string {
	if originalKey == "" {
		return ""
	}

	key := strings.TrimPrefix(originalKey, "/")
	dir := filepath.Dir(key)
	filename := filepath.Base(key)
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	if name == "" {
		return ""
	}

	if strings.HasSuffix(dir, "/thumbnails") {
		return key
	}

	return fmt.Sprintf("%s/thumbnails/thumb_%s.jpg", dir, name)
}

func extFromContentType(contentType string) string {
	ct := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	switch ct {
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	case "image/jpeg", "image/jpg":
		return ".jpg"
	default:
		return ".jpg"
	}
}

func generateThumbnailBytes(original []byte) ([]byte, error) {
	srcImg, _, err := image.Decode(bytes.NewReader(original))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
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

	var out bytes.Buffer
	if err := jpeg.Encode(&out, thumb, &jpeg.Options{Quality: 80}); err != nil {
		return nil, fmt.Errorf("encode thumbnail: %w", err)
	}

	return out.Bytes(), nil
}
