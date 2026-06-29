package com.pmtool.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProjectCreateRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 150)
    private String name;

    private String description;

    @NotBlank(message = "Project key is required")
    @Pattern(regexp = "^[A-Za-z0-9]{2,10}$", message = "Project key must be 2-10 letters/digits, e.g. TPX")
    private String projectKey;

    private String color;
}
