package com.pmtool.service;

import com.pmtool.dto.response.ActivityResponse;
import com.pmtool.entity.ActivityLog;
import com.pmtool.entity.Project;
import com.pmtool.entity.User;
import com.pmtool.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Records human-readable activity entries and pushes live updates to anyone
 * watching a project board: /topic/projects/{projectId}/activity
 */
@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityLogRepository activityLogRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void log(Project project, User actor, String action, Long taskId) {
        ActivityLog entry = ActivityLog.builder()
                .project(project)
                .actor(actor)
                .action(action)
                .taskId(taskId)
                .build();
        activityLogRepository.save(entry);

        ActivityResponse payload = ActivityResponse.from(entry);
        messagingTemplate.convertAndSend("/topic/projects/" + project.getId() + "/activity", payload);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> recentForProject(Long projectId, int limit) {
        return activityLogRepository.findByProjectIdOrderByCreatedAtDesc(projectId, PageRequest.of(0, limit)).stream()
                .map(ActivityResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> recentForUser(Long userId, int limit) {
        return activityLogRepository.findRecentForUser(userId, PageRequest.of(0, limit)).stream()
                .map(ActivityResponse::from)
                .collect(Collectors.toList());
    }
}
