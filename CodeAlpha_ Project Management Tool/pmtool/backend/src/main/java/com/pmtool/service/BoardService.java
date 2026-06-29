package com.pmtool.service;

import com.pmtool.dto.request.BoardCreateRequest;
import com.pmtool.dto.response.BoardResponse;
import com.pmtool.dto.response.TaskResponse;
import com.pmtool.entity.Board;
import com.pmtool.entity.Project;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.BoardRepository;
import com.pmtool.repository.CommentRepository;
import com.pmtool.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final ProjectService projectService;

    @Transactional
    public BoardResponse createBoard(Long projectId, BoardCreateRequest request, Long userId) {
        projectService.ensureMember(projectId, userId);
        Project project = projectService.getProjectOrThrow(projectId);

        int nextPosition = boardRepository.findByProjectIdOrderByPositionAsc(projectId).size();
        Board board = Board.builder()
                .project(project)
                .name(request.getName())
                .position(nextPosition)
                .build();
        board = boardRepository.save(board);
        return BoardResponse.from(board, List.of());
    }

    @Transactional(readOnly = true)
    public List<BoardResponse> listBoards(Long projectId, Long userId) {
        projectService.ensureMember(projectId, userId);
        return boardRepository.findByProjectIdOrderByPositionAsc(projectId).stream()
                .map(board -> {
                    List<TaskResponse> tasks = taskRepository.findByBoardIdOrderByPositionAsc(board.getId()).stream()
                            .sorted(Comparator.comparing(t -> t.getPosition() == null ? 0 : t.getPosition()))
                            .map(t -> TaskResponse.from(t, commentRepository.countByTaskId(t.getId())))
                            .collect(Collectors.toList());
                    return BoardResponse.from(board, tasks);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteBoard(Long boardId, Long userId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
        projectService.ensureManagerOrOwner(board.getProject().getId(), userId);
        boardRepository.delete(board);
    }

    public Board getBoardOrThrow(Long boardId) {
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found"));
    }
}
