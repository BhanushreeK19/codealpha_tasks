package com.pmtool.dto.response;

import com.pmtool.entity.ProjectMember;
import com.pmtool.enums.ProjectRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponse {
    private Long id;
    private UserSummaryResponse user;
    private ProjectRole projectRole;
    private LocalDateTime joinedAt;

    public static ProjectMemberResponse from(ProjectMember member) {
        return ProjectMemberResponse.builder()
                .id(member.getId())
                .user(UserSummaryResponse.from(member.getUser()))
                .projectRole(member.getProjectRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
