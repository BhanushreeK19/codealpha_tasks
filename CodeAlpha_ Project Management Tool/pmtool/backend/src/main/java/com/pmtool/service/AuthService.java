package com.pmtool.service;

import com.pmtool.dto.request.LoginRequest;
import com.pmtool.dto.request.RegisterRequest;
import com.pmtool.dto.response.JwtResponse;
import com.pmtool.dto.response.UserSummaryResponse;
import com.pmtool.entity.Role;
import com.pmtool.entity.User;
import com.pmtool.exception.BadRequestException;
import com.pmtool.exception.DuplicateResourceException;
import com.pmtool.exception.ResourceNotFoundException;
import com.pmtool.repository.RoleRepository;
import com.pmtool.repository.UserRepository;
import com.pmtool.security.JwtUtils;
import com.pmtool.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String[] PALETTE = {
            "#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#EC4899", "#14B8A6"
    };

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Transactional
    public JwtResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email is already registered");
        }

        Role memberRole = roleRepository.findByName("ROLE_MEMBER")
                .orElseThrow(() -> new ResourceNotFoundException("Default role ROLE_MEMBER not found — has the schema been seeded?"));

        Set<Role> roles = new HashSet<>();
        roles.add(memberRole);

        String color = PALETTE[(int) (Math.random() * PALETTE.length)];

        User user = User.builder()
                .fullName(request.getFullName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .avatarColor(color)
                .enabled(true)
                .roles(roles)
                .build();

        userRepository.save(user);

        UserPrincipal principal = new UserPrincipal(user);
        return buildJwtResponse(principal, user);
    }

    @Transactional
    public JwtResponse login(LoginRequest request) {
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
            );
        } catch (Exception ex) {
            throw new BadRequestException("Invalid username/email or password");
        }
        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return buildJwtResponse(principal, user);
    }

    @Transactional
    public JwtResponse refresh(String refreshToken) {
        if (!jwtUtils.validateToken(refreshToken)) {
            throw new BadRequestException("Refresh token is invalid or expired");
        }
        Long userId = jwtUtils.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserPrincipal principal = new UserPrincipal(user);
        return buildJwtResponse(principal, user);
    }

    private JwtResponse buildJwtResponse(UserPrincipal principal, User user) {
        String accessToken = jwtUtils.generateAccessToken(principal);
        String refreshToken = jwtUtils.generateRefreshToken(principal);
        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .user(UserSummaryResponse.from(user))
                .build();
    }
}
