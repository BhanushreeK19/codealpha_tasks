package com.pmtool.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BoardCreateRequest {

    @NotBlank(message = "Board name is required")
    private String name;
}
