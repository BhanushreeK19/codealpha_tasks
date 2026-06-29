package com.vconf.service;

import com.vconf.dto.ChatMessageDto;
import com.vconf.entity.ChatMessage;
import com.vconf.entity.Meeting;
import com.vconf.entity.User;
import com.vconf.exception.ResourceNotFoundException;
import com.vconf.repository.ChatMessageRepository;
import com.vconf.repository.MeetingRepository;
import com.vconf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessageDto saveAndBuildDto(String meetingCode, Long senderId, String content, ChatMessage.MessageType type) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + meetingCode));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatMessage message = ChatMessage.builder()
                .meeting(meeting)
                .sender(sender)
                .content(content)
                .type(type)
                .build();

        message = chatMessageRepository.save(message);

        return toDto(message, meetingCode);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getHistory(String meetingCode) {
        Meeting meeting = meetingRepository.findByMeetingCode(meetingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Meeting not found: " + meetingCode));

        return chatMessageRepository.findByMeetingIdOrderBySentAtAsc(meeting.getId())
                .stream()
                .map(m -> toDto(m, meetingCode))
                .toList();
    }

    private ChatMessageDto toDto(ChatMessage message, String meetingCode) {
        return ChatMessageDto.builder()
                .id(message.getId())
                .meetingCode(meetingCode)
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getFullName())
                .senderAvatarUrl(message.getSender().getAvatarUrl())
                .content(message.getContent())
                .type(message.getType().name())
                .sentAt(message.getSentAt())
                .build();
    }
}
