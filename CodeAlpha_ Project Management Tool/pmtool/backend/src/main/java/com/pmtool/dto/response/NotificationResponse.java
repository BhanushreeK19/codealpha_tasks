package com.pmtool.dto.response;

import com.pmtool.entity.Notification;
import com.pmtool.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private String message;
    private Long taskId;
    private Long projectId;
    private UserSummaryResponse actor;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .message(n.getMessage())
                .taskId(n.getTaskId())
                .projectId(n.getProjectId())
                .actor(UserSummaryResponse.from(n.getActor()))
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
