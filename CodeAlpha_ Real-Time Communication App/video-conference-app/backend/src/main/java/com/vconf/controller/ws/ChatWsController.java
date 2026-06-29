package com.vconf.controller.ws;

import com.vconf.dto.ChatMessageDto;
import com.vconf.entity.ChatMessage;
import com.vconf.security.StompPrincipal;
import com.vconf.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handles real-time group chat for a meeting room. Every message is
 * persisted (so a participant who reconnects, or opens the meeting
 * history later, can still read it) and then fanned out to everyone
 * currently subscribed to the meeting's chat topic.
 */
@Controller
@RequiredArgsConstructor
public class ChatWsController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/{meetingCode}.send")
    public void sendMessage(@DestinationVariable String meetingCode, ChatMessageDto incoming, Principal principal) {
        if (!(principal instanceof StompPrincipal authUser)) {
            return; // unauthenticated frames are rejected at the channel-interceptor level already
        }

        String content = incoming.getContent() == null ? "" : incoming.getContent().trim();
        if (content.isEmpty() || content.length() > 2000) {
            return;
        }

        ChatMessageDto saved = chatService.saveAndBuildDto(
                meetingCode, authUser.getUserId(), content, ChatMessage.MessageType.CHAT);

        messagingTemplate.convertAndSend("/topic/chat/" + meetingCode, saved);
    }
}
