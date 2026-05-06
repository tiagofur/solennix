import UIKit
import SolennixCore

// MARK: - PDF Constants

enum PDFConstants {

    // MARK: Page Layout

    static let pageWidth: CGFloat = 612
    static let pageHeight: CGFloat = 792
    static let pageSize = CGSize(width: pageWidth, height: pageHeight)
    static let pageRect = CGRect(origin: .zero, size: pageSize)

    static let marginTop: CGFloat = 40
    static let marginBottom: CGFloat = 40
    static let marginLeft: CGFloat = 40
    static let marginRight: CGFloat = 40
    static let contentWidth: CGFloat = pageWidth - marginLeft - marginRight // 532

    // MARK: Colors

    static let brandColor = UIColor(red: 196/255, green: 162/255, blue: 101/255, alpha: 1) // #C4A265
    static let textColor = UIColor(red: 51/255, green: 51/255, blue: 51/255, alpha: 1)     // #333333
    static let grayColor = UIColor(red: 102/255, green: 102/255, blue: 102/255, alpha: 1)  // #666666
    static let headerBgColor = UIColor(red: 245/255, green: 245/255, blue: 245/255, alpha: 1) // #F5F5F5

    // MARK: Font Sizes

    static let titleFontSize: CGFloat = 22
    static let businessNameFontSize: CGFloat = 18
    static let sectionHeaderFontSize: CGFloat = 13
    static let bodyFontSize: CGFloat = 11
    static let tableHeaderFontSize: CGFloat = 10
    static let tableCellFontSize: CGFloat = 10
    static let footerFontSize: CGFloat = 9

    // MARK: Table

    static let tableRowHeight: CGFloat = 24
    static let cellPadding: CGFloat = 6

    // MARK: Fonts

    static let titleFont = UIFont.boldSystemFont(ofSize: titleFontSize)
    static let businessNameFont = UIFont.boldSystemFont(ofSize: businessNameFontSize)
    static let sectionHeaderFont = UIFont.boldSystemFont(ofSize: sectionHeaderFontSize)
    static let bodyFont = UIFont.systemFont(ofSize: bodyFontSize)
    static let bodyBoldFont = UIFont.boldSystemFont(ofSize: bodyFontSize)
    static let tableHeaderFont = UIFont.boldSystemFont(ofSize: tableHeaderFontSize)
    static let tableCellFont = UIFont.systemFont(ofSize: tableCellFontSize)
    static let tableCellBoldFont = UIFont.boldSystemFont(ofSize: tableCellFontSize)
    static let footerFont = UIFont.systemFont(ofSize: footerFontSize)

    // MARK: Formatters

    static let currencyFormatter: NumberFormatter = {
        let fmt = NumberFormatter()
        fmt.numberStyle = .currency
        fmt.locale = Locale(identifier: "es_MX")
        fmt.currencyCode = "MXN"
        fmt.currencySymbol = "$"
        fmt.maximumFractionDigits = 2
        fmt.minimumFractionDigits = 2
        return fmt
    }()

    static let dateFormatter: DateFormatter = {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "es_MX")
        fmt.dateFormat = "d 'de' MMMM, yyyy"
        fmt.timeZone = Date.mexicanTimeZone
        return fmt
    }()

    static let isoDateFormatter: DateFormatter = {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        fmt.locale = Locale(identifier: "en_US_POSIX")
        return fmt
    }()

    nonisolated(unsafe) static let isoDateTimeFormatter: ISO8601DateFormatter = {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fmt
    }()

    // MARK: - Helper Functions

    static func formatCurrency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "$0.00"
    }

    static func formatDate(_ isoString: String) -> String {
        if let date = Date.fromServerDay(isoString) {
            return dateFormatter.string(from: date)
        }
        return isoString
    }

    // MARK: - Drawing Helpers

    /// Checks if we need a new page, and if so begins one. Returns the new Y position.
    static func ensureSpace(context: UIGraphicsPDFRendererContext, currentY: CGFloat, needed: CGFloat) -> CGFloat {
        if currentY + needed > pageHeight - marginBottom {
            context.beginPage()
            return marginTop
        }
        return currentY
    }

    /// Draws the PDF header with optional business name and title, returns the Y position after the header.
    @discardableResult
    static func drawHeader(context: UIGraphicsPDFRendererContext, title: String, profile: User?) -> CGFloat {
        var y = marginTop

        // Business name
        let businessName = profile?.businessName ?? profile?.name ?? ""
        if !businessName.isEmpty {
            let attrs: [NSAttributedString.Key: Any] = [
                .font: businessNameFont,
                .foregroundColor: brandColor
            ]
            let nameStr = businessName as NSString
            let nameSize = nameStr.boundingRect(
                with: CGSize(width: contentWidth, height: .greatestFiniteMagnitude),
                options: .usesLineFragmentOrigin,
                attributes: attrs,
                context: nil
            )
            nameStr.draw(
                in: CGRect(x: marginLeft, y: y, width: contentWidth, height: nameSize.height),
                withAttributes: attrs
            )
            y += nameSize.height + 4
        }

        // Title
        let titleAttrs: [NSAttributedString.Key: Any] = [
            .font: titleFont,
            .foregroundColor: textColor
        ]
        let titleStr = title as NSString
        let titleSize = titleStr.boundingRect(
            with: CGSize(width: contentWidth, height: .greatestFiniteMagnitude),
            options: .usesLineFragmentOrigin,
            attributes: titleAttrs,
            context: nil
        )
        titleStr.draw(
            in: CGRect(x: marginLeft, y: y, width: contentWidth, height: titleSize.height),
            withAttributes: titleAttrs
        )
        y += titleSize.height + 8

        // Separator line
        drawSeparator(context: context, y: y, color: brandColor, thickness: 2)
        y += 12

        return y
    }

    /// Draws a two-column info grid. Each item is (label, value). Returns the Y after the grid.
    @discardableResult
    static func drawInfoGrid(
        context: UIGraphicsPDFRendererContext,
        y startY: CGFloat,
        leftItems: [(String, String)],
        rightItems: [(String, String)]
    ) -> CGFloat {
        var y = startY
        let colWidth = contentWidth / 2
        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: bodyBoldFont,
            .foregroundColor: grayColor
        ]
        let valueAttrs: [NSAttributedString.Key: Any] = [
            .font: bodyFont,
            .foregroundColor: textColor
        ]
        let lineHeight: CGFloat = 16

        let maxRows = max(leftItems.count, rightItems.count)
        for i in 0..<maxRows {
            y = ensureSpace(context: context, currentY: y, needed: lineHeight)

            if i < leftItems.count {
                let (label, value) = leftItems[i]
                (label as NSString).draw(
                    in: CGRect(x: marginLeft, y: y, width: colWidth * 0.45, height: lineHeight),
                    withAttributes: labelAttrs
                )
                (value as NSString).draw(
                    in: CGRect(x: marginLeft + colWidth * 0.45, y: y, width: colWidth * 0.55, height: lineHeight),
                    withAttributes: valueAttrs
                )
            }
            if i < rightItems.count {
                let (label, value) = rightItems[i]
                let rightX = marginLeft + colWidth
                (label as NSString).draw(
                    in: CGRect(x: rightX, y: y, width: colWidth * 0.45, height: lineHeight),
                    withAttributes: labelAttrs
                )
                (value as NSString).draw(
                    in: CGRect(x: rightX + colWidth * 0.45, y: y, width: colWidth * 0.55, height: lineHeight),
                    withAttributes: valueAttrs
                )
            }
            y += lineHeight
        }

        return y + 8
    }

    /// Draws a table with headers and rows. columnWidths are fractions of contentWidth. Returns Y after the table.
    @discardableResult
    static func drawTable(
        context: UIGraphicsPDFRendererContext,
        y startY: CGFloat,
        headers: [String],
        rows: [[String]],
        columnWidths: [CGFloat],
        rightAlignedColumns: Set<Int> = []
    ) -> CGFloat {
        var y = startY

        // Header row background
        y = ensureSpace(context: context, currentY: y, needed: tableRowHeight)
        let headerRect = CGRect(x: marginLeft, y: y, width: contentWidth, height: tableRowHeight)
        headerBgColor.setFill()
        UIRectFill(headerRect)

        let headerAttrs: [NSAttributedString.Key: Any] = [
            .font: tableHeaderFont,
            .foregroundColor: textColor
        ]

        var x = marginLeft
        for (col, header) in headers.enumerated() {
            let colW = contentWidth * columnWidths[col]
            let textRect = CGRect(x: x + cellPadding, y: y + cellPadding, width: colW - cellPadding * 2, height: tableRowHeight - cellPadding * 2)
            if rightAlignedColumns.contains(col) {
                let paragraphStyle = NSMutableParagraphStyle()
                paragraphStyle.alignment = .right
                var attrs = headerAttrs
                attrs[.paragraphStyle] = paragraphStyle
                (header as NSString).draw(in: textRect, withAttributes: attrs)
            } else {
                (header as NSString).draw(in: textRect, withAttributes: headerAttrs)
            }
            x += colW
        }
        y += tableRowHeight

        // Draw separator under header
        drawSeparator(context: context, y: y, color: brandColor, thickness: 1)
        y += 1

        // Data rows
        let cellAttrs: [NSAttributedString.Key: Any] = [
            .font: tableCellFont,
            .foregroundColor: textColor
        ]

        for (rowIndex, row) in rows.enumerated() {
            y = ensureSpace(context: context, currentY: y, needed: tableRowHeight)

            // Alternating row background
            if rowIndex % 2 == 1 {
                let rowRect = CGRect(x: marginLeft, y: y, width: contentWidth, height: tableRowHeight)
                UIColor(white: 0.97, alpha: 1).setFill()
                UIRectFill(rowRect)
            }

            x = marginLeft
            for (col, cell) in row.enumerated() {
                let colW = contentWidth * columnWidths[col]
                let textRect = CGRect(x: x + cellPadding, y: y + cellPadding, width: colW - cellPadding * 2, height: tableRowHeight - cellPadding * 2)
                if rightAlignedColumns.contains(col) {
                    let paragraphStyle = NSMutableParagraphStyle()
                    paragraphStyle.alignment = .right
                    var attrs = cellAttrs
                    attrs[.paragraphStyle] = paragraphStyle
                    (cell as NSString).draw(in: textRect, withAttributes: attrs)
                } else {
                    (cell as NSString).draw(in: textRect, withAttributes: cellAttrs)
                }
                x += colW
            }
            y += tableRowHeight
        }

        // Bottom border
        drawSeparator(context: context, y: y, color: UIColor(white: 0.85, alpha: 1), thickness: 0.5)
        y += 8

        return y
    }

    /// Draws a horizontal separator line at the given Y.
    static func drawSeparator(context: UIGraphicsPDFRendererContext, y: CGFloat, color: UIColor = UIColor(white: 0.8, alpha: 1), thickness: CGFloat = 0.5) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: marginLeft, y: y))
        path.addLine(to: CGPoint(x: marginLeft + contentWidth, y: y))
        path.lineWidth = thickness
        color.setStroke()
        path.stroke()
    }

    /// Draws centered footer text at the bottom of the current page.
    static func drawFooterText(context: UIGraphicsPDFRendererContext, text: String) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: footerFont,
            .foregroundColor: grayColor
        ]
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.alignment = .center
        var centeredAttrs = attrs
        centeredAttrs[.paragraphStyle] = paragraphStyle

        let footerY = pageHeight - marginBottom + 10
        let footerRect = CGRect(x: marginLeft, y: footerY, width: contentWidth, height: 20)
        (text as NSString).draw(in: footerRect, withAttributes: centeredAttrs)
    }

    /// Draws a section header (bold, uppercase-ish label). Returns Y after it.
    @discardableResult
    static func drawSectionHeader(context: UIGraphicsPDFRendererContext, y: CGFloat, title: String) -> CGFloat {
        var currentY = ensureSpace(context: context, currentY: y, needed: 30)
        let attrs: [NSAttributedString.Key: Any] = [
            .font: sectionHeaderFont,
            .foregroundColor: brandColor
        ]
        let str = title as NSString
        let size = str.boundingRect(
            with: CGSize(width: contentWidth, height: .greatestFiniteMagnitude),
            options: .usesLineFragmentOrigin,
            attributes: attrs,
            context: nil
        )
        str.draw(
            in: CGRect(x: marginLeft, y: currentY, width: contentWidth, height: size.height),
            withAttributes: attrs
        )
        currentY += size.height + 4
        drawSeparator(context: context, y: currentY, color: brandColor, thickness: 1)
        currentY += 8
        return currentY
    }

    /// Draws a right-aligned summary row (label + value). Returns Y after.
    @discardableResult
    static func drawSummaryRow(
        context: UIGraphicsPDFRendererContext,
        y: CGFloat,
        label: String,
        value: String,
        valueColor: UIColor = textColor,
        bold: Bool = false
    ) -> CGFloat {
        let currentY = ensureSpace(context: context, currentY: y, needed: 20)
        let summaryX = marginLeft + contentWidth * 0.55
        let summaryWidth = contentWidth * 0.45

        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: bold ? bodyBoldFont : bodyFont,
            .foregroundColor: grayColor
        ]
        let valueAttrs: [NSAttributedString.Key: Any] = [
            .font: bold ? bodyBoldFont : bodyFont,
            .foregroundColor: valueColor
        ]
        let rightStyle = NSMutableParagraphStyle()
        rightStyle.alignment = .right
        var rightValueAttrs = valueAttrs
        rightValueAttrs[.paragraphStyle] = rightStyle

        (label as NSString).draw(
            in: CGRect(x: summaryX, y: currentY, width: summaryWidth * 0.55, height: 16),
            withAttributes: labelAttrs
        )
        (value as NSString).draw(
            in: CGRect(x: summaryX + summaryWidth * 0.55, y: currentY, width: summaryWidth * 0.45, height: 16),
            withAttributes: rightValueAttrs
        )
        return currentY + 18
    }

    /// Draws multiline body text, handling page breaks. Returns Y after.
    @discardableResult
    static func drawBodyText(context: UIGraphicsPDFRendererContext, y: CGFloat, text: String, width: CGFloat? = nil) -> CGFloat {
        let drawWidth = width ?? contentWidth
        let attrs: [NSAttributedString.Key: Any] = [
            .font: bodyFont,
            .foregroundColor: textColor
        ]

        let paragraphs = text.components(separatedBy: "\n")
        var currentY = y

        for paragraph in paragraphs {
            if paragraph.trimmingCharacters(in: .whitespaces).isEmpty {
                currentY += 8
                continue
            }
            let str = paragraph as NSString
            let size = str.boundingRect(
                with: CGSize(width: drawWidth, height: .greatestFiniteMagnitude),
                options: .usesLineFragmentOrigin,
                attributes: attrs,
                context: nil
            )
            currentY = ensureSpace(context: context, currentY: currentY, needed: size.height + 4)
            str.draw(
                in: CGRect(x: marginLeft, y: currentY, width: drawWidth, height: size.height + 2),
                withAttributes: attrs
            )
            currentY += size.height + 4
        }

        return currentY
    }
}
