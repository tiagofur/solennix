import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

final class ProductListViewModelTests: XCTestCase {
    
    func testShowInactiveFiltersCorrectly() {
        let apiClient = APIClient()
        let viewModel = ProductListViewModel(apiClient: apiClient)
        
        let p1 = Product(id: "1", userId: "u1", name: "Active Product", category: "Cat", basePrice: 10.0, isActive: true, createdAt: "", updatedAt: "")
        let p2 = Product(id: "2", userId: "u1", name: "Inactive Product", category: "Cat", basePrice: 20.0, isActive: false, createdAt: "", updatedAt: "")
        
        viewModel.products = [p1, p2]
        
        // Default showInactive is false, should only show active products
        XCTAssertFalse(viewModel.showInactive)
        viewModel.applyFilters()
        
        XCTAssertEqual(viewModel.filteredProducts.count, 1)
        XCTAssertEqual(viewModel.filteredProducts.first?.id, "1")
        
        // Setting showInactive to true should show both products
        viewModel.showInactive = true
        XCTAssertEqual(viewModel.filteredProducts.count, 2)
    }
}
