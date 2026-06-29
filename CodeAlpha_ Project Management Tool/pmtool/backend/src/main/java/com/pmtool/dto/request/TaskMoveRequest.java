package com.pmtool.dto.request;

import com.pmtool.enums.TaskStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/** Lightweight payload used by drag-and-drop to relocate a task without a full update. */
@Data
public class TaskMoveRequest {

    @NotNull
    private TaskStatus status;

    @NotNull
    private Integer position;
}
