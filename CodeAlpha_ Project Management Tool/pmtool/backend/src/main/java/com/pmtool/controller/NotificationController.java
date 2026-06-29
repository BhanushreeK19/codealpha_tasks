package com.pmtool.controller;

import com.pmtool.dto.response.ApiResponse;
import com.pmtool.dto.response.NotificationResponse;
import com.pmtool.service.NotificationService;
import com.pmtool.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> list() {
        return notificationService.listForUser(SecurityUtils.currentUserId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", notificationService.countUnread(SecurityUtils.currentUserId()));
    }

    @PatchMapping("/{notificationId}/read")
    public ApiResponse markRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId, SecurityUtils.currentUserId());
        return ApiResponse.ok("Notification marked as read");
    }

    @PatchMapping("/read-all")
    public ApiResponse markAllRead() {
        notificationService.markAllAsRead(SecurityUtils.currentUserId());
        return ApiResponse.ok("All notifications marked as read");
    }
}
