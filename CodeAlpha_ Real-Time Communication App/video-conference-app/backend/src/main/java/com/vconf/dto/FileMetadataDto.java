package com.vconf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileMetadataDto {
    private Long id;
    private String originalFileName;
    private String contentType;
    private long sizeBytes;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
    private String downloadUrl;
}
