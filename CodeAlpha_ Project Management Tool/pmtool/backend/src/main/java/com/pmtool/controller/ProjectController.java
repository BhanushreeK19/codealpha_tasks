package com.pmtool.controller;

import com.pmtool.dto.request.InviteMemberRequest;
import com.pmtool.dto.request.ProjectCreateRequest;
import com.pmtool.dto.request.ProjectUpdateRequest;
import com.pmtool.dto.response.ActivityResponse;
import com.pmtool.dto.response.ApiResponse;
import com.pmtool.dto.response.ProjectMemberResponse;
import com.pmtool.dto.response.ProjectResponse;
import com.pmtool.service.ActivityService;
import com.pmtool.service.ProjectService;
import com.pmtool.util.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final ActivityService activityService;

    @PostMapping
    public ResponseEntity<ProjectResponse> create(@Valid @RequestBody ProjectCreateRequest request) {
        ProjectResponse response = projectService.createProject(request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public List<ProjectResponse> listMine() {
        return projectService.listAccessibleProjects(SecurityUtils.currentUserId());
    }

    @GetMapping("/{projectId}")
    public ProjectResponse getOne(@PathVariable Long projectId) {
        return projectService.getProjectDetail(projectId, SecurityUtils.currentUserId());
    }

    @PutMapping("/{projectId}")
    public ProjectResponse update(@PathVariable Long projectId, @RequestBody ProjectUpdateRequest request) {
        return projectService.updateProject(projectId, request, SecurityUtils.currentUserId());
    }

    @DeleteMapping("/{projectId}")
    public ApiResponse delete(@PathVariable Long projectId) {
        projectService.deleteProject(projectId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Project deleted");
    }

    @GetMapping("/{projectId}/members")
    public List<ProjectMemberResponse> members(@PathVariable Long projectId) {
        return projectService.listMembers(projectId, SecurityUtils.currentUserId());
    }

    @GetMapping("/{projectId}/activity")
    public List<ActivityResponse> activity(@PathVariable Long projectId) {
        projectService.ensureMember(projectId, SecurityUtils.currentUserId());
        return activityService.recentForProject(projectId, 50);
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<ProjectMemberResponse> invite(@PathVariable Long projectId,
                                                          @Valid @RequestBody InviteMemberRequest request) {
        ProjectMemberResponse response = projectService.inviteMember(projectId, request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{projectId}/members/{memberUserId}")
    public ApiResponse removeMember(@PathVariable Long projectId, @PathVariable Long memberUserId) {
        projectService.removeMember(projectId, memberUserId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Member removed");
    }
}
