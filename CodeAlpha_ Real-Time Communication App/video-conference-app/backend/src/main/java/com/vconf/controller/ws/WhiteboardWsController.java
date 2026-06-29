package com.vconf.controller.ws;

import com.vconf.dto.WhiteboardEvent;
import com.vconf.security.StompPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Broadcasts whiteboard drawing events (stroke segments, clear, undo) to
 * every participant of a meeting so all canvases stay in sync in real time.
 * Strokes are intentionally NOT persisted to the database in this version —
 * the whiteboard is ephemeral per session, mirroring how most lightweight
 * collaboration tools treat scratch whiteboards. Persisting board snapshots
 * would only require adding a WhiteboardSnapshot entity + periodic save.
 */
@Controller
@RequiredArgsConstructor
public class WhiteboardWsController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/whiteboard/{meetingCode}")
    public void draw(@DestinationVariable String meetingCode, WhiteboardEvent event, Principal principal) {
        if (principal instanceof StompPrincipal authUser) {
            event.setSenderName(authUser.getName());
        }
        messagingTemplate.convertAndSend("/topic/whiteboard/" + meetingCode, event);
    }
}
