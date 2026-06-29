package com.vconf.repository;

import com.vconf.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByMeetingIdOrderBySentAtAsc(Long meetingId);
}
