package com.vconf.security;

import lombok.Getter;

import java.security.Principal;

@Getter
public class StompPrincipal implements Principal {

    private final Long userId;
    private final String name;
    private final String email;

    public StompPrincipal(Long userId, String name, String email) {
        this.userId = userId;
        this.name = name;
        this.email = email;
    }

    @Override
    public String getName() {
        return name;
    }
}
