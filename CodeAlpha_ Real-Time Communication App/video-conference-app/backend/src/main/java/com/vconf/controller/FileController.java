package com.vconf.controller;

import com.vconf.dto.ApiResponse;
import com.vconf.dto.FileMetadataDto;
import com.vconf.entity.FileMetadata;
import com.vconf.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/meetings/{meetingCode}/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileMetadataDto> upload(@PathVariable String meetingCode,
                                                @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("File uploaded", fileStorageService.uploadFile(meetingCode, file));
    }

    @GetMapping
    public ApiResponse<List<FileMetadataDto>> list(@PathVariable String meetingCode) {
        return ApiResponse.ok(fileStorageService.listFiles(meetingCode));
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable String meetingCode, @PathVariable Long fileId) {
        Resource resource = fileStorageService.loadAsResource(meetingCode, fileId);
        FileMetadata metadata = fileStorageService.getMetadata(fileId);

        String encodedName = java.net.URLEncoder.encode(metadata.getOriginalFileName(), StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedName + "\"")
                .body(resource);
    }
}
