package com.vconf.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generic signaling envelope relayed through the STOMP broker so peers can
 * establish direct WebRTC (mesh) connections with each other.
 *
 * type values:
 *   JOIN, LEAVE                       - presence events
 *   OFFER, ANSWER, ICE_CANDIDATE       - WebRTC negotiation, routed to a single target peer
 *   MEDIA_STATE                       - mic/camera on-off broadcast
 *   SCREEN_SHARE_START, SCREEN_SHARE_STOP - screen sharing broadcast
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalMessage {
    private String type;

    /** Sender's unique session participant id (assigned at join time). */
    private String senderId;
    private String senderName;

    /** Destination participant id — required for OFFER/ANSWER/ICE_CANDIDATE, null for broadcasts. */
    private String targetId;

    /** SDP payload for OFFER/ANSWER. */
    private String sdp;

    /** ICE candidate payload (stringified JSON) for ICE_CANDIDATE. */
    private String candidate;

    /** Free-form flag used for MEDIA_STATE (e.g. "audio:false", "video:true"). */
    private String payload;
}
