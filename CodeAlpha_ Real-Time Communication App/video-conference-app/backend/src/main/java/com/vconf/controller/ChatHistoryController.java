package com.vconf.controller;

import com.vconf.dto.ApiResponse;
import com.vconf.dto.ChatMessageDto;
import com.vconf.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/meetings/{meetingCode}/chat")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatService chatService;

    @GetMapping
    public ApiResponse<List<ChatMessageDto>> history(@PathVariable String meetingCode) {
        return ApiResponse.ok(chatService.getHistory(meetingCode));
    }
}
