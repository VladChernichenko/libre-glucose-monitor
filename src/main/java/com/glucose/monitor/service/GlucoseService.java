package com.glucose.monitor.service;

import com.glucose.monitor.domain.GlucoseReading;
import com.glucose.monitor.repository.GlucoseReadingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class GlucoseService {
    
    private static final Logger logger = LoggerFactory.getLogger(GlucoseService.class);
    
    private final GlucoseReadingRepository glucoseReadingRepository;
    private final NightscoutService nightscoutService;
    
    @Autowired
    public GlucoseService(GlucoseReadingRepository glucoseReadingRepository, 
                         NightscoutService nightscoutService) {
        this.glucoseReadingRepository = glucoseReadingRepository;
        this.nightscoutService = nightscoutService;
    }
    
    /**
     * Get current glucose reading
     */
    public GlucoseReading getCurrentGlucose() {
        Optional<GlucoseReading> current = glucoseReadingRepository.findFirstByOrderByTimestampDesc();
        return current.orElse(null);
    }
    
    /**
     * Get glucose history for a specific number of hours
     */
    public List<GlucoseReading> getGlucoseHistory(int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);
        return glucoseReadingRepository.findByTimestampBetweenOrderByTimestampAsc(startTime, endTime);
    }
    
    /**
     * Get glucose history for a specific time range
     */
    public List<GlucoseReading> getGlucoseHistory(LocalDateTime start, LocalDateTime end) {
        return glucoseReadingRepository.findByTimestampBetweenOrderByTimestampAsc(start, end);
    }
    
    /**
     * Save a glucose reading
     */
    public GlucoseReading saveGlucoseReading(GlucoseReading reading) {
        logger.info("Saving glucose reading: {}", reading);
        return glucoseReadingRepository.save(reading);
    }
    
    /**
     * Save multiple glucose readings
     */
    public List<GlucoseReading> saveGlucoseReadings(List<GlucoseReading> readings) {
        logger.info("Saving {} glucose readings", readings.size());
        return glucoseReadingRepository.saveAll(readings);
    }
    
    /**
     * Refresh glucose data from Nightscout
     */
    public void refreshFromNightscout() {
        if (!nightscoutService.isConfigured()) {
            logger.warn("Nightscout not configured, skipping refresh");
            return;
        }
        
        logger.info("Refreshing glucose data from Nightscout");
        
        try {
            // Fetch current glucose
            nightscoutService.fetchCurrentGlucose()
                    .subscribe(this::saveGlucoseReading);
            
            // Fetch historical data for the last 24 hours
            nightscoutService.fetchHistoricalData(24)
                    .subscribe(this::saveGlucoseReadings);
                    
        } catch (Exception e) {
            logger.error("Error refreshing from Nightscout: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to refresh from Nightscout", e);
        }
    }
    
    /**
     * Get glucose statistics for a time period
     */
    public Map<String, Object> getGlucoseStats(int hours) {
        LocalDateTime endTime = LocalDateTime.now();
        LocalDateTime startTime = endTime.minusHours(hours);
        
        List<GlucoseReading> readings = getGlucoseHistory(startTime, endTime);
        
        if (readings.isEmpty()) {
            return Map.of(
                "count", 0,
                "message", "No data available for the specified time period"
            );
        }
        
        double minValue = readings.stream()
                .mapToDouble(GlucoseReading::getValue)
                .min()
                .orElse(0.0);
                
        double maxValue = readings.stream()
                .mapToDouble(GlucoseReading::getValue)
                .max()
                .orElse(0.0);
                
        double avgValue = readings.stream()
                .mapToDouble(GlucoseReading::getValue)
                .average()
                .orElse(0.0);
        
        return Map.of(
            "count", readings.size(),
            "minValue", Math.round(minValue * 10.0) / 10.0,
            "maxValue", Math.round(maxValue * 10.0) / 10.0,
            "avgValue", Math.round(avgValue * 10.0) / 10.0,
            "timeRange", hours + " hours",
            "startTime", startTime,
            "endTime", endTime
        );
    }
    
    /**
     * Clean up old glucose readings
     */
    @Scheduled(cron = "0 0 2 * * ?") // Run at 2 AM daily
    public void cleanupOldReadings() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7); // Keep 7 days
        long deletedCount = glucoseReadingRepository.countByTimestampBetween(
            LocalDateTime.MIN, cutoff);
        
        if (deletedCount > 0) {
            glucoseReadingRepository.deleteByTimestampBefore(cutoff);
            logger.info("Cleaned up {} old glucose readings", deletedCount);
        }
    }
    
    /**
     * Get readings by source
     */
    public List<GlucoseReading> getReadingsBySource(String source) {
        return glucoseReadingRepository.findBySourceOrderByTimestampDesc(source);
    }
    
    /**
     * Get readings by status
     */
    public List<GlucoseReading> getReadingsByStatus(com.glucose.monitor.domain.GlucoseStatus status) {
        return glucoseReadingRepository.findByStatusOrderByTimestampDesc(status);
    }
}

