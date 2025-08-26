package com.glucose.monitor.repository;

import com.glucose.monitor.domain.GlucoseReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GlucoseReadingRepository extends JpaRepository<GlucoseReading, Long> {
    
    /**
     * Find the most recent glucose reading
     */
    Optional<GlucoseReading> findFirstByOrderByTimestampDesc();
    
    /**
     * Find glucose readings within a time range
     */
    List<GlucoseReading> findByTimestampBetweenOrderByTimestampAsc(LocalDateTime start, LocalDateTime end);
    
    /**
     * Find glucose readings from a specific source
     */
    List<GlucoseReading> findBySourceOrderByTimestampDesc(String source);
    
    /**
     * Find glucose readings with a specific status
     */
    List<GlucoseReading> findByStatusOrderByTimestampDesc(com.glucose.monitor.domain.GlucoseStatus status);
    
    /**
     * Custom query to get readings for a specific time range with limit
     */
    @Query("SELECT g FROM GlucoseReading g WHERE g.timestamp BETWEEN :start AND :end ORDER BY g.timestamp DESC")
    List<GlucoseReading> findReadingsInTimeRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
    
    /**
     * Get the latest reading before a specific timestamp
     */
    @Query("SELECT g FROM GlucoseReading g WHERE g.timestamp < :timestamp ORDER BY g.timestamp DESC")
    Optional<GlucoseReading> findLatestBefore(@Param("timestamp") LocalDateTime timestamp);
    
    /**
     * Get the earliest reading after a specific timestamp
     */
    @Query("SELECT g FROM GlucoseReading g WHERE g.timestamp > :timestamp ORDER BY g.timestamp ASC")
    Optional<GlucoseReading> findEarliestAfter(@Param("timestamp") LocalDateTime timestamp);
    
    /**
     * Count readings in a time range
     */
    long countByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    /**
     * Delete old readings (cleanup)
     */
    void deleteByTimestampBefore(LocalDateTime cutoff);
}

