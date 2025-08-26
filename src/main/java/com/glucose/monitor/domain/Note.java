package com.glucose.monitor.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Entity
@Table(name = "notes")
public class Note {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Column(name = "meal", nullable = false, length = 100)
    private String meal;
    
    @Column(name = "carbs")
    private Double carbs;
    
    @Column(name = "insulin")
    private Double insulin;
    
    @Column(name = "comment", length = 500)
    private String comment;
    
    @NotNull
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
    
    @Column(name = "meal_type", length = 50)
    private String mealType;
    
    @Column(name = "glucose_value")
    private Double glucoseValue;
    
    // Constructors
    public Note() {}
    
    public Note(String meal, LocalDateTime timestamp) {
        this.meal = meal;
        this.timestamp = timestamp;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getMeal() {
        return meal;
    }
    
    public void setMeal(String meal) {
        this.meal = meal;
    }
    
    public Double getCarbs() {
        return carbs;
    }
    
    public void setCarbs(Double carbs) {
        this.carbs = carbs;
    }
    
    public Double getInsulin() {
        return insulin;
    }
    
    public void setInsulin(Double insulin) {
        this.insulin = insulin;
    }
    
    public String getComment() {
        return comment;
    }
    
    public void setComment(String comment) {
        this.comment = comment;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public String getMealType() {
        return mealType;
    }
    
    public void setMealType(String mealType) {
        this.mealType = mealType;
    }
    
    public Double getGlucoseValue() {
        return glucoseValue;
    }
    
    public void setGlucoseValue(Double glucoseValue) {
        this.glucoseValue = glucoseValue;
    }
    
    @Override
    public String toString() {
        return "Note{" +
                "id=" + id +
                ", meal='" + meal + '\'' +
                ", carbs=" + carbs +
                ", insulin=" + insulin +
                ", timestamp=" + timestamp +
                '}';
    }
}

