package com.pmtool.service;

import com.pmtool.dto.request.InviteMemberRequest;
import com.pmtool.dto.request.ProjectCreateRequest;
import com.pmtool.dto.request.ProjectUpdateRequest;
import com.pmtool.dto.response.ProjectMemberResponse;
import com.pmtool.dto.response.ProjectResponse;
import com.pmtool.entity.Board;
import com.pmtool.entity.Project;
import com.pmtool.entity.ProjectMember;
import com.pmtool.entity.User;
import com.pmtool.enums.NotificationType;
import com.pmtool.enums.ProjectRole;
import com.pmtool.exception.AccessDeniedCustomException;
import com.pmtool.exception.BadRequestException;
import com.pmtool.exception.DuplicateResourceException;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.BoardRepository;
import com.pmtool.repository.ProjectMemberRepository;
import com.pmtool.repository.ProjectRepository;
import com.pmtool.repository.TaskRepository;
import com.pmtool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final BoardRepository boardRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;

    @Transactional
    public ProjectResponse createProject(ProjectCreateRequest request, Long ownerId) {
        if (projectRepository.existsByProjectKey(request.getProjectKey().toUpperCase())) {
            throw new DuplicateResourceException("Project key '" + request.getProjectKey() + "' is already in use");
        }
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .projectKey(request.getProjectKey().toUpperCase())
                .color(request.getColor() != null ? request.getColor() : "#6366F1")
                .owner(owner)
                .archived(false)
                .build();
        project = projectRepository.save(project);

        ProjectMember ownerMembership = ProjectMember.builder()
                .project(project)
                .user(owner)
                .projectRole(ProjectRole.OWNER)
                .build();
        projectMemberRepository.save(ownerMembership);

        // Every new project starts with a default Kanban board so users can work immediately
        Board defaultBoard = Board.builder()
                .project(project)
                .name("Main Board")
                .position(0)
                .build();
        boardRepository.save(defaultBoard);

        activityService.log(project, owner, "created the project", null);

        return toResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> listAccessibleProjects(Long userId) {
        return projectRepository.findAllAccessibleByUser(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectDetail(Long projectId, Long userId) {
        Project project = getProjectOrThrow(projectId);
        ensureMember(projectId, userId);

        List<ProjectMemberResponse> members = projectMemberRepository.findByProjectId(projectId).stream()
                .map(ProjectMemberResponse::from)
                .collect(Collectors.toList());

        ProjectResponse response = toResponse(project);
        response.setMembers(members);
        return response;
    }

    @Transactional
    public ProjectResponse updateProject(Long projectId, ProjectUpdateRequest request, Long userId) {
        Project project = getProjectOrThrow(projectId);
        ensureManagerOrOwner(projectId, userId);

        if (request.getName() != null && !request.getName().isBlank()) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getColor() != null) {
            project.setColor(request.getColor());
        }
        project = projectRepository.save(project);
        return toResponse(project);
    }

    @Transactional
    public void deleteProject(Long projectId, Long userId) {
        Project project = getProjectOrThrow(projectId);
        if (!project.getOwner().getId().equals(userId)) {
            throw new AccessDeniedCustomException("Only the project owner can delete this project");
        }
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectMemberResponse inviteMember(Long projectId, InviteMemberRequest request, Long inviterId) {
        Project project = getProjectOrThrow(projectId);
        ensureManagerOrOwner(projectId, inviterId);

        User invitee = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(request.getUsernameOrEmail()))
                .orElseThrow(() -> new ResourceNotFoundException("No user found with that username or email"));

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, invitee.getId())) {
            throw new DuplicateResourceException(invitee.getUsername() + " is already a member of this project");
        }

        ProjectMember membership = ProjectMember.builder()
                .project(project)
                .user(invitee)
                .projectRole(request.getProjectRole() != null ? request.getProjectRole() : ProjectRole.MEMBER)
                .build();
        membership = projectMemberRepository.save(membership);

        User inviter = userRepository.findById(inviterId).orElse(null);
        notificationService.notify(invitee, inviter, NotificationType.PROJECT_INVITE,
                (inviter != null ? inviter.getFullName() : "Someone") + " added you to project \"" + project.getName() + "\"",
                null, project.getId());

        activityService.log(project, inviter, "invited " + invitee.getFullName() + " to the project", null);

        return ProjectMemberResponse.from(membership);
    }

    @Transactional
    public void removeMember(Long projectId, Long memberUserId, Long requesterId) {
        Project project = getProjectOrThrow(projectId);
        ensureManagerOrOwner(projectId, requesterId);

        if (project.getOwner().getId().equals(memberUserId)) {
            throw new BadRequestException("The project owner cannot be removed");
        }
        projectMemberRepository.deleteByProjectIdAndUserId(projectId, memberUserId);
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> listMembers(Long projectId, Long userId) {
        ensureMember(projectId, userId);
        return projectMemberRepository.findByProjectId(projectId).stream()
                .map(ProjectMemberResponse::from)
                .collect(Collectors.toList());
    }

    // ---------------------------------------------------------------------
    // Access control helpers (used by other services too)
    // ---------------------------------------------------------------------

    @Transactional(readOnly = true)
    public void ensureMember(Long projectId, Long userId) {
        boolean isMember = projectMemberRepository.existsByProjectIdAndUserId(projectId, userId);
        if (!isMember) {
            throw new AccessDeniedCustomException("You are not a member of this project");
        }
    }

    @Transactional(readOnly = true)
    public void ensureManagerOrOwner(Long projectId, Long userId) {
        ProjectMember membership = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AccessDeniedCustomException("You are not a member of this project"));
        if (membership.getProjectRole() == ProjectRole.MEMBER) {
            throw new AccessDeniedCustomException("Only project managers or the owner can perform this action");
        }
    }

    public Project getProjectOrThrow(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
    }

    private ProjectResponse toResponse(Project project) {
        int memberCount = projectMemberRepository.findByProjectId(project.getId()).size();
        long total = taskRepository.countByProjectId(project.getId());
        long done = taskRepository.findByProjectId(project.getId()).stream()
                .filter(t -> t.getStatus().name().equals("DONE"))
                .count();
        return ProjectResponse.summary(project, memberCount, total, done);
    }
}
