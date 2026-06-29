package com.pmtool.repository;

import com.pmtool.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProjectIdOrderByCreatedAtDesc(Long projectId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query(
        "SELECT a FROM ActivityLog a WHERE a.project.id IN " +
        "(SELECT m.project.id FROM ProjectMember m WHERE m.user.id = :userId) " +
        "ORDER BY a.createdAt DESC"
    )
    List<ActivityLog> findRecentForUser(@org.springframework.data.repository.query.Param("userId") Long userId, Pageable pageable);
}
