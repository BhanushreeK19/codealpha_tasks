package com.vconf.repository;

import com.vconf.entity.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByMeetingIdOrderByUploadedAtDesc(Long meetingId);
}
