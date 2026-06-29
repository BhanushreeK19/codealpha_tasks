package com.pmtool.dto.response;

import com.pmtool.entity.Project;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private String projectKey;
    private String color;
    private UserSummaryResponse owner;
    private boolean archived;
    private int memberCount;
    private long totalTasks;
    private long doneTasks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ProjectMemberResponse> members;
    private List<BoardResponse> boards;

    public static ProjectResponse summary(Project project, int memberCount, long totalTasks, long doneTasks) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .projectKey(project.getProjectKey())
                .color(project.getColor())
                .owner(UserSummaryResponse.from(project.getOwner()))
                .archived(project.isArchived())
                .memberCount(memberCount)
                .totalTasks(totalTasks)
                .doneTasks(doneTasks)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
