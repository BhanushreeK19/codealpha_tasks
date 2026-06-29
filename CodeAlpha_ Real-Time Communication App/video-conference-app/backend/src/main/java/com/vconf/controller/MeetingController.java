package com.vconf.controller;

import com.vconf.dto.ApiResponse;
import com.vconf.dto.JoinMeetingRequest;
import com.vconf.dto.MeetingRequest;
import com.vconf.dto.MeetingResponse;
import com.vconf.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping
    public ResponseEntity<ApiResponse<MeetingResponse>> create(@Valid @RequestBody MeetingRequest request) {
        MeetingResponse response = meetingService.createMeeting(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Meeting created", response));
    }

    @PostMapping("/join")
    public ApiResponse<MeetingResponse> join(@Valid @RequestBody JoinMeetingRequest request) {
        return ApiResponse.ok("Joined meeting", meetingService.joinMeeting(request.getMeetingCode()));
    }

    @PostMapping("/{meetingCode}/leave")
    public ApiResponse<Void> leave(@PathVariable String meetingCode) {
        meetingService.leaveMeeting(meetingCode);
        return ApiResponse.ok("Left meeting", null);
    }

    @PostMapping("/{meetingCode}/end")
    public ApiResponse<Void> end(@PathVariable String meetingCode) {
        meetingService.endMeeting(meetingCode);
        return ApiResponse.ok("Meeting ended", null);
    }

    @GetMapping("/{meetingCode}")
    public ApiResponse<MeetingResponse> getByCode(@PathVariable String meetingCode) {
        return ApiResponse.ok(meetingService.getByCode(meetingCode));
    }

    /** Meeting Dashboard: meetings the current user hosts. */
    @GetMapping("/hosted")
    public ApiResponse<List<MeetingResponse>> hosted() {
        return ApiResponse.ok(meetingService.getMeetingsHostedByCurrentUser());
    }

    /** Meeting History: every meeting the current user has hosted or attended. */
    @GetMapping("/history")
    public ApiResponse<List<MeetingResponse>> history() {
        return ApiResponse.ok(meetingService.getMeetingHistory());
    }
}
