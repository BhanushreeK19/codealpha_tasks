package com.vconf.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinMeetingRequest {

    @NotBlank(message = "Meeting code is required")
    private String meetingCode;
}
