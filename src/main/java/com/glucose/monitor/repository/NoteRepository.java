package com.glucose.monitor.repository;

import com.glucose.monitor.domain.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    
    /**
     * Find notes within a time range
     */
    List<Note> findByTimestampBetweenOrderByTimestampDesc(LocalDateTime start, LocalDateTime end);
    
    /**
     * Find notes by meal type
     */
    List<Note> findByMealTypeOrderByTimestampDesc(String mealType);
    
    /**
     * Find notes with insulin doses
     */
    List<Note> findByInsulinGreaterThanOrderByTimestampDesc(Double insulin);
    
    /**
     * Find notes with carb content
     */
    List<Note> findByCarbsGreaterThanOrderByTimestampDesc(Double carbs);
    
    /**
     * Find notes by meal name (partial match)
     */
    @Query("SELECT n FROM Note n WHERE LOWER(n.meal) LIKE LOWER(CONCAT('%', :meal, '%')) ORDER BY n.timestamp DESC")
    List<Note> findByMealContainingIgnoreCase(@Param("meal") String meal);
    
    /**
     * Get notes for a specific day
     */
    @Query("SELECT n FROM Note n WHERE DATE(n.timestamp) = DATE(:date) ORDER BY n.timestamp DESC")
    List<Note> findByDate(@Param("date") LocalDateTime date);
    
    /**
     * Get the most recent note
     */
    Optional<Note> findFirstByOrderByTimestampDesc();
    
    /**
     * Count notes in a time range
     */
    long countByTimestampBetween(LocalDateTime start, LocalDateTime end);
    
    /**
     * Delete old notes (cleanup)
     */
    void deleteByTimestampBefore(LocalDateTime cutoff);
    
    /**
     * Find all notes ordered by timestamp descending
     */
    List<Note> findAllByOrderByTimestampDesc();
}

