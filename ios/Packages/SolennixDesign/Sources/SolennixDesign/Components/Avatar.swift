import SwiftUI

/// User/client avatar with photo or colored initials fallback.
public struct Avatar: View {
    let name: String
    var photoURL: String? = nil
    var size: CGFloat = 40

    public init(name: String, photoURL: String? = nil, size: CGFloat = 40) {
        self.name = name
        self.photoURL = photoURL
        self.size = size
    }

    private static let apiBaseURL = URL(string: "https://api.solennix.com")!

    public var body: some View {
        if let photoURL, let url = Self.resolveURL(photoURL) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    initialsView
                case .empty:
                    ProgressView()
                        .frame(width: size, height: size)
                @unknown default:
                    initialsView
                }
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            initialsView
        }
    }

    private var initialsView: some View {
        Circle()
            .fill(avatarColor)
            .frame(width: size, height: size)
            .overlay(
                Text(initials)
                    .font(.system(size: size * 0.38, weight: .semibold))
                    .foregroundStyle(.white)
            )
    }

    private var initials: String {
        let parts = name
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ")
        switch parts.count {
        case 0:
            return "?"
        case 1:
            return String(parts[0].prefix(1)).uppercased()
        default:
            let first = String(parts[0].prefix(1)).uppercased()
            let last = String(parts[parts.count - 1].prefix(1)).uppercased()
            return first + last
        }
    }

    private static func resolveURL(_ path: String) -> URL? {
        if path.hasPrefix("http://") || path.hasPrefix("https://") {
            return URL(string: path)
        }
        return URL(string: path, relativeTo: apiBaseURL)
    }

    private var avatarColor: Color {
        let hash = abs(name.hashValue)
        let index = hash % SolennixColors.avatarColors.count
        return SolennixColors.avatarColors[index]
    }
}

// MARK: - Preview

#Preview("Avatar Variants") {
    HStack(spacing: Spacing.md) {
        Avatar(name: "Maria Garcia", size: 48)
        Avatar(name: "Juan Perez", size: 48)
        Avatar(name: "Ana", size: 48)
        Avatar(
            name: "Carlos Lopez",
            photoURL: "https://picsum.photos/100",
            size: 48
        )
    }
    .padding()
    .background(SolennixColors.background)
}
