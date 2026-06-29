package com.pmtool.dto.request;

import com.pmtool.enums.ProjectRole;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteMemberRequest {

    @NotBlank(message = "Username or email is required")
    private String usernameOrEmail;

    private ProjectRole projectRole = ProjectRole.MEMBER;
}
