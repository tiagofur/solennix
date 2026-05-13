import XCTest
import SolennixNetwork

final class EndpointTests: XCTestCase {

    func testAuthEndpointsRemainStable() {
        XCTAssertEqual(Endpoint.register, "/auth/register")
        XCTAssertEqual(Endpoint.login, "/auth/login")
        XCTAssertEqual(Endpoint.logout, "/auth/logout")
        XCTAssertEqual(Endpoint.refresh, "/auth/refresh")
        XCTAssertEqual(Endpoint.forgotPassword, "/auth/forgot-password")
        XCTAssertEqual(Endpoint.resetPassword, "/auth/reset-password")
        XCTAssertEqual(Endpoint.teamInviteAccept, "/auth/team-invite/accept")
        XCTAssertEqual(Endpoint.me, "/auth/me")
        XCTAssertEqual(Endpoint.changePassword, "/auth/change-password")
        XCTAssertEqual(Endpoint.appleAuth, "/auth/apple")
        XCTAssertEqual(Endpoint.googleAuth, "/auth/google")
    }

    func testClientAndEventBuildersEmbedId() {
        XCTAssertEqual(Endpoint.clients, "/clients")
        XCTAssertEqual(Endpoint.events, "/events")
        XCTAssertEqual(Endpoint.upcomingEvents, "/events/upcoming")
        XCTAssertEqual(Endpoint.eventsSearch, "/events/search")
        XCTAssertEqual(Endpoint.client("cl_1"), "/clients/cl_1")
        XCTAssertEqual(Endpoint.event("ev_1"), "/events/ev_1")
        XCTAssertEqual(Endpoint.eventProducts("ev_1"), "/events/ev_1/products")
        XCTAssertEqual(Endpoint.eventExtras("ev_1"), "/events/ev_1/extras")
        XCTAssertEqual(Endpoint.eventItems("ev_1"), "/events/ev_1/items")
        XCTAssertEqual(Endpoint.eventEquipment("ev_1"), "/events/ev_1/equipment")
        XCTAssertEqual(Endpoint.eventSupplies("ev_1"), "/events/ev_1/supplies")
        XCTAssertEqual(Endpoint.eventStaff("ev_1"), "/events/ev_1/staff")
        XCTAssertEqual(Endpoint.eventPublicLink("ev_1"), "/events/ev_1/public-link")
        XCTAssertEqual(Endpoint.equipmentConflicts, "/events/equipment/conflicts")
        XCTAssertEqual(Endpoint.equipmentSuggestions, "/events/equipment/suggestions")
        XCTAssertEqual(Endpoint.equipmentAvailability, "/events/equipment/availability")
        XCTAssertEqual(Endpoint.supplySuggestions, "/events/supplies/suggestions")
    }

    func testStaffBuildersEmbedId() {
        XCTAssertEqual(Endpoint.staff, "/staff")
        XCTAssertEqual(Endpoint.staffMyAssignments, "/staff/my-assignments")
        XCTAssertEqual(Endpoint.staffAvailability, "/staff/availability")
        XCTAssertEqual(Endpoint.staffTeams, "/staff/teams")
        XCTAssertEqual(Endpoint.staff("st_1"), "/staff/st_1")
        XCTAssertEqual(Endpoint.staffInvite("st_1"), "/staff/st_1/invite")
        XCTAssertEqual(Endpoint.staffRespondAssignment("asg_1"), "/staff/assignments/asg_1/respond")
        XCTAssertEqual(Endpoint.staffTeam("team_1"), "/staff/teams/team_1")
    }

    func testProductAndInventoryBuildersEmbedId() {
        XCTAssertEqual(Endpoint.products, "/products")
        XCTAssertEqual(Endpoint.product("prd_1"), "/products/prd_1")
        XCTAssertEqual(Endpoint.productIngredients("prd_1"), "/products/prd_1/ingredients")
        XCTAssertEqual(Endpoint.batchIngredients, "/products/ingredients/batch")
        XCTAssertEqual(Endpoint.inventory, "/inventory")
        XCTAssertEqual(Endpoint.inventoryItem("inv_1"), "/inventory/inv_1")
    }

    func testPaymentAndSubmissionBuildersEmbedId() {
        XCTAssertEqual(Endpoint.payments, "/payments")
        XCTAssertEqual(Endpoint.paymentSubmissionsInbox, "/payment-submissions")
        XCTAssertEqual(Endpoint.payment("pay_1"), "/payments/pay_1")
        XCTAssertEqual(Endpoint.paymentSubmission("sub_1"), "/payment-submissions/sub_1")
        XCTAssertEqual(Endpoint.unavailableDates, "/unavailable-dates")
        XCTAssertEqual(Endpoint.unavailableDate("ud_1"), "/unavailable-dates/ud_1")
    }

    func testPdfAndLiveActivityBuildersEmbedParameters() {
        XCTAssertEqual(Endpoint.eventPDF("ev_1", type: "quote"), "/events/ev_1/pdf/quote")
        XCTAssertEqual(Endpoint.quickQuotePDF, "/quick-quotes/pdf")
        XCTAssertEqual(Endpoint.registerLiveActivityToken, "/live-activities/register")
        XCTAssertEqual(Endpoint.liveActivityByEvent("ev_1"), "/live-activities/by-event/ev_1")
    }

    func testDashboardAndSearchEndpointsAreStable() {
        XCTAssertEqual(Endpoint.dashboardKpis, "/dashboard/kpis")
        XCTAssertEqual(Endpoint.dashboardRevenueChart, "/dashboard/revenue-chart")
        XCTAssertEqual(Endpoint.dashboardEventsByStatus, "/dashboard/events-by-status")
        XCTAssertEqual(Endpoint.dashboardTopClients, "/dashboard/top-clients")
        XCTAssertEqual(Endpoint.dashboardProductDemand, "/dashboard/product-demand")
        XCTAssertEqual(Endpoint.dashboardForecast, "/dashboard/forecast")
        XCTAssertEqual(Endpoint.search, "/search")
    }

    func testProfileSubscriptionUploadsAndEventFormEndpointsAreStable() {
        XCTAssertEqual(Endpoint.updateProfile, "/users/me")
        XCTAssertEqual(Endpoint.subscriptionStatus, "/subscriptions/status")
        XCTAssertEqual(Endpoint.registerDevice, "/devices/register")
        XCTAssertEqual(Endpoint.unregisterDevice, "/devices/unregister")
        XCTAssertEqual(Endpoint.uploadImage, "/uploads/image")
        XCTAssertEqual(Endpoint.uploadPresign, "/uploads/presign")
        XCTAssertEqual(Endpoint.uploadComplete, "/uploads/complete")
        XCTAssertEqual(Endpoint.eventFormLinks, "/event-forms")
        XCTAssertEqual(Endpoint.eventFormLink("form_1"), "/event-forms/form_1")
    }
}
