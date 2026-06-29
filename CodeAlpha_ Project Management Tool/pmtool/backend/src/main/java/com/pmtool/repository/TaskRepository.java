package com.pmtool.repository;

import com.pmtool.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByBoardIdOrderByPositionAsc(Long boardId);

    List<Task> findByProjectId(Long projectId);

    List<Task> findByAssigneeIdOrderByDueDateAsc(Long assigneeId);

    Optional<Task> findByTaskCode(String taskCode);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.id = :projectId")
    long countByProjectId(@Param("projectId") Long projectId);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.project.projectKey = :projectKey")
    long countByProjectKey(@Param("projectKey") String projectKey);

    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId AND t.status <> 'DONE' AND t.dueDate IS NOT NULL ORDER BY t.dueDate ASC")
    List<Task> findUpcomingForUser(@Param("userId") Long userId);

    @Query("SELECT t FROM Task t WHERE t.assignee.id = :userId AND t.dueDate < :today AND t.status <> 'DONE'")
    List<Task> findOverdueForUser(@Param("userId") Long userId, @Param("today") LocalDate today);
}
