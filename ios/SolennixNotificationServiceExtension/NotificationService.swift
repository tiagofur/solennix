import UserNotifications

/// Service Extension que enriquece las push notifications remotas descargando
/// la imagen referenciada en el payload (`image_url`) y adjuntándola.
///
/// Para activarse, el servidor debe enviar `mutable-content: 1` en el aps payload
/// e incluir un campo `image_url` en el contenido custom. Ejemplo:
/// ```json
/// {
///   "aps": {
///     "alert": { "title": "...", "body": "..." },
///     "mutable-content": 1,
///     "category": "EVENT_CATEGORY"
///   },
///   "image_url": "https://cdn.solennix.com/events/123/cover.jpg",
///   "event_id": "123",
///   "type": "event_reminder"
/// }
/// ```
final class NotificationService: UNNotificationServiceExtension {

    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        self.bestAttempt = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttempt else {
            contentHandler(request.content)
            return
        }

        // Buscar URL de imagen en el payload (snake_case o camelCase).
        let urlString = (bestAttempt.userInfo["image_url"] as? String)
            ?? (bestAttempt.userInfo["imageURL"] as? String)

        guard let urlString,
              let imageURL = URL(string: urlString)
        else {
            contentHandler(bestAttempt)
            return
        }

        downloadAttachment(from: imageURL) { [weak self] attachment in
            guard let self, let bestAttempt = self.bestAttempt else { return }
            if let attachment {
                bestAttempt.attachments = [attachment]
            }
            contentHandler(bestAttempt)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // El sistema nos avisa que se acabó el tiempo (~30s). Entregamos lo mejor que tengamos.
        if let contentHandler, let bestAttempt {
            contentHandler(bestAttempt)
        }
    }

    // MARK: - Download

    private func downloadAttachment(
        from url: URL,
        completion: @escaping (UNNotificationAttachment?) -> Void
    ) {
        let task = URLSession.shared.downloadTask(with: url) { tempURL, response, _ in
            guard let tempURL else {
                completion(nil)
                return
            }

            // Mover el archivo a una ubicación con la extensión correcta.
            let fileExtension = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let filename = "\(UUID().uuidString).\(fileExtension)"
            let targetURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)

            do {
                try? FileManager.default.removeItem(at: targetURL)
                try FileManager.default.moveItem(at: tempURL, to: targetURL)
                let attachment = try UNNotificationAttachment(
                    identifier: "image",
                    url: targetURL,
                    options: nil
                )
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
