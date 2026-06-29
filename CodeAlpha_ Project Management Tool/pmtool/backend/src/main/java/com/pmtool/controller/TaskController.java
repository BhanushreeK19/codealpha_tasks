package com.pmtool.controller;

import com.pmtool.dto.request.TaskCreateRequest;
import com.pmtool.dto.request.TaskMoveRequest;
import com.pmtool.dto.request.TaskUpdateRequest;
import com.pmtool.dto.response.ApiResponse;
import com.pmtool.dto.response.TaskResponse;
import com.pmtool.service.TaskService;
import com.pmtool.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskCreateRequest request) {
        TaskResponse response = taskService.createTask(request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{taskId}")
    public TaskResponse getOne(@PathVariable Long taskId) {
        return taskService.getTask(taskId, SecurityUtils.currentUserId());
    }

    @GetMapping("/assigned-to-me")
    public List<TaskResponse> assignedToMe() {
        return taskService.listAssignedToUser(SecurityUtils.currentUserId());
    }

    @PutMapping("/{taskId}")
    public TaskResponse update(@PathVariable Long taskId, @RequestBody TaskUpdateRequest request) {
        return taskService.updateTask(taskId, request, SecurityUtils.currentUserId());
    }

    /** Lightweight endpoint for drag-and-drop: updates status + column position only. */
    @PatchMapping("/{taskId}/move")
    public TaskResponse move(@PathVariable Long taskId, @Valid @RequestBody TaskMoveRequest request) {
        return taskService.moveTask(taskId, request, SecurityUtils.currentUserId());
    }

    @DeleteMapping("/{taskId}")
    public ApiResponse delete(@PathVariable Long taskId) {
        taskService.deleteTask(taskId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Task deleted");
    }
}
