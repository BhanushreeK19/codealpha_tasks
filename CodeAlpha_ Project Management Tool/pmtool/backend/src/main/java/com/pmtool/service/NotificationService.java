package com.pmtool.service;

import com.pmtool.dto.response.NotificationResponse;
import com.pmtool.entity.Notification;
import com.pmtool.entity.User;
import com.pmtool.enums.NotificationType;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Creates notifications and pushes them live over WebSocket (STOMP) to the
 * recipient's personal queue: /user/{username}/queue/notifications
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void notify(User recipient, User actor, NotificationType type, String message, Long taskId, Long projectId) {
        // Don't notify users about their own actions
        if (actor != null && recipient.getId().equals(actor.getId())) {
            return;
        }

        Notification notification = Notification.builder()
                .recipient(recipient)
                .actor(actor)
                .type(type)
                .message(message)
                .taskId(taskId)
                .projectId(projectId)
                .read(false)
                .build();

        notificationRepository.save(notification);

        NotificationResponse payload = NotificationResponse.from(notification);
        messagingTemplate.convertAndSendToUser(recipient.getUsername(), "/queue/notifications", payload);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listForUser(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new ResourceNotFoundException("Notification not found");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByRecipientIdAndReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }
}
