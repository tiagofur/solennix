import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

struct EventDetailPhotosSummaryCard: View {
    let title: String
    let count: Int
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: "camera.fill")
                        .font(.body)
                        .foregroundStyle(SolennixColors.info)

                    Spacer()

                    if count > 0 {
                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(SolennixColors.info)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(SolennixColors.infoBg)
                            .clipShape(Capsule())
                    }
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixCard(radius: CornerRadius.lg, border: false)
        }
        .buttonStyle(.plain)
    }
}

struct EventDetailPhotosPreviewCard: View {
    let title: String
    let photos: [String]
    let route: Route

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Text("\(photos.count)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.info)
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }

            HStack(spacing: Spacing.sm) {
                ForEach(Array(photos.prefix(4).enumerated()), id: \.offset) { index, url in
                    AsyncImage(url: APIClient.resolveURL(url)) { image in
                        image
                            .resizable()
                            .scaledToFill()
                    } placeholder: {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(SolennixColors.surfaceAlt)
                    }
                    .frame(height: 60)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    .overlay {
                        if index == 3 && photos.count > 4 {
                            RoundedRectangle(cornerRadius: CornerRadius.sm)
                                .fill(.black.opacity(0.5))
                            Text("+\(photos.count - 4)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                        }
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(
            NavigationLink(value: route) {
                Color.clear
            }
            .buttonStyle(.plain)
            .opacity(0)
        )
    }
}
