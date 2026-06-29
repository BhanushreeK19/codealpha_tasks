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
public class ChatMessageDto {
    private Long id;
    private String meetingCode;
    private Long senderId;
    private String senderName;
    private String senderAvatarUrl;
    private String content;
    private String type; // CHAT, SYSTEM, FILE_SHARED
    private LocalDateTime sentAt;
}
