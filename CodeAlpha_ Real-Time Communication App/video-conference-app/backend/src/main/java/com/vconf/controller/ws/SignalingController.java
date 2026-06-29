package com.vconf.controller.ws;

import com.vconf.dto.SignalMessage;
import com.vconf.security.StompPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Relays WebRTC signaling (JOIN/LEAVE/OFFER/ANSWER/ICE_CANDIDATE/MEDIA_STATE/
 * SCREEN_SHARE_*) to every participant subscribed to a meeting's signaling
 * topic. The backend never inspects SDP/ICE payloads — it is a transport
 * relay only; the actual audio/video/screen streams travel peer-to-peer
 * (DTLS-SRTP encrypted) once negotiation completes, never through this
 * server. Each client filters messages addressed to a specific targetId
 * and ignores the rest, keeping the server topology-agnostic for a small
 * mesh of participants.
 */
@Controller
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal/{meetingCode}")
    public void relay(@DestinationVariable String meetingCode, SignalMessage message, Principal principal) {
        if (principal instanceof StompPrincipal authUser) {
            // Trust the authenticated session for the display name; client only owns senderId (its own session uuid).
            message.setSenderName(authUser.getName());
        }
        messagingTemplate.convertAndSend("/topic/signal/" + meetingCode, message);
    }
}
