package com.glucose.monitor.domain;

public enum GlucoseStatus {
    LOW("low"),
    NORMAL("normal"),
    HIGH("high"),
    CRITICAL("critical");
    
    private final String value;
    
    GlucoseStatus(String value) {
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
    
    @Override
    public String toString() {
        return value;
    }
}

