package com.pmtool.controller;

import com.pmtool.dto.response.DashboardResponse;
import com.pmtool.service.DashboardService;
import com.pmtool.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse dashboard() {
        return dashboardService.buildDashboard(SecurityUtils.currentUserId());
    }
}
