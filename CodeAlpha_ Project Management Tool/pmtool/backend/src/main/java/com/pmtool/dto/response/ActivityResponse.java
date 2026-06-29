package com.pmtool.dto.response;

import com.pmtool.entity.ActivityLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityResponse {
    private Long id;
    private Long projectId;
    private String projectName;
    private UserSummaryResponse actor;
    private String action;
    private Long taskId;
    private LocalDateTime createdAt;

    public static ActivityResponse from(ActivityLog log) {
        return ActivityResponse.builder()
                .id(log.getId())
                .projectId(log.getProject().getId())
                .projectName(log.getProject().getName())
                .actor(UserSummaryResponse.from(log.getActor()))
                .action(log.getAction())
                .taskId(log.getTaskId())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
