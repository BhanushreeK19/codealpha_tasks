package com.pmtool.repository;

import com.pmtool.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, Long> {
    List<Board> findByProjectIdOrderByPositionAsc(Long projectId);
}
