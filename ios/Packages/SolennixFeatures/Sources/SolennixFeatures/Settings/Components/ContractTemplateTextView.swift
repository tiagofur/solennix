import SwiftUI
import UIKit
import SolennixDesign

// MARK: - Contract Template Text View

/// A UITextView wrapper that renders `[Variable]` patterns as colored chips
/// and supports inserting text at the current cursor position.
struct ContractTemplateTextView: UIViewRepresentable {

    @Binding var text: String
    var height: CGFloat = 250

    /// Called when a variable should be inserted; provides a closure to perform the insertion.
    /// Set externally via the coordinator's `insertVariable` method.
    var onCoordinatorReady: ((Coordinator) -> Void)?

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text)
    }

    func makeUIView(context: Context) -> UITextView {
        let textView = UITextView()
        textView.delegate = context.coordinator
        textView.font = .preferredFont(forTextStyle: .body)
        textView.backgroundColor = .clear
        textView.isScrollEnabled = true
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 8, bottom: 12, right: 8)
        textView.setContentHuggingPriority(.defaultLow, for: .vertical)
        textView.setContentCompressionResistancePriority(.defaultLow, for: .vertical)

        context.coordinator.textView = textView
        onCoordinatorReady?(context.coordinator)

        // Apply initial styling
        context.coordinator.applyAttributedStyling(to: textView)

        return textView
    }

    func updateUIView(_ textView: UITextView, context: Context) {
        // Only update if the text actually changed (avoid cursor reset)
        if textView.text != text {
            let selectedRange = textView.selectedRange
            let savedOffset = textView.contentOffset
            textView.isScrollEnabled = false
            textView.text = text
            context.coordinator.applyAttributedStyling(to: textView)
            // Restore cursor position if valid
            if selectedRange.location + selectedRange.length <= (textView.text as NSString).length {
                textView.selectedRange = selectedRange
            }
            textView.isScrollEnabled = true
            textView.contentOffset = savedOffset
        }

        onCoordinatorReady?(context.coordinator)
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, UITextViewDelegate {
        var text: Binding<String>
        weak var textView: UITextView?

        private static let variablePattern = try! NSRegularExpression(pattern: "\\[([^\\[\\]]+)\\]")

        init(text: Binding<String>) {
            self.text = text
        }

        /// Insert a variable string at the current cursor position
        func insertVariable(_ variable: String) {
            guard let textView = textView else { return }

            let insertText = "[\(variable)]"
            let currentRange = textView.selectedRange
            let savedOffset = textView.contentOffset

            // Insert at cursor position
            if let textRange = textView.textRange(
                from: textView.position(from: textView.beginningOfDocument, offset: currentRange.location) ?? textView.endOfDocument,
                to: textView.position(from: textView.beginningOfDocument, offset: currentRange.location + currentRange.length) ?? textView.endOfDocument
            ) {
                textView.replace(textRange, withText: insertText)
            } else {
                // Fallback: append at end
                textView.text.append(insertText)
            }

            // Sync back to binding
            text.wrappedValue = textView.text
            applyAttributedStyling(to: textView)

            // Move cursor after inserted text; disable scroll to prevent jump
            let newPosition = currentRange.location + (insertText as NSString).length
            textView.isScrollEnabled = false
            textView.selectedRange = NSRange(location: newPosition, length: 0)
            textView.isScrollEnabled = true
            textView.contentOffset = savedOffset
        }

        func textViewDidChange(_ textView: UITextView) {
            text.wrappedValue = textView.text
            let selectedRange = textView.selectedRange
            applyAttributedStyling(to: textView)
            // Restore cursor after styling
            if selectedRange.location + selectedRange.length <= (textView.attributedText?.length ?? 0) {
                textView.selectedRange = selectedRange
            }
        }

        func applyAttributedStyling(to textView: UITextView) {
            let fullText = textView.text ?? ""
            let attributedString = NSMutableAttributedString(
                string: fullText,
                attributes: [
                    .font: UIFont.preferredFont(forTextStyle: .body),
                    .foregroundColor: UIColor.label,
                ]
            )

            // Style [Variable] patterns as chips
            let matches = Self.variablePattern.matches(
                in: fullText,
                range: NSRange(location: 0, length: (fullText as NSString).length)
            )

            let primaryColor = UIColor(SolennixColors.primary)
            let primaryLightColor = UIColor(SolennixColors.primaryLight)

            for match in matches {
                let range = match.range
                attributedString.addAttributes([
                    .foregroundColor: primaryColor,
                    .backgroundColor: primaryLightColor,
                    .font: UIFont.preferredFont(forTextStyle: .body).withTraits(.traitBold) ?? UIFont.boldSystemFont(ofSize: UIFont.preferredFont(forTextStyle: .body).pointSize),
                ], range: range)
            }

            // Disable scrolling to prevent UITextView from auto-scrolling
            // when attributedText is set (it triggers async scroll-to-visible)
            let savedOffset = textView.contentOffset
            textView.isScrollEnabled = false
            textView.attributedText = attributedString
            textView.isScrollEnabled = true
            textView.contentOffset = savedOffset
        }
    }
}

// MARK: - UIFont Extension

private extension UIFont {
    func withTraits(_ traits: UIFontDescriptor.SymbolicTraits) -> UIFont? {
        guard let descriptor = fontDescriptor.withSymbolicTraits(traits) else { return nil }
        return UIFont(descriptor: descriptor, size: 0)
    }
}
