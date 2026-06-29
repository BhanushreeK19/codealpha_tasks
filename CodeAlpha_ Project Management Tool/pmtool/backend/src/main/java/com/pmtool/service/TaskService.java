package com.pmtool.service;

import com.pmtool.dto.request.TaskCreateRequest;
import com.pmtool.dto.request.TaskMoveRequest;
import com.pmtool.dto.request.TaskUpdateRequest;
import com.pmtool.dto.response.TaskResponse;
import com.pmtool.entity.Board;
import com.pmtool.entity.Project;
import com.pmtool.entity.Task;
import com.pmtool.entity.User;
import com.pmtool.enums.NotificationType;
import com.pmtool.enums.TaskStatus;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.CommentRepository;
import com.pmtool.repository.TaskRepository;
import com.pmtool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final BoardService boardService;
    private final ProjectService projectService;
    private final NotificationService notificationService;
    private final ActivityService activityService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public TaskResponse createTask(TaskCreateRequest request, Long creatorId) {
        Board board = boardService.getBoardOrThrow(request.getBoardId());
        Project project = board.getProject();
        projectService.ensureMember(project.getId(), creatorId);

        User reporter = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
            projectService.ensureMember(project.getId(), assignee.getId());
        }

        int nextPosition = (int) taskRepository.findByBoardIdOrderByPositionAsc(board.getId()).stream()
                .filter(t -> t.getStatus() == TaskStatus.TODO)
                .count();

        Task task = Task.builder()
                .board(board)
                .project(project)
                .taskCode(generateTaskCode(project))
                .title(request.getTitle())
                .description(request.getDescription())
                .status(TaskStatus.TODO)
                .priority(request.getPriority() != null ? request.getPriority() : com.pmtool.enums.TaskPriority.MEDIUM)
                .position(nextPosition)
                .dueDate(request.getDueDate())
                .assignee(assignee)
                .reporter(reporter)
                .build();

        task = saveWithRetry(task, project);

        activityService.log(project, reporter, "created task " + task.getTaskCode() + " — " + task.getTitle(), task.getId());

        if (assignee != null) {
            notificationService.notify(assignee, reporter, NotificationType.TASK_ASSIGNED,
                    reporter.getFullName() + " assigned you to \"" + task.getTitle() + "\"", task.getId(), project.getId());
        }

        TaskResponse response = TaskResponse.from(task, 0);
        broadcastTaskEvent(project.getId(), "TASK_CREATED", response);
        return response;
    }

    private Task saveWithRetry(Task task, Project project) {
        // task_code has a unique constraint; retry once on the rare race condition
        try {
            return taskRepository.save(task);
        } catch (org.springframework.dao.DataIntegrityViolationException ex) {
            task.setTaskCode(generateTaskCode(project));
            return taskRepository.save(task);
        }
    }

    private String generateTaskCode(Project project) {
        long count = taskRepository.countByProjectKey(project.getProjectKey());
        return project.getProjectKey() + "-" + (count + 1);
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long taskId, Long userId) {
        Task task = getTaskOrThrow(taskId);
        projectService.ensureMember(task.getProject().getId(), userId);
        return TaskResponse.from(task, commentRepository.countByTaskId(task.getId()));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listAssignedToUser(Long userId) {
        return taskRepository.findByAssigneeIdOrderByDueDateAsc(userId).stream()
                .map(t -> TaskResponse.from(t, commentRepository.countByTaskId(t.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public TaskResponse updateTask(Long taskId, TaskUpdateRequest request, Long userId) {
        Task task = getTaskOrThrow(taskId);
        Project project = task.getProject();
        projectService.ensureMember(project.getId(), userId);

        User actor = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean statusChanged = false;
        boolean assigneeChanged = false;
        User previousAssignee = task.getAssignee();

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null && request.getStatus() != task.getStatus()) {
            task.setStatus(request.getStatus());
            statusChanged = true;
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getPosition() != null) {
            task.setPosition(request.getPosition());
        }
        if (request.getBoardId() != null && !request.getBoardId().equals(task.getBoard().getId())) {
            Board newBoard = boardService.getBoardOrThrow(request.getBoardId());
            task.setBoard(newBoard);
        }
        if (request.getAssigneeId() != null) {
            if (previousAssignee == null || !previousAssignee.getId().equals(request.getAssigneeId())) {
                User newAssignee = userRepository.findById(request.getAssigneeId())
                        .orElseThrow(() -> new ResourceNotFoundException("Assignee not found"));
                projectService.ensureMember(project.getId(), newAssignee.getId());
                task.setAssignee(newAssignee);
                assigneeChanged = true;
            }
        }

        task = taskRepository.save(task);

        if (statusChanged) {
            activityService.log(project, actor, "moved " + task.getTaskCode() + " to " + readableStatus(task.getStatus()), task.getId());
            if (task.getAssignee() != null) {
                notificationService.notify(task.getAssignee(), actor, NotificationType.TASK_STATUS_CHANGED,
                        actor.getFullName() + " moved \"" + task.getTitle() + "\" to " + readableStatus(task.getStatus()),
                        task.getId(), project.getId());
            }
        }
        if (assigneeChanged && task.getAssignee() != null) {
            activityService.log(project, actor, "assigned " + task.getTaskCode() + " to " + task.getAssignee().getFullName(), task.getId());
            notificationService.notify(task.getAssignee(), actor, NotificationType.TASK_ASSIGNED,
                    actor.getFullName() + " assigned you to \"" + task.getTitle() + "\"", task.getId(), project.getId());
        }

        TaskResponse response = TaskResponse.from(task, commentRepository.countByTaskId(task.getId()));
        broadcastTaskEvent(project.getId(), "TASK_UPDATED", response);
        return response;
    }

    @Transactional
    public TaskResponse moveTask(Long taskId, TaskMoveRequest request, Long userId) {
        Task task = getTaskOrThrow(taskId);
        Project project = task.getProject();
        projectService.ensureMember(project.getId(), userId);
        User actor = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean statusChanged = task.getStatus() != request.getStatus();
        task.setStatus(request.getStatus());
        task.setPosition(request.getPosition());
        task = taskRepository.save(task);

        if (statusChanged) {
            activityService.log(project, actor, "moved " + task.getTaskCode() + " to " + readableStatus(task.getStatus()), task.getId());
            if (task.getAssignee() != null) {
                notificationService.notify(task.getAssignee(), actor, NotificationType.TASK_STATUS_CHANGED,
                        actor.getFullName() + " moved \"" + task.getTitle() + "\" to " + readableStatus(task.getStatus()),
                        task.getId(), project.getId());
            }
        }

        TaskResponse response = TaskResponse.from(task, commentRepository.countByTaskId(task.getId()));
        broadcastTaskEvent(project.getId(), "TASK_MOVED", response);
        return response;
    }

    @Transactional
    public void deleteTask(Long taskId, Long userId) {
        Task task = getTaskOrThrow(taskId);
        Long projectId = task.getProject().getId();
        projectService.ensureMember(projectId, userId);
        taskRepository.delete(task);
        broadcastTaskEvent(projectId, "TASK_DELETED", java.util.Map.of("id", taskId));
    }

    public Task getTaskOrThrow(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
    }

    private void broadcastTaskEvent(Long projectId, String eventType, Object payload) {
        messagingTemplate.convertAndSend("/topic/projects/" + projectId + "/tasks",
                java.util.Map.of("event", eventType, "data", payload));
    }

    private String readableStatus(TaskStatus status) {
        return switch (status) {
            case TODO -> "To Do";
            case IN_PROGRESS -> "In Progress";
            case DONE -> "Done";
        };
    }
}
