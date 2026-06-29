package com.pmtool.dto.response;

import com.pmtool.entity.Task;
import com.pmtool.enums.TaskPriority;
import com.pmtool.enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private Long boardId;
    private Long projectId;
    private String taskCode;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private Integer position;
    private LocalDate dueDate;
    private boolean overdue;
    private UserSummaryResponse assignee;
    private UserSummaryResponse reporter;
    private long commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TaskResponse from(Task task, long commentCount) {
        boolean isOverdue = task.getDueDate() != null
                && task.getDueDate().isBefore(LocalDate.now())
                && task.getStatus() != TaskStatus.DONE;
        return TaskResponse.builder()
                .id(task.getId())
                .boardId(task.getBoard().getId())
                .projectId(task.getProject().getId())
                .taskCode(task.getTaskCode())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .position(task.getPosition())
                .dueDate(task.getDueDate())
                .overdue(isOverdue)
                .assignee(UserSummaryResponse.from(task.getAssignee()))
                .reporter(UserSummaryResponse.from(task.getReporter()))
                .commentCount(commentCount)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
