package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// CreateProduct — Free public-profile cap (max 3 products with flag=true).

func TestCreateProduct_BasicUser_PublicProfileCap_AtLimit_Forbidden(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// Already 3 public-profile products -> a 4th flagged must be rejected
	// before any INSERT.
	productRepo.On("CountPublicProfile", mock.Anything, userID).Return(3, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Fourth","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "Create")
}

func TestCreateProduct_BasicUser_PublicProfileCap_UnderLimit_Success(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountPublicProfile", mock.Anything, userID).Return(2, nil)
	// Catalog limit fallback path (pool nil in unit tests).
	productRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Product)
		if !p.ShowOnPublicProfile {
			t.Errorf("Create received ShowOnPublicProfile=false, want true")
		}
	})

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Third","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
}

func TestCreateProduct_BasicUser_FlagFalse_DoesNotCheckCap(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// CountPublicProfile must NOT be called when the new product has flag=false.
	productRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Private","category":"main","base_price":100}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}

func TestCreateProduct_ProUser_PublicProfileCap_NotEnforced(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	// Pro: cap not enforced, Create called directly.
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tenth","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}

// UpdateProduct — Free public-profile cap.

func TestUpdateProduct_BasicUser_ActivatesFourthFlag_Forbidden(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// Existing product currently has flag=false.
	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{
		ID: productID, UserID: userID, ShowOnPublicProfile: false,
	}, nil)
	// 3 already flagged -> activating a 4th must be rejected.
	productRepo.On("CountPublicProfile", mock.Anything, userID).Return(3, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"X","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPut, "/api/products/"+productID.String(), body, userID)
	req = withURLParam(req, "id", productID.String())
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "Update")
}

func TestUpdateProduct_BasicUser_DeactivatesFlag_Allowed(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// Existing has flag=true; update sets it false -> no cap check needed.
	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"X","category":"main","base_price":100,"show_on_public_profile":false}`
	req := makeReqWithUserID(http.MethodPut, "/api/products/"+productID.String(), body, userID)
	req = withURLParam(req, "id", productID.String())
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}

func TestUpdateProduct_BasicUser_KeepsFlagTrue_Allowed(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// Existing flag=true, update keeps it true -> the product is already in
	// the count, so no new slot is consumed. Allowed without cap check.
	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{
		ID: productID, UserID: userID, ShowOnPublicProfile: true,
	}, nil)
	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Renamed","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPut, "/api/products/"+productID.String(), body, userID)
	req = withURLParam(req, "id", productID.String())
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}
