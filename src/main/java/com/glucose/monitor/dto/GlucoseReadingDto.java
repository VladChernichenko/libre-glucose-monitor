package com.glucose.monitor.dto;

import com.glucose.monitor.domain.GlucoseStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class GlucoseReadingDto {
    
    private Long id;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime timestamp;
    
    private Double value;
    
    private Integer trend;
    
    private String trendArrow;
    
    private GlucoseStatus status;
    
    private String unit;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime originalTimestamp;
    
    private String source;
    
    // Constructors
    public GlucoseReadingDto() {}
    
    public GlucoseReadingDto(Long id, LocalDateTime timestamp, Double value, String unit) {
        this.id = id;
        this.timestamp = timestamp;
        this.value = value;
        this.unit = unit;
        this.originalTimestamp = timestamp;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public Double getValue() {
        return value;
    }
    
    public void setValue(Double value) {
        this.value = value;
    }
    
    public Integer getTrend() {
        return trend;
    }
    
    public void setTrend(Integer trend) {
        this.trend = trend;
    }
    
    public String getTrendArrow() {
        return trendArrow;
    }
    
    public void setTrendArrow(String trendArrow) {
        this.trendArrow = trendArrow;
    }
    
    public GlucoseStatus getStatus() {
        return status;
    }
    
    public void setStatus(GlucoseStatus status) {
        this.status = status;
    }
    
    public String getUnit() {
        return unit;
    }
    
    public void setUnit(String unit) {
        this.unit = unit;
    }
    
    public LocalDateTime getOriginalTimestamp() {
        return originalTimestamp;
    }
    
    public void setOriginalTimestamp(LocalDateTime originalTimestamp) {
        this.originalTimestamp = originalTimestamp;
    }
    
    public String getSource() {
        return source;
    }
    
    public void setSource(String source) {
        this.source = source;
    }
}

