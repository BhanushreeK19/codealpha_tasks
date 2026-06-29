package com.pmtool.controller;

import com.pmtool.dto.request.CommentCreateRequest;
import com.pmtool.dto.response.ApiResponse;
import com.pmtool.dto.response.CommentResponse;
import com.pmtool.service.CommentService;
import com.pmtool.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<CommentResponse> add(@PathVariable Long taskId, @Valid @RequestBody CommentCreateRequest request) {
        CommentResponse response = commentService.addComment(taskId, request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/tasks/{taskId}/comments")
    public List<CommentResponse> list(@PathVariable Long taskId) {
        return commentService.listComments(taskId, SecurityUtils.currentUserId());
    }

    @DeleteMapping("/comments/{commentId}")
    public ApiResponse delete(@PathVariable Long commentId) {
        commentService.deleteComment(commentId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Comment deleted");
    }
}
