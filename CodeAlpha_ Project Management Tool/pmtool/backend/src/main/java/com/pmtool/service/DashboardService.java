package com.pmtool.service;

import com.pmtool.dto.response.DashboardResponse;
import com.pmtool.dto.response.ProjectResponse;
import com.pmtool.dto.response.TaskResponse;
import com.pmtool.entity.Task;
import com.pmtool.enums.TaskStatus;
import com.pmtool.repository.CommentRepository;
import com.pmtool.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectService projectService;
    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public DashboardResponse buildDashboard(Long userId) {
        List<ProjectResponse> projects = projectService.listAccessibleProjects(userId);

        List<Task> assigned = taskRepository.findByAssigneeIdOrderByDueDateAsc(userId);
        List<Task> overdue = taskRepository.findOverdueForUser(userId, LocalDate.now());

        List<TaskResponse> assignedTasks = assigned.stream()
                .map(t -> TaskResponse.from(t, commentRepository.countByTaskId(t.getId())))
                .collect(Collectors.toList());

        List<TaskResponse> overdueTasks = overdue.stream()
                .map(t -> TaskResponse.from(t, commentRepository.countByTaskId(t.getId())))
                .collect(Collectors.toList());

        long total = assigned.size();
        long todo = assigned.stream().filter(t -> t.getStatus() == TaskStatus.TODO).count();
        long inProgress = assigned.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count();
        long done = assigned.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        DashboardResponse.TaskStats stats = DashboardResponse.TaskStats.builder()
                .total(total)
                .todo(todo)
                .inProgress(inProgress)
                .done(done)
                .overdue(overdue.size())
                .build();

        return DashboardResponse.builder()
                .taskStats(stats)
                .projects(projects)
                .assignedTasks(assignedTasks)
                .overdueTasks(overdueTasks)
                .recentActivity(activityService.recentForUser(userId, 15))
                .unreadNotifications(notificationService.countUnread(userId))
                .build();
    }
}
