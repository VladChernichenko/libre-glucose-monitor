package com.glucose.monitor.controller;

import com.glucose.monitor.domain.GlucoseReading;
import com.glucose.monitor.dto.GlucoseReadingDto;
import com.glucose.monitor.service.GlucoseService;
import com.glucose.monitor.service.NightscoutService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/glucose")
@CrossOrigin(origins = "*")
public class GlucoseController {
    
    private static final Logger logger = LoggerFactory.getLogger(GlucoseController.class);
    
    private final GlucoseService glucoseService;
    private final NightscoutService nightscoutService;
    
    @Autowired
    public GlucoseController(GlucoseService glucoseService, NightscoutService nightscoutService) {
        this.glucoseService = glucoseService;
        this.nightscoutService = nightscoutService;
    }
    
    /**
     * Get current glucose reading
     */
    @GetMapping("/current")
    public ResponseEntity<GlucoseReadingDto> getCurrentGlucose() {
        logger.info("GET /glucose/current - Fetching current glucose");
        
        try {
            GlucoseReading current = glucoseService.getCurrentGlucose();
            if (current != null) {
                return ResponseEntity.ok(convertToDto(current));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error fetching current glucose: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get glucose history for a specific time range
     */
    @GetMapping("/history")
    public ResponseEntity<List<GlucoseReadingDto>> getGlucoseHistory(
            @RequestParam(defaultValue = "6") int hours,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        
        logger.info("GET /glucose/history - hours: {}, start: {}, end: {}", hours, start, end);
        
        try {
            List<GlucoseReading> history;
            if (start != null && end != null) {
                history = glucoseService.getGlucoseHistory(start, end);
            } else {
                history = glucoseService.getGlucoseHistory(hours);
            }
            
            List<GlucoseReadingDto> dtos = history.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error fetching glucose history: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Refresh glucose data from Nightscout
     */
    @PostMapping("/refresh")
    public ResponseEntity<String> refreshGlucoseData() {
        logger.info("POST /glucose/refresh - Refreshing glucose data from Nightscout");
        
        try {
            glucoseService.refreshFromNightscout();
            return ResponseEntity.ok("Glucose data refreshed successfully");
        } catch (Exception e) {
            logger.error("Error refreshing glucose data: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body("Failed to refresh glucose data: " + e.getMessage());
        }
    }
    
    /**
     * Get glucose statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getGlucoseStats(
            @RequestParam(defaultValue = "24") int hours) {
        
        logger.info("GET /glucose/stats - hours: {}", hours);
        
        try {
            Map<String, Object> stats = glucoseService.getGlucoseStats(hours);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching glucose stats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Convert domain entity to DTO
     */
    private GlucoseReadingDto convertToDto(GlucoseReading reading) {
        GlucoseReadingDto dto = new GlucoseReadingDto();
        dto.setId(reading.getId());
        dto.setTimestamp(reading.getTimestamp());
        dto.setValue(reading.getValue());
        dto.setTrend(reading.getTrend());
        dto.setTrendArrow(reading.getTrendArrow());
        dto.setStatus(reading.getStatus());
        dto.setUnit(reading.getUnit());
        dto.setOriginalTimestamp(reading.getOriginalTimestamp());
        dto.setSource(reading.getSource());
        return dto;
    }
}

