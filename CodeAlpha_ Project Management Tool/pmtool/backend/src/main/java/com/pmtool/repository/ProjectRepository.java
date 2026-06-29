package com.pmtool.repository;

import com.pmtool.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    boolean existsByProjectKey(String projectKey);

    Optional<Project> findByProjectKey(String projectKey);

    @Query("SELECT DISTINCT p FROM Project p JOIN p.members m WHERE m.user.id = :userId AND p.archived = false ORDER BY p.updatedAt DESC")
    List<Project> findAllAccessibleByUser(@Param("userId") Long userId);

    @Query("SELECT p FROM Project p WHERE p.owner.id = :userId")
    List<Project> findAllOwnedByUser(@Param("userId") Long userId);
}
