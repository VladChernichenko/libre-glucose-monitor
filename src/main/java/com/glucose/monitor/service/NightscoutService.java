package com.glucose.monitor.service;

import com.glucose.monitor.domain.GlucoseReading;
import com.glucose.monitor.domain.GlucoseStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class NightscoutService {
    
    private static final Logger logger = LoggerFactory.getLogger(NightscoutService.class);
    
    @Value("${nightscout.url}")
    private String nightscoutUrl;
    
    @Value("${nightscout.secret}")
    private String nightscoutSecret;
    
    @Value("${nightscout.api.entries}")
    private String entriesEndpoint;
    
    private final WebClient webClient;
    
    public NightscoutService() {
        this.webClient = WebClient.builder()
                .defaultHeader("User-Agent", "libre-glucose-monitor-backend/1.0")
                .build();
    }
    
    /**
     * Fetch current glucose reading from Nightscout
     */
    public Mono<GlucoseReading> fetchCurrentGlucose() {
        String url = nightscoutUrl + entriesEndpoint + "?count=1";
        logger.info("Fetching current glucose from: {}", url);
        
        return webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(List.class)
                .map(this::processCurrentGlucoseResponse)
                .doOnSuccess(reading -> logger.info("Successfully fetched current glucose: {}", reading))
                .doOnError(error -> logger.error("Failed to fetch current glucose: {}", error.getMessage()));
    }
    
    /**
     * Fetch historical glucose data from Nightscout
     */
    public Mono<List<GlucoseReading>> fetchHistoricalData(int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);
        
        String url = nightscoutUrl + entriesEndpoint + "?count=500";
        logger.info("Fetching historical data for {} hours from: {}", hours, url);
        
        return webClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(List.class)
                .map(data -> processHistoricalGlucoseResponse(data, startTime, endTime))
                .doOnSuccess(readings -> logger.info("Successfully fetched {} historical readings", readings.size()))
                .doOnError(error -> logger.error("Failed to fetch historical data: {}", error.getMessage()));
    }
    
    /**
     * Process current glucose response from Nightscout
     */
    private GlucoseReading processCurrentGlucoseResponse(List<Map<String, Object>> data) {
        if (data == null || data.isEmpty()) {
            throw new RuntimeException("No glucose data available from Nightscout");
        }
        
        Map<String, Object> entry = data.get(0);
        return createGlucoseReadingFromEntry(entry);
    }
    
    /**
     * Process historical glucose response from Nightscout
     */
    private List<GlucoseReading> processHistoricalGlucoseResponse(List<Map<String, Object>> data, 
                                                                LocalDateTime startTime, 
                                                                LocalDateTime endTime) {
        if (data == null || data.isEmpty()) {
            throw new RuntimeException("No historical data available from Nightscout");
        }
        
        return data.stream()
                .filter(entry -> isGlucoseEntry(entry))
                .filter(entry -> isInTimeRange(entry, startTime, endTime))
                .map(this::createGlucoseReadingFromEntry)
                .sorted((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()))
                .toList();
    }
    
    /**
     * Check if entry is a glucose reading
     */
    private boolean isGlucoseEntry(Map<String, Object> entry) {
        return entry.containsKey("sgv") && entry.get("sgv") != null;
    }
    
    /**
     * Check if entry is within the specified time range
     */
    private boolean isInTimeRange(Map<String, Object> entry, LocalDateTime startTime, LocalDateTime endTime) {
        try {
            String dateStr = (String) entry.get("dateString");
            if (dateStr == null) return false;
            
            LocalDateTime entryTime = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME);
            return !entryTime.isBefore(startTime) && !entryTime.isAfter(endTime);
        } catch (Exception e) {
            logger.warn("Could not parse date for entry: {}", entry);
            return false;
        }
    }
    
    /**
     * Create GlucoseReading from Nightscout entry
     */
    private GlucoseReading createGlucoseReadingFromEntry(Map<String, Object> entry) {
        try {
            // Parse timestamp
            String dateStr = (String) entry.get("dateString");
            LocalDateTime timestamp = LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_DATE_TIME);
            
            // Parse glucose value and convert to mmol/L
            Number sgv = (Number) entry.get("sgv");
            double valueMgdL = sgv.doubleValue();
            double valueMmolL = Math.round((valueMgdL / 18.0) * 10.0) / 10.0;
            
            // Create reading
            GlucoseReading reading = new GlucoseReading();
            reading.setTimestamp(timestamp);
            reading.setValue(valueMmolL);
            reading.setUnit("mmol/L");
            reading.setOriginalTimestamp(timestamp);
            reading.setSource("nightscout");
            
            // Set trend and arrow
            if (entry.containsKey("trend")) {
                Number trend = (Number) entry.get("trend");
                reading.setTrend(trend.intValue());
            }
            
            if (entry.containsKey("direction")) {
                String direction = (String) entry.get("direction");
                reading.setTrendArrow(convertTrendToArrow(direction));
            }
            
            // Calculate status
            reading.setStatus(calculateGlucoseStatus(valueMmolL));
            
            return reading;
            
        } catch (Exception e) {
            logger.error("Error processing Nightscout entry: {}", entry, e);
            throw new RuntimeException("Failed to process Nightscout entry", e);
        }
    }
    
    /**
     * Convert Nightscout trend direction to arrow
     */
    private String convertTrendToArrow(String direction) {
        if (direction == null) return "→";
        
        return switch (direction) {
            case "DoubleUp" -> "↗↗";
            case "SingleUp" -> "↗";
            case "FortyFiveUp" -> "↗";
            case "Flat" -> "→";
            case "FortyFiveDown" -> "↘";
            case "SingleDown" -> "↘";
            case "DoubleDown" -> "↘↘";
            case "NOT COMPUTABLE", "RATE OUT OF RANGE" -> "→";
            default -> "→";
        };
    }
    
    /**
     * Calculate glucose status based on value
     */
    private GlucoseStatus calculateGlucoseStatus(double valueMmolL) {
        if (valueMmolL < 3.9) return GlucoseStatus.LOW;
        if (valueMmolL < 10.0) return GlucoseStatus.NORMAL;
        if (valueMmolL < 13.9) return GlucoseStatus.HIGH;
        return GlucoseStatus.CRITICAL;
    }
    
    /**
     * Get Nightscout URL for debugging
     */
    public String getNightscoutUrl() {
        return nightscoutUrl;
    }
    
    /**
     * Check if Nightscout is configured
     */
    public boolean isConfigured() {
        return nightscoutUrl != null && !nightscoutUrl.trim().isEmpty();
    }
}

