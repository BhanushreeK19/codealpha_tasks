package com.pmtool.util;

import com.pmtool.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UserPrincipal currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalStateException("No authenticated user found in security context");
        }
        return (UserPrincipal) auth.getPrincipal();
    }

    public static Long currentUserId() {
        return currentUser().getId();
    }
}
