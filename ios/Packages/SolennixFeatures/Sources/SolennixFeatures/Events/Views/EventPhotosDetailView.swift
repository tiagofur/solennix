import SwiftUI
import PhotosUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

// MARK: - Event Photos Detail View

public struct EventPhotosDetailView: View {

    let eventId: String

    @State private var viewModel: EventDetailViewModel
    @State private var selectedPhotos: [PhotosPickerItem] = []
    @State private var lightboxIndex: Int?
    @Environment(\.horizontalSizeClass) private var sizeClass

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .body) private var emptyIconSize: CGFloat = 48
    private var cappedEmptyIconSize: CGFloat { min(emptyIconSize, 64) }

    @State private var isProcessingSelection = false

    private var isBusy: Bool {
        isProcessingSelection || viewModel.isUploadingPhoto
    }

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self._viewModel = State(initialValue: EventDetailViewModel(apiClient: apiClient))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.event == nil {
                ProgressView(tr("common.loading", "Cargando..."))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(tr("events.photos.title", "Fotos del Evento"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                photosPickerButton
            }
        }
        .task { await viewModel.loadData(eventId: eventId) }
        .fullScreenCover(item: $lightboxIndex) { index in
            lightboxView(index: index)
        }
    }

    // MARK: - Subviews

    private var photosPickerButton: some View {
        PhotosPicker(
            selection: $selectedPhotos,
            maxSelectionCount: 5,
            matching: .images
        ) {
            if isBusy {
                ProgressView()
                    .tint(SolennixColors.primary)
            } else {
                Image(systemName: "plus")
                    .font(.body)
                    .foregroundStyle(SolennixColors.primary)
                    .accessibilityLabel(tr("events.photos.add", "Agregar Fotos"))
            }
        }
        .disabled(isBusy)
        .onChange(of: selectedPhotos) { _, newItems in
            handlePhotosSelection(newItems)
        }
    }

    private func handlePhotosSelection(_ newItems: [PhotosPickerItem]) {
        guard !newItems.isEmpty else { return }
        isProcessingSelection = true
        Task {
            defer {
                isProcessingSelection = false
                selectedPhotos = []
            }
            var imageDataArray: [Data] = []
            for item in newItems {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    imageDataArray.append(data)
                }
            }
            if !imageDataArray.isEmpty {
                await viewModel.addPhotos(data: imageDataArray, eventId: eventId)
            }
        }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.md) {
                if !viewModel.eventPhotos.isEmpty {
                    Text(FeatureL10n.plural("events.photos.count", "%lld fotos", count: viewModel.eventPhotos.count))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                if viewModel.eventPhotos.isEmpty {
                    VStack(spacing: Spacing.md) {
                        Image(systemName: "camera")
                            .font(.system(size: cappedEmptyIconSize))
                            .foregroundStyle(SolennixColors.textTertiary)

                        Text(tr("events.photos.empty", "Sin fotos"))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        Text(tr("events.photos.empty_message", "Agrega fotos del evento para tener un registro visual"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxl)
                } else {
                    // Photo grid with clean 1:1 aspect ratio tiles
                    let columns = [GridItem(.adaptive(minimum: 140, maximum: 220), spacing: Spacing.md)]

                    LazyVGrid(columns: columns, spacing: Spacing.md) {
                        ForEach(Array(viewModel.eventPhotos.enumerated()), id: \.offset) { index, url in
                            ZStack(alignment: .topTrailing) {
                                Button {
                                    lightboxIndex = index
                                } label: {
                                    Color.clear
                                        .aspectRatio(1, contentMode: .fill)
                                        .overlay(
                                            AsyncImage(url: APIClient.resolveURL(url)) { image in
                                                image
                                                    .resizable()
                                                    .scaledToFill()
                                            } placeholder: {
                                                ProgressView()
                                                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                                                    .background(SolennixColors.surfaceAlt)
                                            }
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                                }
                                .buttonStyle(.plain)

                                Button {
                                    Task { await viewModel.removePhoto(at: index, eventId: eventId) }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title3)
                                        .foregroundStyle(.white)
                                        .background(Color.black.opacity(0.4), in: Circle())
                                        .padding(Spacing.xs)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, sizeClass == .regular ? Spacing.xl : Spacing.md)
            .padding(.vertical, sizeClass == .regular ? Spacing.xl : Spacing.lg)
        }
    }

    // MARK: - Lightbox

    private func lightboxView(index: Int) -> some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if index >= 0 && index < viewModel.eventPhotos.count {
                AsyncImage(url: APIClient.resolveURL(viewModel.eventPhotos[index])) { image in
                    image
                        .resizable()
                        .scaledToFit()
                } placeholder: {
                    ProgressView()
                        .tint(.white)
                }
            }

            VStack {
                HStack {
                    Spacer()
                    Button {
                        lightboxIndex = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundStyle(.white)
                            .padding()
                    }
                }
                Spacer()
            }
        }
    }
}

// MARK: - Int Identifiable for lightbox

extension Int: @retroactive Identifiable {
    public var id: Int { self }
}
