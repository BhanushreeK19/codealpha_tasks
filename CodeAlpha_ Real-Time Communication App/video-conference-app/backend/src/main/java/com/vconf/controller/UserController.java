package com.vconf.controller;

import com.vconf.dto.ApiResponse;
import com.vconf.dto.ChangePasswordRequest;
import com.vconf.dto.UpdateProfileRequest;
import com.vconf.dto.UserProfileDto;
import com.vconf.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserProfileDto> me() {
        return ApiResponse.ok(userService.getCurrentUserProfile());
    }

    @PutMapping("/me")
    public ApiResponse<UserProfileDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.ok("Profile updated", userService.updateProfile(request));
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(request);
        return ApiResponse.ok("Password changed successfully", null);
    }
}
