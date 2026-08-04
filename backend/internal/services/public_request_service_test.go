package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// --- mocks (manual, same pattern as notification_service_batching_test.go) ---

type mockRequestStore struct {
	created       *models.PublicRequest
	createErr     error
	getByID       *models.PublicRequest
	getByIDErr    error
	getByToken    *models.PublicRequest
	getByTokenErr error
	updateStatus  models.RequestStatus
	updateErr     error
	setEventIDErr error
	markReadErr   error
	pendingCount  int
	pendingErr    error
	responseErr   error
	expiredCount  int
	expiredErr    error
}

func (m *mockRequestStore) Create(_ context.Context, req *models.PublicRequest) error {
	m.created = req
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}
	if req.ClientToken == uuid.Nil {
		req.ClientToken = uuid.New()
	}
	return m.createErr
}
func (m *mockRequestStore) CreateTx(_ context.Context, _ pgx.Tx, req *models.PublicRequest) error {
	return m.Create(context.Background(), req)
}
func (m *mockRequestStore) GetByID(_ context.Context, _, _ uuid.UUID) (*models.PublicRequest, error) {
	return m.getByID, m.getByIDErr
}
func (m *mockRequestStore) GetByIDAndToken(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*models.PublicRequest, error) {
	return m.getByToken, m.getByTokenErr
}
func (m *mockRequestStore) UpdateStatus(_ context.Context, _, _ uuid.UUID, s models.RequestStatus, _ *string) error {
	m.updateStatus = s
	return m.updateErr
}
func (m *mockRequestStore) UpdateStatusTx(_ context.Context, _ pgx.Tx, id, org uuid.UUID, s models.RequestStatus, reason *string) error {
	return m.UpdateStatus(context.Background(), id, org, s, reason)
}
func (m *mockRequestStore) SetEventID(_ context.Context, _, _, _ uuid.UUID) error {
	return m.setEventIDErr
}
func (m *mockRequestStore) SetEventIDTx(_ context.Context, _ pgx.Tx, id, org, eventID uuid.UUID) error {
	return m.SetEventID(context.Background(), id, org, eventID)
}
func (m *mockRequestStore) MarkRead(_ context.Context, _, _ uuid.UUID) error { return m.markReadErr }
func (m *mockRequestStore) CountPendingByOrganizer(_ context.Context, _ uuid.UUID) (int, error) {
	return m.pendingCount, m.pendingErr
}
func (m *mockRequestStore) CreateResponse(_ context.Context, _ *models.PublicResponse) error {
	return m.responseErr
}
func (m *mockRequestStore) CreateResponseTx(_ context.Context, _ pgx.Tx, resp *models.PublicResponse) error {
	return m.CreateResponse(context.Background(), resp)
}
func (m *mockRequestStore) ExpireStale(_ context.Context, _ int) (int, error) {
	return m.expiredCount, m.expiredErr
}

type mockProfileLookup struct {
	profile *models.OrganizerPublicProfile
	err     error
}

func (m *mockProfileLookup) GetByUserID(_ context.Context, _ uuid.UUID) (*models.OrganizerPublicProfile, error) {
	return m.profile, m.err
}

type mockProductLookup struct {
	products []models.Product
	err      error
}

func (m *mockProductLookup) ListPublicProfileServices(_ context.Context, _ uuid.UUID) ([]models.Product, error) {
	return m.products, m.err
}
func (m *mockProductLookup) ListActiveForPublicProfileSettings(_ context.Context, _ uuid.UUID) ([]models.Product, error) {
	return m.products, m.err
}

type mockLinkStore struct {
	link         *models.PublicRequestLink
	getErr       error
	incrementErr error
	expiredCount int
	expiredErr   error
	incremented  int
}

func (m *mockLinkStore) GetByToken(_ context.Context, _ string) (*models.PublicRequestLink, error) {
	return m.link, m.getErr
}
func (m *mockLinkStore) IncrementUseTx(_ context.Context, _ pgx.Tx, _ uuid.UUID) error {
	m.incremented++
	return m.incrementErr
}
func (m *mockLinkStore) ExpireStale(_ context.Context) (int, error) {
	return m.expiredCount, m.expiredErr
}

type mockUserSlugLookup struct {
	user *models.User
	err  error
}

func (m *mockUserSlugLookup) GetByPublicSlug(_ context.Context, _ string) (*models.User, error) {
	return m.user, m.err
}

func newSvc(t *testing.T, rs *mockRequestStore, prof *mockProfileLookup, prod *mockProductLookup, ul *mockUserSlugLookup) *PublicRequestService {
	t.Helper()
	return NewPublicRequestService(rs, prof, prod, ul, nil, 100)
}

type mockPublicRequestNotifier struct {
	called int
	lastID uuid.UUID
	err    error
}

func (m *mockPublicRequestNotifier) SendPublicRequestCreated(_ context.Context, organizerUserID uuid.UUID, req *models.PublicRequest) error {
	m.called++
	m.lastID = organizerUserID
	_ = req
	return m.err
}

// --- CreatePublicRequest ---

func TestCreatePublicRequest_ProfileDisabled_ReturnsErrPublicProfileDisabled(t *testing.T) {
	uid := uuid.New()
	svc := newSvc(t, &mockRequestStore{}, &mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: false}}, &mockProductLookup{}, &mockUserSlugLookup{user: &models.User{ID: uid}})

	_, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{OrganizerSlug: "x", ContactEmail: "c@x.dev"})
	assert.ErrorIs(t, err, ErrPublicProfileDisabled)
}

func TestCreatePublicRequest_SlugNotFound_ReturnsErrPublicProfileDisabled(t *testing.T) {
	svc := newSvc(t, &mockRequestStore{}, &mockProfileLookup{}, &mockProductLookup{}, &mockUserSlugLookup{err: pgx.ErrNoRows})

	_, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{OrganizerSlug: "ghost", ContactEmail: "c@x.dev"})
	assert.ErrorIs(t, err, ErrPublicProfileDisabled)
}

func TestCreatePublicRequest_InvalidServiceID_ReturnsErrInvalidServices(t *testing.T) {
	uid := uuid.New()
	validProduct := uuid.New()
	prod := &mockProductLookup{products: []models.Product{{ID: validProduct, Name: "DJ", BasePrice: 1000, IsFeatured: true}}}
	svc := newSvc(t, &mockRequestStore{pendingCount: 0},
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		prod,
		&mockUserSlugLookup{user: &models.User{ID: uid}})

	// Request a service ID not in the public catalog.
	_, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{
		OrganizerSlug: "x", ContactEmail: "c@x.dev", ServiceIDs: []uuid.UUID{uuid.New()},
	})
	assert.ErrorIs(t, err, ErrInvalidServices)
}

func TestCreatePublicRequest_PendingCapExceeded_ReturnsErrPendingCapExceeded(t *testing.T) {
	uid := uuid.New()
	svc := newSvc(t, &mockRequestStore{pendingCount: 100},
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{},
		&mockUserSlugLookup{user: &models.User{ID: uid}})

	_, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{
		OrganizerSlug: "x", ContactEmail: "c@x.dev",
	})
	assert.ErrorIs(t, err, ErrPendingCapExceeded)
}

func TestCreatePublicRequest_HappyPath_BuildsSnapshotAndPersists(t *testing.T) {
	uid := uuid.New()
	pid := uuid.New()
	price := 1500.0
	prod := &mockProductLookup{products: []models.Product{{ID: pid, Name: "Banquete", BasePrice: price, IsFeatured: true}}}
	store := &mockRequestStore{pendingCount: 0}
	svc := newSvc(t, store,
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		prod,
		&mockUserSlugLookup{user: &models.User{ID: uid}})

	req, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{
		OrganizerSlug: "x",
		ContactEmail:  "client@example.com",
		ServiceIDs:    []uuid.UUID{pid},
	})
	require.NoError(t, err)
	require.NotNil(t, req)
	assert.Equal(t, uid, store.created.OrganizerUserID)
	assert.Equal(t, models.RequestStatusPending, store.created.Status)
	assert.Equal(t, models.RequestSourcePublicProfile, store.created.Source)
	assert.Equal(t, models.SubmitModeStandard, store.created.SubmitMode)
	require.Len(t, store.created.Services, 1)
	assert.Equal(t, "Banquete", store.created.Services[0].Name)
	assert.Equal(t, &price, store.created.Services[0].Price)
	assert.Equal(t, 1, store.created.Services[0].Qty)
	assert.True(t, store.created.Services[0].IsFeatured)
}

func TestCreatePublicRequest_NotifiesOrganizerAsync(t *testing.T) {
	uid := uuid.New()
	store := &mockRequestStore{pendingCount: 0}
	// Create populates ID only if the mock sets it — simulate repo Create filling ID.
	store.createErr = nil
	svc := newSvc(t, store,
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{},
		&mockUserSlugLookup{user: &models.User{ID: uid}})
	n := &mockPublicRequestNotifier{}
	svc.SetNotifier(n)

	// Ensure Create assigns an ID like the real repo.
	origCreate := store.Create
	_ = origCreate
	store2 := &mockRequestStoreWithID{mockRequestStore: store}
	svc.requestRepo = store2

	_, err := svc.CreatePublicRequest(context.Background(), CreatePublicRequestInput{
		OrganizerSlug: "x", ContactEmail: "c@x.dev",
	})
	require.NoError(t, err)

	// Async goroutine — wait briefly.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) && n.called == 0 {
		time.Sleep(10 * time.Millisecond)
	}
	assert.Equal(t, 1, n.called)
	assert.Equal(t, uid, n.lastID)
}

// mockRequestStoreWithID assigns a UUID on Create like the real repo.
type mockRequestStoreWithID struct {
	*mockRequestStore
}

func (m *mockRequestStoreWithID) Create(ctx context.Context, req *models.PublicRequest) error {
	req.ID = uuid.New()
	return m.mockRequestStore.Create(ctx, req)
}

// --- State machine (Respond / RequestInfo / Decline / ClientAction) ---

func TestRespond_FromPending_TransitionsToResponded(t *testing.T) {
	uid := uuid.New()
	rid := uuid.New()
	store := &mockRequestStore{getByID: &models.PublicRequest{ID: rid, OrganizerUserID: uid, Status: models.RequestStatusPending}}
	svc := newSvc(t, store, nil, nil, nil)

	err := svc.Respond(context.Background(), rid, uid, &models.PublicResponse{QuoteAmount: 5000})
	require.NoError(t, err)
	assert.Equal(t, models.RequestStatusResponded, store.updateStatus)
}

func TestRespond_FromDeclined_ReturnsErrInvalidTransition(t *testing.T) {
	uid := uuid.New()
	rid := uuid.New()
	store := &mockRequestStore{getByID: &models.PublicRequest{Status: models.RequestStatusDeclinedProvider}}
	svc := newSvc(t, store, nil, nil, nil)

	err := svc.Respond(context.Background(), rid, uid, &models.PublicResponse{})
	assert.ErrorIs(t, err, ErrInvalidTransition)
}

func TestRequestInfo_FromPending_TransitionsToInfoRequested(t *testing.T) {
	store := &mockRequestStore{getByID: &models.PublicRequest{Status: models.RequestStatusPending}}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.RequestInfo(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	assert.Equal(t, models.RequestStatusInfoRequested, store.updateStatus)
}

func TestDecline_FromPending_TransitionsToDeclinedProvider(t *testing.T) {
	store := &mockRequestStore{getByID: &models.PublicRequest{Status: models.RequestStatusPending}}
	svc := newSvc(t, store, nil, nil, nil)
	reason := "fully booked"
	err := svc.Decline(context.Background(), uuid.New(), uuid.New(), &reason)
	require.NoError(t, err)
	assert.Equal(t, models.RequestStatusDeclinedProvider, store.updateStatus)
}

func TestClientAction_Accept_FromResponded_TransitionsToAcceptedByClient(t *testing.T) {
	uid := uuid.New()
	rid := uuid.New()
	store := &mockRequestStore{getByToken: &models.PublicRequest{ID: rid, OrganizerUserID: uid, Status: models.RequestStatusResponded}}
	svc := newSvc(t, store, nil, nil, nil)

	err := svc.ClientAction(context.Background(), rid, uuid.New(), "accept")
	require.NoError(t, err)
	assert.Equal(t, models.RequestStatusAcceptedByClient, store.updateStatus)
}

func TestClientAction_InvalidAction_ReturnsError(t *testing.T) {
	store := &mockRequestStore{getByToken: &models.PublicRequest{Status: models.RequestStatusResponded}}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.ClientAction(context.Background(), uuid.New(), uuid.New(), "bogus")
	assert.Error(t, err)
}

func TestClientAction_FromPending_ReturnsErrInvalidTransition(t *testing.T) {
	store := &mockRequestStore{getByToken: &models.PublicRequest{Status: models.RequestStatusPending}}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.ClientAction(context.Background(), uuid.New(), uuid.New(), "accept")
	assert.ErrorIs(t, err, ErrInvalidTransition)
}

func TestClientAction_WrongToken_ReturnsErrRequestNotFound(t *testing.T) {
	store := &mockRequestStore{getByTokenErr: pgx.ErrNoRows}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.ClientAction(context.Background(), uuid.New(), uuid.New(), "accept")
	assert.ErrorIs(t, err, ErrRequestNotFound)
}

// --- GetByID miss → ErrRequestNotFound ---

func TestRespond_RequestMissing_ReturnsErrRequestNotFound(t *testing.T) {
	store := &mockRequestStore{getByIDErr: pgx.ErrNoRows}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.Respond(context.Background(), uuid.New(), uuid.New(), &models.PublicResponse{})
	assert.ErrorIs(t, err, ErrRequestNotFound)
}

// --- MarkRead ---

func TestMarkRead_HappyPath(t *testing.T) {
	store := &mockRequestStore{}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.MarkRead(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
}

func TestMarkRead_Missing_ReturnsErrRequestNotFound(t *testing.T) {
	store := &mockRequestStore{markReadErr: pgx.ErrNoRows}
	svc := newSvc(t, store, nil, nil, nil)
	err := svc.MarkRead(context.Background(), uuid.New(), uuid.New())
	assert.ErrorIs(t, err, ErrRequestNotFound)
}

// --- ConvertToEvent (idempotency guard — full tx path tested in integration) ---

func TestConvertToEvent_AlreadyConverted_ReturnsErrAlreadyConverted(t *testing.T) {
	uid := uuid.New()
	rid := uuid.New()
	existing := uuid.New()
	store := &mockRequestStore{getByID: &models.PublicRequest{
		ID: rid, OrganizerUserID: uid, EventID: &existing, Status: models.RequestStatusBooked,
	}}
	svc := newSvc(t, store, nil, nil, nil)

	got, err := svc.ConvertToEvent(context.Background(), rid, uid)
	assert.ErrorIs(t, err, ErrAlreadyConverted)
	assert.NotNil(t, got) // returns existing event_id for idempotency
	assert.Equal(t, existing, *got)
}

func TestConvertToEvent_FromPending_ReturnsErrInvalidTransition(t *testing.T) {
	uid := uuid.New()
	store := &mockRequestStore{getByID: &models.PublicRequest{OrganizerUserID: uid, Status: models.RequestStatusPending}}
	svc := newSvc(t, store, nil, nil, nil)
	_, err := svc.ConvertToEvent(context.Background(), uuid.New(), uid)
	assert.ErrorIs(t, err, ErrInvalidTransition)
}

// --- ExpireStale ---

func TestExpireStale_DelegatesToRepo(t *testing.T) {
	store := &mockRequestStore{expiredCount: 7}
	svc := newSvc(t, store, nil, nil, nil)
	n, err := svc.ExpireStale(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 7, n)
}

func TestExpireStale_PropagatesError(t *testing.T) {
	store := &mockRequestStore{expiredErr: errors.New("db down")}
	svc := newSvc(t, store, nil, nil, nil)
	_, err := svc.ExpireStale(context.Background())
	assert.Error(t, err)
}

// --- helpers coverage ---

func TestClientNameFromRequest_UsesContactNameIfPresent(t *testing.T) {
	name := "María"
	req := &models.PublicRequest{ContactName: &name, ContactEmail: "maria@x.dev"}
	assert.Equal(t, "María", clientNameFromRequest(req))
}

func TestClientNameFromRequest_FallsBackToEmailLocalPart(t *testing.T) {
	req := &models.PublicRequest{ContactEmail: "juan.perez@x.dev"}
	assert.Equal(t, "juan.perez", clientNameFromRequest(req))
}

func TestCanTransition_Table(t *testing.T) {
	cases := []struct {
		from, to models.RequestStatus
		want     bool
	}{
		{models.RequestStatusPending, models.RequestStatusResponded, true},
		{models.RequestStatusPending, models.RequestStatusDeclinedProvider, true},
		{models.RequestStatusResponded, models.RequestStatusAcceptedByClient, true},
		{models.RequestStatusResponded, models.RequestStatusBooked, true},
		{models.RequestStatusInfoRequested, models.RequestStatusPending, true},
		{models.RequestStatusPending, models.RequestStatusBooked, false},
		{models.RequestStatusDeclinedProvider, models.RequestStatusResponded, false},
		{models.RequestStatusBooked, models.RequestStatusExpired, false}, // terminal
	}
	for _, c := range cases {
		got := canTransition(c.from, c.to)
		assert.Equalf(t, c.want, got, "canTransition(%s,%s)", c.from, c.to)
	}
}

// --- CreateFromLink ---

func TestCreateFromLink_Expired_ReturnsErrLinkInvalid(t *testing.T) {
	uid := uuid.New()
	past := time.Now().UTC().Add(-time.Hour)
	links := &mockLinkStore{link: &models.PublicRequestLink{
		ID: uuid.New(), OrganizerUserID: uid,
		Status: models.PublicRequestLinkActive, ExpiresAt: &past,
		SubmitMode: models.SubmitModeStandard,
	}}
	store := &mockRequestStore{pendingCount: 0}
	svc := newSvc(t, store,
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{},
		&mockUserSlugLookup{user: &models.User{ID: uid}})
	svc.SetLinkRepo(links)

	_, err := svc.CreateFromLink(context.Background(), "tok", CreatePublicRequestInput{
		ContactEmail: "c@x.dev",
	})
	assert.ErrorIs(t, err, ErrLinkInvalid)
}

func TestCreateFromLink_NotFound(t *testing.T) {
	svc := newSvc(t, &mockRequestStore{}, &mockProfileLookup{}, &mockProductLookup{}, &mockUserSlugLookup{})
	svc.SetLinkRepo(&mockLinkStore{getErr: pgx.ErrNoRows})
	_, err := svc.CreateFromLink(context.Background(), "missing", CreatePublicRequestInput{ContactEmail: "c@x.dev"})
	assert.ErrorIs(t, err, ErrLinkNotFound)
}

func TestCreateFromLink_Standard_Pending(t *testing.T) {
	uid := uuid.New()
	linkID := uuid.New()
	links := &mockLinkStore{link: &models.PublicRequestLink{
		ID: linkID, OrganizerUserID: uid,
		Status: models.PublicRequestLinkActive, SubmitMode: models.SubmitModeStandard,
	}}
	store := &mockRequestStore{pendingCount: 0}
	svc := newSvc(t, store,
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{},
		&mockUserSlugLookup{user: &models.User{ID: uid}})
	svc.SetLinkRepo(links)

	name := "Ana"
	req, err := svc.CreateFromLink(context.Background(), "tok", CreatePublicRequestInput{
		ContactEmail: "c@x.dev", ContactName: &name,
	})
	require.NoError(t, err)
	assert.Equal(t, models.RequestStatusPending, req.Status)
	assert.Equal(t, models.RequestSourceSharedLink, req.Source)
	assert.Equal(t, models.SubmitModeStandard, req.SubmitMode)
	require.NotNil(t, req.LinkID)
	assert.Equal(t, linkID, *req.LinkID)
}

func TestCreateFromLink_AutoEvent_RequiresPhone(t *testing.T) {
	uid := uuid.New()
	links := &mockLinkStore{link: &models.PublicRequestLink{
		ID: uuid.New(), OrganizerUserID: uid,
		Status: models.PublicRequestLinkActive, SubmitMode: models.SubmitModeAutoEvent,
	}}
	svc := newSvc(t, &mockRequestStore{pendingCount: 0},
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{},
		&mockUserSlugLookup{user: &models.User{ID: uid}})
	svc.SetLinkRepo(links)

	name, date, etype := "Ana", "2026-11-20", "Boda"
	guests := 10
	_, err := svc.CreateFromLink(context.Background(), "tok", CreatePublicRequestInput{
		ContactEmail: "c@x.dev", ContactName: &name, EventDate: &date, EventType: &etype, GuestCount: &guests,
	})
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrValidation)
	assert.Contains(t, err.Error(), "contact_phone")
}

func TestCreateFromLink_InvalidServiceAgainstCatalog(t *testing.T) {
	uid := uuid.New()
	links := &mockLinkStore{link: &models.PublicRequestLink{
		ID: uuid.New(), OrganizerUserID: uid,
		Status: models.PublicRequestLinkActive, SubmitMode: models.SubmitModeStandard,
	}}
	valid := uuid.New()
	svc := newSvc(t, &mockRequestStore{pendingCount: 0},
		&mockProfileLookup{profile: &models.OrganizerPublicProfile{IsEnabled: true}},
		&mockProductLookup{products: []models.Product{{ID: valid, Name: "DJ", BasePrice: 1}}},
		&mockUserSlugLookup{user: &models.User{ID: uid}})
	svc.SetLinkRepo(links)

	_, err := svc.CreateFromLink(context.Background(), "tok", CreatePublicRequestInput{
		ContactEmail: "c@x.dev",
		Services:     []ServiceSelection{{ProductID: uuid.New(), Qty: 1}},
	})
	assert.ErrorIs(t, err, ErrInvalidServices)
}
