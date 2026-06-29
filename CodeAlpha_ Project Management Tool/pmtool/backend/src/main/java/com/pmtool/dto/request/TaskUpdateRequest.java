package com.pmtool.dto.request;

import com.pmtool.enums.TaskPriority;
import com.pmtool.enums.TaskStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskUpdateRequest {
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDate dueDate;
    private Long assigneeId;
    private Integer position;
    private Long boardId;   // allows moving a task to a different board/column set
}
