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
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/storage"
)

type benchmarkStorageProvider struct{}

type benchmarkClientSearchRepo struct{ items []models.Client }

func (r benchmarkClientSearchRepo) Search(_ context.Context, _ uuid.UUID, _ string) ([]models.Client, error) {
	return r.items, nil
}

type benchmarkProductSearchRepo struct{ items []models.Product }

func (r benchmarkProductSearchRepo) Search(_ context.Context, _ uuid.UUID, _ string) ([]models.Product, error) {
	return r.items, nil
}

type benchmarkInventorySearchRepo struct{ items []models.InventoryItem }

func (r benchmarkInventorySearchRepo) Search(_ context.Context, _ uuid.UUID, _ string) ([]models.InventoryItem, error) {
	return r.items, nil
}

type benchmarkEventSearchRepo struct{ items []models.Event }

func (r benchmarkEventSearchRepo) Search(_ context.Context, _ uuid.UUID, _ string) ([]models.Event, error) {
	return r.items, nil
}

func (b *benchmarkStorageProvider) Save(userID, originalFilename string, data io.Reader) (*storage.FileResult, error) {
	return &storage.FileResult{
		URL:          "/api/uploads/" + userID + "/" + originalFilename,
		ThumbnailURL: "/api/uploads/" + userID + "/thumbnails/thumb_" + originalFilename,
		Filename:     originalFilename,
	}, nil
}

func (b *benchmarkStorageProvider) Delete(path string) error { return nil }
func (b *benchmarkStorageProvider) URL(path string) string   { return "/api/uploads/" + path }
func (b *benchmarkStorageProvider) PresignUpload(userID, originalFilename, contentType string) (*storage.PresignResult, error) {
	return &storage.PresignResult{UploadURL: "https://example.com", Method: "PUT", ObjectKey: userID + "/file.jpg"}, nil
}
func (b *benchmarkStorageProvider) CompletePresignedUpload(userID, objectKey string) (*storage.FileResult, error) {
	return &storage.FileResult{URL: "/api/uploads/" + objectKey, Filename: "file.jpg"}, nil
}

func buildBenchmarkMultipartPNG(tb testing.TB) ([]byte, string) {
	tb.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	partHeader := make(textproto.MIMEHeader)
	partHeader.Set("Content-Disposition", `form-data; name="file"; filename="bench.png"`)
	partHeader.Set("Content-Type", "image/png")
	part, err := writer.CreatePart(partHeader)
	if err != nil {
		tb.Fatalf("CreatePart failed: %v", err)
	}

	img := image.NewRGBA(image.Rect(0, 0, 64, 64))
	for x := 0; x < 64; x++ {
		for y := 0; y < 64; y++ {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	if err := png.Encode(part, img); err != nil {
		tb.Fatalf("png.Encode failed: %v", err)
	}
	if err := writer.Close(); err != nil {
		tb.Fatalf("writer.Close failed: %v", err)
	}

	return body.Bytes(), writer.FormDataContentType()
}

func BenchmarkSearchHandler_SearchAll(b *testing.B) {
	userID := uuid.New()
	query := "wedding"

	clients := make([]models.Client, 6)
	for i := range clients {
		clients[i] = models.Client{ID: uuid.New(), Name: "Client"}
	}
	products := make([]models.Product, 6)
	for i := range products {
		products[i] = models.Product{ID: uuid.New(), Name: "Product"}
	}
	inventory := make([]models.InventoryItem, 6)
	for i := range inventory {
		inventory[i] = models.InventoryItem{ID: uuid.New(), IngredientName: "Item"}
	}
	events := make([]models.Event, 6)
	for i := range events {
		events[i] = models.Event{ID: uuid.New(), ServiceType: "Catering"}
	}

	h := NewSearchHandler(
		benchmarkClientSearchRepo{items: clients},
		benchmarkProductSearchRepo{items: products},
		benchmarkInventorySearchRepo{items: inventory},
		benchmarkEventSearchRepo{items: events},
	)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodGet, "/api/search?q="+query, nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	}
}

func BenchmarkUploadHandler_UploadImage(b *testing.B) {
	h := NewUploadHandler(b.TempDir(), nil)
	h.SetStorageProvider(&benchmarkStorageProvider{})
	userID := uuid.New()
	payload, contentType := buildBenchmarkMultipartPNG(b)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/uploads/image", bytes.NewReader(payload))
		req.Header.Set("Content-Type", contentType)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UploadImage(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	}
}
