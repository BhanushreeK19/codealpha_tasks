package com.vconf;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point for the Real-Time Video Conferencing & Collaboration Platform.
 *
 * Modules wired together by this application:
 *  - REST API (auth, meetings, files, users)
 *  - STOMP over WebSocket (signaling, chat, whiteboard)
 *  - Spring Security + JWT (stateless authentication)
 *  - JPA / MySQL persistence
 */
@SpringBootApplication
@EnableScheduling
public class VConfApplication {
    public static void main(String[] args) {
        SpringApplication.run(VConfApplication.class, args);
    }
}
