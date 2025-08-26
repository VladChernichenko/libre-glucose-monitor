package com.glucose.monitor.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;

@Entity
@Table(name = "glucose_readings")
public class GlucoseReading {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
    
    @NotNull
    @Positive
    @Column(name = "value", nullable = false)
    private Double value;
    
    @Column(name = "trend")
    private Integer trend;
    
    @Column(name = "trend_arrow", length = 20)
    private String trendArrow;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private GlucoseStatus status;
    
    @Column(name = "unit", length = 10)
    private String unit = "mmol/L";
    
    @Column(name = "original_timestamp")
    private LocalDateTime originalTimestamp;
    
    @Column(name = "source", length = 50)
    private String source = "nightscout";
    
    // Constructors
    public GlucoseReading() {}
    
    public GlucoseReading(LocalDateTime timestamp, Double value, String unit) {
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
    
    @Override
    public String toString() {
        return "GlucoseReading{" +
                "id=" + id +
                ", timestamp=" + timestamp +
                ", value=" + value +
                ", unit='" + unit + '\'' +
                ", status=" + status +
                '}';
    }
}

