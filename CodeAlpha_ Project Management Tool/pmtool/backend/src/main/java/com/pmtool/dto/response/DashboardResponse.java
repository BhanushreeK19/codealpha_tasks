package com.pmtool.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private TaskStats taskStats;
    private List<ProjectResponse> projects;
    private List<TaskResponse> assignedTasks;
    private List<TaskResponse> overdueTasks;
    private List<ActivityResponse> recentActivity;
    private long unreadNotifications;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskStats {
        private long total;
        private long todo;
        private long inProgress;
        private long done;
        private long overdue;
    }
}
