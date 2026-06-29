package com.vconf.service;

import com.vconf.dto.FileMetadataDto;
import com.vconf.entity.FileMetadata;
import com.vconf.entity.Meeting;
import com.vconf.entity.User;
import com.vconf.exception.BadRequestException;
import com.vconf.exception.ResourceNotFoundException;
import com.vconf.repository.FileMetadataRepository;
import com.vconf.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private final FileMetadataRepository fileMetadataRepository;
    private final MeetingRepository meetingRepository;
    private final UserService userService;

    @Value("${app.file-storage.upload-dir}")
    private String uploadDir;

    /** Extensions we refuse to accept, regardless of declared content-type (defense in depth). */
    private static final List<String> BLOCKED_EXTENSIONS = List.of(
            "exe", "bat", "cmd", "sh", "msi", "dll", "jar", "vbs", "ps1"
    );

    @Transactional
    public FileMetadataDto uploadFile(String meetingCode, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        String originalName = sanitizeFileName(file.getOriginalFilename());
        String extension = getExtension(originalName).toLowerCase();

        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File type ." + extension + " is not allowed for security reasons");
        }

        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + meetingCode));
        User uploader = userService.getCurrentUser();

        try {
            Path meetingDir = Paths.get(uploadDir, meetingCode).toAbsolutePath().normalize();
            Files.createDirectories(meetingDir);

            String storedName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);
            Path target = meetingDir.resolve(storedName).normalize();

            // Defense against path traversal: resolved path must remain inside meetingDir.
            if (!target.startsWith(meetingDir)) {
                throw new BadRequestException("Invalid file name");
            }

            Files.copy(file.getInputStream(), target);

            FileMetadata metadata = FileMetadata.builder()
                    .meeting(meeting)
                    .uploadedBy(uploader)
                    .originalFileName(originalName)
                    .storedFileName(storedName)
                    .contentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .sizeBytes(file.getSize())
                    .build();

           metadata = fileMetadataRepository.save(metadata);
            return toDto(metadata, meetingCode);
        } catch (IOException e) {
            throw new BadRequestException("Failed to store file: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<FileMetadataDto> listFiles(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + meetingCode));

        return fileMetadataRepository.findByMeetingIdOrderByUploadedAtDesc(meeting.getId())
                .stream()
                .map(f -> toDto(f, meetingCode))
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource loadAsResource(String meetingCode, Long fileId) {
        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!metadata.getMeeting().getMeetingCode().equals(meetingCode)) {
            throw new BadRequestException("File does not belong to this meeting");
        }

        try {
            Path filePath = Paths.get(uploadDir, meetingCode, metadata.getStoredFileName()).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("File content is no longer available");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File not found");
        }
    }

    public FileMetadata getMetadata(Long fileId) {
        return fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
    }

    private FileMetadataDto toDto(FileMetadata metadata, String meetingCode) {
        return FileMetadataDto.builder()
                .id(metadata.getId())
                .originalFileName(metadata.getOriginalFileName())
                .contentType(metadata.getContentType())
                .sizeBytes(metadata.getSizeBytes())
                .uploadedByName(metadata.getUploadedBy().getFullName())
                .uploadedAt(metadata.getUploadedAt())
                .downloadUrl("/api/meetings/" + meetingCode + "/files/" + metadata.getId() + "/download")
                .build();
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "file";
        }
        // Strip any directory traversal characters / path separators.
        String cleaned = fileName.replaceAll("[/\\\\]", "_");
        return Paths.get(cleaned).getFileName().toString();
    }

    private String getExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        return (dot == -1 || dot == fileName.length() - 1) ? "" : fileName.substring(dot + 1);
    }
}
