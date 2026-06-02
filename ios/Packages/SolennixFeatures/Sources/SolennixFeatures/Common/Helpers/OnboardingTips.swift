import Foundation
import TipKit

// MARK: - Tips

public struct NewEventTip: Tip {
    public var title: Text {
        Text(CommonStrings.newEventTipTitle)
    }
    
    public var message: Text? {
        Text(CommonStrings.newEventTipMessage)
    }
    
    public var image: Image? {
        Image(systemName: "calendar.badge.plus")
    }
    
    public init() {}
}

public struct QuickQuoteTip: Tip {
    public var title: Text {
        Text(QuickQuoteStrings.title)
    }
    
    public var message: Text? {
        Text(CommonStrings.quickQuoteTipMessage)
    }
    
    public var image: Image? {
        Image(systemName: "doc.text.magnifyingglass")
    }
    
    public init() {}
}

public struct SwipeActionTip: Tip {
    public var title: Text {
        Text(CommonStrings.swipeActionTipTitle)
    }
    
    public var message: Text? {
        Text(CommonStrings.swipeActionTipMessage)
    }
    
    public var image: Image? {
        Image(systemName: "hand.draw")
    }
    
    public init() {}
}

// MARK: - Configuration

public struct TipsHelper {
    public static func configure() {
        // Run this in AppDelegate or App init
        try? Tips.configure([
            .displayFrequency(.immediate),
            .datastoreLocation(.applicationDefault)
        ])
    }
}
