package com.vconf.entity;

/**
 * Application-wide roles used for role-based authorization (RBAC).
 * ROLE_HOST is granted to a meeting's creator at the meeting level (see
 * MeetingParticipant#role) while ROLE_USER / ROLE_ADMIN are global roles
 * stored on the User entity.
 */
public enum Role {
    ROLE_USER,
    ROLE_ADMIN
}
