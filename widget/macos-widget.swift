// Simple macOS Glucose Widget using SwiftUI
// To build: swift build or use Xcode

import SwiftUI
import Foundation

// MARK: - Data Models
struct GlucoseReading {
    let value: Double
    let trend: String
    let status: GlucoseStatus
    let timestamp: Date
}

enum GlucoseStatus {
    case low, normal, high, critical
    
    var color: Color {
        switch self {
        case .low: return .red
        case .normal: return .green
        case .high: return .yellow
        case .critical: return .red
        }
    }
    
    var backgroundColor: Color {
        switch self {
        case .low: return Color.red.opacity(0.8)
        case .normal: return Color.green.opacity(0.8)
        case .high: return Color.yellow.opacity(0.8)
        case .critical: return Color.red.opacity(0.9)
        }
    }
}

// MARK: - API Service
class GlucoseService: ObservableObject {
    @Published var currentReading: GlucoseReading?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let nightscoutURL = ""
    private var timer: Timer?
    
    init() {
        startPeriodicUpdates()
        fetchGlucoseData()
    }
    
    deinit {
        timer?.invalidate()
    }
    
    func startPeriodicUpdates() {
        timer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { _ in
            self.fetchGlucoseData()
        }
    }
    
    func fetchGlucoseData() {
        guard let url = URL(string: "\(nightscoutURL)/api/v2/entries.json?count=1") else {
            errorMessage = "Invalid URL"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                self.isLoading = false
                
                if let error = error {
                    self.errorMessage = "Connection failed: \(error.localizedDescription)"
                    return
                }
                
                guard let data = data else {
                    self.errorMessage = "No data received"
                    return
                }
                
                do {
                    let entries = try JSONDecoder().decode([NightscoutEntry].self, from: data)
                    if let entry = entries.first {
                        let mmolL = Double(entry.sgv) / 18.0
                        let roundedValue = round(mmolL * 10) / 10
                        
                        self.currentReading = GlucoseReading(
                            value: roundedValue,
                            trend: self.getTrendArrow(from: entry.direction),
                            status: self.getGlucoseStatus(mmolL: roundedValue),
                            timestamp: Date(timeIntervalSince1970: TimeInterval(entry.date) / 1000)
                        )
                    } else {
                        self.errorMessage = "No glucose data available"
                    }
                } catch {
                    self.errorMessage = "Failed to parse data: \(error.localizedDescription)"
                }
            }
        }.resume()
    }
    
    private func getTrendArrow(from direction: String) -> String {
        switch direction {
        case "DoubleUp": return "↗↗"
        case "SingleUp": return "↗"
        case "FortyFiveUp": return "↗"
        case "Flat": return "→"
        case "FortyFiveDown": return "↘"
        case "SingleDown": return "↘"
        case "DoubleDown": return "↘↘"
        default: return "→"
        }
    }
    
    private func getGlucoseStatus(mmolL: Double) -> GlucoseStatus {
        if mmolL < 3.9 { return .low }
        if mmolL < 10.0 { return .normal }
        if mmolL < 13.9 { return .high }
        return .critical
    }
}

// MARK: - Nightscout Entry Model
struct NightscoutEntry: Codable {
    let sgv: Int
    let direction: String
    let date: Int64
}

// MARK: - Widget View
struct GlucoseWidgetView: View {
    @StateObject private var glucoseService = GlucoseService()
    
    var body: some View {
        ZStack {
            // Background
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [
                            glucoseService.currentReading?.status.backgroundColor ?? Color.blue.opacity(0.8),
                            glucoseService.currentReading?.status.backgroundColor.opacity(0.6) ?? Color.purple.opacity(0.6)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 4)
            
            // Content
            VStack(spacing: 2) {
                if glucoseService.isLoading {
                    Text("Loading...")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                } else if let errorMessage = glucoseService.errorMessage {
                    VStack(spacing: 1) {
                        Text("Error")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                        Text(errorMessage)
                            .font(.system(size: 10))
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }
                } else if let reading = glucoseService.currentReading {
                    VStack(spacing: 2) {
                        // Glucose value
                        Text("\(reading.value, specifier: "%.1f") mmol/L")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        
                        // Trend
                        HStack(spacing: 4) {
                            Text(reading.trend)
                                .font(.system(size: 16))
                            Text("Glucose")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.white.opacity(0.9))
                        
                        // Timestamp
                        Text(reading.timestamp.formatted(date: .omitted, time: .shortened))
                            .font(.system(size: 8))
                            .foregroundColor(.white.opacity(0.7))
                    }
                } else {
                    Text("No Data")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                }
            }
        }
        .frame(width: 180, height: 70)
        .onTapGesture {
            glucoseService.fetchGlucoseData()
        }
    }
}

// MARK: - Main App
@main
struct GlucoseWidgetApp: App {
    var body: some Scene {
        WindowGroup {
            GlucoseWidgetView()
                .frame(width: 180, height: 70)
                .background(Color.clear)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentSize)
    }
}

// MARK: - For Widget Extension (iOS/macOS Widgets)
struct GlucoseWidget: Widget {
    let kind: String = "GlucoseWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GlucoseProvider()) { entry in
            GlucoseWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Glucose Monitor")
        .description("Shows current glucose level and trend")
        .supportedFamilies([.systemSmall])
    }
}

struct GlucoseProvider: TimelineProvider {
    func placeholder(in context: Context) -> GlucoseEntry {
        GlucoseEntry(date: Date(), reading: GlucoseReading(value: 5.8, trend: "→", status: .normal, timestamp: Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (GlucoseEntry) -> ()) {
        let entry = GlucoseEntry(date: Date(), reading: GlucoseReading(value: 5.8, trend: "→", status: .normal, timestamp: Date()))
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Fetch real data here
        let entry = GlucoseEntry(date: Date(), reading: GlucoseReading(value: 5.8, trend: "→", status: .normal, timestamp: Date()))
        let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
        completion(timeline)
    }
}

struct GlucoseEntry: TimelineEntry {
    let date: Date
    let reading: GlucoseReading
}

struct GlucoseWidgetEntryView: View {
    var entry: GlucoseProvider.Entry

    var body: some View {
        GlucoseWidgetView()
    }
}
