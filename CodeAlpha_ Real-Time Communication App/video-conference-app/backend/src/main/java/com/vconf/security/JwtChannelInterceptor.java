package com.vconf.security;

import com.vconf.entity.User;
import com.vconf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Secures STOMP over WebSocket: every CONNECT frame must carry a valid JWT
 * in the "Authorization" native STOMP header (sent by the frontend's
 * stomp.js client as connectHeaders). Without it, the session is rejected
 * before it ever reaches a @MessageMapping handler — satisfying the
 * "Secure WebSocket Connections" requirement.
 */
@Component
@RequiredArgsConstructor
public class JwtChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new IllegalArgumentException(
                        "Missing Authorization header on WebSocket CONNECT");
            }

            String token = authHeader.substring(7);
            String email;
            try {
                email = jwtUtil.extractEmail(token);
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid or expired token");
            }

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown user"));

            accessor.setUser(new StompPrincipal(user.getId(), user.getFullName(), user.getEmail()));
        }

        return message;
    }
}
