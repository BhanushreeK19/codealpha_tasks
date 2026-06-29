package com.pmtool.controller;

import com.pmtool.dto.request.BoardCreateRequest;
import com.pmtool.dto.response.ApiResponse;
import com.pmtool.dto.response.BoardResponse;
import com.pmtool.service.BoardService;
import com.pmtool.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @PostMapping("/projects/{projectId}/boards")
    public ResponseEntity<BoardResponse> create(@PathVariable Long projectId, @Valid @RequestBody BoardCreateRequest request) {
        BoardResponse response = boardService.createBoard(projectId, request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/projects/{projectId}/boards")
    public List<BoardResponse> list(@PathVariable Long projectId) {
        return boardService.listBoards(projectId, SecurityUtils.currentUserId());
    }

    @DeleteMapping("/boards/{boardId}")
    public ApiResponse delete(@PathVariable Long boardId) {
        boardService.deleteBoard(boardId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Board deleted");
    }
}
