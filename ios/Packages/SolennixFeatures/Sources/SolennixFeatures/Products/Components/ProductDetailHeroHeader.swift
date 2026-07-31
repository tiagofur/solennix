import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product Detail Hero Header

/// Stretchy hero image header. Parallax-stretches the image when the scroll
/// offset is positive (pulled down) and pins/clips it while scrolling up.
struct ProductDetailHeroHeader: View {

    let product: Product
    let cappedImageHeight: CGFloat

    var body: some View {
        GeometryReader { geometry in
            let minY = geometry.frame(in: .global).minY
            let height = cappedImageHeight + (minY > 0 ? minY : 0)

            Group {
                if let imageUrl = product.imageUrl, !imageUrl.isEmpty,
                   let url = APIClient.resolveURL(imageUrl) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(SolennixColors.surface)
                    }
                } else {
                    Rectangle()
                        .fill(SolennixColors.surface)
                        .overlay {
                            Image(systemName: "photo")
                                .font(.title)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }
                }
            }
            .frame(width: geometry.size.width, height: height)
            .clipped()
            .offset(y: minY > 0 ? -minY : 0)
        }
        .frame(height: cappedImageHeight)
    }
}
