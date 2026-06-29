package com.pmtool.controller;

import com.pmtool.dto.response.UserSummaryResponse;
import com.pmtool.repository.UserRepository;
import com.pmtool.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public UserSummaryResponse me() {
        var principal = SecurityUtils.currentUser();
        return userRepository.findById(principal.getId())
                .map(UserSummaryResponse::from)
                .orElseThrow();
    }

    /** Used for assignee dropdowns and @mention autocomplete. */
    @GetMapping("/search")
    public List<UserSummaryResponse> search(@RequestParam("q") String query) {
        return userRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query)
                .stream()
                .limit(10)
                .map(UserSummaryResponse::from)
                .toList();
    }
}
