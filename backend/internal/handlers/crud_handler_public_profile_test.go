package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// CreateProduct — the public-profile cap was removed, so flagging a product
// true is allowed for any plan regardless of how many are already flagged.

func TestCreateProduct_BasicUser_FlagTrue_NotCapped(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	// Catalog limit fallback path (pool nil in unit tests).
	productRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	// The public-profile flag must pass straight through to Create untouched.
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Product)
		if !p.ShowOnPublicProfile {
			t.Errorf("Create received ShowOnPublicProfile=false, want true")
		}
	})

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Fourth","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	// No cap lookup should happen anymore.
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}

func TestCreateProduct_BasicUser_FlagFalse_PassesThrough(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Product)
		if p.ShowOnPublicProfile {
			t.Errorf("Create received ShowOnPublicProfile=true, want false")
		}
	})

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

// UpdateProduct — no cap check regardless of plan/flag change.

func TestUpdateProduct_BasicUser_ActivatesFlag_Allowed(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Product)
		if !p.ShowOnPublicProfile {
			t.Errorf("Update received ShowOnPublicProfile=false, want true")
		}
	})

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"name":"X","category":"main","base_price":100,"show_on_public_profile":true}`
	req := makeReqWithUserID(http.MethodPut, "/api/products/"+productID.String(), body, userID)
	req = withURLParam(req, "id", productID.String())
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	productRepo.AssertNotCalled(t, "CountPublicProfile")
}

func TestUpdateProduct_BasicUser_DeactivatesFlag_Allowed(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Product)
		if p.ShowOnPublicProfile {
			t.Errorf("Update received ShowOnPublicProfile=true, want false")
		}
	})

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

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
