package com.vconf.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MeetingRequest {

    @NotBlank(message = "Meeting title is required")
    @Size(max = 150, message = "Title is too long")
    private String title;

    @Size(max = 500, message = "Description is too long")
    private String description;

    private LocalDateTime scheduledAt;

    private boolean waitingRoomEnabled;
}
