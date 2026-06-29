package com.pmtool.dto.request;

import lombok.Data;

@Data
public class ProjectUpdateRequest {
    private String name;
    private String description;
    private String color;
}
