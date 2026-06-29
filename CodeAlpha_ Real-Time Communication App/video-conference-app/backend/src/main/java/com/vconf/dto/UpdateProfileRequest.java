package com.vconf.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;

    @Size(max = 30, message = "Job title is too long")
    private String jobTitle;

    private String avatarUrl;
}
